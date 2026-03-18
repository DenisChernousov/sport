import { Router, Response } from 'express';
import { prisma } from '../lib/prisma';
import { authMiddleware, adminMiddleware } from '../middleware/auth';
import type { AuthRequest } from '../types';

const router = Router();

// ─── Seed default packages if none exist ─────────────────

async function seedDefaultPackages() {
  const count = await prisma.merchPackage.count();
  if (count > 0) return;

  await prisma.merchPackage.createMany({
    data: [
      {
        name: 'Бесплатное участие',
        price: 0,
        features: ['Участие в событии', 'Электронный диплом', 'Попадание в рейтинг'],
        icon: '🎫',
        sortOrder: 0,
        isActive: true,
      },
      {
        name: 'Медаль',
        price: 990,
        features: [
          'Участие в событии',
          'Электронный диплом',
          'Попадание в рейтинг',
          'Персональная медаль с гравировкой',
          'Доставка по России',
        ],
        icon: '🏅',
        sortOrder: 1,
        isActive: true,
      },
      {
        name: 'Премиум',
        price: 1990,
        features: [
          'Участие в событии',
          'Электронный диплом',
          'Попадание в рейтинг',
          'Персональная медаль с гравировкой',
          'Доставка по России',
          'Фирменная футболка',
          'Бафф/повязка',
          'Наклейки',
        ],
        icon: '🎁',
        sortOrder: 2,
        isActive: true,
      },
      {
        name: 'VIP',
        price: 3490,
        features: [
          'Участие в событии',
          'Электронный диплом',
          'Попадание в рейтинг',
          'Персональная медаль с гравировкой',
          'Доставка по России',
          'Фирменная футболка',
          'Бафф/повязка',
          'Наклейки',
          'Худи с символикой',
          'Бутылка для воды',
          'Персональный номер',
        ],
        icon: '👑',
        sortOrder: 3,
        isActive: true,
      },
    ],
  });

  console.log('Default merch packages seeded');
}

// Seed on import
seedDefaultPackages().catch(console.error);

// ─── GET /api/packages — public, active only ─────────────

router.get('/', async (_req: AuthRequest, res: Response) => {
  try {
    const packages = await prisma.merchPackage.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
    });
    res.json(packages);
  } catch (err) {
    console.error('List packages error:', err);
    res.status(500).json({ error: 'Failed to fetch packages' });
  }
});

// ─── GET /api/admin/packages — all packages (admin) ──────

router.get('/admin', authMiddleware, adminMiddleware, async (_req: AuthRequest, res: Response) => {
  try {
    const packages = await prisma.merchPackage.findMany({
      orderBy: { sortOrder: 'asc' },
    });
    res.json(packages);
  } catch (err) {
    console.error('Admin list packages error:', err);
    res.status(500).json({ error: 'Failed to fetch packages' });
  }
});

// ─── POST /api/admin/packages — create (admin) ───────────

router.post('/admin', authMiddleware, adminMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { name, price, features, icon, sortOrder, isActive } = req.body;

    if (!name) {
      res.status(400).json({ error: 'Name is required' });
      return;
    }

    const pkg = await prisma.merchPackage.create({
      data: {
        name,
        price: price !== undefined ? parseFloat(price) : 0,
        features: Array.isArray(features) ? features : [],
        icon: icon || '🎫',
        sortOrder: sortOrder !== undefined ? parseInt(sortOrder, 10) : 0,
        isActive: isActive !== undefined ? isActive : true,
      },
    });

    res.status(201).json(pkg);
  } catch (err) {
    console.error('Create package error:', err);
    res.status(500).json({ error: 'Failed to create package' });
  }
});

// ─── PUT /api/admin/packages/:id — update (admin) ────────

router.put('/admin/:id', authMiddleware, adminMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.id as string;

    const existing = await prisma.merchPackage.findUnique({ where: { id } });
    if (!existing) {
      res.status(404).json({ error: 'Package not found' });
      return;
    }

    const { name, price, features, icon, sortOrder, isActive } = req.body;

    const data: Record<string, unknown> = {};
    if (name !== undefined) data.name = name;
    if (price !== undefined) data.price = parseFloat(price);
    if (features !== undefined) data.features = Array.isArray(features) ? features : [];
    if (icon !== undefined) data.icon = icon;
    if (sortOrder !== undefined) data.sortOrder = parseInt(sortOrder, 10);
    if (isActive !== undefined) data.isActive = isActive;

    const pkg = await prisma.merchPackage.update({ where: { id }, data });
    res.json(pkg);
  } catch (err) {
    console.error('Update package error:', err);
    res.status(500).json({ error: 'Failed to update package' });
  }
});

// ─── DELETE /api/admin/packages/:id — delete (admin) ─────

router.delete('/admin/:id', authMiddleware, adminMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.id as string;

    const existing = await prisma.merchPackage.findUnique({ where: { id } });
    if (!existing) {
      res.status(404).json({ error: 'Package not found' });
      return;
    }

    await prisma.merchPackage.delete({ where: { id } });
    res.status(204).send();
  } catch (err) {
    console.error('Delete package error:', err);
    res.status(500).json({ error: 'Failed to delete package' });
  }
});

export default router;
