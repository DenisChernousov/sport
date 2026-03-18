import { Router, Response } from 'express';
import { prisma } from '../lib/prisma';
import { authMiddleware } from '../middleware/auth';
import type { AuthRequest } from '../types';

const router = Router();

// ─── POST /api/merch/order ──────────────────────────────

router.post('/order', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const { eventId, package: pkgId, address, phone } = req.body;

    if (!eventId || !pkgId) {
      return res.status(400).json({ message: 'eventId and package are required' });
    }

    // Look up package from DB
    const dbPkg = await prisma.merchPackage.findUnique({ where: { id: pkgId } });
    const amount = dbPkg?.price ?? 0;
    const isFree = amount === 0;

    // Require address and phone for paid packages
    if (!isFree && (!address || !phone)) {
      return res.status(400).json({ message: 'Укажите адрес и телефон для платных пакетов' });
    }

    const order = await prisma.merchOrder.create({
      data: {
        userId,
        eventId,
        package: pkgId,
        amount,
        status: isFree ? 'confirmed' : 'pending',
        address: address || null,
        phone: phone || null,
      },
    });

    return res.status(201).json(order);
  } catch (err: any) {
    console.error('Merch order error:', err);
    return res.status(500).json({ message: 'Failed to create order' });
  }
});

// ─── GET /api/merch/orders ──────────────────────────────

router.get('/orders', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;

    const orders = await prisma.merchOrder.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });

    return res.json(orders);
  } catch (err: any) {
    console.error('Merch orders list error:', err);
    return res.status(500).json({ message: 'Failed to fetch orders' });
  }
});

export default router;
