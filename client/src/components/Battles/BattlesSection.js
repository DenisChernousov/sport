import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useCallback, useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { api } from '@/services/api';
import { useAuth } from '@/context/AuthContext';
const SPORT_OPTIONS = [
    { key: 'RUNNING', icon: '🏃', label: 'Бег' },
    { key: 'CYCLING', icon: '🚴', label: 'Вело' },
    { key: 'SKIING', icon: '⛷️', label: 'Лыжи' },
    { key: 'WALKING', icon: '🚶', label: 'Ходьба' },
];
function sportIcon(sport) {
    const map = {
        RUNNING: '🏃',
        CYCLING: '🚴',
        SKIING: '⛷️',
        WALKING: '🚶',
    };
    return map[sport] ?? '🏃';
}
function statusLabel(status) {
    const map = {
        PENDING: { text: 'Ожидание', color: 'bg-accent/15 text-accent' },
        ACTIVE: { text: 'Активный', color: 'bg-primary/15 text-primary' },
        FINISHED: { text: 'Завершён', color: 'bg-secondary/15 text-secondary' },
        DECLINED: { text: 'Отклонён', color: 'bg-danger/15 text-danger' },
    };
    return map[status] ?? { text: status, color: 'bg-surface-light text-gray-400' };
}
function useCountdown(endsAt) {
    const [remaining, setRemaining] = useState('');
    useEffect(() => {
        if (!endsAt)
            return;
        const update = () => {
            const diff = new Date(endsAt).getTime() - Date.now();
            if (diff <= 0) {
                setRemaining('Завершено');
                return;
            }
            const hours = Math.floor(diff / 3600000);
            const mins = Math.floor((diff % 3600000) / 60000);
            const secs = Math.floor((diff % 60000) / 1000);
            setRemaining(`${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`);
        };
        update();
        const interval = setInterval(update, 1000);
        return () => clearInterval(interval);
    }, [endsAt]);
    return remaining;
}
function BattleCard({ battle, userId, onAccept, onDecline, }) {
    const countdown = useCountdown(battle.status === 'ACTIVE' ? battle.endsAt : undefined);
    const isChallenger = battle.challengerId === userId;
    const isPendingReceived = battle.status === 'PENDING' && battle.opponentId === userId;
    const isPendingSent = battle.status === 'PENDING' && battle.challengerId === userId;
    const target = battle.targetDistance;
    const challengerPct = target > 0 ? Math.min((battle.challengerDistance / target) * 100, 100) : 0;
    const opponentPct = target > 0 ? Math.min((battle.opponentDistance / target) * 100, 100) : 0;
    const isWinner = battle.status === 'FINISHED' && battle.winnerId === userId;
    const isLoser = battle.status === 'FINISHED' && battle.winnerId && battle.winnerId !== userId;
    const st = statusLabel(battle.status);
    return (_jsxs(motion.div, { initial: { opacity: 0, y: 15 }, animate: { opacity: 1, y: 0 }, exit: { opacity: 0, y: -10 }, whileHover: { y: -2, transition: { duration: 0.2 } }, className: `rounded-xl border bg-surface p-5 space-y-4 transition-colors ${isWinner
            ? 'border-primary/40'
            : isLoser
                ? 'border-danger/20'
                : 'border-surface-light hover:border-surface-light/80'}`, children: [_jsxs("div", { className: "flex items-center justify-between", children: [_jsxs("div", { className: "flex items-center gap-2", children: [_jsx("span", { className: "text-2xl", children: sportIcon(battle.sport) }), _jsx("span", { className: `rounded-full px-2.5 py-0.5 text-xs font-semibold ${st.color}`, children: st.text })] }), battle.status === 'ACTIVE' && countdown && (_jsx("span", { className: "font-mono text-sm text-accent", children: countdown })), battle.status === 'FINISHED' && battle.winnerId && (_jsx("span", { className: `text-xs font-semibold ${isWinner ? 'text-primary' : 'text-danger'}`, children: isWinner ? 'Победа!' : 'Поражение' }))] }), _jsxs("div", { className: "flex items-center gap-3", children: [_jsxs("div", { className: "flex-1 text-center space-y-1", children: [_jsx("div", { className: "mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-surface-light text-sm font-bold text-white", children: battle.challenger?.avatarUrl ? (_jsx("img", { src: battle.challenger.avatarUrl, alt: "", className: "h-10 w-10 rounded-full object-cover" })) : (battle.challenger?.username?.charAt(0).toUpperCase() ?? '?') }), _jsxs("p", { className: "text-sm font-medium text-white truncate", children: [battle.challenger?.username ?? 'Участник', isChallenger && (_jsx("span", { className: "ml-1 text-[10px] text-gray-500", children: "(\u0432\u044B)" }))] }), _jsxs("p", { className: "text-lg font-bold text-white", children: [(battle.challengerDistance / 1000).toFixed(2), ' ', _jsx("span", { className: "text-xs text-gray-500", children: "\u043A\u043C" })] })] }), _jsx("div", { className: "flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-bg text-sm font-bold text-gray-500", children: "VS" }), _jsxs("div", { className: "flex-1 text-center space-y-1", children: [_jsx("div", { className: "mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-surface-light text-sm font-bold text-white", children: battle.opponent?.avatarUrl ? (_jsx("img", { src: battle.opponent.avatarUrl, alt: "", className: "h-10 w-10 rounded-full object-cover" })) : (battle.opponent?.username?.charAt(0).toUpperCase() ?? '?') }), _jsxs("p", { className: "text-sm font-medium text-white truncate", children: [battle.opponent?.username ?? 'Соперник', !isChallenger && (_jsx("span", { className: "ml-1 text-[10px] text-gray-500", children: "(\u0432\u044B)" }))] }), _jsxs("p", { className: "text-lg font-bold text-white", children: [(battle.opponentDistance / 1000).toFixed(2), ' ', _jsx("span", { className: "text-xs text-gray-500", children: "\u043A\u043C" })] })] })] }), (battle.status === 'ACTIVE' || battle.status === 'FINISHED') && target > 0 && (_jsxs("div", { className: "space-y-2", children: [_jsx("div", { className: "flex items-center gap-2 text-xs text-gray-500", children: _jsxs("span", { children: ["\u0426\u0435\u043B\u044C: ", (target / 1000).toFixed(1), " \u043A\u043C"] }) }), _jsxs("div", { className: "space-y-1.5", children: [_jsxs("div", { className: "flex items-center gap-2", children: [_jsx("span", { className: "w-16 truncate text-xs text-gray-400", children: battle.challenger?.username }), _jsx("div", { className: "flex-1 h-2 rounded-full bg-bg overflow-hidden", children: _jsx(motion.div, { initial: { width: 0 }, animate: { width: `${challengerPct}%` }, transition: { duration: 0.8, ease: 'easeOut' }, className: "h-full rounded-full bg-primary" }) }), _jsxs("span", { className: "text-xs text-gray-400 w-10 text-right", children: [challengerPct.toFixed(0), "%"] })] }), _jsxs("div", { className: "flex items-center gap-2", children: [_jsx("span", { className: "w-16 truncate text-xs text-gray-400", children: battle.opponent?.username }), _jsx("div", { className: "flex-1 h-2 rounded-full bg-bg overflow-hidden", children: _jsx(motion.div, { initial: { width: 0 }, animate: { width: `${opponentPct}%` }, transition: { duration: 0.8, ease: 'easeOut' }, className: "h-full rounded-full bg-secondary" }) }), _jsxs("span", { className: "text-xs text-gray-400 w-10 text-right", children: [opponentPct.toFixed(0), "%"] })] })] })] })), isPendingReceived && (_jsxs("div", { className: "flex gap-2", children: [_jsx(motion.button, { whileTap: { scale: 0.95 }, onClick: () => onAccept(battle.id), className: "flex-1 rounded-lg bg-primary py-2 text-sm font-semibold text-white transition-colors hover:bg-primary-dark", children: "\u041F\u0440\u0438\u043D\u044F\u0442\u044C" }), _jsx(motion.button, { whileTap: { scale: 0.95 }, onClick: () => onDecline(battle.id), className: "flex-1 rounded-lg bg-danger/10 py-2 text-sm font-semibold text-danger transition-colors hover:bg-danger/20", children: "\u041E\u0442\u043A\u043B\u043E\u043D\u0438\u0442\u044C" })] })), isPendingSent && (_jsx("div", { className: "text-center text-sm text-accent", children: "\u041E\u0436\u0438\u0434\u0430\u043D\u0438\u0435 \u043E\u0442\u0432\u0435\u0442\u0430 \u0441\u043E\u043F\u0435\u0440\u043D\u0438\u043A\u0430..." }))] }));
}
export default function BattlesSection() {
    const { user } = useAuth();
    const [battles, setBattles] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showCreate, setShowCreate] = useState(false);
    // Create form
    const [opponentName, setOpponentName] = useState('');
    const [selectedSport, setSelectedSport] = useState('RUNNING');
    const [targetDistance, setTargetDistance] = useState('10');
    const [duration, setDuration] = useState('24');
    const [creating, setCreating] = useState(false);
    const [createError, setCreateError] = useState('');
    const loadBattles = useCallback(async () => {
        setLoading(true);
        try {
            const res = await api.battles.list();
            setBattles(res);
        }
        catch {
            setBattles([]);
        }
        finally {
            setLoading(false);
        }
    }, []);
    useEffect(() => {
        loadBattles();
    }, [loadBattles]);
    const handleCreate = async () => {
        if (!opponentName.trim() || !targetDistance || !duration)
            return;
        setCreating(true);
        setCreateError('');
        try {
            await api.battles.create({
                opponentId: opponentName.trim(),
                sport: selectedSport,
                targetDistance: parseFloat(targetDistance) * 1000,
                duration: parseFloat(duration) * 3600,
            });
            setShowCreate(false);
            setOpponentName('');
            setTargetDistance('10');
            setDuration('24');
            loadBattles();
        }
        catch (err) {
            setCreateError(err instanceof Error ? err.message : 'Ошибка создания');
        }
        finally {
            setCreating(false);
        }
    };
    const handleAccept = async (id) => {
        try {
            await api.battles.accept(id);
            loadBattles();
        }
        catch {
            /* ignore */
        }
    };
    const handleDecline = async (id) => {
        try {
            await api.battles.decline(id);
            loadBattles();
        }
        catch {
            /* ignore */
        }
    };
    const userId = user?.id ?? '';
    const { active, pendingReceived, pendingSent, finished } = useMemo(() => {
        const active = [];
        const pendingReceived = [];
        const pendingSent = [];
        const finished = [];
        for (const b of battles) {
            if (b.status === 'ACTIVE')
                active.push(b);
            else if (b.status === 'PENDING' && b.opponentId === userId)
                pendingReceived.push(b);
            else if (b.status === 'PENDING' && b.challengerId === userId)
                pendingSent.push(b);
            else if (b.status === 'FINISHED' || b.status === 'DECLINED')
                finished.push(b);
        }
        return { active, pendingReceived, pendingSent, finished };
    }, [battles, userId]);
    return (_jsxs("div", { className: "space-y-6", children: [_jsxs(motion.div, { initial: { opacity: 0, y: -10 }, animate: { opacity: 1, y: 0 }, className: "flex items-center justify-between", children: [_jsx("h1", { className: "text-2xl font-bold text-white", children: "\u0411\u0430\u0442\u043B\u044B" }), _jsx(motion.button, { whileHover: { scale: 1.03 }, whileTap: { scale: 0.97 }, onClick: () => setShowCreate(!showCreate), className: "rounded-lg bg-danger px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-red-700", children: "\u0412\u044B\u0437\u0432\u0430\u0442\u044C \u043D\u0430 \u0431\u043E\u0439" })] }), _jsx(AnimatePresence, { children: showCreate && (_jsx(motion.div, { initial: { opacity: 0, height: 0 }, animate: { opacity: 1, height: 'auto' }, exit: { opacity: 0, height: 0 }, className: "overflow-hidden", children: _jsxs("div", { className: "rounded-xl border border-danger/20 bg-surface p-5 space-y-4", children: [_jsx("h3", { className: "text-lg font-semibold text-white", children: "\u041D\u043E\u0432\u044B\u0439 \u0431\u0430\u0442\u043B" }), _jsxs("div", { className: "space-y-1", children: [_jsx("label", { className: "text-sm text-gray-400", children: "\u0421\u043E\u043F\u0435\u0440\u043D\u0438\u043A (\u0438\u043C\u044F \u043F\u043E\u043B\u044C\u0437\u043E\u0432\u0430\u0442\u0435\u043B\u044F)" }), _jsx("input", { type: "text", placeholder: "\u0412\u0432\u0435\u0434\u0438\u0442\u0435 \u0438\u043C\u044F \u0441\u043E\u043F\u0435\u0440\u043D\u0438\u043A\u0430", value: opponentName, onChange: (e) => setOpponentName(e.target.value), className: "w-full rounded-lg border border-surface-light bg-bg px-4 py-2.5 text-white placeholder-gray-500 outline-none focus:border-danger transition-colors" })] }), _jsxs("div", { className: "space-y-1", children: [_jsx("label", { className: "text-sm text-gray-400", children: "\u0412\u0438\u0434 \u0441\u043F\u043E\u0440\u0442\u0430" }), _jsx("div", { className: "flex gap-2", children: SPORT_OPTIONS.map((s) => (_jsxs("button", { onClick: () => setSelectedSport(s.key), className: `flex-1 rounded-lg px-3 py-2.5 text-sm font-medium transition-all ${selectedSport === s.key
                                                ? 'bg-danger text-white'
                                                : 'bg-bg text-gray-400 hover:bg-surface-light hover:text-white'}`, children: [s.icon, " ", s.label] }, s.key))) })] }), _jsxs("div", { className: "grid grid-cols-2 gap-4", children: [_jsxs("div", { className: "space-y-1", children: [_jsx("label", { className: "text-sm text-gray-400", children: "\u0414\u0438\u0441\u0442\u0430\u043D\u0446\u0438\u044F (\u043A\u043C)" }), _jsx("input", { type: "number", min: "1", step: "0.5", value: targetDistance, onChange: (e) => setTargetDistance(e.target.value), className: "w-full rounded-lg border border-surface-light bg-bg px-4 py-2.5 text-white outline-none focus:border-danger transition-colors" })] }), _jsxs("div", { className: "space-y-1", children: [_jsx("label", { className: "text-sm text-gray-400", children: "\u0414\u043B\u0438\u0442\u0435\u043B\u044C\u043D\u043E\u0441\u0442\u044C (\u0447\u0430\u0441\u043E\u0432)" }), _jsx("input", { type: "number", min: "1", step: "1", value: duration, onChange: (e) => setDuration(e.target.value), className: "w-full rounded-lg border border-surface-light bg-bg px-4 py-2.5 text-white outline-none focus:border-danger transition-colors" })] })] }), createError && (_jsx("p", { className: "text-sm text-danger", children: createError })), _jsxs("div", { className: "flex gap-2", children: [_jsx(motion.button, { whileTap: { scale: 0.97 }, onClick: handleCreate, disabled: creating || !opponentName.trim(), className: "rounded-lg bg-danger px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-red-700 disabled:opacity-50", children: creating ? 'Создание...' : 'Отправить вызов' }), _jsx("button", { onClick: () => setShowCreate(false), className: "rounded-lg px-5 py-2 text-sm text-gray-400 hover:text-white transition-colors", children: "\u041E\u0442\u043C\u0435\u043D\u0430" })] })] }) })) }), loading ? (_jsx("div", { className: "space-y-4", children: Array.from({ length: 3 }).map((_, i) => (_jsxs("div", { className: "animate-pulse rounded-xl border border-surface-light bg-surface p-5 space-y-4", children: [_jsxs("div", { className: "flex items-center gap-2", children: [_jsx("div", { className: "h-6 w-6 rounded bg-surface-light" }), _jsx("div", { className: "h-5 w-20 rounded bg-surface-light" })] }), _jsxs("div", { className: "flex items-center gap-4", children: [_jsxs("div", { className: "flex-1 space-y-2 text-center", children: [_jsx("div", { className: "mx-auto h-10 w-10 rounded-full bg-surface-light" }), _jsx("div", { className: "mx-auto h-4 w-20 rounded bg-surface-light" })] }), _jsx("div", { className: "h-10 w-10 rounded-full bg-surface-light" }), _jsxs("div", { className: "flex-1 space-y-2 text-center", children: [_jsx("div", { className: "mx-auto h-10 w-10 rounded-full bg-surface-light" }), _jsx("div", { className: "mx-auto h-4 w-20 rounded bg-surface-light" })] })] })] }, i))) })) : battles.length === 0 ? (_jsxs(motion.div, { initial: { opacity: 0 }, animate: { opacity: 1 }, className: "rounded-xl border border-surface-light bg-surface p-10 text-center", children: [_jsx("p", { className: "text-4xl mb-3", children: "\u2694\uFE0F" }), _jsx("p", { className: "text-gray-400", children: "\u0423 \u0432\u0430\u0441 \u043F\u043E\u043A\u0430 \u043D\u0435\u0442 \u0431\u0430\u0442\u043B\u043E\u0432" }), _jsx("p", { className: "mt-1 text-sm text-gray-500", children: "\u0412\u044B\u0437\u043E\u0432\u0438\u0442\u0435 \u043A\u043E\u0433\u043E-\u043D\u0438\u0431\u0443\u0434\u044C \u043D\u0430 \u0431\u043E\u0439!" })] })) : (_jsxs("div", { className: "space-y-6", children: [pendingReceived.length > 0 && (_jsxs("div", { className: "space-y-3", children: [_jsxs("h2", { className: "flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-accent", children: [_jsx("span", { className: "h-2 w-2 rounded-full bg-accent animate-pulse" }), "\u0412\u0445\u043E\u0434\u044F\u0449\u0438\u0435 \u0432\u044B\u0437\u043E\u0432\u044B"] }), _jsx("div", { className: "grid gap-4 sm:grid-cols-2", children: _jsx(AnimatePresence, { children: pendingReceived.map((b) => (_jsx(BattleCard, { battle: b, userId: userId, onAccept: handleAccept, onDecline: handleDecline }, b.id))) }) })] })), active.length > 0 && (_jsxs("div", { className: "space-y-3", children: [_jsxs("h2", { className: "flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-primary", children: [_jsx("span", { className: "h-2 w-2 rounded-full bg-primary animate-pulse" }), "\u0410\u043A\u0442\u0438\u0432\u043D\u044B\u0435 \u0431\u0430\u0442\u043B\u044B"] }), _jsx("div", { className: "grid gap-4 sm:grid-cols-2", children: _jsx(AnimatePresence, { children: active.map((b) => (_jsx(BattleCard, { battle: b, userId: userId, onAccept: handleAccept, onDecline: handleDecline }, b.id))) }) })] })), pendingSent.length > 0 && (_jsxs("div", { className: "space-y-3", children: [_jsx("h2", { className: "text-sm font-semibold uppercase tracking-wider text-gray-500", children: "\u041E\u0442\u043F\u0440\u0430\u0432\u043B\u0435\u043D\u043D\u044B\u0435 \u0432\u044B\u0437\u043E\u0432\u044B" }), _jsx("div", { className: "grid gap-4 sm:grid-cols-2", children: _jsx(AnimatePresence, { children: pendingSent.map((b) => (_jsx(BattleCard, { battle: b, userId: userId, onAccept: handleAccept, onDecline: handleDecline }, b.id))) }) })] })), finished.length > 0 && (_jsxs("div", { className: "space-y-3", children: [_jsx("h2", { className: "text-sm font-semibold uppercase tracking-wider text-gray-500", children: "\u0417\u0430\u0432\u0435\u0440\u0448\u0451\u043D\u043D\u044B\u0435" }), _jsx("div", { className: "grid gap-4 sm:grid-cols-2", children: _jsx(AnimatePresence, { children: finished.map((b) => (_jsx(BattleCard, { battle: b, userId: userId, onAccept: handleAccept, onDecline: handleDecline }, b.id))) }) })] }))] }))] }));
}
