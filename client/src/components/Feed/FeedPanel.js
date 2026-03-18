import { jsxs as _jsxs, jsx as _jsx, Fragment as _Fragment } from "react/jsx-runtime";
import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { api } from '@/services/api';
import { useAuth } from '@/context/AuthContext';
const SPORT = {
    RUNNING: { icon: '\🏃', label: '\П\р\о\б\е\ж\к\а', color: '#fc4c02', bg: '#fff4ef' },
    CYCLING: { icon: '\🚴', label: '\В\е\л\о', color: '#0061ff', bg: '#eef4ff' },
    SKIING: { icon: '\⛷\️', label: '\Л\ы\ж\и', color: '#0891b2', bg: '#edfbfe' },
    WALKING: { icon: '\🚶', label: '\Х\о\д\ь\б\а', color: '#7c3aed', bg: '#f5f0ff' },
};
function formatTimeAgo(dateStr) {
    const now = Date.now();
    const date = new Date(dateStr).getTime();
    const diff = Math.floor((now - date) / 1000);
    if (diff < 60)
        return `${diff} \с\е\к. \н\а\з\а\д`;
    const mins = Math.floor(diff / 60);
    if (mins < 60)
        return `${mins} \м\и\н. \н\а\з\а\д`;
    const hours = Math.floor(mins / 60);
    if (hours < 24)
        return `${hours} \ч. \н\а\з\а\д`;
    const days = Math.floor(hours / 24);
    if (days === 1)
        return '\в\ч\е\р\а';
    if (days < 7)
        return `${days} \д\н. \н\а\з\а\д`;
    const weeks = Math.floor(days / 7);
    if (weeks < 4)
        return `${weeks} \н\е\д. \н\а\з\а\д`;
    const months = Math.floor(days / 30);
    return `${months} \м\е\с. \н\а\з\а\д`;
}
function formatDuration(seconds) {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    return h > 0
        ? `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
        : `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}
function formatPace(avgPace) {
    if (!avgPace)
        return '--:--';
    const mins = Math.floor(avgPace);
    const secs = Math.round((avgPace - mins) * 60);
    return `${mins}:${String(secs).padStart(2, '0')}`;
}
export default function FeedPanel() {
    const { isAuthenticated } = useAuth();
    const [items, setItems] = useState([]);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [enlargedPhoto, setEnlargedPhoto] = useState(null);
    const loadFeed = useCallback(async (p, append) => {
        try {
            if (append)
                setLoadingMore(true);
            else
                setLoading(true);
            const data = await api.social.publicFeed({ page: p, limit: 20 });
            setItems(prev => append ? [...prev, ...data.items] : data.items);
            setTotalPages(data.pagination.totalPages);
            setPage(p);
        }
        catch (err) {
            console.error('Feed load error:', err);
        }
        finally {
            setLoading(false);
            setLoadingMore(false);
        }
    }, []);
    useEffect(() => { loadFeed(1, false); }, [loadFeed]);
    const handleLike = useCallback(async (activityId) => {
        if (!isAuthenticated)
            return;
        try {
            const res = await api.photos.like(activityId);
            setItems(prev => prev.map(item => item.id === activityId
                ? { ...item, isLiked: res.liked, _count: { ...item._count, likes: res.count } }
                : item));
        }
        catch (err) {
            console.error('Like error:', err);
        }
    }, [isAuthenticated]);
    if (loading) {
        return (_jsxs("div", { style: { display: 'flex', flexDirection: 'column', gap: 20 }, children: [_jsxs("h2", { style: { fontSize: 24, fontWeight: 800, color: '#242424', margin: 0 }, children: ['\📰', " \\\u041B\\\u0435\\\u043D\\\u0442\\\u0430 \\\u0430\\\u043A\\\u0442\\\u0438\\\u0432\\\u043D\\\u043E\\\u0441\\\u0442\\\u0435\\\u0439"] }), [1, 2, 3].map(i => (_jsxs("div", { style: {
                        background: '#fff', borderRadius: 16, border: '1px solid #e0e0e0',
                        boxShadow: '0 2px 12px rgba(0,0,0,0.04)', padding: 24, overflow: 'hidden',
                    }, children: [_jsxs("div", { style: { display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }, children: [_jsx("div", { style: { width: 40, height: 40, borderRadius: '50%', background: '#f0f0f0', animation: 'pulse 1.5s infinite' } }), _jsxs("div", { style: { flex: 1 }, children: [_jsx("div", { style: { width: 120, height: 14, borderRadius: 6, background: '#f0f0f0', marginBottom: 6, animation: 'pulse 1.5s infinite' } }), _jsx("div", { style: { width: 80, height: 10, borderRadius: 6, background: '#f5f5f5', animation: 'pulse 1.5s infinite' } })] })] }), _jsx("div", { style: { width: '60%', height: 18, borderRadius: 6, background: '#f0f0f0', marginBottom: 16, animation: 'pulse 1.5s infinite' } }), _jsx("div", { style: { display: 'flex', gap: 24 }, children: [1, 2, 3].map(j => (_jsxs("div", { style: { flex: 1 }, children: [_jsx("div", { style: { width: '80%', height: 20, borderRadius: 6, background: '#f0f0f0', marginBottom: 4, animation: 'pulse 1.5s infinite' } }), _jsx("div", { style: { width: '60%', height: 12, borderRadius: 6, background: '#f5f5f5', animation: 'pulse 1.5s infinite' } })] }, j))) })] }, i))), _jsx("style", { children: `@keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }` })] }));
    }
    if (items.length === 0) {
        return (_jsxs("div", { style: { textAlign: 'center', padding: '80px 24px' }, children: [_jsx("div", { style: { fontSize: 64, marginBottom: 16 }, children: '\🏃' }), _jsx("h3", { style: { fontSize: 20, fontWeight: 700, color: '#242424', margin: '0 0 8px' }, children: "\\\u041D\\\u0435\\\u0442 \\\u0430\\\u043A\\\u0442\\\u0438\\\u0432\\\u043D\\\u043E\\\u0441\\\u0442\\\u0435\\\u0439" }), _jsx("p", { style: { fontSize: 14, color: '#999', margin: 0 }, children: "\\\u041F\\\u043E\\\u043A\\\u0430 \\\u043D\\\u0438\\\u043A\\\u0442\\\u043E \\\u043D\\\u0435 \\\u0434\\\u043E\\\u0431\\\u0430\\\u0432\\\u0438\\\u043B \\\u0430\\\u043A\\\u0442\\\u0438\\\u0432\\\u043D\\\u043E\\\u0441\\\u0442\\\u044C. \\\u0411\\\u0443\\\u0434\\\u044C\\\u0442\\\u0435 \\\u043F\\\u0435\\\u0440\\\u0432\\\u044B\\\u043C!" })] }));
    }
    return (_jsxs("div", { style: { display: 'flex', flexDirection: 'column', gap: 20 }, children: [_jsxs("h2", { style: { fontSize: 24, fontWeight: 800, color: '#242424', margin: 0 }, children: ['\📰', " \\\u041B\\\u0435\\\u043D\\\u0442\\\u0430 \\\u0430\\\u043A\\\u0442\\\u0438\\\u0432\\\u043D\\\u043E\\\u0441\\\u0442\\\u0435\\\u0439"] }), items.map(item => {
                const sport = SPORT[item.sport] ?? SPORT.RUNNING;
                const distKm = (item.distance ?? 0) / 1000;
                const speedKmH = item.avgSpeed ?? (item.duration > 0 ? (distKm / (item.duration / 3600)) : 0);
                const photos = item.photos ?? [];
                const likeCount = item._count?.likes ?? 0;
                return (_jsxs(motion.div, { initial: { opacity: 0, y: 20 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.3 }, style: {
                        background: '#fff',
                        borderRadius: 16,
                        border: '1px solid #e0e0e0',
                        boxShadow: '0 2px 12px rgba(0,0,0,0.04)',
                        overflow: 'hidden',
                    }, children: [_jsxs("div", { style: {
                                display: 'flex', alignItems: 'center', gap: 12,
                                padding: '16px 20px 12px',
                            }, children: [_jsx("div", { style: {
                                        width: 40, height: 40, minWidth: 40, borderRadius: '50%',
                                        background: item.user.avatarUrl ? 'none' : 'linear-gradient(135deg, #fc4c02, #ff6b2b)',
                                        color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        fontSize: 16, fontWeight: 700, overflow: 'hidden',
                                        boxShadow: '0 1px 4px rgba(0,0,0,0.1)',
                                    }, children: item.user.avatarUrl
                                        ? _jsx("img", { src: item.user.avatarUrl, alt: "", style: { width: 40, height: 40, borderRadius: '50%', objectFit: 'cover' } })
                                        : (item.user.username ?? '?')[0].toUpperCase() }), _jsxs("div", { style: { flex: 1, minWidth: 0 }, children: [_jsxs("div", { style: { display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }, children: [_jsx("span", { style: { fontSize: 14, fontWeight: 700, color: '#242424' }, children: item.user.username ?? '\П\о\л\ь\з\о\в\а\т\е\л\ь' }), _jsxs("span", { style: {
                                                        fontSize: 11, fontWeight: 600, color: sport.color,
                                                        background: sport.bg, padding: '2px 8px', borderRadius: 10,
                                                    }, children: ["\\\u0423\\\u0440. ", item.user.level ?? 0] })] }), _jsx("div", { style: { fontSize: 12, color: '#aaa', marginTop: 2 }, children: formatTimeAgo(item.startedAt ?? item.createdAt) })] })] }), _jsx("div", { style: { padding: '0 20px 12px' }, children: _jsxs("div", { style: { display: 'flex', alignItems: 'center', gap: 8 }, children: [_jsx("span", { style: { fontSize: 20 }, children: sport.icon }), _jsxs("span", { style: { fontSize: 16, fontWeight: 700, color: '#242424' }, children: [item.title ?? sport.label, " ", distKm.toFixed(1), " \\\u043A\\\u043C"] })] }) }), _jsxs("div", { style: {
                                display: 'flex', gap: 0, padding: '12px 20px',
                                borderTop: '1px solid #f5f5f5', borderBottom: photos.length > 0 ? '1px solid #f5f5f5' : 'none',
                            }, children: [_jsxs("div", { style: { flex: 1, textAlign: 'center' }, children: [_jsx("div", { style: { fontSize: 18, fontWeight: 800, color: '#242424' }, children: distKm.toFixed(1) }), _jsx("div", { style: { fontSize: 11, color: '#aaa', marginTop: 2 }, children: "\\\u0414\\\u0438\\\u0441\\\u0442\\\u0430\\\u043D\\\u0446\\\u0438\\\u044F, \\\u043A\\\u043C" })] }), _jsx("div", { style: { width: 1, background: '#f0f0f0', margin: '0 4px' } }), _jsxs("div", { style: { flex: 1, textAlign: 'center' }, children: [_jsx("div", { style: { fontSize: 18, fontWeight: 800, color: '#242424' }, children: formatDuration(item.duration ?? 0) }), _jsx("div", { style: { fontSize: 11, color: '#aaa', marginTop: 2 }, children: "\\\u0412\\\u0440\\\u0435\\\u043C\\\u044F" })] }), _jsx("div", { style: { width: 1, background: '#f0f0f0', margin: '0 4px' } }), _jsx("div", { style: { flex: 1, textAlign: 'center' }, children: item.sport === 'RUNNING' || item.sport === 'WALKING' ? (_jsxs(_Fragment, { children: [_jsx("div", { style: { fontSize: 18, fontWeight: 800, color: '#242424' }, children: formatPace(item.avgPace) }), _jsx("div", { style: { fontSize: 11, color: '#aaa', marginTop: 2 }, children: "\\\u0422\\\u0435\\\u043C\\\u043F, \\\u043C\\\u0438\\\u043D/\\\u043A\\\u043C" })] })) : (_jsxs(_Fragment, { children: [_jsx("div", { style: { fontSize: 18, fontWeight: 800, color: '#242424' }, children: speedKmH.toFixed(1) }), _jsx("div", { style: { fontSize: 11, color: '#aaa', marginTop: 2 }, children: "\\\u0421\\\u043A\\\u043E\\\u0440\\\u043E\\\u0441\\\u0442\\\u044C, \\\u043A\\\u043C/\\\u0447" })] })) })] }), photos.length > 0 && (_jsx("div", { style: {
                                display: 'flex', gap: 6, padding: '12px 20px',
                                overflowX: 'auto',
                            }, children: photos.map(photo => (_jsx("div", { onClick: () => setEnlargedPhoto(photo.imageUrl), style: {
                                    width: 100, height: 100, minWidth: 100, borderRadius: 12,
                                    overflow: 'hidden', cursor: 'pointer',
                                    border: '1px solid #f0f0f0',
                                }, children: _jsx("img", { src: photo.imageUrl, alt: "", style: { width: '100%', height: '100%', objectFit: 'cover' } }) }, photo.id))) })), _jsx("div", { style: {
                                display: 'flex', alignItems: 'center', gap: 8,
                                padding: '12px 20px 16px',
                            }, children: _jsxs(motion.button, { whileTap: { scale: 0.85 }, onClick: () => handleLike(item.id), style: {
                                    display: 'flex', alignItems: 'center', gap: 6,
                                    background: 'none', border: 'none', cursor: isAuthenticated ? 'pointer' : 'default',
                                    padding: '4px 8px', borderRadius: 8, fontSize: 14, fontWeight: 600,
                                    color: item.isLiked ? '#fc4c02' : '#aaa',
                                    transition: 'color 0.2s',
                                }, children: [_jsx(motion.span, { initial: { scale: 1 }, animate: { scale: [1, 1.3, 1] }, transition: { duration: 0.3 }, style: { fontSize: 18 }, children: item.isLiked ? '\❤\️' : '\🤍' }, item.isLiked ? 'liked' : 'not'), likeCount > 0 && (_jsx("span", { style: { fontSize: 13 }, children: likeCount }))] }) })] }, item.id));
            }), page < totalPages && (_jsx("div", { style: { display: 'flex', justifyContent: 'center', padding: '8px 0' }, children: _jsx("button", { onClick: () => loadFeed(page + 1, true), disabled: loadingMore, style: {
                        padding: '12px 32px', fontSize: 14, fontWeight: 700,
                        color: '#fff', background: loadingMore ? '#ccc' : 'linear-gradient(135deg, #fc4c02, #ff6b2b)',
                        border: 'none', borderRadius: 12, cursor: loadingMore ? 'not-allowed' : 'pointer',
                        boxShadow: '0 2px 10px rgba(252,76,2,0.2)',
                        transition: 'all 0.2s',
                    }, children: loadingMore ? '\З\а\г\р\у\з\к\а...' : '\З\а\г\р\у\з\и\т\ь \е\щ\ё' }) })), _jsx(AnimatePresence, { children: enlargedPhoto && (_jsx(motion.div, { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 }, onClick: () => setEnlargedPhoto(null), style: {
                        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                        background: 'rgba(0,0,0,0.85)', display: 'flex',
                        alignItems: 'center', justifyContent: 'center',
                        zIndex: 9999, cursor: 'pointer', padding: 24,
                    }, children: _jsx(motion.img, { initial: { scale: 0.8, opacity: 0 }, animate: { scale: 1, opacity: 1 }, exit: { scale: 0.8, opacity: 0 }, src: enlargedPhoto, alt: "", style: {
                            maxWidth: '90vw', maxHeight: '90vh', borderRadius: 16,
                            objectFit: 'contain', boxShadow: '0 8px 40px rgba(0,0,0,0.4)',
                        } }) })) })] }));
}
