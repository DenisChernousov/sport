import { Router, Response } from 'express';
import path from 'path';
import fs from 'fs';
import multer from 'multer';
import { prisma } from '../lib/prisma';
import { authMiddleware, adminMiddleware } from '../middleware/auth';
import type { AuthRequest } from '../types';

const DEFAULTS: Record<string, string> = {
  hero_title: 'Виртуальные события',
  hero_subtitle: 'Забеги, челленджи и соревнования — участвуй из любой точки мира. Зарабатывай XP, получай медали, соревнуйся.',
  hero_bg_url: '',
  hero_bg_color: '#fc4c02',
};

async function seedDefaults(): Promise<void> {
  const count = await prisma.siteSetting.count();
  if (count > 0) return;
  await prisma.siteSetting.createMany({
    data: Object.entries(DEFAULTS).map(([key, value]) => ({ key, value })),
    skipDuplicates: true,
  });
}

const heroBgStorage = multer.diskStorage({
  destination(_req, _file, cb) {
    const dir = path.join(__dirname, '..', '..', 'uploads', 'site');
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename(_req, file, cb) {
    const ext = path.extname(file.originalname) || '.jpg';
    cb(null, `hero-bg-${Date.now()}${ext}`);
  },
});
const heroBgUpload = multer({ storage: heroBgStorage, limits: { fileSize: 10 * 1024 * 1024 } });

const router = Router();

// ─── GET /api/settings/public ────────────────────────────

router.get('/public', async (_req: AuthRequest, res: Response) => {
  try {
    await seedDefaults();
    const rows = await prisma.siteSetting.findMany();
    const result: Record<string, string> = {};
    for (const row of rows) {
      result[row.key] = row.value ?? '';
    }
    res.json(result);
  } catch (err) {
    console.error('Get settings error:', err);
    res.status(500).json({ error: 'Не удалось загрузить настройки' });
  }
});

// ─── PUT /api/settings/:key ──────────────────────────────

router.put('/:key', authMiddleware, adminMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const key = String(req.params.key ?? '');
    const { value } = req.body ?? {};
    if (typeof value !== 'string') {
      res.status(400).json({ error: 'value обязательно (строка)' });
      return;
    }
    await prisma.siteSetting.upsert({
      where: { key },
      update: { value },
      create: { key, value },
    });
    res.json({ key, value });
  } catch (err) {
    console.error('Update setting error:', err);
    res.status(500).json({ error: 'Не удалось обновить настройку' });
  }
});

// ─── POST /api/settings/hero-bg ──────────────────────────

router.post('/hero-bg', authMiddleware, adminMiddleware, heroBgUpload.single('image'), async (req: AuthRequest, res: Response) => {
  try {
    if (!req.file) {
      res.status(400).json({ error: 'Файл не загружен' });
      return;
    }
    const url = `/uploads/site/${req.file.filename}`;
    await prisma.siteSetting.upsert({
      where: { key: 'hero_bg_url' },
      update: { value: url },
      create: { key: 'hero_bg_url', value: url },
    });
    res.json({ url });
  } catch (err) {
    console.error('Upload hero bg error:', err);
    res.status(500).json({ error: 'Не удалось загрузить фон' });
  }
});

export default router;
