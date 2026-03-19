import { Router, Response } from 'express';
import path from 'path';
import fs from 'fs';
import multer from 'multer';
import { prisma } from '../lib/prisma';
import { authMiddleware, adminMiddleware } from '../middleware/auth';
import type { AuthRequest } from '../types';

// ─── Achievement icon upload ────────────────────────────
const achIconStorage = multer.diskStorage({
  destination(_req, _file, cb) {
    const dir = path.join(__dirname, '..', '..', 'uploads', 'achievements');
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename(req, file, cb) {
    const ext = path.extname(file.originalname) || '.png';
    cb(null, `${req.params.id}-${Date.now()}${ext}`);
  },
});
const achIconUpload = multer({ storage: achIconStorage, limits: { fileSize: 5 * 1024 * 1024 } });

const router = Router();

// ─── GET /api/admin/stats ───────────────────────────────

router.get('/stats', authMiddleware, adminMiddleware, async (_req: AuthRequest, res: Response) => {
  try {
    const now = new Date();
    const weekAgo = new Date(now);
    weekAgo.setDate(weekAgo.getDate() - 7);
    const monthAgo = new Date(now);
    monthAgo.setMonth(monthAgo.getMonth() - 1);

    const [
      totalUsers,
      totalEvents,
      totalActivities,
      totalTeams,
      newUsersThisWeek,
      newUsersThisMonth,
      distanceAgg,
      topUsers,
      recentActivities,
      eventParticipation,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.event.count(),
      prisma.activity.count(),
      prisma.team.count(),
      prisma.user.count({ where: { createdAt: { gte: weekAgo } } }),
      prisma.user.count({ where: { createdAt: { gte: monthAgo } } }),
      prisma.user.aggregate({ _sum: { totalDistance: true } }),
      prisma.user.findMany({
        orderBy: { totalDistance: 'desc' },
        take: 5,
        select: {
          id: true,
          username: true,
          avatarUrl: true,
          totalDistance: true,
          level: true,
          city: true,
        },
      }),
      prisma.activity.findMany({
        orderBy: { createdAt: 'desc' },
        take: 10,
        select: {
          id: true,
          sport: true,
          title: true,
          distance: true,
          duration: true,
          createdAt: true,
          user: {
            select: {
              id: true,
              username: true,
              avatarUrl: true,
            },
          },
        },
      }),
      prisma.event.findMany({
        select: {
          id: true,
          title: true,
          _count: {
            select: { participants: true },
          },
        },
        orderBy: { startDate: 'desc' },
        take: 20,
      }),
    ]);

    res.json({
      totalUsers,
      totalEvents,
      totalActivities,
      totalTeams,
      newUsersThisWeek,
      newUsersThisMonth,
      totalDistance: distanceAgg._sum.totalDistance ?? 0,
      topUsers,
      recentActivities,
      eventParticipation: eventParticipation.map((e) => ({
        id: e.id,
        title: e.title,
        participantCount: e._count.participants,
      })),
    });
  } catch (err) {
    console.error('Admin stats error:', err);
    res.status(500).json({ error: 'Failed to fetch admin stats' });
  }
});

// ─── GET /api/admin/users ───────────────────────────────

router.get('/users', authMiddleware, adminMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const search = String(req.query.search ?? '').trim();

    const where = search
      ? {
          OR: [
            { username: { contains: search, mode: 'insensitive' as const } },
            { email: { contains: search, mode: 'insensitive' as const } },
            { city: { contains: search, mode: 'insensitive' as const } },
          ],
        }
      : {};

    const users = await prisma.user.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        username: true,
        email: true,
        role: true,
        city: true,
        level: true,
        xp: true,
        totalDistance: true,
        totalActivities: true,
        currentStreak: true,
        referralCode: true,
        referredById: true,
        createdAt: true,
        _count: {
          select: { referrals: true },
        },
      },
    });

    res.json(users);
  } catch (err) {
    console.error('Admin users error:', err);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// ─── PUT /api/admin/users/:id/role ──────────────────────

router.put('/users/:id/role', authMiddleware, adminMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.params.id as string;
    const { role } = req.body;

    if (!role || !['USER', 'ADMIN', 'MODERATOR'].includes(role)) {
      res.status(400).json({ error: 'Invalid role. Must be USER, ADMIN, or MODERATOR' });
      return;
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    const updated = await prisma.user.update({
      where: { id: userId },
      data: { role },
      select: {
        id: true,
        username: true,
        email: true,
        role: true,
      },
    });

    res.json(updated);
  } catch (err) {
    console.error('Admin set role error:', err);
    res.status(500).json({ error: 'Failed to update user role' });
  }
});

// ─── GET /api/admin/achievements ─────────────────────────

router.get('/achievements', authMiddleware, adminMiddleware, async (_req: AuthRequest, res: Response) => {
  try {
    const achievements = await prisma.achievement.findMany({
      orderBy: { category: 'asc' },
      include: {
        _count: {
          select: { users: true },
        },
      },
    });

    res.json(achievements.map((a) => ({
      id: a.id,
      code: a.code,
      name: a.name,
      description: a.description,
      icon: a.icon,
      iconUrl: a.iconUrl ?? null,
      xpReward: a.xpReward,
      category: a.category,
      threshold: a.threshold,
      userCount: a._count.users,
    })));
  } catch (err) {
    console.error('Admin achievements error:', err);
    res.status(500).json({ error: 'Ошибка загрузки достижений' });
  }
});

// ─── POST /api/admin/achievements ────────────────────────

router.post('/achievements', authMiddleware, adminMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { code: rawCode, name, description, icon, xpReward, category, threshold } = req.body;

    if (!name || !description || !category) {
      res.status(400).json({ error: 'Заполните обязательные поля: name, description, category' });
      return;
    }

    // Автогенерация кода из названия, если не указан
    const generatedCode = rawCode
      ? rawCode
      : name.toUpperCase().replace(/\s+/g, '_').replace(/[^A-ZА-ЯЁ0-9_]/g, '') + '_' + Date.now().toString(36);

    const existing = await prisma.achievement.findUnique({ where: { code: generatedCode } });
    if (existing) {
      res.status(400).json({ error: 'Достижение с таким кодом уже существует' });
      return;
    }

    const achievement = await prisma.achievement.create({
      data: {
        code: generatedCode,
        name,
        description,
        icon: icon ?? '🏅',
        xpReward: parseInt(String(xpReward), 10) || 25,
        category,
        threshold: threshold != null ? parseFloat(String(threshold)) : null,
      },
    });

    res.json(achievement);
  } catch (err) {
    console.error('Admin create achievement error:', err);
    res.status(500).json({ error: 'Ошибка создания достижения' });
  }
});

// ─── PUT /api/admin/achievements/:id ─────────────────────

router.put('/achievements/:id', authMiddleware, adminMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const achievementId = req.params.id as string;
    const { code, name, description, icon, xpReward, category, threshold } = req.body;

    const existing = await prisma.achievement.findUnique({ where: { id: achievementId } });
    if (!existing) {
      res.status(404).json({ error: 'Достижение не найдено' });
      return;
    }

    if (code && code !== existing.code) {
      const dup = await prisma.achievement.findUnique({ where: { code } });
      if (dup) {
        res.status(400).json({ error: 'Достижение с таким кодом уже существует' });
        return;
      }
    }

    const achievement = await prisma.achievement.update({
      where: { id: achievementId },
      data: {
        ...(code != null ? { code } : {}),
        ...(name != null ? { name } : {}),
        ...(description != null ? { description } : {}),
        ...(icon != null ? { icon } : {}),
        ...(xpReward != null ? { xpReward: parseInt(String(xpReward), 10) } : {}),
        ...(category != null ? { category } : {}),
        ...(threshold !== undefined ? { threshold: threshold != null ? parseFloat(String(threshold)) : null } : {}),
      },
    });

    res.json(achievement);
  } catch (err) {
    console.error('Admin update achievement error:', err);
    res.status(500).json({ error: 'Ошибка обновления достижения' });
  }
});

// ─── DELETE /api/admin/achievements/:id ──────────────────

router.delete('/achievements/:id', authMiddleware, adminMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const achievementId = req.params.id as string;

    const existing = await prisma.achievement.findUnique({ where: { id: achievementId } });
    if (!existing) {
      res.status(404).json({ error: 'Достижение не найдено' });
      return;
    }

    // Удаляем связанные записи
    await prisma.userAchievement.deleteMany({ where: { achievementId } });
    await prisma.achievement.delete({ where: { id: achievementId } });

    res.status(204).send();
  } catch (err) {
    console.error('Admin delete achievement error:', err);
    res.status(500).json({ error: 'Ошибка удаления достижения' });
  }
});

// ─── DELETE /api/admin/users/:id ─────────────────────────

router.delete('/users/:id', authMiddleware, adminMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.params.id as string;
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) { res.status(404).json({ error: 'User not found' }); return; }
    // Cascade delete dependent records
    await prisma.userAchievement.deleteMany({ where: { userId } });
    await prisma.activity.deleteMany({ where: { userId } });
    await prisma.teamMember.deleteMany({ where: { userId } });
    await prisma.notification.deleteMany({ where: { OR: [{ userId }, { fromUserId: userId }] } });
    await prisma.user.delete({ where: { id: userId } });
    res.status(204).send();
  } catch (err) {
    console.error('Admin delete user error:', err);
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

// ─── POST /api/admin/users/:id/xp ────────────────────────

router.post('/users/:id/xp', authMiddleware, adminMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.params.id as string;
    const { amount, reason } = req.body;
    if (!amount || isNaN(Number(amount))) { res.status(400).json({ error: 'amount required' }); return; }
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) { res.status(404).json({ error: 'User not found' }); return; }
    const xpDelta = parseInt(String(amount), 10);
    const newXp = Math.max(0, (user.xp ?? 0) + xpDelta);
    const newLevel = Math.floor(newXp / 100) + 1;
    const updated = await prisma.user.update({
      where: { id: userId },
      data: { xp: newXp, level: newLevel },
      select: { id: true, username: true, xp: true, level: true },
    });
    if (reason) {
      await prisma.notification.create({
        data: { userId, type: 'achievement', text: `Администратор начислил ${xpDelta > 0 ? '+' : ''}${xpDelta} XP. Причина: ${reason}` },
      }).catch(() => {});
    }
    res.json(updated);
  } catch (err) {
    console.error('Admin give xp error:', err);
    res.status(500).json({ error: 'Failed to update XP' });
  }
});

// ─── GET /api/admin/activities ────────────────────────────

router.get('/activities', authMiddleware, adminMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const limit = Math.min(100, parseInt(String(req.query.limit ?? '50'), 10));
    const activities = await prisma.activity.findMany({
      orderBy: { createdAt: 'desc' },
      take: limit,
      select: {
        id: true, sport: true, title: true, distance: true, duration: true,
        startedAt: true, createdAt: true,
        user: { select: { id: true, username: true, avatarUrl: true, level: true } },
      },
    });
    res.json(activities);
  } catch (err) {
    console.error('Admin activities error:', err);
    res.status(500).json({ error: 'Failed to fetch activities' });
  }
});

// ─── DELETE /api/admin/activities/:id ────────────────────

router.delete('/activities/:id', authMiddleware, adminMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    const activity = await prisma.activity.findUnique({ where: { id } });
    if (!activity) { res.status(404).json({ error: 'Activity not found' }); return; }
    await prisma.activity.delete({ where: { id } });
    res.status(204).send();
  } catch (err) {
    console.error('Admin delete activity error:', err);
    res.status(500).json({ error: 'Failed to delete activity' });
  }
});

// ─── POST /api/admin/achievements/:id/icon ──────────────

router.post('/achievements/:id/icon', authMiddleware, adminMiddleware, achIconUpload.single('icon'), async (req: AuthRequest, res: Response) => {
  try {
    const achievementId = req.params.id as string;
    const file = (req as any).file;

    if (!file) {
      res.status(400).json({ error: 'Файл не загружен' });
      return;
    }

    const existing = await prisma.achievement.findUnique({ where: { id: achievementId } });
    if (!existing) {
      res.status(404).json({ error: 'Достижение не найдено' });
      return;
    }

    const iconUrl = `/uploads/achievements/${file.filename}`;

    const achievement = await prisma.achievement.update({
      where: { id: achievementId },
      data: { iconUrl },
    });

    res.json({ iconUrl: achievement.iconUrl });
  } catch (err) {
    console.error('Admin upload achievement icon error:', err);
    res.status(500).json({ error: 'Ошибка загрузки иконки достижения' });
  }
});

export default router;
