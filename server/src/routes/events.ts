import { Router, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { prisma } from '../lib/prisma';
import { authMiddleware, optionalAuth, adminMiddleware } from '../middleware/auth';
import { AuthRequest } from '../types';

const router = Router();

const diplomaBgStorage = multer.diskStorage({
  destination(_req, _file, cb) {
    const dir = path.join(__dirname, '..', '..', 'uploads', 'diploma-bg');
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename(_req, file, cb) {
    cb(null, `${Date.now()}-${Math.random().toString(36).slice(2)}${path.extname(file.originalname)}`);
  },
});
const diplomaBgUpload = multer({ storage: diplomaBgStorage, limits: { fileSize: 10 * 1024 * 1024 } });

// ─── GET /api/events ─────────────────────────────────────

router.get('/', optionalAuth, async (req: AuthRequest, res: Response) => {
  try {
    const page = Math.max(1, parseInt(String(req.query.page || '1'), 10));
    const limit = Math.min(50, Math.max(1, parseInt(String(req.query.limit || '20'), 10)));
    const skip = (page - 1) * limit;

    const sport = String(req.query.sport || '');
    const type = String(req.query.type || '');
    const status = String(req.query.status || '');

    const where: Record<string, unknown> = {};
    if (sport) where.sport = sport;
    if (type) where.type = type;
    if (status) where.status = status;

    const [events, total] = await Promise.all([
      prisma.event.findMany({
        where,
        include: {
          _count: { select: { participants: true } },
        },
        orderBy: { startDate: 'asc' },
        skip,
        take: limit,
      }),
      prisma.event.count({ where }),
    ]);

    // Check if current user is joined + get their distance
    const userId = req.userId;
    const participationMap = new Map<string, { totalDistance: number; totalTime: number; isFinished: boolean }>();
    if (userId) {
      const participations = await prisma.eventParticipant.findMany({
        where: { userId, eventId: { in: events.map(e => e.id) } },
        select: { eventId: true, totalDistance: true, totalTime: true, isFinished: true },
      });
      for (const p of participations) {
        participationMap.set(p.eventId, { totalDistance: p.totalDistance, totalTime: p.totalTime, isFinished: p.isFinished });
      }
    }

    const items = events.map((event) => {
      const participation = participationMap.get(event.id);
      return {
        ...event,
        participantCount: event._count.participants,
        isJoined: !!participation,
        myDistance: participation?.totalDistance ?? 0,
        myTime: participation?.totalTime ?? 0,
        isFinished: participation?.isFinished ?? false,
        _count: undefined,
      };
    });

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
    console.error('List events error:', err);
    res.status(500).json({ error: 'Failed to fetch events' });
  }
});

// ─── GET /api/events/:id ─────────────────────────────────

router.get('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.id as string;

    const event = await prisma.event.findUnique({
      where: { id },
      include: {
        _count: { select: { participants: true } },
      },
    });

    if (!event) {
      res.status(404).json({ error: 'Event not found' });
      return;
    }

    res.json({
      ...event,
      participantCount: event._count.participants,
      _count: undefined,
    });
  } catch (err) {
    console.error('Get event error:', err);
    res.status(500).json({ error: 'Failed to fetch event' });
  }
});

// ─── POST /api/events ────────────────────────────────────

router.post('/', authMiddleware, adminMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const {
      title, description, imageUrl, sport, type, status,
      targetDistance, minDistance, maxDistance,
      startDate, endDate, regDeadline,
      maxParticipants, isPublic, isPaid, price,
      xpReward, medalName, medalIcon,
    } = req.body;

    if (!title || !sport || !type || !startDate || !endDate) {
      res.status(400).json({ error: 'Title, sport, type, startDate, and endDate are required' });
      return;
    }

    const event = await prisma.event.create({
      data: {
        title,
        description,
        imageUrl,
        sport,
        type,
        status: status || 'DRAFT',
        targetDistance: targetDistance ? parseFloat(targetDistance) : null,
        minDistance: minDistance ? parseFloat(minDistance) : null,
        maxDistance: maxDistance ? parseFloat(maxDistance) : null,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        regDeadline: regDeadline ? new Date(regDeadline) : null,
        maxParticipants: maxParticipants ? parseInt(maxParticipants, 10) : null,
        isPublic: isPublic !== undefined ? isPublic : true,
        isPaid: isPaid || false,
        price: price ? parseFloat(price) : null,
        xpReward: xpReward ? parseInt(xpReward, 10) : 50,
        medalName,
        medalIcon,
      },
      include: {
        _count: { select: { participants: true } },
      },
    });

    res.status(201).json({
      ...event,
      participantCount: event._count.participants,
      _count: undefined,
    });
  } catch (err) {
    console.error('Create event error:', err);
    res.status(500).json({ error: 'Failed to create event' });
  }
});

// ─── PUT /api/events/:id ─────────────────────────────────

router.put('/:id', authMiddleware, adminMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.id as string;

    const existing = await prisma.event.findUnique({ where: { id } });
    if (!existing) {
      res.status(404).json({ error: 'Event not found' });
      return;
    }

    const {
      title, description, imageUrl, sport, type, status,
      targetDistance, minDistance, maxDistance,
      startDate, endDate, regDeadline,
      maxParticipants, isPublic, isPaid, price,
      xpReward, medalName, medalIcon,
    } = req.body;

    const data: Record<string, unknown> = {};
    if (title !== undefined) data.title = title;
    if (description !== undefined) data.description = description;
    if (imageUrl !== undefined) data.imageUrl = imageUrl;
    if (sport !== undefined) data.sport = sport;
    if (type !== undefined) data.type = type;
    if (status !== undefined) data.status = status;
    if (targetDistance !== undefined) data.targetDistance = targetDistance ? parseFloat(targetDistance) : null;
    if (minDistance !== undefined) data.minDistance = minDistance ? parseFloat(minDistance) : null;
    if (maxDistance !== undefined) data.maxDistance = maxDistance ? parseFloat(maxDistance) : null;
    if (startDate !== undefined) data.startDate = new Date(startDate);
    if (endDate !== undefined) data.endDate = new Date(endDate);
    if (regDeadline !== undefined) data.regDeadline = regDeadline ? new Date(regDeadline) : null;
    if (maxParticipants !== undefined) data.maxParticipants = maxParticipants ? parseInt(maxParticipants, 10) : null;
    if (isPublic !== undefined) data.isPublic = isPublic;
    if (isPaid !== undefined) data.isPaid = isPaid;
    if (price !== undefined) data.price = price ? parseFloat(price) : null;
    if (xpReward !== undefined) data.xpReward = parseInt(xpReward, 10);
    if (medalName !== undefined) data.medalName = medalName;
    if (medalIcon !== undefined) data.medalIcon = medalIcon;
    if (req.body.diplomaBgUrl !== undefined) data.diplomaBgUrl = req.body.diplomaBgUrl;
    if (req.body.diplomaSettings !== undefined) data.diplomaSettings = req.body.diplomaSettings;

    const event = await prisma.event.update({
      where: { id },
      data,
      include: {
        _count: { select: { participants: true } },
      },
    });

    res.json({
      ...event,
      participantCount: event._count.participants,
      _count: undefined,
    });
  } catch (err) {
    console.error('Update event error:', err);
    res.status(500).json({ error: 'Failed to update event' });
  }
});

// ─── POST /api/events/:id/diploma-bg ─────────────────────

router.post('/:id/diploma-bg', authMiddleware, adminMiddleware, diplomaBgUpload.single('bg'), async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    const file = req.file;
    if (!file) { res.status(400).json({ error: 'Файл не загружен' }); return; }

    const bgUrl = `/uploads/diploma-bg/${file.filename}`;
    await prisma.event.update({ where: { id }, data: { diplomaBgUrl: bgUrl } });
    res.json({ diplomaBgUrl: bgUrl });
  } catch (err) {
    console.error('Upload diploma bg error:', err);
    res.status(500).json({ error: 'Ошибка загрузки фона' });
  }
});

// ─── DELETE /api/events/:id ──────────────────────────────

router.delete('/:id', authMiddleware, adminMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.id as string;

    const existing = await prisma.event.findUnique({ where: { id } });
    if (!existing) {
      res.status(404).json({ error: 'Event not found' });
      return;
    }

    await prisma.event.delete({ where: { id } });
    res.status(204).send();
  } catch (err) {
    console.error('Delete event error:', err);
    res.status(500).json({ error: 'Failed to delete event' });
  }
});

// ─── POST /api/events/:id/join ───────────────────────────

router.post('/:id/join', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const eventId = req.params.id as string;
    const userId = req.userId!;

    const event = await prisma.event.findUnique({
      where: { id: eventId },
      include: { _count: { select: { participants: true } } },
    });

    if (!event) {
      res.status(404).json({ error: 'Event not found' });
      return;
    }

    if (event.status !== 'REGISTRATION' && event.status !== 'ACTIVE') {
      res.status(400).json({ error: 'Event is not accepting registrations' });
      return;
    }

    if (event.regDeadline && new Date() > event.regDeadline) {
      res.status(400).json({ error: 'Registration deadline has passed' });
      return;
    }

    if (event.maxParticipants && event._count.participants >= event.maxParticipants) {
      res.status(400).json({ error: 'Event is full' });
      return;
    }

    const existing = await prisma.eventParticipant.findUnique({
      where: { userId_eventId: { userId, eventId } },
    });

    if (existing) {
      res.status(409).json({ error: 'Already joined this event' });
      return;
    }

    const participant = await prisma.eventParticipant.create({
      data: { userId, eventId },
    });

    res.status(201).json(participant);
  } catch (err) {
    console.error('Join event error:', err);
    res.status(500).json({ error: 'Failed to join event' });
  }
});

// ─── POST /api/events/:id/leave ──────────────────────────

router.post('/:id/leave', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const eventId = req.params.id as string;
    const userId = req.userId!;

    const participant = await prisma.eventParticipant.findUnique({
      where: { userId_eventId: { userId, eventId } },
    });

    if (!participant) {
      res.status(404).json({ error: 'Not a participant in this event' });
      return;
    }

    await prisma.eventParticipant.delete({
      where: { id: participant.id },
    });

    res.json({ message: 'Left event successfully' });
  } catch (err) {
    console.error('Leave event error:', err);
    res.status(500).json({ error: 'Failed to leave event' });
  }
});

// ─── GET /api/events/:id/leaderboard ─────────────────────

router.get('/:id/leaderboard', async (req: AuthRequest, res: Response) => {
  try {
    const eventId = req.params.id as string;
    const page = Math.max(1, parseInt(String(req.query.page || '1'), 10));
    const limit = Math.min(100, Math.max(1, parseInt(String(req.query.limit || '50'), 10)));
    const skip = (page - 1) * limit;

    const event = await prisma.event.findUnique({ where: { id: eventId } });
    if (!event) {
      res.status(404).json({ error: 'Event not found' });
      return;
    }

    const [participants, total] = await Promise.all([
      prisma.eventParticipant.findMany({
        where: { eventId },
        include: {
          user: {
            select: {
              id: true,
              username: true,
              avatarUrl: true,
              firstName: true,
              lastName: true,
            },
          },
        },
        orderBy: { totalDistance: 'desc' },
        skip,
        take: limit,
      }),
      prisma.eventParticipant.count({ where: { eventId } }),
    ]);

    const leaderboard = participants.map((p, index) => ({
      rank: skip + index + 1,
      user: p.user,
      totalDistance: p.totalDistance,
      totalTime: p.totalTime,
      isFinished: p.isFinished,
      finishedAt: p.finishedAt,
    }));

    res.json({
      eventId,
      leaderboard,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    console.error('Leaderboard error:', err);
    res.status(500).json({ error: 'Failed to fetch leaderboard' });
  }
});

export default router;
