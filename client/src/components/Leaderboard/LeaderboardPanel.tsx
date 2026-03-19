import { useCallback, useEffect, useState } from 'react';
import type { LeaderboardEntry, SportType, Team } from '@/types';
import { api } from '@/services/api';

type Period = 'week' | 'month' | 'all';

const PERIODS: { key: Period; label: string }[] = [
  { key: 'week', label: 'За неделю' },
  { key: 'month', label: 'За месяц' },
  { key: 'all', label: 'За всё время' },
];

const SPORT_FILTERS: { key: SportType | 'ALL'; label: string; color: string }[] = [
  { key: 'ALL', label: 'Все', color: '#fc4c02' },
  { key: 'RUNNING', label: '🏃 Бег', color: '#fc4c02' },
  { key: 'CYCLING', label: '🚴 Вело', color: '#0061ff' },
  { key: 'SKIING', label: '⛷️ Лыжи', color: '#0891b2' },
  { key: 'WALKING', label: '🚶 Ходьба', color: '#7c3aed' },
];

function getRankDisplay(rank: number): { text: string; bg: string; color: string; border: string } {
  if (rank === 1) return { text: '🥇', bg: 'rgba(234,179,8,0.15)', color: '#ca8a04', border: 'rgba(234,179,8,0.3)' };
  if (rank === 2) return { text: '🥈', bg: 'rgba(148,163,184,0.15)', color: '#94a3b8', border: 'rgba(148,163,184,0.3)' };
  if (rank === 3) return { text: '🥉', bg: 'rgba(180,83,9,0.15)', color: '#b45309', border: 'rgba(180,83,9,0.3)' };
  return { text: String(rank), bg: '#eef0f4', color: '#999', border: 'transparent' };
}

export default function LeaderboardPanel() {
  const [period, setPeriod] = useState<Period>('week');
  const [sport, setSport] = useState<SportType | 'ALL'>('ALL');
  const [users, setUsers] = useState<LeaderboardEntry[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [loadingTeams, setLoadingTeams] = useState(true);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  useEffect(() => {
    const h = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', h);
    return () => window.removeEventListener('resize', h);
  }, []);

  const loadUsers = useCallback(async () => {
    setLoadingUsers(true);
    try {
      let raw: any[];
      if (sport === 'ALL') {
        const res = await api.leaderboard.users({ period });
        raw = Array.isArray(res) ? res : (res?.items ?? []);
      } else {
        const res = await api.leaderboard.bySport(sport, { period });
        raw = Array.isArray(res) ? res : ((res as any)?.items ?? []);
      }
      // Normalize: backend returns { user: {...}, periodDistance } but we need flat LeaderboardEntry
      const list = raw.map((entry: any) => ({
        id: entry.user?.id ?? entry.userId ?? entry.id,
        username: entry.user?.username ?? entry.username,
        avatarUrl: entry.user?.avatarUrl ?? entry.avatarUrl,
        level: entry.user?.level ?? entry.level ?? 0,
        totalDistance: entry.periodDistance ?? entry.sportDistance ?? entry.user?.totalDistance ?? entry.totalDistance ?? 0,
        totalActivities: entry.periodActivities ?? entry.sportActivities ?? entry.user?.totalActivities ?? entry.totalActivities ?? 0,
      }));
      setUsers(list);
    } catch {
      setUsers([]);
    } finally {
      setLoadingUsers(false);
    }
  }, [period, sport]);

  const loadTeams = useCallback(async () => {
    setLoadingTeams(true);
    try {
      const res = await api.leaderboard.teams();
      const list = Array.isArray(res) ? res : ((res as any)?.items ?? []);
      setTeams(list.slice(0, 10));
    } catch {
      setTeams([]);
    } finally {
      setLoadingTeams(false);
    }
  }, []);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  useEffect(() => {
    loadTeams();
  }, [loadTeams]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <h1 style={{ fontSize: 24, fontWeight: 700, color: '#242424', margin: 0 }}>
        Таблица лидеров
      </h1>

      {/* Period tabs */}
      <div style={{
        display: 'flex',
        gap: 4,
        backgroundColor: '#eef0f4',
        borderRadius: 12,
        padding: 4,
      }}>
        {PERIODS.map((p) => (
          <button
            key={p.key}
            onClick={() => setPeriod(p.key)}
            style={{
              flex: 1,
              padding: isMobile ? '8px 10px' : '10px 16px',
              borderRadius: 8,
              border: 'none',
              fontSize: isMobile ? 12 : 14,
              fontWeight: 500,
              cursor: 'pointer',
              backgroundColor: period === p.key ? '#fc4c02' : 'transparent',
              color: period === p.key ? '#fff' : '#666',
              transition: 'all 0.2s',
            }}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Sport filter pills */}
      <div style={{ display: 'flex', flexWrap: isMobile ? 'nowrap' : 'wrap', gap: 8, overflowX: isMobile ? 'auto' : undefined, paddingBottom: isMobile ? 4 : undefined }}>
        {SPORT_FILTERS.map((s) => {
          const isActive = sport === s.key;
          return (
            <button
              key={s.key}
              onClick={() => setSport(s.key)}
              style={{
                padding: isMobile ? '6px 12px' : '8px 16px',
                borderRadius: 20,
                border: 'none',
                fontSize: isMobile ? 12 : 14,
                fontWeight: 500,
                cursor: 'pointer',
                backgroundColor: isActive ? s.color : '#eef0f4',
                color: isActive ? '#fff' : '#666',
                transition: 'all 0.2s',
                flexShrink: 0,
              }}
            >
              {s.label}
            </button>
          );
        })}
      </div>

      {/* Users leaderboard */}
      <div style={{
        backgroundColor: '#fff',
        border: '1px solid #e0e0e0',
        borderRadius: 12,
        overflow: 'hidden',
        overflowX: isMobile ? 'auto' : undefined,
      }}>
        <div style={{
          borderBottom: '1px solid #e0e0e0',
          padding: '12px 20px',
        }}>
          <h2 style={{ margin: 0, fontSize: 16, fontWeight: 600, color: '#242424' }}>Рейтинг участников</h2>
        </div>

        {loadingUsers ? (
          <div>
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} style={{
                display: 'flex',
                alignItems: 'center',
                gap: 16,
                padding: '12px 20px',
                borderBottom: i < 7 ? '1px solid #eef0f4' : 'none',
              }}>
                <div style={{ width: 32, height: 32, borderRadius: 8, backgroundColor: '#eef0f4' }} />
                <div style={{ width: 36, height: 36, borderRadius: '50%', backgroundColor: '#eef0f4' }} />
                <div style={{ flex: 1 }}>
                  <div style={{ width: 100, height: 16, borderRadius: 4, backgroundColor: '#eef0f4' }} />
                </div>
                <div style={{ width: 60, height: 16, borderRadius: 4, backgroundColor: '#eef0f4' }} />
              </div>
            ))}
          </div>
        ) : users.length === 0 ? (
          <div style={{ padding: '40px 20px', textAlign: 'center', color: '#999' }}>
            Нет данных
          </div>
        ) : (
          <div>
            {/* Table header */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 16,
              padding: '8px 20px',
              fontSize: 11,
              fontWeight: 500,
              color: '#999',
              textTransform: 'uppercase',
              letterSpacing: 0.5,
              borderBottom: '1px solid #eef0f4',
            }}>
              <div style={{ width: 40, textAlign: 'center' }}>#</div>
              <div style={{ width: 36 }} />
              <div style={{ flex: 1 }}>Участник</div>
              <div style={{ width: 64, textAlign: 'center' }}>Уровень</div>
              <div style={{ width: 96, textAlign: 'right' }}>Дистанция</div>
              <div style={{ width: 80, textAlign: 'right' }}>Активности</div>
            </div>

            {users.map((entry, i) => {
              const rank = i + 1;
              const rd = getRankDisplay(rank);
              return (
                <div
                  key={entry.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 16,
                    padding: '10px 20px',
                    borderBottom: i < users.length - 1 ? '1px solid #f5f5f5' : 'none',
                    transition: 'background-color 0.15s',
                  }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = '#f9f9f9'; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent'; }}
                >
                  {/* Rank */}
                  <div style={{
                    width: 40,
                    height: 32,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: 8,
                    backgroundColor: rd.bg,
                    color: rd.color,
                    border: `1px solid ${rd.border}`,
                    fontSize: 14,
                    fontWeight: 700,
                  }}>
                    {rd.text}
                  </div>

                  {/* Avatar */}
                  <div
                    onClick={() => window.dispatchEvent(new CustomEvent('open-profile', { detail: { userId: entry.id } }))}
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: '50%',
                      backgroundColor: '#eef0f4',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 14,
                      fontWeight: 600,
                      color: '#242424',
                      overflow: 'hidden',
                      flexShrink: 0,
                      cursor: 'pointer',
                    }}
                  >
                    {entry.avatarUrl ? (
                      <img src={entry.avatarUrl} alt="" style={{ width: 36, height: 36, borderRadius: '50%', objectFit: 'cover' }} />
                    ) : (
                      (entry.username ?? '?').charAt(0).toUpperCase()
                    )}
                  </div>

                  {/* Username */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <span
                      onClick={() => window.dispatchEvent(new CustomEvent('open-profile', { detail: { userId: entry.id } }))}
                      style={{
                        fontWeight: 500,
                        color: '#242424',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        display: 'block',
                        cursor: 'pointer',
                      }}
                      onMouseEnter={(e) => { (e.target as HTMLElement).style.color = '#fc4c02'; }}
                      onMouseLeave={(e) => { (e.target as HTMLElement).style.color = '#242424'; }}
                    >
                      {entry.username ?? '?'}
                    </span>
                  </div>

                  {/* Level */}
                  <div style={{ width: 64, textAlign: 'center' }}>
                    <span style={{
                      display: 'inline-block',
                      backgroundColor: 'rgba(0,97,255,0.1)',
                      color: '#0061ff',
                      fontSize: 12,
                      fontWeight: 600,
                      padding: '2px 10px',
                      borderRadius: 12,
                    }}>
                      Ур. {entry.level ?? 0}
                    </span>
                  </div>

                  {/* Distance */}
                  <div style={{ width: 96, textAlign: 'right' }}>
                    <span style={{ fontWeight: 600, color: '#242424' }}>
                      {((entry.totalDistance ?? 0)).toFixed(1)}
                    </span>
                    <span style={{ marginLeft: 4, fontSize: 12, color: '#999' }}>км</span>
                  </div>

                  {/* Activities */}
                  <div style={{ width: 80, textAlign: 'right', fontSize: 14, color: '#666' }}>
                    {entry.totalActivities ?? 0}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Team leaderboard */}
      <div style={{
        backgroundColor: '#fff',
        border: '1px solid #e0e0e0',
        borderRadius: 12,
        overflow: 'hidden',
      }}>
        <div style={{
          borderBottom: '1px solid #e0e0e0',
          padding: '12px 20px',
        }}>
          <h2 style={{ margin: 0, fontSize: 16, fontWeight: 600, color: '#242424' }}>Рейтинг команд</h2>
        </div>

        {loadingTeams ? (
          <div>
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} style={{
                display: 'flex',
                alignItems: 'center',
                gap: 16,
                padding: '12px 20px',
                borderBottom: i < 4 ? '1px solid #eef0f4' : 'none',
              }}>
                <div style={{ width: 32, height: 32, borderRadius: 8, backgroundColor: '#eef0f4' }} />
                <div style={{ flex: 1 }}>
                  <div style={{ width: 120, height: 16, borderRadius: 4, backgroundColor: '#eef0f4' }} />
                </div>
                <div style={{ width: 60, height: 16, borderRadius: 4, backgroundColor: '#eef0f4' }} />
              </div>
            ))}
          </div>
        ) : teams.length === 0 ? (
          <div style={{ padding: '40px 20px', textAlign: 'center', color: '#999' }}>
            Нет данных
          </div>
        ) : (
          <div>
            {teams.map((team, i) => {
              const rank = i + 1;
              const rd = getRankDisplay(rank);
              return (
                <div
                  key={team.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 16,
                    padding: '10px 20px',
                    borderBottom: i < teams.length - 1 ? '1px solid #f5f5f5' : 'none',
                    transition: 'background-color 0.15s',
                  }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = '#f9f9f9'; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent'; }}
                >
                  <div style={{
                    width: 40,
                    height: 32,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: 8,
                    backgroundColor: rd.bg,
                    color: rd.color,
                    border: `1px solid ${rd.border}`,
                    fontSize: 14,
                    fontWeight: 700,
                  }}>
                    {rd.text}
                  </div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <span style={{
                      fontWeight: 500,
                      color: '#242424',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      display: 'block',
                    }}>
                      {team.name}
                    </span>
                  </div>

                  <div style={{ fontSize: 14, color: '#999' }}>
                    <span style={{ fontWeight: 600, color: '#666' }}>{team.memberCount ?? 0}</span>{' '}
                    участников
                  </div>

                  <div style={{ width: 96, textAlign: 'right' }}>
                    <span style={{ fontWeight: 600, color: '#242424' }}>
                      {((team.totalDistance ?? 0)).toFixed(1)}
                    </span>
                    <span style={{ marginLeft: 4, fontSize: 12, color: '#999' }}>км</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
