import { Router, Response } from 'express';
import { prisma } from '../lib/prisma';
import { AuthRequest } from '../types';

const router = Router();

function getPeriodStart(period: string): Date | null {
  const now = new Date();
  if (period === 'week') {
    const d = new Date(now);
    d.setDate(d.getDate() - 7);
    d.setHours(0, 0, 0, 0);
    return d;
  }
  if (period === 'month') {
    const d = new Date(now);
    d.setDate(d.getDate() - 30);
    d.setHours(0, 0, 0, 0);
    return d;
  }
  return null; // 'all' or default
}

// GET /api/leaderboard/users — top users by totalDistance
router.get('/users', async (req: AuthRequest, res: Response) => {
  try {
    const period = String(req.query.period || 'all');
    const limit = Math.min(100, Math.max(1, parseInt(String(req.query.limit || '50'), 10)));

    const periodStart = getPeriodStart(period);

    if (periodStart) {
      // Aggregate from activities within the period
      const results = await prisma.activity.groupBy({
        by: ['userId'],
        where: {
          startedAt: { gte: periodStart },
        },
        _sum: { distance: true },
        _count: { _all: true },
        orderBy: {
          _sum: { distance: 'desc' },
        },
        take: limit,
      });

      const userIds = results.map((r) => r.userId);
      const users = await prisma.user.findMany({
        where: { id: { in: userIds } },
        select: {
          id: true,
          username: true,
          avatarUrl: true,
          level: true,
          totalDistance: true,
          totalActivities: true,
        },
      });

      const userMap = new Map(users.map((u) => [u.id, u]));

      const leaderboard = results.map((r, idx) => ({
        rank: idx + 1,
        userId: r.userId,
        user: userMap.get(r.userId) || null,
        periodDistance: r._sum.distance || 0,
        periodActivities: r._count._all,
      }));

      res.json(leaderboard);
    } else {
      // All-time: use User.totalDistance
      const users = await prisma.user.findMany({
        orderBy: { totalDistance: 'desc' },
        take: limit,
        select: {
          id: true,
          username: true,
          avatarUrl: true,
          level: true,
          totalDistance: true,
          totalActivities: true,
        },
      });

      const leaderboard = users.map((u, idx) => ({
        rank: idx + 1,
        userId: u.id,
        user: u,
        periodDistance: u.totalDistance,
      }));

      res.json(leaderboard);
    }
  } catch (error) {
    console.error('User leaderboard error:', error);
    res.status(500).json({ error: 'Failed to get user leaderboard' });
  }
});

// GET /api/leaderboard/teams — top teams by totalDistance
router.get('/teams', async (req: AuthRequest, res: Response) => {
  try {
    const limit = Math.min(100, Math.max(1, parseInt(String(req.query.limit || '50'), 10)));

    const teams = await prisma.team.findMany({
      orderBy: { totalDistance: 'desc' },
      take: limit,
      include: {
        owner: { select: { id: true, username: true, avatarUrl: true } },
        _count: { select: { members: true } },
      },
    });

    const leaderboard = teams.map((t, idx) => ({
      rank: idx + 1,
      id: t.id,
      name: t.name,
      avatarUrl: t.avatarUrl,
      totalDistance: t.totalDistance,
      memberCount: t._count.members,
    }));

    res.json(leaderboard);
  } catch (error) {
    console.error('Team leaderboard error:', error);
    res.status(500).json({ error: 'Failed to get team leaderboard' });
  }
});

// GET /api/leaderboard/sport/:sport — top users for specific sport
router.get('/sport/:sport', async (req: AuthRequest, res: Response) => {
  try {
    const sport = req.params.sport as string;
    const limit = Math.min(100, Math.max(1, parseInt(String(req.query.limit || '50'), 10)));

    const results = await prisma.activity.groupBy({
      by: ['userId'],
      where: { sport: sport as any },
      _sum: { distance: true },
      _count: { _all: true },
      orderBy: { _sum: { distance: 'desc' } },
      take: limit,
    });

    const userIds = results.map((r) => r.userId);
    const users = await prisma.user.findMany({
      where: { id: { in: userIds } },
      select: {
        id: true,
        username: true,
        avatarUrl: true,
        level: true,
        totalDistance: true,
        totalActivities: true,
      },
    });

    const userMap = new Map(users.map((u) => [u.id, u]));

    const leaderboard = results.map((r, idx) => ({
      rank: idx + 1,
      userId: r.userId,
      user: userMap.get(r.userId) || null,
      sportDistance: r._sum.distance || 0,
      sportActivities: r._count._all,
    }));

    res.json(leaderboard);
  } catch (error) {
    console.error('Sport leaderboard error:', error);
    res.status(500).json({ error: 'Failed to get sport leaderboard' });
  }
});

export default router;
