import { Router, Response } from 'express';
import { prisma } from '../lib/prisma';
import { authMiddleware } from '../middleware/auth';
import { AuthRequest } from '../types';

const router = Router();

const USER_SELECT = {
  id: true, username: true, avatarUrl: true, firstName: true, lastName: true, level: true, city: true,
};

// GET /api/messages/conversations — list all chats (mutual friends + anyone with history)
router.get('/conversations', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const me = req.userId!;

    // Get all users I've exchanged messages with
    const [sent, received] = await Promise.all([
      prisma.directMessage.findMany({
        where: { senderId: me },
        select: { receiverId: true, text: true, createdAt: true, isRead: true, senderId: true },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.directMessage.findMany({
        where: { receiverId: me },
        select: { senderId: true, text: true, createdAt: true, isRead: true, receiverId: true },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    // Get mutual followers (friends)
    const [myFollowing, myFollowers] = await Promise.all([
      prisma.follow.findMany({ where: { followerId: me }, select: { followingId: true } }),
      prisma.follow.findMany({ where: { followingId: me }, select: { followerId: true } }),
    ]);

    const followingSet = new Set(myFollowing.map(f => f.followingId));
    const followerSet = new Set(myFollowers.map(f => f.followerId));
    const friendIds = [...followingSet].filter(id => followerSet.has(id));

    // Build conversation map
    const convMap = new Map<string, { lastText: string; lastAt: Date; unread: number }>();

    for (const m of sent) {
      const uid = m.receiverId;
      const existing = convMap.get(uid);
      if (!existing || m.createdAt > existing.lastAt) {
        convMap.set(uid, { lastText: m.text, lastAt: m.createdAt, unread: existing?.unread ?? 0 });
      }
    }
    for (const m of received) {
      const uid = m.senderId;
      const existing = convMap.get(uid);
      const unread = (existing?.unread ?? 0) + (m.isRead ? 0 : 1);
      if (!existing || m.createdAt > existing.lastAt) {
        convMap.set(uid, { lastText: m.text, lastAt: m.createdAt, unread });
      } else {
        convMap.set(uid, { ...existing, unread });
      }
    }

    // Add friends without messages too
    for (const fid of friendIds) {
      if (!convMap.has(fid)) {
        convMap.set(fid, { lastText: '', lastAt: new Date(0), unread: 0 });
      }
    }

    const userIds = [...convMap.keys()];
    if (userIds.length === 0) return res.json([]);

    const users = await prisma.user.findMany({
      where: { id: { in: userIds } },
      select: USER_SELECT,
    });

    const conversations = users.map(u => ({
      user: u,
      isFriend: followingSet.has(u.id) && followerSet.has(u.id),
      isFollowing: followingSet.has(u.id),
      isFollower: followerSet.has(u.id),
      ...convMap.get(u.id)!,
    })).sort((a, b) => b.lastAt.getTime() - a.lastAt.getTime());

    res.json(conversations);
  } catch (err) {
    console.error('Conversations error:', err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// GET /api/messages/:userId — get message history
router.get('/:userId', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const me = req.userId!;
    const other = req.params.userId as string;

    const messages = await prisma.directMessage.findMany({
      where: {
        OR: [
          { senderId: me, receiverId: other },
          { senderId: other, receiverId: me },
        ],
      },
      orderBy: { createdAt: 'asc' },
      take: 100,
    });

    // Mark incoming as read
    await prisma.directMessage.updateMany({
      where: { senderId: other, receiverId: me, isRead: false },
      data: { isRead: true },
    });

    res.json(messages);
  } catch (err) {
    console.error('Get messages error:', err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// POST /api/messages/:userId — send message
router.post('/:userId', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const me = req.userId!;
    const other = req.params.userId as string;
    const { text } = req.body;

    if (!text || !text.trim()) {
      res.status(400).json({ error: 'Сообщение не может быть пустым' });
      return;
    }

    if (me === other) {
      res.status(400).json({ error: 'Нельзя писать самому себе' });
      return;
    }

    const message = await prisma.directMessage.create({
      data: { senderId: me, receiverId: other, text: text.trim() },
    });

    // Notification
    const sender = await prisma.user.findUnique({ where: { id: me }, select: { username: true } });
    await prisma.notification.create({
      data: {
        userId: other,
        type: 'message',
        fromUserId: me,
        entityId: message.id,
        text: `${sender?.username ?? 'Кто-то'} написал вам сообщение`,
      },
    }).catch(() => {});

    res.status(201).json(message);
  } catch (err) {
    console.error('Send message error:', err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

export default router;
