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

function Avatar({ url, username, size = 40 }: { url?: string; username: string; size?: number }) {
  if (url) {
    return (
      <img src={url} alt={username} style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
    );
  }
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%', background: '#fc4c02',
      color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: size * 0.4, fontWeight: 700, flexShrink: 0,
    }}>
      {(username ?? '?')[0].toUpperCase()}
    </div>
  );
}

function formatDateTime(dateStr: string, time: string): string {
  try {
    const d = new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'long' }).format(new Date(dateStr));
    return `${d}, ${time}`;
  } catch {
    return `${dateStr}, ${time}`;
  }
}

function getDaysUntil(dateStr: string): number {
  const now = new Date();
  const target = new Date(dateStr);
  return Math.ceil((target.getTime() - now.getTime()) / 86400000);
}

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '9px 12px', borderRadius: 8,
  border: '1px solid #e0e0e0', fontSize: 14, outline: 'none', boxSizing: 'border-box',
};

export default function CommunityPanel() {
  const { isAuthenticated, user: currentUser } = useAuth();
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  useEffect(() => {
    const h = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', h);
    return () => window.removeEventListener('resize', h);
  }, []);

  const [items, setItems] = useState<PlannedItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [cityFilter, setCityFilter] = useState('');
  const [sportFilter, setSportFilter] = useState('');

  // Form
  const [formSport, setFormSport] = useState<SportType>('RUNNING');
  const [formCity, setFormCity] = useState('');
  const [formDate, setFormDate] = useState('');
  const [formTime, setFormTime] = useState('07:00');
  const [formDesc, setFormDesc] = useState('');
  const [formMax, setFormMax] = useState(5);
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.social.listPlanned({
        city: cityFilter || undefined,
        sport: sportFilter || undefined,
      });
      setItems(data);
    } catch { /* ignore */ } finally {
      setLoading(false);
    }
  }, [cityFilter, sportFilter]);

  useEffect(() => { load(); }, [load]);

  const handleCreate = useCallback(async (e: FormEvent) => {
    e.preventDefault();
    if (!formCity || !formDate || !formTime) return;
    setSubmitting(true);
    try {
      await api.social.createPlanned({ sport: formSport, city: formCity, date: formDate, time: formTime, description: formDesc || undefined, maxPeople: formMax });
      setShowForm(false);
      setFormCity(''); setFormDate(''); setFormDesc(''); setFormTime('07:00'); setFormMax(5);
      load();
    } catch { /* ignore */ } finally { setSubmitting(false); }
  }, [formSport, formCity, formDate, formTime, formDesc, formMax, load]);

  const handleDelete = useCallback(async (id: string) => {
    try {
      await api.social.deletePlanned(id);
      setItems(prev => prev.filter(p => p.id !== id));
    } catch { /* ignore */ }
  }, []);

  return (
    <div style={{ maxWidth: 800, margin: '0 auto', padding: isMobile ? '0 0 24px' : '0 0 32px' }}>

      {/* Hero */}
      <div style={{
        background: 'linear-gradient(135deg, #fc4c02 0%, #ff7c3a 100%)',
        borderRadius: 20, padding: isMobile ? '24px 20px' : '32px 36px',
        marginBottom: 24, color: '#fff', position: 'relative', overflow: 'hidden',
      }}>
        <div style={{ position: 'absolute', right: -20, top: -20, width: 160, height: 160, borderRadius: '50%', background: 'rgba(255,255,255,0.08)' }} />
        <div style={{ position: 'absolute', right: 40, bottom: -40, width: 100, height: 100, borderRadius: '50%', background: 'rgba(255,255,255,0.06)' }} />
        <div style={{ fontSize: isMobile ? 26 : 32, fontWeight: 800, lineHeight: 1.1, marginBottom: 8 }}>
          Найди напарника
        </div>
        <div style={{ fontSize: 14, opacity: 0.85, marginBottom: 20, maxWidth: 400 }}>
          Публикуй свои планы на тренировку — другие спортсмены из твоего города смогут присоединиться
        </div>
        {isAuthenticated ? (
          <button
            onClick={() => setShowForm(v => !v)}
            style={{
              padding: '10px 22px', borderRadius: 10, border: '2px solid rgba(255,255,255,0.6)',
              background: showForm ? 'rgba(255,255,255,0.2)' : '#fff',
              color: showForm ? '#fff' : '#fc4c02', fontSize: 14, fontWeight: 700, cursor: 'pointer',
              transition: 'all 0.15s',
            }}
          >
            {showForm ? '✕ Отмена' : '+ Создать план'}
          </button>
        ) : (
          <div style={{ fontSize: 13, opacity: 0.8 }}>Войдите, чтобы создавать планы</div>
        )}
      </div>

      {/* Create form */}
      {showForm && (
        <div style={{
          background: '#fff', borderRadius: 16, padding: 20,
          border: '1px solid #e0e0e0', boxShadow: '0 2px 12px rgba(0,0,0,0.07)',
          marginBottom: 20,
        }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: '#242424', marginBottom: 16 }}>Новый план</div>
          <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {/* Sport pills */}
            <div>
              <div style={{ fontSize: 12, color: '#666', marginBottom: 8 }}>Вид спорта</div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {ALL_SPORTS.map(s => (
                  <button
                    key={s} type="button"
                    onClick={() => setFormSport(s)}
                    style={{
                      padding: '6px 14px', borderRadius: 20, fontSize: 13, fontWeight: 600, cursor: 'pointer',
                      border: `2px solid ${formSport === s ? SPORT_COLORS[s] : '#e0e0e0'}`,
                      background: formSport === s ? SPORT_COLORS[s] + '15' : '#fff',
                      color: formSport === s ? SPORT_COLORS[s] : '#888',
                    }}
                  >
                    {SPORT_ICONS[s]} {SPORT_LABELS[s]}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 10 }}>
              <div>
                <label style={{ fontSize: 12, color: '#666', display: 'block', marginBottom: 4 }}>Город *</label>
                <input required value={formCity} onChange={e => setFormCity(e.target.value)} placeholder="Барнаул" style={inputStyle} />
              </div>
              <div>
                <label style={{ fontSize: 12, color: '#666', display: 'block', marginBottom: 4 }}>Макс. участников</label>
                <input type="number" min={2} max={50} value={formMax} onChange={e => setFormMax(Number(e.target.value))} style={inputStyle} />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div>
                <label style={{ fontSize: 12, color: '#666', display: 'block', marginBottom: 4 }}>Дата *</label>
                <input required type="date" value={formDate} onChange={e => setFormDate(e.target.value)} style={inputStyle} />
              </div>
              <div>
                <label style={{ fontSize: 12, color: '#666', display: 'block', marginBottom: 4 }}>Время *</label>
                <input required type="time" value={formTime} onChange={e => setFormTime(e.target.value)} style={inputStyle} />
              </div>
            </div>

            <div>
              <label style={{ fontSize: 12, color: '#666', display: 'block', marginBottom: 4 }}>Описание (необязательно)</label>
              <textarea value={formDesc} onChange={e => setFormDesc(e.target.value)} rows={2} placeholder="Пробежка по набережной, темп 5:30..." style={{ ...inputStyle, resize: 'vertical', fontFamily: 'inherit' }} />
            </div>

            <button type="submit" disabled={submitting} style={{
              padding: '10px 24px', borderRadius: 8, border: 'none', background: '#fc4c02',
              color: '#fff', fontSize: 14, fontWeight: 700, cursor: submitting ? 'not-allowed' : 'pointer',
              opacity: submitting ? 0.7 : 1, alignSelf: 'flex-start',
            }}>
              {submitting ? 'Публикация...' : 'Опубликовать'}
            </button>
          </form>
        </div>
      )}

      {/* Filters */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 130 }}>
          <svg style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', width: 14, height: 14, color: '#aaa', pointerEvents: 'none' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          <input
            placeholder="Город"
            value={cityFilter}
            onChange={e => setCityFilter(e.target.value)}
            style={{ ...inputStyle, paddingLeft: 30, width: '100%' }}
          />
        </div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          <button
            onClick={() => setSportFilter('')}
            style={{
              padding: '7px 14px', borderRadius: 20, fontSize: 13, fontWeight: 600, cursor: 'pointer',
              border: `2px solid ${!sportFilter ? '#fc4c02' : '#e0e0e0'}`,
              background: !sportFilter ? '#fff4ef' : '#fff',
              color: !sportFilter ? '#fc4c02' : '#888',
            }}
          >Все</button>
          {ALL_SPORTS.map(s => (
            <button
              key={s}
              onClick={() => setSportFilter(sportFilter === s ? '' : s)}
              style={{
                padding: '7px 14px', borderRadius: 20, fontSize: 13, fontWeight: 600, cursor: 'pointer',
                border: `2px solid ${sportFilter === s ? SPORT_COLORS[s] : '#e0e0e0'}`,
                background: sportFilter === s ? SPORT_COLORS[s] + '15' : '#fff',
                color: sportFilter === s ? SPORT_COLORS[s] : '#888',
              }}
            >
              {SPORT_ICONS[s]}
            </button>
          ))}
        </div>
      </div>

      {/* List */}
      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {[1, 2, 3].map(i => (
            <div key={i} style={{ height: 120, borderRadius: 16, background: '#f0f0f0', animation: 'pulse 1.5s infinite' }} />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div style={{
          background: '#fff', borderRadius: 16, padding: '48px 24px', textAlign: 'center',
          border: '1px solid #e0e0e0',
        }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>🏃</div>
          <div style={{ fontSize: 16, fontWeight: 700, color: '#242424', marginBottom: 6 }}>Пока никого нет</div>
          <div style={{ fontSize: 14, color: '#999' }}>
            Будь первым — создай план тренировки и найди напарника!
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {items.map(item => {
            const isMine = currentUser?.id === item.userId;
            const days = getDaysUntil(item.date);
            const color = SPORT_COLORS[item.sport] ?? '#fc4c02';

            return (
              <div
                key={item.id}
                style={{
                  background: '#fff', borderRadius: 16,
                  border: '1px solid #e0e0e0',
                  boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
                  overflow: 'hidden', display: 'flex',
                  transition: 'box-shadow 0.15s',
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.boxShadow = '0 4px 16px rgba(0,0,0,0.1)'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.boxShadow = '0 1px 4px rgba(0,0,0,0.05)'; }}
              >
                {/* Sport stripe */}
                <div style={{ width: 5, background: color, flexShrink: 0 }} />

                <div style={{ flex: 1, padding: isMobile ? '14px 14px' : '16px 20px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      {/* Sport icon */}
                      <div style={{
                        width: 44, height: 44, borderRadius: 12, flexShrink: 0,
                        background: color + '15',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22,
                      }}>
                        {SPORT_ICONS[item.sport]}
                      </div>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ fontSize: 15, fontWeight: 700, color }}>
                            {SPORT_LABELS[item.sport]}
                          </span>
                          <span style={{ fontSize: 12, color: '#888' }}>· {item.city}</span>
                        </div>
                        <div style={{ fontSize: 13, color: '#555', marginTop: 2, fontWeight: 600 }}>
                          {formatDateTime(item.date, item.time)}
                        </div>
                      </div>
                    </div>

                    {/* Days badge */}
                    <div style={{
                      flexShrink: 0, padding: '4px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700,
                      background: days <= 1 ? '#fff4ef' : days <= 3 ? '#fef3c7' : '#f0f7ff',
                      color: days <= 1 ? '#fc4c02' : days <= 3 ? '#d97706' : '#0061ff',
                    }}>
                      {days <= 0 ? 'Сегодня' : days === 1 ? 'Завтра' : `через ${days} дн.`}
                    </div>
                  </div>

                  {item.description && (
                    <div style={{ fontSize: 13, color: '#666', lineHeight: 1.5 }}>{item.description}</div>
                  )}

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                    {/* Author */}
                    <div
                      style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}
                      onClick={() => window.dispatchEvent(new CustomEvent('open-profile', { detail: { userId: item.user.id } }))}
                    >
                      <Avatar url={item.user.avatarUrl} username={item.user.username} size={26} />
                      <div>
                        <span style={{ fontSize: 12, fontWeight: 600, color: '#242424' }}>{item.user.username}</span>
                        <span style={{ fontSize: 11, color: '#aaa', marginLeft: 6 }}>Ур. {item.user.level}</span>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 12, color: '#aaa' }}>до {item.maxPeople} чел.</span>

                      {isMine ? (
                        <button
                          onClick={() => handleDelete(item.id)}
                          style={{
                            padding: '5px 12px', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer',
                            border: '1px solid #fecaca', background: '#fff5f5', color: '#d93025',
                          }}
                        >
                          Удалить
                        </button>
                      ) : isAuthenticated ? (
                        <button
                          onClick={() => window.dispatchEvent(new CustomEvent('open-messages-with', { detail: { userId: item.user.id, username: item.user.username, avatarUrl: item.user.avatarUrl, level: item.user.level } }))}
                          style={{
                            padding: '5px 14px', borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: 'pointer',
                            border: `1px solid ${color}`, background: color + '12', color,
                            transition: 'all 0.15s',
                          }}
                          onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = color; (e.currentTarget as HTMLButtonElement).style.color = '#fff'; }}
                          onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = color + '12'; (e.currentTarget as HTMLButtonElement).style.color = color; }}
                        >
                          Написать
                        </button>
                      ) : null}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
