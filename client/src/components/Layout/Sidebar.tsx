import type { TabId } from './Header';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';

const NAV = [
  { id: 'feed' as TabId, icon: (
    <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
    </svg>
  ), label: 'Лента' },
  { id: 'events' as TabId, icon: (
    <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
    </svg>
  ), label: 'События' },
  { id: 'activities' as TabId, icon: (
    <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
    </svg>
  ), label: 'Активности', authOnly: true },
  { id: 'teams' as TabId, icon: (
    <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
    </svg>
  ), label: 'Клубы' },
  { id: 'leaderboard' as TabId, icon: (
    <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
    </svg>
  ), label: 'Рейтинг' },
  { id: 'community' as TabId, icon: (
    <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ), label: 'Сообщество' },
  { id: 'friends' as TabId, icon: (
    <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
    </svg>
  ), label: 'Друзья', authOnly: true },
  { id: 'messages' as TabId, icon: (
    <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
    </svg>
  ), label: 'Сообщения', authOnly: true },
  { id: 'profile' as TabId, icon: (
    <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
    </svg>
  ), label: 'Профиль', authOnly: true },
  { id: 'admin' as TabId, icon: (
    <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  ), label: 'Админ', adminOnly: true },
  { id: 'mod' as TabId, icon: (
    <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
    </svg>
  ), label: 'Модерация', modOnly: true },
];

interface Props {
  activeTab: TabId;
  onTabChange: (tab: TabId) => void;
  onLoginClick: () => void;
  onAddActivity: () => void;
  unreadMessages?: number;
}

export function Sidebar({ activeTab, onTabChange, onLoginClick, onAddActivity, unreadMessages = 0 }: Props) {
  const { user, isAuthenticated, logout } = useAuth();
  const { primary } = useTheme();

  const visible = NAV.filter(n => {
    if ((n as any).adminOnly) return user?.role === 'ADMIN';
    if ((n as any).modOnly) return user?.role === 'MODERATOR' || user?.role === 'ADMIN';
    if (n.authOnly) return isAuthenticated;
    return true;
  });

  return (
    <aside style={{
      width: 220, flexShrink: 0,
      position: 'sticky', top: 52, height: 'calc(100vh - 52px)',
      overflowY: 'auto', display: 'flex', flexDirection: 'column',
      paddingTop: 12,
    }}>
      {/* Add Activity */}
      {isAuthenticated && (
        <div style={{ padding: '0 8px 12px' }}>
          <button
            onClick={onAddActivity}
            style={{
              width: '100%', padding: '10px 0', borderRadius: 12, border: 'none',
              background: `linear-gradient(135deg, ${primary}, ${primary}bb)`,
              color: '#fff', fontSize: 13, fontWeight: 800, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              boxShadow: `0 3px 10px ${primary}4d`,
            }}
          >
            <span style={{ fontSize: 16, lineHeight: 1 }}>+</span> Добавить активность
          </button>
        </div>
      )}

      {/* Nav */}
      <nav style={{ flex: 1, padding: '0 8px' }}>
        {visible.map(item => {
          const active = activeTab === item.id;
          const showBadge = item.id === 'messages' && unreadMessages > 0;
          return (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              style={{
                width: '100%', display: 'flex', alignItems: 'center', gap: 11,
                padding: '9px 12px', borderRadius: 10, cursor: 'pointer',
                marginBottom: 1, background: 'transparent', border: 'none',
                color: active ? primary : '#333',
                fontSize: 14, fontWeight: active ? 700 : 500,
                textAlign: 'left', position: 'relative',
                transition: 'color 0.15s',
              }}
              onMouseEnter={e => { if (!active) (e.currentTarget as HTMLButtonElement).style.color = primary; }}
              onMouseLeave={e => { if (!active) (e.currentTarget as HTMLButtonElement).style.color = '#333'; }}
            >
              {item.icon}
              {item.label}
              {showBadge && (
                <span style={{
                  marginLeft: 'auto', minWidth: 18, height: 18, borderRadius: 9,
                  background: primary, color: '#fff', fontSize: 11, fontWeight: 800,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 4px',
                }}>
                  {unreadMessages > 9 ? '9+' : unreadMessages}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* User / Login */}
      <div style={{ padding: '10px 8px 16px', borderTop: '1px solid #f0f0f0', marginTop: 8 }}>
        {isAuthenticated && user ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '8px 10px', borderRadius: 10, background: '#fafafa' }}>
            <div style={{
              width: 34, height: 34, borderRadius: '50%', flexShrink: 0, overflow: 'hidden',
              background: user.avatarUrl ? 'none' : `linear-gradient(135deg, ${primary}, ${primary}bb)`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 14, color: '#fff', fontWeight: 700,
            }}>
              {user.avatarUrl
                ? <img src={user.avatarUrl} alt="" style={{ width: 34, height: 34, objectFit: 'cover' }} />
                : (user.username ?? '?')[0].toUpperCase()}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#1a1a1a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {user.username}
              </div>
              <div style={{ fontSize: 11, color: primary, fontWeight: 600 }}>
                Ур. {user.level ?? 1} · {user.xp ?? 0} XP
              </div>
            </div>
            <button onClick={logout} title="Выйти" style={{
              width: 28, height: 28, borderRadius: 7, border: 'none', background: 'none',
              cursor: 'pointer', color: '#bbb', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            }}>
              <svg style={{ width: 15, height: 15 }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </button>
          </div>
        ) : (
          <button onClick={onLoginClick} style={{
            width: '100%', padding: '9px 0', borderRadius: 10, border: '1.5px solid #fc4c02',
            background: '#fff', color: primary, fontSize: 13, fontWeight: 700, cursor: 'pointer',
          }}>
            Войти / Регистрация
          </button>
        )}
      </div>
    </aside>
  );
}
