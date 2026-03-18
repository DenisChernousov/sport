import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';

export type TabId = 'events' | 'activities' | 'teams' | 'leaderboard' | 'community' | 'profile' | 'admin';

const tabs: { id: TabId; label: string; icon: string; adminOnly?: boolean; authOnly?: boolean }[] = [
  { id: 'events', label: 'События', icon: '🏆' },
  { id: 'activities', label: 'Активности', icon: '⚡', authOnly: true },
  { id: 'teams', label: 'Клубы', icon: '👥' },
  { id: 'leaderboard', label: 'Рейтинг', icon: '📊' },
  { id: 'community', label: 'Сообщество', icon: '🌍' },
  { id: 'profile', label: 'Профиль', icon: '👤', authOnly: true },
  { id: 'admin', label: 'Админ', icon: '⚙️', adminOnly: true },
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
  const [hoveredTab, setHoveredTab] = useState<string | null>(null);

  const visible = tabs.filter(t => {
    if (t.adminOnly && user?.role !== 'ADMIN') return false;
    if (t.authOnly && !isAuthenticated) return false;
    return true;
  });

  const go = (id: TabId) => { onTabChange(id); setMobileOpen(false); };

  return (
    <header style={{
      position: 'sticky', top: 0, zIndex: 50,
      background: 'rgba(255,255,255,0.95)',
      backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
      borderBottom: '1px solid #f0f0f0',
      boxShadow: '0 1px 12px rgba(0,0,0,0.04)',
    }}>
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 32px' }}>
        <div style={{ display: 'flex', alignItems: 'center', height: 64, gap: 32 }}>

          {/* Logo */}
          <button onClick={() => go('events')} style={{
            display: 'flex', alignItems: 'center', gap: 10, background: 'none',
            border: 'none', cursor: 'pointer', padding: 0, flexShrink: 0,
          }}>
            <div style={{
              width: 40, height: 40, borderRadius: 12,
              background: 'linear-gradient(135deg, #fc4c02, #ff6b2b)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 2px 12px rgba(252,76,2,0.3)',
            }}>
              <svg viewBox="0 0 24 24" style={{ width: 22, height: 22, color: '#fff' }} fill="currentColor">
                <path d="M13.5 5.5C13.5 6.88 12.38 8 11 8c-1.38 0-2.5-1.12-2.5-2.5S9.62 3 11 3c1.38 0 2.5 1.12 2.5 2.5zM9.89 19.38l1-4.38L13 17v6h2v-7.5l-2.11-2 .61-3A8.27 8.27 0 0 0 19 13h2V11h-2a6.74 6.74 0 0 1-4.89-2.11l-1-1.22C12.78 7.28 12.28 7 11.72 7c-.28 0-.56.07-.82.22L6 10l1 1.73L10 10l-1.11 5.38L5 13v2l4.89 4.38z"/>
              </svg>
            </div>
            <div>
              <span style={{ fontSize: 20, fontWeight: 800, color: '#242424', letterSpacing: -0.5 }}>
                Sport<span style={{ color: '#fc4c02' }}>Run</span>
              </span>
            </div>
          </button>

          {/* Desktop nav */}
          <nav style={{ display: 'flex', alignItems: 'center', gap: 4, flex: 1 }}>
            {visible.map(tab => {
              const isActive = activeTab === tab.id;
              const isHovered = hoveredTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => go(tab.id)}
                  onMouseEnter={() => setHoveredTab(tab.id)}
                  onMouseLeave={() => setHoveredTab(null)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 6,
                    padding: '8px 16px', borderRadius: 10,
                    border: 'none', cursor: 'pointer',
                    fontSize: 14, fontWeight: 600,
                    background: isActive ? '#fff4ef' : isHovered ? '#f5f5f5' : 'transparent',
                    color: isActive ? '#fc4c02' : isHovered ? '#242424' : '#888',
                    transition: 'all 0.15s',
                    position: 'relative',
                  }}
                >
                  <span style={{ fontSize: 15 }}>{tab.icon}</span>
                  {tab.label}
                  {isActive && <div style={{
                    position: 'absolute', bottom: -2, left: 16, right: 16,
                    height: 2, borderRadius: 1, background: '#fc4c02',
                  }} />}
                </button>
              );
            })}
          </nav>

          {/* Right section */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginLeft: 'auto' }}>
            {isAuthenticated && user ? (
              <>
                <button onClick={() => go('profile')} style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  background: 'none', border: 'none', cursor: 'pointer', padding: '6px 8px',
                  borderRadius: 12, transition: 'background 0.15s',
                }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = '#f5f5f5'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'none'; }}
                >
                  <div style={{
                    width: 36, height: 36, borderRadius: '50%',
                    background: user.avatarUrl ? 'none' : 'linear-gradient(135deg, #fc4c02, #ff6b2b)',
                    color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 15, fontWeight: 700, overflow: 'hidden',
                    boxShadow: '0 1px 6px rgba(0,0,0,0.1)',
                  }}>
                    {user.avatarUrl
                      ? <img src={user.avatarUrl} alt="" style={{ width: 36, height: 36, borderRadius: '50%', objectFit: 'cover' }} />
                      : (user.username ?? '?')[0].toUpperCase()}
                  </div>
                  <div style={{ textAlign: 'left' }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: '#242424', lineHeight: 1.2 }}>
                      {user.username ?? '—'}
                    </div>
                    <div style={{ fontSize: 11, color: '#aaa', lineHeight: 1.2 }}>
                      Ур. {user.level ?? 0} · {user.xp ?? 0} XP
                    </div>
                  </div>
                </button>

                <button onClick={logout} title="Выйти" style={{
                  width: 36, height: 36, borderRadius: 10,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: 'none', border: '1px solid #eee',
                  cursor: 'pointer', color: '#ccc', transition: 'all 0.15s',
                }}
                  onMouseEnter={e => { const el = e.currentTarget as HTMLElement; el.style.color = '#d93025'; el.style.borderColor = '#fecaca'; el.style.background = '#fef2f2'; }}
                  onMouseLeave={e => { const el = e.currentTarget as HTMLElement; el.style.color = '#ccc'; el.style.borderColor = '#eee'; el.style.background = 'none'; }}
                >
                  <svg style={{ width: 18, height: 18 }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                </button>
              </>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <button onClick={onLoginClick} style={{
                  padding: '8px 20px', fontSize: 14, fontWeight: 600,
                  color: '#666', background: 'none', border: '1px solid #e0e0e0',
                  borderRadius: 10, cursor: 'pointer', transition: 'all 0.15s',
                }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = '#bbb'; (e.currentTarget as HTMLElement).style.color = '#242424'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = '#e0e0e0'; (e.currentTarget as HTMLElement).style.color = '#666'; }}
                >
                  Войти
                </button>
                <button onClick={onRegisterClick} style={{
                  padding: '8px 24px', fontSize: 14, fontWeight: 700,
                  color: '#fff', background: 'linear-gradient(135deg, #fc4c02, #ff6b2b)',
                  border: 'none', borderRadius: 10, cursor: 'pointer',
                  boxShadow: '0 2px 12px rgba(252,76,2,0.25)',
                  transition: 'all 0.15s',
                }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.boxShadow = '0 4px 20px rgba(252,76,2,0.35)'; (e.currentTarget as HTMLElement).style.transform = 'translateY(-1px)'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.boxShadow = '0 2px 12px rgba(252,76,2,0.25)'; (e.currentTarget as HTMLElement).style.transform = 'none'; }}
                >
                  Регистрация
                </button>
              </div>
            )}

            {/* Mobile hamburger */}
            <button onClick={() => setMobileOpen(!mobileOpen)} style={{
              display: 'none', padding: 8, background: 'none', border: 'none',
              cursor: 'pointer', color: '#888', borderRadius: 8,
            }}>
              <svg style={{ width: 22, height: 22 }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                {mobileOpen
                  ? <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  : <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />}
              </svg>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
