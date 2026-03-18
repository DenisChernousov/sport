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

export default router;
