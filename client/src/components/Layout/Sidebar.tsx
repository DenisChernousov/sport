import { useCallback, useEffect, useRef, useState } from 'react';
import type { TabId } from './Header';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/services/api';

const NAV = [
  { id: 'feed' as TabId, icon: '🏠', label: 'Лента' },
  { id: 'events' as TabId, icon: '🏆', label: 'События' },
  { id: 'activities' as TabId, icon: '⚡', label: 'Активности', authOnly: true },
  { id: 'teams' as TabId, icon: '👥', label: 'Клубы' },
  { id: 'leaderboard' as TabId, icon: '📊', label: 'Рейтинг' },
  { id: 'community' as TabId, icon: '🌍', label: 'Сообщество' },
  { id: 'messages' as TabId, icon: '💬', label: 'Сообщения', authOnly: true },
  { id: 'profile' as TabId, icon: '👤', label: 'Профиль', authOnly: true },
];

interface Props {
  activeTab: TabId;
  onTabChange: (tab: TabId) => void;
  onLoginClick: () => void;
  onAddActivity: () => void;
}

export function Sidebar({ activeTab, onTabChange, onLoginClick, onAddActivity }: Props) {
  const { user, isAuthenticated, logout } = useAuth();
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifications, setNotifications] = useState<{ id: string; text: string; isRead: boolean; createdAt: string; fromUser?: { username: string; avatarUrl?: string } }[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const notifRef = useRef<HTMLDivElement>(null);

  const loadNotifs = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      const res = await api.notifications.list();
      setNotifications(res.notifications);
      setUnreadCount(res.unreadCount);
    } catch {}
  }, [isAuthenticated]);

  useEffect(() => {
    loadNotifs();
    const t = setInterval(loadNotifs, 30000);
    return () => clearInterval(t);
  }, [loadNotifs]);

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) setNotifOpen(false);
    };
    if (notifOpen) document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [notifOpen]);

  const handleNotifOpen = async () => {
    setNotifOpen(o => !o);
    if (!notifOpen && unreadCount > 0) {
      await api.notifications.readAll().catch(() => {});
      setNotifications(p => p.map(n => ({ ...n, isRead: true })));
      setUnreadCount(0);
    }
  };

  function timeAgo(d: string) {
    const s = Math.floor((Date.now() - new Date(d).getTime()) / 1000);
    if (s < 60) return 'только что';
    if (s < 3600) return `${Math.floor(s / 60)} мин`;
    if (s < 86400) return `${Math.floor(s / 3600)} ч`;
    return `${Math.floor(s / 86400)} дн`;
  }

  const visible = NAV.filter(n => !n.authOnly || isAuthenticated);

  return (
    <aside style={{
      position: 'fixed', top: 0, left: 0, bottom: 0, width: 240,
      background: '#fff',
      borderRight: '1px solid #f0f0f0',
      display: 'flex', flexDirection: 'column',
      zIndex: 100,
      overflowY: 'auto',
    }}>
      {/* Logo */}
      <div style={{ padding: '20px 20px 16px' }}>
        <button onClick={() => onTabChange('feed')} style={{
          display: 'flex', alignItems: 'center', gap: 10,
          background: 'none', border: 'none', cursor: 'pointer', padding: 0,
        }}>
          <div style={{
            width: 38, height: 38, borderRadius: 12, flexShrink: 0,
            background: 'linear-gradient(135deg, #fc4c02, #ff7c3a)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 4px 12px rgba(252,76,2,0.3)',
          }}>
            <svg viewBox="0 0 24 24" style={{ width: 22, height: 22, color: '#fff' }} fill="currentColor">
              <path d="M13.5 5.5C13.5 6.88 12.38 8 11 8c-1.38 0-2.5-1.12-2.5-2.5S9.62 3 11 3c1.38 0 2.5 1.12 2.5 2.5zM9.89 19.38l1-4.38L13 17v6h2v-7.5l-2.11-2 .61-3A8.27 8.27 0 0 0 19 13h2V11h-2a6.74 6.74 0 0 1-4.89-2.11l-1-1.22C12.78 7.28 12.28 7 11.72 7c-.28 0-.56.07-.82.22L6 10l1 1.73L10 10l-1.11 5.38L5 13v2l4.89 4.38z"/>
            </svg>
          </div>
          <span style={{ fontSize: 20, fontWeight: 900, letterSpacing: -0.5, color: '#1a1a1a' }}>
            Sport<span style={{ color: '#fc4c02' }}>Run</span>
          </span>
        </button>
      </div>

      {/* Add Activity */}
      {isAuthenticated && (
        <div style={{ padding: '0 16px 16px' }}>
          <button
            onClick={onAddActivity}
            style={{
              width: '100%', padding: '11px 0', borderRadius: 14, border: 'none',
              background: 'linear-gradient(135deg, #fc4c02, #ff7c3a)',
              color: '#fff', fontSize: 14, fontWeight: 800, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              boxShadow: '0 4px 14px rgba(252,76,2,0.35)',
              transition: 'transform 0.15s, box-shadow 0.15s',
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(-1px)'; (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 6px 18px rgba(252,76,2,0.45)'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.transform = ''; (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 4px 14px rgba(252,76,2,0.35)'; }}
          >
            <span style={{ fontSize: 18 }}>+</span> Добавить активность
          </button>
        </div>
      )}

      {/* Nav items */}
      <nav style={{ flex: 1, padding: '0 10px' }}>
        {visible.map(item => {
          const active = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              style={{
                width: '100%', display: 'flex', alignItems: 'center', gap: 12,
                padding: '11px 14px', borderRadius: 12, border: 'none', cursor: 'pointer',
                marginBottom: 2,
                background: active ? '#fff4ef' : 'transparent',
                color: active ? '#fc4c02' : '#555',
                fontSize: 15, fontWeight: active ? 700 : 500,
                transition: 'all 0.15s',
                textAlign: 'left',
                position: 'relative',
              }}
              onMouseEnter={e => { if (!active) (e.currentTarget as HTMLButtonElement).style.background = '#f5f5f5'; }}
              onMouseLeave={e => { if (!active) (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; }}
            >
              <span style={{ fontSize: 20, width: 24, textAlign: 'center', flexShrink: 0 }}>{item.icon}</span>
              {item.label}
              {item.id === 'messages' && unreadCount > 0 && (
                <span style={{
                  marginLeft: 'auto', minWidth: 20, height: 20, borderRadius: 10,
                  background: '#fc4c02', color: '#fff', fontSize: 11, fontWeight: 800,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 5px',
                }}>
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>
          );
        })}

        {/* Notifications */}
        {isAuthenticated && (
          <div ref={notifRef} style={{ position: 'relative' }}>
            <button
              onClick={handleNotifOpen}
              style={{
                width: '100%', display: 'flex', alignItems: 'center', gap: 12,
                padding: '11px 14px', borderRadius: 12, border: 'none', cursor: 'pointer',
                marginBottom: 2,
                background: notifOpen ? '#fff4ef' : 'transparent',
                color: notifOpen ? '#fc4c02' : '#555',
                fontSize: 15, fontWeight: notifOpen ? 700 : 500,
                transition: 'all 0.15s', textAlign: 'left',
              }}
              onMouseEnter={e => { if (!notifOpen) (e.currentTarget as HTMLButtonElement).style.background = '#f5f5f5'; }}
              onMouseLeave={e => { if (!notifOpen) (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; }}
            >
              <span style={{ fontSize: 20, width: 24, textAlign: 'center', flexShrink: 0 }}>🔔</span>
              Уведомления
              {unreadCount > 0 && (
                <span style={{
                  marginLeft: 'auto', minWidth: 20, height: 20, borderRadius: 10,
                  background: '#fc4c02', color: '#fff', fontSize: 11, fontWeight: 800,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 5px',
                }}>
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>

            {notifOpen && (
              <div style={{
                position: 'absolute', left: '100%', bottom: 0, marginLeft: 8,
                width: 300, maxHeight: 380, overflowY: 'auto',
                background: '#fff', borderRadius: 16,
                boxShadow: '0 8px 32px rgba(0,0,0,0.15)',
                border: '1px solid #f0f0f0', zIndex: 200,
              }}>
                <div style={{ padding: '12px 16px', borderBottom: '1px solid #f0f0f0', fontSize: 14, fontWeight: 700 }}>
                  Уведомления
                </div>
                {notifications.length === 0 ? (
                  <div style={{ padding: 24, textAlign: 'center', color: '#aaa', fontSize: 13 }}>Нет уведомлений</div>
                ) : notifications.map(n => (
                  <div key={n.id} style={{
                    display: 'flex', gap: 10, padding: '10px 14px',
                    background: n.isRead ? '#fff' : '#fff8f5',
                    borderBottom: '1px solid #f8f8f8',
                  }}>
                    <div style={{
                      width: 34, height: 34, borderRadius: '50%', flexShrink: 0,
                      background: 'linear-gradient(135deg, #fc4c02, #ff7c3a)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 13, color: '#fff', fontWeight: 700, overflow: 'hidden',
                    }}>
                      {n.fromUser?.avatarUrl
                        ? <img src={n.fromUser.avatarUrl} alt="" style={{ width: 34, height: 34, objectFit: 'cover', borderRadius: '50%' }} />
                        : (n.fromUser?.username?.[0] ?? '🔔').toUpperCase()}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, color: '#1a1a1a', lineHeight: 1.4 }}>{n.text}</div>
                      <div style={{ fontSize: 11, color: '#aaa', marginTop: 2 }}>{timeAgo(n.createdAt)}</div>
                    </div>
                    {!n.isRead && <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#fc4c02', marginTop: 4, flexShrink: 0 }} />}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </nav>

      {/* User section at bottom */}
      <div style={{ padding: '12px 10px', borderTop: '1px solid #f0f0f0' }}>
        {isAuthenticated && user ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', borderRadius: 12, background: '#fafafa' }}>
            <div style={{
              width: 38, height: 38, borderRadius: '50%', flexShrink: 0, overflow: 'hidden',
              background: user.avatarUrl ? 'none' : 'linear-gradient(135deg, #fc4c02, #ff7c3a)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 16, color: '#fff', fontWeight: 700,
            }}>
              {user.avatarUrl
                ? <img src={user.avatarUrl} alt="" style={{ width: 38, height: 38, objectFit: 'cover' }} />
                : (user.username ?? '?')[0].toUpperCase()}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#1a1a1a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {user.username}
              </div>
              <div style={{ fontSize: 11, color: '#fc4c02', fontWeight: 600 }}>
                Ур. {user.level ?? 1} · {user.xp ?? 0} XP
              </div>
            </div>
            <button onClick={logout} title="Выйти" style={{
              width: 30, height: 30, borderRadius: 8, border: 'none', background: 'none',
              cursor: 'pointer', color: '#ccc', display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
            }}>
              <svg style={{ width: 16, height: 16 }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </button>
          </div>
        ) : (
          <button onClick={onLoginClick} style={{
            width: '100%', padding: '10px 0', borderRadius: 12, border: '1.5px solid #fc4c02',
            background: '#fff', color: '#fc4c02', fontSize: 14, fontWeight: 700, cursor: 'pointer',
          }}>
            Войти / Регистрация
          </button>
        )}
      </div>
    </aside>
  );
}
