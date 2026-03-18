import { prisma } from '../lib/prisma';

interface AchievementDef {
  code: string;
  name: string;
  description: string;
  icon: string;
  xpReward: number;
  category: string;
  threshold: number | null;
}

const ACHIEVEMENTS: AchievementDef[] = [
  { code: 'FIRST_ACTIVITY', name: 'First Step', description: 'Complete your first activity', icon: '👟', xpReward: 25, category: 'distance', threshold: 1 },
  { code: 'DISTANCE_10', name: '10km Club', description: 'Run a total of 10 km', icon: '🏃', xpReward: 50, category: 'distance', threshold: 10 },
  { code: 'DISTANCE_50', name: '50km Warrior', description: 'Run a total of 50 km', icon: '⚔️', xpReward: 100, category: 'distance', threshold: 50 },
  { code: 'DISTANCE_100', name: 'Century', description: 'Run a total of 100 km', icon: '💯', xpReward: 150, category: 'distance', threshold: 100 },
  { code: 'DISTANCE_500', name: 'Ultra Runner', description: 'Run a total of 500 km', icon: '🦸', xpReward: 300, category: 'distance', threshold: 500 },
  { code: 'DISTANCE_1000', name: '1000km Legend', description: 'Run a total of 1000 km', icon: '🏆', xpReward: 500, category: 'distance', threshold: 1000 },
  { code: 'STREAK_7', name: 'Week Warrior', description: 'Maintain a 7-day activity streak', icon: '🔥', xpReward: 75, category: 'streak', threshold: 7 },
  { code: 'STREAK_30', name: 'Monthly Machine', description: 'Maintain a 30-day activity streak', icon: '⚡', xpReward: 200, category: 'streak', threshold: 30 },
  { code: 'STREAK_100', name: '100 Day Champion', description: 'Maintain a 100-day activity streak', icon: '👑', xpReward: 500, category: 'streak', threshold: 100 },
  { code: 'EVENTS_1', name: 'First Race', description: 'Complete your first event', icon: '🎽', xpReward: 50, category: 'event', threshold: 1 },
  { code: 'EVENTS_5', name: 'Veteran', description: 'Complete 5 events', icon: '🎖️', xpReward: 150, category: 'event', threshold: 5 },
  { code: 'EVENTS_20', name: 'Champion', description: 'Complete 20 events', icon: '🥇', xpReward: 400, category: 'event', threshold: 20 },
  { code: 'SPEED_DEMON', name: 'Speed Demon', description: 'Average pace under 4:00 min/km in a run', icon: '💨', xpReward: 100, category: 'speed', threshold: 4.0 },
  { code: 'TEAM_PLAYER', name: 'Team Player', description: 'Join a team', icon: '🤝', xpReward: 25, category: 'social', threshold: null },
  { code: 'BATTLE_WIN', name: 'Gladiator', description: 'Win your first battle', icon: '⚔️', xpReward: 75, category: 'social', threshold: null },
  { code: 'MULTI_SPORT', name: 'Multi-Sport', description: 'Record activities in 3 or more sports', icon: '🎯', xpReward: 100, category: 'distance', threshold: 3 },
  { code: 'EARLY_BIRD', name: 'Early Bird', description: 'Complete an activity before 6 AM', icon: '🌅', xpReward: 50, category: 'speed', threshold: null },
];

export async function seedAchievements(): Promise<void> {
  for (const a of ACHIEVEMENTS) {
    await prisma.achievement.upsert({
      where: { code: a.code },
      update: {
        name: a.name,
        description: a.description,
        icon: a.icon,
        xpReward: a.xpReward,
        category: a.category,
        threshold: a.threshold,
      },
      create: {
        code: a.code,
        name: a.name,
        description: a.description,
        icon: a.icon,
        xpReward: a.xpReward,
        category: a.category,
        threshold: a.threshold,
      },
    });
  }
}

interface CheckContext {
  activityId?: string;
  sport?: string;
  avgPace?: number | null;
  startedAt?: Date;
  joinedTeam?: boolean;
  battleWon?: boolean;
}

export async function checkAndGrant(userId: string, context: CheckContext): Promise<void> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return;

  const allAchievements = await prisma.achievement.findMany();
  const existing = await prisma.userAchievement.findMany({
    where: { userId },
    select: { achievementId: true },
  });
  const existingIds = new Set(existing.map((e) => e.achievementId));

  const toGrant: string[] = [];

  for (const achievement of allAchievements) {
    if (existingIds.has(achievement.id)) continue;

    const qualified = await isQualified(userId, user, achievement, context);
    if (qualified) {
      toGrant.push(achievement.id);
    }
  }

  if (toGrant.length === 0) return;

  let totalXp = 0;

  for (const achievementId of toGrant) {
    const achievement = allAchievements.find((a) => a.id === achievementId)!;
    totalXp += achievement.xpReward;

    await prisma.userAchievement.create({
      data: { userId, achievementId },
    });
  }

  // Add XP and compute level
  const newXp = user.xp + totalXp;
  const newLevel = computeLevel(newXp);

  await prisma.user.update({
    where: { id: userId },
    data: { xp: newXp, level: newLevel },
  });
}

function computeLevel(xp: number): number {
  // Level N+1 requires (N+1)*100 XP total cumulative
  // Level 1: 0 XP, Level 2: 200 XP, Level 3: 200+300=500, Level 4: 500+400=900...
  // Cumulative XP for level L = sum from k=2 to L of k*100 = 100*(sum from 2 to L of k) = 100*(L*(L+1)/2 - 1)
  let level = 1;
  let cumulativeRequired = 0;
  while (true) {
    const nextLevelCost = (level + 1) * 100;
    if (cumulativeRequired + nextLevelCost > xp) break;
    cumulativeRequired += nextLevelCost;
    level++;
  }
  return level;
}

async function isQualified(
  userId: string,
  user: { totalDistance: number; totalActivities: number; currentStreak: number; bestStreak: number },
  achievement: { code: string; threshold: number | null },
  context: CheckContext
): Promise<boolean> {
  switch (achievement.code) {
    case 'FIRST_ACTIVITY':
      return user.totalActivities >= 1;

    case 'DISTANCE_10':
      return user.totalDistance >= 10;
    case 'DISTANCE_50':
      return user.totalDistance >= 50;
    case 'DISTANCE_100':
      return user.totalDistance >= 100;
    case 'DISTANCE_500':
      return user.totalDistance >= 500;
    case 'DISTANCE_1000':
      return user.totalDistance >= 1000;

    case 'STREAK_7':
      return user.currentStreak >= 7 || user.bestStreak >= 7;
    case 'STREAK_30':
      return user.currentStreak >= 30 || user.bestStreak >= 30;
    case 'STREAK_100':
      return user.currentStreak >= 100 || user.bestStreak >= 100;

    case 'EVENTS_1': {
      const count = await prisma.eventParticipant.count({
        where: { userId, isFinished: true },
      });
      return count >= 1;
    }
    case 'EVENTS_5': {
      const count = await prisma.eventParticipant.count({
        where: { userId, isFinished: true },
      });
      return count >= 5;
    }
    case 'EVENTS_20': {
      const count = await prisma.eventParticipant.count({
        where: { userId, isFinished: true },
      });
      return count >= 20;
    }

    case 'SPEED_DEMON':
      // avgPace under 4.0 min/km in a running activity
      if (context.sport === 'RUNNING' && context.avgPace != null && context.avgPace > 0) {
        return context.avgPace < 4.0;
      }
      return false;

    case 'TEAM_PLAYER':
      if (context.joinedTeam) return true;
      const membershipCount = await prisma.teamMember.count({ where: { userId } });
      return membershipCount > 0;

    case 'BATTLE_WIN':
      if (context.battleWon) return true;
      const winCount = await prisma.battle.count({
        where: { winnerId: userId, status: 'finished' },
      });
      return winCount > 0;

    case 'MULTI_SPORT': {
      const sports = await prisma.activity.findMany({
        where: { userId },
        select: { sport: true },
        distinct: ['sport'],
      });
      return sports.length >= 3;
    }

    case 'EARLY_BIRD':
      if (context.startedAt) {
        const hour = context.startedAt.getHours();
        return hour < 6;
      }
      // Check if any existing activity started before 6 AM
      const earlyActivities = await prisma.activity.findMany({
        where: { userId },
        select: { startedAt: true },
      });
      return earlyActivities.some((a) => a.startedAt.getHours() < 6);

    default:
      return false;
  }
}
