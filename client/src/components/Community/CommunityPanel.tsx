import { useCallback, useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import type { SportType } from '@/types';
import { api } from '@/services/api';
import { useAuth } from '@/context/AuthContext';

const SPORT_ICONS: Record<SportType, string> = {
  RUNNING: '🏃',
  CYCLING: '🚴',
  SKIING: '⛷️',
  WALKING: '🚶',
};

const SPORT_LABELS: Record<SportType, string> = {
  RUNNING: 'Бег',
  CYCLING: 'Велосипед',
  SKIING: 'Лыжи',
  WALKING: 'Ходьба',
};

const SPORT_COLORS: Record<SportType, string> = {
  RUNNING: '#fc4c02',
  CYCLING: '#0061ff',
  SKIING: '#0891b2',
  WALKING: '#7c3aed',
};

const ALL_SPORTS: SportType[] = ['RUNNING', 'CYCLING', 'SKIING', 'WALKING'];

type Section = 'feed' | 'search' | 'planned';

interface FeedItem {
  id: string;
  sport: SportType;
  title?: string;
  distance: number;
  duration: number;
  startedAt: string;
  user: { id: string; username: string; avatarUrl?: string; level: number };
  _count: { likes: number };
}

interface SearchUser {
  id: string;
  username: string;
  avatarUrl?: string;
  city?: string;
  level: number;
  totalDistance: number;
  _count: { followers: number; following: number };
}

interface PlannedItem {
  id: string;
  userId: string;
  sport: SportType;
  city: string;
  date: string;
  time: string;
  description?: string;
  maxPeople: number;
  user: { id: string; username: string; avatarUrl?: string; level: number };
}

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}ч ${m}м`;
  return `${m}м`;
}

function formatDate(dateStr: string): string {
  try {
    return new Intl.DateTimeFormat('ru-RU', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    }).format(new Date(dateStr));
  } catch {
    return dateStr;
  }
}

function formatDateTime(dateStr: string, time: string): string {
  try {
    const d = new Intl.DateTimeFormat('ru-RU', {
      day: 'numeric',
      month: 'short',
    }).format(new Date(dateStr));
    return `${d}, ${time}`;
  } catch {
    return `${dateStr}, ${time}`;
  }
}

// ─── Shared styles ──────────────────────────────────────

const cardStyle: React.CSSProperties = {
  background: '#fff',
  borderRadius: 16,
  padding: 20,
  boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
  border: '1px solid #e0e0e0',
  marginBottom: 16,
};

const sectionTitleStyle: React.CSSProperties = {
  fontSize: 18,
  fontWeight: 700,
  color: '#242424',
  marginBottom: 16,
  marginTop: 0,
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '8px 12px',
  borderRadius: 8,
  border: '1px solid #e0e0e0',
  fontSize: 14,
  outline: 'none',
  boxSizing: 'border-box' as const,
};

const btnPrimary: React.CSSProperties = {
  padding: '8px 20px',
  borderRadius: 8,
  border: 'none',
  background: '#fc4c02',
  color: '#fff',
  fontSize: 14,
  fontWeight: 600,
  cursor: 'pointer',
};

const btnOutline: React.CSSProperties = {
  padding: '6px 16px',
  borderRadius: 8,
  border: '1px solid #e0e0e0',
  background: '#fff',
  color: '#666',
  fontSize: 13,
  fontWeight: 600,
  cursor: 'pointer',
};

function Avatar({ url, username, size = 40 }: { url?: string; username: string; size?: number }) {
  if (url) {
    return (
      <img
        src={url}
        alt={username}
        style={{
          width: size,
          height: size,
          borderRadius: '50%',
          objectFit: 'cover',
          flexShrink: 0,
        }}
      />
    );
  }
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        background: '#fc4c02',
        color: '#fff',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: size * 0.45,
        fontWeight: 700,
        flexShrink: 0,
      }}
    >
      {(username ?? '?')[0].toUpperCase()}
    </div>
  );
}

// ─── Feed Section ───────────────────────────────────────

function FeedSection() {
  const { isAuthenticated } = useAuth();
  const [items, setItems] = useState<FeedItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);

  const loadFeed = useCallback(
    async (p: number) => {
      if (!isAuthenticated) return;
      setLoading(true);
      try {
        const res = await api.social.feed({ page: p, limit: 15 });
        setItems(res.items as FeedItem[]);
        setTotalPages(res.pagination.totalPages);
        setPage(res.pagination.page);
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    },
    [isAuthenticated],
  );

  useEffect(() => {
    loadFeed(1);
  }, [loadFeed]);

  if (!isAuthenticated) {
    return (
      <div style={cardStyle}>
        <h3 style={sectionTitleStyle}>Лента активностей</h3>
        <div style={{ color: '#999', fontSize: 14, textAlign: 'center', padding: '24px 0' }}>
          Войдите, чтобы видеть ленту подписок
        </div>
      </div>
    );
  }

  return (
    <div style={cardStyle}>
      <h3 style={sectionTitleStyle}>Лента активностей</h3>
      {loading && items.length === 0 ? (
        <div style={{ color: '#999', fontSize: 14, textAlign: 'center', padding: '24px 0' }}>
          Загрузка...
        </div>
      ) : items.length === 0 ? (
        <div style={{ color: '#999', fontSize: 14, textAlign: 'center', padding: '24px 0' }}>
          Лента пуста. Подпишитесь на других спортсменов, чтобы видеть их тренировки.
        </div>
      ) : (
        <>
          {items.map((item) => (
            <div
              key={item.id}
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: 12,
                padding: '12px 0',
                borderBottom: '1px solid #f0f0f0',
              }}
            >
              <div onClick={() => window.dispatchEvent(new CustomEvent('open-profile', { detail: { userId: item.user.id } }))} style={{ cursor: 'pointer', flexShrink: 0 }}>
                <Avatar url={item.user.avatarUrl} username={item.user.username} size={40} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <span onClick={() => window.dispatchEvent(new CustomEvent('open-profile', { detail: { userId: item.user.id } }))} style={{ fontWeight: 700, fontSize: 14, color: '#242424', cursor: 'pointer' }}>
                    {item.user.username}
                  </span>
                  <span
                    style={{
                      fontSize: 11,
                      color: '#fff',
                      background: '#fc4c02',
                      borderRadius: 4,
                      padding: '1px 6px',
                      fontWeight: 600,
                    }}
                  >
                    Ур. {item.user.level}
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <span
                    style={{
                      fontSize: 13,
                      fontWeight: 600,
                      color: SPORT_COLORS[item.sport] ?? '#666',
                    }}
                  >
                    {SPORT_ICONS[item.sport]} {SPORT_LABELS[item.sport]}
                  </span>
                  <span style={{ fontSize: 13, color: '#242424', fontWeight: 700 }}>
                    {item.distance.toFixed(2)} км
                  </span>
                  <span style={{ fontSize: 13, color: '#666' }}>
                    {formatDuration(item.duration)}
                  </span>
                  {item.title && (
                    <span style={{ fontSize: 13, color: '#999' }}>— {item.title}</span>
                  )}
                </div>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    marginTop: 4,
                    fontSize: 12,
                    color: '#aaa',
                  }}
                >
                  <span>{formatDate(item.startedAt)}</span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                    ❤️ {item._count?.likes ?? 0}
                  </span>
                </div>
              </div>
            </div>
          ))}

          {totalPages > 1 && (
            <div
              style={{
                display: 'flex',
                justifyContent: 'center',
                gap: 8,
                marginTop: 16,
              }}
            >
              <button
                disabled={page <= 1}
                onClick={() => loadFeed(page - 1)}
                style={{
                  ...btnOutline,
                  opacity: page <= 1 ? 0.5 : 1,
                  cursor: page <= 1 ? 'not-allowed' : 'pointer',
                }}
              >
                Назад
              </button>
              <span style={{ fontSize: 13, color: '#999', lineHeight: '32px' }}>
                {page} / {totalPages}
              </span>
              <button
                disabled={page >= totalPages}
                onClick={() => loadFeed(page + 1)}
                style={{
                  ...btnOutline,
                  opacity: page >= totalPages ? 0.5 : 1,
                  cursor: page >= totalPages ? 'not-allowed' : 'pointer',
                }}
              >
                Далее
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ─── People Search Section ──────────────────────────────

function SearchSection() {
  const { isAuthenticated, user: currentUser } = useAuth();
  const [query, setQuery] = useState('');
  const [cityFilter, setCityFilter] = useState('');
  const [results, setResults] = useState<SearchUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [followingSet, setFollowingSet] = useState<Set<string>>(new Set());

  const doSearch = useCallback(async () => {
    if (!query && !cityFilter) return;
    setLoading(true);
    try {
      const users = await api.social.searchUsers({
        q: query || undefined,
        city: cityFilter || undefined,
      });
      setResults(users);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [query, cityFilter]);

  // Load following set on mount
  useEffect(() => {
    if (!isAuthenticated || !currentUser) return;
    api.social
      .following(currentUser.id)
      .then((list) => {
        setFollowingSet(new Set(list.map((u) => u.id)));
      })
      .catch(() => {});
  }, [isAuthenticated, currentUser]);

  const handleFollow = useCallback(
    async (userId: string) => {
      if (!isAuthenticated) return;
      try {
        const res = await api.social.follow(userId);
        setFollowingSet((prev) => {
          const next = new Set(prev);
          if (res.isFollowing) next.add(userId);
          else next.delete(userId);
          return next;
        });
      } catch {
        // ignore
      }
    },
    [isAuthenticated],
  );

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    doSearch();
  };

  return (
    <div style={cardStyle}>
      <h3 style={sectionTitleStyle}>Поиск людей</h3>
      <form onSubmit={handleSubmit} style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        <input
          placeholder="Имя пользователя"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          style={{ ...inputStyle, flex: 1, minWidth: 140 }}
        />
        <input
          placeholder="Город"
          value={cityFilter}
          onChange={(e) => setCityFilter(e.target.value)}
          style={{ ...inputStyle, flex: 1, minWidth: 120 }}
        />
        <button type="submit" disabled={loading} style={btnPrimary}>
          {loading ? '...' : 'Найти'}
        </button>
      </form>

      {results.length === 0 && !loading && (
        <div style={{ color: '#999', fontSize: 14, textAlign: 'center', padding: '12px 0' }}>
          Введите имя или город для поиска
        </div>
      )}

      {results.map((u) => {
        const isSelf = currentUser?.id === u.id;
        const isFollowing = followingSet.has(u.id);
        const openProfile = () => window.dispatchEvent(new CustomEvent('open-profile', { detail: { userId: u.id } }));
        return (
          <div
            key={u.id}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              padding: '10px 0',
              borderBottom: '1px solid #f0f0f0',
            }}
          >
            <div onClick={openProfile} style={{ cursor: 'pointer' }}>
              <Avatar url={u.avatarUrl} username={u.username} size={44} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div onClick={openProfile} style={{ fontWeight: 700, fontSize: 14, color: '#242424', cursor: 'pointer', display: 'inline-block' }}>{u.username}</div>
              <div style={{ fontSize: 12, color: '#999', display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {u.city && <span>{u.city}</span>}
                <span>Ур. {u.level}</span>
                <span>{u.totalDistance.toFixed(1)} км</span>
                <span>{u._count?.followers ?? 0} подп.</span>
              </div>
            </div>
            {!isSelf && isAuthenticated && (
              <button
                onClick={() => handleFollow(u.id)}
                style={{
                  ...btnOutline,
                  background: isFollowing ? '#fff4ef' : '#fff',
                  color: isFollowing ? '#fc4c02' : '#666',
                  borderColor: isFollowing ? '#fc4c02' : '#e0e0e0',
                }}
              >
                {isFollowing ? 'Отписаться' : 'Подписаться'}
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Planned Activities Section ─────────────────────────

function PlannedSection() {
  const { isAuthenticated, user: currentUser } = useAuth();
  const [items, setItems] = useState<PlannedItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [cityFilter, setCityFilter] = useState('');
  const [sportFilter, setSportFilter] = useState('');

  // Form state
  const [formSport, setFormSport] = useState<SportType>('RUNNING');
  const [formCity, setFormCity] = useState('');
  const [formDate, setFormDate] = useState('');
  const [formTime, setFormTime] = useState('07:00');
  const [formDesc, setFormDesc] = useState('');
  const [formMax, setFormMax] = useState(5);
  const [submitting, setSubmitting] = useState(false);

  const loadPlanned = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.social.listPlanned({
        city: cityFilter || undefined,
        sport: sportFilter || undefined,
      });
      setItems(data);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [cityFilter, sportFilter]);

  useEffect(() => {
    loadPlanned();
  }, [loadPlanned]);

  const handleCreate = useCallback(
    async (e: FormEvent) => {
      e.preventDefault();
      if (!formCity || !formDate || !formTime) return;
      setSubmitting(true);
      try {
        await api.social.createPlanned({
          sport: formSport,
          city: formCity,
          date: formDate,
          time: formTime,
          description: formDesc || undefined,
          maxPeople: formMax,
        });
        setShowForm(false);
        setFormCity('');
        setFormDate('');
        setFormTime('07:00');
        setFormDesc('');
        setFormMax(5);
        loadPlanned();
      } catch {
        // ignore
      } finally {
        setSubmitting(false);
      }
    },
    [formSport, formCity, formDate, formTime, formDesc, formMax, loadPlanned],
  );

  const handleDelete = useCallback(
    async (id: string) => {
      try {
        await api.social.deletePlanned(id);
        setItems((prev) => prev.filter((p) => p.id !== id));
      } catch {
        // ignore
      }
    },
    [],
  );

  return (
    <div style={cardStyle}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <h3 style={{ ...sectionTitleStyle, marginBottom: 0 }}>Планирую активность</h3>
        {isAuthenticated && (
          <button onClick={() => setShowForm(!showForm)} style={btnPrimary}>
            {showForm ? 'Отмена' : 'Создать план'}
          </button>
        )}
      </div>

      {/* Create form */}
      {showForm && (
        <form
          onSubmit={handleCreate}
          style={{
            background: '#f9f9f9',
            borderRadius: 12,
            padding: 16,
            marginBottom: 16,
            display: 'flex',
            flexDirection: 'column',
            gap: 10,
          }}
        >
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: 120 }}>
              <label style={{ fontSize: 12, color: '#666', display: 'block', marginBottom: 4 }}>
                Вид спорта
              </label>
              <select
                value={formSport}
                onChange={(e) => setFormSport(e.target.value as SportType)}
                style={{ ...inputStyle, cursor: 'pointer' }}
              >
                {ALL_SPORTS.map((s) => (
                  <option key={s} value={s}>
                    {SPORT_ICONS[s]} {SPORT_LABELS[s]}
                  </option>
                ))}
              </select>
            </div>
            <div style={{ flex: 1, minWidth: 120 }}>
              <label style={{ fontSize: 12, color: '#666', display: 'block', marginBottom: 4 }}>
                Город *
              </label>
              <input
                required
                value={formCity}
                onChange={(e) => setFormCity(e.target.value)}
                placeholder="Москва"
                style={inputStyle}
              />
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: 120 }}>
              <label style={{ fontSize: 12, color: '#666', display: 'block', marginBottom: 4 }}>
                Дата *
              </label>
              <input
                required
                type="date"
                value={formDate}
                onChange={(e) => setFormDate(e.target.value)}
                style={inputStyle}
              />
            </div>
            <div style={{ flex: 1, minWidth: 100 }}>
              <label style={{ fontSize: 12, color: '#666', display: 'block', marginBottom: 4 }}>
                Время *
              </label>
              <input
                required
                type="time"
                value={formTime}
                onChange={(e) => setFormTime(e.target.value)}
                style={inputStyle}
              />
            </div>
            <div style={{ flex: 1, minWidth: 80 }}>
              <label style={{ fontSize: 12, color: '#666', display: 'block', marginBottom: 4 }}>
                Макс. людей
              </label>
              <input
                type="number"
                min={2}
                max={50}
                value={formMax}
                onChange={(e) => setFormMax(Number(e.target.value))}
                style={inputStyle}
              />
            </div>
          </div>
          <div>
            <label style={{ fontSize: 12, color: '#666', display: 'block', marginBottom: 4 }}>
              Описание
            </label>
            <textarea
              value={formDesc}
              onChange={(e) => setFormDesc(e.target.value)}
              rows={2}
              placeholder="Бежим вместе в парке..."
              style={{ ...inputStyle, resize: 'vertical', fontFamily: 'inherit' }}
            />
          </div>
          <button type="submit" disabled={submitting} style={{ ...btnPrimary, alignSelf: 'flex-start' }}>
            {submitting ? 'Создание...' : 'Опубликовать'}
          </button>
        </form>
      )}

      {/* Filters */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        <input
          placeholder="Фильтр по городу"
          value={cityFilter}
          onChange={(e) => setCityFilter(e.target.value)}
          style={{ ...inputStyle, flex: 1, minWidth: 120 }}
        />
        <select
          value={sportFilter}
          onChange={(e) => setSportFilter(e.target.value)}
          style={{ ...inputStyle, width: 'auto', minWidth: 140, cursor: 'pointer' }}
        >
          <option value="">Все виды</option>
          {ALL_SPORTS.map((s) => (
            <option key={s} value={s}>
              {SPORT_ICONS[s]} {SPORT_LABELS[s]}
            </option>
          ))}
        </select>
      </div>

      {/* List */}
      {loading ? (
        <div style={{ color: '#999', fontSize: 14, textAlign: 'center', padding: '16px 0' }}>
          Загрузка...
        </div>
      ) : items.length === 0 ? (
        <div style={{ color: '#999', fontSize: 14, textAlign: 'center', padding: '16px 0' }}>
          Нет запланированных активностей
        </div>
      ) : (
        items.map((item) => {
          const isMine = currentUser?.id === item.userId;
          return (
            <div
              key={item.id}
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: 12,
                padding: '12px 0',
                borderBottom: '1px solid #f0f0f0',
              }}
            >
              <div
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 12,
                  background: (SPORT_COLORS[item.sport] ?? '#fc4c02') + '18',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 22,
                  flexShrink: 0,
                }}
              >
                {SPORT_ICONS[item.sport]}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <span
                    style={{
                      fontWeight: 700,
                      fontSize: 14,
                      color: SPORT_COLORS[item.sport] ?? '#242424',
                    }}
                  >
                    {SPORT_LABELS[item.sport]}
                  </span>
                  <span style={{ fontSize: 13, color: '#666' }}>{item.city}</span>
                </div>
                <div style={{ fontSize: 13, color: '#242424', marginBottom: 4 }}>
                  {formatDateTime(item.date, item.time)} · до {item.maxPeople} чел.
                </div>
                {item.description && (
                  <div style={{ fontSize: 13, color: '#888', marginBottom: 4 }}>{item.description}</div>
                )}
                <div
                  onClick={() => window.dispatchEvent(new CustomEvent('open-profile', { detail: { userId: item.user.id } }))}
                  style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', width: 'fit-content' }}
                >
                  <Avatar url={item.user.avatarUrl} username={item.user.username} size={20} />
                  <span style={{ fontSize: 12, color: '#999' }}>{item.user.username}</span>
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'flex-end' }}>
                {isMine ? (
                  <button
                    onClick={() => handleDelete(item.id)}
                    style={{
                      ...btnOutline,
                      fontSize: 12,
                      padding: '4px 12px',
                      color: '#d93025',
                      borderColor: '#fecaca',
                    }}
                  >
                    Удалить
                  </button>
                ) : (
                  <span
                    style={{
                      fontSize: 12,
                      color: '#fc4c02',
                      fontWeight: 600,
                      cursor: 'pointer',
                      padding: '4px 12px',
                      borderRadius: 8,
                      border: '1px solid #fc4c02',
                      background: '#fff4ef',
                    }}
                  >
                    Хочу присоединиться
                  </span>
                )}
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}

// ─── Main Community Panel ───────────────────────────────

export default function CommunityPanel() {
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  useEffect(() => {
    const h = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', h);
    return () => window.removeEventListener('resize', h);
  }, []);
  const [section, setSection] = useState<Section>('feed');

  const tabs: { id: Section; label: string; icon: string }[] = [
    { id: 'feed', label: 'Лента', icon: '📰' },
    { id: 'search', label: 'Поиск людей', icon: '🔍' },
    { id: 'planned', label: 'Найти компанию', icon: '📅' },
  ];

  return (
    <div style={{ maxWidth: 800, margin: '0 auto' }}>
      {/* Section tabs */}
      <div
        style={{
          display: 'flex',
          gap: 8,
          marginBottom: 20,
          background: '#fff',
          borderRadius: 12,
          padding: 6,
          boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
          border: '1px solid #e0e0e0',
        }}
      >
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setSection(tab.id)}
            style={{
              flex: 1,
              padding: isMobile ? '8px 6px' : '10px 8px',
              borderRadius: 8,
              border: 'none',
              cursor: 'pointer',
              fontSize: isMobile ? 12 : 14,
              fontWeight: 600,
              background: section === tab.id ? '#fc4c02' : 'transparent',
              color: section === tab.id ? '#fff' : '#888',
              transition: 'all 0.15s',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: isMobile ? 4 : 6,
            }}
          >
            <span>{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>

      {section === 'feed' && <FeedSection />}
      {section === 'search' && <SearchSection />}
      {section === 'planned' && <PlannedSection />}
    </div>
  );
}
