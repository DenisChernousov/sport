import { Router, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { prisma } from '../lib/prisma';
import { authMiddleware, optionalAuth } from '../middleware/auth';
import { AuthRequest } from '../types';

const router = Router();

// Photo upload storage
const photoStorage = multer.diskStorage({
  destination(_req, _file, cb) {
    const dir = path.join(__dirname, '..', '..', 'uploads', 'photos');
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename(req: AuthRequest, file, cb) {
    const ext = path.extname(file.originalname) || '.jpg';
    const activityId = (req.params as any).id || 'unknown';
    const i = (req as any)._photoIndex ?? 0;
    (req as any)._photoIndex = i + 1;
    cb(null, `${activityId}-${Date.now()}-${i}${ext}`);
  },
});

const photoUpload = multer({
  storage: photoStorage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter(_req, file, cb) {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  },
});

// POST /api/activities/:id/photos — upload photos (max 5)
router.post(
  '/activities/:id/photos',
  authMiddleware as any,
  photoUpload.array('photos', 5),
  async (req: AuthRequest, res: Response) => {
    try {
      const activityId = req.params.id as string;
      const userId = req.userId!;

      const activity = await prisma.activity.findUnique({
        where: { id: activityId },
        select: { userId: true },
      });

      if (!activity) {
        res.status(404).json({ message: 'Активность не найдена' });
        return;
      }

      if (activity.userId !== userId) {
        res.status(403).json({ message: 'Можно добавлять фото только к своим активностям' });
        return;
      }

      const files = req.files as Express.Multer.File[];
      if (!files || files.length === 0) {
        res.status(400).json({ message: 'Нет файлов для загрузки' });
        return;
      }

      const photos = await Promise.all(
        files.map((file) =>
          prisma.activityPhoto.create({
            data: {
              activityId,
              imageUrl: `/uploads/photos/${file.filename}`,
            },
          })
        )
      );

      res.json(photos);
    } catch (err) {
      console.error('Photo upload error:', err);
      res.status(500).json({ message: 'Ошибка загрузки фото' });
    }
  }
);

// GET /api/activities/:id/photos — get photos for activity
router.get('/activities/:id/photos', async (req: AuthRequest, res: Response) => {
  try {
    const activityId = req.params.id as string;
    const photos = await prisma.activityPhoto.findMany({
      where: { activityId },
      orderBy: { createdAt: 'asc' },
    });
    res.json(photos);
  } catch (err) {
    console.error('Get photos error:', err);
    res.status(500).json({ message: 'Ошибка получения фото' });
  }
});

// DELETE /api/photos/:id — delete photo (owner only)
router.delete(
  '/photos/:id',
  authMiddleware as any,
  async (req: AuthRequest, res: Response) => {
    try {
      const photoId = req.params.id as string;
      const userId = req.userId!;

      const photo = await prisma.activityPhoto.findUnique({
        where: { id: photoId },
        include: { activity: { select: { userId: true } } },
      });

      if (!photo) {
        res.status(404).json({ message: 'Фото не найдено' });
        return;
      }

      if (photo.activity.userId !== userId) {
        res.status(403).json({ message: 'Можно удалять только свои фото' });
        return;
      }

      // Delete file from disk
      const filePath = path.join(__dirname, '..', '..', photo.imageUrl);
      try {
        fs.unlinkSync(filePath);
      } catch {
        // file may not exist, that's ok
      }

      await prisma.activityPhoto.delete({ where: { id: photoId } });
      res.status(204).send();
    } catch (err) {
      console.error('Delete photo error:', err);
      res.status(500).json({ message: 'Ошибка удаления фото' });
    }
  }
);

// POST /api/activities/:id/like — toggle like
router.post(
  '/activities/:id/like',
  authMiddleware as any,
  async (req: AuthRequest, res: Response) => {
    try {
      const activityId = req.params.id as string;
      const userId = req.userId!;

      const existing = await prisma.activityLike.findUnique({
        where: { activityId_userId: { activityId, userId } },
      });

      let liked: boolean;
      if (existing) {
        await prisma.activityLike.delete({ where: { id: existing.id } });
        liked = false;
      } else {
        await prisma.activityLike.create({
          data: { activityId, userId },
        });
        liked = true;
      }

      const count = await prisma.activityLike.count({ where: { activityId } });
      res.json({ liked, count });
    } catch (err) {
      console.error('Like error:', err);
      res.status(500).json({ message: 'Ошибка' });
    }
  }
);

// GET /api/activities/:id/likes — get like count and whether current user liked
router.get(
  '/activities/:id/likes',
  optionalAuth as any,
  async (req: AuthRequest, res: Response) => {
    try {
      const activityId = req.params.id as string;
      const userId = req.userId;

      const count = await prisma.activityLike.count({ where: { activityId } });

      let liked = false;
      if (userId) {
        const existing = await prisma.activityLike.findUnique({
          where: { activityId_userId: { activityId, userId } },
        });
        liked = !!existing;
      }

      res.json({ liked, count });
    } catch (err) {
      console.error('Get likes error:', err);
      res.status(500).json({ message: 'Ошибка' });
    }
  }
);

export default router;
