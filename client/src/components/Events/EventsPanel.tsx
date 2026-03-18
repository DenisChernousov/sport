import { useState, useEffect, useCallback } from 'react';
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

function EventCard({ event, onJoin, onLeave, joining }: {
  event: Event; onJoin: (id: string) => void; onLeave: (id: string) => void; joining: string | null;
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
          <StatBox value={pCount} label="участников" />
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
  const { isAuthenticated } = useAuth();
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState<string | null>(null);
  const [sport, setSport] = useState<SportType | null>(null);
  const [type, setType] = useState<EventType | null>(null);
  const [status, setStatus] = useState<EventStatus | null>(null);
  const [medalShopEvent, setMedalShopEvent] = useState<Event | null>(null);

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
        background: 'linear-gradient(135deg, #fc4c02 0%, #ff6b2b 100%)',
        borderRadius: 20, padding: '48px 40px', marginBottom: 32, color: '#fff',
        boxShadow: '0 4px 20px rgba(252,76,2,0.25)',
      }}>
        <h1 style={{ fontSize: 36, fontWeight: 900, marginBottom: 8, lineHeight: 1.2 }}>
          Виртуальные события
        </h1>
        <p style={{ fontSize: 16, opacity: 0.9, maxWidth: 500, lineHeight: 1.6, marginBottom: 20 }}>
          Забеги, челленджи и соревнования — участвуй из&nbsp;любой точки мира.
          Зарабатывай&nbsp;XP, получай медали, соревнуйся.
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
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
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
        background: '#fff', borderRadius: 14, padding: '20px 24px', marginBottom: 28,
        boxShadow: '0 1px 4px rgba(0,0,0,0.06), 0 0 0 1px rgba(0,0,0,0.04)',
      }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 20 }}>
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
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 24 }}>
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
            style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 24 }}
            initial="hidden" animate="visible" variants={{ visible: { transition: { staggerChildren: 0.04 } } }}>
            {events.map(e => <EventCard key={e.id} event={e} onJoin={openMedalShop} onLeave={leave} joining={joining} />)}
          </motion.div>
        </AnimatePresence>
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
