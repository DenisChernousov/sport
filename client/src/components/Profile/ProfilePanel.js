import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '@/services/api';
import { useAuth } from '@/context/AuthContext';
const SPORT_ICONS = {
    RUNNING: '\u{1F3C3}',
    CYCLING: '\u{1F6B4}',
    SKIING: '\u26F7\uFE0F',
    WALKING: '\u{1F6B6}',
};
const SPORT_COLORS = {
    RUNNING: '#fc4c02',
    CYCLING: '#0061ff',
    SKIING: '#0891b2',
    WALKING: '#7c3aed',
};
const SPORT_LABELS = {
    RUNNING: 'Бег',
    CYCLING: 'Велосипед',
    SKIING: 'Лыжи',
    WALKING: 'Ходьба',
};
function formatDuration(seconds) {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    if (h > 0)
        return `${h}ч ${m}м`;
    if (m > 0)
        return `${m}м ${s}с`;
    return `${s}с`;
}
function formatDate(dateStr) {
    try {
        return new Intl.DateTimeFormat('ru-RU', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
        }).format(new Date(dateStr));
    }
    catch {
        return dateStr;
    }
}
export default function ProfilePanel() {
    const { user, updateUser } = useAuth();
    const [achievements, setAchievements] = useState([]);
    const [achProgress, setAchProgress] = useState({ totalDistance: 0, currentStreak: 0, bestStreak: 0, finishedEvents: 0 });
    const [achLoading, setAchLoading] = useState(false);
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [city, setCity] = useState('');
    const [bio, setBio] = useState('');
    const [saving, setSaving] = useState(false);
    const [saveMsg, setSaveMsg] = useState('');
    const [copied, setCopied] = useState(false);
    const [sportStats, setSportStats] = useState([]);
    const [followersCount, setFollowersCount] = useState(0);
    const [followingCount, setFollowingCount] = useState(0);
    const [avatarHover, setAvatarHover] = useState(false);
    const [avatarUploading, setAvatarUploading] = useState(false);
    const fileInputRef = useRef(null);
    const [referralCount, setReferralCount] = useState(0);
    const [referredUsers, setReferredUsers] = useState([]);
    useEffect(() => {
        if (user) {
            setFirstName(user.firstName ?? '');
            setLastName(user.lastName ?? '');
            setCity(user.city ?? '');
            setBio(user.bio ?? '');
        }
    }, [user]);
    useEffect(() => {
        if (!user)
            return;
        api.profile.statsSummary().then((res) => {
            setSportStats(res?.bySport ?? []);
        }).catch(() => { });
        api.social.followStatus(user.id).then((res) => {
            setFollowersCount(res.followersCount);
            setFollowingCount(res.followingCount);
        }).catch(() => { });
    }, [user]);
    useEffect(() => {
        if (!user)
            return;
        api.profile.referrals()
            .then((res) => {
            setReferralCount(res?.referralCount ?? 0);
            setReferredUsers(res?.referrals ?? []);
        })
            .catch(() => { });
    }, [user]);
    useEffect(() => {
        if (!user)
            return;
        setAchLoading(true);
        api.profile
            .achievements(user.id)
            .then((res) => {
            setAchievements(res?.achievements ?? []);
            setAchProgress(res?.progress ?? { totalDistance: 0, currentStreak: 0, bestStreak: 0, finishedEvents: 0 });
        })
            .catch(() => setAchievements([]))
            .finally(() => setAchLoading(false));
    }, [user]);
    const handleSave = useCallback(async (e) => {
        e.preventDefault();
        if (!user)
            return;
        setSaving(true);
        setSaveMsg('');
        try {
            const updated = await api.profile.update({ firstName, lastName, city, bio });
            updateUser(updated);
            setSaveMsg('Профиль обновлён');
        }
        catch (err) {
            setSaveMsg(err instanceof Error ? err.message : 'Ошибка сохранения');
        }
        finally {
            setSaving(false);
        }
    }, [user, firstName, lastName, city, bio, updateUser]);
    const handleCopyReferral = useCallback(() => {
        if (!user)
            return;
        const link = `${window.location.origin}/register?ref=${user.referralCode}`;
        // Fallback for HTTP (clipboard API requires HTTPS)
        try {
            if (navigator.clipboard && window.isSecureContext) {
                navigator.clipboard.writeText(link);
            }
            else {
                const textarea = document.createElement('textarea');
                textarea.value = link;
                textarea.style.position = 'fixed';
                textarea.style.opacity = '0';
                document.body.appendChild(textarea);
                textarea.select();
                document.execCommand('copy');
                document.body.removeChild(textarea);
            }
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
        catch {
            // fallback: select input text
            const input = document.querySelector('input[readonly]');
            if (input) {
                input.select();
                input.setSelectionRange(0, 99999);
            }
        }
    }, [user]);
    const handleAvatarClick = useCallback(() => {
        fileInputRef.current?.click();
    }, []);
    const handleAvatarChange = useCallback(async (e) => {
        const file = e.target.files?.[0];
        if (!file || !user)
            return;
        setAvatarUploading(true);
        try {
            const { avatarUrl } = await api.profile.uploadAvatar(file);
            updateUser({ ...user, avatarUrl });
        }
        catch (err) {
            alert(err instanceof Error ? err.message : 'Ошибка загрузки аватара');
        }
        finally {
            setAvatarUploading(false);
            if (fileInputRef.current)
                fileInputRef.current.value = '';
        }
    }, [user, updateUser]);
    if (!user) {
        return (_jsx("div", { style: {
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                minHeight: '60vh',
                color: '#666',
                fontSize: 18,
            }, children: "\u0412\u043E\u0439\u0434\u0438\u0442\u0435 \u0447\u0442\u043E\u0431\u044B \u0443\u0432\u0438\u0434\u0435\u0442\u044C \u043F\u0440\u043E\u0444\u0438\u043B\u044C" }));
    }
    const nextLevelXp = (user.level + 1) * 100;
    const xpProgress = Math.min((user.xp / nextLevelXp) * 100, 100);
    const referralLink = `${window.location.origin}/register?ref=${user.referralCode ?? ''}`;
    const sports = ['RUNNING', 'CYCLING', 'SKIING', 'WALKING'];
    return (_jsxs("div", { style: { maxWidth: 800, margin: '0 auto', padding: '24px 16px' }, children: [_jsxs("div", { style: {
                    background: '#fff',
                    borderRadius: 16,
                    padding: 24,
                    boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
                    border: '1px solid #e0e0e0',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 20,
                    marginBottom: 20,
                }, children: [_jsxs("div", { style: {
                            width: 72,
                            height: 72,
                            borderRadius: '50%',
                            background: '#fc4c02',
                            color: '#fff',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: 32,
                            fontWeight: 700,
                            flexShrink: 0,
                            cursor: 'pointer',
                            position: 'relative',
                            overflow: 'hidden',
                            opacity: avatarUploading ? 0.6 : 1,
                        }, onClick: handleAvatarClick, onMouseEnter: () => setAvatarHover(true), onMouseLeave: () => setAvatarHover(false), title: "\u0418\u0437\u043C\u0435\u043D\u0438\u0442\u044C \u0430\u0432\u0430\u0442\u0430\u0440", children: [user.avatarUrl ? (_jsx("img", { src: user.avatarUrl, alt: "\u0410\u0432\u0430\u0442\u0430\u0440", style: {
                                    width: '100%',
                                    height: '100%',
                                    objectFit: 'cover',
                                } })) : ((user.username ?? '?')[0].toUpperCase()), avatarHover && !avatarUploading && (_jsx("div", { style: {
                                    position: 'absolute',
                                    inset: 0,
                                    background: 'rgba(0,0,0,0.45)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    color: '#fff',
                                    fontSize: 22,
                                }, children: _jsxs("svg", { width: "22", height: "22", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", children: [_jsx("path", { d: "M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" }), _jsx("circle", { cx: "12", cy: "13", r: "4" })] }) })), avatarUploading && (_jsx("div", { style: {
                                    position: 'absolute',
                                    inset: 0,
                                    background: 'rgba(0,0,0,0.45)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    color: '#fff',
                                    fontSize: 12,
                                }, children: "..." })), _jsx("input", { ref: fileInputRef, type: "file", accept: "image/*", onChange: handleAvatarChange, style: { display: 'none' } })] }), _jsxs("div", { style: { flex: 1, minWidth: 0 }, children: [_jsx("div", { style: { fontSize: 22, fontWeight: 700, color: '#242424' }, children: user.username ?? '—' }), user.city && (_jsx("div", { style: { fontSize: 14, color: '#666', marginTop: 2 }, children: user.city })), user.bio && (_jsx("div", { style: { fontSize: 14, color: '#999', marginTop: 4 }, children: user.bio }))] })] }), _jsxs("div", { style: {
                    background: '#fff',
                    borderRadius: 16,
                    padding: 20,
                    boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
                    border: '1px solid #e0e0e0',
                    marginBottom: 20,
                }, children: [_jsxs("div", { style: { display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }, children: [_jsxs("div", { style: {
                                    background: '#fc4c02',
                                    color: '#fff',
                                    borderRadius: 8,
                                    padding: '4px 12px',
                                    fontWeight: 700,
                                    fontSize: 14,
                                }, children: ["\u0423\u0440\u043E\u0432\u0435\u043D\u044C ", user.level ?? 0] }), _jsxs("span", { style: { fontSize: 14, color: '#666' }, children: [user.xp ?? 0, " / ", nextLevelXp, " XP"] })] }), _jsx("div", { style: {
                            height: 10,
                            background: '#eef0f4',
                            borderRadius: 5,
                            overflow: 'hidden',
                        }, children: _jsx("div", { style: {
                                height: '100%',
                                width: `${xpProgress}%`,
                                background: '#fc4c02',
                                borderRadius: 5,
                                transition: 'width 0.3s',
                            } }) })] }), _jsx("div", { style: {
                    display: 'grid',
                    gridTemplateColumns: 'repeat(3, 1fr)',
                    gap: 12,
                    marginBottom: 20,
                }, children: [
                    { label: 'Общая дистанция', value: `${(user.totalDistance ?? 0).toFixed(1)} км` },
                    { label: 'Общее время', value: formatDuration(user.totalTime ?? 0) },
                    { label: 'Всего тренировок', value: String(user.totalActivities ?? 0) },
                    { label: 'Текущий стрик', value: `${user.currentStreak ?? 0} дн.` },
                    { label: 'Подписчики', value: String(followersCount) },
                    { label: 'Подписки', value: String(followingCount) },
                ].map((stat) => (_jsxs("div", { style: {
                        background: '#fff',
                        borderRadius: 16,
                        padding: 16,
                        boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
                        border: '1px solid #e0e0e0',
                        textAlign: 'center',
                    }, children: [_jsx("div", { style: { fontSize: 22, fontWeight: 700, color: '#242424' }, children: stat.value }), _jsx("div", { style: { fontSize: 13, color: '#666', marginTop: 4 }, children: stat.label })] }, stat.label))) }), _jsx("div", { style: {
                    display: 'grid',
                    gridTemplateColumns: 'repeat(4, 1fr)',
                    gap: 10,
                    marginBottom: 20,
                }, children: sports.map((sport) => {
                    const ss = sportStats.find(s => s.sport === sport);
                    return (_jsxs("div", { style: {
                            background: '#fff',
                            borderRadius: 16,
                            padding: 12,
                            boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
                            border: '1px solid #e0e0e0',
                            textAlign: 'center',
                        }, children: [_jsx("div", { style: { fontSize: 28 }, children: SPORT_ICONS[sport] }), _jsx("div", { style: { fontSize: 12, color: SPORT_COLORS[sport], fontWeight: 600, marginTop: 4 }, children: SPORT_LABELS[sport] }), _jsx("div", { style: { fontSize: 16, fontWeight: 700, color: '#242424', marginTop: 6 }, children: ss ? `${ss.totalDistance.toFixed(1)} км` : '0 км' }), _jsx("div", { style: { fontSize: 11, color: '#999' }, children: ss ? `${ss.activityCount} трен.` : '0 трен.' })] }, sport));
                }) }), _jsxs("div", { style: {
                    background: '#fff',
                    borderRadius: 16,
                    padding: 20,
                    boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
                    border: '1px solid #e0e0e0',
                    marginBottom: 20,
                }, children: [_jsxs("div", { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }, children: [_jsx("div", { style: { fontSize: 18, fontWeight: 700, color: '#242424' }, children: "\u0414\u043E\u0441\u0442\u0438\u0436\u0435\u043D\u0438\u044F" }), _jsxs("div", { style: { fontSize: 13, color: '#888' }, children: [achievements.filter((a) => !!a.unlockedAt).length, " / ", achievements.length] })] }), achLoading ? (_jsx("div", { style: { color: '#999', fontSize: 14 }, children: "\u0417\u0430\u0433\u0440\u0443\u0437\u043A\u0430..." })) : achievements.length === 0 ? (_jsx("div", { style: { color: '#999', fontSize: 14 }, children: "\u041F\u043E\u043A\u0430 \u043D\u0435\u0442 \u0434\u043E\u0441\u0442\u0438\u0436\u0435\u043D\u0438\u0439" })) : (_jsx("div", { style: {
                            display: 'grid',
                            gridTemplateColumns: 'repeat(4, 1fr)',
                            gap: 12,
                        }, children: achievements.map((a) => {
                            const unlocked = !!a.unlockedAt;
                            const cat = a.achievement.category ?? '';
                            const threshold = a.achievement.threshold ?? 0;
                            let progressValue = null;
                            if (!unlocked && threshold > 0) {
                                if (cat === 'distance') {
                                    progressValue = achProgress.totalDistance;
                                }
                                else if (cat === 'streak') {
                                    progressValue = Math.max(achProgress.currentStreak, achProgress.bestStreak);
                                }
                                else if (cat === 'events') {
                                    progressValue = achProgress.finishedEvents;
                                }
                            }
                            const progressPct = progressValue != null && threshold > 0
                                ? Math.min(100, Math.round((progressValue / threshold) * 100))
                                : null;
                            const progressLabel = progressValue != null && threshold > 0
                                ? cat === 'distance'
                                    ? `${Math.round(progressValue)} / ${threshold} км`
                                    : cat === 'streak'
                                        ? `${progressValue} / ${threshold} дн.`
                                        : cat === 'events'
                                            ? `${progressValue} / ${threshold}`
                                            : null
                                : null;
                            return (_jsxs("div", { style: {
                                    borderRadius: 14,
                                    padding: 14,
                                    textAlign: 'center',
                                    background: unlocked ? '#fff' : '#f9f9f9',
                                    border: unlocked ? '2px solid #fc4c02' : '1px solid #e0e0e0',
                                    boxShadow: unlocked ? '0 0 12px rgba(252,76,2,0.2)' : 'none',
                                    opacity: unlocked ? 1 : 0.4,
                                    filter: unlocked ? 'none' : 'grayscale(1)',
                                    transition: 'all 0.2s',
                                    position: 'relative',
                                }, children: [_jsx("div", { style: { fontSize: 40, lineHeight: 1, marginBottom: 6 }, children: a.achievement.icon ?? '🏅' }), _jsx("div", { style: {
                                            fontSize: 13,
                                            fontWeight: 700,
                                            color: unlocked ? '#242424' : '#999',
                                            marginBottom: 2,
                                            lineHeight: 1.2,
                                        }, children: a.achievement.name }), _jsx("div", { style: { fontSize: 11, color: '#999', marginBottom: 4, lineHeight: 1.3 }, children: a.achievement.description }), _jsxs("div", { style: { fontSize: 11, fontWeight: 700, color: '#fc4c02' }, children: ["+", a.achievement.xpReward, " XP"] }), unlocked && a.unlockedAt && (_jsx("div", { style: { fontSize: 10, color: '#1a7f37', marginTop: 4, fontWeight: 600 }, children: formatDate(a.unlockedAt) })), !unlocked && progressLabel != null && progressPct != null && (_jsxs("div", { style: { marginTop: 6 }, children: [_jsx("div", { style: {
                                                    width: '100%',
                                                    height: 4,
                                                    borderRadius: 2,
                                                    background: '#e0e0e0',
                                                    overflow: 'hidden',
                                                }, children: _jsx("div", { style: {
                                                        width: `${progressPct}%`,
                                                        height: '100%',
                                                        background: '#fc4c02',
                                                        borderRadius: 2,
                                                        transition: 'width 0.3s',
                                                    } }) }), _jsx("div", { style: { fontSize: 10, color: '#888', marginTop: 2 }, children: progressLabel })] }))] }, a.achievement.id));
                        }) }))] }), _jsxs("div", { style: {
                    background: '#fff',
                    borderRadius: 16,
                    padding: 20,
                    boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
                    border: '1px solid #e0e0e0',
                    marginBottom: 20,
                }, children: [_jsxs("div", { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }, children: [_jsx("div", { style: { fontSize: 16, fontWeight: 700, color: '#242424' }, children: "\u0420\u0435\u0444\u0435\u0440\u0430\u043B\u044C\u043D\u0430\u044F \u043F\u0440\u043E\u0433\u0440\u0430\u043C\u043C\u0430" }), _jsxs("div", { style: {
                                    background: '#fc4c02',
                                    color: '#fff',
                                    borderRadius: 20,
                                    padding: '4px 14px',
                                    fontSize: 14,
                                    fontWeight: 700,
                                }, children: [referralCount, " ", referralCount === 1 ? 'приглашение' : referralCount >= 2 && referralCount <= 4 ? 'приглашения' : 'приглашений'] })] }), _jsxs("div", { style: { display: 'flex', gap: 8, alignItems: 'center', marginBottom: 16 }, children: [_jsx("input", { readOnly: true, value: referralLink, style: {
                                    flex: 1,
                                    padding: '8px 12px',
                                    borderRadius: 8,
                                    border: '1px solid #e0e0e0',
                                    fontSize: 13,
                                    color: '#242424',
                                    background: '#eef0f4',
                                    outline: 'none',
                                } }), _jsx("button", { type: "button", onClick: handleCopyReferral, style: {
                                    padding: '8px 16px',
                                    borderRadius: 8,
                                    border: 'none',
                                    background: '#fc4c02',
                                    color: '#fff',
                                    fontSize: 13,
                                    fontWeight: 600,
                                    cursor: 'pointer',
                                }, children: copied ? 'Скопировано!' : 'Копировать' })] }), referredUsers.length > 0 ? (_jsx("div", { style: { display: 'flex', flexDirection: 'column', gap: 10 }, children: referredUsers.map((r) => (_jsxs("div", { style: {
                                display: 'flex',
                                alignItems: 'center',
                                gap: 12,
                                padding: '10px 0',
                                borderTop: '1px solid #e0e0e0',
                            }, children: [r.avatarUrl ? (_jsx("img", { src: r.avatarUrl, alt: "", style: { width: 36, height: 36, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 } })) : (_jsx("div", { style: {
                                        width: 36,
                                        height: 36,
                                        borderRadius: '50%',
                                        background: '#fc4c02',
                                        color: '#fff',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        fontSize: 16,
                                        fontWeight: 700,
                                        flexShrink: 0,
                                    }, children: (r.username ?? '?')[0].toUpperCase() })), _jsxs("div", { style: { flex: 1, minWidth: 0 }, children: [_jsx("div", { style: { fontSize: 14, fontWeight: 700, color: '#242424' }, children: r.username }), _jsxs("div", { style: { fontSize: 12, color: '#888' }, children: [formatDate(r.createdAt), " \u2014 ", (r.totalDistance ?? 0).toFixed(1), " \u043A\u043C"] })] }), _jsxs("div", { style: {
                                        background: '#eef0f4',
                                        borderRadius: 8,
                                        padding: '3px 10px',
                                        fontSize: 12,
                                        fontWeight: 600,
                                        color: '#666',
                                    }, children: ["\u0423\u0440. ", r.level ?? 1] })] }, r.id))) })) : (_jsx("div", { style: { textAlign: 'center', padding: 16, color: '#999', fontSize: 14 }, children: "\u041F\u0440\u0438\u0433\u043B\u0430\u0441\u0438\u0442\u0435 \u0434\u0440\u0443\u0437\u0435\u0439 \u0438 \u043F\u043E\u043B\u0443\u0447\u0438\u0442\u0435 \u0431\u043E\u043D\u0443\u0441\u044B!" }))] }), _jsxs("div", { style: {
                    background: '#fff',
                    borderRadius: 16,
                    padding: 20,
                    boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
                    border: '1px solid #e0e0e0',
                    marginBottom: 20,
                }, children: [_jsx("div", { style: { fontSize: 16, fontWeight: 700, color: '#242424', marginBottom: 14 }, children: "\u0420\u0435\u0434\u0430\u043A\u0442\u0438\u0440\u043E\u0432\u0430\u0442\u044C \u043F\u0440\u043E\u0444\u0438\u043B\u044C" }), _jsxs("form", { onSubmit: handleSave, children: [_jsxs("div", { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }, children: [_jsxs("div", { children: [_jsx("label", { style: { fontSize: 13, color: '#666', display: 'block', marginBottom: 4 }, children: "\u0418\u043C\u044F" }), _jsx("input", { value: firstName, onChange: (e) => setFirstName(e.target.value), style: {
                                                    width: '100%',
                                                    padding: '8px 12px',
                                                    borderRadius: 8,
                                                    border: '1px solid #e0e0e0',
                                                    fontSize: 14,
                                                    outline: 'none',
                                                    boxSizing: 'border-box',
                                                } })] }), _jsxs("div", { children: [_jsx("label", { style: { fontSize: 13, color: '#666', display: 'block', marginBottom: 4 }, children: "\u0424\u0430\u043C\u0438\u043B\u0438\u044F" }), _jsx("input", { value: lastName, onChange: (e) => setLastName(e.target.value), style: {
                                                    width: '100%',
                                                    padding: '8px 12px',
                                                    borderRadius: 8,
                                                    border: '1px solid #e0e0e0',
                                                    fontSize: 14,
                                                    outline: 'none',
                                                    boxSizing: 'border-box',
                                                } })] })] }), _jsxs("div", { style: { marginBottom: 12 }, children: [_jsx("label", { style: { fontSize: 13, color: '#666', display: 'block', marginBottom: 4 }, children: "\u0413\u043E\u0440\u043E\u0434" }), _jsx("input", { value: city, onChange: (e) => setCity(e.target.value), style: {
                                            width: '100%',
                                            padding: '8px 12px',
                                            borderRadius: 8,
                                            border: '1px solid #e0e0e0',
                                            fontSize: 14,
                                            outline: 'none',
                                            boxSizing: 'border-box',
                                        } })] }), _jsxs("div", { style: { marginBottom: 16 }, children: [_jsx("label", { style: { fontSize: 13, color: '#666', display: 'block', marginBottom: 4 }, children: "\u041E \u0441\u0435\u0431\u0435" }), _jsx("textarea", { value: bio, onChange: (e) => setBio(e.target.value), rows: 3, style: {
                                            width: '100%',
                                            padding: '8px 12px',
                                            borderRadius: 8,
                                            border: '1px solid #e0e0e0',
                                            fontSize: 14,
                                            outline: 'none',
                                            resize: 'vertical',
                                            boxSizing: 'border-box',
                                            fontFamily: 'inherit',
                                        } })] }), _jsxs("div", { style: { display: 'flex', alignItems: 'center', gap: 12 }, children: [_jsx("button", { type: "submit", disabled: saving, style: {
                                            padding: '10px 24px',
                                            borderRadius: 8,
                                            border: 'none',
                                            background: '#fc4c02',
                                            color: '#fff',
                                            fontSize: 14,
                                            fontWeight: 600,
                                            cursor: saving ? 'not-allowed' : 'pointer',
                                            opacity: saving ? 0.7 : 1,
                                        }, children: saving ? 'Сохранение...' : 'Сохранить' }), saveMsg && (_jsx("span", { style: { fontSize: 13, color: saveMsg === 'Профиль обновлён' ? '#1a7f37' : '#d32f2f' }, children: saveMsg }))] })] })] }), _jsxs("div", { style: { textAlign: 'center', color: '#999', fontSize: 13, marginBottom: 20 }, children: ["\u0423\u0447\u0430\u0441\u0442\u043D\u0438\u043A \u0441 ", formatDate(user.createdAt ?? '')] })] }));
}
