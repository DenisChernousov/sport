import { Request } from 'express';

// ─── Enums (matching Prisma) ─────────────────────────────

export enum SportType {
  RUNNING = 'RUNNING',
  CYCLING = 'CYCLING',
  SKIING = 'SKIING',
  WALKING = 'WALKING',
}

export enum EventStatus {
  DRAFT = 'DRAFT',
  REGISTRATION = 'REGISTRATION',
  ACTIVE = 'ACTIVE',
  FINISHED = 'FINISHED',
  CANCELLED = 'CANCELLED',
}

export enum EventType {
  RACE = 'RACE',
  CHALLENGE = 'CHALLENGE',
  ULTRAMARATHON = 'ULTRAMARATHON',
  WEEKLY = 'WEEKLY',
  BATTLE = 'BATTLE',
}

export enum Role {
  USER = 'USER',
  ADMIN = 'ADMIN',
  MODERATOR = 'MODERATOR',
}

// ─── Response Types ──────────────────────────────────────

export interface UserResponse {
  id: string;
  username: string;
  email: string;
  role: Role;
  avatarUrl: string | null;
  firstName: string | null;
  lastName: string | null;
  city: string | null;
  bio: string | null;
  birthDate: string | null;
  xp: number;
  level: number;
  totalDistance: number;
  totalTime: number;
  totalActivities: number;
  currentStreak: number;
  bestStreak: number;
  lastActivityDate: string | null;
  referralCode: string;
  createdAt: string;
  updatedAt: string;
}

export interface EventResponse {
  id: string;
  title: string;
  description: string | null;
  imageUrl: string | null;
  sport: SportType;
  type: EventType;
  status: EventStatus;
  targetDistance: number | null;
  minDistance: number | null;
  maxDistance: number | null;
  startDate: string;
  endDate: string;
  regDeadline: string | null;
  maxParticipants: number | null;
  isPublic: boolean;
  isPaid: boolean;
  price: number | null;
  xpReward: number;
  medalName: string | null;
  medalIcon: string | null;
  createdAt: string;
  updatedAt: string;
  participantCount?: number;
}

export interface ActivityResponse {
  id: string;
  userId: string;
  sport: SportType;
  title: string | null;
  description: string | null;
  distance: number;
  duration: number;
  avgPace: number | null;
  avgSpeed: number | null;
  elevGain: number | null;
  calories: number | null;
  gpsTrack: unknown;
  startLat: number | null;
  startLng: number | null;
  stravaId: string | null;
  isManual: boolean;
  startedAt: string;
  createdAt: string;
}

// ─── JWT ─────────────────────────────────────────────────

export interface JwtPayload {
  userId: string;
  role: Role;
}

export interface AuthRequest extends Request {
  userId?: string;
  role?: Role;
}

// ─── WebSocket Message Types ─────────────────────────────

export interface WsMessage {
  type: WsMessageType;
  payload: unknown;
}

export type WsMessageType =
  | 'chat:message'
  | 'chat:join'
  | 'chat:leave'
  | 'activity:new'
  | 'activity:update'
  | 'event:update'
  | 'event:leaderboard'
  | 'battle:update'
  | 'battle:challenge'
  | 'notification'
  | 'error';

export interface WsChatMessage {
  type: 'chat:message';
  payload: {
    channel: string;
    userId: string;
    username: string;
    message: string;
    createdAt: string;
  };
}

export interface WsActivityMessage {
  type: 'activity:new' | 'activity:update';
  payload: {
    activityId: string;
    userId: string;
    sport: SportType;
    distance: number;
    duration: number;
  };
}

export interface WsEventMessage {
  type: 'event:update' | 'event:leaderboard';
  payload: {
    eventId: string;
    data: unknown;
  };
}

export interface WsBattleMessage {
  type: 'battle:update' | 'battle:challenge';
  payload: {
    battleId: string;
    challengerId: string;
    opponentId: string;
    status: string;
  };
}

export interface WsNotification {
  type: 'notification';
  payload: {
    title: string;
    message: string;
    data?: unknown;
  };
}

export interface WsError {
  type: 'error';
  payload: {
    code: string;
    message: string;
  };
}
