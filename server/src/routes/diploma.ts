import { Router, Response } from 'express';
import jwt from 'jsonwebtoken';
import PDFDocument from 'pdfkit';
import path from 'path';
import fs from 'fs';
import https from 'https';
import http from 'http';
import { prisma } from '../lib/prisma';

const FONT_PATH = path.join(__dirname, '..', '..', 'assets', 'fonts', 'Roboto.ttf');
import { AuthRequest, JwtPayload } from '../types';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';

interface DiplomaSettings {
  showBorder: boolean;
  borderColor: string;
  titleColor: string;
  titleSize: number;
  subtitleColor: string;
  nameColor: string;
  nameSize: number;
  distanceColor: string;
  distanceSize: number;
  textColor: string;
  footerColor: string;
}

const DEFAULT_SETTINGS: DiplomaSettings = {
  showBorder: false,
  borderColor: '#fc4c02',
  titleColor: '#fc4c02',
  titleSize: 48,
  subtitleColor: '#666666',
  nameColor: '#242424',
  nameSize: 30,
  distanceColor: '#fc4c02',
  distanceSize: 42,
  textColor: '#666666',
  footerColor: '#fc4c02',
};

// ─── GET /api/events/:id/diploma ────────────────────────
// Auth via Bearer header OR ?token= query param (for direct browser download)

router.get('/events/:id/diploma', async (req: AuthRequest, res: Response) => {
  try {
    // Authenticate: support both header and query param
    const token =
      (typeof req.query.token === 'string' ? req.query.token : undefined) ||
      req.headers.authorization?.split(' ')[1];

    if (!token) {
      res.status(401).json({ error: 'Требуется авторизация' });
      return;
    }

    let userId: string;
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as JwtPayload;
      userId = decoded.userId;
    } catch {
      res.status(401).json({ error: 'Недействительный токен' });
      return;
    }

    // Fetch event
    const event = await prisma.event.findUnique({ where: { id: req.params.id as string } });
    if (!event) {
      res.status(404).json({ error: 'Событие не найдено' });
      return;
    }

    // Fetch participant
    const participant = await prisma.eventParticipant.findUnique({
      where: { userId_eventId: { userId, eventId: event.id } },
    });

    if (!participant) {
      res.status(400).json({ error: 'Вы не участвуете в этом событии' });
      return;
    }

    // Check completion
    const targetDist = event.targetDistance ?? event.maxDistance;
    const isWeeklyOrNoTarget = event.type === 'WEEKLY' || targetDist == null || targetDist === 0;

    if (isWeeklyOrNoTarget) {
      // Allow diploma if user has any recorded distance
      if (participant.totalDistance <= 0) {
        res.status(400).json({ error: 'Вы ещё не завершили событие' });
        return;
      }
    } else {
      if (participant.totalDistance < targetDist) {
        res.status(400).json({ error: 'Вы ещё не завершили событие' });
        return;
      }
    }

    // Fetch user for name
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { username: true, firstName: true, lastName: true },
    });

    if (!user) {
      res.status(404).json({ error: 'Пользователь не найден' });
      return;
    }

    const displayName =
      user.firstName && user.lastName
        ? `${user.firstName} ${user.lastName}`
        : user.username;

    // Merge diploma settings with defaults
    const rawSettings = (event as any).diplomaSettings as Partial<DiplomaSettings> | null;
    const s: DiplomaSettings = { ...DEFAULT_SETTINGS, ...rawSettings };

    // ─── Generate PDF (A4 Landscape) ──────────────────────

    const doc = new PDFDocument({
      size: 'A4',
      layout: 'landscape',
      margins: { top: 40, bottom: 40, left: 40, right: 40 },
      info: {
        Title: `Диплом — ${event.title}`,
        Author: 'SportRun',
      },
    });

    // Set response headers
    const safeTitle = event.title.replace(/[^a-zA-Zа-яА-ЯёЁ0-9\s-]/g, '').trim();
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="diploma-${encodeURIComponent(safeTitle)}.pdf"`
    );

    doc.pipe(res);
    doc.registerFont('Roboto', FONT_PATH);

    const pageW = doc.page.width;
    const pageH = doc.page.height;

    // ── Background image (if event has diplomaBgUrl) ──
    if (event.diplomaBgUrl) {
      try {
        // If it's a local file (starts with /uploads/)
        const bgPath = event.diplomaBgUrl.startsWith('/uploads/')
          ? path.join(__dirname, '..', '..', event.diplomaBgUrl)
          : null;

        if (bgPath && fs.existsSync(bgPath)) {
          doc.image(bgPath, 0, 0, { width: pageW, height: pageH });
        }
      } catch {
        // Ignore background errors — continue without background
      }
    }

    // ── Decorative border (conditional) ──
    if (s.showBorder) {
      // Outer border
      doc
        .rect(20, 20, pageW - 40, pageH - 40)
        .lineWidth(3)
        .strokeColor(s.borderColor)
        .stroke();

      // Inner border
      doc
        .rect(30, 30, pageW - 60, pageH - 60)
        .lineWidth(1)
        .strokeColor(s.borderColor)
        .stroke();
    }

    // ── Top decorative line ──
    const lineY = 55;
    doc
      .moveTo(80, lineY)
      .lineTo(pageW - 80, lineY)
      .lineWidth(2)
      .strokeColor(s.footerColor)
      .stroke();

    // ── Title: ДИПЛОМ ──
    let y = 70;
    doc
      .font('Roboto')
      .fontSize(s.titleSize)
      .fillColor(s.titleColor)
      .text('ДИПЛОМ', 0, y, { align: 'center', width: pageW });

    // ── Subtitle ──
    y += 60;
    const typeLabels: Record<string, string> = {
      RACE: 'Виртуальный забег',
      CHALLENGE: 'Виртуальный челлендж',
      ULTRAMARATHON: 'Виртуальный ультрамарафон',
      WEEKLY: 'Еженедельный забег',
      BATTLE: 'Батл',
    };
    const subtitle = typeLabels[event.type] || 'Виртуальный забег';
    doc
      .font('Roboto')
      .fontSize(16)
      .fillColor(s.subtitleColor)
      .text(subtitle, 0, y, { align: 'center', width: pageW });

    // ── Event title ──
    y += 32;
    doc
      .font('Roboto')
      .fontSize(26)
      .fillColor(s.titleColor)
      .text(event.title, 0, y, { align: 'center', width: pageW });

    // ── Decorative line ──
    y += 40;
    doc
      .moveTo(pageW / 2 - 100, y)
      .lineTo(pageW / 2 + 100, y)
      .lineWidth(1)
      .strokeColor('#dddddd')
      .stroke();

    // ── Confirmation text ──
    y += 16;
    doc
      .font('Roboto')
      .fontSize(14)
      .fillColor(s.textColor)
      .text('Настоящим подтверждается, что', 0, y, { align: 'center', width: pageW });

    // ── User name ──
    y += 28;
    doc
      .font('Roboto')
      .fontSize(s.nameSize)
      .fillColor(s.nameColor)
      .text(displayName, 0, y, { align: 'center', width: pageW });

    // ── "successfully completed" ──
    y += 44;
    doc
      .font('Roboto')
      .fontSize(14)
      .fillColor(s.textColor)
      .text('успешно завершил(а) дистанцию', 0, y, { align: 'center', width: pageW });

    // ── Distance ──
    y += 28;
    const distKm = participant.totalDistance.toFixed(1);
    doc
      .font('Roboto')
      .fontSize(s.distanceSize)
      .fillColor(s.distanceColor)
      .text(`${distKm} км`, 0, y, { align: 'center', width: pageW });

    // ── Duration (if available) ──
    y += 54;
    if (participant.totalTime > 0) {
      const hours = Math.floor(participant.totalTime / 3600);
      const mins = Math.floor((participant.totalTime % 3600) / 60);
      const timeStr = hours > 0 ? `${hours} ч ${mins} мин` : `${mins} мин`;
      doc
        .font('Roboto')
        .fontSize(14)
        .fillColor(s.textColor)
        .text(`Общее время: ${timeStr}`, 0, y, { align: 'center', width: pageW });
      y += 22;
    }

    // ── Medal ──
    if (event.medalName) {
      // Skip emoji icons - Roboto doesn't support them
      const medalText = `Медаль: ${event.medalName}`;
      doc
        .font('Roboto')
        .fontSize(16)
        .fillColor('#b8860b')
        .text(medalText, 0, y, { align: 'center', width: pageW });
      y += 26;
    }

    // ── Event dates ──
    const dateFmt = (d: Date) =>
      d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });
    doc
      .font('Roboto')
      .fontSize(11)
      .fillColor(s.textColor)
      .text(
        `Период события: ${dateFmt(event.startDate)} — ${dateFmt(event.endDate)}`,
        0,
        y,
        { align: 'center', width: pageW }
      );

    // ── Date of completion ──
    y += 18;
    const completionDate = participant.finishedAt || new Date();
    doc
      .font('Roboto')
      .fontSize(11)
      .fillColor(s.textColor)
      .text(
        `Дата завершения: ${dateFmt(completionDate instanceof Date ? completionDate : new Date(completionDate))}`,
        0,
        y,
        { align: 'center', width: pageW }
      );

    // ── Bottom decorative line ──
    y += 30;
    doc
      .moveTo(80, y)
      .lineTo(pageW - 80, y)
      .lineWidth(2)
      .strokeColor(s.footerColor)
      .stroke();

    // ── Footer ──
    y += 14;
    doc
      .font('Roboto')
      .fontSize(14)
      .fillColor(s.footerColor)
      .text('SportRun — Виртуальные забеги', 0, y, { align: 'center', width: pageW });

    doc.end();
  } catch (err) {
    console.error('Diploma generation error:', err);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Ошибка генерации диплома' });
    }
  }
});

export default router;
