import { Router, Response } from 'express';
import { prisma } from '../lib/prisma';
import { AuthRequest } from '../types';
import { authMiddleware as authenticate } from '../middleware/auth';

const router = Router();

// Helper: get team where user is leader/owner
async function getUserTeam(userId: string) {
  const membership = await prisma.teamMember.findFirst({
    where: { userId, role: { in: ['leader', 'officer'] } },
    include: { team: true },
  });
  // Also check owner
  const owned = await prisma.team.findFirst({ where: { ownerId: userId } });
  return owned ?? membership?.team ?? null;
}

// GET /api/team-battles — public list of active/finished battles
router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const battles = await prisma.teamBattle.findMany({
      where: { status: { in: ['active', 'finished'] } },
      orderBy: { createdAt: 'desc' },
      take: 50,
      include: {
        challengerTeam: { select: { id: true, name: true, avatarUrl: true } },
        opponentTeam: { select: { id: true, name: true, avatarUrl: true } },
      },
    });
    res.json(battles);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to load battles' });
  }
});

// GET /api/team-battles/my — battles for the current user's team
router.get('/my', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const team = await getUserTeam(userId);
    // Also find via any membership
    const membership = await prisma.teamMember.findFirst({ where: { userId } });
    const teamId = team?.id ?? membership?.teamId;
    if (!teamId) return res.json([]);

    const battles = await prisma.teamBattle.findMany({
      where: {
        OR: [{ challengerTeamId: teamId }, { opponentTeamId: teamId }],
      },
      orderBy: { createdAt: 'desc' },
      include: {
        challengerTeam: { select: { id: true, name: true, avatarUrl: true } },
        opponentTeam: { select: { id: true, name: true, avatarUrl: true } },
      },
    });
    res.json(battles);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to load battles' });
  }
});

// GET /api/team-battles/team/:teamId — battles for a specific team
router.get('/team/:teamId', async (req: AuthRequest, res: Response) => {
  try {
    const teamId = String(req.params.teamId);
    const battles = await prisma.teamBattle.findMany({
      where: {
        OR: [{ challengerTeamId: teamId }, { opponentTeamId: teamId }],
        status: { in: ['pending', 'active', 'finished'] },
      },
      orderBy: { createdAt: 'desc' },
      include: {
        challengerTeam: { select: { id: true, name: true, avatarUrl: true } },
        opponentTeam: { select: { id: true, name: true, avatarUrl: true } },
      },
    });
    res.json(battles);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to load battles' });
  }
});

// POST /api/team-battles/challenge — leader sends a challenge
router.post('/challenge', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const { opponentTeamId, sport, targetDistance, durationDays } = req.body;

    if (!opponentTeamId || !targetDistance || !durationDays) {
      return res.status(400).json({ error: 'opponentTeamId, targetDistance and durationDays are required' });
    }

    // Find challenger's team (must be owner or leader)
    const owned = await prisma.team.findFirst({ where: { ownerId: userId } });
    const membership = await prisma.teamMember.findFirst({
      where: { userId, role: { in: ['leader', 'officer'] } },
    });
    const challengerTeam = owned ?? (membership ? await prisma.team.findUnique({ where: { id: membership.teamId } }) : null);

    if (!challengerTeam) {
      return res.status(403).json({ error: 'You must be a team leader to issue a challenge' });
    }
    if (challengerTeam.id === opponentTeamId) {
      return res.status(400).json({ error: 'Cannot challenge your own team' });
    }

    // Check opponent exists
    const opponent = await prisma.team.findUnique({ where: { id: opponentTeamId } });
    if (!opponent) return res.status(404).json({ error: 'Opponent team not found' });

    const endsAt = new Date(Date.now() + Number(durationDays) * 86400000);

    const battle = await prisma.teamBattle.create({
      data: {
        challengerTeamId: challengerTeam.id,
        opponentTeamId,
        sport: sport || null,
        targetDistance: Number(targetDistance),
        endsAt,
        status: 'pending',
      },
      include: {
        challengerTeam: { select: { id: true, name: true, avatarUrl: true } },
        opponentTeam: { select: { id: true, name: true, avatarUrl: true } },
      },
    });

    res.json(battle);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create challenge' });
  }
});

// PUT /api/team-battles/:id/accept — opponent team leader accepts
router.put('/:id/accept', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const id = String(req.params.id);
    const battle = await prisma.teamBattle.findUnique({ where: { id } });
    if (!battle) return res.status(404).json({ error: 'Battle not found' });
    if (battle.status !== 'pending') return res.status(400).json({ error: 'Battle is not pending' });

    // Verify user is leader of opponent team
    const owned = await prisma.team.findFirst({ where: { ownerId: userId, id: battle.opponentTeamId } });
    const membership = await prisma.teamMember.findFirst({
      where: { userId, teamId: battle.opponentTeamId, role: { in: ['leader', 'officer'] } },
    });
    if (!owned && !membership) {
      return res.status(403).json({ error: 'Only the opponent team leader can accept' });
    }

    const updated = await prisma.teamBattle.update({
      where: { id },
      data: { status: 'active' },
      include: {
        challengerTeam: { select: { id: true, name: true, avatarUrl: true } },
        opponentTeam: { select: { id: true, name: true, avatarUrl: true } },
      },
    });
    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to accept battle' });
  }
});

// PUT /api/team-battles/:id/decline — opponent team leader declines
router.put('/:id/decline', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const id = String(req.params.id);
    const battle = await prisma.teamBattle.findUnique({ where: { id } });
    if (!battle) return res.status(404).json({ error: 'Battle not found' });
    if (battle.status !== 'pending') return res.status(400).json({ error: 'Battle is not pending' });

    const owned = await prisma.team.findFirst({ where: { ownerId: userId, id: battle.opponentTeamId } });
    const membership = await prisma.teamMember.findFirst({
      where: { userId, teamId: battle.opponentTeamId, role: { in: ['leader', 'officer'] } },
    });
    if (!owned && !membership) {
      return res.status(403).json({ error: 'Only the opponent team leader can decline' });
    }

    const updated = await prisma.teamBattle.update({
      where: { id },
      data: { status: 'declined' },
      include: {
        challengerTeam: { select: { id: true, name: true, avatarUrl: true } },
        opponentTeam: { select: { id: true, name: true, avatarUrl: true } },
      },
    });
    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to decline battle' });
  }
});

export default router;
