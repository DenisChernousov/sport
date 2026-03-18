import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { api } from '@/services/api';
import { useAuth } from '@/context/AuthContext';
import { MedalShopModal } from './MedalShopModal';
const SPORT = {
    RUNNING: { icon: '🏃', label: 'Бег', color: '#fc4c02', bg: '#fff4ef', gradient: 'linear-gradient(135deg, #fc4c02, #ff8a50)' },
    CYCLING: { icon: '🚴', label: 'Вело', color: '#0061ff', bg: '#eef4ff', gradient: 'linear-gradient(135deg, #0061ff, #4d9aff)' },
    SKIING: { icon: '⛷️', label: 'Лыжи', color: '#0891b2', bg: '#edfbfe', gradient: 'linear-gradient(135deg, #0891b2, #22d3ee)' },
    WALKING: { icon: '🚶', label: 'Ходьба', color: '#7c3aed', bg: '#f5f0ff', gradient: 'linear-gradient(135deg, #7c3aed, #a78bfa)' },
};
const TYPE_LABEL = {
    RACE: 'Забег', CHALLENGE: 'Челлендж', ULTRAMARATHON: 'Ультрамарафон', WEEKLY: 'Неделя', BATTLE: 'Батл',
};
const STATUS = {
    REGISTRATION: { label: 'Регистрация', color: '#1a7f37' },
    ACTIVE: { label: 'Активно', color: '#fc4c02' },
    FINISHED: { label: 'Завершено', color: '#999' },
};
const SPORTS = [null, 'RUNNING', 'CYCLING', 'SKIING', 'WALKING'];
const TYPES = [null, 'RACE', 'CHALLENGE', 'ULTRAMARATHON', 'WEEKLY'];
const STATUSES = [null, 'REGISTRATION', 'ACTIVE', 'FINISHED'];
const df = new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'short' });
function Pill({ active, children, onClick }) {
    return (_jsx("button", { onClick: onClick, style: {
            padding: '6px 14px', borderRadius: 20, fontSize: 13, fontWeight: 600, cursor: 'pointer',
            border: active ? '2px solid #242424' : '1.5px solid #ddd',
            background: active ? '#242424' : '#fff',
            color: active ? '#fff' : '#666',
            transition: 'all 0.15s',
        }, children: children }));
}
function StatBox({ value, label, color }) {
    return (_jsxs("div", { style: { textAlign: 'center', minWidth: 60 }, children: [_jsx("div", { style: { fontSize: 22, fontWeight: 900, color: color || '#242424', lineHeight: 1.1 }, children: value }), _jsx("div", { style: { fontSize: 11, color: '#999', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 2 }, children: label })] }));
}
function EventCard({ event, onJoin, onLeave, joining }) {
    const s = SPORT[event.sport];
    const st = STATUS[event.status] ?? STATUS.FINISHED;
    const busy = joining === event.id;
    const dist = event.targetDistance ?? event.maxDistance;
    const pCount = event.participantCount ?? 0;
    return (_jsxs(motion.div, { layout: true, initial: { opacity: 0, y: 16 }, animate: { opacity: 1, y: 0 }, exit: { opacity: 0 }, style: {
            background: '#fff', borderRadius: 16, overflow: 'hidden',
            boxShadow: '0 1px 4px rgba(0,0,0,0.06), 0 0 0 1px rgba(0,0,0,0.04)',
            transition: 'transform 0.2s, box-shadow 0.2s', cursor: 'default',
        }, whileHover: { y: -3, boxShadow: '0 8px 30px rgba(0,0,0,0.1), 0 0 0 1px rgba(0,0,0,0.04)' }, children: [_jsxs("div", { style: {
                    height: 140,
                    position: 'relative',
                    background: event.imageUrl ? undefined : s.gradient,
                    overflow: 'hidden',
                }, children: [event.imageUrl ? (_jsx("img", { src: event.imageUrl, alt: event.title, style: {
                            width: '100%',
                            height: '100%',
                            objectFit: 'cover',
                            display: 'block',
                        } })) : (_jsx("div", { style: {
                            position: 'absolute',
                            inset: 0,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: 56,
                            opacity: 0.3,
                        }, children: s.icon })), _jsx("div", { style: {
                            position: 'absolute',
                            top: 10,
                            left: 10,
                            width: 36,
                            height: 36,
                            borderRadius: 10,
                            background: 'rgba(0,0,0,0.35)',
                            backdropFilter: 'blur(4px)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: 18,
                        }, children: s.icon }), _jsx("span", { style: {
                            position: 'absolute',
                            top: 10,
                            right: 10,
                            fontSize: 11,
                            fontWeight: 700,
                            padding: '4px 12px',
                            borderRadius: 12,
                            background: 'rgba(0,0,0,0.35)',
                            backdropFilter: 'blur(4px)',
                            color: '#fff',
                        }, children: TYPE_LABEL[event.type] })] }), _jsxs("div", { style: { padding: '20px 24px 20px' }, children: [_jsxs("div", { style: { display: 'flex', alignItems: 'flex-start', gap: 14, marginBottom: 16 }, children: [_jsxs("div", { style: { flex: 1, minWidth: 0 }, children: [_jsx("h3", { style: { fontSize: 16, fontWeight: 800, color: '#242424', lineHeight: 1.3, marginBottom: 6 }, children: event.title }), _jsxs("div", { style: { display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }, children: [_jsx("span", { style: {
                                                    fontSize: 11, fontWeight: 700, padding: '2px 10px', borderRadius: 12,
                                                    background: s.bg, color: s.color,
                                                }, children: SPORT[event.sport].label }), _jsxs("span", { style: { fontSize: 11, fontWeight: 700, color: st.color, display: 'flex', alignItems: 'center', gap: 4 }, children: [_jsx("span", { style: { width: 6, height: 6, borderRadius: '50%', background: st.color } }), st.label] })] })] }), event.medalIcon && _jsx("span", { style: { fontSize: 28, flexShrink: 0, filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.1))' }, children: event.medalIcon })] }), event.description && (_jsx("p", { style: { fontSize: 13, color: '#777', lineHeight: 1.6, marginBottom: 20, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }, children: event.description })), _jsxs("div", { style: { display: 'flex', alignItems: 'center', gap: 24, padding: '16px 0', borderTop: '1px solid #f0f0f0', borderBottom: '1px solid #f0f0f0', marginBottom: 16 }, children: [dist != null && dist > 0 && _jsx(StatBox, { value: dist, label: "\u043A\u043C" }), _jsx(StatBox, { value: pCount, label: "\u0443\u0447\u0430\u0441\u0442\u043D\u0438\u043A\u043E\u0432" }), _jsx(StatBox, { value: event.xpReward, label: "XP", color: "#fc4c02" })] }), _jsxs("div", { style: { fontSize: 12, color: '#aaa', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 6 }, children: ["\uD83D\uDCC5 ", df.format(new Date(event.startDate)), " \u2014 ", df.format(new Date(event.endDate))] }), event.isJoined ? (_jsxs("div", { children: [new Date(event.startDate) > new Date() ? (
                            /* Event hasn't started yet */
                            _jsxs("div", { children: [_jsxs("div", { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }, children: [_jsxs("span", { style: { fontSize: 13, fontWeight: 600, color: '#0061ff', display: 'flex', alignItems: 'center', gap: 6 }, children: ["\u23F3 \u041D\u0430\u0447\u043D\u0451\u0442\u0441\u044F ", df.format(new Date(event.startDate))] }), _jsx("button", { onClick: () => onLeave(event.id), disabled: busy, style: { fontSize: 12, color: '#aaa', background: 'none', border: 'none', cursor: 'pointer' }, children: "\u041F\u043E\u043A\u0438\u043D\u0443\u0442\u044C" })] }), _jsx("div", { style: { padding: '8px 12px', borderRadius: 8, background: '#eef4ff', color: '#0061ff', fontSize: 12, fontWeight: 500, textAlign: 'center' }, children: "\u0412\u044B \u0437\u0430\u0440\u0435\u0433\u0438\u0441\u0442\u0440\u0438\u0440\u043E\u0432\u0430\u043D\u044B. \u0420\u0435\u0437\u0443\u043B\u044C\u0442\u0430\u0442\u044B \u0437\u0430\u0441\u0447\u0438\u0442\u044B\u0432\u0430\u044E\u0442\u0441\u044F \u043F\u043E\u0441\u043B\u0435 \u0441\u0442\u0430\u0440\u0442\u0430." })] })) : (
                            /* Event is active */
                            _jsx("div", { children: _jsxs("div", { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }, children: [_jsx("span", { style: { fontSize: 14, fontWeight: 700, color: '#1a7f37', display: 'flex', alignItems: 'center', gap: 6 }, children: "\u2713 \u0412\u044B \u0443\u0447\u0430\u0441\u0442\u0432\u0443\u0435\u0442\u0435" }), event.status !== 'FINISHED' && (_jsx("button", { onClick: () => onLeave(event.id), disabled: busy, style: { fontSize: 12, color: '#aaa', background: 'none', border: 'none', cursor: 'pointer' }, children: "\u041F\u043E\u043A\u0438\u043D\u0443\u0442\u044C" }))] }) })), (() => {
                                const target = event.targetDistance ?? event.maxDistance ?? 0;
                                const myDist = event.myDistance ?? 0;
                                const completed = target > 0 ? myDist >= target : myDist > 0;
                                if (completed)
                                    return (_jsx("button", { onClick: () => api.events.downloadDiploma(event.id), style: {
                                            width: '100%', padding: '10px 0', borderRadius: 10,
                                            border: '2px solid #1a7f37', background: '#f0fdf4',
                                            color: '#1a7f37', fontSize: 13, fontWeight: 700,
                                            cursor: 'pointer', transition: 'all 0.15s',
                                        }, children: "\uD83C\uDFC6 \u0421\u043A\u0430\u0447\u0430\u0442\u044C \u0434\u0438\u043F\u043B\u043E\u043C" }));
                                if (target > 0)
                                    return (_jsxs("div", { style: { marginTop: 4 }, children: [_jsxs("div", { style: { display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#999', marginBottom: 3 }, children: [_jsxs("span", { children: [myDist.toFixed(1), " \u043A\u043C"] }), _jsxs("span", { children: [target, " \u043A\u043C"] })] }), _jsx("div", { style: { height: 4, borderRadius: 2, background: '#eee', overflow: 'hidden' }, children: _jsx("div", { style: { height: '100%', borderRadius: 2, background: '#fc4c02', width: `${Math.min(100, (myDist / target) * 100)}%` } }) })] }));
                                return null;
                            })()] })) : event.status === 'REGISTRATION' ? (_jsx("button", { onClick: () => onJoin(event.id), disabled: busy, style: {
                            width: '100%', padding: '12px 0', borderRadius: 10, border: 'none',
                            background: '#fc4c02', color: '#fff', fontSize: 14, fontWeight: 800,
                            cursor: busy ? 'wait' : 'pointer', opacity: busy ? 0.6 : 1,
                            transition: 'all 0.15s', boxShadow: '0 2px 8px rgba(252,76,2,0.3)',
                        }, children: busy ? 'Загрузка...' : 'Участвовать' })) : null] })] }));
}
export default function EventsPanel() {
    const { isAuthenticated } = useAuth();
    const [events, setEvents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [joining, setJoining] = useState(null);
    const [sport, setSport] = useState(null);
    const [type, setType] = useState(null);
    const [status, setStatus] = useState(null);
    const [medalShopEvent, setMedalShopEvent] = useState(null);
    const load = useCallback(async () => {
        setLoading(true);
        try {
            const p = {};
            if (sport)
                p.sport = sport;
            if (type)
                p.type = type;
            if (status)
                p.status = status;
            const res = await api.events.list(p);
            setEvents(res.items);
        }
        catch {
            setEvents([]);
        }
        finally {
            setLoading(false);
        }
    }, [sport, type, status]);
    useEffect(() => { load(); }, [load]);
    const openMedalShop = (id) => {
        if (!isAuthenticated)
            return;
        const ev = events.find(e => e.id === id);
        if (ev)
            setMedalShopEvent(ev);
    };
    const handleJoinComplete = (id) => {
        setEvents(p => p.map(e => e.id === id ? { ...e, isJoined: true, participantCount: (e.participantCount ?? 0) + 1 } : e));
    };
    const leave = async (id) => {
        setJoining(id);
        try {
            await api.events.leave(id);
            setEvents(p => p.map(e => e.id === id ? { ...e, isJoined: false, participantCount: Math.max(0, (e.participantCount ?? 1) - 1) } : e));
        }
        catch { }
        finally {
            setJoining(null);
        }
    };
    return (_jsxs("div", { children: [_jsxs("div", { style: {
                    background: 'linear-gradient(135deg, #fc4c02 0%, #ff6b2b 100%)',
                    borderRadius: 20, padding: '48px 40px', marginBottom: 32, color: '#fff',
                    boxShadow: '0 4px 20px rgba(252,76,2,0.25)',
                }, children: [_jsx("h1", { style: { fontSize: 36, fontWeight: 900, marginBottom: 8, lineHeight: 1.2 }, children: "\u0412\u0438\u0440\u0442\u0443\u0430\u043B\u044C\u043D\u044B\u0435 \u0441\u043E\u0431\u044B\u0442\u0438\u044F" }), _jsx("p", { style: { fontSize: 16, opacity: 0.9, maxWidth: 500, lineHeight: 1.6, marginBottom: 20 }, children: "\u0417\u0430\u0431\u0435\u0433\u0438, \u0447\u0435\u043B\u043B\u0435\u043D\u0434\u0436\u0438 \u0438 \u0441\u043E\u0440\u0435\u0432\u043D\u043E\u0432\u0430\u043D\u0438\u044F \u2014 \u0443\u0447\u0430\u0441\u0442\u0432\u0443\u0439 \u0438\u0437\u00A0\u043B\u044E\u0431\u043E\u0439 \u0442\u043E\u0447\u043A\u0438 \u043C\u0438\u0440\u0430. \u0417\u0430\u0440\u0430\u0431\u0430\u0442\u044B\u0432\u0430\u0439\u00A0XP, \u043F\u043E\u043B\u0443\u0447\u0430\u0439 \u043C\u0435\u0434\u0430\u043B\u0438, \u0441\u043E\u0440\u0435\u0432\u043D\u0443\u0439\u0441\u044F." }), _jsxs("div", { style: { display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }, children: [_jsxs("span", { style: {
                                    background: 'rgba(255,255,255,0.2)', borderRadius: 20, padding: '6px 16px',
                                    fontSize: 14, fontWeight: 700, backdropFilter: 'blur(8px)',
                                }, children: ["\uD83C\uDFC6 ", events.length, " \u0441\u043E\u0431\u044B\u0442\u0438\u0439"] }), _jsx("span", { style: { fontSize: 14, opacity: 0.8 }, children: "\u0411\u0435\u0433 \u00B7 \u0412\u0435\u043B\u043E \u00B7 \u041B\u044B\u0436\u0438 \u00B7 \u0425\u043E\u0434\u044C\u0431\u0430" })] })] }), isAuthenticated && (() => {
                const myEvents = events.filter((e) => e.isJoined);
                return (_jsxs("div", { style: {
                        background: '#fff', borderRadius: 16, padding: '20px 24px', marginBottom: 28,
                        boxShadow: '0 1px 4px rgba(0,0,0,0.06), 0 0 0 1px rgba(0,0,0,0.04)',
                    }, children: [_jsxs("div", { style: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }, children: [_jsx("span", { style: { fontSize: 20 }, children: "\uD83C\uDFC5" }), _jsx("h2", { style: { fontSize: 18, fontWeight: 800, color: '#242424', margin: 0 }, children: "\u041C\u043E\u0438 \u0441\u043E\u0431\u044B\u0442\u0438\u044F" })] }), myEvents.length === 0 ? (_jsx("div", { style: { textAlign: 'center', padding: '24px 0', color: '#999', fontSize: 14 }, children: "\u0412\u044B \u043F\u043E\u043A\u0430 \u043D\u0435 \u0443\u0447\u0430\u0441\u0442\u0432\u0443\u0435\u0442\u0435 \u043D\u0438 \u0432 \u043E\u0434\u043D\u043E\u043C \u0441\u043E\u0431\u044B\u0442\u0438\u0438" })) : (_jsx("div", { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }, children: myEvents.map((ev) => {
                                const s = SPORT[ev.sport];
                                const st = STATUS[ev.status] ?? STATUS.FINISHED;
                                const target = ev.targetDistance ?? ev.maxDistance ?? 0;
                                const myParticipation = ev.myDistance ?? 0;
                                const progress = target > 0 ? Math.min(100, (myParticipation / target) * 100) : 0;
                                return (_jsxs("div", { style: {
                                        background: '#fafafa', borderRadius: 14, padding: 16,
                                        border: '1px solid #e0e0e0', position: 'relative', overflow: 'hidden',
                                    }, children: [_jsx("div", { style: { height: 3, background: s.color, position: 'absolute', top: 0, left: 0, right: 0 } }), _jsxs("div", { style: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }, children: [_jsx("span", { style: { fontSize: 24 }, children: s.icon }), _jsxs("div", { style: { flex: 1, minWidth: 0 }, children: [_jsx("div", { style: {
                                                                fontSize: 14, fontWeight: 700, color: '#242424',
                                                                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                                                            }, children: ev.title }), _jsxs("div", { style: { fontSize: 11, color: st.color, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4, marginTop: 2 }, children: [_jsx("span", { style: { width: 5, height: 5, borderRadius: '50%', background: st.color } }), st.label] })] }), ev.medalIcon && _jsx("span", { style: { fontSize: 22 }, children: ev.medalIcon })] }), target > 0 && (_jsxs("div", { style: { marginBottom: 6 }, children: [_jsxs("div", { style: { display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#666', marginBottom: 4 }, children: [_jsxs("span", { children: [myParticipation.toFixed(1), " \u043A\u043C"] }), _jsxs("span", { children: [target, " \u043A\u043C"] })] }), _jsx("div", { style: { height: 6, borderRadius: 3, background: '#eee', overflow: 'hidden' }, children: _jsx("div", { style: {
                                                            height: '100%', borderRadius: 3,
                                                            background: `linear-gradient(90deg, ${s.color}, ${s.color}dd)`,
                                                            width: `${progress}%`,
                                                            transition: 'width 0.4s',
                                                        } }) })] })), _jsxs("div", { style: { fontSize: 11, color: '#aaa', marginTop: 8 }, children: [df.format(new Date(ev.startDate)), " \u2014 ", df.format(new Date(ev.endDate))] }), (() => {
                                            const t = ev.targetDistance ?? ev.maxDistance ?? 0;
                                            const dist = ev.myDistance ?? 0;
                                            const canDiploma = ev.type === 'WEEKLY' || t === 0
                                                ? dist > 0
                                                : dist >= t;
                                            return canDiploma ? (_jsx("button", { onClick: () => api.events.downloadDiploma(ev.id), style: {
                                                    marginTop: 10, width: '100%', padding: '8px 0',
                                                    borderRadius: 8, border: '1.5px solid #fc4c02',
                                                    background: 'transparent', color: '#fc4c02',
                                                    fontSize: 12, fontWeight: 700, cursor: 'pointer',
                                                    transition: 'all 0.15s',
                                                }, children: "\u0421\u043A\u0430\u0447\u0430\u0442\u044C \u0434\u0438\u043F\u043B\u043E\u043C" })) : null;
                                        })()] }, ev.id));
                            }) }))] }));
            })(), _jsx("div", { style: {
                    background: '#fff', borderRadius: 14, padding: '20px 24px', marginBottom: 28,
                    boxShadow: '0 1px 4px rgba(0,0,0,0.06), 0 0 0 1px rgba(0,0,0,0.04)',
                }, children: _jsxs("div", { style: { display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 20 }, children: [_jsxs("div", { style: { display: 'flex', alignItems: 'center', gap: 8 }, children: [_jsx("span", { style: { fontSize: 11, fontWeight: 800, color: '#aaa', textTransform: 'uppercase', letterSpacing: 1 }, children: "\u0421\u043F\u043E\u0440\u0442" }), _jsx("div", { style: { display: 'flex', gap: 6 }, children: SPORTS.map(sp => (_jsx(Pill, { active: sport === sp, onClick: () => setSport(sp), children: sp ? `${SPORT[sp].icon} ${SPORT[sp].label}` : 'Все' }, sp ?? 'all'))) })] }), _jsx("div", { style: { width: 1, height: 24, background: '#eee' } }), _jsxs("div", { style: { display: 'flex', alignItems: 'center', gap: 8 }, children: [_jsx("span", { style: { fontSize: 11, fontWeight: 800, color: '#aaa', textTransform: 'uppercase', letterSpacing: 1 }, children: "\u0422\u0438\u043F" }), _jsx("div", { style: { display: 'flex', gap: 6 }, children: TYPES.map(t => (_jsx(Pill, { active: type === t, onClick: () => setType(t), children: t ? TYPE_LABEL[t] : 'Все' }, t ?? 'all'))) })] }), _jsx("div", { style: { width: 1, height: 24, background: '#eee' } }), _jsxs("div", { style: { display: 'flex', alignItems: 'center', gap: 8 }, children: [_jsx("span", { style: { fontSize: 11, fontWeight: 800, color: '#aaa', textTransform: 'uppercase', letterSpacing: 1 }, children: "\u0421\u0442\u0430\u0442\u0443\u0441" }), _jsx("div", { style: { display: 'flex', gap: 6 }, children: STATUSES.map(st => (_jsx(Pill, { active: status === st, onClick: () => setStatus(st), children: st ? STATUS[st].label : 'Все' }, st ?? 'all'))) })] })] }) }), loading ? (_jsx("div", { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 24 }, children: Array.from({ length: 6 }).map((_, i) => (_jsxs("div", { style: { background: '#fff', borderRadius: 16, padding: 24, boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }, children: [_jsxs("div", { style: { display: 'flex', gap: 14, marginBottom: 16 }, children: [_jsx("div", { className: "shimmer", style: { width: 48, height: 48, borderRadius: 14 } }), _jsxs("div", { style: { flex: 1 }, children: [_jsx("div", { className: "shimmer", style: { height: 16, width: '80%', marginBottom: 8 } }), _jsx("div", { className: "shimmer", style: { height: 12, width: '50%' } })] })] }), _jsx("div", { className: "shimmer", style: { height: 12, marginBottom: 8 } }), _jsx("div", { className: "shimmer", style: { height: 12, width: '70%', marginBottom: 16 } }), _jsxs("div", { style: { display: 'flex', gap: 24, padding: '16px 0', borderTop: '1px solid #f0f0f0', marginBottom: 16 }, children: [_jsx("div", { className: "shimmer", style: { height: 36, width: 56 } }), _jsx("div", { className: "shimmer", style: { height: 36, width: 56 } }), _jsx("div", { className: "shimmer", style: { height: 36, width: 56 } })] }), _jsx("div", { className: "shimmer", style: { height: 44, borderRadius: 10 } })] }, i))) })) : events.length === 0 ? (_jsxs("div", { style: { background: '#fff', borderRadius: 16, textAlign: 'center', padding: '80px 24px', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }, children: [_jsx("div", { style: { fontSize: 48, marginBottom: 12 }, children: "\uD83C\uDFC1" }), _jsx("h3", { style: { fontSize: 18, fontWeight: 800, color: '#242424', marginBottom: 6 }, children: "\u041D\u0438\u0447\u0435\u0433\u043E \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D\u043E" }), _jsx("p", { style: { fontSize: 14, color: '#999' }, children: "\u041F\u043E\u043F\u0440\u043E\u0431\u0443\u0439\u0442\u0435 \u0438\u0437\u043C\u0435\u043D\u0438\u0442\u044C \u0444\u0438\u043B\u044C\u0442\u0440\u044B" })] })) : (_jsx(AnimatePresence, { mode: "popLayout", children: _jsx(motion.div, { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 24 }, initial: "hidden", animate: "visible", variants: { visible: { transition: { staggerChildren: 0.04 } } }, children: events.map(e => _jsx(EventCard, { event: e, onJoin: openMedalShop, onLeave: leave, joining: joining }, e.id)) }) })), medalShopEvent && (_jsx(MedalShopModal, { isOpen: !!medalShopEvent, event: medalShopEvent, onClose: () => setMedalShopEvent(null), onJoin: handleJoinComplete }))] }));
}
