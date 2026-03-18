import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useCallback, useEffect, useState } from 'react';
import { api } from '@/services/api';
import { useAuth } from '@/context/AuthContext';
const SPORT_ICONS = {
    RUNNING: '\u{1F3C3}',
    CYCLING: '\u{1F6B4}',
    SKIING: '\u26F7\uFE0F',
    WALKING: '\u{1F6B6}',
};
const SPORT_LABELS = {
    RUNNING: '\u0411\u0435\u0433',
    CYCLING: '\u0412\u0435\u043B\u043E\u0441\u0438\u043F\u0435\u0434',
    SKIING: '\u041B\u044B\u0436\u0438',
    WALKING: '\u0425\u043E\u0434\u044C\u0431\u0430',
};
const SPORT_COLORS = {
    RUNNING: '#fc4c02',
    CYCLING: '#0061ff',
    SKIING: '#0891b2',
    WALKING: '#7c3aed',
};
const ALL_SPORTS = ['RUNNING', 'CYCLING', 'SKIING', 'WALKING'];
function formatDuration(seconds) {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    if (h > 0)
        return `${h}\u0447 ${m}\u043C`;
    return `${m}\u043C`;
}
function formatDate(dateStr) {
    try {
        return new Intl.DateTimeFormat('ru-RU', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
        }).format(new Date(dateStr));
    }
    catch {
        return dateStr;
    }
}
function formatDateTime(dateStr, time) {
    try {
        const d = new Intl.DateTimeFormat('ru-RU', {
            day: 'numeric',
            month: 'short',
        }).format(new Date(dateStr));
        return `${d}, ${time}`;
    }
    catch {
        return `${dateStr}, ${time}`;
    }
}
// ─── Shared styles ──────────────────────────────────────
const cardStyle = {
    background: '#fff',
    borderRadius: 16,
    padding: 20,
    boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
    border: '1px solid #e0e0e0',
    marginBottom: 16,
};
const sectionTitleStyle = {
    fontSize: 18,
    fontWeight: 700,
    color: '#242424',
    marginBottom: 16,
    marginTop: 0,
};
const inputStyle = {
    width: '100%',
    padding: '8px 12px',
    borderRadius: 8,
    border: '1px solid #e0e0e0',
    fontSize: 14,
    outline: 'none',
    boxSizing: 'border-box',
};
const btnPrimary = {
    padding: '8px 20px',
    borderRadius: 8,
    border: 'none',
    background: '#fc4c02',
    color: '#fff',
    fontSize: 14,
    fontWeight: 600,
    cursor: 'pointer',
};
const btnOutline = {
    padding: '6px 16px',
    borderRadius: 8,
    border: '1px solid #e0e0e0',
    background: '#fff',
    color: '#666',
    fontSize: 13,
    fontWeight: 600,
    cursor: 'pointer',
};
function Avatar({ url, username, size = 40 }) {
    if (url) {
        return (_jsx("img", { src: url, alt: username, style: {
                width: size,
                height: size,
                borderRadius: '50%',
                objectFit: 'cover',
                flexShrink: 0,
            } }));
    }
    return (_jsx("div", { style: {
            width: size,
            height: size,
            borderRadius: '50%',
            background: '#fc4c02',
            color: '#fff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: size * 0.45,
            fontWeight: 700,
            flexShrink: 0,
        }, children: (username ?? '?')[0].toUpperCase() }));
}
// ─── Feed Section ───────────────────────────────────────
function FeedSection() {
    const { isAuthenticated } = useAuth();
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(false);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(0);
    const loadFeed = useCallback(async (p) => {
        if (!isAuthenticated)
            return;
        setLoading(true);
        try {
            const res = await api.social.feed({ page: p, limit: 15 });
            setItems(res.items);
            setTotalPages(res.pagination.totalPages);
            setPage(res.pagination.page);
        }
        catch {
            // ignore
        }
        finally {
            setLoading(false);
        }
    }, [isAuthenticated]);
    useEffect(() => {
        loadFeed(1);
    }, [loadFeed]);
    if (!isAuthenticated) {
        return (_jsxs("div", { style: cardStyle, children: [_jsx("h3", { style: sectionTitleStyle, children: "\u041B\u0435\u043D\u0442\u0430 \u0430\u043A\u0442\u0438\u0432\u043D\u043E\u0441\u0442\u0435\u0439" }), _jsx("div", { style: { color: '#999', fontSize: 14, textAlign: 'center', padding: '24px 0' }, children: "\u0412\u043E\u0439\u0434\u0438\u0442\u0435, \u0447\u0442\u043E\u0431\u044B \u0432\u0438\u0434\u0435\u0442\u044C \u043B\u0435\u043D\u0442\u0443 \u043F\u043E\u0434\u043F\u0438\u0441\u043E\u043A" })] }));
    }
    return (_jsxs("div", { style: cardStyle, children: [_jsx("h3", { style: sectionTitleStyle, children: "\u041B\u0435\u043D\u0442\u0430 \u0430\u043A\u0442\u0438\u0432\u043D\u043E\u0441\u0442\u0435\u0439" }), loading && items.length === 0 ? (_jsx("div", { style: { color: '#999', fontSize: 14, textAlign: 'center', padding: '24px 0' }, children: "\u0417\u0430\u0433\u0440\u0443\u0437\u043A\u0430..." })) : items.length === 0 ? (_jsx("div", { style: { color: '#999', fontSize: 14, textAlign: 'center', padding: '24px 0' }, children: "\u041B\u0435\u043D\u0442\u0430 \u043F\u0443\u0441\u0442\u0430. \u041F\u043E\u0434\u043F\u0438\u0448\u0438\u0442\u0435\u0441\u044C \u043D\u0430 \u0434\u0440\u0443\u0433\u0438\u0445 \u0441\u043F\u043E\u0440\u0442\u0441\u043C\u0435\u043D\u043E\u0432, \u0447\u0442\u043E\u0431\u044B \u0432\u0438\u0434\u0435\u0442\u044C \u0438\u0445 \u0442\u0440\u0435\u043D\u0438\u0440\u043E\u0432\u043A\u0438." })) : (_jsxs(_Fragment, { children: [items.map((item) => (_jsxs("div", { style: {
                            display: 'flex',
                            alignItems: 'flex-start',
                            gap: 12,
                            padding: '12px 0',
                            borderBottom: '1px solid #f0f0f0',
                        }, children: [_jsx(Avatar, { url: item.user.avatarUrl, username: item.user.username, size: 40 }), _jsxs("div", { style: { flex: 1, minWidth: 0 }, children: [_jsxs("div", { style: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }, children: [_jsx("span", { style: { fontWeight: 700, fontSize: 14, color: '#242424' }, children: item.user.username }), _jsxs("span", { style: {
                                                    fontSize: 11,
                                                    color: '#fff',
                                                    background: '#fc4c02',
                                                    borderRadius: 4,
                                                    padding: '1px 6px',
                                                    fontWeight: 600,
                                                }, children: ["\u0423\u0440. ", item.user.level] })] }), _jsxs("div", { style: { display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }, children: [_jsxs("span", { style: {
                                                    fontSize: 13,
                                                    fontWeight: 600,
                                                    color: SPORT_COLORS[item.sport] ?? '#666',
                                                }, children: [SPORT_ICONS[item.sport], " ", SPORT_LABELS[item.sport]] }), _jsxs("span", { style: { fontSize: 13, color: '#242424', fontWeight: 700 }, children: [item.distance.toFixed(2), " \u043A\u043C"] }), _jsx("span", { style: { fontSize: 13, color: '#666' }, children: formatDuration(item.duration) }), item.title && (_jsxs("span", { style: { fontSize: 13, color: '#999' }, children: ["\u2014 ", item.title] }))] }), _jsxs("div", { style: {
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: 12,
                                            marginTop: 4,
                                            fontSize: 12,
                                            color: '#aaa',
                                        }, children: [_jsx("span", { children: formatDate(item.startedAt) }), _jsxs("span", { style: { display: 'flex', alignItems: 'center', gap: 3 }, children: ["\u2764\uFE0F ", item._count?.likes ?? 0] })] })] })] }, item.id))), totalPages > 1 && (_jsxs("div", { style: {
                            display: 'flex',
                            justifyContent: 'center',
                            gap: 8,
                            marginTop: 16,
                        }, children: [_jsx("button", { disabled: page <= 1, onClick: () => loadFeed(page - 1), style: {
                                    ...btnOutline,
                                    opacity: page <= 1 ? 0.5 : 1,
                                    cursor: page <= 1 ? 'not-allowed' : 'pointer',
                                }, children: "\u041D\u0430\u0437\u0430\u0434" }), _jsxs("span", { style: { fontSize: 13, color: '#999', lineHeight: '32px' }, children: [page, " / ", totalPages] }), _jsx("button", { disabled: page >= totalPages, onClick: () => loadFeed(page + 1), style: {
                                    ...btnOutline,
                                    opacity: page >= totalPages ? 0.5 : 1,
                                    cursor: page >= totalPages ? 'not-allowed' : 'pointer',
                                }, children: "\u0414\u0430\u043B\u0435\u0435" })] }))] }))] }));
}
// ─── People Search Section ──────────────────────────────
function SearchSection() {
    const { isAuthenticated, user: currentUser } = useAuth();
    const [query, setQuery] = useState('');
    const [cityFilter, setCityFilter] = useState('');
    const [results, setResults] = useState([]);
    const [loading, setLoading] = useState(false);
    const [followingSet, setFollowingSet] = useState(new Set());
    const doSearch = useCallback(async () => {
        if (!query && !cityFilter)
            return;
        setLoading(true);
        try {
            const users = await api.social.searchUsers({
                q: query || undefined,
                city: cityFilter || undefined,
            });
            setResults(users);
        }
        catch {
            // ignore
        }
        finally {
            setLoading(false);
        }
    }, [query, cityFilter]);
    // Load following set on mount
    useEffect(() => {
        if (!isAuthenticated || !currentUser)
            return;
        api.social
            .following(currentUser.id)
            .then((list) => {
            setFollowingSet(new Set(list.map((u) => u.id)));
        })
            .catch(() => { });
    }, [isAuthenticated, currentUser]);
    const handleFollow = useCallback(async (userId) => {
        if (!isAuthenticated)
            return;
        try {
            const res = await api.social.follow(userId);
            setFollowingSet((prev) => {
                const next = new Set(prev);
                if (res.isFollowing)
                    next.add(userId);
                else
                    next.delete(userId);
                return next;
            });
        }
        catch {
            // ignore
        }
    }, [isAuthenticated]);
    const handleSubmit = (e) => {
        e.preventDefault();
        doSearch();
    };
    return (_jsxs("div", { style: cardStyle, children: [_jsx("h3", { style: sectionTitleStyle, children: "\u041F\u043E\u0438\u0441\u043A \u043B\u044E\u0434\u0435\u0439" }), _jsxs("form", { onSubmit: handleSubmit, style: { display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }, children: [_jsx("input", { placeholder: "\u0418\u043C\u044F \u043F\u043E\u043B\u044C\u0437\u043E\u0432\u0430\u0442\u0435\u043B\u044F", value: query, onChange: (e) => setQuery(e.target.value), style: { ...inputStyle, flex: 1, minWidth: 140 } }), _jsx("input", { placeholder: "\u0413\u043E\u0440\u043E\u0434", value: cityFilter, onChange: (e) => setCityFilter(e.target.value), style: { ...inputStyle, flex: 1, minWidth: 120 } }), _jsx("button", { type: "submit", disabled: loading, style: btnPrimary, children: loading ? '...' : 'Найти' })] }), results.length === 0 && !loading && (_jsx("div", { style: { color: '#999', fontSize: 14, textAlign: 'center', padding: '12px 0' }, children: "\u0412\u0432\u0435\u0434\u0438\u0442\u0435 \u0438\u043C\u044F \u0438\u043B\u0438 \u0433\u043E\u0440\u043E\u0434 \u0434\u043B\u044F \u043F\u043E\u0438\u0441\u043A\u0430" })), results.map((u) => {
                const isSelf = currentUser?.id === u.id;
                const isFollowing = followingSet.has(u.id);
                return (_jsxs("div", { style: {
                        display: 'flex',
                        alignItems: 'center',
                        gap: 12,
                        padding: '10px 0',
                        borderBottom: '1px solid #f0f0f0',
                    }, children: [_jsx(Avatar, { url: u.avatarUrl, username: u.username, size: 44 }), _jsxs("div", { style: { flex: 1, minWidth: 0 }, children: [_jsx("div", { style: { fontWeight: 700, fontSize: 14, color: '#242424' }, children: u.username }), _jsxs("div", { style: { fontSize: 12, color: '#999', display: 'flex', gap: 8, flexWrap: 'wrap' }, children: [u.city && _jsx("span", { children: u.city }), _jsxs("span", { children: ["\u0423\u0440. ", u.level] }), _jsxs("span", { children: [u.totalDistance.toFixed(1), " \u043A\u043C"] }), _jsxs("span", { children: [u._count?.followers ?? 0, " \u043F\u043E\u0434\u043F."] })] })] }), !isSelf && isAuthenticated && (_jsx("button", { onClick: () => handleFollow(u.id), style: {
                                ...btnOutline,
                                background: isFollowing ? '#fff4ef' : '#fff',
                                color: isFollowing ? '#fc4c02' : '#666',
                                borderColor: isFollowing ? '#fc4c02' : '#e0e0e0',
                            }, children: isFollowing ? 'Отписаться' : 'Подписаться' }))] }, u.id));
            })] }));
}
// ─── Planned Activities Section ─────────────────────────
function PlannedSection() {
    const { isAuthenticated, user: currentUser } = useAuth();
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(false);
    const [showForm, setShowForm] = useState(false);
    const [cityFilter, setCityFilter] = useState('');
    const [sportFilter, setSportFilter] = useState('');
    // Form state
    const [formSport, setFormSport] = useState('RUNNING');
    const [formCity, setFormCity] = useState('');
    const [formDate, setFormDate] = useState('');
    const [formTime, setFormTime] = useState('07:00');
    const [formDesc, setFormDesc] = useState('');
    const [formMax, setFormMax] = useState(5);
    const [submitting, setSubmitting] = useState(false);
    const loadPlanned = useCallback(async () => {
        setLoading(true);
        try {
            const data = await api.social.listPlanned({
                city: cityFilter || undefined,
                sport: sportFilter || undefined,
            });
            setItems(data);
        }
        catch {
            // ignore
        }
        finally {
            setLoading(false);
        }
    }, [cityFilter, sportFilter]);
    useEffect(() => {
        loadPlanned();
    }, [loadPlanned]);
    const handleCreate = useCallback(async (e) => {
        e.preventDefault();
        if (!formCity || !formDate || !formTime)
            return;
        setSubmitting(true);
        try {
            await api.social.createPlanned({
                sport: formSport,
                city: formCity,
                date: formDate,
                time: formTime,
                description: formDesc || undefined,
                maxPeople: formMax,
            });
            setShowForm(false);
            setFormCity('');
            setFormDate('');
            setFormTime('07:00');
            setFormDesc('');
            setFormMax(5);
            loadPlanned();
        }
        catch {
            // ignore
        }
        finally {
            setSubmitting(false);
        }
    }, [formSport, formCity, formDate, formTime, formDesc, formMax, loadPlanned]);
    const handleDelete = useCallback(async (id) => {
        try {
            await api.social.deletePlanned(id);
            setItems((prev) => prev.filter((p) => p.id !== id));
        }
        catch {
            // ignore
        }
    }, []);
    return (_jsxs("div", { style: cardStyle, children: [_jsxs("div", { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }, children: [_jsx("h3", { style: { ...sectionTitleStyle, marginBottom: 0 }, children: "\u041F\u043B\u0430\u043D\u0438\u0440\u0443\u044E \u0430\u043A\u0442\u0438\u0432\u043D\u043E\u0441\u0442\u044C" }), isAuthenticated && (_jsx("button", { onClick: () => setShowForm(!showForm), style: btnPrimary, children: showForm ? 'Отмена' : 'Создать план' }))] }), showForm && (_jsxs("form", { onSubmit: handleCreate, style: {
                    background: '#f9f9f9',
                    borderRadius: 12,
                    padding: 16,
                    marginBottom: 16,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 10,
                }, children: [_jsxs("div", { style: { display: 'flex', gap: 8, flexWrap: 'wrap' }, children: [_jsxs("div", { style: { flex: 1, minWidth: 120 }, children: [_jsx("label", { style: { fontSize: 12, color: '#666', display: 'block', marginBottom: 4 }, children: "\u0412\u0438\u0434 \u0441\u043F\u043E\u0440\u0442\u0430" }), _jsx("select", { value: formSport, onChange: (e) => setFormSport(e.target.value), style: { ...inputStyle, cursor: 'pointer' }, children: ALL_SPORTS.map((s) => (_jsxs("option", { value: s, children: [SPORT_ICONS[s], " ", SPORT_LABELS[s]] }, s))) })] }), _jsxs("div", { style: { flex: 1, minWidth: 120 }, children: [_jsx("label", { style: { fontSize: 12, color: '#666', display: 'block', marginBottom: 4 }, children: "\u0413\u043E\u0440\u043E\u0434 *" }), _jsx("input", { required: true, value: formCity, onChange: (e) => setFormCity(e.target.value), placeholder: "\u041C\u043E\u0441\u043A\u0432\u0430", style: inputStyle })] })] }), _jsxs("div", { style: { display: 'flex', gap: 8, flexWrap: 'wrap' }, children: [_jsxs("div", { style: { flex: 1, minWidth: 120 }, children: [_jsx("label", { style: { fontSize: 12, color: '#666', display: 'block', marginBottom: 4 }, children: "\u0414\u0430\u0442\u0430 *" }), _jsx("input", { required: true, type: "date", value: formDate, onChange: (e) => setFormDate(e.target.value), style: inputStyle })] }), _jsxs("div", { style: { flex: 1, minWidth: 100 }, children: [_jsx("label", { style: { fontSize: 12, color: '#666', display: 'block', marginBottom: 4 }, children: "\u0412\u0440\u0435\u043C\u044F *" }), _jsx("input", { required: true, type: "time", value: formTime, onChange: (e) => setFormTime(e.target.value), style: inputStyle })] }), _jsxs("div", { style: { flex: 1, minWidth: 80 }, children: [_jsx("label", { style: { fontSize: 12, color: '#666', display: 'block', marginBottom: 4 }, children: "\u041C\u0430\u043A\u0441. \u043B\u044E\u0434\u0435\u0439" }), _jsx("input", { type: "number", min: 2, max: 50, value: formMax, onChange: (e) => setFormMax(Number(e.target.value)), style: inputStyle })] })] }), _jsxs("div", { children: [_jsx("label", { style: { fontSize: 12, color: '#666', display: 'block', marginBottom: 4 }, children: "\u041E\u043F\u0438\u0441\u0430\u043D\u0438\u0435" }), _jsx("textarea", { value: formDesc, onChange: (e) => setFormDesc(e.target.value), rows: 2, placeholder: "\u0411\u0435\u0436\u0438\u043C \u0432\u043C\u0435\u0441\u0442\u0435 \u0432 \u043F\u0430\u0440\u043A\u0435...", style: { ...inputStyle, resize: 'vertical', fontFamily: 'inherit' } })] }), _jsx("button", { type: "submit", disabled: submitting, style: { ...btnPrimary, alignSelf: 'flex-start' }, children: submitting ? 'Создание...' : 'Опубликовать' })] })), _jsxs("div", { style: { display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }, children: [_jsx("input", { placeholder: "\u0424\u0438\u043B\u044C\u0442\u0440 \u043F\u043E \u0433\u043E\u0440\u043E\u0434\u0443", value: cityFilter, onChange: (e) => setCityFilter(e.target.value), style: { ...inputStyle, flex: 1, minWidth: 120 } }), _jsxs("select", { value: sportFilter, onChange: (e) => setSportFilter(e.target.value), style: { ...inputStyle, width: 'auto', minWidth: 140, cursor: 'pointer' }, children: [_jsx("option", { value: "", children: "\u0412\u0441\u0435 \u0432\u0438\u0434\u044B" }), ALL_SPORTS.map((s) => (_jsxs("option", { value: s, children: [SPORT_ICONS[s], " ", SPORT_LABELS[s]] }, s)))] })] }), loading ? (_jsx("div", { style: { color: '#999', fontSize: 14, textAlign: 'center', padding: '16px 0' }, children: "\u0417\u0430\u0433\u0440\u0443\u0437\u043A\u0430..." })) : items.length === 0 ? (_jsx("div", { style: { color: '#999', fontSize: 14, textAlign: 'center', padding: '16px 0' }, children: "\u041D\u0435\u0442 \u0437\u0430\u043F\u043B\u0430\u043D\u0438\u0440\u043E\u0432\u0430\u043D\u043D\u044B\u0445 \u0430\u043A\u0442\u0438\u0432\u043D\u043E\u0441\u0442\u0435\u0439" })) : (items.map((item) => {
                const isMine = currentUser?.id === item.userId;
                return (_jsxs("div", { style: {
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: 12,
                        padding: '12px 0',
                        borderBottom: '1px solid #f0f0f0',
                    }, children: [_jsx("div", { style: {
                                width: 44,
                                height: 44,
                                borderRadius: 12,
                                background: (SPORT_COLORS[item.sport] ?? '#fc4c02') + '18',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: 22,
                                flexShrink: 0,
                            }, children: SPORT_ICONS[item.sport] }), _jsxs("div", { style: { flex: 1, minWidth: 0 }, children: [_jsxs("div", { style: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }, children: [_jsx("span", { style: {
                                                fontWeight: 700,
                                                fontSize: 14,
                                                color: SPORT_COLORS[item.sport] ?? '#242424',
                                            }, children: SPORT_LABELS[item.sport] }), _jsx("span", { style: { fontSize: 13, color: '#666' }, children: item.city })] }), _jsxs("div", { style: { fontSize: 13, color: '#242424', marginBottom: 4 }, children: [formatDateTime(item.date, item.time), " \u00B7 \u0434\u043E ", item.maxPeople, " \u0447\u0435\u043B."] }), item.description && (_jsx("div", { style: { fontSize: 13, color: '#888', marginBottom: 4 }, children: item.description })), _jsxs("div", { style: { display: 'flex', alignItems: 'center', gap: 8 }, children: [_jsx(Avatar, { url: item.user.avatarUrl, username: item.user.username, size: 20 }), _jsx("span", { style: { fontSize: 12, color: '#999' }, children: item.user.username })] })] }), _jsx("div", { style: { display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'flex-end' }, children: isMine ? (_jsx("button", { onClick: () => handleDelete(item.id), style: {
                                    ...btnOutline,
                                    fontSize: 12,
                                    padding: '4px 12px',
                                    color: '#d93025',
                                    borderColor: '#fecaca',
                                }, children: "\u0423\u0434\u0430\u043B\u0438\u0442\u044C" })) : (_jsx("span", { style: {
                                    fontSize: 12,
                                    color: '#fc4c02',
                                    fontWeight: 600,
                                    cursor: 'pointer',
                                    padding: '4px 12px',
                                    borderRadius: 8,
                                    border: '1px solid #fc4c02',
                                    background: '#fff4ef',
                                }, children: "\u0425\u043E\u0447\u0443 \u043F\u0440\u0438\u0441\u043E\u0435\u0434\u0438\u043D\u0438\u0442\u044C\u0441\u044F" })) })] }, item.id));
            }))] }));
}
// ─── Main Community Panel ───────────────────────────────
export default function CommunityPanel() {
    const [section, setSection] = useState('feed');
    const tabs = [
        { id: 'feed', label: 'Лента', icon: '📰' },
        { id: 'search', label: 'Поиск людей', icon: '🔍' },
        { id: 'planned', label: 'Найти компанию', icon: '📅' },
    ];
    return (_jsxs("div", { style: { maxWidth: 800, margin: '0 auto' }, children: [_jsx("div", { style: {
                    display: 'flex',
                    gap: 8,
                    marginBottom: 20,
                    background: '#fff',
                    borderRadius: 12,
                    padding: 6,
                    boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
                    border: '1px solid #e0e0e0',
                }, children: tabs.map((tab) => (_jsxs("button", { onClick: () => setSection(tab.id), style: {
                        flex: 1,
                        padding: '10px 8px',
                        borderRadius: 8,
                        border: 'none',
                        cursor: 'pointer',
                        fontSize: 14,
                        fontWeight: 600,
                        background: section === tab.id ? '#fc4c02' : 'transparent',
                        color: section === tab.id ? '#fff' : '#888',
                        transition: 'all 0.15s',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 6,
                    }, children: [_jsx("span", { children: tab.icon }), tab.label] }, tab.id))) }), section === 'feed' && _jsx(FeedSection, {}), section === 'search' && _jsx(SearchSection, {}), section === 'planned' && _jsx(PlannedSection, {})] }));
}
