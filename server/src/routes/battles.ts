import { Router, Response } from 'express';
import { prisma } from '../lib/prisma';
import { authMiddleware } from '../middleware/auth';
import { AuthRequest } from '../types';

const router = Router();

// POST /api/battles — create battle challenge
router.post('/', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const { opponentId, sport, targetDistance, duration } = req.body;

    if (!opponentId || !sport || targetDistance == null || duration == null) {
      res.status(400).json({ error: 'opponentId, sport, targetDistance, and duration are required' });
      return;
    }

    if (opponentId === userId) {
      res.status(400).json({ error: 'Cannot challenge yourself' });
      return;
    }

    const opponent = await prisma.user.findUnique({ where: { id: opponentId } });
    if (!opponent) {
      res.status(404).json({ error: 'Opponent not found' });
      return;
    }

    const targetDist = parseFloat(targetDistance);
    const durationHours = parseInt(duration, 10);
    if (isNaN(targetDist) || targetDist <= 0 || isNaN(durationHours) || durationHours <= 0) {
      res.status(400).json({ error: 'targetDistance and duration must be positive numbers' });
      return;
    }

    const battle = await prisma.battle.create({
      data: {
        challengerId: userId,
        opponentId,
        sport,
        targetDistance: targetDist,
        duration: durationHours,
        status: 'pending',
      },
      include: {
        challenger: { select: { id: true, username: true, avatarUrl: true } },
        opponent: { select: { id: true, username: true, avatarUrl: true } },
      },
    });

    res.status(201).json(battle);
  } catch (error) {
    console.error('Create battle error:', error);
    res.status(500).json({ error: 'Failed to create battle' });
  }
});

// GET /api/battles — list own battles
router.get('/', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const status = String(req.query.status || '');

    const where: any = {
      OR: [{ challengerId: userId }, { opponentId: userId }],
    };

    if (status) {
      where.status = status;
    }

    const battles = await prisma.battle.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        challenger: { select: { id: true, username: true, avatarUrl: true } },
        opponent: { select: { id: true, username: true, avatarUrl: true } },
      },
    });

    res.json(battles);
  } catch (error) {
    console.error('List battles error:', error);
    res.status(500).json({ error: 'Failed to list battles' });
  }
});

// PUT /api/battles/:id/accept — accept battle
router.put('/:id/accept', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    const userId = req.userId!;

    const battle = await prisma.battle.findUnique({ where: { id } });
    if (!battle) {
      res.status(404).json({ error: 'Battle not found' });
      return;
    }

    if (battle.opponentId !== userId) {
      res.status(403).json({ error: 'Only the opponent can accept a battle' });
      return;
    }

    if (battle.status !== 'pending') {
      res.status(400).json({ error: 'Battle is not pending' });
      return;
    }

    const now = new Date();
    const endsAt = new Date(now.getTime() + battle.duration * 60 * 60 * 1000);

    const updated = await prisma.battle.update({
      where: { id },
      data: {
        status: 'active',
        startsAt: now,
        endsAt,
      },
      include: {
        challenger: { select: { id: true, username: true, avatarUrl: true } },
        opponent: { select: { id: true, username: true, avatarUrl: true } },
      },
    });

    res.json(updated);
  } catch (error) {
    console.error('Accept battle error:', error);
    res.status(500).json({ error: 'Failed to accept battle' });
  }
});

// PUT /api/battles/:id/decline — decline battle
router.put('/:id/decline', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    const userId = req.userId!;

    const battle = await prisma.battle.findUnique({ where: { id } });
    if (!battle) {
      res.status(404).json({ error: 'Battle not found' });
      return;
    }

    if (battle.opponentId !== userId) {
      res.status(403).json({ error: 'Only the opponent can decline a battle' });
      return;
    }

    if (battle.status !== 'pending') {
      res.status(400).json({ error: 'Battle is not pending' });
      return;
    }

    const updated = await prisma.battle.update({
      where: { id },
      data: { status: 'declined' },
      include: {
        challenger: { select: { id: true, username: true, avatarUrl: true } },
        opponent: { select: { id: true, username: true, avatarUrl: true } },
      },
    });

    res.json(updated);
  } catch (error) {
    console.error('Decline battle error:', error);
    res.status(500).json({ error: 'Failed to decline battle' });
  }
});

// GET /api/battles/:id — battle details
router.get('/:id', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    const userId = req.userId!;

    const battle = await prisma.battle.findUnique({
      where: { id },
      include: {
        challenger: { select: { id: true, username: true, avatarUrl: true, totalDistance: true } },
        opponent: { select: { id: true, username: true, avatarUrl: true, totalDistance: true } },
      },
    });

    if (!battle) {
      res.status(404).json({ error: 'Battle not found' });
      return;
    }

    if (battle.challengerId !== userId && battle.opponentId !== userId) {
      res.status(403).json({ error: 'Access denied' });
      return;
    }

    res.json(battle);
  } catch (error) {
    console.error('Get battle error:', error);
    res.status(500).json({ error: 'Failed to get battle' });
  }
});

export default router;
