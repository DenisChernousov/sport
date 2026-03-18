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
  // distance
  { code: 'DIST_10', name: 'Первые 10 км', description: 'Пробеги 10 км суммарно', icon: '🏃', xpReward: 25, category: 'distance', threshold: 10 },
  { code: 'DIST_50', name: 'Полтинник', description: '50 км суммарно', icon: '🎯', xpReward: 50, category: 'distance', threshold: 50 },
  { code: 'DIST_100', name: 'Сотка', description: '100 км суммарно', icon: '💯', xpReward: 100, category: 'distance', threshold: 100 },
  { code: 'DIST_500', name: 'Ультра бегун', description: '500 км суммарно', icon: '🔥', xpReward: 200, category: 'distance', threshold: 500 },
  { code: 'DIST_1000', name: 'Тысячник', description: '1000 км суммарно', icon: '👑', xpReward: 500, category: 'distance', threshold: 1000 },

  // streak
  { code: 'STREAK_3', name: 'Три дня подряд', description: '3 дня активности подряд', icon: '⚡', xpReward: 25, category: 'streak', threshold: 3 },
  { code: 'STREAK_7', name: 'Неделя воина', description: '7 дней подряд', icon: '🗡️', xpReward: 75, category: 'streak', threshold: 7 },
  { code: 'STREAK_30', name: 'Месяц стали', description: '30 дней подряд', icon: '🛡️', xpReward: 200, category: 'streak', threshold: 30 },
  { code: 'STREAK_100', name: 'Железный человек', description: '100 дней подряд', icon: '🦾', xpReward: 500, category: 'streak', threshold: 100 },

  // events
  { code: 'EVENT_1', name: 'Первый старт', description: 'Участие в первом событии', icon: '🏁', xpReward: 50, category: 'events', threshold: 1 },
  { code: 'EVENT_5', name: 'Ветеран', description: '5 событий', icon: '🎖️', xpReward: 100, category: 'events', threshold: 5 },
  { code: 'EVENT_10', name: 'Марафонец', description: '10 событий', icon: '🏆', xpReward: 200, category: 'events', threshold: 10 },

  // social
  { code: 'FIRST_LIKE', name: 'Первый лайк', description: 'Получи первый лайк', icon: '❤️', xpReward: 10, category: 'social', threshold: 1 },
  { code: 'FOLLOWERS_10', name: 'Популярный', description: '10 подписчиков', icon: '⭐', xpReward: 50, category: 'social', threshold: 10 },
  { code: 'TEAM_JOIN', name: 'Командный игрок', description: 'Вступи в клуб', icon: '🤝', xpReward: 25, category: 'social', threshold: 1 },

  // speed
  { code: 'SPEED_RUN_5', name: 'Быстрый бег', description: 'Средний темп быстрее 5:00 мин/км', icon: '⚡', xpReward: 50, category: 'speed', threshold: 5 },
  { code: 'SPEED_CYCLE_30', name: 'Велогонщик', description: 'Средняя скорость 30+ км/ч на велосипеде', icon: '🚀', xpReward: 75, category: 'speed', threshold: 30 },
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
  avgSpeed?: number | null;
  startedAt?: Date;
  joinedTeam?: boolean;
  battleWon?: boolean;
  receivedLike?: boolean;
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
  const threshold = achievement.threshold ?? 0;

  switch (achievement.code) {
    // distance
    case 'DIST_10':
      return user.totalDistance >= 10;
    case 'DIST_50':
      return user.totalDistance >= 50;
    case 'DIST_100':
      return user.totalDistance >= 100;
    case 'DIST_500':
      return user.totalDistance >= 500;
    case 'DIST_1000':
      return user.totalDistance >= 1000;

    // streak
    case 'STREAK_3':
      return user.currentStreak >= 3 || user.bestStreak >= 3;
    case 'STREAK_7':
      return user.currentStreak >= 7 || user.bestStreak >= 7;
    case 'STREAK_30':
      return user.currentStreak >= 30 || user.bestStreak >= 30;
    case 'STREAK_100':
      return user.currentStreak >= 100 || user.bestStreak >= 100;

    // events
    case 'EVENT_1': {
      const count = await prisma.eventParticipant.count({
        where: { userId, isFinished: true },
      });
      return count >= 1;
    }
    case 'EVENT_5': {
      const count = await prisma.eventParticipant.count({
        where: { userId, isFinished: true },
      });
      return count >= 5;
    }
    case 'EVENT_10': {
      const count = await prisma.eventParticipant.count({
        where: { userId, isFinished: true },
      });
      return count >= 10;
    }

    // social
    case 'FIRST_LIKE': {
      if (context.receivedLike) return true;
      const likeCount = await prisma.activityLike.count({
        where: {
          activity: { userId },
        },
      });
      return likeCount >= 1;
    }
    case 'FOLLOWERS_10': {
      const followerCount = await prisma.follow.count({
        where: { followingId: userId },
      });
      return followerCount >= 10;
    }
    case 'TEAM_JOIN': {
      if (context.joinedTeam) return true;
      const membershipCount = await prisma.teamMember.count({ where: { userId } });
      return membershipCount > 0;
    }

    // speed
    case 'SPEED_RUN_5':
      if (context.sport === 'RUNNING' && context.avgPace != null && context.avgPace > 0) {
        return context.avgPace < 5.0;
      }
      return false;

    case 'SPEED_CYCLE_30':
      if (context.sport === 'CYCLING' && context.avgSpeed != null && context.avgSpeed > 0) {
        return context.avgSpeed >= 30;
      }
      return false;

    default:
      // Для кастомных достижений — попробуем автоматически по категории и threshold
      if (achievement.threshold != null) {
        switch (true) {
          case achievement.code.startsWith('DIST_'):
            return user.totalDistance >= threshold;
          case achievement.code.startsWith('STREAK_'):
            return user.currentStreak >= threshold || user.bestStreak >= threshold;
          case achievement.code.startsWith('EVENT_'): {
            const cnt = await prisma.eventParticipant.count({
              where: { userId, isFinished: true },
            });
            return cnt >= threshold;
          }
          default:
            return false;
        }
      }
      return false;
  }
}
