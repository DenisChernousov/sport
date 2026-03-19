import { Router, Response } from 'express';
import { prisma } from '../lib/prisma';
import { authMiddleware, moderatorMiddleware } from '../middleware/auth';
import type { AuthRequest } from '../types';

const router = Router();

// ─── GET /api/mod/stats ───────────────────────────────────

router.get('/stats', authMiddleware, moderatorMiddleware, async (_req: AuthRequest, res: Response) => {
  try {
    const now = new Date();
    const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const [
      totalUsers,
      totalActivities,
      activitiesToday,
      activitiesThisWeek,
      recentActivities,
      topActiveUsers,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.activity.count(),
      prisma.activity.count({ where: { createdAt: { gte: dayAgo } } }),
      prisma.activity.count({ where: { createdAt: { gte: weekAgo } } }),
      prisma.activity.findMany({
        orderBy: { createdAt: 'desc' },
        take: 20,
        select: {
          id: true, sport: true, title: true, distance: true, duration: true, createdAt: true,
          user: { select: { id: true, username: true, avatarUrl: true } },
        },
      }),
      prisma.user.findMany({
        orderBy: { totalActivities: 'desc' },
        take: 5,
        select: { id: true, username: true, avatarUrl: true, totalActivities: true, totalDistance: true, level: true },
      }),
    ]);

    res.json({ totalUsers, totalActivities, activitiesToday, activitiesThisWeek, recentActivities, topActiveUsers });
  } catch (err) {
    console.error('Mod stats error:', err);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

// ─── GET /api/mod/activities ──────────────────────────────

router.get('/activities', authMiddleware, moderatorMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const limit = Math.min(200, parseInt(String(req.query.limit ?? '100'), 10));
    const sport = req.query.sport ? String(req.query.sport) : undefined;
    const search = req.query.search ? String(req.query.search).trim() : undefined;

    const where: Record<string, unknown> = {};
    if (sport) where.sport = sport;
    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { user: { username: { contains: search, mode: 'insensitive' } } },
      ];
    }

    const activities = await prisma.activity.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
      select: {
        id: true, sport: true, title: true, description: true,
        distance: true, duration: true, startedAt: true, createdAt: true,
        isManual: true,
        user: { select: { id: true, username: true, avatarUrl: true, level: true } },
      },
    });

    res.json(activities);
  } catch (err) {
    console.error('Mod activities error:', err);
    res.status(500).json({ error: 'Failed to fetch activities' });
  }
});

// ─── DELETE /api/mod/activities/:id ──────────────────────

router.delete('/activities/:id', authMiddleware, moderatorMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    const activity = await prisma.activity.findUnique({ where: { id } });
    if (!activity) { res.status(404).json({ error: 'Activity not found' }); return; }
    await prisma.activity.delete({ where: { id } });
    res.status(204).send();
  } catch (err) {
    console.error('Mod delete activity error:', err);
    res.status(500).json({ error: 'Failed to delete activity' });
  }
});

// ─── GET /api/mod/users ───────────────────────────────────

router.get('/users', authMiddleware, moderatorMiddleware, async (req: AuthRequest, res: Response) => {
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
      take: 200,
      select: {
        id: true, username: true, email: true, role: true,
        city: true, level: true, xp: true,
        totalDistance: true, totalActivities: true,
        currentStreak: true, createdAt: true, avatarUrl: true,
      },
    });

    res.json(users);
  } catch (err) {
    console.error('Mod users error:', err);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// ─── POST /api/mod/users/:id/warn ────────────────────────

router.post('/users/:id/warn', authMiddleware, moderatorMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.params.id as string;
    const { reason } = req.body;

    if (!reason?.trim()) {
      res.status(400).json({ error: 'Reason is required' });
      return;
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) { res.status(404).json({ error: 'User not found' }); return; }

    await prisma.notification.create({
      data: {
        userId,
        type: 'system',
        text: `⚠️ Предупреждение от модератора: ${reason}`,
      },
    });

    res.json({ ok: true });
  } catch (err) {
    console.error('Mod warn user error:', err);
    res.status(500).json({ error: 'Failed to send warning' });
  }
});

export default router;
