import { useCallback, useEffect, useRef, useState } from 'react';
import type { TabId } from './Header';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/services/api';

interface Props {
  activeTab: TabId;
  onTabChange: (tab: TabId) => void;
  onLoginClick: () => void;
  onRegisterClick: () => void;
}

export function TopBar({ onTabChange, onLoginClick, onRegisterClick }: Props) {
  const { user, isAuthenticated } = useAuth();
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

  return (
    <header style={{
      position: 'fixed', top: 0, left: 0, right: 0, height: 56,
      background: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(12px)',
      borderBottom: '1px solid #f0f0f0',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '0 16px', zIndex: 100,
    }}>
      {/* Logo */}
      <button onClick={() => onTabChange('feed')} style={{
        display: 'flex', alignItems: 'center', gap: 8,
        background: 'none', border: 'none', cursor: 'pointer', padding: 0,
      }}>
        <div style={{
          width: 32, height: 32, borderRadius: 10,
          background: 'linear-gradient(135deg, #fc4c02, #ff7c3a)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 2px 8px rgba(252,76,2,0.3)',
        }}>
          <svg viewBox="0 0 24 24" style={{ width: 18, height: 18, color: '#fff' }} fill="currentColor">
            <path d="M13.5 5.5C13.5 6.88 12.38 8 11 8c-1.38 0-2.5-1.12-2.5-2.5S9.62 3 11 3c1.38 0 2.5 1.12 2.5 2.5zM9.89 19.38l1-4.38L13 17v6h2v-7.5l-2.11-2 .61-3A8.27 8.27 0 0 0 19 13h2V11h-2a6.74 6.74 0 0 1-4.89-2.11l-1-1.22C12.78 7.28 12.28 7 11.72 7c-.28 0-.56.07-.82.22L6 10l1 1.73L10 10l-1.11 5.38L5 13v2l4.89 4.38z"/>
          </svg>
        </div>
        <span style={{ fontSize: 17, fontWeight: 900, color: '#1a1a1a', letterSpacing: -0.3 }}>
          Sport<span style={{ color: '#fc4c02' }}>Run</span>
        </span>
      </button>

      {/* Right: notif + auth */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        {isAuthenticated ? (
          <>
            <div ref={notifRef} style={{ position: 'relative' }}>
              <button onClick={handleNotifOpen} style={{
                width: 36, height: 36, borderRadius: 10, border: 'none',
                background: notifOpen ? '#fff4ef' : '#f5f5f5',
                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                position: 'relative',
              }}>
                <svg style={{ width: 18, height: 18, color: '#555' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
                {unreadCount > 0 && (
                  <span style={{
                    position: 'absolute', top: 4, right: 4,
                    width: 14, height: 14, borderRadius: '50%',
                    background: '#fc4c02', color: '#fff', fontSize: 9, fontWeight: 800,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>

              {notifOpen && (
                <div style={{
                  position: 'absolute', top: 44, right: 0,
                  width: 280, maxHeight: 340, overflowY: 'auto',
                  background: '#fff', borderRadius: 14,
                  boxShadow: '0 8px 32px rgba(0,0,0,0.15)',
                  border: '1px solid #f0f0f0', zIndex: 200,
                }}>
                  <div style={{ padding: '10px 14px', borderBottom: '1px solid #f0f0f0', fontSize: 13, fontWeight: 700 }}>
                    Уведомления
                  </div>
                  {notifications.length === 0 ? (
                    <div style={{ padding: 20, textAlign: 'center', color: '#aaa', fontSize: 12 }}>Нет уведомлений</div>
                  ) : notifications.map(n => (
                    <div key={n.id} style={{
                      display: 'flex', gap: 8, padding: '8px 12px',
                      background: n.isRead ? '#fff' : '#fff8f5',
                      borderBottom: '1px solid #f8f8f8',
                    }}>
                      <div style={{
                        width: 30, height: 30, borderRadius: '50%', flexShrink: 0,
                        background: 'linear-gradient(135deg, #fc4c02, #ff7c3a)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 11, color: '#fff', fontWeight: 700, overflow: 'hidden',
                      }}>
                        {n.fromUser?.avatarUrl
                          ? <img src={n.fromUser.avatarUrl} alt="" style={{ width: 30, height: 30, objectFit: 'cover', borderRadius: '50%' }} />
                          : (n.fromUser?.username?.[0] ?? '🔔').toUpperCase()}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 12, color: '#1a1a1a', lineHeight: 1.4 }}>{n.text}</div>
                        <div style={{ fontSize: 10, color: '#aaa', marginTop: 1 }}>{timeAgo(n.createdAt)}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <button onClick={() => onTabChange('profile')} style={{
              width: 36, height: 36, borderRadius: '50%', border: '2px solid #fc4c02',
              overflow: 'hidden', background: 'none', cursor: 'pointer', padding: 0, flexShrink: 0,
            }}>
              {user?.avatarUrl
                ? <img src={user.avatarUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                : <div style={{ width: '100%', height: '100%', background: 'linear-gradient(135deg, #fc4c02, #ff7c3a)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 700, color: '#fff' }}>
                    {(user?.username ?? '?')[0].toUpperCase()}
                  </div>}
            </button>
          </>
        ) : (
          <>
            <button onClick={onLoginClick} style={{
              padding: '6px 14px', borderRadius: 8, border: '1px solid #e0e0e0',
              background: '#fff', color: '#555', fontSize: 13, fontWeight: 600, cursor: 'pointer',
            }}>Войти</button>
            <button onClick={onRegisterClick} style={{
              padding: '6px 14px', borderRadius: 8, border: 'none',
              background: '#fc4c02', color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer',
            }}>Регистрация</button>
          </>
        )}
      </div>
    </header>
  );
}
