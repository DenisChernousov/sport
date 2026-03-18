import { lazy, Suspense, useCallback, useEffect, useState } from 'react';
import type { Team } from '@/types';
import { api } from '@/services/api';
import { useAuth } from '@/context/AuthContext';

const BattlesSection = lazy(() => import('@/components/Battles/BattlesSection'));

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

  const isMember = (team: Team) => {
    if (!user) return false;
    if (team.ownerId === user.id) return true;
    return team.members?.some((m) => m.userId === user.id) ?? false;
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Header */}
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: '#242424', margin: 0 }}>Клубы</h1>
        <div style={{ display: 'flex', gap: 8 }}>
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
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <span style={{ fontSize: 12, fontWeight: 600, color: '#fc4c02', textTransform: 'uppercase', letterSpacing: 1 }}>
                Мой клуб
              </span>
              <h2 style={{ margin: '4px 0 0', fontSize: 20, fontWeight: 700, color: '#242424' }}>{myTeam.name}</h2>
              {myTeam.description && (
                <p style={{ margin: '4px 0 0', fontSize: 14, color: '#666' }}>{myTeam.description}</p>
              )}
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
              }}
            >
              Покинуть
            </button>
          </div>

          <div style={{ display: 'flex', gap: 24, fontSize: 14 }}>
            <div>
              <span style={{ color: '#999' }}>Участников: </span>
              <span style={{ fontWeight: 600, color: '#242424' }}>{myTeam.memberCount ?? 0}</span>
            </div>
            <div>
              <span style={{ color: '#999' }}>Общая дистанция: </span>
              <span style={{ fontWeight: 600, color: '#242424' }}>
                {((myTeam.totalDistance ?? 0) / 1000).toFixed(1)} км
              </span>
            </div>
          </div>

          {/* Invite code */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 14, color: '#999' }}>Код приглашения:</span>
            <code style={{
              backgroundColor: '#eef0f4',
              padding: '4px 12px',
              borderRadius: 6,
              fontSize: 14,
              fontFamily: 'monospace',
              color: '#fc4c02',
              fontWeight: 600,
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

          {/* Members list */}
          {myTeam.members && myTeam.members.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <h4 style={{ margin: 0, fontSize: 14, fontWeight: 500, color: '#999' }}>Участники</h4>
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
                    <span style={{ fontSize: 14, color: '#242424' }}>{member.user.username ?? '?'}</span>
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
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16 }}>
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
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16 }}>
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
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <h3 style={{ margin: 0, fontWeight: 700, color: '#242424', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {team.name}
                  </h3>
                  {team.description && (
                    <p style={{ margin: '4px 0 0', fontSize: 14, color: '#666', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                      {team.description}
                    </p>
                  )}
                </div>
                {!team.isPublic && (
                  <span style={{
                    marginLeft: 8,
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
                    {((team.totalDistance ?? 0) / 1000).toFixed(1)}
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

      {/* Battles Section */}
      {user && (
        <Suspense fallback={null}>
          <BattlesSection />
        </Suspense>
      )}
    </div>
  );
}
