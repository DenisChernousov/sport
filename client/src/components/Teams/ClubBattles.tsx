import { useCallback, useEffect, useState } from 'react';
import { api } from '@/services/api';
import { useAuth } from '@/context/AuthContext';

const SPORT_OPTIONS = [
  { key: null, label: 'Любой вид' },
  { key: 'RUNNING', label: '🏃 Бег' },
  { key: 'CYCLING', label: '🚴 Велоспорт' },
  { key: 'SKIING', label: '⛷️ Лыжи' },
  { key: 'WALKING', label: '🚶 Ходьба' },
];

const SPORT_ICONS: Record<string, string> = {
  RUNNING: '🏃', CYCLING: '🚴', SKIING: '⛷️', WALKING: '🚶',
};

const DURATION_OPTIONS = [
  { value: 3, label: '3 дня' },
  { value: 7, label: '1 неделя' },
  { value: 14, label: '2 недели' },
  { value: 30, label: '1 месяц' },
];

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; bg: string; color: string }> = {
    pending:  { label: 'Ожидает ответа', bg: 'rgba(234,179,8,0.12)', color: '#ca8a04' },
    active:   { label: 'Идёт бой',       bg: 'rgba(22,163,74,0.12)',  color: '#16a34a' },
    finished: { label: 'Завершено',       bg: 'rgba(148,163,184,0.15)', color: '#64748b' },
    declined: { label: 'Отклонено',       bg: 'rgba(239,68,68,0.12)', color: '#dc2626' },
  };
  const s = map[status] ?? map.pending;
  return (
    <span style={{
      fontSize: 11, fontWeight: 700, letterSpacing: 0.3,
      backgroundColor: s.bg, color: s.color,
      padding: '3px 10px', borderRadius: 20, textTransform: 'uppercase',
    }}>
      {s.label}
    </span>
  );
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
}

function daysLeft(endsAt: string) {
  const diff = new Date(endsAt).getTime() - Date.now();
  const days = Math.ceil(diff / 86400000);
  return days > 0 ? `${days} дн. осталось` : 'Время вышло';
}

interface Battle {
  id: string;
  status: string;
  sport: string | null;
  targetDistance: number;
  challengerDistance: number;
  opponentDistance: number;
  endsAt: string;
  createdAt: string;
  winnerId: string | null;
  challengerTeam: { id: string; name: string; avatarUrl?: string };
  opponentTeam: { id: string; name: string; avatarUrl?: string };
}

interface Props {
  myTeamId?: string;
  isLeader?: boolean;
  isMobile?: boolean;
}

export default function ClubBattles({ myTeamId, isLeader, isMobile }: Props) {
  const { user } = useAuth();
  const [battles, setBattles] = useState<Battle[]>([]);
  const [loading, setLoading] = useState(true);
  const [showChallenge, setShowChallenge] = useState(false);

  // Challenge form
  const [opponentSearch, setOpponentSearch] = useState('');
  const [opponentResults, setOpponentResults] = useState<{ id: string; name: string; memberCount?: number }[]>([]);
  const [selectedOpponent, setSelectedOpponent] = useState<{ id: string; name: string } | null>(null);
  const [sport, setSport] = useState<string | null>(null);
  const [targetDistance, setTargetDistance] = useState(100);
  const [durationDays, setDurationDays] = useState(7);
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    if (!myTeamId) { setLoading(false); return; }
    setLoading(true);
    try {
      const res = await api.teamBattles.forTeam(myTeamId);
      setBattles(Array.isArray(res) ? res : []);
    } catch {
      setBattles([]);
    } finally {
      setLoading(false);
    }
  }, [myTeamId]);

  useEffect(() => { load(); }, [load]);

  // Search opponents
  useEffect(() => {
    if (!opponentSearch.trim()) { setOpponentResults([]); return; }
    const q = opponentSearch.trim();
    const timer = setTimeout(async () => {
      try {
        const res = await api.teams.list({ search: q });
        const items = (res?.items ?? []).filter((t: any) => t.id !== myTeamId);
        setOpponentResults(items.slice(0, 6));
      } catch { setOpponentResults([]); }
    }, 300);
    return () => clearTimeout(timer);
  }, [opponentSearch, myTeamId]);

  const handleChallenge = async () => {
    if (!selectedOpponent) return;
    setSubmitting(true);
    try {
      await api.teamBattles.challenge({
        opponentTeamId: selectedOpponent.id,
        sport: sport || null,
        targetDistance,
        durationDays,
      });
      setShowChallenge(false);
      setSelectedOpponent(null);
      setOpponentSearch('');
      setSport(null);
      setTargetDistance(100);
      setDurationDays(7);
      load();
    } catch {
      alert('Не удалось отправить вызов. Попробуйте ещё раз.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleAccept = async (id: string) => {
    try { await api.teamBattles.accept(id); load(); } catch { /* ignore */ }
  };
  const handleDecline = async (id: string) => {
    try { await api.teamBattles.decline(id); load(); } catch { /* ignore */ }
  };

  if (!myTeamId) return null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Header row */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
        <div>
          <div style={{ fontSize: 15, fontWeight: 700, color: '#242424' }}>Сражения клубов</div>
          <div style={{ fontSize: 12, color: '#999', marginTop: 2 }}>
            Вызывайте другие клубы и сражайтесь дистанцией
          </div>
        </div>
        {isLeader && (
          <button
            onClick={() => setShowChallenge(!showChallenge)}
            style={{
              padding: '8px 16px',
              backgroundColor: showChallenge ? '#eef0f4' : '#fc4c02',
              color: showChallenge ? '#666' : '#fff',
              border: 'none', borderRadius: 8,
              fontSize: 13, fontWeight: 600, cursor: 'pointer',
            }}
          >
            {showChallenge ? 'Отмена' : '⚔️ Вызвать клуб'}
          </button>
        )}
      </div>

      {/* Challenge form */}
      {showChallenge && (
        <div style={{
          background: 'linear-gradient(135deg, #fff4ef 0%, #fff 80%)',
          border: '1px solid #ffe0cc',
          borderRadius: 12, padding: isMobile ? 14 : 20,
          display: 'flex', flexDirection: 'column', gap: 14,
        }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: '#242424' }}>Новый вызов</div>

          {/* Opponent search */}
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: '#666', display: 'block', marginBottom: 6 }}>Выберите клуб-соперника</label>
            {selectedOpponent ? (
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                background: '#fff', border: '2px solid #fc4c02', borderRadius: 8, padding: '8px 12px',
              }}>
                <span style={{ fontWeight: 600, color: '#242424' }}>{selectedOpponent.name}</span>
                <button
                  onClick={() => { setSelectedOpponent(null); setOpponentSearch(''); }}
                  style={{ background: 'none', border: 'none', color: '#999', cursor: 'pointer', fontSize: 16 }}
                >×</button>
              </div>
            ) : (
              <div style={{ position: 'relative' }}>
                <input
                  type="text"
                  placeholder="Введите название клуба..."
                  value={opponentSearch}
                  onChange={(e) => setOpponentSearch(e.target.value)}
                  style={{
                    width: '100%', padding: '10px 14px', border: '1px solid #e0e0e0',
                    borderRadius: 8, fontSize: 14, outline: 'none', boxSizing: 'border-box',
                  }}
                />
                {opponentResults.length > 0 && (
                  <div style={{
                    position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 10,
                    background: '#fff', border: '1px solid #e0e0e0', borderRadius: 8,
                    boxShadow: '0 4px 16px rgba(0,0,0,0.1)', marginTop: 4, overflow: 'hidden',
                  }}>
                    {opponentResults.map(t => (
                      <div
                        key={t.id}
                        onClick={() => { setSelectedOpponent({ id: t.id, name: t.name }); setOpponentResults([]); setOpponentSearch(''); }}
                        style={{
                          padding: '10px 14px', cursor: 'pointer', fontSize: 14,
                          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                          borderBottom: '1px solid #f5f5f5',
                        }}
                        onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = '#fff4ef'; }}
                        onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = '#fff'; }}
                      >
                        <span style={{ fontWeight: 500, color: '#242424' }}>{t.name}</span>
                        {t.memberCount != null && (
                          <span style={{ fontSize: 12, color: '#999' }}>{t.memberCount} уч.</span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Sport & distance & duration */}
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)', gap: 12 }}>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#666', display: 'block', marginBottom: 6 }}>Вид спорта</label>
              <select
                value={sport ?? ''}
                onChange={(e) => setSport(e.target.value || null)}
                style={{
                  width: '100%', padding: '9px 12px', border: '1px solid #e0e0e0',
                  borderRadius: 8, fontSize: 13, outline: 'none', background: '#fff', cursor: 'pointer',
                }}
              >
                {SPORT_OPTIONS.map(o => (
                  <option key={String(o.key)} value={o.key ?? ''}>{o.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#666', display: 'block', marginBottom: 6 }}>Цель (км)</label>
              <input
                type="number"
                min={10}
                max={5000}
                value={targetDistance}
                onChange={(e) => setTargetDistance(Number(e.target.value))}
                style={{
                  width: '100%', padding: '9px 12px', border: '1px solid #e0e0e0',
                  borderRadius: 8, fontSize: 13, outline: 'none', boxSizing: 'border-box',
                }}
              />
            </div>

            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#666', display: 'block', marginBottom: 6 }}>Длительность</label>
              <select
                value={durationDays}
                onChange={(e) => setDurationDays(Number(e.target.value))}
                style={{
                  width: '100%', padding: '9px 12px', border: '1px solid #e0e0e0',
                  borderRadius: 8, fontSize: 13, outline: 'none', background: '#fff', cursor: 'pointer',
                }}
              >
                {DURATION_OPTIONS.map(o => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
          </div>

          <button
            onClick={handleChallenge}
            disabled={submitting || !selectedOpponent}
            style={{
              alignSelf: 'flex-start',
              padding: '10px 24px',
              backgroundColor: submitting || !selectedOpponent ? '#ccc' : '#fc4c02',
              color: '#fff', border: 'none', borderRadius: 8,
              fontSize: 14, fontWeight: 600,
              cursor: submitting || !selectedOpponent ? 'not-allowed' : 'pointer',
            }}
          >
            {submitting ? 'Отправка...' : '⚔️ Бросить вызов'}
          </button>
        </div>
      )}

      {/* Battles list */}
      {loading ? (
        <div style={{ textAlign: 'center', color: '#999', padding: '16px 0', fontSize: 14 }}>Загрузка...</div>
      ) : battles.length === 0 ? (
        <div style={{
          background: '#f9f9f9', borderRadius: 12, padding: '24px 20px',
          textAlign: 'center', border: '1px dashed #ddd',
        }}>
          <div style={{ fontSize: 28, marginBottom: 8 }}>⚔️</div>
          <div style={{ fontSize: 14, fontWeight: 600, color: '#666' }}>Нет активных сражений</div>
          {isLeader && (
            <div style={{ fontSize: 12, color: '#999', marginTop: 4 }}>
              Бросьте вызов другому клубу, чтобы начать!
            </div>
          )}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {battles.map(battle => {
            const isChallenger = battle.challengerTeam.id === myTeamId;
            const myTeamData = isChallenger ? battle.challengerTeam : battle.opponentTeam;
            const theirTeam = isChallenger ? battle.opponentTeam : battle.challengerTeam;
            const myDist = isChallenger ? battle.challengerDistance : battle.opponentDistance;
            const theirDist = isChallenger ? battle.opponentDistance : battle.challengerDistance;
            const myPct = Math.min(100, (myDist / battle.targetDistance) * 100);
            const theirPct = Math.min(100, (theirDist / battle.targetDistance) * 100);
            const isPending = battle.status === 'pending';
            const isActive = battle.status === 'active';
            const isFinished = battle.status === 'finished';
            const iWon = isFinished && battle.winnerId === myTeamData.id;
            const theyWon = isFinished && battle.winnerId === theirTeam.id;
            // Can accept/decline if pending and I'm the opponent's team
            const canRespond = isPending && !isChallenger && isLeader;

            return (
              <div
                key={battle.id}
                style={{
                  background: '#fff',
                  border: `1px solid ${isActive ? '#fc4c02' : isFinished ? '#e0e0e0' : '#f5a623'}`,
                  borderRadius: 12, padding: isMobile ? 14 : 18,
                  display: 'flex', flexDirection: 'column', gap: 12,
                }}
              >
                {/* Top row: teams vs status */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? 6 : 10 }}>
                    <span style={{ fontWeight: 700, fontSize: isMobile ? 13 : 15, color: '#242424' }}>
                      {myTeamData.name}
                    </span>
                    <span style={{ color: '#fc4c02', fontWeight: 700, fontSize: 14 }}>VS</span>
                    <span style={{ fontWeight: 700, fontSize: isMobile ? 13 : 15, color: '#242424' }}>
                      {theirTeam.name}
                    </span>
                  </div>
                  <StatusBadge status={battle.status} />
                </div>

                {/* Meta: sport / target / dates */}
                <div style={{ display: 'flex', gap: 12, fontSize: 12, color: '#888', flexWrap: 'wrap', alignItems: 'center' }}>
                  {battle.sport && (
                    <span>{SPORT_ICONS[battle.sport]} {battle.sport.charAt(0) + battle.sport.slice(1).toLowerCase()}</span>
                  )}
                  <span>Цель: <strong style={{ color: '#242424' }}>{battle.targetDistance} км</strong></span>
                  {isActive && <span style={{ color: '#fc4c02', fontWeight: 600 }}>{daysLeft(battle.endsAt)}</span>}
                  {!isActive && <span>до {formatDate(battle.endsAt)}</span>}
                </div>

                {/* Progress bars (only for active/finished) */}
                {(isActive || isFinished) && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {/* My team bar */}
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                        <span style={{ fontSize: 12, fontWeight: 600, color: iWon ? '#16a34a' : '#fc4c02' }}>
                          {myTeamData.name} {iWon ? '🏆' : ''}
                        </span>
                        <span style={{ fontSize: 12, fontWeight: 700, color: '#242424' }}>
                          {myDist.toFixed(1)} / {battle.targetDistance} км
                        </span>
                      </div>
                      <div style={{ height: 10, borderRadius: 5, background: '#eee', overflow: 'hidden' }}>
                        <div style={{
                          height: '100%', borderRadius: 5,
                          background: iWon ? 'linear-gradient(90deg,#16a34a,#4ade80)' : 'linear-gradient(90deg,#fc4c02,#ff8a50)',
                          width: `${myPct}%`, transition: 'width 0.4s',
                        }} />
                      </div>
                    </div>

                    {/* Their team bar */}
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                        <span style={{ fontSize: 12, fontWeight: 600, color: theyWon ? '#16a34a' : '#64748b' }}>
                          {theirTeam.name} {theyWon ? '🏆' : ''}
                        </span>
                        <span style={{ fontSize: 12, fontWeight: 700, color: '#242424' }}>
                          {theirDist.toFixed(1)} / {battle.targetDistance} км
                        </span>
                      </div>
                      <div style={{ height: 10, borderRadius: 5, background: '#eee', overflow: 'hidden' }}>
                        <div style={{
                          height: '100%', borderRadius: 5,
                          background: theyWon ? 'linear-gradient(90deg,#16a34a,#4ade80)' : 'linear-gradient(90deg,#94a3b8,#cbd5e1)',
                          width: `${theirPct}%`, transition: 'width 0.4s',
                        }} />
                      </div>
                    </div>
                  </div>
                )}

                {/* Result banner */}
                {isFinished && (
                  <div style={{
                    textAlign: 'center', padding: '8px 0',
                    fontSize: 14, fontWeight: 700,
                    color: iWon ? '#16a34a' : theyWon ? '#dc2626' : '#64748b',
                  }}>
                    {iWon ? '🎉 Победа! Ваш клуб выиграл сражение!' : theyWon ? `😤 ${theirTeam.name} победил` : '🤝 Ничья'}
                  </div>
                )}

                {/* Accept / Decline buttons */}
                {canRespond && (
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button
                      onClick={() => handleAccept(battle.id)}
                      style={{
                        padding: '8px 20px', backgroundColor: '#fc4c02',
                        color: '#fff', border: 'none', borderRadius: 8,
                        fontSize: 13, fontWeight: 600, cursor: 'pointer',
                      }}
                    >
                      Принять вызов
                    </button>
                    <button
                      onClick={() => handleDecline(battle.id)}
                      style={{
                        padding: '8px 16px', backgroundColor: 'transparent',
                        color: '#d32f2f', border: '1px solid #d32f2f', borderRadius: 8,
                        fontSize: 13, cursor: 'pointer',
                      }}
                    >
                      Отклонить
                    </button>
                  </div>
                )}

                {/* Challenger waiting info */}
                {isPending && isChallenger && (
                  <div style={{ fontSize: 12, color: '#ca8a04', fontStyle: 'italic' }}>
                    Ожидаем ответа от {theirTeam.name}...
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
