import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { lazy, Suspense, useCallback, useEffect, useState } from 'react';
import { api } from '@/services/api';
import { useAuth } from '@/context/AuthContext';
const BattlesSection = lazy(() => import('@/components/Battles/BattlesSection'));
export default function TeamsPanel() {
    const { user } = useAuth();
    const [teams, setTeams] = useState([]);
    const [myTeam, setMyTeam] = useState(null);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [showCreate, setShowCreate] = useState(false);
    const [createName, setCreateName] = useState('');
    const [createDesc, setCreateDesc] = useState('');
    const [createPublic, setCreatePublic] = useState(true);
    const [creating, setCreating] = useState(false);
    const [showJoinCode, setShowJoinCode] = useState(false);
    const [joinCode, setJoinCode] = useState('');
    const [joining, setJoining] = useState(false);
    const [codeCopied, setCodeCopied] = useState(false);
    const loadTeams = useCallback(async () => {
        setLoading(true);
        try {
            const res = await api.teams.list({ search: search || undefined });
            setTeams(res?.items ?? []);
        }
        catch {
            /* ignore */
        }
        finally {
            setLoading(false);
        }
    }, [search]);
    const loadMyTeam = useCallback(async () => {
        if (!user)
            return;
        try {
            const res = await api.teams.list();
            const items = res?.items ?? [];
            const found = items.find((t) => t.members?.some((m) => m.userId === user.id) || t.ownerId === user.id);
            if (found) {
                const full = await api.teams.get(found.id);
                setMyTeam(full);
            }
            else {
                setMyTeam(null);
            }
        }
        catch {
            /* ignore */
        }
    }, [user]);
    useEffect(() => {
        loadTeams();
    }, [loadTeams]);
    useEffect(() => {
        loadMyTeam();
    }, [loadMyTeam]);
    const handleCreate = async () => {
        if (!createName.trim())
            return;
        setCreating(true);
        try {
            await api.teams.create({
                name: createName.trim(),
                description: createDesc.trim() || undefined,
                isPublic: createPublic,
            });
            setShowCreate(false);
            setCreateName('');
            setCreateDesc('');
            setCreatePublic(true);
            loadTeams();
            loadMyTeam();
        }
        catch {
            /* ignore */
        }
        finally {
            setCreating(false);
        }
    };
    const handleJoinByCode = async () => {
        if (!joinCode.trim())
            return;
        setJoining(true);
        try {
            await api.teams.joinByCode(joinCode.trim());
            setShowJoinCode(false);
            setJoinCode('');
            loadTeams();
            loadMyTeam();
        }
        catch {
            /* ignore */
        }
        finally {
            setJoining(false);
        }
    };
    const handleJoin = async (teamId) => {
        try {
            await api.teams.join(teamId);
            loadTeams();
            loadMyTeam();
        }
        catch {
            /* ignore */
        }
    };
    const handleLeave = async (teamId) => {
        try {
            await api.teams.leave(teamId);
            setMyTeam(null);
            loadTeams();
        }
        catch {
            /* ignore */
        }
    };
    const copyInviteCode = (code) => {
        navigator.clipboard.writeText(code);
        setCodeCopied(true);
        setTimeout(() => setCodeCopied(false), 2000);
    };
    const isMember = (team) => {
        if (!user)
            return false;
        if (team.ownerId === user.id)
            return true;
        return team.members?.some((m) => m.userId === user.id) ?? false;
    };
    return (_jsxs("div", { style: { display: 'flex', flexDirection: 'column', gap: 24 }, children: [_jsxs("div", { style: { display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 16 }, children: [_jsx("h1", { style: { fontSize: 24, fontWeight: 700, color: '#242424', margin: 0 }, children: "\u041A\u043B\u0443\u0431\u044B" }), _jsxs("div", { style: { display: 'flex', gap: 8 }, children: [_jsx("button", { onClick: () => { setShowCreate(!showCreate); setShowJoinCode(false); }, style: {
                                    padding: '10px 20px',
                                    backgroundColor: '#fc4c02',
                                    color: '#fff',
                                    border: 'none',
                                    borderRadius: 8,
                                    fontSize: 14,
                                    fontWeight: 600,
                                    cursor: 'pointer',
                                }, children: "\u0421\u043E\u0437\u0434\u0430\u0442\u044C \u043A\u043B\u0443\u0431" }), _jsx("button", { onClick: () => { setShowJoinCode(!showJoinCode); setShowCreate(false); }, style: {
                                    padding: '10px 20px',
                                    backgroundColor: '#fff',
                                    color: '#242424',
                                    border: '1px solid #e0e0e0',
                                    borderRadius: 8,
                                    fontSize: 14,
                                    fontWeight: 600,
                                    cursor: 'pointer',
                                }, children: "\u0412\u043E\u0439\u0442\u0438 \u043F\u043E \u043A\u043E\u0434\u0443" })] })] }), showCreate && (_jsxs("div", { style: {
                    backgroundColor: '#fff',
                    border: '1px solid #e0e0e0',
                    borderRadius: 12,
                    padding: 20,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 16,
                }, children: [_jsx("h3", { style: { margin: 0, fontSize: 18, fontWeight: 600, color: '#242424' }, children: "\u041D\u043E\u0432\u044B\u0439 \u043A\u043B\u0443\u0431" }), _jsx("input", { type: "text", placeholder: "\u041D\u0430\u0437\u0432\u0430\u043D\u0438\u0435 \u043A\u043B\u0443\u0431\u0430", value: createName, onChange: (e) => setCreateName(e.target.value), style: {
                            width: '100%',
                            padding: '10px 16px',
                            border: '1px solid #e0e0e0',
                            borderRadius: 8,
                            fontSize: 14,
                            outline: 'none',
                            boxSizing: 'border-box',
                        } }), _jsx("textarea", { placeholder: "\u041E\u043F\u0438\u0441\u0430\u043D\u0438\u0435 (\u043D\u0435\u043E\u0431\u044F\u0437\u0430\u0442\u0435\u043B\u044C\u043D\u043E)", value: createDesc, onChange: (e) => setCreateDesc(e.target.value), rows: 3, style: {
                            width: '100%',
                            padding: '10px 16px',
                            border: '1px solid #e0e0e0',
                            borderRadius: 8,
                            fontSize: 14,
                            outline: 'none',
                            resize: 'none',
                            boxSizing: 'border-box',
                            fontFamily: 'inherit',
                        } }), _jsxs("div", { style: { display: 'flex', alignItems: 'center', gap: 12 }, children: [_jsx("button", { onClick: () => setCreatePublic(!createPublic), style: {
                                    position: 'relative',
                                    width: 44,
                                    height: 24,
                                    borderRadius: 12,
                                    border: 'none',
                                    backgroundColor: createPublic ? '#fc4c02' : '#e0e0e0',
                                    cursor: 'pointer',
                                    padding: 0,
                                    transition: 'background-color 0.2s',
                                }, children: _jsx("span", { style: {
                                        position: 'absolute',
                                        top: 2,
                                        left: createPublic ? 22 : 2,
                                        width: 20,
                                        height: 20,
                                        borderRadius: '50%',
                                        backgroundColor: '#fff',
                                        transition: 'left 0.2s',
                                        boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                                    } }) }), _jsx("span", { style: { fontSize: 14, color: '#666' }, children: createPublic ? 'Публичный клуб' : 'Приватный клуб' })] }), _jsxs("div", { style: { display: 'flex', gap: 8 }, children: [_jsx("button", { onClick: handleCreate, disabled: creating || !createName.trim(), style: {
                                    padding: '10px 20px',
                                    backgroundColor: creating || !createName.trim() ? '#ccc' : '#fc4c02',
                                    color: '#fff',
                                    border: 'none',
                                    borderRadius: 8,
                                    fontSize: 14,
                                    fontWeight: 600,
                                    cursor: creating || !createName.trim() ? 'not-allowed' : 'pointer',
                                }, children: creating ? 'Создание...' : 'Создать' }), _jsx("button", { onClick: () => setShowCreate(false), style: {
                                    padding: '10px 20px',
                                    backgroundColor: 'transparent',
                                    color: '#666',
                                    border: 'none',
                                    borderRadius: 8,
                                    fontSize: 14,
                                    cursor: 'pointer',
                                }, children: "\u041E\u0442\u043C\u0435\u043D\u0430" })] })] })), showJoinCode && (_jsxs("div", { style: {
                    backgroundColor: '#fff',
                    border: '1px solid #e0e0e0',
                    borderRadius: 12,
                    padding: 20,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 16,
                }, children: [_jsx("h3", { style: { margin: 0, fontSize: 18, fontWeight: 600, color: '#242424' }, children: "\u0412\u043E\u0439\u0442\u0438 \u043F\u043E \u043A\u043E\u0434\u0443" }), _jsxs("div", { style: { display: 'flex', gap: 8 }, children: [_jsx("input", { type: "text", placeholder: "\u0412\u0432\u0435\u0434\u0438\u0442\u0435 \u043A\u043E\u0434 \u043F\u0440\u0438\u0433\u043B\u0430\u0448\u0435\u043D\u0438\u044F", value: joinCode, onChange: (e) => setJoinCode(e.target.value), style: {
                                    flex: 1,
                                    padding: '10px 16px',
                                    border: '1px solid #e0e0e0',
                                    borderRadius: 8,
                                    fontSize: 14,
                                    outline: 'none',
                                } }), _jsx("button", { onClick: handleJoinByCode, disabled: joining || !joinCode.trim(), style: {
                                    padding: '10px 20px',
                                    backgroundColor: joining || !joinCode.trim() ? '#ccc' : '#fc4c02',
                                    color: '#fff',
                                    border: 'none',
                                    borderRadius: 8,
                                    fontSize: 14,
                                    fontWeight: 600,
                                    cursor: joining || !joinCode.trim() ? 'not-allowed' : 'pointer',
                                }, children: joining ? '...' : 'Вступить' })] })] })), myTeam && (_jsxs("div", { style: {
                    backgroundColor: '#fff',
                    border: '2px solid #fc4c02',
                    borderRadius: 12,
                    padding: 20,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 16,
                }, children: [_jsxs("div", { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }, children: [_jsxs("div", { children: [_jsx("span", { style: { fontSize: 12, fontWeight: 600, color: '#fc4c02', textTransform: 'uppercase', letterSpacing: 1 }, children: "\u041C\u043E\u0439 \u043A\u043B\u0443\u0431" }), _jsx("h2", { style: { margin: '4px 0 0', fontSize: 20, fontWeight: 700, color: '#242424' }, children: myTeam.name }), myTeam.description && (_jsx("p", { style: { margin: '4px 0 0', fontSize: 14, color: '#666' }, children: myTeam.description }))] }), _jsx("button", { onClick: () => handleLeave(myTeam.id), style: {
                                    padding: '6px 12px',
                                    backgroundColor: 'transparent',
                                    color: '#d32f2f',
                                    border: '1px solid #d32f2f',
                                    borderRadius: 8,
                                    fontSize: 12,
                                    cursor: 'pointer',
                                }, children: "\u041F\u043E\u043A\u0438\u043D\u0443\u0442\u044C" })] }), _jsxs("div", { style: { display: 'flex', gap: 24, fontSize: 14 }, children: [_jsxs("div", { children: [_jsx("span", { style: { color: '#999' }, children: "\u0423\u0447\u0430\u0441\u0442\u043D\u0438\u043A\u043E\u0432: " }), _jsx("span", { style: { fontWeight: 600, color: '#242424' }, children: myTeam.memberCount ?? 0 })] }), _jsxs("div", { children: [_jsx("span", { style: { color: '#999' }, children: "\u041E\u0431\u0449\u0430\u044F \u0434\u0438\u0441\u0442\u0430\u043D\u0446\u0438\u044F: " }), _jsxs("span", { style: { fontWeight: 600, color: '#242424' }, children: [((myTeam.totalDistance ?? 0) / 1000).toFixed(1), " \u043A\u043C"] })] })] }), _jsxs("div", { style: { display: 'flex', alignItems: 'center', gap: 8 }, children: [_jsx("span", { style: { fontSize: 14, color: '#999' }, children: "\u041A\u043E\u0434 \u043F\u0440\u0438\u0433\u043B\u0430\u0448\u0435\u043D\u0438\u044F:" }), _jsx("code", { style: {
                                    backgroundColor: '#eef0f4',
                                    padding: '4px 12px',
                                    borderRadius: 6,
                                    fontSize: 14,
                                    fontFamily: 'monospace',
                                    color: '#fc4c02',
                                    fontWeight: 600,
                                }, children: myTeam.inviteCode ?? '' }), _jsx("button", { onClick: () => copyInviteCode(myTeam.inviteCode ?? ''), style: {
                                    padding: '4px 10px',
                                    backgroundColor: '#eef0f4',
                                    color: '#666',
                                    border: 'none',
                                    borderRadius: 6,
                                    fontSize: 12,
                                    cursor: 'pointer',
                                }, children: codeCopied ? 'Скопировано!' : 'Копировать' })] }), myTeam.members && myTeam.members.length > 0 && (_jsxs("div", { style: { display: 'flex', flexDirection: 'column', gap: 8 }, children: [_jsx("h4", { style: { margin: 0, fontSize: 14, fontWeight: 500, color: '#999' }, children: "\u0423\u0447\u0430\u0441\u0442\u043D\u0438\u043A\u0438" }), _jsx("div", { style: { display: 'flex', flexWrap: 'wrap', gap: 8 }, children: myTeam.members.map((member) => (_jsxs("div", { style: {
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 8,
                                        backgroundColor: '#eef0f4',
                                        borderRadius: 8,
                                        padding: '6px 12px',
                                    }, children: [_jsx("div", { style: {
                                                width: 28,
                                                height: 28,
                                                borderRadius: '50%',
                                                backgroundColor: '#e0e0e0',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                fontSize: 12,
                                                fontWeight: 600,
                                                color: '#242424',
                                                overflow: 'hidden',
                                            }, children: member.user.avatarUrl ? (_jsx("img", { src: member.user.avatarUrl, alt: "", style: { width: 28, height: 28, borderRadius: '50%', objectFit: 'cover' } })) : ((member.user.username ?? '?').charAt(0).toUpperCase()) }), _jsx("span", { style: { fontSize: 14, color: '#242424' }, children: member.user.username ?? '?' }), member.role === 'OWNER' && (_jsx("span", { style: {
                                                backgroundColor: 'rgba(252,76,2,0.1)',
                                                color: '#fc4c02',
                                                fontSize: 10,
                                                fontWeight: 600,
                                                padding: '2px 6px',
                                                borderRadius: 4,
                                            }, children: "\u0412\u043B\u0430\u0434\u0435\u043B\u0435\u0446" })), member.role === 'ADMIN' && (_jsx("span", { style: {
                                                backgroundColor: 'rgba(0,97,255,0.1)',
                                                color: '#0061ff',
                                                fontSize: 10,
                                                fontWeight: 600,
                                                padding: '2px 6px',
                                                borderRadius: 4,
                                            }, children: "\u0410\u0434\u043C\u0438\u043D" }))] }, member.id))) })] }))] })), _jsx("input", { type: "text", placeholder: "\u041F\u043E\u0438\u0441\u043A \u043A\u043B\u0443\u0431\u043E\u0432...", value: search, onChange: (e) => setSearch(e.target.value), style: {
                    width: '100%',
                    padding: '12px 16px',
                    border: '1px solid #e0e0e0',
                    borderRadius: 12,
                    fontSize: 14,
                    outline: 'none',
                    backgroundColor: '#fff',
                    boxSizing: 'border-box',
                } }), loading ? (_jsx("div", { style: { display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16 }, children: Array.from({ length: 4 }).map((_, i) => (_jsxs("div", { style: {
                        backgroundColor: '#fff',
                        border: '1px solid #e0e0e0',
                        borderRadius: 12,
                        padding: 20,
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 12,
                    }, children: [_jsx("div", { style: { height: 20, width: 120, backgroundColor: '#eef0f4', borderRadius: 4 } }), _jsx("div", { style: { height: 14, width: '100%', backgroundColor: '#eef0f4', borderRadius: 4 } }), _jsx("div", { style: { height: 14, width: '66%', backgroundColor: '#eef0f4', borderRadius: 4 } })] }, i))) })) : teams.length === 0 ? (_jsx("div", { style: {
                    backgroundColor: '#fff',
                    border: '1px solid #e0e0e0',
                    borderRadius: 12,
                    padding: 32,
                    textAlign: 'center',
                }, children: _jsx("p", { style: { color: '#999', margin: 0 }, children: "\u041A\u043B\u0443\u0431\u044B \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D\u044B" }) })) : (_jsx("div", { style: { display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16 }, children: teams.map((team) => (_jsxs("div", { style: {
                        backgroundColor: '#fff',
                        border: '1px solid #e0e0e0',
                        borderRadius: 12,
                        padding: 20,
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 12,
                        transition: 'border-color 0.2s',
                    }, onMouseEnter: (e) => { e.currentTarget.style.borderColor = '#fc4c02'; }, onMouseLeave: (e) => { e.currentTarget.style.borderColor = '#e0e0e0'; }, children: [_jsxs("div", { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }, children: [_jsxs("div", { style: { minWidth: 0, flex: 1 }, children: [_jsx("h3", { style: { margin: 0, fontWeight: 700, color: '#242424', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }, children: team.name }), team.description && (_jsx("p", { style: { margin: '4px 0 0', fontSize: 14, color: '#666', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }, children: team.description }))] }), !team.isPublic && (_jsx("span", { style: {
                                        marginLeft: 8,
                                        backgroundColor: '#eef0f4',
                                        padding: '2px 8px',
                                        borderRadius: 4,
                                        fontSize: 10,
                                        color: '#999',
                                    }, children: "\u041F\u0440\u0438\u0432\u0430\u0442\u043D\u044B\u0439" }))] }), _jsxs("div", { style: { display: 'flex', gap: 16, fontSize: 14, color: '#999' }, children: [_jsxs("span", { children: [_jsx("span", { style: { fontWeight: 600, color: '#242424' }, children: team.memberCount ?? 0 }), " \u0443\u0447\u0430\u0441\u0442\u043D\u0438\u043A\u043E\u0432"] }), _jsxs("span", { children: [_jsx("span", { style: { fontWeight: 600, color: '#242424' }, children: ((team.totalDistance ?? 0) / 1000).toFixed(1) }), ' ', "\u043A\u043C"] })] }), team.members && team.members.length > 0 && (_jsxs("div", { style: { display: 'flex' }, children: [team.members.slice(0, 5).map((member, idx) => (_jsx("div", { title: member.user.username ?? '?', style: {
                                        width: 28,
                                        height: 28,
                                        borderRadius: '50%',
                                        backgroundColor: '#e0e0e0',
                                        border: '2px solid #fff',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        fontSize: 10,
                                        color: '#242424',
                                        fontWeight: 600,
                                        marginLeft: idx > 0 ? -8 : 0,
                                        overflow: 'hidden',
                                    }, children: member.user.avatarUrl ? (_jsx("img", { src: member.user.avatarUrl, alt: "", style: { width: 28, height: 28, borderRadius: '50%', objectFit: 'cover' } })) : ((member.user.username ?? '?').charAt(0).toUpperCase()) }, member.id))), team.members.length > 5 && (_jsxs("div", { style: {
                                        width: 28,
                                        height: 28,
                                        borderRadius: '50%',
                                        backgroundColor: '#eef0f4',
                                        border: '2px solid #fff',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        fontSize: 10,
                                        color: '#999',
                                        marginLeft: -8,
                                    }, children: ["+", team.members.length - 5] }))] })), _jsx("div", { children: isMember(team) ? (_jsx("span", { style: { fontSize: 14, fontWeight: 500, color: '#1a7f37' }, children: "\u0412\u044B \u0443\u0447\u0430\u0441\u0442\u043D\u0438\u043A \u2713" })) : team.isPublic ? (_jsx("button", { onClick: () => handleJoin(team.id), style: {
                                    padding: '6px 16px',
                                    backgroundColor: 'rgba(252,76,2,0.1)',
                                    color: '#fc4c02',
                                    border: 'none',
                                    borderRadius: 8,
                                    fontSize: 14,
                                    fontWeight: 600,
                                    cursor: 'pointer',
                                }, children: "\u0412\u0441\u0442\u0443\u043F\u0438\u0442\u044C" })) : null })] }, team.id))) })), user && (_jsx(Suspense, { fallback: null, children: _jsx(BattlesSection, {}) }))] }));
}
