export type SportType = 'RUNNING' | 'CYCLING' | 'SKIING' | 'WALKING';
export type EventType = 'RACE' | 'CHALLENGE' | 'ULTRAMARATHON' | 'WEEKLY' | 'BATTLE';
export type EventStatus = 'DRAFT' | 'REGISTRATION' | 'ACTIVE' | 'FINISHED' | 'CANCELLED';

export interface User {
  id: string;
  username: string;
  email: string;
  role: 'USER' | 'ADMIN' | 'MODERATOR';
  avatarUrl?: string;
  firstName?: string;
  lastName?: string;
  city?: string;
  bio?: string;
  xp: number;
  level: number;
  totalDistance: number;
  totalTime: number;
  totalActivities: number;
  currentStreak: number;
  bestStreak: number;
  isPublic?: boolean;
  referralCode: string;
  createdAt: string;
}

export interface Event {
  id: string;
  title: string;
  description?: string;
  imageUrl?: string;
  sport: SportType;
  type: EventType;
  status: EventStatus;
  targetDistance?: number;
  minDistance?: number;
  maxDistance?: number;
  startDate: string;
  endDate: string;
  regDeadline?: string;
  maxParticipants?: number;
  isPublic: boolean;
  isPaid: boolean;
  price?: number;
  xpReward: number;
  medalName?: string;
  medalIcon?: string;
  diplomaBgUrl?: string;
  diplomaSettings?: DiplomaSettings;
  _count?: { participants: number };
  isJoined?: boolean;
}

export interface DiplomaSettings {
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

export interface Activity {
  id: string;
  sport: SportType;
  title?: string;
  description?: string;
  distance: number;
  duration: number;
  avgPace?: number;
  avgSpeed?: number;
  elevGain?: number;
  calories?: number;
  gpsTrack?: unknown;
  startLat?: number;
  startLng?: number;
  imageUrl?: string;
  isManual: boolean;
  startedAt: string;
  createdAt: string;
}

export interface Team {
  id: string;
  name: string;
  description?: string;
  avatarUrl?: string;
  ownerId: string;
  totalDistance: number;
  totalXp: number;
  memberCount: number;
  isPublic: boolean;
  inviteCode: string;
  members?: TeamMember[];
}

export interface TeamMember {
  id: string;
  userId: string;
  role: string;
  joinedAt: string;
  user: {
    id: string;
    username: string;
    avatarUrl?: string;
    level: number;
    totalDistance: number;
  };
}

export interface Battle {
  id: string;
  sport: SportType;
  targetDistance: number;
  duration: number;
  challengerId: string;
  opponentId: string;
  challengerDistance: number;
  opponentDistance: number;
  status: string;
  winnerId?: string;
  startsAt?: string;
  endsAt?: string;
  challenger?: { username: string; avatarUrl?: string };
  opponent?: { username: string; avatarUrl?: string };
}

export interface Achievement {
  id: string;
  code: string;
  name: string;
  description: string;
  icon: string;
  iconUrl?: string | null;
  xpReward: number;
  category: string;
  threshold?: number | null;
  unlockedAt?: string;
}

export interface LeaderboardEntry {
  id: string;
  username: string;
  avatarUrl?: string;
  level: number;
  totalDistance: number;
  totalActivities: number;
}
