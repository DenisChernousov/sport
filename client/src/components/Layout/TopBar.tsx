import { useCallback, useEffect, useRef, useState } from 'react';
import type { TabId } from './Header';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { api } from '@/services/api';

interface SearchResult {
  type: 'user' | 'event';
  id: string;
  title: string;
  subtitle?: string;
  avatarUrl?: string;
}

interface Props {
  activeTab: TabId;
  onTabChange: (tab: TabId) => void;
  onLoginClick: () => void;
  onRegisterClick: () => void;
}

export function TopBar({ onTabChange, onLoginClick, onRegisterClick }: Props) {
  const { user, isAuthenticated } = useAuth();
  const { preset, primary } = useTheme();
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifications, setNotifications] = useState<{ id: string; type: string; text: string; isRead: boolean; createdAt: string; fromUserId?: string | null; entityId?: string | null; fromUser?: { id?: string; username: string; avatarUrl?: string } }[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const notifRef = useRef<HTMLDivElement>(null);

  // Search
  const [query, setQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) setSearchOpen(false);
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  const handleSearch = (q: string) => {
    setQuery(q);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    if (!q.trim()) { setSearchResults([]); setSearchOpen(false); return; }
    setSearchLoading(true);
    setSearchOpen(true);
    searchTimer.current = setTimeout(async () => {
      try {
        const [users, events] = await Promise.all([
          api.social.searchUsers({ q }).catch(() => []),
          api.events.list({ limit: 10 } as Parameters<typeof api.events.list>[0]).catch(() => ({ items: [] })),
        ]);
        const results: SearchResult[] = [
          ...(Array.isArray(users) ? users : []).slice(0, 4).map((u: { id: string; username: string; city?: string; avatarUrl?: string }) => ({
            type: 'user' as const,
            id: u.id,
            title: u.username,
            subtitle: u.city ?? 'Спортсмен',
            avatarUrl: u.avatarUrl,
          })),
          ...(events.items ?? [])
            .filter((e: { title: string }) => e.title.toLowerCase().includes(q.toLowerCase()))
            .slice(0, 3)
            .map((e: { id: string; title: string; sport?: string }) => ({
              type: 'event' as const,
              id: e.id,
              title: e.title,
              subtitle: e.sport ?? 'Событие',
            })),
        ];
        setSearchResults(results);
      } catch {}
      finally { setSearchLoading(false); }
    }, 300);
  };

  const handleSelectResult = (r: SearchResult) => {
    setQuery('');
    setSearchOpen(false);
    if (r.type === 'user') {
      window.dispatchEvent(new CustomEvent('open-profile', { detail: { userId: r.id } }));
    } else {
      onTabChange('events');
    }
  };

  const handleNotifOpen = async () => {
    setNotifOpen(o => !o);
    if (!notifOpen && unreadCount > 0) {
      await api.notifications.readAll().catch(() => {});
      setNotifications(p => p.map(n => ({ ...n, isRead: true })));
      setUnreadCount(0);
    }
  };

  function handleNotifClick(n: typeof notifications[0]) {
    setNotifOpen(false);
    if (n.type === 'message' && n.fromUserId) {
      onTabChange('messages');
      window.dispatchEvent(new CustomEvent('open-messages-with', {
        detail: { userId: n.fromUserId, username: n.fromUser?.username ?? '', avatarUrl: n.fromUser?.avatarUrl, level: 1 },
      }));
    } else if ((n.type === 'follow' || n.type === 'like' || n.type === 'comment') && n.fromUserId) {
      window.dispatchEvent(new CustomEvent('open-profile', { detail: { userId: n.fromUserId } }));
    } else if (n.type === 'achievement') {
      onTabChange('profile');
    } else if (n.type === 'event_start' && n.entityId) {
      onTabChange('events');
    }
  }

  function timeAgo(d: string) {
    const s = Math.floor((Date.now() - new Date(d).getTime()) / 1000);
    if (s < 60) return 'только что';
    if (s < 3600) return `${Math.floor(s / 60)} мин`;
    if (s < 86400) return `${Math.floor(s / 3600)} ч`;
    return `${Math.floor(s / 86400)} дн`;
  }

  return (
    <header style={{
      position: 'fixed', top: 0, left: 0, right: 0, height: 52,
      background: preset.dark,
      borderBottom: `1px solid ${preset.secondary}66`,
      zIndex: 200,
      display: 'flex', alignItems: 'center',
    }}>
      <div style={{
        width: '100%', maxWidth: 1060, margin: '0 auto',
        padding: '0 16px', display: 'flex', alignItems: 'center', gap: 12, height: '100%',
      }}>
      {/* Logo */}
      <button onClick={() => onTabChange('feed')} style={{
        display: 'flex', alignItems: 'center', gap: 8,
        background: 'none', border: 'none', cursor: 'pointer', padding: 0, flexShrink: 0,
      }}>
        {preset.logoSvg ? (
          <div style={{ width: 34, height: 34, flexShrink: 0 }}
            dangerouslySetInnerHTML={{ __html: preset.logoSvg }}
          />
        ) : (
          <div style={{
            width: 30, height: 30, borderRadius: 9,
            background: `linear-gradient(135deg, ${primary}, ${primary}cc)`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <svg viewBox="0 0 24 24" style={{ width: 17, height: 17, color: '#fff' }} fill="currentColor">
              <path d="M13.5 5.5C13.5 6.88 12.38 8 11 8c-1.38 0-2.5-1.12-2.5-2.5S9.62 3 11 3c1.38 0 2.5 1.12 2.5 2.5zM9.89 19.38l1-4.38L13 17v6h2v-7.5l-2.11-2 .61-3A8.27 8.27 0 0 0 19 13h2V11h-2a6.74 6.74 0 0 1-4.89-2.11l-1-1.22C12.78 7.28 12.28 7 11.72 7c-.28 0-.56.07-.82.22L6 10l1 1.73L10 10l-1.11 5.38L5 13v2l4.89 4.38z"/>
            </svg>
          </div>
        )}
        <span style={{ fontSize: 15, fontWeight: 900, color: preset.light, letterSpacing: -0.3, lineHeight: 1.1 }}>
          Четыре <span style={{ color: primary }}>стихии</span>
        </span>
      </button>

      {/* Search */}
      <div ref={searchRef} style={{ flex: 1, maxWidth: 380, position: 'relative' }}>
        <div style={{ position: 'relative' }}>
          <svg style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', width: 15, height: 15, color: '#aaa', pointerEvents: 'none' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            value={query}
            onChange={e => handleSearch(e.target.value)}
            onFocus={() => query && setSearchOpen(true)}
            placeholder="Поиск людей, событий..."
            style={{
              width: '100%', height: 34, padding: '0 12px 0 32px',
              borderRadius: 20, border: '1px solid rgba(255,255,255,0.12)',
              background: 'rgba(255,255,255,0.08)', fontSize: 13, outline: 'none',
              boxSizing: 'border-box', color: preset.light,
              transition: 'border-color 0.15s, background 0.15s',
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLInputElement).style.borderColor = 'rgba(255,255,255,0.25)'; }}
            onMouseLeave={e => { if (document.activeElement !== e.currentTarget) (e.currentTarget as HTMLInputElement).style.borderColor = 'rgba(255,255,255,0.12)'; }}
          />
        </div>

        {searchOpen && (
          <div style={{
            position: 'absolute', top: 40, left: 0, right: 0,
            background: '#fff', borderRadius: 12,
            boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
            border: '1px solid #f0f0f0', zIndex: 300, overflow: 'hidden',
          }}>
            {searchLoading ? (
              <div style={{ padding: '12px 16px', color: '#999', fontSize: 13 }}>Поиск...</div>
            ) : searchResults.length === 0 ? (
              <div style={{ padding: '12px 16px', color: '#999', fontSize: 13 }}>Ничего не найдено</div>
            ) : searchResults.map(r => (
              <div
                key={r.type + r.id}
                onClick={() => handleSelectResult(r)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '9px 14px', cursor: 'pointer',
                  borderBottom: '1px solid #f8f8f8',
                  transition: 'background 0.1s',
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.background = '#f9f9f9'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.background = ''; }}
              >
                <div style={{
                  width: 32, height: 32, borderRadius: r.type === 'user' ? '50%' : 8,
                  background: r.avatarUrl ? 'none' : (r.type === 'user' ? 'linear-gradient(135deg, #fc4c02, #ff7c3a)' : 'linear-gradient(135deg, #6366f1, #818cf8)'),
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 12, color: '#fff', fontWeight: 700, overflow: 'hidden', flexShrink: 0,
                }}>
                  {r.avatarUrl
                    ? <img src={r.avatarUrl} alt="" style={{ width: 32, height: 32, objectFit: 'cover', borderRadius: 'inherit' }} />
                    : r.type === 'user' ? r.title[0].toUpperCase() : '🏆'}
                </div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#1a1a1a' }}>{r.title}</div>
                  <div style={{ fontSize: 11, color: '#999' }}>{r.subtitle}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Right icons */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginLeft: 'auto', flexShrink: 0 }}>
        {isAuthenticated ? (
          <>
            {/* Notifications */}
            <div ref={notifRef} style={{ position: 'relative' }}>
              <button onClick={handleNotifOpen} title="Уведомления" style={{
                width: 36, height: 36, borderRadius: 10, border: 'none',
                background: notifOpen ? 'rgba(204,43,43,0.15)' : 'transparent',
                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                position: 'relative', transition: 'background 0.15s',
              }}
                onMouseEnter={e => { if (!notifOpen) (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.08)'; }}
                onMouseLeave={e => { if (!notifOpen) (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; }}
              >
                <svg style={{ width: 19, height: 19, color: '#555' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
                {unreadCount > 0 && (
                  <span style={{
                    position: 'absolute', top: 4, right: 4,
                    minWidth: 14, height: 14, borderRadius: 7,
                    background: primary, color: '#fff', fontSize: 9, fontWeight: 800,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 2px',
                  }}>
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>

              {notifOpen && (
                <div style={{
                  position: 'absolute', top: 44, right: 0,
                  width: 300, maxHeight: 360, overflowY: 'auto',
                  background: '#fff', borderRadius: 14,
                  boxShadow: '0 8px 32px rgba(0,0,0,0.15)',
                  border: '1px solid #f0f0f0', zIndex: 300,
                }}>
                  <div style={{ padding: '10px 14px', borderBottom: '1px solid #f0f0f0', fontSize: 13, fontWeight: 700 }}>
                    Уведомления
                  </div>
                  {notifications.length === 0 ? (
                    <div style={{ padding: 20, textAlign: 'center', color: '#aaa', fontSize: 12 }}>Нет уведомлений</div>
                  ) : notifications.map(n => (
                    <div
                      key={n.id}
                      onClick={() => handleNotifClick(n)}
                      style={{
                        display: 'flex', gap: 8, padding: '8px 12px',
                        background: n.isRead ? '#fff' : '#fff8f5',
                        borderBottom: '1px solid #f8f8f8',
                        cursor: 'pointer', transition: 'background 0.1s',
                      }}
                      onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.background = '#f5f5f5'; }}
                      onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.background = n.isRead ? '#fff' : '#fff8f5'; }}
                    >
                      <div style={{
                        width: 30, height: 30, borderRadius: '50%', flexShrink: 0,
                        background: `linear-gradient(135deg, ${primary}, ${primary}bb)`,
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

            {/* Avatar → profile */}
            <button onClick={() => onTabChange('profile')} title="Профиль" style={{
              width: 34, height: 34, borderRadius: '50%', border: `2px solid ${primary}`,
              overflow: 'hidden', background: 'none', cursor: 'pointer', padding: 0, flexShrink: 0,
            }}>
              {user?.avatarUrl
                ? <img src={user.avatarUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                : <div style={{ width: '100%', height: '100%', background: `linear-gradient(135deg, ${primary}, ${primary}bb)`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, color: '#fff' }}>
                    {(user?.username ?? '?')[0].toUpperCase()}
                  </div>}
            </button>
          </>
        ) : (
          <>
            <button onClick={onLoginClick} style={{
              padding: '6px 14px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.2)',
              background: 'rgba(255,255,255,0.08)', color: preset.light, fontSize: 13, fontWeight: 600, cursor: 'pointer',
            }}>Войти</button>
            <button onClick={onRegisterClick} style={{
              padding: '6px 14px', borderRadius: 8, border: 'none',
              background: primary, color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer',
            }}>Регистрация</button>
          </>
        )}
      </div>
      </div>
    </header>
  );
}
