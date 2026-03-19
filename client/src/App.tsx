import { lazy, Suspense, useCallback, useEffect, useState } from 'react';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import type { TabId } from '@/components/Layout/Header';
import { TopBar } from '@/components/Layout/TopBar';
import { Sidebar } from '@/components/Layout/Sidebar';
import { BottomNav } from '@/components/Layout/BottomNav';
import { AuthModal } from '@/components/Auth/AuthModal';
import { PublicProfilePanel } from '@/components/Profile/PublicProfilePanel';

// Lazy-loaded panels
const EventsPanel = lazy(() => import('@/components/Events/EventsPanel'));
const ActivitiesPanel = lazy(() => import('@/components/Activities/ActivitiesPanel'));
const TeamsPanel = lazy(() => import('@/components/Teams/TeamsPanel'));
const LeaderboardPanel = lazy(() => import('@/components/Leaderboard/LeaderboardPanel'));
const ProfilePanel = lazy(() => import('@/components/Profile/ProfilePanel'));
const AdminPanel = lazy(() => import('@/components/Admin/AdminPanel'));
const CommunityPanel = lazy(() => import('@/components/Community/CommunityPanel'));
const FeedPanel = lazy(() => import('@/components/Feed/FeedPanel'));
const MessagesPanel = lazy(() => import('@/components/Messages/MessagesPanel'));

function LoadingSpinner() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '80px 0' }}>
      <div style={{ width: 34, height: 34, border: '3px solid rgba(252,76,2,0.15)', borderTopColor: '#fc4c02', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
    </div>
  );
}

function useWidth() {
  const [w, setW] = useState(typeof window !== 'undefined' ? window.innerWidth : 1200);
  useEffect(() => {
    const h = () => setW(window.innerWidth);
    window.addEventListener('resize', h);
    return () => window.removeEventListener('resize', h);
  }, []);
  return w;
}

function AppContent() {
  const { isAuthenticated, isLoading } = useAuth();
  const [activeTab, setActiveTab] = useState<TabId>('feed');
  const w = useWidth();
  const isMobile = w < 768;
  const [viewUserId, setViewUserId] = useState<string | null>(null);
  const [authModal, setAuthModal] = useState<{ open: boolean; tab: 'login' | 'register' }>({
    open: false, tab: 'login',
  });

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail?.userId) setViewUserId(detail.userId);
    };
    window.addEventListener('open-profile', handler);
    return () => window.removeEventListener('open-profile', handler);
  }, []);

  useEffect(() => {
    const handler = () => setActiveTab('messages');
    window.addEventListener('open-messages', handler);
    return () => window.removeEventListener('open-messages', handler);
  }, []);

  const openLogin = useCallback(() => setAuthModal({ open: true, tab: 'login' }), []);
  const openRegister = useCallback(() => setAuthModal({ open: true, tab: 'register' }), []);
  const closeAuth = useCallback(() => setAuthModal(prev => ({ ...prev, open: false })), []);

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

  const handleAddActivity = useCallback(() => {
    if (!isAuthenticated) { openLogin(); return; }
    setActiveTab('activities');
    setTimeout(() => window.dispatchEvent(new CustomEvent('open-add-activity')), 50);
  }, [isAuthenticated, openLogin]);

  if (isLoading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f0f2f5' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🏃</div>
          <div style={{ width: 38, height: 38, margin: '0 auto', border: '3px solid rgba(252,76,2,0.15)', borderTopColor: '#fc4c02', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
        </div>
      </div>
    );
  }

  const panels = (
    <Suspense fallback={<LoadingSpinner />}>
      {activeTab === 'feed' && <FeedPanel />}
      {activeTab === 'events' && <EventsPanel />}
      {activeTab === 'activities' && <ActivitiesPanel />}
      {activeTab === 'teams' && <TeamsPanel />}
      {activeTab === 'leaderboard' && <LeaderboardPanel />}
      {activeTab === 'community' && <CommunityPanel />}
      {activeTab === 'messages' && <MessagesPanel />}
      {activeTab === 'profile' && <ProfilePanel />}
      {activeTab === 'admin' && <AdminPanel />}
    </Suspense>
  );

  return (
    <div style={{ minHeight: '100vh', background: '#f0f2f5' }}>
      {/* TopBar — always visible */}
      <TopBar
        activeTab={activeTab}
        onTabChange={handleTabChange}
        onLoginClick={openLogin}
        onRegisterClick={openRegister}
      />

      {isMobile ? (
        <>
          <main style={{ paddingTop: 52, paddingBottom: 68 }}>
            <div style={{ padding: '10px 10px' }}>{panels}</div>
          </main>
          <BottomNav
            activeTab={activeTab}
            onTabChange={handleTabChange}
            onAddActivity={handleAddActivity}
          />
        </>
      ) : (
        /* Desktop: centered wrapper with sidebar + content */
        <div style={{ maxWidth: 1060, margin: '0 auto', padding: '0 16px', paddingTop: 52 }}>
          <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start', paddingTop: 16 }}>
            {/* Left sidebar — sticky */}
            <Sidebar
              activeTab={activeTab}
              onTabChange={handleTabChange}
              onLoginClick={openLogin}
              onAddActivity={handleAddActivity}
            />

            {/* Main content */}
            <main style={{ flex: 1, minWidth: 0 }}>
              {panels}
            </main>
          </div>
        </div>
      )}

      <AuthModal isOpen={authModal.open} onClose={closeAuth} initialTab={authModal.tab} />

      {viewUserId && (
        <PublicProfilePanel userId={viewUserId} onClose={() => setViewUserId(null)} />
      )}
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
