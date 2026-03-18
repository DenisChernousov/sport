import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { lazy, Suspense, useCallback, useState } from 'react';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { Header } from '@/components/Layout/Header';
import { AuthModal } from '@/components/Auth/AuthModal';
// Lazy-loaded panels
const EventsPanel = lazy(() => import('@/components/Events/EventsPanel'));
const ActivitiesPanel = lazy(() => import('@/components/Activities/ActivitiesPanel'));
const TeamsPanel = lazy(() => import('@/components/Teams/TeamsPanel'));
const LeaderboardPanel = lazy(() => import('@/components/Leaderboard/LeaderboardPanel'));
const ProfilePanel = lazy(() => import('@/components/Profile/ProfilePanel'));
const AdminPanel = lazy(() => import('@/components/Admin/AdminPanel'));
const CommunityPanel = lazy(() => import('@/components/Community/CommunityPanel'));
function LoadingSpinner() {
    return (_jsx("div", { className: "flex items-center justify-center py-32", children: _jsx("div", { className: "w-10 h-10 border-3 border-primary/30 border-t-primary rounded-full animate-spin" }) }));
}
function AppContent() {
    const { isAuthenticated, isLoading } = useAuth();
    const [activeTab, setActiveTab] = useState('events');
    const [authModal, setAuthModal] = useState({
        open: false,
        tab: 'login',
    });
    const openLogin = useCallback(() => setAuthModal({ open: true, tab: 'login' }), []);
    const openRegister = useCallback(() => setAuthModal({ open: true, tab: 'register' }), []);
    const closeAuth = useCallback(() => setAuthModal((prev) => ({ ...prev, open: false })), []);
    const handleTabChange = useCallback((tab) => {
        if ((tab === 'profile' || tab === 'activities') && !isAuthenticated) {
            openLogin();
            return;
        }
        setActiveTab(tab);
    }, [isAuthenticated, openLogin]);
    if (isLoading) {
        return (_jsx("div", { className: "min-h-screen flex items-center justify-center", style: { background: '#eef0f4' }, children: _jsxs("div", { className: "text-center", children: [_jsx("div", { className: "text-5xl mb-4", children: "\uD83C\uDFC3" }), _jsx("div", { className: "w-10 h-10 mx-auto border-3 border-primary/30 border-t-primary rounded-full animate-spin" })] }) }));
    }
    return (_jsxs("div", { className: "min-h-screen", style: { background: '#eef0f4' }, children: [_jsx(Header, { activeTab: activeTab, onTabChange: handleTabChange, onLoginClick: openLogin, onRegisterClick: openRegister }), _jsx("main", { style: { maxWidth: '1100px', margin: '0 auto', padding: '32px 24px' }, children: _jsxs(Suspense, { fallback: _jsx(LoadingSpinner, {}), children: [activeTab === 'events' && _jsx(EventsPanel, {}), activeTab === 'activities' && _jsx(ActivitiesPanel, {}), activeTab === 'teams' && _jsx(TeamsPanel, {}), activeTab === 'leaderboard' && _jsx(LeaderboardPanel, {}), activeTab === 'community' && _jsx(CommunityPanel, {}), activeTab === 'profile' && _jsx(ProfilePanel, {}), activeTab === 'admin' && _jsx(AdminPanel, {})] }) }), _jsx(AuthModal, { isOpen: authModal.open, onClose: closeAuth, initialTab: authModal.tab }), _jsx("footer", { style: {
                    borderTop: '1px solid #e0e0e0',
                    background: '#fff',
                    padding: '32px 24px',
                    marginTop: 40,
                }, children: _jsxs("div", { style: { maxWidth: 1100, margin: '0 auto' }, children: [_jsxs("div", { style: { display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'flex-start', gap: 32, marginBottom: 24 }, children: [_jsxs("div", { style: { maxWidth: 280 }, children: [_jsxs("div", { style: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }, children: [_jsx("div", { style: {
                                                        width: 36, height: 36, borderRadius: 10,
                                                        background: 'linear-gradient(135deg, #fc4c02, #ff6b2b)',
                                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                    }, children: _jsx("svg", { viewBox: "0 0 24 24", style: { width: 20, height: 20, color: '#fff' }, fill: "currentColor", children: _jsx("path", { d: "M13.5 5.5C13.5 6.88 12.38 8 11 8c-1.38 0-2.5-1.12-2.5-2.5S9.62 3 11 3c1.38 0 2.5 1.12 2.5 2.5zM9.89 19.38l1-4.38L13 17v6h2v-7.5l-2.11-2 .61-3A8.27 8.27 0 0 0 19 13h2V11h-2a6.74 6.74 0 0 1-4.89-2.11l-1-1.22C12.78 7.28 12.28 7 11.72 7c-.28 0-.56.07-.82.22L6 10l1 1.73L10 10l-1.11 5.38L5 13v2l4.89 4.38z" }) }) }), _jsxs("span", { style: { fontSize: 18, fontWeight: 800, color: '#242424' }, children: ["Sport", _jsx("span", { style: { color: '#fc4c02' }, children: "Run" })] })] }), _jsx("p", { style: { fontSize: 13, color: '#999', lineHeight: 1.6, margin: 0 }, children: "\u041F\u043B\u0430\u0442\u0444\u043E\u0440\u043C\u0430 \u0432\u0438\u0440\u0442\u0443\u0430\u043B\u044C\u043D\u044B\u0445 \u0437\u0430\u0431\u0435\u0433\u043E\u0432. \u0423\u0447\u0430\u0441\u0442\u0432\u0443\u0439 \u0432 \u0441\u043E\u0431\u044B\u0442\u0438\u044F\u0445 \u0438\u0437 \u043B\u044E\u0431\u043E\u0439 \u0442\u043E\u0447\u043A\u0438 \u043C\u0438\u0440\u0430, \u0437\u0430\u0440\u0430\u0431\u0430\u0442\u044B\u0432\u0430\u0439 XP \u0438 \u043F\u043E\u043B\u0443\u0447\u0430\u0439 \u043C\u0435\u0434\u0430\u043B\u0438." })] }), _jsxs("div", { style: { display: 'flex', gap: 48 }, children: [_jsxs("div", { children: [_jsx("h4", { style: { fontSize: 13, fontWeight: 700, color: '#242424', marginBottom: 12, marginTop: 0 }, children: "\u041F\u043B\u0430\u0442\u0444\u043E\u0440\u043C\u0430" }), _jsx("div", { style: { display: 'flex', flexDirection: 'column', gap: 8 }, children: ['События', 'Рейтинг', 'Клубы'].map(label => (_jsx("span", { style: { fontSize: 13, color: '#888', cursor: 'pointer' }, onMouseEnter: e => { e.target.style.color = '#fc4c02'; }, onMouseLeave: e => { e.target.style.color = '#888'; }, children: label }, label))) })] }), _jsxs("div", { children: [_jsx("h4", { style: { fontSize: 13, fontWeight: 700, color: '#242424', marginBottom: 12, marginTop: 0 }, children: "\u0421\u043F\u043E\u0440\u0442" }), _jsx("div", { style: { display: 'flex', flexDirection: 'column', gap: 8 }, children: ['🏃 Бег', '🚴 Велосипед', '⛷️ Лыжи', '🚶 Ходьба'].map(label => (_jsx("span", { style: { fontSize: 13, color: '#888' }, children: label }, label))) })] }), _jsxs("div", { children: [_jsx("h4", { style: { fontSize: 13, fontWeight: 700, color: '#242424', marginBottom: 12, marginTop: 0 }, children: "\u0418\u043D\u0444\u043E\u0440\u043C\u0430\u0446\u0438\u044F" }), _jsx("div", { style: { display: 'flex', flexDirection: 'column', gap: 8 }, children: ['О проекте', 'Правила', 'Контакты'].map(label => (_jsx("span", { style: { fontSize: 13, color: '#888', cursor: 'pointer' }, onMouseEnter: e => { e.target.style.color = '#fc4c02'; }, onMouseLeave: e => { e.target.style.color = '#888'; }, children: label }, label))) })] })] })] }), _jsxs("div", { style: {
                                borderTop: '1px solid #f0f0f0', paddingTop: 16,
                                display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: 12,
                            }, children: [_jsxs("span", { style: { fontSize: 12, color: '#bbb' }, children: ["\u00A9 ", new Date().getFullYear(), " SportRun. \u0412\u0441\u0435 \u043F\u0440\u0430\u0432\u0430 \u0437\u0430\u0449\u0438\u0449\u0435\u043D\u044B."] }), _jsx("div", { style: { display: 'flex', gap: 16 }, children: ['Политика конфиденциальности', 'Условия использования'].map(label => (_jsx("span", { style: { fontSize: 12, color: '#bbb', cursor: 'pointer' }, onMouseEnter: e => { e.target.style.color = '#888'; }, onMouseLeave: e => { e.target.style.color = '#bbb'; }, children: label }, label))) })] })] }) })] }));
}
export default function App() {
    return (_jsx(AuthProvider, { children: _jsx(AppContent, {}) }));
}
