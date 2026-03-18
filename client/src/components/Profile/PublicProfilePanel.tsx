import { useCallback, useEffect, useState } from 'react';
import type { Achievement, SportType } from '@/types';
import { api } from '@/services/api';
import { useAuth } from '@/context/AuthContext';

const SPORT_ICONS: Record<SportType, string> = {
  RUNNING: '🏃',
  CYCLING: '🚴',
  SKIING: '⛷️',
  WALKING: '🚶',
};

const SPORT_COLORS: Record<SportType, string> = {
  RUNNING: '#fc4c02',
  CYCLING: '#0061ff',
  SKIING: '#0891b2',
  WALKING: '#7c3aed',
};

const SPORT_LABELS: Record<SportType, string> = {
  RUNNING: 'Бег',
  CYCLING: 'Велосипед',
  SKIING: 'Лыжи',
  WALKING: 'Ходьба',
};

interface ProfileData {
  id: string;
  username: string;
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
  createdAt: string;
  _count?: {
    activities: number;
    eventParticipations: number;
    achievements: number;
    followers: number;
    following: number;
  };
}

interface ActivityItem {
  id: string;
  sport: SportType;
  title?: string;
  distance: number;
  duration: number;
  avgPace?: number;
  avgSpeed?: number;
  startedAt: string;
}

interface AchievementWithMeta {
  achievement: Achievement;
  unlockedAt: string | null;
}

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) return `${h}ч ${m}м`;
  if (m > 0) return `${m}м ${s}с`;
  return `${s}с`;
}

function formatDate(dateStr: string): string {
  try {
    return new Intl.DateTimeFormat('ru-RU', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }).format(new Date(dateStr));
  } catch {
    return dateStr;
  }
}

function formatTimeAgo(dateStr: string): string {
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (diff < 60) return 'только что';
  const mins = Math.floor(diff / 60);
  if (mins < 60) return `${mins} мин. назад`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} ч. назад`;
  const days = Math.floor(hours / 24);
  if (days === 1) return 'вчера';
  return `${days} дн. назад`;
}

interface PublicProfilePanelProps {
  userId: string;
  onClose: () => void;
}

export function PublicProfilePanel({ userId, onClose }: PublicProfilePanelProps) {
  const { user: currentUser, isAuthenticated } = useAuth();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [achievements, setAchievements] = useState<AchievementWithMeta[]>([]);
  const [achExpanded, setAchExpanded] = useState(false);
  const [sportStats, setSportStats] = useState<{ sport: string; totalDistance: number; activityCount: number }[]>([]);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    const h = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', h);
    return () => window.removeEventListener('resize', h);
  }, []);

  const isOwnProfile = currentUser?.id === userId;

  // Load profile data
  useEffect(() => {
    setLoading(true);
    setError(null);
    api.profile.get(userId)
      .then((data) => {
        setProfile(data as unknown as ProfileData);
      })
      .catch((err) => {
        const msg = err?.message ?? '';
        if (msg.includes('403') || msg.includes('Профиль скрыт')) {
          setError('Профиль скрыт');
        } else {
          setError('Не удалось загрузить профиль');
        }
      })
      .finally(() => setLoading(false));
  }, [userId]);

  // Load follow status
  useEffect(() => {
    if (!isAuthenticated || isOwnProfile) return;
    api.social.followStatus(userId)
      .then((res) => {
        setIsFollowing(res.isFollowing);
      })
      .catch(() => {});
  }, [userId, isAuthenticated, isOwnProfile]);

  // Load activities
  useEffect(() => {
    if (error) return;
    api.profile.activities(userId, { limit: 5 })
      .then((res) => {
        setActivities((res?.items ?? []) as ActivityItem[]);
      })
      .catch(() => {});
  }, [userId, error]);

  // Load achievements
  useEffect(() => {
    if (error) return;
    api.profile.achievements(userId)
      .then((res) => {
        setAchievements(res?.achievements ?? []);
      })
      .catch(() => {});
  }, [userId, error]);

  // Compute sport stats from activities (use profile data)
  useEffect(() => {
    if (error || !profile) return;
    api.profile.activities(userId, { limit: 50 })
      .then((res) => {
        const items = (res?.items ?? []) as ActivityItem[];
        const map: Record<string, { sport: string; totalDistance: number; activityCount: number }> = {};
        for (const act of items) {
          if (!map[act.sport]) {
            map[act.sport] = { sport: act.sport, totalDistance: 0, activityCount: 0 };
          }
          map[act.sport].totalDistance += act.distance;
          map[act.sport].activityCount += 1;
        }
        setSportStats(Object.values(map).map(s => ({
          ...s,
          totalDistance: Math.round(s.totalDistance * 10) / 10,
        })));
      })
      .catch(() => {});
  }, [userId, error, profile]);

  const handleFollow = useCallback(async () => {
    if (!isAuthenticated || isOwnProfile) return;
    setFollowLoading(true);
    try {
      const res = await api.social.follow(userId);
      setIsFollowing(res.isFollowing);
      // Update follower count locally
      setProfile(prev => {
        if (!prev) return prev;
        const count = prev._count ?? { activities: 0, eventParticipations: 0, achievements: 0, followers: 0, following: 0 };
        return {
          ...prev,
          _count: {
            ...count,
            followers: res.isFollowing ? count.followers + 1 : Math.max(0, count.followers - 1),
          },
        };
      });
    } catch {
      // ignore
    } finally {
      setFollowLoading(false);
    }
  }, [userId, isAuthenticated, isOwnProfile]);

  // Close on Escape key
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  const sports: SportType[] = ['RUNNING', 'CYCLING', 'SKIING', 'WALKING'];

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0,0,0,0.5)',
        zIndex: 9998,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: '#fff',
          borderRadius: 20,
          maxWidth: 600,
          width: '100%',
          maxHeight: '90vh',
          overflowY: 'auto',
          boxShadow: '0 8px 40px rgba(0,0,0,0.2)',
          position: 'relative',
        }}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: 12,
            right: 12,
            width: 32,
            height: 32,
            borderRadius: '50%',
            border: 'none',
            background: '#f0f0f0',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 16,
            color: '#666',
            zIndex: 1,
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>

        {loading && (
          <div style={{ padding: 60, textAlign: 'center' }}>
            <div style={{ width: 32, height: 32, margin: '0 auto', border: '3px solid #f0f0f0', borderTopColor: '#fc4c02', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          </div>
        )}

        {error && !loading && (
          <div style={{ padding: 60, textAlign: 'center' }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>🔒</div>
            <div style={{ fontSize: 18, fontWeight: 700, color: '#242424', marginBottom: 8 }}>
              {error}
            </div>
            <div style={{ fontSize: 14, color: '#999' }}>
              Этот пользователь скрыл свой профиль
            </div>
          </div>
        )}

        {profile && !loading && !error && (
          <div style={{ padding: isMobile ? 16 : 24 }}>
            {/* Header: avatar + name + follow */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20 }}>
              <div style={{
                width: 64,
                height: 64,
                minWidth: 64,
                borderRadius: '50%',
                background: profile.avatarUrl ? 'none' : 'linear-gradient(135deg, #fc4c02, #ff6b2b)',
                color: '#fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 28,
                fontWeight: 700,
                overflow: 'hidden',
                boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
              }}>
                {profile.avatarUrl
                  ? <img src={profile.avatarUrl} alt="" style={{ width: 64, height: 64, borderRadius: '50%', objectFit: 'cover' }} />
                  : (profile.username ?? '?')[0].toUpperCase()}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 20, fontWeight: 700, color: '#242424' }}>
                  {profile.username ?? '—'}
                </div>
                {(profile.firstName ?? profile.lastName) && (
                  <div style={{ fontSize: 14, color: '#666', marginTop: 2 }}>
                    {[profile.firstName, profile.lastName].filter(Boolean).join(' ')}
                  </div>
                )}
                {profile.city && (
                  <div style={{ fontSize: 13, color: '#999', marginTop: 2 }}>
                    {profile.city}
                  </div>
                )}
              </div>
              {isAuthenticated && !isOwnProfile && (
                <button
                  onClick={handleFollow}
                  disabled={followLoading}
                  style={{
                    padding: '8px 20px',
                    borderRadius: 10,
                    border: isFollowing ? '1px solid #e0e0e0' : 'none',
                    background: isFollowing ? '#fff' : 'linear-gradient(135deg, #fc4c02, #ff6b2b)',
                    color: isFollowing ? '#666' : '#fff',
                    fontSize: 13,
                    fontWeight: 700,
                    cursor: followLoading ? 'not-allowed' : 'pointer',
                    opacity: followLoading ? 0.7 : 1,
                    flexShrink: 0,
                  }}
                >
                  {isFollowing ? 'Отписаться' : 'Подписаться'}
                </button>
              )}
            </div>

            {/* Bio */}
            {profile.bio && (
              <div style={{
                fontSize: 14,
                color: '#666',
                marginBottom: 16,
                lineHeight: 1.5,
                padding: '12px 16px',
                background: '#f9f9f9',
                borderRadius: 12,
              }}>
                {profile.bio}
              </div>
            )}

            {/* Level + XP */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              marginBottom: 16,
            }}>
              <div style={{
                background: '#fc4c02',
                color: '#fff',
                borderRadius: 8,
                padding: '4px 12px',
                fontWeight: 700,
                fontSize: 14,
              }}>
                Уровень {profile.level ?? 0}
              </div>
              <span style={{ fontSize: 14, color: '#666' }}>
                {profile.xp ?? 0} XP
              </span>
            </div>

            {/* Stats grid */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(3, 1fr)',
              gap: 10,
              marginBottom: 16,
            }}>
              {[
                { label: 'Дистанция', value: `${(profile.totalDistance ?? 0).toFixed(1)} км` },
                { label: 'Время', value: formatDuration(profile.totalTime ?? 0) },
                { label: 'Тренировки', value: String(profile.totalActivities ?? 0) },
                { label: 'Стрик', value: `${profile.currentStreak ?? 0} дн.` },
                { label: 'Подписчики', value: String(profile._count?.followers ?? 0) },
                { label: 'Подписки', value: String(profile._count?.following ?? 0) },
              ].map((stat) => (
                <div
                  key={stat.label}
                  style={{
                    background: '#f9f9f9',
                    borderRadius: 12,
                    padding: 12,
                    textAlign: 'center',
                  }}
                >
                  <div style={{ fontSize: 18, fontWeight: 700, color: '#242424' }}>{stat.value}</div>
                  <div style={{ fontSize: 12, color: '#888', marginTop: 2 }}>{stat.label}</div>
                </div>
              ))}
            </div>

            {/* Sports breakdown */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(4, 1fr)',
              gap: 8,
              marginBottom: 16,
            }}>
              {sports.map((sport) => {
                const ss = sportStats.find(s => s.sport === sport);
                return (
                  <div
                    key={sport}
                    style={{
                      background: '#f9f9f9',
                      borderRadius: 12,
                      padding: 10,
                      textAlign: 'center',
                    }}
                  >
                    <div style={{ fontSize: 22 }}>{SPORT_ICONS[sport]}</div>
                    <div style={{ fontSize: 11, color: SPORT_COLORS[sport], fontWeight: 600, marginTop: 2 }}>
                      {SPORT_LABELS[sport]}
                    </div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#242424', marginTop: 4 }}>
                      {ss ? `${(ss.totalDistance / 1000).toFixed(1)} км` : '0 км'}
                    </div>
                    <div style={{ fontSize: 10, color: '#999' }}>
                      {ss ? `${ss.activityCount} трен.` : '0 трен.'}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Recent activities */}
            {activities.length > 0 && (
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 15, fontWeight: 700, color: '#242424', marginBottom: 10 }}>
                  Последние активности
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {activities.map((act) => {
                    const distKm = (act.distance ?? 0) / 1000;
                    return (
                      <div
                        key={act.id}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 10,
                          padding: '10px 12px',
                          background: '#f9f9f9',
                          borderRadius: 12,
                        }}
                      >
                        <span style={{ fontSize: 20 }}>{SPORT_ICONS[act.sport] ?? '🏃'}</span>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 13, fontWeight: 600, color: '#242424' }}>
                            {act.title ?? SPORT_LABELS[act.sport] ?? 'Тренировка'} — {distKm.toFixed(1)} км
                          </div>
                          <div style={{ fontSize: 11, color: '#999', marginTop: 2 }}>
                            {formatDuration(act.duration ?? 0)} · {formatTimeAgo(act.startedAt)}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Achievements (collapsed) */}
            {achievements.length > 0 && (
              <div style={{
                background: '#f9f9f9',
                borderRadius: 12,
                overflow: 'hidden',
                marginBottom: 16,
              }}>
                <div
                  onClick={() => setAchExpanded(prev => !prev)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '12px 16px',
                    cursor: 'pointer',
                    userSelect: 'none',
                  }}
                >
                  <div style={{ fontSize: 15, fontWeight: 700, color: '#242424' }}>
                    Достижения ({achievements.filter(a => !!a.unlockedAt).length} / {achievements.length})
                  </div>
                  <div style={{
                    fontSize: 14,
                    color: '#888',
                    transition: 'transform 0.25s',
                    transform: achExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                  }}>
                    ▼
                  </div>
                </div>
                <div style={{
                  maxHeight: achExpanded ? 1000 : 0,
                  overflow: 'hidden',
                  transition: 'max-height 0.35s ease-in-out',
                  padding: achExpanded ? '0 16px 16px' : '0 16px',
                }}>
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: isMobile ? 'repeat(3, 1fr)' : 'repeat(4, 1fr)',
                    gap: 8,
                  }}>
                    {achievements.filter(a => !!a.unlockedAt).map((a) => (
                      <div
                        key={a.achievement.id}
                        style={{
                          borderRadius: 10,
                          padding: 10,
                          textAlign: 'center',
                          background: '#fff',
                          border: '1px solid #e0e0e0',
                        }}
                      >
                        <div style={{ fontSize: 28, lineHeight: 1, marginBottom: 4, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          {a.achievement.iconUrl ? (
                            <img src={a.achievement.iconUrl} alt={a.achievement.name} style={{ width: 28, height: 28, borderRadius: 6, objectFit: 'cover' }} />
                          ) : (
                            a.achievement.icon ?? '🏅'
                          )}
                        </div>
                        <div style={{ fontSize: 11, fontWeight: 600, color: '#242424', lineHeight: 1.2 }}>
                          {a.achievement.name}
                        </div>
                        {a.unlockedAt && (
                          <div style={{ fontSize: 9, color: '#1a7f37', marginTop: 2, fontWeight: 600 }}>
                            {formatDate(a.unlockedAt)}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Member since */}
            <div style={{ textAlign: 'center', color: '#999', fontSize: 12 }}>
              Участник с {formatDate(profile.createdAt ?? '')}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
