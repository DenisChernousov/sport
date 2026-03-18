import { useCallback, useEffect, useRef, useState } from 'react';
import type { ChangeEvent, FormEvent } from 'react';
import type { Achievement, SportType } from '@/types';
import { api } from '@/services/api';
import { useAuth } from '@/context/AuthContext';

const SPORT_ICONS: Record<SportType, string> = {
  RUNNING: '\u{1F3C3}',
  CYCLING: '\u{1F6B4}',
  SKIING: '\u26F7\uFE0F',
  WALKING: '\u{1F6B6}',
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
  unlockedAt: string;
}

export default function ProfilePanel() {
  const { user, updateUser } = useAuth();

  const [achievements, setAchievements] = useState<AchievementWithMeta[]>([]);
  const [achLoading, setAchLoading] = useState(false);

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [city, setCity] = useState('');
  const [bio, setBio] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState('');

  const [copied, setCopied] = useState(false);
  const [sportStats, setSportStats] = useState<{ sport: string; totalDistance: number; activityCount: number }[]>([]);
  const [followersCount, setFollowersCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [avatarHover, setAvatarHover] = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (user) {
      setFirstName(user.firstName ?? '');
      setLastName(user.lastName ?? '');
      setCity(user.city ?? '');
      setBio(user.bio ?? '');
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
    setAchLoading(true);
    api.profile
      .achievements(user.id)
      .then((res) => {
        setAchievements(res?.achievements ?? []);
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
        const updated = await api.profile.update({ firstName, lastName, city, bio });
        updateUser(updated);
        setSaveMsg('Профиль обновлён');
      } catch (err: unknown) {
        setSaveMsg(err instanceof Error ? err.message : 'Ошибка сохранения');
      } finally {
        setSaving(false);
      }
    },
    [user, firstName, lastName, city, bio, updateUser],
  );

  const handleCopyReferral = useCallback(() => {
    if (!user) return;
    const link = `${window.location.origin}/register?ref=${user.referralCode}`;
    navigator.clipboard.writeText(link).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
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
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: 12,
          marginBottom: 20,
        }}
      >
        {[
          { label: 'Общая дистанция', value: `${(user.totalDistance ?? 0).toFixed(1)} км` },
          { label: 'Общее время', value: formatDuration(user.totalTime ?? 0) },
          { label: 'Всего тренировок', value: String(user.totalActivities ?? 0) },
          { label: 'Текущий стрик', value: `${user.currentStreak ?? 0} дн.` },
          { label: 'Подписчики', value: String(followersCount) },
          { label: 'Подписки', value: String(followingCount) },
        ].map((stat) => (
          <div
            key={stat.label}
            style={{
              background: '#fff',
              borderRadius: 16,
              padding: 16,
              boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
              border: '1px solid #e0e0e0',
              textAlign: 'center',
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
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: 10,
          marginBottom: 20,
        }}
      >
        {sports.map((sport) => {
          const ss = sportStats.find(s => s.sport === sport);
          return (
            <div
              key={sport}
              style={{
                background: '#fff',
                borderRadius: 16,
                padding: 12,
                boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
                border: '1px solid #e0e0e0',
                textAlign: 'center',
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
          padding: 20,
          boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
          border: '1px solid #e0e0e0',
          marginBottom: 20,
        }}
      >
        <div style={{ fontSize: 18, fontWeight: 700, color: '#242424', marginBottom: 14 }}>
          Достижения
        </div>
        {achLoading ? (
          <div style={{ color: '#999', fontSize: 14 }}>Загрузка...</div>
        ) : achievements.length === 0 ? (
          <div style={{ color: '#999', fontSize: 14 }}>Пока нет достижений</div>
        ) : (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
              gap: 10,
            }}
          >
            {achievements.map((a) => {
              const unlocked = !!a.unlockedAt;
              return (
                <div
                  key={a.achievement.id}
                  style={{
                    borderRadius: 12,
                    padding: 12,
                    textAlign: 'center',
                    background: unlocked ? '#fff' : '#f5f5f5',
                    border: unlocked ? '1px solid #fc4c02' : '1px solid #e0e0e0',
                    opacity: unlocked ? 1 : 0.5,
                  }}
                >
                  <div style={{ fontSize: 28 }}>{a.achievement.icon ?? '\u{1F3C5}'}</div>
                  <div
                    style={{
                      fontSize: 13,
                      fontWeight: 600,
                      color: unlocked ? '#242424' : '#999',
                      marginTop: 4,
                    }}
                  >
                    {a.achievement.name}
                  </div>
                  <div style={{ fontSize: 11, color: '#999', marginTop: 2 }}>
                    {a.achievement.description}
                  </div>
                  {unlocked && (
                    <div style={{ fontSize: 11, color: '#1a7f37', marginTop: 4 }}>
                      {formatDate(a.unlockedAt)}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Реферальная ссылка */}
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
        <div style={{ fontSize: 16, fontWeight: 700, color: '#242424', marginBottom: 10 }}>
          Реферальная ссылка
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <input
            readOnly
            value={referralLink}
            style={{
              flex: 1,
              padding: '8px 12px',
              borderRadius: 8,
              border: '1px solid #e0e0e0',
              fontSize: 13,
              color: '#242424',
              background: '#eef0f4',
              outline: 'none',
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
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
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
    </div>
  );
}
