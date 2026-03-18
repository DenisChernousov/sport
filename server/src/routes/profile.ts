import { Router, Response } from 'express';
import multer from 'multer';
import path from 'path';
import { prisma } from '../lib/prisma';
import { authMiddleware } from '../middleware/auth';
import { AuthRequest } from '../types';

const router = Router();

// ─── Multer config for avatar upload ─────────────────────

const avatarStorage = multer.diskStorage({
  destination: path.join(__dirname, '..', '..', 'uploads', 'avatars'),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname) || '.jpg';
    cb(null, `${(_req as AuthRequest).userId}-${Date.now()}${ext}`);
  },
});

const avatarUpload = multer({
  storage: avatarStorage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Допустимы только изображения'));
    }
  },
});

// ─── POST /api/profile/avatar ────────────────────────────

router.post('/avatar', authMiddleware, (req: AuthRequest, res: Response) => {
  avatarUpload.single('avatar')(req, res, async (err) => {
    if (err) {
      if (err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE') {
        res.status(400).json({ error: 'Файл слишком большой (максимум 5 МБ)' });
        return;
      }
      res.status(400).json({ error: err.message || 'Ошибка загрузки файла' });
      return;
    }

    if (!req.file) {
      res.status(400).json({ error: 'Файл не выбран' });
      return;
    }

    try {
      const avatarUrl = `/uploads/avatars/${req.file.filename}`;

      await prisma.user.update({
        where: { id: req.userId },
        data: { avatarUrl },
      });

      res.json({ avatarUrl });
    } catch (error) {
      console.error('Avatar upload error:', error);
      res.status(500).json({ error: 'Не удалось сохранить аватар' });
    }
  });
});

// ─── GET /api/profile/referrals ──────────────────────────

router.get('/referrals', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        referralCode: true,
        referrals: {
          select: {
            id: true,
            username: true,
            avatarUrl: true,
            totalDistance: true,
            level: true,
            createdAt: true,
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    res.json({
      referralCode: user.referralCode,
      referralCount: user.referrals.length,
      referrals: user.referrals,
    });
  } catch (err) {
    console.error('Get referrals error:', err);
    res.status(500).json({ error: 'Failed to fetch referrals' });
  }
});

// ─── GET /api/profile/:id ────────────────────────────────

router.get('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.id as string;

    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        username: true,
        avatarUrl: true,
        firstName: true,
        lastName: true,
        city: true,
        bio: true,
        xp: true,
        level: true,
        totalDistance: true,
        totalTime: true,
        totalActivities: true,
        currentStreak: true,
        bestStreak: true,
        createdAt: true,
        _count: {
          select: {
            activities: true,
            eventParticipations: true,
            achievements: true,
          },
        },
      },
    });

    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    res.json(user);
  } catch (err) {
    console.error('Get profile error:', err);
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

// ─── PUT /api/profile ────────────────────────────────────

router.put('/', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const { firstName, lastName, city, bio, avatarUrl, birthDate } = req.body;

    const data: Record<string, unknown> = {};
    if (firstName !== undefined) data.firstName = firstName;
    if (lastName !== undefined) data.lastName = lastName;
    if (city !== undefined) data.city = city;
    if (bio !== undefined) data.bio = bio;
    if (avatarUrl !== undefined) data.avatarUrl = avatarUrl;
    if (birthDate !== undefined) data.birthDate = birthDate ? new Date(birthDate) : null;

    const user = await prisma.user.update({
      where: { id: userId },
      data,
      select: {
        id: true,
        username: true,
        email: true,
        avatarUrl: true,
        firstName: true,
        lastName: true,
        city: true,
        bio: true,
        birthDate: true,
        xp: true,
        level: true,
        totalDistance: true,
        totalTime: true,
        totalActivities: true,
        currentStreak: true,
        bestStreak: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    res.json(user);
  } catch (err) {
    console.error('Update profile error:', err);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

// ─── GET /api/profile/:id/activities ─────────────────────

router.get('/:id/activities', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.params.id as string;
    const page = Math.max(1, parseInt(String(req.query.page || '1'), 10));
    const limit = Math.min(50, Math.max(1, parseInt(String(req.query.limit || '20'), 10)));
    const skip = (page - 1) * limit;
    const sport = String(req.query.sport || '');

    const userExists = await prisma.user.findUnique({ where: { id: userId } });
    if (!userExists) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    const where: Record<string, unknown> = { userId };
    if (sport) where.sport = sport;

    const [activities, total] = await Promise.all([
      prisma.activity.findMany({
        where,
        orderBy: { startedAt: 'desc' },
        skip,
        take: limit,
        select: {
          id: true,
          sport: true,
          title: true,
          description: true,
          distance: true,
          duration: true,
          avgPace: true,
          avgSpeed: true,
          elevGain: true,
          calories: true,
          startLat: true,
          startLng: true,
          isManual: true,
          startedAt: true,
          createdAt: true,
        },
      }),
      prisma.activity.count({ where }),
    ]);

    res.json({
      items: activities,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    console.error('Get activities error:', err);
    res.status(500).json({ error: 'Failed to fetch activities' });
  }
});

// ─── GET /api/profile/:id/achievements ───────────────────

router.get('/:id/achievements', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.params.id as string;

    const userExists = await prisma.user.findUnique({ where: { id: userId } });
    if (!userExists) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    const achievements = await prisma.userAchievement.findMany({
      where: { userId },
      include: {
        achievement: true,
      },
      orderBy: { unlockedAt: 'desc' },
    });

    res.json(achievements);
  } catch (err) {
    console.error('Get achievements error:', err);
    res.status(500).json({ error: 'Failed to fetch achievements' });
  }
});

// ─── GET /api/profile/stats/summary ──────────────────────

router.get('/stats/summary', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;

    const now = new Date();
    const weekStart = new Date(now);
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());
    weekStart.setHours(0, 0, 0, 0);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const activities = await prisma.activity.findMany({
      where: { userId },
      select: {
        sport: true,
        distance: true,
        duration: true,
        calories: true,
        startedAt: true,
      },
    });

    let totalDistance = 0;
    let totalTime = 0;
    let weeklyDistance = 0;
    let monthlyDistance = 0;
    const statsBySport: Record<string, {
      sport: string;
      totalDistance: number;
      totalDuration: number;
      activityCount: number;
    }> = {};

    for (const act of activities) {
      totalDistance += act.distance;
      totalTime += act.duration;
      if (act.startedAt >= weekStart) weeklyDistance += act.distance;
      if (act.startedAt >= monthStart) monthlyDistance += act.distance;

      if (!statsBySport[act.sport]) {
        statsBySport[act.sport] = { sport: act.sport, totalDistance: 0, totalDuration: 0, activityCount: 0 };
      }
      statsBySport[act.sport].totalDistance += act.distance;
      statsBySport[act.sport].totalDuration += act.duration;
      statsBySport[act.sport].activityCount += 1;
    }

    const bySport = Object.values(statsBySport).map((s) => ({
      ...s,
      totalDistance: Math.round(s.totalDistance * 10) / 10,
    }));

    res.json({
      totalDistance: Math.round(totalDistance * 10) / 10,
      totalTime,
      totalActivities: activities.length,
      weeklyDistance: Math.round(weeklyDistance * 10) / 10,
      monthlyDistance: Math.round(monthlyDistance * 10) / 10,
      bySport,
    });
  } catch (err) {
    console.error('Stats summary error:', err);
    res.status(500).json({ error: 'Failed to fetch stats summary' });
  }
});

export default router;
