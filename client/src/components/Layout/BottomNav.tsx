import type { TabId } from './Header';
import { useAuth } from '@/context/AuthContext';

interface Props {
  activeTab: TabId;
  onTabChange: (tab: TabId) => void;
  onAddActivity: () => void;
  unreadMessages?: number;
}

const ITEMS = [
  { id: 'feed' as TabId, icon: (active: boolean) => (
    <svg width="22" height="22" fill={active ? '#fc4c02' : 'none'} viewBox="0 0 24 24" stroke={active ? '#fc4c02' : '#888'} strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
    </svg>
  ), label: 'Лента' },
  { id: 'events' as TabId, icon: (active: boolean) => (
    <svg width="22" height="22" fill={active ? '#fc4c02' : 'none'} viewBox="0 0 24 24" stroke={active ? '#fc4c02' : '#888'} strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
    </svg>
  ), label: 'События' },
  { id: '__add__' as TabId, icon: () => null, label: '' }, // center add button
  { id: 'messages' as TabId, icon: (active: boolean) => (
    <svg width="22" height="22" fill={active ? '#fc4c02' : 'none'} viewBox="0 0 24 24" stroke={active ? '#fc4c02' : '#888'} strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
    </svg>
  ), label: 'Чат' },
  { id: 'profile' as TabId, icon: (active: boolean) => (
    <svg width="22" height="22" fill={active ? '#fc4c02' : 'none'} viewBox="0 0 24 24" stroke={active ? '#fc4c02' : '#888'} strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
    </svg>
  ), label: 'Профиль' },
];

export function BottomNav({ activeTab, onTabChange, onAddActivity, unreadMessages = 0 }: Props) {
  const { isAuthenticated } = useAuth();

  return (
    <nav style={{
      position: 'fixed', bottom: 0, left: 0, right: 0, height: 60,
      background: '#fff',
      borderTop: '1px solid #f0f0f0',
      display: 'flex', alignItems: 'center',
      zIndex: 100,
      paddingBottom: 'env(safe-area-inset-bottom)',
    }}>
      {ITEMS.map(item => {
        if (item.id === '__add__') {
          return (
            <div key="add" style={{ flex: 1, display: 'flex', justifyContent: 'center' }}>
              <button
                onClick={isAuthenticated ? onAddActivity : undefined}
                style={{
                  width: 48, height: 48, borderRadius: 16, border: 'none',
                  background: isAuthenticated ? 'linear-gradient(135deg, #fc4c02, #ff7c3a)' : '#e0e0e0',
                  color: '#fff', fontSize: 26, cursor: isAuthenticated ? 'pointer' : 'default',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  boxShadow: isAuthenticated ? '0 4px 14px rgba(252,76,2,0.4)' : 'none',
                  fontWeight: 300, lineHeight: 1,
                  transform: 'translateY(-6px)',
                }}
              >
                +
              </button>
            </div>
          );
        }

        const active = activeTab === item.id;
        const showBadge = item.id === 'messages' && unreadMessages > 0;

        return (
          <button
            key={item.id}
            onClick={() => onTabChange(item.id)}
            style={{
              flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center',
              justifyContent: 'center', gap: 3, border: 'none', background: 'none',
              cursor: 'pointer', position: 'relative', height: '100%', padding: 0,
            }}
          >
            <div style={{ position: 'relative' }}>
              {item.icon(active)}
              {showBadge && (
                <span style={{
                  position: 'absolute', top: -4, right: -6,
                  width: 16, height: 16, borderRadius: '50%',
                  background: '#fc4c02', color: '#fff', fontSize: 9, fontWeight: 800,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  {unreadMessages > 9 ? '9+' : unreadMessages}
                </span>
              )}
            </div>
            <span style={{ fontSize: 10, fontWeight: active ? 700 : 400, color: active ? '#fc4c02' : '#999' }}>
              {item.label}
            </span>
          </button>
        );
      })}
    </nav>
  );
}
