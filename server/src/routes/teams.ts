import { Router, Response } from 'express';
import { prisma } from '../lib/prisma';
import { authMiddleware } from '../middleware/auth';
import { AuthRequest } from '../types';
import { checkAndGrant } from '../services/AchievementService';

const router = Router();

// POST /api/teams — create team
router.post('/', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const { name, description, isPublic } = req.body;

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      res.status(400).json({ error: 'Team name is required' });
      return;
    }

    const existing = await prisma.team.findUnique({ where: { name: name.trim() } });
    if (existing) {
      res.status(409).json({ error: 'Team name already taken' });
      return;
    }

    const team = await prisma.team.create({
      data: {
        name: name.trim(),
        description: description || null,
        isPublic: isPublic !== false,
        ownerId: userId,
        memberCount: 1,
        members: {
          create: {
            userId,
            role: 'leader',
          },
        },
      },
      include: {
        members: { include: { user: { select: { id: true, username: true, avatarUrl: true } } } },
      },
    });

    await checkAndGrant(userId, { joinedTeam: true });

    res.status(201).json(team);
  } catch (error) {
    console.error('Create team error:', error);
    res.status(500).json({ error: 'Failed to create team' });
  }
});

// GET /api/teams — list teams
router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const search = String(req.query.search || '');
    const page = Math.max(1, parseInt(String(req.query.page || '1'), 10));
    const limit = Math.min(100, Math.max(1, parseInt(String(req.query.limit || '20'), 10)));

    const where: any = {};
    if (search) {
      where.name = { contains: search, mode: 'insensitive' };
    }

    const [teams, total] = await Promise.all([
      prisma.team.findMany({
        where,
        orderBy: { totalDistance: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          owner: { select: { id: true, username: true, avatarUrl: true } },
        },
      }),
      prisma.team.count({ where }),
    ]);

    res.json({
      items: teams,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error('List teams error:', error);
    res.status(500).json({ error: 'Failed to list teams' });
  }
});

// GET /api/teams/leaderboard — top teams by totalDistance
router.get('/leaderboard', async (_req: AuthRequest, res: Response) => {
  try {
    const teams = await prisma.team.findMany({
      orderBy: { totalDistance: 'desc' },
      take: 50,
      include: {
        owner: { select: { id: true, username: true, avatarUrl: true } },
      },
    });

    res.json(teams);
  } catch (error) {
    console.error('Team leaderboard error:', error);
    res.status(500).json({ error: 'Failed to get team leaderboard' });
  }
});

// GET /api/teams/:id — team details with members
router.get('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.id as string;

    const team = await prisma.team.findUnique({
      where: { id },
      include: {
        owner: { select: { id: true, username: true, avatarUrl: true } },
        members: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
                avatarUrl: true,
                totalDistance: true,
                level: true,
              },
            },
          },
          orderBy: { joinedAt: 'asc' },
        },
      },
    });

    if (!team) {
      res.status(404).json({ error: 'Team not found' });
      return;
    }

    res.json(team);
  } catch (error) {
    console.error('Get team error:', error);
    res.status(500).json({ error: 'Failed to get team' });
  }
});

// PUT /api/teams/:id — update team (owner only)
router.put('/:id', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    const userId = req.userId!;
    const { name, description, isPublic } = req.body;

    const team = await prisma.team.findUnique({ where: { id } });
    if (!team) {
      res.status(404).json({ error: 'Team not found' });
      return;
    }

    if (team.ownerId !== userId) {
      res.status(403).json({ error: 'Only the team owner can update the team' });
      return;
    }

    const data: any = {};
    if (name !== undefined) {
      if (typeof name !== 'string' || name.trim().length === 0) {
        res.status(400).json({ error: 'Team name cannot be empty' });
        return;
      }
      const existing = await prisma.team.findUnique({ where: { name: name.trim() } });
      if (existing && existing.id !== id) {
        res.status(409).json({ error: 'Team name already taken' });
        return;
      }
      data.name = name.trim();
    }
    if (description !== undefined) data.description = description;
    if (isPublic !== undefined) data.isPublic = isPublic;

    const updated = await prisma.team.update({ where: { id }, data });
    res.json(updated);
  } catch (error) {
    console.error('Update team error:', error);
    res.status(500).json({ error: 'Failed to update team' });
  }
});

// POST /api/teams/:id/join — join public team or by invite code
router.post('/:id/join', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    const userId = req.userId!;
    const { inviteCode } = req.body;

    const team = await prisma.team.findUnique({ where: { id } });
    if (!team) {
      res.status(404).json({ error: 'Team not found' });
      return;
    }

    if (!team.isPublic && team.inviteCode !== inviteCode) {
      res.status(403).json({ error: 'This team is private. Provide a valid invite code.' });
      return;
    }

    const existingMembership = await prisma.teamMember.findUnique({
      where: { userId_teamId: { userId, teamId: id } },
    });
    if (existingMembership) {
      res.status(409).json({ error: 'You are already a member of this team' });
      return;
    }

    await prisma.teamMember.create({
      data: { userId, teamId: id, role: 'member' },
    });

    await prisma.team.update({
      where: { id },
      data: { memberCount: { increment: 1 } },
    });

    await checkAndGrant(userId, { joinedTeam: true });

    res.json({ message: 'Joined team successfully' });
  } catch (error) {
    console.error('Join team error:', error);
    res.status(500).json({ error: 'Failed to join team' });
  }
});

// POST /api/teams/join-code — join by invite code
router.post('/join-code', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const { inviteCode } = req.body;

    if (!inviteCode) {
      res.status(400).json({ error: 'Invite code is required' });
      return;
    }

    const team = await prisma.team.findUnique({ where: { inviteCode } });
    if (!team) {
      res.status(404).json({ error: 'Invalid invite code' });
      return;
    }

    const existingMembership = await prisma.teamMember.findUnique({
      where: { userId_teamId: { userId, teamId: team.id } },
    });
    if (existingMembership) {
      res.status(409).json({ error: 'You are already a member of this team' });
      return;
    }

    await prisma.teamMember.create({
      data: { userId, teamId: team.id, role: 'member' },
    });

    await prisma.team.update({
      where: { id: team.id },
      data: { memberCount: { increment: 1 } },
    });

    await checkAndGrant(userId, { joinedTeam: true });

    res.json({ message: 'Joined team successfully', teamId: team.id, teamName: team.name });
  } catch (error) {
    console.error('Join by code error:', error);
    res.status(500).json({ error: 'Failed to join team' });
  }
});

// POST /api/teams/:id/leave — leave team
router.post('/:id/leave', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    const userId = req.userId!;

    const team = await prisma.team.findUnique({ where: { id } });
    if (!team) {
      res.status(404).json({ error: 'Team not found' });
      return;
    }

    if (team.ownerId === userId) {
      res.status(400).json({ error: 'Team owner cannot leave. Transfer ownership or delete the team.' });
      return;
    }

    const membership = await prisma.teamMember.findUnique({
      where: { userId_teamId: { userId, teamId: id } },
    });
    if (!membership) {
      res.status(404).json({ error: 'You are not a member of this team' });
      return;
    }

    await prisma.teamMember.delete({ where: { id: membership.id } });

    await prisma.team.update({
      where: { id },
      data: { memberCount: { decrement: 1 } },
    });

    res.json({ message: 'Left team successfully' });
  } catch (error) {
    console.error('Leave team error:', error);
    res.status(500).json({ error: 'Failed to leave team' });
  }
});

// DELETE /api/teams/:id/members/:userId — kick member (owner only)
router.delete('/:id/members/:userId', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const teamId = req.params.id as string;
    const targetUserId = req.params.userId as string;
    const requesterId = req.userId!;

    const team = await prisma.team.findUnique({ where: { id: teamId } });
    if (!team) {
      res.status(404).json({ error: 'Team not found' });
      return;
    }

    if (team.ownerId !== requesterId) {
      res.status(403).json({ error: 'Only the team owner can kick members' });
      return;
    }

    if (targetUserId === requesterId) {
      res.status(400).json({ error: 'Cannot kick yourself' });
      return;
    }

    const membership = await prisma.teamMember.findUnique({
      where: { userId_teamId: { userId: targetUserId, teamId } },
    });
    if (!membership) {
      res.status(404).json({ error: 'User is not a member of this team' });
      return;
    }

    await prisma.teamMember.delete({ where: { id: membership.id } });

    await prisma.team.update({
      where: { id: teamId },
      data: { memberCount: { decrement: 1 } },
    });

    res.json({ message: 'Member removed' });
  } catch (error) {
    console.error('Kick member error:', error);
    res.status(500).json({ error: 'Failed to kick member' });
  }
});

export default router;
