import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Event, SportType, EventType, EventStatus } from '@/types';
import { api } from '@/services/api';
import { useAuth } from '@/context/AuthContext';
import { MedalShopModal } from './MedalShopModal';

const SPORT: Record<SportType, { icon: string; label: string; color: string; bg: string; gradient: string }> = {
  RUNNING: { icon: '🏃', label: 'Бег', color: '#fc4c02', bg: '#fff4ef', gradient: 'linear-gradient(135deg, #fc4c02, #ff8a50)' },
  CYCLING: { icon: '🚴', label: 'Вело', color: '#0061ff', bg: '#eef4ff', gradient: 'linear-gradient(135deg, #0061ff, #4d9aff)' },
  SKIING:  { icon: '⛷️', label: 'Лыжи', color: '#0891b2', bg: '#edfbfe', gradient: 'linear-gradient(135deg, #0891b2, #22d3ee)' },
  WALKING: { icon: '🚶', label: 'Ходьба', color: '#7c3aed', bg: '#f5f0ff', gradient: 'linear-gradient(135deg, #7c3aed, #a78bfa)' },
};

const TYPE_LABEL: Record<EventType, string> = {
  RACE: 'Забег', CHALLENGE: 'Челлендж', ULTRAMARATHON: 'Ультрамарафон', WEEKLY: 'Неделя', BATTLE: 'Батл',
};

const STATUS: Record<string, { label: string; color: string }> = {
  REGISTRATION: { label: 'Регистрация', color: '#1a7f37' },
  ACTIVE: { label: 'Активно', color: '#fc4c02' },
  FINISHED: { label: 'Завершено', color: '#999' },
};

const SPORTS: (SportType | null)[] = [null, 'RUNNING', 'CYCLING', 'SKIING', 'WALKING'];
const TYPES: (EventType | null)[] = [null, 'RACE', 'CHALLENGE', 'ULTRAMARATHON', 'WEEKLY'];
const STATUSES: (EventStatus | null)[] = [null, 'REGISTRATION', 'ACTIVE', 'FINISHED'];

const df = new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'short' });

function Pill({ active, children, onClick }: { active: boolean; children: React.ReactNode; onClick: () => void }) {
  return (
    <button onClick={onClick} style={{
      padding: '6px 14px', borderRadius: 20, fontSize: 13, fontWeight: 600, cursor: 'pointer',
      border: active ? '2px solid #242424' : '1.5px solid #ddd',
      background: active ? '#242424' : '#fff',
      color: active ? '#fff' : '#666',
      transition: 'all 0.15s',
    }}>
      {children}
    </button>
  );
}

function StatBox({ value, label, color }: { value: string | number; label: string; color?: string }) {
  return (
    <div style={{ textAlign: 'center', minWidth: 60 }}>
      <div style={{ fontSize: 22, fontWeight: 900, color: color || '#242424', lineHeight: 1.1 }}>{value}</div>
      <div style={{ fontSize: 11, color: '#999', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 2 }}>{label}</div>
    </div>
  );
}

type Participant = {
  rank: number;
  user: { id: string; username: string; avatarUrl?: string; firstName?: string; lastName?: string; city?: string; level: number };
  totalDistance: number;
  totalTime: number;
  isFinished: boolean;
};

function formatDur(sec: number) {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  if (h > 0) return `${h}ч ${m}м`;
  return `${m}м`;
}

function EventParticipantsModal({ event, currentUserId, onClose }: {
  event: Event;
  currentUserId?: string;
  onClose: () => void;
}) {
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [loading, setLoading] = useState(true);
  const [cityFilter, setCityFilter] = useState('');
  const [followState, setFollowState] = useState<Record<string, { isFollowing: boolean; isFriend: boolean }>>({});
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    setLoading(true);
    api.events.leaderboard(event.id, { page, limit: 20 })
      .then(res => {
        setParticipants(res.leaderboard);
        setTotalPages(res.pagination.totalPages);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [event.id, page]);

  const cities = Array.from(new Set(participants.map(p => p.user.city).filter(Boolean))) as string[];

  const filtered = cityFilter
    ? participants.filter(p => p.user.city === cityFilter)
    : participants;

  const handleFollow = async (userId: string) => {
    try {
      const res = await api.social.follow(userId);
      setFollowState(prev => ({
        ...prev,
        [userId]: { isFollowing: res.isFollowing, isFriend: res.isFriend ?? false },
      }));
    } catch {}
  };

  const openChat = (userId: string) => {
    window.dispatchEvent(new CustomEvent('open-messages', { detail: { userId } }));
  };

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
        zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: '#fff', borderRadius: 20, width: '100%', maxWidth: 560,
          maxHeight: '88vh', display: 'flex', flexDirection: 'column',
          boxShadow: '0 8px 40px rgba(0,0,0,0.2)', overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div style={{ padding: '20px 24px 16px', borderBottom: '1px solid #f0f0f0' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <div>
              <div style={{ fontSize: 18, fontWeight: 800, color: '#242424' }}>Участники</div>
              <div style={{ fontSize: 13, color: '#999', marginTop: 2 }}>{event.title}</div>
            </div>
            <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: '#aaa', padding: '4px 8px' }}>✕</button>
          </div>
          {/* City filter */}
          {cities.length > 0 && (
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              <button
                onClick={() => setCityFilter('')}
                style={{
                  padding: '4px 12px', borderRadius: 14, fontSize: 12, fontWeight: 600, cursor: 'pointer',
                  border: cityFilter === '' ? '2px solid #fc4c02' : '1px solid #e0e0e0',
                  background: cityFilter === '' ? '#fff4ef' : '#f5f5f5',
                  color: cityFilter === '' ? '#fc4c02' : '#666',
                }}
              >
                Все города
              </button>
              {cities.map(c => (
                <button
                  key={c}
                  onClick={() => setCityFilter(c === cityFilter ? '' : c)}
                  style={{
                    padding: '4px 12px', borderRadius: 14, fontSize: 12, fontWeight: 600, cursor: 'pointer',
                    border: cityFilter === c ? '2px solid #fc4c02' : '1px solid #e0e0e0',
                    background: cityFilter === c ? '#fff4ef' : '#f5f5f5',
                    color: cityFilter === c ? '#fc4c02' : '#666',
                  }}
                >
                  📍 {c}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* List */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '8px 0' }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: 40, color: '#999' }}>Загрузка...</div>
          ) : filtered.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 40, color: '#999' }}>Нет участников</div>
          ) : filtered.map(p => {
            const isMe = p.user.id === currentUserId;
            const isFollowed = following[p.user.id];
            return (
              <div key={p.user.id} style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '10px 24px',
                borderBottom: '1px solid #f8f8f8',
                background: isMe ? '#fff8f5' : '#fff',
              }}>
                {/* Rank */}
                <div style={{
                  width: 28, textAlign: 'center', fontSize: 13, fontWeight: 700,
                  color: p.rank === 1 ? '#f59e0b' : p.rank === 2 ? '#94a3b8' : p.rank === 3 ? '#b45309' : '#bbb',
                  flexShrink: 0,
                }}>
                  {p.rank <= 3 ? ['🥇','🥈','🥉'][p.rank - 1] : `#${p.rank}`}
                </div>
                {/* Avatar */}
                <div style={{
                  width: 40, height: 40, borderRadius: '50%', flexShrink: 0,
                  background: p.user.avatarUrl ? 'none' : 'linear-gradient(135deg, #fc4c02, #ff6b2b)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 16, color: '#fff', fontWeight: 700, overflow: 'hidden',
                }}>
                  {p.user.avatarUrl
                    ? <img src={p.user.avatarUrl} alt="" style={{ width: 40, height: 40, objectFit: 'cover', borderRadius: '50%' }} />
                    : (p.user.username[0] ?? '?').toUpperCase()}
                </div>
                {/* Info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: '#242424', display: 'flex', alignItems: 'center', gap: 6 }}>
                    {p.user.username}
                    {isMe && <span style={{ fontSize: 11, color: '#fc4c02', fontWeight: 600 }}>Вы</span>}
                    {p.isFinished && <span style={{ fontSize: 11, color: '#1a7f37', fontWeight: 600 }}>✓</span>}
                  </div>
                  <div style={{ fontSize: 12, color: '#999', marginTop: 2, display: 'flex', gap: 8 }}>
                    {p.user.city && <span>📍 {p.user.city}</span>}
                    <span>Ур. {p.user.level}</span>
                  </div>
                </div>
                {/* Stats */}
                <div style={{ textAlign: 'right', flexShrink: 0, marginRight: 8 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: '#fc4c02' }}>{p.totalDistance.toFixed(1)} км</div>
                  {p.totalTime > 0 && <div style={{ fontSize: 11, color: '#999' }}>{formatDur(p.totalTime)}</div>}
                </div>
                {/* Buttons */}
                {!isMe && currentUserId && (() => {
                  const fs = followState[p.user.id];
                  const isFollowing = fs?.isFollowing ?? false;
                  const isFriend = fs?.isFriend ?? false;
                  return (
                    <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                      {isFriend && (
                        <button
                          onClick={() => openChat(p.user.id)}
                          style={{
                            padding: '5px 10px', borderRadius: 16, fontSize: 12, fontWeight: 700,
                            cursor: 'pointer', border: '1.5px solid #0061ff',
                            background: '#eef4ff', color: '#0061ff',
                          }}
                        >
                          💬
                        </button>
                      )}
                      <button
                        onClick={() => handleFollow(p.user.id)}
                        style={{
                          padding: '5px 12px', borderRadius: 16, fontSize: 12, fontWeight: 700,
                          cursor: 'pointer',
                          border: isFriend ? '1.5px solid #1a7f37' : isFollowing ? '1.5px solid #e0e0e0' : '1.5px solid #fc4c02',
                          background: isFriend ? '#f0fdf4' : isFollowing ? '#f5f5f5' : '#fc4c02',
                          color: isFriend ? '#1a7f37' : isFollowing ? '#999' : '#fff',
                          transition: 'all 0.15s',
                        }}
                      >
                        {isFriend ? '🤝 Друзья' : isFollowing ? 'Подписан' : '+ Подписаться'}
                      </button>
                    </div>
                  );
                })()}
              </div>
            );
          })}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div style={{ padding: '12px 24px', borderTop: '1px solid #f0f0f0', display: 'flex', gap: 8, justifyContent: 'center' }}>
            <button disabled={page <= 1} onClick={() => setPage(p => p - 1)}
              style={{ padding: '6px 16px', borderRadius: 8, border: '1px solid #e0e0e0', background: '#fff', cursor: page <= 1 ? 'not-allowed' : 'pointer', opacity: page <= 1 ? 0.4 : 1, fontSize: 13 }}>
              ←
            </button>
            <span style={{ padding: '6px 12px', fontSize: 13, color: '#666' }}>{page} / {totalPages}</span>
            <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}
              style={{ padding: '6px 16px', borderRadius: 8, border: '1px solid #e0e0e0', background: '#fff', cursor: page >= totalPages ? 'not-allowed' : 'pointer', opacity: page >= totalPages ? 0.4 : 1, fontSize: 13 }}>
              →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function EventCard({ event, onJoin, onLeave, joining, onShowParticipants }: {
  event: Event; onJoin: (id: string) => void; onLeave: (id: string) => void; joining: string | null; onShowParticipants: (event: Event) => void;
}) {
  const s = SPORT[event.sport];
  const st = STATUS[event.status] ?? STATUS.FINISHED;
  const busy = joining === event.id;
  const dist = event.targetDistance ?? event.maxDistance;
  const pCount = (event as any).participantCount ?? 0;

  return (
    <motion.div layout initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
      style={{
        background: '#fff', borderRadius: 16, overflow: 'hidden',
        boxShadow: '0 1px 4px rgba(0,0,0,0.06), 0 0 0 1px rgba(0,0,0,0.04)',
        transition: 'transform 0.2s, box-shadow 0.2s', cursor: 'default',
      }}
      whileHover={{ y: -3, boxShadow: '0 8px 30px rgba(0,0,0,0.1), 0 0 0 1px rgba(0,0,0,0.04)' }}
    >
      {/* Header image / gradient */}
      <div style={{
        height: 140,
        position: 'relative',
        background: event.imageUrl ? undefined : s.gradient,
        overflow: 'hidden',
      }}>
        {event.imageUrl ? (
          <img
            src={event.imageUrl}
            alt={event.title}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              display: 'block',
            }}
          />
        ) : (
          <div style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 56,
            opacity: 0.3,
          }}>
            {s.icon}
          </div>
        )}
        {/* Sport icon overlay top-left */}
        <div style={{
          position: 'absolute',
          top: 10,
          left: 10,
          width: 36,
          height: 36,
          borderRadius: 10,
          background: 'rgba(0,0,0,0.35)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 18,
        }}>
          {s.icon}
        </div>
        {/* Event type badge top-right */}
        <span style={{
          position: 'absolute',
          top: 10,
          right: 10,
          fontSize: 11,
          fontWeight: 700,
          padding: '4px 12px',
          borderRadius: 12,
          background: 'rgba(0,0,0,0.35)',
          backdropFilter: 'blur(4px)',
          color: '#fff',
        }}>
          {TYPE_LABEL[event.type]}
        </span>
      </div>

      <div style={{ padding: '20px 24px 20px' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, marginBottom: 16 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h3 style={{ fontSize: 16, fontWeight: 800, color: '#242424', lineHeight: 1.3, marginBottom: 6 }}>
              {event.title}
            </h3>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <span style={{
                fontSize: 11, fontWeight: 700, padding: '2px 10px', borderRadius: 12,
                background: s.bg, color: s.color,
              }}>
                {SPORT[event.sport].label}
              </span>
              <span style={{ fontSize: 11, fontWeight: 700, color: st.color, display: 'flex', alignItems: 'center', gap: 4 }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: st.color }} />
                {st.label}
              </span>
            </div>
          </div>
          {event.medalIcon && <span style={{ fontSize: 28, flexShrink: 0, filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.1))' }}>{event.medalIcon}</span>}
        </div>

        {/* Description */}
        {event.description && (
          <p style={{ fontSize: 13, color: '#777', lineHeight: 1.6, marginBottom: 20, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
            {event.description}
          </p>
        )}

        {/* Stats */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 24, padding: '16px 0', borderTop: '1px solid #f0f0f0', borderBottom: '1px solid #f0f0f0', marginBottom: 16 }}>
          {dist != null && dist > 0 && <StatBox value={dist} label="км" />}
          <button
            onClick={() => onShowParticipants(event)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, textAlign: 'center' }}
            title="Посмотреть участников"
          >
            <StatBox value={pCount} label="участников" color="#0061ff" />
          </button>
          <StatBox value={event.xpReward} label="XP" color="#fc4c02" />
        </div>

        {/* Date */}
        <div style={{ fontSize: 12, color: '#aaa', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 6 }}>
          📅 {df.format(new Date(event.startDate))} — {df.format(new Date(event.endDate))}
        </div>

        {/* Action */}
        {event.isJoined ? (
          <div>
            {new Date(event.startDate) > new Date() ? (
              /* Event hasn't started yet */
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: '#0061ff', display: 'flex', alignItems: 'center', gap: 6 }}>
                    ⏳ Начнётся {df.format(new Date(event.startDate))}
                  </span>
                  <button onClick={() => onLeave(event.id)} disabled={busy}
                    style={{ fontSize: 12, color: '#aaa', background: 'none', border: 'none', cursor: 'pointer' }}>
                    Покинуть
                  </button>
                </div>
                <div style={{ padding: '8px 12px', borderRadius: 8, background: '#eef4ff', color: '#0061ff', fontSize: 12, fontWeight: 500, textAlign: 'center' }}>
                  Вы зарегистрированы. Результаты засчитываются после старта.
                </div>
              </div>
            ) : (
              /* Event is active */
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                  <span style={{ fontSize: 14, fontWeight: 700, color: '#1a7f37', display: 'flex', alignItems: 'center', gap: 6 }}>
                    ✓ Вы участвуете
                  </span>
                  {event.status !== 'FINISHED' && (
                    <button onClick={() => onLeave(event.id)} disabled={busy}
                      style={{ fontSize: 12, color: '#aaa', background: 'none', border: 'none', cursor: 'pointer' }}>
                      Покинуть
                    </button>
                  )}
                </div>
              </div>
            )}
            {(() => {
              const target = event.targetDistance ?? event.maxDistance ?? 0;
              const myDist = (event as any).myDistance ?? 0;
              const completed = target > 0 ? myDist >= target : myDist > 0;
              if (completed) return (
                <button
                  onClick={() => api.events.downloadDiploma(event.id)}
                  style={{
                    width: '100%', padding: '10px 0', borderRadius: 10,
                    border: '2px solid #1a7f37', background: '#f0fdf4',
                    color: '#1a7f37', fontSize: 13, fontWeight: 700,
                    cursor: 'pointer', transition: 'all 0.15s',
                  }}
                >
                  🏆 Скачать диплом
                </button>
              );
              if (target > 0) return (
                <div style={{ marginTop: 4 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#999', marginBottom: 3 }}>
                    <span>{myDist.toFixed(1)} км</span>
                    <span>{target} км</span>
                  </div>
                  <div style={{ height: 4, borderRadius: 2, background: '#eee', overflow: 'hidden' }}>
                    <div style={{ height: '100%', borderRadius: 2, background: '#fc4c02', width: `${Math.min(100, (myDist / target) * 100)}%` }} />
                  </div>
                </div>
              );
              return null;
            })()}
          </div>
        ) : (event.status === 'REGISTRATION' || event.status === 'ACTIVE') ? (
          <button onClick={() => onJoin(event.id)} disabled={busy}
            style={{
              width: '100%', padding: '12px 0', borderRadius: 10, border: 'none',
              background: '#fc4c02', color: '#fff', fontSize: 14, fontWeight: 800,
              cursor: busy ? 'wait' : 'pointer', opacity: busy ? 0.6 : 1,
              transition: 'all 0.15s', boxShadow: '0 2px 8px rgba(252,76,2,0.3)',
            }}>
            {busy ? 'Загрузка...' : 'Участвовать'}
          </button>
        ) : null}
      </div>
    </motion.div>
  );
}

export default function EventsPanel() {
  const { isAuthenticated, user } = useAuth();
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState<string | null>(null);
  const [sport, setSport] = useState<SportType | null>(null);
  const [type, setType] = useState<EventType | null>(null);
  const [status, setStatus] = useState<EventStatus | null>(null);
  const [medalShopEvent, setMedalShopEvent] = useState<Event | null>(null);
  const [participantsEvent, setParticipantsEvent] = useState<Event | null>(null);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [isTablet, setIsTablet] = useState(window.innerWidth >= 768 && window.innerWidth < 1024);
  const [heroSettings, setHeroSettings] = useState<Record<string, string>>({});
  useEffect(() => {
    const h = () => {
      setIsMobile(window.innerWidth < 768);
      setIsTablet(window.innerWidth >= 768 && window.innerWidth < 1024);
    };
    window.addEventListener('resize', h);
    return () => window.removeEventListener('resize', h);
  }, []);

  useEffect(() => {
    api.settings.getPublic().then(setHeroSettings).catch(() => {});
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const p: Record<string, string | undefined> = {};
      if (sport) p.sport = sport;
      if (type) p.type = type;
      if (status) p.status = status;
      const res = await api.events.list(p as any);
      setEvents(res.items);
    } catch { setEvents([]); }
    finally { setLoading(false); }
  }, [sport, type, status]);

  useEffect(() => { load(); }, [load]);

  const openMedalShop = (id: string) => {
    if (!isAuthenticated) return;
    const ev = events.find(e => e.id === id);
    if (ev) setMedalShopEvent(ev);
  };

  const handleJoinComplete = (id: string) => {
    setEvents(p => p.map(e => e.id === id ? { ...e, isJoined: true, participantCount: ((e as any).participantCount ?? 0) + 1 } as any : e));
  };

  const leave = async (id: string) => {
    setJoining(id);
    try {
      await api.events.leave(id);
      setEvents(p => p.map(e => e.id === id ? { ...e, isJoined: false, participantCount: Math.max(0, ((e as any).participantCount ?? 1) - 1) } as any : e));
    } catch {} finally { setJoining(null); }
  };

  return (
    <div>
      {/* Hero */}
      <div style={{
        background: (heroSettings['hero_bg_url'] ?? '')
          ? `url(${heroSettings['hero_bg_url']}) center/cover no-repeat`
          : `linear-gradient(135deg, ${heroSettings['hero_bg_color'] ?? '#fc4c02'} 0%, ${heroSettings['hero_bg_color'] ?? '#fc4c02'}cc 100%)`,
        borderRadius: isMobile ? 14 : 20, padding: isMobile ? '28px 20px' : '48px 40px', marginBottom: isMobile ? 20 : 32, color: '#fff',
        boxShadow: '0 4px 20px rgba(252,76,2,0.25)',
        position: 'relative' as const,
      }}>
        {(heroSettings['hero_bg_url'] ?? '') && (
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.35)', borderRadius: isMobile ? 14 : 20 }} />
        )}
        <div style={{ position: 'relative', zIndex: 1 }}>
        <h1 style={{ fontSize: isMobile ? 24 : 36, fontWeight: 900, marginBottom: 8, lineHeight: 1.2 }}>
          {heroSettings['hero_title'] ?? 'Виртуальные события'}
        </h1>
        <p style={{ fontSize: isMobile ? 14 : 16, opacity: 0.9, maxWidth: 500, lineHeight: 1.6, marginBottom: isMobile ? 14 : 20 }}>
          {heroSettings['hero_subtitle'] ?? 'Забеги, челленджи и соревнования — участвуй из любой точки мира. Зарабатывай XP, получай медали, соревнуйся.'}
        </p>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
          <span style={{
            background: 'rgba(255,255,255,0.2)', borderRadius: 20, padding: '6px 16px',
            fontSize: 14, fontWeight: 700, backdropFilter: 'blur(8px)',
          }}>
            🏆 {events.length} событий
          </span>
          <span style={{ fontSize: 14, opacity: 0.8 }}>Бег · Вело · Лыжи · Ходьба</span>
        </div>
        </div>
      </div>

      {/* Мои события */}
      {isAuthenticated && (() => {
        const myEvents = events.filter((e) => e.isJoined);
        return (
          <div style={{
            background: '#fff', borderRadius: 16, padding: '20px 24px', marginBottom: 28,
            boxShadow: '0 1px 4px rgba(0,0,0,0.06), 0 0 0 1px rgba(0,0,0,0.04)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
              <span style={{ fontSize: 20 }}>🏅</span>
              <h2 style={{ fontSize: 18, fontWeight: 800, color: '#242424', margin: 0 }}>Мои события</h2>
            </div>
            {myEvents.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '24px 0', color: '#999', fontSize: 14 }}>
                Вы пока не участвуете ни в одном событии
              </div>
            ) : (
              <div style={{ display: isMobile ? 'flex' : 'grid', gridTemplateColumns: isMobile ? undefined : 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16, overflowX: isMobile ? 'auto' : undefined, flexWrap: isMobile ? 'nowrap' : undefined, paddingBottom: isMobile ? 8 : undefined }}>
                {myEvents.map((ev) => {
                  const s = SPORT[ev.sport];
                  const st = STATUS[ev.status] ?? STATUS.FINISHED;
                  const target = ev.targetDistance ?? ev.maxDistance ?? 0;
                  const myParticipation = (ev as any).myDistance ?? 0;
                  const progress = target > 0 ? Math.min(100, (myParticipation / target) * 100) : 0;

                  return (
                    <div key={ev.id} style={{
                      background: '#fafafa', borderRadius: 14, padding: 16,
                      border: '1px solid #e0e0e0', position: 'relative', overflow: 'hidden',
                      minWidth: isMobile ? 260 : undefined, flexShrink: isMobile ? 0 : undefined,
                    }}>
                      <div style={{ height: 3, background: s.color, position: 'absolute', top: 0, left: 0, right: 0 }} />
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                        <span style={{ fontSize: 24 }}>{s.icon}</span>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{
                            fontSize: 14, fontWeight: 700, color: '#242424',
                            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                          }}>
                            {ev.title}
                          </div>
                          <div style={{ fontSize: 11, color: st.color, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4, marginTop: 2 }}>
                            <span style={{ width: 5, height: 5, borderRadius: '50%', background: st.color }} />
                            {st.label}
                          </div>
                        </div>
                        {ev.medalIcon && <span style={{ fontSize: 22 }}>{ev.medalIcon}</span>}
                      </div>
                      {target > 0 && (
                        <div style={{ marginBottom: 6 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#666', marginBottom: 4 }}>
                            <span>{myParticipation.toFixed(1)} км</span>
                            <span>{target} км</span>
                          </div>
                          <div style={{ height: 6, borderRadius: 3, background: '#eee', overflow: 'hidden' }}>
                            <div style={{
                              height: '100%', borderRadius: 3,
                              background: `linear-gradient(90deg, ${s.color}, ${s.color}dd)`,
                              width: `${progress}%`,
                              transition: 'width 0.4s',
                            }} />
                          </div>
                        </div>
                      )}
                      <div style={{ fontSize: 11, color: '#aaa', marginTop: 8 }}>
                        {df.format(new Date(ev.startDate))} — {df.format(new Date(ev.endDate))}
                      </div>
                      {(() => {
                        const t = ev.targetDistance ?? ev.maxDistance ?? 0;
                        const dist = (ev as any).myDistance ?? 0;
                        const canDiploma =
                          ev.type === 'WEEKLY' || t === 0
                            ? dist > 0
                            : dist >= t;
                        return canDiploma ? (
                          <button
                            onClick={() => api.events.downloadDiploma(ev.id)}
                            style={{
                              marginTop: 10, width: '100%', padding: '8px 0',
                              borderRadius: 8, border: '1.5px solid #fc4c02',
                              background: 'transparent', color: '#fc4c02',
                              fontSize: 12, fontWeight: 700, cursor: 'pointer',
                              transition: 'all 0.15s',
                            }}
                          >
                            Скачать диплом
                          </button>
                        ) : null;
                      })()}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })()}

      {/* Filters */}
      <div style={{
        background: '#fff', borderRadius: 14, padding: isMobile ? '14px 16px' : '20px 24px', marginBottom: isMobile ? 20 : 28,
        boxShadow: '0 1px 4px rgba(0,0,0,0.06), 0 0 0 1px rgba(0,0,0,0.04)',
        overflowX: isMobile ? 'auto' : undefined,
      }}>
        <div style={{ display: 'flex', flexWrap: isMobile ? 'nowrap' : 'wrap', alignItems: 'center', gap: isMobile ? 12 : 20, whiteSpace: isMobile ? 'nowrap' : undefined }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 11, fontWeight: 800, color: '#aaa', textTransform: 'uppercase', letterSpacing: 1 }}>Спорт</span>
            <div style={{ display: 'flex', gap: 6 }}>
              {SPORTS.map(sp => (
                <Pill key={sp ?? 'all'} active={sport === sp} onClick={() => setSport(sp)}>
                  {sp ? `${SPORT[sp].icon} ${SPORT[sp].label}` : 'Все'}
                </Pill>
              ))}
            </div>
          </div>

          <div style={{ width: 1, height: 24, background: '#eee' }} />

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 11, fontWeight: 800, color: '#aaa', textTransform: 'uppercase', letterSpacing: 1 }}>Тип</span>
            <div style={{ display: 'flex', gap: 6 }}>
              {TYPES.map(t => (
                <Pill key={t ?? 'all'} active={type === t} onClick={() => setType(t)}>
                  {t ? TYPE_LABEL[t] : 'Все'}
                </Pill>
              ))}
            </div>
          </div>

          <div style={{ width: 1, height: 24, background: '#eee' }} />

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 11, fontWeight: 800, color: '#aaa', textTransform: 'uppercase', letterSpacing: 1 }}>Статус</span>
            <div style={{ display: 'flex', gap: 6 }}>
              {STATUSES.map(st => (
                <Pill key={st ?? 'all'} active={status === st} onClick={() => setStatus(st)}>
                  {st ? STATUS[st].label : 'Все'}
                </Pill>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Grid */}
      {loading ? (
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : isTablet ? 'repeat(2, 1fr)' : 'repeat(auto-fill, minmax(320px, 1fr))', gap: isMobile ? 16 : 24 }}>
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} style={{ background: '#fff', borderRadius: 16, padding: 24, boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
              <div style={{ display: 'flex', gap: 14, marginBottom: 16 }}>
                <div className="shimmer" style={{ width: 48, height: 48, borderRadius: 14 }} />
                <div style={{ flex: 1 }}>
                  <div className="shimmer" style={{ height: 16, width: '80%', marginBottom: 8 }} />
                  <div className="shimmer" style={{ height: 12, width: '50%' }} />
                </div>
              </div>
              <div className="shimmer" style={{ height: 12, marginBottom: 8 }} />
              <div className="shimmer" style={{ height: 12, width: '70%', marginBottom: 16 }} />
              <div style={{ display: 'flex', gap: 24, padding: '16px 0', borderTop: '1px solid #f0f0f0', marginBottom: 16 }}>
                <div className="shimmer" style={{ height: 36, width: 56 }} />
                <div className="shimmer" style={{ height: 36, width: 56 }} />
                <div className="shimmer" style={{ height: 36, width: 56 }} />
              </div>
              <div className="shimmer" style={{ height: 44, borderRadius: 10 }} />
            </div>
          ))}
        </div>
      ) : events.length === 0 ? (
        <div style={{ background: '#fff', borderRadius: 16, textAlign: 'center', padding: '80px 24px', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>🏁</div>
          <h3 style={{ fontSize: 18, fontWeight: 800, color: '#242424', marginBottom: 6 }}>Ничего не найдено</h3>
          <p style={{ fontSize: 14, color: '#999' }}>Попробуйте изменить фильтры</p>
        </div>
      ) : (
        <AnimatePresence mode="popLayout">
          <motion.div
            style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : isTablet ? 'repeat(2, 1fr)' : 'repeat(auto-fill, minmax(320px, 1fr))', gap: isMobile ? 16 : 24 }}
            initial="hidden" animate="visible" variants={{ visible: { transition: { staggerChildren: 0.04 } } }}>
            {events.map(e => <EventCard key={e.id} event={e} onJoin={openMedalShop} onLeave={leave} joining={joining} onShowParticipants={setParticipantsEvent} />)}
          </motion.div>
        </AnimatePresence>
      )}

      {participantsEvent && (
        <EventParticipantsModal
          event={participantsEvent}
          currentUserId={isAuthenticated ? (user as any)?.id : undefined}
          onClose={() => setParticipantsEvent(null)}
        />
      )}

      {medalShopEvent && (
        <MedalShopModal
          isOpen={!!medalShopEvent}
          event={medalShopEvent}
          onClose={() => setMedalShopEvent(null)}
          onJoin={handleJoinComplete}
        />
      )}
    </div>
  );
}
