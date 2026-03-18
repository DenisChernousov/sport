import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useCallback, useEffect, useState } from 'react';
import { api } from '@/services/api';
const PERIODS = [
    { key: 'week', label: 'За неделю' },
    { key: 'month', label: 'За месяц' },
    { key: 'all', label: 'За всё время' },
];
const SPORT_FILTERS = [
    { key: 'ALL', label: 'Все', color: '#fc4c02' },
    { key: 'RUNNING', label: '🏃 Бег', color: '#fc4c02' },
    { key: 'CYCLING', label: '🚴 Вело', color: '#0061ff' },
    { key: 'SKIING', label: '⛷️ Лыжи', color: '#0891b2' },
    { key: 'WALKING', label: '🚶 Ходьба', color: '#7c3aed' },
];
function getRankDisplay(rank) {
    if (rank === 1)
        return { text: '🥇', bg: 'rgba(234,179,8,0.15)', color: '#ca8a04', border: 'rgba(234,179,8,0.3)' };
    if (rank === 2)
        return { text: '🥈', bg: 'rgba(148,163,184,0.15)', color: '#94a3b8', border: 'rgba(148,163,184,0.3)' };
    if (rank === 3)
        return { text: '🥉', bg: 'rgba(180,83,9,0.15)', color: '#b45309', border: 'rgba(180,83,9,0.3)' };
    return { text: String(rank), bg: '#eef0f4', color: '#999', border: 'transparent' };
}
export default function LeaderboardPanel() {
    const [period, setPeriod] = useState('week');
    const [sport, setSport] = useState('ALL');
    const [users, setUsers] = useState([]);
    const [teams, setTeams] = useState([]);
    const [loadingUsers, setLoadingUsers] = useState(true);
    const [loadingTeams, setLoadingTeams] = useState(true);
    const loadUsers = useCallback(async () => {
        setLoadingUsers(true);
        try {
            let raw;
            if (sport === 'ALL') {
                const res = await api.leaderboard.users({ period });
                raw = Array.isArray(res) ? res : (res?.items ?? []);
            }
            else {
                const res = await api.leaderboard.bySport(sport);
                raw = Array.isArray(res) ? res : (res?.items ?? []);
            }
            // Normalize: backend returns { user: {...}, periodDistance } but we need flat LeaderboardEntry
            const list = raw.map((entry) => ({
                id: entry.user?.id ?? entry.userId ?? entry.id,
                username: entry.user?.username ?? entry.username,
                avatarUrl: entry.user?.avatarUrl ?? entry.avatarUrl,
                level: entry.user?.level ?? entry.level ?? 0,
                totalDistance: entry.periodDistance ?? entry.user?.totalDistance ?? entry.totalDistance ?? 0,
                totalActivities: entry.user?.totalActivities ?? entry.totalActivities ?? 0,
            }));
            setUsers(list);
        }
        catch {
            setUsers([]);
        }
        finally {
            setLoadingUsers(false);
        }
    }, [period, sport]);
    const loadTeams = useCallback(async () => {
        setLoadingTeams(true);
        try {
            const res = await api.leaderboard.teams();
            const list = Array.isArray(res) ? res : (res?.items ?? []);
            setTeams(list.slice(0, 10));
        }
        catch {
            setTeams([]);
        }
        finally {
            setLoadingTeams(false);
        }
    }, []);
    useEffect(() => {
        loadUsers();
    }, [loadUsers]);
    useEffect(() => {
        loadTeams();
    }, [loadTeams]);
    return (_jsxs("div", { style: { display: 'flex', flexDirection: 'column', gap: 24 }, children: [_jsx("h1", { style: { fontSize: 24, fontWeight: 700, color: '#242424', margin: 0 }, children: "\u0422\u0430\u0431\u043B\u0438\u0446\u0430 \u043B\u0438\u0434\u0435\u0440\u043E\u0432" }), _jsx("div", { style: {
                    display: 'flex',
                    gap: 4,
                    backgroundColor: '#eef0f4',
                    borderRadius: 12,
                    padding: 4,
                }, children: PERIODS.map((p) => (_jsx("button", { onClick: () => setPeriod(p.key), style: {
                        flex: 1,
                        padding: '10px 16px',
                        borderRadius: 8,
                        border: 'none',
                        fontSize: 14,
                        fontWeight: 500,
                        cursor: 'pointer',
                        backgroundColor: period === p.key ? '#fc4c02' : 'transparent',
                        color: period === p.key ? '#fff' : '#666',
                        transition: 'all 0.2s',
                    }, children: p.label }, p.key))) }), _jsx("div", { style: { display: 'flex', flexWrap: 'wrap', gap: 8 }, children: SPORT_FILTERS.map((s) => {
                    const isActive = sport === s.key;
                    return (_jsx("button", { onClick: () => setSport(s.key), style: {
                            padding: '8px 16px',
                            borderRadius: 20,
                            border: 'none',
                            fontSize: 14,
                            fontWeight: 500,
                            cursor: 'pointer',
                            backgroundColor: isActive ? s.color : '#eef0f4',
                            color: isActive ? '#fff' : '#666',
                            transition: 'all 0.2s',
                        }, children: s.label }, s.key));
                }) }), _jsxs("div", { style: {
                    backgroundColor: '#fff',
                    border: '1px solid #e0e0e0',
                    borderRadius: 12,
                    overflow: 'hidden',
                }, children: [_jsx("div", { style: {
                            borderBottom: '1px solid #e0e0e0',
                            padding: '12px 20px',
                        }, children: _jsx("h2", { style: { margin: 0, fontSize: 16, fontWeight: 600, color: '#242424' }, children: "\u0420\u0435\u0439\u0442\u0438\u043D\u0433 \u0443\u0447\u0430\u0441\u0442\u043D\u0438\u043A\u043E\u0432" }) }), loadingUsers ? (_jsx("div", { children: Array.from({ length: 8 }).map((_, i) => (_jsxs("div", { style: {
                                display: 'flex',
                                alignItems: 'center',
                                gap: 16,
                                padding: '12px 20px',
                                borderBottom: i < 7 ? '1px solid #eef0f4' : 'none',
                            }, children: [_jsx("div", { style: { width: 32, height: 32, borderRadius: 8, backgroundColor: '#eef0f4' } }), _jsx("div", { style: { width: 36, height: 36, borderRadius: '50%', backgroundColor: '#eef0f4' } }), _jsx("div", { style: { flex: 1 }, children: _jsx("div", { style: { width: 100, height: 16, borderRadius: 4, backgroundColor: '#eef0f4' } }) }), _jsx("div", { style: { width: 60, height: 16, borderRadius: 4, backgroundColor: '#eef0f4' } })] }, i))) })) : users.length === 0 ? (_jsx("div", { style: { padding: '40px 20px', textAlign: 'center', color: '#999' }, children: "\u041D\u0435\u0442 \u0434\u0430\u043D\u043D\u044B\u0445" })) : (_jsxs("div", { children: [_jsxs("div", { style: {
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 16,
                                    padding: '8px 20px',
                                    fontSize: 11,
                                    fontWeight: 500,
                                    color: '#999',
                                    textTransform: 'uppercase',
                                    letterSpacing: 0.5,
                                    borderBottom: '1px solid #eef0f4',
                                }, children: [_jsx("div", { style: { width: 40, textAlign: 'center' }, children: "#" }), _jsx("div", { style: { width: 36 } }), _jsx("div", { style: { flex: 1 }, children: "\u0423\u0447\u0430\u0441\u0442\u043D\u0438\u043A" }), _jsx("div", { style: { width: 64, textAlign: 'center' }, children: "\u0423\u0440\u043E\u0432\u0435\u043D\u044C" }), _jsx("div", { style: { width: 96, textAlign: 'right' }, children: "\u0414\u0438\u0441\u0442\u0430\u043D\u0446\u0438\u044F" }), _jsx("div", { style: { width: 80, textAlign: 'right' }, children: "\u0410\u043A\u0442\u0438\u0432\u043D\u043E\u0441\u0442\u0438" })] }), users.map((entry, i) => {
                                const rank = i + 1;
                                const rd = getRankDisplay(rank);
                                return (_jsxs("div", { style: {
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 16,
                                        padding: '10px 20px',
                                        borderBottom: i < users.length - 1 ? '1px solid #f5f5f5' : 'none',
                                        transition: 'background-color 0.15s',
                                    }, onMouseEnter: (e) => { e.currentTarget.style.backgroundColor = '#f9f9f9'; }, onMouseLeave: (e) => { e.currentTarget.style.backgroundColor = 'transparent'; }, children: [_jsx("div", { style: {
                                                width: 40,
                                                height: 32,
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                borderRadius: 8,
                                                backgroundColor: rd.bg,
                                                color: rd.color,
                                                border: `1px solid ${rd.border}`,
                                                fontSize: 14,
                                                fontWeight: 700,
                                            }, children: rd.text }), _jsx("div", { style: {
                                                width: 36,
                                                height: 36,
                                                borderRadius: '50%',
                                                backgroundColor: '#eef0f4',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                fontSize: 14,
                                                fontWeight: 600,
                                                color: '#242424',
                                                overflow: 'hidden',
                                                flexShrink: 0,
                                            }, children: entry.avatarUrl ? (_jsx("img", { src: entry.avatarUrl, alt: "", style: { width: 36, height: 36, borderRadius: '50%', objectFit: 'cover' } })) : ((entry.username ?? '?').charAt(0).toUpperCase()) }), _jsx("div", { style: { flex: 1, minWidth: 0 }, children: _jsx("span", { style: {
                                                    fontWeight: 500,
                                                    color: '#242424',
                                                    overflow: 'hidden',
                                                    textOverflow: 'ellipsis',
                                                    whiteSpace: 'nowrap',
                                                    display: 'block',
                                                }, children: entry.username ?? '?' }) }), _jsx("div", { style: { width: 64, textAlign: 'center' }, children: _jsxs("span", { style: {
                                                    display: 'inline-block',
                                                    backgroundColor: 'rgba(0,97,255,0.1)',
                                                    color: '#0061ff',
                                                    fontSize: 12,
                                                    fontWeight: 600,
                                                    padding: '2px 10px',
                                                    borderRadius: 12,
                                                }, children: ["\u0423\u0440. ", entry.level ?? 0] }) }), _jsxs("div", { style: { width: 96, textAlign: 'right' }, children: [_jsx("span", { style: { fontWeight: 600, color: '#242424' }, children: ((entry.totalDistance ?? 0) / 1000).toFixed(1) }), _jsx("span", { style: { marginLeft: 4, fontSize: 12, color: '#999' }, children: "\u043A\u043C" })] }), _jsx("div", { style: { width: 80, textAlign: 'right', fontSize: 14, color: '#666' }, children: entry.totalActivities ?? 0 })] }, entry.id));
                            })] }))] }), _jsxs("div", { style: {
                    backgroundColor: '#fff',
                    border: '1px solid #e0e0e0',
                    borderRadius: 12,
                    overflow: 'hidden',
                }, children: [_jsx("div", { style: {
                            borderBottom: '1px solid #e0e0e0',
                            padding: '12px 20px',
                        }, children: _jsx("h2", { style: { margin: 0, fontSize: 16, fontWeight: 600, color: '#242424' }, children: "\u0420\u0435\u0439\u0442\u0438\u043D\u0433 \u043A\u043E\u043C\u0430\u043D\u0434" }) }), loadingTeams ? (_jsx("div", { children: Array.from({ length: 5 }).map((_, i) => (_jsxs("div", { style: {
                                display: 'flex',
                                alignItems: 'center',
                                gap: 16,
                                padding: '12px 20px',
                                borderBottom: i < 4 ? '1px solid #eef0f4' : 'none',
                            }, children: [_jsx("div", { style: { width: 32, height: 32, borderRadius: 8, backgroundColor: '#eef0f4' } }), _jsx("div", { style: { flex: 1 }, children: _jsx("div", { style: { width: 120, height: 16, borderRadius: 4, backgroundColor: '#eef0f4' } }) }), _jsx("div", { style: { width: 60, height: 16, borderRadius: 4, backgroundColor: '#eef0f4' } })] }, i))) })) : teams.length === 0 ? (_jsx("div", { style: { padding: '40px 20px', textAlign: 'center', color: '#999' }, children: "\u041D\u0435\u0442 \u0434\u0430\u043D\u043D\u044B\u0445" })) : (_jsx("div", { children: teams.map((team, i) => {
                            const rank = i + 1;
                            const rd = getRankDisplay(rank);
                            return (_jsxs("div", { style: {
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 16,
                                    padding: '10px 20px',
                                    borderBottom: i < teams.length - 1 ? '1px solid #f5f5f5' : 'none',
                                    transition: 'background-color 0.15s',
                                }, onMouseEnter: (e) => { e.currentTarget.style.backgroundColor = '#f9f9f9'; }, onMouseLeave: (e) => { e.currentTarget.style.backgroundColor = 'transparent'; }, children: [_jsx("div", { style: {
                                            width: 40,
                                            height: 32,
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            borderRadius: 8,
                                            backgroundColor: rd.bg,
                                            color: rd.color,
                                            border: `1px solid ${rd.border}`,
                                            fontSize: 14,
                                            fontWeight: 700,
                                        }, children: rd.text }), _jsx("div", { style: { flex: 1, minWidth: 0 }, children: _jsx("span", { style: {
                                                fontWeight: 500,
                                                color: '#242424',
                                                overflow: 'hidden',
                                                textOverflow: 'ellipsis',
                                                whiteSpace: 'nowrap',
                                                display: 'block',
                                            }, children: team.name }) }), _jsxs("div", { style: { fontSize: 14, color: '#999' }, children: [_jsx("span", { style: { fontWeight: 600, color: '#666' }, children: team.memberCount ?? 0 }), ' ', "\u0443\u0447\u0430\u0441\u0442\u043D\u0438\u043A\u043E\u0432"] }), _jsxs("div", { style: { width: 96, textAlign: 'right' }, children: [_jsx("span", { style: { fontWeight: 600, color: '#242424' }, children: ((team.totalDistance ?? 0) / 1000).toFixed(1) }), _jsx("span", { style: { marginLeft: 4, fontSize: 12, color: '#999' }, children: "\u043A\u043C" })] })] }, team.id));
                        }) }))] })] }));
}
