import { Router, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { prisma } from '../lib/prisma';
import { authMiddleware } from '../middleware/auth';
import { AuthRequest } from '../types';
import { checkAndGrant } from '../services/AchievementService';

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

// Screenshot upload storage
const screenshotStorage = multer.diskStorage({
  destination(_req, _file, cb) {
    const dir = path.join(__dirname, '..', '..', 'uploads', 'screenshots');
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename(req: AuthRequest, file, cb) {
    const ext = path.extname(file.originalname) || '.png';
    cb(null, `${req.userId}-${Date.now()}${ext}`);
  },
});
const screenshotUpload = multer({
  storage: screenshotStorage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter(_req, file, cb) {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  },
});

// ─── Helpers ────────────────────────────────────────────

function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function isSameDay(a: Date, b: Date): boolean {
  return startOfDay(a).getTime() === startOfDay(b).getTime();
}

function isYesterday(lastDate: Date, today: Date): boolean {
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  return isSameDay(lastDate, yesterday);
}

async function updateUserStats(
  userId: string,
  distance: number,
  duration: number,
  activityDate: Date
): Promise<void> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return;

  const today = new Date();
  let newStreak = user.currentStreak;

  if (user.lastActivityDate) {
    if (isSameDay(user.lastActivityDate, activityDate)) {
      // Same day — no streak change
    } else if (isYesterday(user.lastActivityDate, activityDate)) {
      newStreak += 1;
    } else {
      newStreak = 1;
    }
  } else {
    newStreak = 1;
  }

  const bestStreak = Math.max(user.bestStreak, newStreak);

  await prisma.user.update({
    where: { id: userId },
    data: {
      totalDistance: { increment: distance },
      totalTime: { increment: duration },
      totalActivities: { increment: 1 },
      currentStreak: newStreak,
      bestStreak,
      lastActivityDate: activityDate,
    },
  });
}

async function updateEventParticipants(
  userId: string,
  sport: string,
  distance: number,
  duration: number
): Promise<void> {
  const now = new Date();
  const activeParticipations = await prisma.eventParticipant.findMany({
    where: {
      userId,
      event: {
        sport: sport as any,
        status: { in: ['ACTIVE', 'REGISTRATION'] },
        startDate: { lte: now },
        endDate: { gte: now },
      },
    },
  });

  for (const ep of activeParticipations) {
    await prisma.eventParticipant.update({
      where: { id: ep.id },
      data: {
        totalDistance: { increment: distance },
        totalTime: { increment: duration },
      },
    });
  }
}

async function updateTeamDistance(userId: string, distance: number): Promise<void> {
  const memberships = await prisma.teamMember.findMany({
    where: { userId },
    select: { teamId: true },
  });

  for (const m of memberships) {
    await prisma.team.update({
      where: { id: m.teamId },
      data: { totalDistance: { increment: distance } },
    });
  }
}

async function reverseUserStats(
  userId: string,
  distance: number,
  duration: number
): Promise<void> {
  await prisma.user.update({
    where: { id: userId },
    data: {
      totalDistance: { decrement: distance },
      totalTime: { decrement: duration },
      totalActivities: { decrement: 1 },
    },
  });
}

async function reverseTeamDistance(userId: string, distance: number): Promise<void> {
  const memberships = await prisma.teamMember.findMany({
    where: { userId },
    select: { teamId: true },
  });

  for (const m of memberships) {
    await prisma.team.update({
      where: { id: m.teamId },
      data: { totalDistance: { decrement: distance } },
    });
  }
}

// ─── GPX Parser ─────────────────────────────────────────

interface GpsPoint {
  lat: number;
  lon: number;
  ele: number | null;
  time: string | null;
}

function parseGpx(gpxString: string): { points: GpsPoint[]; distance: number; duration: number; elevGain: number } {
  const points: GpsPoint[] = [];

  // Match all <trkpt> elements
  const trkptRegex = /<trkpt\s+lat=["']([^"']+)["']\s+lon=["']([^"']+)["'][^>]*>([\s\S]*?)<\/trkpt>/gi;
  let match: RegExpExecArray | null;

  while ((match = trkptRegex.exec(gpxString)) !== null) {
    const lat = parseFloat(match[1]);
    const lon = parseFloat(match[2]);
    const body = match[3];

    const eleMatch = /<ele>([^<]+)<\/ele>/i.exec(body);
    const timeMatch = /<time>([^<]+)<\/time>/i.exec(body);

    points.push({
      lat,
      lon,
      ele: eleMatch ? parseFloat(eleMatch[1]) : null,
      time: timeMatch ? timeMatch[1] : null,
    });
  }

  // Calculate distance using Haversine
  let distance = 0;
  let elevGain = 0;

  for (let i = 1; i < points.length; i++) {
    distance += haversine(points[i - 1].lat, points[i - 1].lon, points[i].lat, points[i].lon);
    if (points[i].ele != null && points[i - 1].ele != null) {
      const diff = points[i].ele! - points[i - 1].ele!;
      if (diff > 0) elevGain += diff;
    }
  }

  // Calculate duration from first/last timestamps
  let duration = 0;
  if (points.length >= 2 && points[0].time && points[points.length - 1].time) {
    const start = new Date(points[0].time!).getTime();
    const end = new Date(points[points.length - 1].time!).getTime();
    duration = Math.round((end - start) / 1000);
  }

  return { points, distance: Math.round(distance * 1000) / 1000, duration, elevGain: Math.round(elevGain) };
}

function haversine(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth radius in km
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

// ─── Routes ─────────────────────────────────────────────

// POST /api/activities — create activity manually
router.post('/', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const { sport, distance, duration, title, startedAt, gpsTrack, description } = req.body;

    if (!sport || distance == null || duration == null || !startedAt) {
      res.status(400).json({ error: 'sport, distance, duration, and startedAt are required' });
      return;
    }

    const distNum = parseFloat(distance);
    const durNum = parseInt(duration, 10);
    if (isNaN(distNum) || isNaN(durNum) || distNum <= 0 || durNum <= 0) {
      res.status(400).json({ error: 'Дистанция и время должны быть больше нуля' });
      return;
    }

    // Validation: max distance 1000 km per activity
    if (distNum > 1000) {
      res.status(400).json({ error: 'Максимальная дистанция — 1000 км за одну активность' });
      return;
    }

    // Validation: no future dates
    const activityDate = new Date(startedAt);
    const now = new Date();
    if (activityDate > new Date(now.getTime() + 24 * 60 * 60 * 1000)) {
      res.status(400).json({ error: 'Нельзя добавить активность в будущем' });
      return;
    }

    // Validation: speed limits by sport (world records + margin)
    // Running: max ~45 km/h (Usain Bolt sprint), marathon pace ~21 km/h
    // Cycling: max ~70 km/h sustained, ~130 km/h downhill
    // Skiing: max ~80 km/h cross-country
    // Walking: max ~15 km/h (race walking record ~14.5 km/h)
    const avgSpeed = durNum > 0 ? distNum / (durNum / 3600) : null;
    const speedLimits: Record<string, number> = {
      RUNNING: 45,
      CYCLING: 130,
      SKIING: 80,
      WALKING: 15,
    };
    const maxSpeed = speedLimits[sport] ?? 200;
    if (avgSpeed && avgSpeed > maxSpeed) {
      res.status(400).json({ error: `Средняя скорость ${avgSpeed.toFixed(1)} км/ч превышает максимум для ${sport === 'RUNNING' ? 'бега' : sport === 'CYCLING' ? 'велосипеда' : sport === 'SKIING' ? 'лыж' : 'ходьбы'} (${maxSpeed} км/ч)` });
      return;
    }

    // Validation: min pace (too slow = probably wrong data)
    // Walking: min 1 km/h, others: min 2 km/h
    const minSpeed = sport === 'WALKING' ? 0.5 : 1;
    if (avgSpeed && avgSpeed < minSpeed) {
      res.status(400).json({ error: `Средняя скорость ${avgSpeed.toFixed(1)} км/ч слишком низкая` });
      return;
    }

    const avgPace = distNum > 0 ? (durNum / 60) / distNum : null; // min/km

    const activity = await prisma.activity.create({
      data: {
        userId,
        sport,
        title: title || null,
        description: description || null,
        distance: distNum,
        duration: durNum,
        avgPace,
        avgSpeed,
        gpsTrack: gpsTrack || null,
        isManual: true,
        startedAt: new Date(startedAt),
      },
    });

    // Update user stats
    await updateUserStats(userId, distNum, durNum, activityDate);

    // Update event participants
    await updateEventParticipants(userId, sport, distNum, durNum);

    // Update team distance
    await updateTeamDistance(userId, distNum);

    // Check achievements
    const updatedUser = await prisma.user.findUnique({ where: { id: userId } });
    await checkAndGrant(userId, {
      activityId: activity.id,
      sport,
      avgPace,
      startedAt: activityDate,
    });

    res.status(201).json(activity);
  } catch (error) {
    console.error('Create activity error:', error);
    res.status(500).json({ error: 'Failed to create activity' });
  }
});

// GET /api/activities — list own activities
router.get('/', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const sport = String(req.query.sport || '');
    const dateFrom = String(req.query.dateFrom || '');
    const dateTo = String(req.query.dateTo || '');
    const page = Math.max(1, parseInt(String(req.query.page || '1'), 10));
    const limit = Math.min(100, Math.max(1, parseInt(String(req.query.limit || '20'), 10)));

    const where: any = { userId };

    if (sport) {
      where.sport = sport;
    }
    if (dateFrom || dateTo) {
      where.startedAt = {};
      if (dateFrom) where.startedAt.gte = new Date(dateFrom);
      if (dateTo) where.startedAt.lte = new Date(dateTo);
    }

    const [activities, total] = await Promise.all([
      prisma.activity.findMany({
        where,
        orderBy: { startedAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        select: {
          id: true,
          userId: true,
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
          stravaId: true,
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
  } catch (error) {
    console.error('List activities error:', error);
    res.status(500).json({ error: 'Failed to list activities' });
  }
});

// GET /api/activities/:id — single activity with GPS track
router.get('/:id', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.id as string;

    const activity = await prisma.activity.findUnique({ where: { id } });

    if (!activity) {
      res.status(404).json({ error: 'Activity not found' });
      return;
    }

    if (activity.userId !== req.userId!) {
      res.status(403).json({ error: 'Access denied' });
      return;
    }

    res.json(activity);
  } catch (error) {
    console.error('Get activity error:', error);
    res.status(500).json({ error: 'Failed to get activity' });
  }
});

// DELETE /api/activities/:id — delete own activity, reverse stats
router.delete('/:id', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    const userId = req.userId!;

    const activity = await prisma.activity.findUnique({ where: { id } });

    if (!activity) {
      res.status(404).json({ error: 'Activity not found' });
      return;
    }

    if (activity.userId !== userId) {
      res.status(403).json({ error: 'Access denied' });
      return;
    }

    // Delete the activity
    await prisma.activity.delete({ where: { id } });

    // Reverse user stats
    await reverseUserStats(userId, activity.distance, activity.duration);

    // Reverse team distance
    await reverseTeamDistance(userId, activity.distance);

    res.json({ message: 'Activity deleted' });
  } catch (error) {
    console.error('Delete activity error:', error);
    res.status(500).json({ error: 'Failed to delete activity' });
  }
});

// POST /api/activities/upload-gpx — upload GPX file
router.post('/upload-gpx', authMiddleware, upload.single('file'), async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const file = req.file;

    if (!file) {
      res.status(400).json({ error: 'GPX file is required' });
      return;
    }

    const gpxContent = file.buffer.toString('utf-8');
    const { points, distance, duration, elevGain } = parseGpx(gpxContent);

    if (points.length === 0) {
      res.status(400).json({ error: 'No track points found in GPX file' });
      return;
    }

    const sport = String(req.body.sport || 'RUNNING');
    const title = String(req.body.title || 'GPX Activity');

    const startedAt = points[0].time ? new Date(points[0].time) : new Date();
    const avgPace = distance > 0 ? (duration / 60) / distance : null;
    const avgSpeed = duration > 0 ? distance / (duration / 3600) : null;

    const gpsTrack = {
      type: 'LineString' as const,
      coordinates: points.map((p) => [p.lon, p.lat, p.ele].filter((v) => v != null)),
    };

    const activity = await prisma.activity.create({
      data: {
        userId,
        sport: sport as any,
        title,
        distance,
        duration,
        avgPace,
        avgSpeed,
        elevGain,
        gpsTrack,
        startLat: points[0].lat,
        startLng: points[0].lon,
        isManual: false,
        startedAt,
      },
    });

    // Update stats
    await updateUserStats(userId, distance, duration, startedAt);
    await updateEventParticipants(userId, sport, distance, duration);
    await updateTeamDistance(userId, distance);

    // Check achievements
    await checkAndGrant(userId, {
      activityId: activity.id,
      sport,
      avgPace,
      startedAt,
    });

    res.status(201).json(activity);
  } catch (error) {
    console.error('Upload GPX error:', error);
    res.status(500).json({ error: 'Failed to process GPX file' });
  }
});

// POST /api/activities/screenshot — upload screenshot from sports app
router.post('/screenshot', authMiddleware, screenshotUpload.single('screenshot'), async (req: AuthRequest, res: Response) => {
  try {
    const file = req.file;

    if (!file) {
      res.status(400).json({ error: 'Screenshot file is required' });
      return;
    }

    const imageUrl = `/uploads/screenshots/${file.filename}`;

    res.status(200).json({
      imageUrl,
      message: 'Проверьте данные и подтвердите',
    });
  } catch (error) {
    console.error('Screenshot upload error:', error);
    res.status(500).json({ error: 'Failed to upload screenshot' });
  }
});

export default router;
