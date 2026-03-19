import express from 'express';
import cors from 'cors';
import path from 'path';
import { createServer } from 'http';
import { prisma } from './lib/prisma';
import { seedAchievements } from './services/AchievementService';

// Routes
import authRouter from './routes/auth';
import eventsRouter from './routes/events';
import profileRouter from './routes/profile';
import activitiesRouter from './routes/activities';
import teamsRouter from './routes/teams';
import battlesRouter from './routes/battles';
import leaderboardRouter from './routes/leaderboard';
import teamBattlesRouter from './routes/team-battles';
import merchRouter from './routes/merch';
import photosRouter from './routes/photos';
import diplomaRouter from './routes/diploma';
import packagesRouter from './routes/packages';
import socialRouter from './routes/social';
import adminRouter from './routes/admin';
import moderatorRouter from './routes/moderator';
import settingsRouter from './routes/settings';
import notificationsRouter from './routes/notifications';
import messagesRouter from './routes/messages';

const app = express();
const server = createServer(app);
const PORT = process.env.PORT || 3002;

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', uptime: process.uptime() });
});

// API routes
app.use('/api/auth', authRouter);
app.use('/api/events', eventsRouter);
app.use('/api/profile', profileRouter);
app.use('/api/activities', activitiesRouter);
app.use('/api/teams', teamsRouter);
app.use('/api/battles', battlesRouter);
app.use('/api/team-battles', teamBattlesRouter);
app.use('/api/leaderboard', leaderboardRouter);
app.use('/api/merch', merchRouter);
app.use('/api/packages', packagesRouter);
app.use('/api', photosRouter);
app.use('/api', diplomaRouter);
app.use('/api', socialRouter);
app.use('/api/admin', adminRouter);
app.use('/api/mod', moderatorRouter);
app.use('/api/settings', settingsRouter);
app.use('/api/notifications', notificationsRouter);
app.use('/api/messages', messagesRouter);

// Start
async function start() {
  // Seed achievements
  await seedAchievements();
  console.log('Achievements seeded');

  server.listen(PORT, () => {
    console.log(`SportRun server running on port ${PORT}`);
  });
}

start().catch(console.error);

// Graceful shutdown
process.on('SIGINT', async () => {
  await prisma.$disconnect();
  process.exit(0);
});
