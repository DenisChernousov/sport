import { useCallback, useEffect, useRef, useState } from 'react';
import type { ChangeEvent, FormEvent } from 'react';
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

interface AchievementWithMeta {
  achievement: Achievement;
  unlockedAt: string | null;
}

interface AchProgress {
  totalDistance: number;
  currentStreak: number;
  bestStreak: number;
  finishedEvents: number;
}

export default function ProfilePanel() {
  const { user, updateUser } = useAuth();
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  useEffect(() => {
    const h = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', h);
    return () => window.removeEventListener('resize', h);
  }, []);

  const [achievements, setAchievements] = useState<AchievementWithMeta[]>([]);
  const [achProgress, setAchProgress] = useState<AchProgress>({ totalDistance: 0, currentStreak: 0, bestStreak: 0, finishedEvents: 0 });
  const [achLoading, setAchLoading] = useState(false);
  const [achExpanded, setAchExpanded] = useState(false);

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [city, setCity] = useState('');
  const [bio, setBio] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState('');

  const [isPublic, setIsPublic] = useState(true);
  const [copied, setCopied] = useState(false);
  const [sportStats, setSportStats] = useState<{ sport: string; totalDistance: number; activityCount: number }[]>([]);
  const [followersCount, setFollowersCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [avatarHover, setAvatarHover] = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [referralCount, setReferralCount] = useState(0);
  const [referredUsers, setReferredUsers] = useState<{ id: string; username: string; avatarUrl?: string; totalDistance: number; level: number; createdAt: string }[]>([]);
  const [followModal, setFollowModal] = useState<'followers' | 'following' | null>(null);
  const [followModalUsers, setFollowModalUsers] = useState<{ id: string; username: string; avatarUrl?: string; city?: string; level: number; totalDistance: number }[]>([]);
  const [followModalLoading, setFollowModalLoading] = useState(false);

  useEffect(() => {
    if (user) {
      setFirstName(user.firstName ?? '');
      setLastName(user.lastName ?? '');
      setCity(user.city ?? '');
      setBio(user.bio ?? '');
      setIsPublic(user.isPublic !== false);
    }
  }, [user]);

  useEffect(() => {
    if (!user) return;
    api.profile.statsSummary().then((res: any) => {
      setSportStats(res?.bySport ?? []);
    }).catch(() => {});
    api.social.followStatus(user.id).then((res) => {
      setFollowersCount(res.followersCount);
      setFollowingCount(res.followingCount);
    }).catch(() => {});
  }, [user]);

  useEffect(() => {
    if (!user) return;
    api.profile.referrals()
      .then((res) => {
        setReferralCount(res?.referralCount ?? 0);
        setReferredUsers(res?.referrals ?? []);
      })
      .catch(() => {});
  }, [user]);

  useEffect(() => {
    if (!user) return;
    setAchLoading(true);
    api.profile
      .achievements(user.id)
      .then((res) => {
        setAchievements(res?.achievements ?? []);
        setAchProgress(res?.progress ?? { totalDistance: 0, currentStreak: 0, bestStreak: 0, finishedEvents: 0 });
      })
      .catch(() => setAchievements([]))
      .finally(() => setAchLoading(false));
  }, [user]);

  const handleSave = useCallback(
    async (e: FormEvent) => {
      e.preventDefault();
      if (!user) return;
      setSaving(true);
      setSaveMsg('');
      try {
        const updated = await api.profile.update({ firstName, lastName, city, bio, isPublic } as any);
        updateUser(updated);
        setSaveMsg('Профиль обновлён');
      } catch (err: unknown) {
        setSaveMsg(err instanceof Error ? err.message : 'Ошибка сохранения');
      } finally {
        setSaving(false);
      }
    },
    [user, firstName, lastName, city, bio, isPublic, updateUser],
  );

  const handleCopyReferral = useCallback(() => {
    if (!user) return;
    const link = `${window.location.origin}/register?ref=${user.referralCode}`;
    // Fallback for HTTP (clipboard API requires HTTPS)
    try {
      if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(link);
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = link;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback: select input text
      const input = document.querySelector('input[readonly]') as HTMLInputElement;
      if (input) { input.select(); input.setSelectionRange(0, 99999); }
    }
  }, [user]);

  const handleAvatarClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleAvatarChange = useCallback(
    async (e: ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file || !user) return;
      setAvatarUploading(true);
      try {
        const { avatarUrl } = await api.profile.uploadAvatar(file);
        updateUser({ ...user, avatarUrl });
      } catch (err: unknown) {
        alert(err instanceof Error ? err.message : 'Ошибка загрузки аватара');
      } finally {
        setAvatarUploading(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    },
    [user, updateUser],
  );

  const openFollowModal = useCallback(async (type: 'followers' | 'following') => {
    if (!user) return;
    setFollowModal(type);
    setFollowModalLoading(true);
    try {
      const list = type === 'followers'
        ? await api.social.followers(user.id)
        : await api.social.following(user.id);
      setFollowModalUsers(list);
    } catch {
      setFollowModalUsers([]);
    } finally {
      setFollowModalLoading(false);
    }
  }, [user]);

  if (!user) {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '60vh',
          color: '#666',
          fontSize: 18,
        }}
      >
        Войдите чтобы увидеть профиль
      </div>
    );
  }

  const nextLevelXp = (user.level + 1) * 100;
  const xpProgress = Math.min((user.xp / nextLevelXp) * 100, 100);

  const referralLink = `${window.location.origin}/register?ref=${user.referralCode ?? ''}`;

  const sports: SportType[] = ['RUNNING', 'CYCLING', 'SKIING', 'WALKING'];

  return (
    <div style={{ maxWidth: 800, margin: '0 auto', padding: '24px 16px' }}>
      {/* Шапка профиля */}
      <div
        style={{
          background: '#fff',
          borderRadius: 16,
          padding: 24,
          boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
          border: '1px solid #e0e0e0',
          display: 'flex',
          alignItems: 'center',
          gap: 20,
          marginBottom: 20,
        }}
      >
        <div
          style={{
            width: 72,
            height: 72,
            borderRadius: '50%',
            background: '#fc4c02',
            color: '#fff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 32,
            fontWeight: 700,
            flexShrink: 0,
            cursor: 'pointer',
            position: 'relative',
            overflow: 'hidden',
            opacity: avatarUploading ? 0.6 : 1,
          }}
          onClick={handleAvatarClick}
          onMouseEnter={() => setAvatarHover(true)}
          onMouseLeave={() => setAvatarHover(false)}
          title="Изменить аватар"
        >
          {user.avatarUrl ? (
            <img
              src={user.avatarUrl}
              alt="Аватар"
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
              }}
            />
          ) : (
            (user.username ?? '?')[0].toUpperCase()
          )}
          {avatarHover && !avatarUploading && (
            <div
              style={{
                position: 'absolute',
                inset: 0,
                background: 'rgba(0,0,0,0.45)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff',
                fontSize: 22,
              }}
            >
              <svg
                width="22"
                height="22"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                <circle cx="12" cy="13" r="4" />
              </svg>
            </div>
          )}
          {avatarUploading && (
            <div
              style={{
                position: 'absolute',
                inset: 0,
                background: 'rgba(0,0,0,0.45)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff',
                fontSize: 12,
              }}
            >
              ...
            </div>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleAvatarChange}
            style={{ display: 'none' }}
          />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 22, fontWeight: 700, color: '#242424' }}>
            {user.username ?? '—'}
          </div>
          {user.city && (
            <div style={{ fontSize: 14, color: '#666', marginTop: 2 }}>{user.city}</div>
          )}
          {user.bio && (
            <div style={{ fontSize: 14, color: '#999', marginTop: 4 }}>{user.bio}</div>
          )}
        </div>
      </div>

      {/* Уровень и XP */}
      <div
        style={{
          background: '#fff',
          borderRadius: 16,
          padding: 20,
          boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
          border: '1px solid #e0e0e0',
          marginBottom: 20,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
          <div
            style={{
              background: '#fc4c02',
              color: '#fff',
              borderRadius: 8,
              padding: '4px 12px',
              fontWeight: 700,
              fontSize: 14,
            }}
          >
            Уровень {user.level ?? 0}
          </div>
          <span style={{ fontSize: 14, color: '#666' }}>
            {user.xp ?? 0} / {nextLevelXp} XP
          </span>
        </div>
        <div
          style={{
            height: 10,
            background: '#eef0f4',
            borderRadius: 5,
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              height: '100%',
              width: `${xpProgress}%`,
              background: '#fc4c02',
              borderRadius: 5,
              transition: 'width 0.3s',
            }}
          />
        </div>
      </div>

      {/* Статистика */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(3, 1fr)',
          gap: 12,
          marginBottom: 20,
        }}
      >
        {[
          { label: 'Общая дистанция', value: `${(user.totalDistance ?? 0).toFixed(1)} км`, onClick: () => window.dispatchEvent(new CustomEvent('switch-tab', { detail: { tab: 'activities' } })) },
          { label: 'Общее время', value: formatDuration(user.totalTime ?? 0), onClick: () => window.dispatchEvent(new CustomEvent('switch-tab', { detail: { tab: 'activities' } })) },
          { label: 'Всего тренировок', value: String(user.totalActivities ?? 0), onClick: () => window.dispatchEvent(new CustomEvent('switch-tab', { detail: { tab: 'activities' } })) },
          { label: 'Текущий стрик', value: `${user.currentStreak ?? 0} дн.`, onClick: () => window.dispatchEvent(new CustomEvent('switch-tab', { detail: { tab: 'activities' } })) },
          { label: 'Подписчики', value: String(followersCount), onClick: () => openFollowModal('followers') },
          { label: 'Подписки', value: String(followingCount), onClick: () => openFollowModal('following') },
        ].map((stat) => (
          <div
            key={stat.label}
            onClick={stat.onClick}
            style={{
              background: '#fff',
              borderRadius: 16,
              padding: 16,
              boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
              border: '1px solid #e0e0e0',
              textAlign: 'center',
              cursor: 'pointer',
              transition: 'transform 0.15s, box-shadow 0.15s',
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-2px)';
              (e.currentTarget as HTMLDivElement).style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLDivElement).style.transform = 'translateY(0)';
              (e.currentTarget as HTMLDivElement).style.boxShadow = '0 1px 4px rgba(0,0,0,0.06)';
            }}
          >
            <div style={{ fontSize: 22, fontWeight: 700, color: '#242424' }}>{stat.value}</div>
            <div style={{ fontSize: 13, color: '#666', marginTop: 4 }}>{stat.label}</div>
          </div>
        ))}
      </div>

      {/* По видам спорта */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)',
          gap: 10,
          marginBottom: 20,
        }}
      >
        {sports.map((sport) => {
          const ss = sportStats.find(s => s.sport === sport);
          return (
            <div
              key={sport}
              onClick={() => {
                window.dispatchEvent(new CustomEvent('switch-tab', { detail: { tab: 'activities' } }));
                setTimeout(() => window.dispatchEvent(new CustomEvent('filter-by-sport', { detail: { sport } })), 100);
              }}
              style={{
                background: '#fff',
                borderRadius: 16,
                padding: 12,
                boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
                border: `1px solid #e0e0e0`,
                textAlign: 'center',
                cursor: 'pointer',
                transition: 'transform 0.15s, box-shadow 0.15s, border-color 0.15s',
              }}
              onMouseEnter={(e) => {
                const el = e.currentTarget as HTMLDivElement;
                el.style.transform = 'translateY(-2px)';
                el.style.boxShadow = `0 4px 12px ${SPORT_COLORS[sport]}33`;
                el.style.borderColor = SPORT_COLORS[sport];
              }}
              onMouseLeave={(e) => {
                const el = e.currentTarget as HTMLDivElement;
                el.style.transform = 'translateY(0)';
                el.style.boxShadow = '0 1px 4px rgba(0,0,0,0.06)';
                el.style.borderColor = '#e0e0e0';
              }}
            >
              <div style={{ fontSize: 28 }}>{SPORT_ICONS[sport]}</div>
              <div style={{ fontSize: 12, color: SPORT_COLORS[sport], fontWeight: 600, marginTop: 4 }}>
                {SPORT_LABELS[sport]}
              </div>
              <div style={{ fontSize: 16, fontWeight: 700, color: '#242424', marginTop: 6 }}>
                {ss ? `${ss.totalDistance.toFixed(1)} км` : '0 км'}
              </div>
              <div style={{ fontSize: 11, color: '#999' }}>
                {ss ? `${ss.activityCount} трен.` : '0 трен.'}
              </div>
            </div>
          );
        })}
      </div>

      {/* Достижения */}
      <div
        style={{
          background: '#fff',
          borderRadius: 16,
          boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
          border: '1px solid #e0e0e0',
          marginBottom: 20,
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: 20,
            cursor: 'pointer',
            userSelect: 'none',
          }}
          onClick={() => setAchExpanded((prev) => !prev)}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ fontSize: 18, fontWeight: 700, color: '#242424' }}>
              Достижения ({achievements.filter((a) => !!a.unlockedAt).length} / {achievements.length})
            </div>
          </div>
          <div style={{
            fontSize: 18,
            color: '#888',
            transition: 'transform 0.25s',
            transform: achExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
          }}>
            ▼
          </div>
        </div>
        <div style={{
          maxHeight: achExpanded ? 2000 : 0,
          overflow: 'hidden',
          transition: 'max-height 0.35s ease-in-out',
          padding: achExpanded ? '0 20px 20px 20px' : '0 20px',
        }}>
        {achLoading ? (
          <div style={{ color: '#999', fontSize: 14 }}>Загрузка...</div>
        ) : achievements.length === 0 ? (
          <div style={{ color: '#999', fontSize: 14 }}>Пока нет достижений</div>
        ) : (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)',
              gap: 12,
            }}
          >
            {achievements.map((a) => {
              const unlocked = !!a.unlockedAt;
              const cat = a.achievement.category ?? '';
              const threshold = a.achievement.threshold ?? 0;

              let progressValue: number | null = null;
              if (!unlocked && threshold > 0) {
                if (cat === 'distance') {
                  progressValue = achProgress.totalDistance;
                } else if (cat === 'streak') {
                  progressValue = Math.max(achProgress.currentStreak, achProgress.bestStreak);
                } else if (cat === 'events') {
                  progressValue = achProgress.finishedEvents;
                }
              }

              const progressPct = progressValue != null && threshold > 0
                ? Math.min(100, Math.round((progressValue / threshold) * 100))
                : null;

              const progressLabel = progressValue != null && threshold > 0
                ? cat === 'distance'
                  ? `${Math.round(progressValue)} / ${threshold} км`
                  : cat === 'streak'
                    ? `${progressValue} / ${threshold} дн.`
                    : cat === 'events'
                      ? `${progressValue} / ${threshold}`
                      : null
                : null;

              return (
                <div
                  key={a.achievement.id}
                  style={{
                    borderRadius: 14,
                    padding: 14,
                    textAlign: 'center',
                    background: unlocked ? '#fff' : '#f9f9f9',
                    border: unlocked ? '2px solid #fc4c02' : '1px solid #e0e0e0',
                    boxShadow: unlocked ? '0 0 12px rgba(252,76,2,0.2)' : 'none',
                    opacity: unlocked ? 1 : 0.4,
                    filter: unlocked ? 'none' : 'grayscale(1)',
                    transition: 'all 0.2s',
                    position: 'relative' as const,
                  }}
                >
                  <div style={{ fontSize: 40, lineHeight: 1, marginBottom: 6, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {a.achievement.iconUrl ? (
                      <img src={a.achievement.iconUrl} alt={a.achievement.name} style={{ width: 40, height: 40, borderRadius: 8, objectFit: 'cover' }} />
                    ) : (
                      a.achievement.icon ?? '🏅'
                    )}
                  </div>
                  <div
                    style={{
                      fontSize: 13,
                      fontWeight: 700,
                      color: unlocked ? '#242424' : '#999',
                      marginBottom: 2,
                      lineHeight: 1.2,
                    }}
                  >
                    {a.achievement.name}
                  </div>
                  <div style={{ fontSize: 11, color: '#999', marginBottom: 4, lineHeight: 1.3 }}>
                    {a.achievement.description}
                  </div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#fc4c02' }}>
                    +{a.achievement.xpReward} XP
                  </div>
                  {unlocked && a.unlockedAt && (
                    <div style={{ fontSize: 10, color: '#1a7f37', marginTop: 4, fontWeight: 600 }}>
                      {formatDate(a.unlockedAt)}
                    </div>
                  )}
                  {!unlocked && progressLabel != null && progressPct != null && (
                    <div style={{ marginTop: 6 }}>
                      <div style={{
                        width: '100%',
                        height: 4,
                        borderRadius: 2,
                        background: '#e0e0e0',
                        overflow: 'hidden',
                      }}>
                        <div style={{
                          width: `${progressPct}%`,
                          height: '100%',
                          background: '#fc4c02',
                          borderRadius: 2,
                          transition: 'width 0.3s',
                        }} />
                      </div>
                      <div style={{ fontSize: 10, color: '#888', marginTop: 2 }}>
                        {progressLabel}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
        </div>
      </div>

      {/* Реферальная ссылка и приглашённые */}
      <div
        style={{
          background: '#fff',
          borderRadius: 16,
          padding: 20,
          boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
          border: '1px solid #e0e0e0',
          marginBottom: 20,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: '#242424' }}>
            Реферальная программа
          </div>
          <div style={{
            background: '#fc4c02',
            color: '#fff',
            borderRadius: 20,
            padding: '4px 14px',
            fontSize: 14,
            fontWeight: 700,
          }}>
            {referralCount} {referralCount === 1 ? 'приглашение' : referralCount >= 2 && referralCount <= 4 ? 'приглашения' : 'приглашений'}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 16, flexWrap: isMobile ? 'wrap' : 'nowrap' }}>
          <input
            readOnly
            value={referralLink}
            style={{
              flex: 1,
              padding: '8px 12px',
              borderRadius: 8,
              border: '1px solid #e0e0e0',
              fontSize: isMobile ? 11 : 13,
              color: '#242424',
              background: '#eef0f4',
              outline: 'none',
              minWidth: 0,
              width: isMobile ? '100%' : undefined,
              boxSizing: 'border-box' as const,
            }}
          />
          <button
            type="button"
            onClick={handleCopyReferral}
            style={{
              padding: '8px 16px',
              borderRadius: 8,
              border: 'none',
              background: '#fc4c02',
              color: '#fff',
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            {copied ? 'Скопировано!' : 'Копировать'}
          </button>
        </div>

        {referredUsers.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {referredUsers.map((r) => (
              <div key={r.id} style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '10px 0',
                borderTop: '1px solid #e0e0e0',
              }}>
                {r.avatarUrl ? (
                  <img src={r.avatarUrl} alt="" style={{ width: 36, height: 36, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
                ) : (
                  <div style={{
                    width: 36,
                    height: 36,
                    borderRadius: '50%',
                    background: '#fc4c02',
                    color: '#fff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 16,
                    fontWeight: 700,
                    flexShrink: 0,
                  }}>
                    {(r.username ?? '?')[0].toUpperCase()}
                  </div>
                )}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: '#242424' }}>{r.username}</div>
                  <div style={{ fontSize: 12, color: '#888' }}>
                    {formatDate(r.createdAt)} — {(r.totalDistance ?? 0).toFixed(1)} км
                  </div>
                </div>
                <div style={{
                  background: '#eef0f4',
                  borderRadius: 8,
                  padding: '3px 10px',
                  fontSize: 12,
                  fontWeight: 600,
                  color: '#666',
                }}>
                  Ур. {r.level ?? 1}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: 16, color: '#999', fontSize: 14 }}>
            Пригласите друзей и получите бонусы!
          </div>
        )}
      </div>

      {/* Редактирование профиля */}
      <div
        style={{
          background: '#fff',
          borderRadius: 16,
          padding: 20,
          boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
          border: '1px solid #e0e0e0',
          marginBottom: 20,
        }}
      >
        <div style={{ fontSize: 16, fontWeight: 700, color: '#242424', marginBottom: 14 }}>
          Редактировать профиль
        </div>
        <form onSubmit={handleSave}>
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 12, marginBottom: 12 }}>
            <div>
              <label style={{ fontSize: 13, color: '#666', display: 'block', marginBottom: 4 }}>
                Имя
              </label>
              <input
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  borderRadius: 8,
                  border: '1px solid #e0e0e0',
                  fontSize: 14,
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
            </div>
            <div>
              <label style={{ fontSize: 13, color: '#666', display: 'block', marginBottom: 4 }}>
                Фамилия
              </label>
              <input
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  borderRadius: 8,
                  border: '1px solid #e0e0e0',
                  fontSize: 14,
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
            </div>
          </div>
          <div style={{ marginBottom: 12 }}>
            <label style={{ fontSize: 13, color: '#666', display: 'block', marginBottom: 4 }}>
              Город
            </label>
            <input
              value={city}
              onChange={(e) => setCity(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 12px',
                borderRadius: 8,
                border: '1px solid #e0e0e0',
                fontSize: 14,
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
          </div>
          <div style={{ marginBottom: 16 }}>
            <label style={{ fontSize: 13, color: '#666', display: 'block', marginBottom: 4 }}>
              О себе
            </label>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              rows={3}
              style={{
                width: '100%',
                padding: '8px 12px',
                borderRadius: 8,
                border: '1px solid #e0e0e0',
                fontSize: 14,
                outline: 'none',
                resize: 'vertical',
                boxSizing: 'border-box',
                fontFamily: 'inherit',
              }}
            />
          </div>
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '12px 0', marginBottom: 12,
            borderTop: '1px solid #f0f0f0', borderBottom: '1px solid #f0f0f0',
          }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 600, color: '#242424' }}>Публичный профиль</div>
              <div style={{ fontSize: 12, color: '#999', marginTop: 2 }}>Другие пользователи могут видеть ваш профиль</div>
            </div>
            <button
              type="button"
              onClick={() => setIsPublic(prev => !prev)}
              style={{
                width: 48,
                height: 26,
                borderRadius: 13,
                border: 'none',
                background: isPublic ? '#fc4c02' : '#ccc',
                cursor: 'pointer',
                position: 'relative',
                transition: 'background 0.2s',
                flexShrink: 0,
              }}
            >
              <div style={{
                width: 22,
                height: 22,
                borderRadius: '50%',
                background: '#fff',
                position: 'absolute',
                top: 2,
                left: isPublic ? 24 : 2,
                transition: 'left 0.2s',
                boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
              }} />
            </button>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button
              type="submit"
              disabled={saving}
              style={{
                padding: '10px 24px',
                borderRadius: 8,
                border: 'none',
                background: '#fc4c02',
                color: '#fff',
                fontSize: 14,
                fontWeight: 600,
                cursor: saving ? 'not-allowed' : 'pointer',
                opacity: saving ? 0.7 : 1,
              }}
            >
              {saving ? 'Сохранение...' : 'Сохранить'}
            </button>
            {saveMsg && (
              <span style={{ fontSize: 13, color: saveMsg === 'Профиль обновлён' ? '#1a7f37' : '#d32f2f' }}>
                {saveMsg}
              </span>
            )}
          </div>
        </form>
      </div>

      {/* Дата регистрации */}
      <div style={{ textAlign: 'center', color: '#999', fontSize: 13, marginBottom: 20 }}>
        Участник с {formatDate(user.createdAt ?? '')}
      </div>

      {/* Модалка подписчиков/подписок */}
      {followModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.45)',
            zIndex: 1000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 16,
          }}
          onClick={() => setFollowModal(null)}
        >
          <div
            style={{
              background: '#fff',
              borderRadius: 20,
              width: '100%',
              maxWidth: 440,
              maxHeight: '70vh',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
              boxShadow: '0 8px 40px rgba(0,0,0,0.2)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '18px 20px',
              borderBottom: '1px solid #f0f0f0',
            }}>
              <div style={{ fontSize: 17, fontWeight: 700, color: '#242424' }}>
                {followModal === 'followers' ? 'Подписчики' : 'Подписки'}
              </div>
              <button
                type="button"
                onClick={() => setFollowModal(null)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 20, color: '#999', padding: 4, lineHeight: 1 }}
              >
                ✕
              </button>
            </div>
            <div style={{ overflowY: 'auto', flex: 1 }}>
              {followModalLoading ? (
                <div style={{ padding: 32, textAlign: 'center', color: '#999' }}>Загрузка...</div>
              ) : followModalUsers.length === 0 ? (
                <div style={{ padding: 32, textAlign: 'center', color: '#999', fontSize: 14 }}>
                  {followModal === 'followers' ? 'Нет подписчиков' : 'Нет подписок'}
                </div>
              ) : (
                followModalUsers.map((u) => (
                  <div
                    key={u.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 12,
                      padding: '12px 20px',
                      borderBottom: '1px solid #f5f5f5',
                      cursor: 'pointer',
                      transition: 'background 0.15s',
                    }}
                    onClick={() => {
                      setFollowModal(null);
                      window.dispatchEvent(new CustomEvent('open-profile', { detail: { userId: u.id } }));
                    }}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.background = '#f8f8f8'; }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.background = 'transparent'; }}
                  >
                    {u.avatarUrl ? (
                      <img src={u.avatarUrl} alt="" style={{ width: 44, height: 44, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
                    ) : (
                      <div style={{
                        width: 44, height: 44, borderRadius: '50%', background: '#fc4c02',
                        color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 18, fontWeight: 700, flexShrink: 0,
                      }}>
                        {(u.username ?? '?')[0].toUpperCase()}
                      </div>
                    )}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 14, fontWeight: 700, color: '#242424' }}>{u.username}</div>
                      {u.city && <div style={{ fontSize: 12, color: '#888', marginTop: 1 }}>{u.city}</div>}
                      <div style={{ fontSize: 12, color: '#999', marginTop: 1 }}>
                        {(u.totalDistance ?? 0).toFixed(1)} км
                      </div>
                    </div>
                    <div style={{
                      background: '#eef0f4', borderRadius: 8, padding: '3px 10px',
                      fontSize: 12, fontWeight: 600, color: '#666', flexShrink: 0,
                    }}>
                      Ур. {u.level ?? 1}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
