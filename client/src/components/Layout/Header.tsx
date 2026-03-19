import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/services/api';

export type TabId = 'feed' | 'events' | 'activities' | 'teams' | 'leaderboard' | 'community' | 'messages' | 'profile' | 'admin';

const tabs: { id: TabId; label: string; short: string; icon: string; adminOnly?: boolean; authOnly?: boolean }[] = [
  { id: 'feed', label: 'Лента', short: 'Лент.', icon: '📰' },
  { id: 'events', label: 'События', short: 'Соб.', icon: '🏆' },
  { id: 'activities', label: 'Активности', short: 'Акт.', icon: '⚡', authOnly: true },
  { id: 'teams', label: 'Клубы', short: 'Клуб.', icon: '👥' },
  { id: 'leaderboard', label: 'Рейтинг', short: 'Рейт.', icon: '📊' },
  { id: 'community', label: 'Сообщество', short: 'Сооб.', icon: '🌍' },
  { id: 'messages', label: 'Сообщения', short: 'Сообщ.', icon: '💬', authOnly: true },
  { id: 'profile', label: 'Профиль', short: 'Проф.', icon: '👤', authOnly: true },
  { id: 'admin', label: 'Админ', short: 'Адм.', icon: '⚙️', adminOnly: true },
];

interface HeaderProps {
  activeTab: TabId;
  onTabChange: (tab: TabId) => void;
  onLoginClick: () => void;
  onRegisterClick: () => void;
}

export function Header({ activeTab, onTabChange, onLoginClick, onRegisterClick }: HeaderProps) {
  const { user, isAuthenticated, logout } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [w, setW] = useState(typeof window !== 'undefined' ? window.innerWidth : 1200);
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifications, setNotifications] = useState<{ id: string; type: string; text: string; isRead: boolean; createdAt: string; fromUser?: { id: string; username: string; avatarUrl?: string } }[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const notifRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onResize = () => setW(window.innerWidth);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const isMobile = w < 768;
  const isTablet = w >= 768 && w < 1100;

  const visible = tabs.filter(t => {
    if (t.adminOnly && user?.role !== 'ADMIN') return false;
    if (t.authOnly && !isAuthenticated) return false;
    return true;
  });

  const go = useCallback((id: TabId) => { onTabChange(id); setMobileOpen(false); }, [onTabChange]);

  const loadNotifications = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      const res = await api.notifications.list();
      setNotifications(res.notifications);
      setUnreadCount(res.unreadCount);
    } catch {}
  }, [isAuthenticated]);

  useEffect(() => {
    loadNotifications();
    const interval = setInterval(loadNotifications, 30000);
    return () => clearInterval(interval);
  }, [loadNotifications]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setNotifOpen(false);
      }
    };
    if (notifOpen) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [notifOpen]);

  const handleOpenNotif = async () => {
    setNotifOpen(o => !o);
    if (!notifOpen && unreadCount > 0) {
      try {
        await api.notifications.readAll();
        setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
        setUnreadCount(0);
      } catch {}
    }
  };

  function timeAgo(dateStr: string) {
    const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
    if (diff < 60) return 'только что';
    if (diff < 3600) return `${Math.floor(diff / 60)} мин назад`;
    if (diff < 86400) return `${Math.floor(diff / 3600)} ч назад`;
    return `${Math.floor(diff / 86400)} дн назад`;
  }

  return (
    <header style={{
      position: 'sticky', top: 0, zIndex: 50,
      background: 'rgba(255,255,255,0.95)',
      backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
      borderBottom: '1px solid #f0f0f0',
      boxShadow: '0 1px 12px rgba(0,0,0,0.04)',
    }}>
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: isMobile ? '0 12px' : '0 24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', height: isMobile ? 56 : 64, gap: isMobile ? 8 : 16 }}>

          {/* Logo */}
          <button onClick={() => go('feed')} style={{
            display: 'flex', alignItems: 'center', gap: 8, background: 'none',
            border: 'none', cursor: 'pointer', padding: 0, flexShrink: 0,
          }}>
            <div style={{
              width: 36, height: 36, borderRadius: 10, flexShrink: 0,
              background: 'linear-gradient(135deg, #fc4c02, #ff6b2b)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 2px 8px rgba(252,76,2,0.25)',
            }}>
              <svg viewBox="0 0 24 24" style={{ width: 20, height: 20, color: '#fff' }} fill="currentColor">
                <path d="M13.5 5.5C13.5 6.88 12.38 8 11 8c-1.38 0-2.5-1.12-2.5-2.5S9.62 3 11 3c1.38 0 2.5 1.12 2.5 2.5zM9.89 19.38l1-4.38L13 17v6h2v-7.5l-2.11-2 .61-3A8.27 8.27 0 0 0 19 13h2V11h-2a6.74 6.74 0 0 1-4.89-2.11l-1-1.22C12.78 7.28 12.28 7 11.72 7c-.28 0-.56.07-.82.22L6 10l1 1.73L10 10l-1.11 5.38L5 13v2l4.89 4.38z"/>
              </svg>
            </div>
            {!isMobile && (
              <span style={{ fontSize: 18, fontWeight: 800, color: '#242424', letterSpacing: -0.5, whiteSpace: 'nowrap' }}>
                Sport<span style={{ color: '#fc4c02' }}>Run</span>
              </span>
            )}
          </button>

          {/* Desktop/Tablet nav */}
          {!isMobile && (
            <nav style={{
              display: 'flex', alignItems: 'center', gap: 2, flex: 1,
              overflow: 'hidden', minWidth: 0,
            }}>
              {visible.map(tab => {
                const isActive = activeTab === tab.id;
                return (
                  <button key={tab.id} onClick={() => go(tab.id)}
                    title={tab.label}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 4,
                      padding: isTablet ? '6px 8px' : '8px 12px',
                      borderRadius: 8, border: 'none', cursor: 'pointer',
                      fontSize: isTablet ? 12 : 13, fontWeight: 600, whiteSpace: 'nowrap',
                      background: isActive ? '#fff4ef' : 'transparent',
                      color: isActive ? '#fc4c02' : '#888',
                      transition: 'all 0.15s', flexShrink: 0,
                    }}>
                    <span style={{ fontSize: isTablet ? 14 : 13 }}>{tab.icon}</span>
                    {isTablet ? null : tab.label}
                  </button>
                );
              })}
            </nav>
          )}

          {/* Spacer on mobile */}
          {isMobile && <div style={{ flex: 1 }} />}

          {/* User section */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
            {isAuthenticated && user ? (
              <>
                {/* Notification Bell */}
                <div ref={notifRef} style={{ position: 'relative' }}>
                  <button
                    onClick={handleOpenNotif}
                    style={{
                      width: 36, height: 36, borderRadius: 10, border: 'none',
                      background: notifOpen ? '#fff4ef' : 'none',
                      cursor: 'pointer', display: 'flex', alignItems: 'center',
                      justifyContent: 'center', position: 'relative', flexShrink: 0,
                    }}
                    title="Уведомления"
                  >
                    <svg style={{ width: 20, height: 20, color: '#666' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                    </svg>
                    {unreadCount > 0 && (
                      <span style={{
                        position: 'absolute', top: 4, right: 4,
                        width: 16, height: 16, borderRadius: '50%',
                        background: '#fc4c02', color: '#fff',
                        fontSize: 10, fontWeight: 800,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}>
                        {unreadCount > 9 ? '9+' : unreadCount}
                      </span>
                    )}
                  </button>

                  {/* Dropdown */}
                  {notifOpen && (
                    <div style={{
                      position: 'absolute', top: 44, right: 0,
                      width: 320, maxHeight: 400, overflowY: 'auto',
                      background: '#fff', borderRadius: 14,
                      boxShadow: '0 8px 32px rgba(0,0,0,0.15)',
                      border: '1px solid #f0f0f0', zIndex: 1000,
                    }}>
                      <div style={{ padding: '12px 16px', borderBottom: '1px solid #f0f0f0', fontSize: 14, fontWeight: 700, color: '#242424' }}>
                        Уведомления
                      </div>
                      {notifications.length === 0 ? (
                        <div style={{ padding: '24px 16px', textAlign: 'center', color: '#999', fontSize: 13 }}>
                          Нет уведомлений
                        </div>
                      ) : notifications.map(n => (
                        <div key={n.id} style={{
                          display: 'flex', alignItems: 'flex-start', gap: 10,
                          padding: '10px 16px',
                          background: n.isRead ? '#fff' : '#fff8f5',
                          borderBottom: '1px solid #f8f8f8',
                        }}>
                          <div style={{
                            width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
                            background: n.fromUser?.avatarUrl ? 'none' : 'linear-gradient(135deg, #fc4c02, #ff6b2b)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: 14, color: '#fff', fontWeight: 700, overflow: 'hidden',
                          }}>
                            {n.fromUser?.avatarUrl
                              ? <img src={n.fromUser.avatarUrl} alt="" style={{ width: 36, height: 36, objectFit: 'cover', borderRadius: '50%' }} />
                              : (n.fromUser?.username?.[0] ?? '?').toUpperCase()}
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 13, color: '#242424', lineHeight: 1.4 }}>{n.text}</div>
                            <div style={{ fontSize: 11, color: '#aaa', marginTop: 3 }}>{timeAgo(n.createdAt)}</div>
                          </div>
                          {!n.isRead && (
                            <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#fc4c02', flexShrink: 0, marginTop: 4 }} />
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <button onClick={() => go('profile')} style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  background: 'none', border: 'none', cursor: 'pointer', padding: 4,
                  borderRadius: 10, flexShrink: 0,
                }}>
                  <div style={{
                    width: 36, height: 36, minWidth: 36, borderRadius: '50%', flexShrink: 0,
                    background: user.avatarUrl ? 'none' : 'linear-gradient(135deg, #fc4c02, #ff6b2b)',
                    color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 14, fontWeight: 700, overflow: 'hidden',
                    boxShadow: '0 1px 4px rgba(0,0,0,0.1)',
                  }}>
                    {user.avatarUrl
                      ? <img src={user.avatarUrl} alt="" style={{ width: 36, height: 36, borderRadius: '50%', objectFit: 'cover' }} />
                      : (user.username ?? '?')[0].toUpperCase()}
                  </div>
                  {!isMobile && (
                    <div style={{ textAlign: 'left', flexShrink: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: '#242424', lineHeight: 1.2 }}>
                        {user.username ?? '—'}
                      </div>
                      <div style={{ fontSize: 11, color: '#aaa', lineHeight: 1.2 }}>
                        Ур. {user.level ?? 0} · {user.xp ?? 0} XP
                      </div>
                    </div>
                  )}
                </button>
                <button onClick={logout} title="Выйти" style={{
                  width: 32, height: 32, minWidth: 32, borderRadius: 8, flexShrink: 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: 'none', border: '1px solid #eee', cursor: 'pointer', color: '#ccc',
                }}>
                  <svg style={{ width: 16, height: 16 }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                </button>
              </>
            ) : (
              <>
                {!isMobile && (
                  <button onClick={onLoginClick} style={{
                    padding: '7px 16px', fontSize: 13, fontWeight: 600, color: '#666',
                    background: 'none', border: '1px solid #e0e0e0', borderRadius: 8, cursor: 'pointer',
                  }}>Войти</button>
                )}
                <button onClick={onRegisterClick} style={{
                  padding: '7px 16px', fontSize: 13, fontWeight: 700, color: '#fff',
                  background: 'linear-gradient(135deg, #fc4c02, #ff6b2b)',
                  border: 'none', borderRadius: 8, cursor: 'pointer',
                  boxShadow: '0 2px 8px rgba(252,76,2,0.2)',
                }}>
                  {isMobile ? 'Войти' : 'Регистрация'}
                </button>
              </>
            )}

            {/* Mobile hamburger */}
            {isMobile && (
              <button onClick={() => setMobileOpen(!mobileOpen)} style={{
                width: 36, height: 36, minWidth: 36, borderRadius: 8, flexShrink: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: mobileOpen ? '#f5f5f5' : 'none', border: 'none', cursor: 'pointer', color: '#666',
              }}>
                <svg style={{ width: 20, height: 20 }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  {mobileOpen
                    ? <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    : <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />}
                </svg>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {isMobile && mobileOpen && (
        <div style={{
          borderTop: '1px solid #f0f0f0', background: '#fff',
          padding: '8px 12px', maxHeight: '60vh', overflowY: 'auto',
        }}>
          {visible.map(tab => (
            <button key={tab.id} onClick={() => go(tab.id)} style={{
              display: 'flex', alignItems: 'center', gap: 10, width: '100%',
              padding: '12px 12px', borderRadius: 10, border: 'none', cursor: 'pointer',
              fontSize: 15, fontWeight: 600, textAlign: 'left',
              background: activeTab === tab.id ? '#fff4ef' : 'transparent',
              color: activeTab === tab.id ? '#fc4c02' : '#555',
              marginBottom: 2,
            }}>
              <span style={{ fontSize: 18 }}>{tab.icon}</span>
              {tab.label}
            </button>
          ))}
          {!isAuthenticated && (
            <button onClick={onLoginClick} style={{
              display: 'flex', alignItems: 'center', gap: 10, width: '100%',
              padding: '12px 12px', borderRadius: 10, border: 'none', cursor: 'pointer',
              fontSize: 15, fontWeight: 600, color: '#fc4c02', background: '#fff4ef',
              marginTop: 8,
            }}>
              Войти в аккаунт
            </button>
          )}
        </div>
      )}
    </header>
  );
}
