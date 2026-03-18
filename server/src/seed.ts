import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // Skip if events already exist
  const existing = await prisma.event.count();
  if (existing > 0) {
    console.log(`Already have ${existing} events, skipping seed`);
    return;
  }

  // Create sample events
  const now = new Date();
  const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const nextMonth = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
  const twoMonths = new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000);

  await prisma.event.createMany({
    data: [
      {
        title: 'Весенний забег 2026',
        description: 'Пробеги 10 км и получи медаль! Открытый забег для всех уровней подготовки.',
        sport: 'RUNNING',
        type: 'RACE',
        status: 'REGISTRATION',
        targetDistance: 10,
        startDate: nextWeek,
        endDate: new Date(nextWeek.getTime() + 7 * 24 * 60 * 60 * 1000),
        xpReward: 100,
        medalName: 'Весенний марафонец',
        medalIcon: '🌸',
      },
      {
        title: 'Велосипедный челлендж — 200 км за месяц',
        description: 'Проедь 200 км на велосипеде за месяц. Каждый километр на счету!',
        sport: 'CYCLING',
        type: 'CHALLENGE',
        status: 'REGISTRATION',
        maxDistance: 200,
        minDistance: 5,
        startDate: nextWeek,
        endDate: nextMonth,
        xpReward: 150,
        medalName: 'Велогерой',
        medalIcon: '🚴',
      },
      {
        title: 'Ультрамарафон — 100 км бега за месяц',
        description: 'Набери 100 км бега за месяц. Подходит для тех, кто хочет выйти из зоны комфорта.',
        sport: 'RUNNING',
        type: 'ULTRAMARATHON',
        status: 'REGISTRATION',
        maxDistance: 100,
        minDistance: 3,
        startDate: now,
        endDate: nextMonth,
        xpReward: 200,
        medalName: 'Ультрамарафонец',
        medalIcon: '🏅',
      },
      {
        title: 'Лыжный марафон — 50 км',
        description: 'Классический лыжный марафон. Пройди 50 км на лыжах!',
        sport: 'SKIING',
        type: 'RACE',
        status: 'REGISTRATION',
        targetDistance: 50,
        startDate: nextWeek,
        endDate: nextMonth,
        xpReward: 150,
        medalName: 'Лыжный воин',
        medalIcon: '⛷️',
      },
      {
        title: 'Неделя ходьбы — 7 дней по 5 км',
        description: 'Ходи каждый день по 5 км. Просто, полезно, эффективно!',
        sport: 'WALKING',
        type: 'WEEKLY',
        status: 'ACTIVE',
        minDistance: 5,
        startDate: now,
        endDate: nextWeek,
        xpReward: 75,
        medalName: 'Пешеход недели',
        medalIcon: '🚶',
      },
      {
        title: 'Майский забег Победы — 9 км',
        description: 'Символическая дистанция 9 км в честь 9 мая. Бежим вместе!',
        sport: 'RUNNING',
        type: 'RACE',
        status: 'REGISTRATION',
        targetDistance: 9,
        startDate: new Date('2026-05-09'),
        endDate: new Date('2026-05-16'),
        xpReward: 100,
        medalName: 'Забег Победы',
        medalIcon: '🎗️',
      },
      {
        title: 'Летний велозаезд — 500 км',
        description: 'Большой летний вызов! Проедь 500 км за 2 месяца.',
        sport: 'CYCLING',
        type: 'ULTRAMARATHON',
        status: 'REGISTRATION',
        maxDistance: 500,
        minDistance: 10,
        startDate: nextMonth,
        endDate: twoMonths,
        xpReward: 300,
        medalName: 'Велолегенда',
        medalIcon: '🏆',
      },
    ],
  });

  console.log('Created 7 events');
  console.log('Seed complete!');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
