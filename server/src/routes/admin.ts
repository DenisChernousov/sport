import { Router, Response } from 'express';
import { prisma } from '../lib/prisma';
import { authMiddleware, adminMiddleware } from '../middleware/auth';
import type { AuthRequest } from '../types';

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
    const { code, name, description, icon, xpReward, category, threshold } = req.body;

    if (!code || !name || !description || !category) {
      res.status(400).json({ error: 'Заполните обязательные поля: code, name, description, category' });
      return;
    }

    const existing = await prisma.achievement.findUnique({ where: { code } });
    if (existing) {
      res.status(400).json({ error: 'Достижение с таким кодом уже существует' });
      return;
    }

    const achievement = await prisma.achievement.create({
      data: {
        code,
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

export default router;
