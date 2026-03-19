import { useCallback, useEffect, useRef, useState } from 'react';
import type { Team } from '@/types';
import { api } from '@/services/api';
import { useAuth } from '@/context/AuthContext';
import ClubBattles from './ClubBattles';

const SPORT_ICONS: Record<string, string> = {
  RUNNING: '🏃', CYCLING: '🚴', SKIING: '⛷️', WALKING: '🚶',
};
const SPORT_COLORS: Record<string, string> = {
  RUNNING: '#fc4c02', CYCLING: '#0061ff', SKIING: '#0891b2', WALKING: '#7c3aed',
};
const SPORT_LABELS: Record<string, string> = {
  RUNNING: 'Бег', CYCLING: 'Вело', SKIING: 'Лыжи', WALKING: 'Ходьба',
};

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}ч ${m}м`;
  return `${m}м`;
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

interface ClubFeedItem {
  id: string;
  sport: string;
  title?: string;
  distance: number;
  duration: number;
  startedAt: string;
  createdAt: string;
  user: { id: string; username: string; avatarUrl?: string; level: number };
}

interface ClubStats {
  weekDistance: number;
  monthDistance: number;
  weekActivities: number;
  activeMembers: number;
}

type ClubTab = 'members' | 'feed' | 'leaderboard' | 'challenges';

export default function TeamsPanel() {
  const { user } = useAuth();
  const [teams, setTeams] = useState<Team[]>([]);
  const [myTeam, setMyTeam] = useState<Team | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const [showCreate, setShowCreate] = useState(false);
  const [createName, setCreateName] = useState('');
  const [createDesc, setCreateDesc] = useState('');
  const [createPublic, setCreatePublic] = useState(true);
  const [creating, setCreating] = useState(false);

  const [showJoinCode, setShowJoinCode] = useState(false);
  const [joinCode, setJoinCode] = useState('');
  const [joining, setJoining] = useState(false);

  const [codeCopied, setCodeCopied] = useState(false);
  const [avatarHover, setAvatarHover] = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const teamAvatarRef = useRef<HTMLInputElement>(null);

  // Mobile responsive
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  useEffect(() => {
    const h = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', h);
    return () => window.removeEventListener('resize', h);
  }, []);

  // Club features state
  const [clubTab, setClubTab] = useState<ClubTab>('members');
  const [clubFeed, setClubFeed] = useState<ClubFeedItem[]>([]);
  const [clubFeedLoading, setClubFeedLoading] = useState(false);
  const [clubStats, setClubStats] = useState<ClubStats | null>(null);

  const loadTeams = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.teams.list({ search: search || undefined });
      setTeams(res?.items ?? []);
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }, [search]);

  const loadMyTeam = useCallback(async () => {
    if (!user) return;
    try {
      const res = await api.teams.list();
      const items = res?.items ?? [];
      const found = items.find(
        (t) => t.members?.some((m) => m.userId === user.id) || t.ownerId === user.id,
      );
      if (found) {
        const full = await api.teams.get(found.id);
        setMyTeam(full);
      } else {
        setMyTeam(null);
      }
    } catch {
      /* ignore */
    }
  }, [user]);

  useEffect(() => {
    loadTeams();
  }, [loadTeams]);

  useEffect(() => {
    loadMyTeam();
  }, [loadMyTeam]);

  const handleCreate = async () => {
    if (!createName.trim()) return;
    setCreating(true);
    try {
      await api.teams.create({
        name: createName.trim(),
        description: createDesc.trim() || undefined,
        isPublic: createPublic,
      });
      setShowCreate(false);
      setCreateName('');
      setCreateDesc('');
      setCreatePublic(true);
      loadTeams();
      loadMyTeam();
    } catch {
      /* ignore */
    } finally {
      setCreating(false);
    }
  };

  const handleJoinByCode = async () => {
    if (!joinCode.trim()) return;
    setJoining(true);
    try {
      await api.teams.joinByCode(joinCode.trim());
      setShowJoinCode(false);
      setJoinCode('');
      loadTeams();
      loadMyTeam();
    } catch {
      /* ignore */
    } finally {
      setJoining(false);
    }
  };

  const handleJoin = async (teamId: string) => {
    try {
      await api.teams.join(teamId);
      loadTeams();
      loadMyTeam();
    } catch {
      /* ignore */
    }
  };

  const handleLeave = async (teamId: string) => {
    try {
      await api.teams.leave(teamId);
      setMyTeam(null);
      loadTeams();
    } catch {
      /* ignore */
    }
  };

  const copyInviteCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCodeCopied(true);
    setTimeout(() => setCodeCopied(false), 2000);
  };

  const handleTeamAvatarChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !myTeam) return;
    setAvatarUploading(true);
    try {
      const { avatarUrl } = await api.teams.uploadAvatar(myTeam.id, file);
      setMyTeam(prev => prev ? { ...prev, avatarUrl } : prev);
    } catch { /* ignore */ } finally {
      setAvatarUploading(false);
      if (teamAvatarRef.current) teamAvatarRef.current.value = '';
    }
  }, [myTeam]);

  const isMember = (team: Team) => {
    if (!user) return false;
    if (team.ownerId === user.id) return true;
    return team.members?.some((m) => m.userId === user.id) ?? false;
  };

  // Load club feed & stats when myTeam changes
  const loadClubFeed = useCallback(async () => {
    if (!myTeam) return;
    setClubFeedLoading(true);
    try {
      const res = await api.teams.feed(myTeam.id);
      setClubFeed(res ?? []);
    } catch {
      setClubFeed([]);
    } finally {
      setClubFeedLoading(false);
    }
  }, [myTeam]);

  const loadClubStats = useCallback(async () => {
    if (!myTeam) return;
    try {
      const res = await api.teams.stats(myTeam.id);
      setClubStats(res ?? null);
    } catch {
      setClubStats(null);
    }
  }, [myTeam]);

  useEffect(() => {
    if (myTeam) {
      loadClubFeed();
      loadClubStats();
    }
  }, [myTeam, loadClubFeed, loadClubStats]);

  // Club challenge: weekly 100km target
  const weeklyTarget = 100;
  const weeklyProgress = clubStats ? Math.min(100, (clubStats.weekDistance / weeklyTarget) * 100) : 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: isMobile ? 16 : 24 }}>
      {/* Header */}
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: isMobile ? 10 : 16 }}>
        <h1 style={{ fontSize: isMobile ? 20 : 24, fontWeight: 700, color: '#242424', margin: 0 }}>Клубы</h1>
        <div style={{ display: 'flex', gap: 8, flexDirection: isMobile ? 'column' : 'row', width: isMobile ? '100%' : undefined }}>
          <button
            onClick={() => { setShowCreate(!showCreate); setShowJoinCode(false); }}
            style={{
              padding: '10px 20px',
              backgroundColor: '#fc4c02',
              color: '#fff',
              border: 'none',
              borderRadius: 8,
              fontSize: 14,
              fontWeight: 600,
              cursor: 'pointer',
              width: isMobile ? '100%' : undefined,
            }}
          >
            Создать клуб
          </button>
          <button
            onClick={() => { setShowJoinCode(!showJoinCode); setShowCreate(false); }}
            style={{
              padding: '10px 20px',
              backgroundColor: '#fff',
              color: '#242424',
              border: '1px solid #e0e0e0',
              borderRadius: 8,
              fontSize: 14,
              fontWeight: 600,
              cursor: 'pointer',
              width: isMobile ? '100%' : undefined,
            }}
          >
            Войти по коду
          </button>
        </div>
      </div>

      {/* Create team form */}
      {showCreate && (
        <div style={{
          backgroundColor: '#fff',
          border: '1px solid #e0e0e0',
          borderRadius: 12,
          padding: 20,
          display: 'flex',
          flexDirection: 'column',
          gap: 16,
        }}>
          <h3 style={{ margin: 0, fontSize: 18, fontWeight: 600, color: '#242424' }}>Новый клуб</h3>
          <input
            type="text"
            placeholder="Название клуба"
            value={createName}
            onChange={(e) => setCreateName(e.target.value)}
            style={{
              width: '100%',
              padding: '10px 16px',
              border: '1px solid #e0e0e0',
              borderRadius: 8,
              fontSize: 14,
              outline: 'none',
              boxSizing: 'border-box',
            }}
          />
          <textarea
            placeholder="Описание (необязательно)"
            value={createDesc}
            onChange={(e) => setCreateDesc(e.target.value)}
            rows={3}
            style={{
              width: '100%',
              padding: '10px 16px',
              border: '1px solid #e0e0e0',
              borderRadius: 8,
              fontSize: 14,
              outline: 'none',
              resize: 'none',
              boxSizing: 'border-box',
              fontFamily: 'inherit',
            }}
          />
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button
              onClick={() => setCreatePublic(!createPublic)}
              style={{
                position: 'relative',
                width: 44,
                height: 24,
                borderRadius: 12,
                border: 'none',
                backgroundColor: createPublic ? '#fc4c02' : '#e0e0e0',
                cursor: 'pointer',
                padding: 0,
                transition: 'background-color 0.2s',
              }}
            >
              <span
                style={{
                  position: 'absolute',
                  top: 2,
                  left: createPublic ? 22 : 2,
                  width: 20,
                  height: 20,
                  borderRadius: '50%',
                  backgroundColor: '#fff',
                  transition: 'left 0.2s',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                }}
              />
            </button>
            <span style={{ fontSize: 14, color: '#666' }}>
              {createPublic ? 'Публичный клуб' : 'Приватный клуб'}
            </span>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={handleCreate}
              disabled={creating || !createName.trim()}
              style={{
                padding: '10px 20px',
                backgroundColor: creating || !createName.trim() ? '#ccc' : '#fc4c02',
                color: '#fff',
                border: 'none',
                borderRadius: 8,
                fontSize: 14,
                fontWeight: 600,
                cursor: creating || !createName.trim() ? 'not-allowed' : 'pointer',
              }}
            >
              {creating ? 'Создание...' : 'Создать'}
            </button>
            <button
              onClick={() => setShowCreate(false)}
              style={{
                padding: '10px 20px',
                backgroundColor: 'transparent',
                color: '#666',
                border: 'none',
                borderRadius: 8,
                fontSize: 14,
                cursor: 'pointer',
              }}
            >
              Отмена
            </button>
          </div>
        </div>
      )}

      {/* Join by code */}
      {showJoinCode && (
        <div style={{
          backgroundColor: '#fff',
          border: '1px solid #e0e0e0',
          borderRadius: 12,
          padding: 20,
          display: 'flex',
          flexDirection: 'column',
          gap: 16,
        }}>
          <h3 style={{ margin: 0, fontSize: 18, fontWeight: 600, color: '#242424' }}>Войти по коду</h3>
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              type="text"
              placeholder="Введите код приглашения"
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value)}
              style={{
                flex: 1,
                padding: '10px 16px',
                border: '1px solid #e0e0e0',
                borderRadius: 8,
                fontSize: 14,
                outline: 'none',
              }}
            />
            <button
              onClick={handleJoinByCode}
              disabled={joining || !joinCode.trim()}
              style={{
                padding: '10px 20px',
                backgroundColor: joining || !joinCode.trim() ? '#ccc' : '#fc4c02',
                color: '#fff',
                border: 'none',
                borderRadius: 8,
                fontSize: 14,
                fontWeight: 600,
                cursor: joining || !joinCode.trim() ? 'not-allowed' : 'pointer',
              }}
            >
              {joining ? '...' : 'Вступить'}
            </button>
          </div>
        </div>
      )}

      {/* My team section */}
      {myTeam && (
        <div style={{
          backgroundColor: '#fff',
          border: '2px solid #fc4c02',
          borderRadius: 12,
          padding: 20,
          display: 'flex',
          flexDirection: 'column',
          gap: 16,
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, flex: 1, minWidth: 0 }}>
              {/* Club avatar */}
              {(() => {
                const isOwner = user && myTeam.ownerId === user.id;
                return (
                  <div
                    style={{
                      width: 64, height: 64, borderRadius: 16, flexShrink: 0,
                      background: myTeam.avatarUrl ? 'transparent' : '#fc4c02',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 28, fontWeight: 700, color: '#fff',
                      overflow: 'hidden', position: 'relative',
                      cursor: isOwner ? 'pointer' : 'default',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
                      opacity: avatarUploading ? 0.6 : 1,
                    }}
                    onClick={() => isOwner && teamAvatarRef.current?.click()}
                    onMouseEnter={() => isOwner && setAvatarHover(true)}
                    onMouseLeave={() => setAvatarHover(false)}
                    title={isOwner ? 'Изменить эмблему клуба' : undefined}
                  >
                    {myTeam.avatarUrl ? (
                      <img src={myTeam.avatarUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      myTeam.name[0]?.toUpperCase()
                    )}
                    {isOwner && (avatarHover || avatarUploading) && (
                      <div style={{
                        position: 'absolute', inset: 0,
                        background: 'rgba(0,0,0,0.5)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}>
                        {avatarUploading ? (
                          <div style={{ width: 20, height: 20, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                        ) : (
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
                            <circle cx="12" cy="13" r="4"/>
                          </svg>
                        )}
                      </div>
                    )}
                    {isOwner && (
                      <input ref={teamAvatarRef} type="file" accept="image/*" onChange={handleTeamAvatarChange} style={{ display: 'none' }} />
                    )}
                  </div>
                );
              })()}
              <div style={{ minWidth: 0 }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: '#fc4c02', textTransform: 'uppercase', letterSpacing: 1 }}>
                  Мой клуб
                </span>
                <h2 style={{ margin: '4px 0 0', fontSize: 20, fontWeight: 700, color: '#242424' }}>{myTeam.name}</h2>
                {myTeam.description && (
                  <p style={{ margin: '4px 0 0', fontSize: 14, color: '#666' }}>{myTeam.description}</p>
                )}
              </div>
            </div>
            <button
              onClick={() => handleLeave(myTeam.id)}
              style={{
                padding: '6px 12px',
                backgroundColor: 'transparent',
                color: '#d32f2f',
                border: '1px solid #d32f2f',
                borderRadius: 8,
                fontSize: 12,
                cursor: 'pointer',
                flexShrink: 0,
              }}
            >
              Покинуть
            </button>
          </div>

          <div style={{ display: 'flex', gap: isMobile ? 12 : 24, fontSize: 14, flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{
                background: '#fc4c02', color: '#fff', borderRadius: 12,
                padding: '2px 10px', fontSize: 13, fontWeight: 700,
              }}>
                {myTeam.memberCount ?? 0}
              </span>
              <span style={{ color: '#999' }}>участников</span>
            </div>
            <div>
              <span style={{ color: '#999' }}>Общая дистанция: </span>
              <span style={{ fontWeight: 600, color: '#242424' }}>
                {(myTeam.totalDistance ?? 0).toFixed(1)} км
              </span>
            </div>
          </div>

          {/* Club Stats */}
          {clubStats && (
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)', gap: 10 }}>
              <div style={{ background: '#fff4ef', borderRadius: 10, padding: 12, textAlign: 'center' }}>
                <div style={{ fontSize: 20, fontWeight: 700, color: '#fc4c02' }}>{clubStats.weekDistance.toFixed(1)}</div>
                <div style={{ fontSize: 11, color: '#999' }}>км за неделю</div>
              </div>
              <div style={{ background: '#eef4ff', borderRadius: 10, padding: 12, textAlign: 'center' }}>
                <div style={{ fontSize: 20, fontWeight: 700, color: '#0061ff' }}>{clubStats.monthDistance.toFixed(1)}</div>
                <div style={{ fontSize: 11, color: '#999' }}>км за месяц</div>
              </div>
              <div style={{ background: '#f5f5f5', borderRadius: 10, padding: 12, textAlign: 'center' }}>
                <div style={{ fontSize: 20, fontWeight: 700, color: '#242424' }}>{clubStats.weekActivities}</div>
                <div style={{ fontSize: 11, color: '#999' }}>тренировок</div>
              </div>
              <div style={{ background: '#f0fdf4', borderRadius: 10, padding: 12, textAlign: 'center' }}>
                <div style={{ fontSize: 20, fontWeight: 700, color: '#1a7f37' }}>{clubStats.activeMembers}</div>
                <div style={{ fontSize: 11, color: '#999' }}>активных</div>
              </div>
            </div>
          )}

          {/* Invite code */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: isMobile ? 'wrap' : 'nowrap' }}>
            <span style={{ fontSize: isMobile ? 12 : 14, color: '#999' }}>Код приглашения:</span>
            <code style={{
              backgroundColor: '#eef0f4',
              padding: '4px 12px',
              borderRadius: 6,
              fontSize: isMobile ? 12 : 14,
              fontFamily: 'monospace',
              color: '#fc4c02',
              fontWeight: 600,
              wordBreak: 'break-all',
            }}>
              {myTeam.inviteCode ?? ''}
            </code>
            <button
              onClick={() => copyInviteCode(myTeam.inviteCode ?? '')}
              style={{
                padding: '4px 10px',
                backgroundColor: '#eef0f4',
                color: '#666',
                border: 'none',
                borderRadius: 6,
                fontSize: 12,
                cursor: 'pointer',
              }}
            >
              {codeCopied ? 'Скопировано!' : 'Копировать'}
            </button>
          </div>

          {/* Club tabs */}
          <div style={{ display: 'flex', gap: 0, borderBottom: '2px solid #e0e0e0', overflowX: isMobile ? 'auto' : undefined, whiteSpace: isMobile ? 'nowrap' : undefined }}>
            {([
              { id: 'members' as ClubTab, label: '👥 Участники' },
              { id: 'feed' as ClubTab, label: '📰 Лента' },
              { id: 'leaderboard' as ClubTab, label: '🏆 Рейтинг' },
              { id: 'challenges' as ClubTab, label: '🎯 Челленджи' },
            ]).map(tab => (
              <button
                key={tab.id}
                onClick={() => setClubTab(tab.id)}
                style={{
                  padding: isMobile ? '8px 12px' : '10px 18px',
                  fontSize: isMobile ? 12 : 14,
                  fontWeight: 600,
                  color: clubTab === tab.id ? '#fc4c02' : '#888',
                  background: 'none',
                  border: 'none',
                  borderBottom: clubTab === tab.id ? '3px solid #fc4c02' : '3px solid transparent',
                  cursor: 'pointer',
                  marginBottom: -2,
                  transition: 'all 0.15s',
                  flexShrink: 0,
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Members tab */}
          {clubTab === 'members' && myTeam.members && myTeam.members.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {myTeam.members.map((member) => (
                  <div
                    key={member.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      backgroundColor: '#eef0f4',
                      borderRadius: 8,
                      padding: '6px 12px',
                    }}
                  >
                    <div style={{
                      width: 28,
                      height: 28,
                      borderRadius: '50%',
                      backgroundColor: '#e0e0e0',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 12,
                      fontWeight: 600,
                      color: '#242424',
                      overflow: 'hidden',
                    }}>
                      {member.user.avatarUrl ? (
                        <img src={member.user.avatarUrl} alt="" style={{ width: 28, height: 28, borderRadius: '50%', objectFit: 'cover' }} />
                      ) : (
                        (member.user.username ?? '?').charAt(0).toUpperCase()
                      )}
                    </div>
                    <span
                      onClick={() => window.dispatchEvent(new CustomEvent('open-profile', { detail: { userId: member.user.id } }))}
                      style={{ fontSize: 14, color: '#242424', cursor: 'pointer' }}
                      onMouseEnter={(e) => { (e.target as HTMLElement).style.color = '#fc4c02'; }}
                      onMouseLeave={(e) => { (e.target as HTMLElement).style.color = '#242424'; }}
                    >{member.user.username ?? '?'}</span>
                    {member.role === 'OWNER' && (
                      <span style={{
                        backgroundColor: 'rgba(252,76,2,0.1)',
                        color: '#fc4c02',
                        fontSize: 10,
                        fontWeight: 600,
                        padding: '2px 6px',
                        borderRadius: 4,
                      }}>
                        Владелец
                      </span>
                    )}
                    {member.role === 'ADMIN' && (
                      <span style={{
                        backgroundColor: 'rgba(0,97,255,0.1)',
                        color: '#0061ff',
                        fontSize: 10,
                        fontWeight: 600,
                        padding: '2px 6px',
                        borderRadius: 4,
                      }}>
                        Админ
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Feed tab */}
          {clubTab === 'feed' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {clubFeedLoading ? (
                <div style={{ textAlign: 'center', color: '#999', padding: 20, fontSize: 14 }}>Загрузка...</div>
              ) : clubFeed.length === 0 ? (
                <div style={{ textAlign: 'center', color: '#999', padding: 20, fontSize: 14 }}>
                  Пока нет активностей в клубе
                </div>
              ) : (
                clubFeed.map(item => {
                  const sportColor = SPORT_COLORS[item.sport] ?? '#fc4c02';
                  const sportIcon = SPORT_ICONS[item.sport] ?? '🏃';
                  const sportLabel = SPORT_LABELS[item.sport] ?? item.sport;
                  const distKm = item.distance ?? 0;
                  return (
                    <div key={item.id} style={{
                      display: 'flex', alignItems: 'flex-start', gap: 10, padding: '10px 0',
                      borderBottom: '1px solid #f0f0f0',
                    }}>
                      <div style={{
                        width: 36, height: 36, borderRadius: '50%',
                        background: item.user.avatarUrl ? 'none' : '#fc4c02',
                        color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 14, fontWeight: 700, overflow: 'hidden', flexShrink: 0,
                      }}>
                        {item.user.avatarUrl
                          ? <img src={item.user.avatarUrl} alt="" style={{ width: 36, height: 36, borderRadius: '50%', objectFit: 'cover' }} />
                          : (item.user.username ?? '?')[0].toUpperCase()}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                          <span
                            onClick={() => window.dispatchEvent(new CustomEvent('open-profile', { detail: { userId: item.user.id } }))}
                            style={{ fontSize: 13, fontWeight: 700, color: '#242424', cursor: 'pointer' }}
                            onMouseEnter={(e) => { (e.target as HTMLElement).style.color = '#fc4c02'; }}
                            onMouseLeave={(e) => { (e.target as HTMLElement).style.color = '#242424'; }}
                          >{item.user.username}</span>
                          <span style={{ fontSize: 11, color: '#aaa' }}>{formatTimeAgo(item.startedAt ?? item.createdAt)}</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                          <span style={{ fontSize: 13, fontWeight: 600, color: sportColor }}>{sportIcon} {sportLabel}</span>
                          <span style={{ fontSize: 13, fontWeight: 700, color: '#242424' }}>{distKm.toFixed(1)} км</span>
                          <span style={{ fontSize: 12, color: '#888' }}>{formatDuration(item.duration ?? 0)}</span>
                        </div>
                        {item.title && <div style={{ fontSize: 12, color: '#999', marginTop: 2 }}>{item.title}</div>}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}

          {/* Leaderboard tab */}
          {clubTab === 'leaderboard' && myTeam.members && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
              {[...myTeam.members]
                .sort((a, b) => ((b.user as any).totalDistance ?? 0) - ((a.user as any).totalDistance ?? 0))
                .map((member, idx) => {
                  const dist = (member.user as any).totalDistance ?? 0;
                  const medal = idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `${idx + 1}`;
                  return (
                    <div key={member.id} style={{
                      display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0',
                      borderBottom: '1px solid #f0f0f0',
                    }}>
                      <div style={{
                        width: 32, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: idx < 3 ? 18 : 14, fontWeight: 700, color: '#999',
                      }}>
                        {medal}
                      </div>
                      <div style={{
                        width: 32, height: 32, borderRadius: '50%', backgroundColor: '#e0e0e0',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 12, fontWeight: 600, color: '#242424', overflow: 'hidden', flexShrink: 0,
                      }}>
                        {member.user.avatarUrl
                          ? <img src={member.user.avatarUrl} alt="" style={{ width: 32, height: 32, borderRadius: '50%', objectFit: 'cover' }} />
                          : (member.user.username ?? '?')[0].toUpperCase()}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <span style={{ fontSize: 14, fontWeight: 600, color: '#242424' }}>{member.user.username ?? '?'}</span>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <span style={{ fontSize: 14, fontWeight: 700, color: '#242424' }}>{dist.toFixed(1)}</span>
                        <span style={{ fontSize: 12, color: '#999', marginLeft: 4 }}>км</span>
                      </div>
                    </div>
                  );
                })}
            </div>
          )}

          {/* Challenges tab */}
          {clubTab === 'challenges' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Weekly challenge */}
              <div style={{
                background: 'linear-gradient(135deg, #fff4ef 0%, #fff 100%)',
                borderRadius: 12, padding: 16, border: '1px solid #ffe0cc',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                  <span style={{ fontSize: 22 }}>🎯</span>
                  <div>
                    <div style={{ fontSize: 15, fontWeight: 700, color: '#242424' }}>Недельный челлендж</div>
                    <div style={{ fontSize: 12, color: '#888' }}>{weeklyTarget} км всем клубом за неделю</div>
                  </div>
                </div>
                <div style={{ marginBottom: 6 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#666', marginBottom: 4 }}>
                    <span>{clubStats ? clubStats.weekDistance.toFixed(1) : '0'} км</span>
                    <span>{weeklyTarget} км</span>
                  </div>
                  <div style={{ height: 10, borderRadius: 5, background: '#eee', overflow: 'hidden' }}>
                    <div style={{
                      height: '100%', borderRadius: 5,
                      background: weeklyProgress >= 100 ? 'linear-gradient(90deg, #1a7f37, #22c55e)' : 'linear-gradient(90deg, #fc4c02, #ff8a50)',
                      width: `${weeklyProgress}%`, transition: 'width 0.4s',
                    }} />
                  </div>
                </div>
                {weeklyProgress >= 100 && (
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#1a7f37', marginTop: 6 }}>
                    🎉 Челлендж выполнен!
                  </div>
                )}
              </div>

              {/* Club vs Club Battles */}
              <ClubBattles
                myTeamId={myTeam.id}
                isLeader={!!(user && (myTeam.ownerId === user.id || myTeam.members?.some(m => m.userId === user.id && (m.role === 'leader' || m.role === 'officer'))))}
                isMobile={isMobile}
              />
            </div>
          )}
        </div>
      )}

      {/* Search */}
      <input
        type="text"
        placeholder="Поиск клубов..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        style={{
          width: '100%',
          padding: '12px 16px',
          border: '1px solid #e0e0e0',
          borderRadius: 12,
          fontSize: 14,
          outline: 'none',
          backgroundColor: '#fff',
          boxSizing: 'border-box',
        }}
      />

      {/* Teams grid */}
      {loading ? (
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, 1fr)', gap: 16 }}>
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              style={{
                backgroundColor: '#fff',
                border: '1px solid #e0e0e0',
                borderRadius: 12,
                padding: 20,
                display: 'flex',
                flexDirection: 'column',
                gap: 12,
              }}
            >
              <div style={{ height: 20, width: 120, backgroundColor: '#eef0f4', borderRadius: 4 }} />
              <div style={{ height: 14, width: '100%', backgroundColor: '#eef0f4', borderRadius: 4 }} />
              <div style={{ height: 14, width: '66%', backgroundColor: '#eef0f4', borderRadius: 4 }} />
            </div>
          ))}
        </div>
      ) : teams.length === 0 ? (
        <div style={{
          backgroundColor: '#fff',
          border: '1px solid #e0e0e0',
          borderRadius: 12,
          padding: 32,
          textAlign: 'center',
        }}>
          <p style={{ color: '#999', margin: 0 }}>Клубы не найдены</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, 1fr)', gap: 16 }}>
          {teams.map((team) => (
            <div
              key={team.id}
              style={{
                backgroundColor: '#fff',
                border: '1px solid #e0e0e0',
                borderRadius: 12,
                padding: 20,
                display: 'flex',
                flexDirection: 'column',
                gap: 12,
                transition: 'border-color 0.2s',
              }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.borderColor = '#fc4c02'; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor = '#e0e0e0'; }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 0 }}>
                  <div style={{
                    width: 44, height: 44, borderRadius: 10, flexShrink: 0,
                    background: team.avatarUrl ? 'transparent' : '#fc4c02',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 20, fontWeight: 700, color: '#fff', overflow: 'hidden',
                  }}>
                    {team.avatarUrl
                      ? <img src={team.avatarUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      : team.name[0]?.toUpperCase()}
                  </div>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <h3 style={{ margin: 0, fontWeight: 700, color: '#242424', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {team.name}
                    </h3>
                    {team.description && (
                      <p style={{ margin: '2px 0 0', fontSize: 13, color: '#666', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 1, WebkitBoxOrient: 'vertical' }}>
                        {team.description}
                      </p>
                    )}
                  </div>
                </div>
                {!team.isPublic && (
                  <span style={{
                    flexShrink: 0,
                    backgroundColor: '#eef0f4',
                    padding: '2px 8px',
                    borderRadius: 4,
                    fontSize: 10,
                    color: '#999',
                  }}>
                    Приватный
                  </span>
                )}
              </div>

              <div style={{ display: 'flex', gap: 16, fontSize: 14, color: '#999' }}>
                <span>
                  <span style={{ fontWeight: 600, color: '#242424' }}>{team.memberCount ?? 0}</span> участников
                </span>
                <span>
                  <span style={{ fontWeight: 600, color: '#242424' }}>
                    {(team.totalDistance ?? 0).toFixed(1)}
                  </span>{' '}км
                </span>
              </div>

              {/* Members preview */}
              {team.members && team.members.length > 0 && (
                <div style={{ display: 'flex' }}>
                  {team.members.slice(0, 5).map((member, idx) => (
                    <div
                      key={member.id}
                      title={member.user.username ?? '?'}
                      style={{
                        width: 28,
                        height: 28,
                        borderRadius: '50%',
                        backgroundColor: '#e0e0e0',
                        border: '2px solid #fff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 10,
                        color: '#242424',
                        fontWeight: 600,
                        marginLeft: idx > 0 ? -8 : 0,
                        overflow: 'hidden',
                      }}
                    >
                      {member.user.avatarUrl ? (
                        <img src={member.user.avatarUrl} alt="" style={{ width: 28, height: 28, borderRadius: '50%', objectFit: 'cover' }} />
                      ) : (
                        (member.user.username ?? '?').charAt(0).toUpperCase()
                      )}
                    </div>
                  ))}
                  {team.members.length > 5 && (
                    <div style={{
                      width: 28,
                      height: 28,
                      borderRadius: '50%',
                      backgroundColor: '#eef0f4',
                      border: '2px solid #fff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 10,
                      color: '#999',
                      marginLeft: -8,
                    }}>
                      +{team.members.length - 5}
                    </div>
                  )}
                </div>
              )}

              {/* Action button */}
              <div>
                {isMember(team) ? (
                  <span style={{ fontSize: 14, fontWeight: 500, color: '#1a7f37' }}>
                    Вы участник ✓
                  </span>
                ) : team.isPublic ? (
                  <button
                    onClick={() => handleJoin(team.id)}
                    style={{
                      padding: '6px 16px',
                      backgroundColor: 'rgba(252,76,2,0.1)',
                      color: '#fc4c02',
                      border: 'none',
                      borderRadius: 8,
                      fontSize: 14,
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    Вступить
                  </button>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      )}

    </div>
  );
}
