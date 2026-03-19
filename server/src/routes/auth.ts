import { Router, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { prisma } from '../lib/prisma';
import { authMiddleware } from '../middleware/auth';
import { AuthRequest, JwtPayload, Role } from '../types';

const router = Router();

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'dev-refresh-secret-change-me';
const ACCESS_TOKEN_EXPIRY = '15m';
const REFRESH_TOKEN_EXPIRY_DAYS = 7;

// ─── Helpers ─────────────────────────────────────────────

function generateAccessToken(payload: JwtPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: ACCESS_TOKEN_EXPIRY });
}

function generateRefreshToken(): string {
  return crypto.randomBytes(40).toString('hex');
}

function generateReferralCode(): string {
  return crypto.randomBytes(6).toString('base64url');
}

function sanitizeUser(user: Record<string, unknown>) {
  const { passwordHash, stravaToken, stravaRefresh, ...safe } = user;
  return safe;
}

// ─── POST /api/auth/register ─────────────────────────────

router.post('/register', async (req: AuthRequest, res: Response) => {
  try {
    const { username, email, password, referralCode } = req.body;

    if (!username || !email || !password) {
      res.status(400).json({ error: 'Заполните логин, email и пароль' });
      return;
    }

    if (password.length < 6) {
      res.status(400).json({ error: 'Пароль должен быть не менее 6 символов' });
      return;
    }

    const existing = await prisma.user.findFirst({
      where: {
        OR: [
          { email: email.toLowerCase() },
          { username: username.toLowerCase() },
        ],
      },
    });

    if (existing) {
      const emailTaken = existing.email === email.toLowerCase();
      res.status(409).json({ error: emailTaken ? 'Этот email уже зарегистрирован' : 'Этот логин уже занят' });
      return;
    }

    let referredById: string | undefined;
    if (referralCode) {
      const referrer = await prisma.user.findUnique({
        where: { referralCode },
      });
      if (referrer) {
        referredById = referrer.id;
      }
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const user = await prisma.user.create({
      data: {
        username: username.toLowerCase(),
        email: email.toLowerCase(),
        passwordHash,
        referralCode: generateReferralCode(),
        ...(referredById && { referredById }),
      },
    });

    const accessToken = generateAccessToken({ userId: user.id, role: user.role as Role });
    const refreshToken = generateRefreshToken();

    await prisma.refreshToken.create({
      data: {
        token: refreshToken,
        userId: user.id,
        expiresAt: new Date(Date.now() + REFRESH_TOKEN_EXPIRY_DAYS * 24 * 60 * 60 * 1000),
      },
    });

    res.status(201).json({
      accessToken,
      refreshToken,
      user: sanitizeUser(user as unknown as Record<string, unknown>),
    });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ error: 'Ошибка при регистрации' });
  }
});

// ─── POST /api/auth/login ────────────────────────────────

router.post('/login', async (req: AuthRequest, res: Response) => {
  try {
    const { login, password } = req.body;

    if (!login || !password) {
      res.status(400).json({ error: 'Введите логин и пароль' });
      return;
    }

    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { email: login.toLowerCase() },
          { username: login.toLowerCase() },
        ],
      },
    });

    if (!user) {
      res.status(401).json({ error: 'Пользователь с таким логином или email не найден' });
      return;
    }

    if (user.isBanned) {
      res.status(403).json({ error: 'Аккаунт заблокирован' });
      return;
    }

    const isValid = await bcrypt.compare(password, user.passwordHash);
    if (!isValid) {
      res.status(401).json({ error: 'Неверный пароль' });
      return;
    }

    const accessToken = generateAccessToken({ userId: user.id, role: user.role as Role });
    const refreshToken = generateRefreshToken();

    await prisma.refreshToken.create({
      data: {
        token: refreshToken,
        userId: user.id,
        expiresAt: new Date(Date.now() + REFRESH_TOKEN_EXPIRY_DAYS * 24 * 60 * 60 * 1000),
      },
    });

    res.json({
      accessToken,
      refreshToken,
      user: sanitizeUser(user as unknown as Record<string, unknown>),
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Ошибка при входе' });
  }
});

// ─── POST /api/auth/refresh ──────────────────────────────

router.post('/refresh', async (req: AuthRequest, res: Response) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      res.status(400).json({ error: 'Токен не передан' });
      return;
    }

    const stored = await prisma.refreshToken.findUnique({
      where: { token: refreshToken },
      include: { user: true },
    });

    if (!stored || stored.expiresAt < new Date()) {
      if (stored) {
        await prisma.refreshToken.delete({ where: { id: stored.id } });
      }
      res.status(401).json({ error: 'Сессия устарела, войдите снова' });
      return;
    }

    // Delete old token (rotation)
    await prisma.refreshToken.delete({ where: { id: stored.id } });

    const newAccessToken = generateAccessToken({
      userId: stored.user.id,
      role: stored.user.role as Role,
    });
    const newRefreshToken = generateRefreshToken();

    await prisma.refreshToken.create({
      data: {
        token: newRefreshToken,
        userId: stored.user.id,
        expiresAt: new Date(Date.now() + REFRESH_TOKEN_EXPIRY_DAYS * 24 * 60 * 60 * 1000),
      },
    });

    res.json({
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
    });
  } catch (err) {
    console.error('Refresh error:', err);
    res.status(500).json({ error: 'Token refresh failed' });
  }
});

// ─── POST /api/auth/logout ───────────────────────────────

router.post('/logout', async (req: AuthRequest, res: Response) => {
  try {
    const { refreshToken } = req.body;

    if (refreshToken) {
      await prisma.refreshToken.deleteMany({
        where: { token: refreshToken },
      });
    }

    res.json({ message: 'Logged out successfully' });
  } catch (err) {
    console.error('Logout error:', err);
    res.status(500).json({ error: 'Logout failed' });
  }
});

// ─── GET /api/auth/me ────────────────────────────────────

router.get('/me', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      include: {
        _count: {
          select: {
            activities: true,
            eventParticipations: true,
            achievements: true,
            referrals: true,
          },
        },
      },
    });

    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    res.json(sanitizeUser(user as unknown as Record<string, unknown>));
  } catch (err) {
    console.error('Me error:', err);
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

export default router;
