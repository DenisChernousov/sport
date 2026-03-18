import { lazy, Suspense, useCallback, useState } from 'react';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { Header } from '@/components/Layout/Header';
import type { TabId } from '@/components/Layout/Header';
import { AuthModal } from '@/components/Auth/AuthModal';

// Lazy-loaded panels
const EventsPanel = lazy(() => import('@/components/Events/EventsPanel'));
const ActivitiesPanel = lazy(() => import('@/components/Activities/ActivitiesPanel'));
const TeamsPanel = lazy(() => import('@/components/Teams/TeamsPanel'));
const LeaderboardPanel = lazy(() => import('@/components/Leaderboard/LeaderboardPanel'));
const ProfilePanel = lazy(() => import('@/components/Profile/ProfilePanel'));
const AdminPanel = lazy(() => import('@/components/Admin/AdminPanel'));
const CommunityPanel = lazy(() => import('@/components/Community/CommunityPanel'));
const FeedPanel = lazy(() => import('@/components/Feed/FeedPanel'));

function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center py-32">
      <div className="w-10 h-10 border-3 border-primary/30 border-t-primary rounded-full animate-spin" />
    </div>
  );
}

function AppContent() {
  const { isAuthenticated, isLoading } = useAuth();
  const [activeTab, setActiveTab] = useState<TabId>('feed');
  const [authModal, setAuthModal] = useState<{ open: boolean; tab: 'login' | 'register' }>({
    open: false,
    tab: 'login',
  });

  const openLogin = useCallback(() => setAuthModal({ open: true, tab: 'login' }), []);
  const openRegister = useCallback(() => setAuthModal({ open: true, tab: 'register' }), []);
  const closeAuth = useCallback(() => setAuthModal((prev) => ({ ...prev, open: false })), []);

  const handleTabChange = useCallback(
    (tab: TabId) => {
      if ((tab === 'profile' || tab === 'activities') && !isAuthenticated) {
        openLogin();
        return;
      }
      setActiveTab(tab);
    },
    [isAuthenticated, openLogin],
  );

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#eef0f4' }}>
        <div className="text-center">
          <div className="text-5xl mb-4">🏃</div>
          <div className="w-10 h-10 mx-auto border-3 border-primary/30 border-t-primary rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ background: '#eef0f4' }}>
      <Header
        activeTab={activeTab}
        onTabChange={handleTabChange}
        onLoginClick={openLogin}
        onRegisterClick={openRegister}
      />

      <main style={{ maxWidth: '1100px', margin: '0 auto', padding: '32px 24px' }}>
        <Suspense fallback={<LoadingSpinner />}>
          {activeTab === 'feed' && <FeedPanel />}
          {activeTab === 'events' && <EventsPanel />}
          {activeTab === 'activities' && <ActivitiesPanel />}
          {activeTab === 'teams' && <TeamsPanel />}
          {activeTab === 'leaderboard' && <LeaderboardPanel />}
          {activeTab === 'community' && <CommunityPanel />}
          {activeTab === 'profile' && <ProfilePanel />}
          {activeTab === 'admin' && <AdminPanel />}
        </Suspense>
      </main>

      <AuthModal isOpen={authModal.open} onClose={closeAuth} initialTab={authModal.tab} />

      {/* Footer */}
      <footer style={{
        borderTop: '1px solid #e0e0e0',
        background: '#fff',
        padding: '32px 24px',
        marginTop: 40,
      }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'flex-start', gap: 32, marginBottom: 24 }}>
            {/* Brand */}
            <div style={{ maxWidth: 280 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                <div style={{
                  width: 36, height: 36, borderRadius: 10,
                  background: 'linear-gradient(135deg, #fc4c02, #ff6b2b)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <svg viewBox="0 0 24 24" style={{ width: 20, height: 20, color: '#fff' }} fill="currentColor">
                    <path d="M13.5 5.5C13.5 6.88 12.38 8 11 8c-1.38 0-2.5-1.12-2.5-2.5S9.62 3 11 3c1.38 0 2.5 1.12 2.5 2.5zM9.89 19.38l1-4.38L13 17v6h2v-7.5l-2.11-2 .61-3A8.27 8.27 0 0 0 19 13h2V11h-2a6.74 6.74 0 0 1-4.89-2.11l-1-1.22C12.78 7.28 12.28 7 11.72 7c-.28 0-.56.07-.82.22L6 10l1 1.73L10 10l-1.11 5.38L5 13v2l4.89 4.38z"/>
                  </svg>
                </div>
                <span style={{ fontSize: 18, fontWeight: 800, color: '#242424' }}>
                  Sport<span style={{ color: '#fc4c02' }}>Run</span>
                </span>
              </div>
              <p style={{ fontSize: 13, color: '#999', lineHeight: 1.6, margin: 0 }}>
                Платформа виртуальных забегов. Участвуй в событиях из любой точки мира, зарабатывай XP и получай медали.
              </p>
            </div>

            {/* Links */}
            <div style={{ display: 'flex', gap: 48 }}>
              <div>
                <h4 style={{ fontSize: 13, fontWeight: 700, color: '#242424', marginBottom: 12, marginTop: 0 }}>Платформа</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {['События', 'Рейтинг', 'Клубы'].map(label => (
                    <span key={label} style={{ fontSize: 13, color: '#888', cursor: 'pointer' }}
                      onMouseEnter={e => { (e.target as HTMLElement).style.color = '#fc4c02'; }}
                      onMouseLeave={e => { (e.target as HTMLElement).style.color = '#888'; }}
                    >{label}</span>
                  ))}
                </div>
              </div>
              <div>
                <h4 style={{ fontSize: 13, fontWeight: 700, color: '#242424', marginBottom: 12, marginTop: 0 }}>Спорт</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {['🏃 Бег', '🚴 Велосипед', '⛷️ Лыжи', '🚶 Ходьба'].map(label => (
                    <span key={label} style={{ fontSize: 13, color: '#888' }}>{label}</span>
                  ))}
                </div>
              </div>
              <div>
                <h4 style={{ fontSize: 13, fontWeight: 700, color: '#242424', marginBottom: 12, marginTop: 0 }}>Информация</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {['О проекте', 'Правила', 'Контакты'].map(label => (
                    <span key={label} style={{ fontSize: 13, color: '#888', cursor: 'pointer' }}
                      onMouseEnter={e => { (e.target as HTMLElement).style.color = '#fc4c02'; }}
                      onMouseLeave={e => { (e.target as HTMLElement).style.color = '#888'; }}
                    >{label}</span>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Bottom */}
          <div style={{
            borderTop: '1px solid #f0f0f0', paddingTop: 16,
            display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: 12,
          }}>
            <span style={{ fontSize: 12, color: '#bbb' }}>
              © {new Date().getFullYear()} SportRun. Все права защищены.
            </span>
            <div style={{ display: 'flex', gap: 16 }}>
              {['Политика конфиденциальности', 'Условия использования'].map(label => (
                <span key={label} style={{ fontSize: 12, color: '#bbb', cursor: 'pointer' }}
                  onMouseEnter={e => { (e.target as HTMLElement).style.color = '#888'; }}
                  onMouseLeave={e => { (e.target as HTMLElement).style.color = '#bbb'; }}
                >{label}</span>
              ))}
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
