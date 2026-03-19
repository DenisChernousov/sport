import { Router } from 'express';
import type { Response } from 'express';
import { prisma } from '../lib/prisma';
import { authMiddleware, optionalAuth } from '../middleware/auth';
import type { AuthRequest } from '../types';

const router = Router();

// ─── Follow / Unfollow toggle ────────────────────────────

router.post('/users/:id/follow', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const followingId = req.params.id as string;
    const followerId = req.userId!;

    if (followerId === followingId) {
      res.status(400).json({ error: 'Нельзя подписаться на себя' });
      return;
    }

    const existing = await prisma.follow.findUnique({
      where: { followerId_followingId: { followerId, followingId } },
    });

    if (existing) {
      await prisma.follow.delete({ where: { id: existing.id } });
      res.json({ isFollowing: false });
    } else {
      const [, follower, reverseFollow] = await Promise.all([
        prisma.follow.create({ data: { followerId, followingId } }),
        prisma.user.findUnique({ where: { id: followerId }, select: { username: true } }),
        prisma.follow.findUnique({ where: { followerId_followingId: { followerId: followingId, followingId: followerId } } }),
      ]);
      const isFriend = !!reverseFollow;
      await prisma.notification.create({
        data: {
          userId: followingId,
          type: 'follow',
          fromUserId: followerId,
          text: isFriend
            ? `${follower?.username ?? 'Кто-то'} теперь ваш друг!`
            : `${follower?.username ?? 'Кто-то'} подписался на вас`,
        },
      }).catch(() => {});
      res.json({ isFollowing: true, isFriend });
    }
  } catch (err) {
    console.error('Follow toggle error:', err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// ─── Followers list ──────────────────────────────────────

router.get('/users/:id/followers', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.params.id as string;
    const followers = await prisma.follow.findMany({
      where: { followingId: userId },
      include: {
        follower: {
          select: {
            id: true,
            username: true,
            avatarUrl: true,
            city: true,
            level: true,
            totalDistance: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json(followers.map((f: any) => f.follower));
  } catch (err) {
    console.error('Followers list error:', err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// ─── Following list ──────────────────────────────────────

router.get('/users/:id/following', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.params.id as string;
    const following = await prisma.follow.findMany({
      where: { followerId: userId },
      include: {
        following: {
          select: {
            id: true,
            username: true,
            avatarUrl: true,
            city: true,
            level: true,
            totalDistance: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json(following.map((f: any) => f.following));
  } catch (err) {
    console.error('Following list error:', err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// ─── Follow status ───────────────────────────────────────

router.get('/users/:id/follow-status', optionalAuth, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.params.id as string;

    const [followersCount, followingCount] = await Promise.all([
      prisma.follow.count({ where: { followingId: userId } }),
      prisma.follow.count({ where: { followerId: userId } }),
    ]);

    let isFollowing = false;
    if (req.userId) {
      const existing = await prisma.follow.findUnique({
        where: { followerId_followingId: { followerId: req.userId, followingId: userId } },
      });
      isFollowing = !!existing;
    }

    res.json({ isFollowing, followersCount, followingCount });
  } catch (err) {
    console.error('Follow status error:', err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// ─── Activity feed from followed users ───────────────────

router.get('/feed', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 20));
    const skip = (page - 1) * limit;

    // Get IDs of people I follow
    const followingRecords = await prisma.follow.findMany({
      where: { followerId: userId },
      select: { followingId: true },
    });
    const followingIds = followingRecords.map((f) => f.followingId);

    if (followingIds.length === 0) {
      res.json({ items: [], pagination: { page, limit, total: 0, totalPages: 0 } });
      return;
    }

    const [items, total] = await Promise.all([
      prisma.activity.findMany({
        where: { userId: { in: followingIds } },
        include: {
          user: {
            select: {
              id: true,
              username: true,
              avatarUrl: true,
              level: true,
            },
          },
          _count: { select: { likes: true } },
        },
        orderBy: { startedAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.activity.count({ where: { userId: { in: followingIds } } }),
    ]);

    res.json({
      items,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    console.error('Feed error:', err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// ─── Trending activities (top 5 by likes, last 7 days) ──

router.get('/feed/trending', optionalAuth, async (req: AuthRequest, res: Response) => {
  try {
    const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const items = await prisma.activity.findMany({
      where: { startedAt: { gte: since } },
      include: {
        user: {
          select: { id: true, username: true, avatarUrl: true, level: true },
        },
        photos: {
          select: { id: true, imageUrl: true },
          take: 1,
          orderBy: { createdAt: 'asc' },
        },
        _count: { select: { likes: true } },
      },
      orderBy: { likes: { _count: 'desc' } },
      take: 5,
    });

    let likedSet = new Set<string>();
    if (req.userId) {
      const liked = await prisma.activityLike.findMany({
        where: { userId: req.userId, activityId: { in: items.map((i) => i.id) } },
        select: { activityId: true },
      });
      likedSet = new Set(liked.map((l) => l.activityId));
    }

    res.json(items.map((item) => ({ ...item, isLiked: likedSet.has(item.id) })));
  } catch (err) {
    console.error('Trending feed error:', err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// ─── Public activity feed (all users) ────────────────────

router.get('/feed/public', optionalAuth, async (req: AuthRequest, res: Response) => {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 20));
    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      prisma.activity.findMany({
        include: {
          user: {
            select: {
              id: true,
              username: true,
              avatarUrl: true,
              level: true,
            },
          },
          photos: {
            select: { id: true, imageUrl: true },
            take: 4,
            orderBy: { createdAt: 'asc' },
          },
          _count: { select: { likes: true } },
        },
        orderBy: { startedAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.activity.count(),
    ]);

    // Check which activities are liked by the current user
    let likedSet = new Set<string>();
    if (req.userId) {
      const liked = await prisma.activityLike.findMany({
        where: {
          userId: req.userId,
          activityId: { in: items.map((i) => i.id) },
        },
        select: { activityId: true },
      });
      likedSet = new Set(liked.map((l) => l.activityId));
    }

    const result = items.map((item) => ({
      ...item,
      isLiked: likedSet.has(item.id),
    }));

    res.json({
      items: result,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    console.error('Public feed error:', err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// ─── Search users ────────────────────────────────────────

router.get('/users/search', async (req: AuthRequest, res: Response) => {
  try {
    const q = (req.query.q as string) || '';
    const city = (req.query.city as string) || '';

    const where: any = {};
    const conditions: any[] = [];

    if (q) {
      conditions.push({ username: { contains: q, mode: 'insensitive' } });
    }
    if (city) {
      conditions.push({ city: { contains: city, mode: 'insensitive' } });
    }

    if (conditions.length > 0) {
      where.AND = conditions;
    }

    const users = await prisma.user.findMany({
      where,
      select: {
        id: true,
        username: true,
        avatarUrl: true,
        city: true,
        level: true,
        totalDistance: true,
        _count: { select: { followers: true, following: true } },
      },
      take: 30,
      orderBy: { totalDistance: 'desc' },
    });

    res.json(users);
  } catch (err) {
    console.error('User search error:', err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// ─── Planned Activities ──────────────────────────────────

router.post('/planned', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const { sport, city, date, time, description, maxPeople } = req.body;

    if (!sport || !city || !date || !time) {
      res.status(400).json({ error: 'Заполните обязательные поля: sport, city, date, time' });
      return;
    }

    const planned = await prisma.plannedActivity.create({
      data: {
        userId,
        sport,
        city,
        date: new Date(date),
        time,
        description: description ?? null,
        maxPeople: maxPeople ?? 5,
      },
      include: {
        user: {
          select: { id: true, username: true, avatarUrl: true, level: true },
        },
      },
    });

    res.status(201).json(planned);
  } catch (err) {
    console.error('Create planned error:', err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

router.get('/planned', async (req: AuthRequest, res: Response) => {
  try {
    const city = (req.query.city as string) || '';
    const sport = (req.query.sport as string) || '';
    const date = (req.query.date as string) || '';

    const where: any = {
      date: { gte: new Date() },
    };

    if (city) {
      where.city = { contains: city, mode: 'insensitive' };
    }
    if (sport) {
      where.sport = sport;
    }
    if (date) {
      const d = new Date(date);
      const nextDay = new Date(d);
      nextDay.setDate(nextDay.getDate() + 1);
      where.date = { gte: d, lt: nextDay };
    }

    const items = await prisma.plannedActivity.findMany({
      where,
      include: {
        user: {
          select: { id: true, username: true, avatarUrl: true, level: true },
        },
      },
      orderBy: { date: 'asc' },
      take: 50,
    });

    res.json(items);
  } catch (err) {
    console.error('List planned error:', err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

router.delete('/planned/:id', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const id = req.params.id as string;
    const planned = await prisma.plannedActivity.findUnique({ where: { id } });

    if (!planned) {
      res.status(404).json({ error: 'Не найдено' });
      return;
    }
    if (planned.userId !== userId) {
      res.status(403).json({ error: 'Нет доступа' });
      return;
    }

    await prisma.plannedActivity.delete({ where: { id } });
    res.status(204).send();
  } catch (err) {
    console.error('Delete planned error:', err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

export default router;
