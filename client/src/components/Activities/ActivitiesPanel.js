import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '@/services/api';
import { useAuth } from '@/context/AuthContext';
import Tesseract from 'tesseract.js';
const SPORT_ICONS = {
    RUNNING: '🏃',
    CYCLING: '🚴',
    SKIING: '⛷️',
    WALKING: '🚶',
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
const SPORT_AUTO_TITLES = {
    RUNNING: 'Пробежка',
    CYCLING: 'Велопрогулка',
    SKIING: 'Лыжная прогулка',
    WALKING: 'Прогулка',
};
const ALL_SPORTS = ['RUNNING', 'CYCLING', 'SKIING', 'WALKING'];
function formatDistance(km) {
    return `${km.toFixed(1)} км`;
}
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
function formatPace(durationSec, distanceKm) {
    if (distanceKm <= 0)
        return '—';
    const totalMinutes = durationSec / distanceKm / 60;
    const mins = Math.floor(totalMinutes);
    const secs = Math.round((totalMinutes - mins) * 60);
    return `${mins}:${String(secs).padStart(2, '0')} мин/км`;
}
function formatSpeed(durationSec, distanceKm) {
    if (durationSec <= 0)
        return '—';
    const speed = (distanceKm / durationSec) * 3600;
    return `${speed.toFixed(1)} км/ч`;
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
function autoTitle(sport, distanceMeters) {
    return `${SPORT_AUTO_TITLES[sport]} ${distanceMeters.toFixed(1)} км`;
}
// --- OCR parsing helpers ---
function parseDistanceFromText(text) {
    // Simple rule: "км" WITHOUT "/ч" or "в час" = distance. Everything else ignored.
    // Speed is NOT parsed from OCR — we calculate it from distance/time.
    const allText = text.replace(/\n/g, ' ');
    // Step 1: Remove everything that is speed (км/ч, km/h, кмч, etc.)
    const noSpeed = allText
        .replace(/\d{1,4}[.,]?\d{0,3}\s*(?:км\s*\/\s*ч|km\s*\/\s*h|кмч|mph)/gi, '')
        .replace(/\d{1,4}[.,]?\d{0,3}\s*(?:мин\s*\/\s*км|min\s*\/\s*km)/gi, '')
        .replace(/\d{1,5}\s*(?:ккал|kcal|cal)/gi, '')
        .replace(/\d{5,}/g, ''); // remove phone numbers and other long digit sequences
    // Step 2: Find number + "км" or "km" in cleaned text
    const distMatch = noSpeed.match(/(\d{1,4}[.,]\d{1,3})\s*(?:км|km)/i)
        || noSpeed.match(/(\d{1,4})\s*(?:км|km)/i);
    if (distMatch)
        return distMatch[1].replace(',', '.');
    // Step 3: Check if "км" is on a separate line after a number
    const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
    for (let i = 0; i < lines.length; i++) {
        if (/^км$/i.test(lines[i]) && i > 0) {
            const prev = lines[i - 1].match(/(\d{1,4}[.,]\d{1,3})/);
            if (prev)
                return prev[1].replace(',', '.');
        }
    }
    // Step 4: Find numbers with decimals first (15.65, 30.37 — these are usually distance)
    // Then fall back to largest integer
    const decimalNums = [...noSpeed.matchAll(/(\d{1,4}[.,]\d{1,3})/g)]
        .map(m => ({ raw: m[1], val: parseFloat(m[1].replace(',', '.')) }))
        .filter(c => c.val >= 1 && c.val <= 500);
    if (decimalNums.length > 0) {
        // Prefer the largest decimal number (distance is usually the biggest)
        decimalNums.sort((a, b) => b.val - a.val);
        return decimalNums[0].raw.replace(',', '.');
    }
    // Step 5: No decimals found — try integers near "км" context
    const intNums = [...noSpeed.matchAll(/\b(\d{1,4})\b/g)]
        .map(m => ({ raw: m[1], val: parseInt(m[1], 10) }))
        .filter(c => c.val >= 1 && c.val <= 500);
    if (intNums.length > 0) {
        intNums.sort((a, b) => b.val - a.val);
        return intNums[0].raw;
    }
    return '';
}
function parseDurationFromText(text) {
    const empty = { hours: '', minutes: '', seconds: '' };
    // "1:05:30" or "01:05:30"
    const hmsMatch = text.match(/(\d{1,2}):(\d{2}):(\d{2})/);
    if (hmsMatch) {
        return { hours: hmsMatch[1], minutes: hmsMatch[2], seconds: hmsMatch[3] };
    }
    // "30:15" (mm:ss)
    const msMatch = text.match(/\b(\d{1,3}):(\d{2})\b/);
    if (msMatch) {
        const mins = parseInt(msMatch[1], 10);
        if (mins < 60) {
            return { hours: '', minutes: msMatch[1], seconds: msMatch[2] };
        }
        else {
            const h = Math.floor(mins / 60);
            const m = mins % 60;
            return { hours: String(h), minutes: String(m), seconds: msMatch[2] };
        }
    }
    // "1ч 05м", "1ч05м", "1 ч 05 м"
    const ruMatch = text.match(/(\d{1,2})\s*ч\s*(\d{1,2})\s*м/i);
    if (ruMatch) {
        return { hours: ruMatch[1], minutes: ruMatch[2], seconds: '' };
    }
    // "30м" or "30 мин" or "30 min"
    const minOnly = text.match(/(\d{1,3})\s*(?:м(?:ин)?|min)\b/i);
    if (minOnly) {
        return { hours: '', minutes: minOnly[1], seconds: '' };
    }
    return empty;
}
function parsePaceFromText(text) {
    // "5:30 /km", "5:30/км", "5'30", "5'30\""
    const paceMatch = text.match(/(\d{1,2})[:'′](\d{2})\s*(?:\/?\s*(?:km|км|\/km|\/км))?/i);
    if (paceMatch) {
        return { minutes: paceMatch[1], seconds: paceMatch[2] };
    }
    return null;
}
function ActivityDetailModal({ activity, onClose, isOwner, }) {
    const distKm = activity.distance ?? 0;
    const durationSec = activity.duration ?? 0;
    const showPace = activity.sport === 'RUNNING' || activity.sport === 'WALKING';
    const title = activity.title || autoTitle(activity.sport, activity.distance ?? 0);
    const [photos, setPhotos] = useState([]);
    const [lightboxIdx, setLightboxIdx] = useState(null);
    const [uploading, setUploading] = useState(false);
    const [liked, setLiked] = useState(false);
    const [likeCount, setLikeCount] = useState(0);
    const photoInputRef = useRef(null);
    useEffect(() => {
        api.photos.list(activity.id).then(setPhotos).catch(() => { });
        api.photos.getLikes(activity.id).then((r) => {
            setLiked(r?.liked ?? false);
            setLikeCount(r?.count ?? 0);
        }).catch(() => { });
    }, [activity.id]);
    const handlePhotoUpload = async (e) => {
        const fileList = e.target.files;
        if (!fileList || fileList.length === 0)
            return;
        setUploading(true);
        try {
            const files = Array.from(fileList).slice(0, 5);
            const newPhotos = await api.photos.upload(activity.id, files);
            setPhotos((prev) => [...prev, ...(newPhotos ?? [])]);
        }
        catch {
            // ignore
        }
        finally {
            setUploading(false);
            if (photoInputRef.current)
                photoInputRef.current.value = '';
        }
    };
    const handleDeletePhoto = async (photoId) => {
        try {
            await api.photos.delete(photoId);
            setPhotos((prev) => prev.filter((p) => p.id !== photoId));
        }
        catch {
            // ignore
        }
    };
    const handleLike = async () => {
        try {
            const result = await api.photos.like(activity.id);
            setLiked(result?.liked ?? false);
            setLikeCount(result?.count ?? 0);
        }
        catch {
            // ignore
        }
    };
    return (_jsx("div", { style: {
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: 16,
        }, onClick: (e) => {
            if (e.target === e.currentTarget)
                onClose();
        }, children: _jsxs("div", { style: {
                background: '#fff',
                borderRadius: 20,
                padding: 28,
                maxWidth: 560,
                width: '100%',
                maxHeight: '90vh',
                overflowY: 'auto',
                boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
                position: 'relative',
            }, children: [_jsx("button", { type: "button", onClick: onClose, style: {
                        position: 'absolute',
                        top: 16,
                        right: 16,
                        background: 'none',
                        border: 'none',
                        color: '#999',
                        cursor: 'pointer',
                        fontSize: 22,
                        padding: '4px 8px',
                        borderRadius: 6,
                        lineHeight: 1,
                    }, children: "\u2715" }), _jsxs("div", { style: { display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }, children: [_jsx("span", { style: { fontSize: 40 }, children: SPORT_ICONS[activity.sport] }), _jsxs("div", { style: { flex: 1 }, children: [_jsx("div", { style: { fontSize: 20, fontWeight: 700, color: '#242424' }, children: title }), _jsxs("div", { style: { fontSize: 13, color: '#999', marginTop: 2 }, children: [SPORT_LABELS[activity.sport], " \u00B7 ", formatDate(activity.startedAt ?? activity.createdAt)] })] }), _jsxs("button", { type: "button", onClick: handleLike, style: {
                                display: 'flex',
                                alignItems: 'center',
                                gap: 6,
                                background: liked ? '#fff0f0' : '#f5f5f5',
                                border: liked ? '1.5px solid #fc4c02' : '1.5px solid #e0e0e0',
                                borderRadius: 20,
                                padding: '6px 14px',
                                cursor: 'pointer',
                                fontSize: 14,
                                fontWeight: 600,
                                color: liked ? '#fc4c02' : '#999',
                                transition: 'all 0.2s',
                                flexShrink: 0,
                            }, children: [_jsx("span", { style: { fontSize: 16 }, children: liked ? '\u2764\uFE0F' : '\u2661' }), likeCount > 0 && _jsx("span", { children: likeCount })] })] }), _jsxs("div", { style: {
                        display: 'grid',
                        gridTemplateColumns: '1fr 1fr 1fr',
                        gap: 12,
                        marginBottom: 20,
                    }, children: [_jsxs("div", { style: {
                                background: '#fef3ee',
                                borderRadius: 12,
                                padding: 16,
                                textAlign: 'center',
                            }, children: [_jsx("div", { style: { fontSize: 24, fontWeight: 700, color: SPORT_COLORS[activity.sport] }, children: formatDistance(activity.distance ?? 0) }), _jsx("div", { style: { fontSize: 12, color: '#999', marginTop: 4 }, children: "\u0414\u0438\u0441\u0442\u0430\u043D\u0446\u0438\u044F" })] }), _jsxs("div", { style: {
                                background: '#f5f5f5',
                                borderRadius: 12,
                                padding: 16,
                                textAlign: 'center',
                            }, children: [_jsx("div", { style: { fontSize: 24, fontWeight: 700, color: '#242424' }, children: formatDuration(durationSec) }), _jsx("div", { style: { fontSize: 12, color: '#999', marginTop: 4 }, children: "\u0412\u0440\u0435\u043C\u044F" })] }), _jsxs("div", { style: {
                                background: '#f5f5f5',
                                borderRadius: 12,
                                padding: 16,
                                textAlign: 'center',
                            }, children: [_jsx("div", { style: { fontSize: 24, fontWeight: 700, color: '#242424' }, children: showPace ? formatPace(durationSec, distKm) : formatSpeed(durationSec, distKm) }), _jsx("div", { style: { fontSize: 12, color: '#999', marginTop: 4 }, children: showPace ? 'Темп' : 'Скорость' })] })] }), activity.description && (_jsxs("div", { style: { marginBottom: 20 }, children: [_jsx("div", { style: { fontSize: 13, color: '#999', marginBottom: 6 }, children: "\u041E\u043F\u0438\u0441\u0430\u043D\u0438\u0435" }), _jsx("div", { style: { fontSize: 14, color: '#242424', lineHeight: 1.5 }, children: activity.description })] })), activity.imageUrl && (_jsxs("div", { style: { marginBottom: 20 }, children: [_jsx("div", { style: { fontSize: 13, color: '#999', marginBottom: 8 }, children: "\u0421\u043A\u0440\u0438\u043D\u0448\u043E\u0442" }), _jsx("img", { src: activity.imageUrl, alt: "\u0421\u043A\u0440\u0438\u043D\u0448\u043E\u0442 \u0430\u043A\u0442\u0438\u0432\u043D\u043E\u0441\u0442\u0438", style: {
                                maxWidth: '100%',
                                maxHeight: 400,
                                borderRadius: 12,
                                boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                                objectFit: 'contain',
                                display: 'block',
                            } })] })), _jsxs("div", { style: { marginBottom: 20 }, children: [_jsxs("div", { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }, children: [_jsxs("div", { style: { fontSize: 13, color: '#999' }, children: ["\u0424\u043E\u0442\u043E\u0433\u0440\u0430\u0444\u0438\u0438 ", photos.length > 0 ? `(${photos.length})` : ''] }), isOwner && (_jsxs("label", { style: {
                                        padding: '5px 12px',
                                        borderRadius: 8,
                                        border: '1.5px solid #fc4c02',
                                        background: '#fff',
                                        color: '#fc4c02',
                                        fontSize: 12,
                                        fontWeight: 600,
                                        cursor: uploading ? 'not-allowed' : 'pointer',
                                        opacity: uploading ? 0.6 : 1,
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: 4,
                                    }, children: [uploading ? 'Загрузка...' : 'Добавить фото', _jsx("input", { ref: photoInputRef, type: "file", accept: "image/*", multiple: true, onChange: handlePhotoUpload, style: { display: 'none' } })] }))] }), photos.length > 0 ? (_jsx("div", { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', gap: 8 }, children: photos.map((photo, idx) => (_jsxs("div", { style: { position: 'relative', aspectRatio: '1', borderRadius: 10, overflow: 'hidden' }, children: [_jsx("img", { src: photo.imageUrl, alt: "", style: {
                                            width: '100%',
                                            height: '100%',
                                            objectFit: 'cover',
                                            cursor: 'pointer',
                                            display: 'block',
                                        }, onClick: () => setLightboxIdx(idx) }), isOwner && (_jsx("button", { type: "button", onClick: () => handleDeletePhoto(photo.id), style: {
                                            position: 'absolute',
                                            top: 4,
                                            right: 4,
                                            width: 22,
                                            height: 22,
                                            borderRadius: '50%',
                                            background: 'rgba(0,0,0,0.6)',
                                            color: '#fff',
                                            border: 'none',
                                            cursor: 'pointer',
                                            fontSize: 12,
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            lineHeight: 1,
                                        }, children: "\u2715" }))] }, photo.id))) })) : (_jsx("div", { style: { fontSize: 13, color: '#ccc', textAlign: 'center', padding: '16px 0' }, children: "\u041D\u0435\u0442 \u0444\u043E\u0442\u043E\u0433\u0440\u0430\u0444\u0438\u0439" }))] }), lightboxIdx !== null && photos[lightboxIdx] && (_jsxs("div", { style: {
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        background: 'rgba(0,0,0,0.85)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        zIndex: 10001,
                        padding: 24,
                    }, onClick: () => setLightboxIdx(null), children: [_jsx("button", { type: "button", onClick: () => setLightboxIdx(null), style: {
                                position: 'absolute',
                                top: 20,
                                right: 20,
                                background: 'none',
                                border: 'none',
                                color: '#fff',
                                fontSize: 28,
                                cursor: 'pointer',
                            }, children: "\u2715" }), lightboxIdx > 0 && (_jsx("button", { type: "button", onClick: (e) => { e.stopPropagation(); setLightboxIdx((i) => (i ?? 1) - 1); }, style: {
                                position: 'absolute',
                                left: 20,
                                top: '50%',
                                transform: 'translateY(-50%)',
                                background: 'rgba(255,255,255,0.2)',
                                border: 'none',
                                color: '#fff',
                                fontSize: 28,
                                cursor: 'pointer',
                                width: 44,
                                height: 44,
                                borderRadius: '50%',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                            }, children: "\u2039" })), lightboxIdx < photos.length - 1 && (_jsx("button", { type: "button", onClick: (e) => { e.stopPropagation(); setLightboxIdx((i) => (i ?? 0) + 1); }, style: {
                                position: 'absolute',
                                right: 20,
                                top: '50%',
                                transform: 'translateY(-50%)',
                                background: 'rgba(255,255,255,0.2)',
                                border: 'none',
                                color: '#fff',
                                fontSize: 28,
                                cursor: 'pointer',
                                width: 44,
                                height: 44,
                                borderRadius: '50%',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                            }, children: "\u203A" })), _jsx("img", { src: photos[lightboxIdx].imageUrl, alt: "", onClick: (e) => e.stopPropagation(), style: {
                                maxWidth: '90vw',
                                maxHeight: '85vh',
                                borderRadius: 8,
                                objectFit: 'contain',
                            } })] })), _jsxs("div", { style: {
                        background: '#f5f5f5',
                        borderRadius: 12,
                        padding: 20,
                        textAlign: 'center',
                        marginBottom: 20,
                        border: '1px dashed #e0e0e0',
                    }, children: [_jsx("div", { style: { fontSize: 24, marginBottom: 8 }, children: "\uD83D\uDDFA\uFE0F" }), _jsx("div", { style: { fontSize: 14, color: '#999' }, children: "\u041A\u0430\u0440\u0442\u0430 \u043C\u0430\u0440\u0448\u0440\u0443\u0442\u0430 \u0441\u043A\u043E\u0440\u043E \u0431\u0443\u0434\u0435\u0442 \u0434\u043E\u0441\u0442\u0443\u043F\u043D\u0430" })] }), _jsxs("div", { style: { display: 'flex', gap: 16, flexWrap: 'wrap', fontSize: 13, color: '#999' }, children: [activity.elevGain != null && activity.elevGain > 0 && (_jsxs("span", { children: ["\u041D\u0430\u0431\u043E\u0440 \u0432\u044B\u0441\u043E\u0442\u044B: ", activity.elevGain, " \u043C"] })), activity.calories != null && activity.calories > 0 && (_jsxs("span", { children: ["\u041A\u0430\u043B\u043E\u0440\u0438\u0438: ", activity.calories, " \u043A\u043A\u0430\u043B"] })), _jsx("span", { children: activity.isManual ? 'Ручной ввод' : 'GPS-трек' })] }), _jsx("div", { style: { marginTop: 20, textAlign: 'center' }, children: _jsx("button", { type: "button", onClick: onClose, style: {
                            padding: '10px 32px',
                            borderRadius: 8,
                            border: '1px solid #e0e0e0',
                            background: '#fff',
                            color: '#242424',
                            fontSize: 14,
                            fontWeight: 600,
                            cursor: 'pointer',
                        }, children: "\u0417\u0430\u043A\u0440\u044B\u0442\u044C" }) })] }) }));
}
const PAGE_SIZE = 10;
export default function ActivitiesPanel() {
    const { user } = useAuth();
    const [activities, setActivities] = useState([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [filterSport, setFilterSport] = useState(null);
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');
    const [weeklyDist, setWeeklyDist] = useState(0);
    const [monthlyDist, setMonthlyDist] = useState(0);
    const [showForm, setShowForm] = useState(false);
    const [formSport, setFormSport] = useState('RUNNING');
    const [formDistance, setFormDistance] = useState('');
    const [formHours, setFormHours] = useState('');
    const [formMinutes, setFormMinutes] = useState('');
    const [formSeconds, setFormSeconds] = useState('');
    const [formTitle, setFormTitle] = useState('');
    const [formDate, setFormDate] = useState(new Date().toISOString().split('T')[0]);
    const [formDesc, setFormDesc] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [formError, setFormError] = useState('');
    const [gpxUploading, setGpxUploading] = useState(false);
    // Screenshot upload state
    const [screenshotUploading, setScreenshotUploading] = useState(false);
    const [screenshotPreviewUrl, setScreenshotPreviewUrl] = useState(null);
    const [scrSport, setScrSport] = useState('RUNNING');
    const [scrDistance, setScrDistance] = useState('');
    const [scrHours, setScrHours] = useState('');
    const [scrMinutes, setScrMinutes] = useState('');
    const [scrSeconds, setScrSeconds] = useState('');
    const [scrTitle, setScrTitle] = useState('');
    const [scrDate, setScrDate] = useState('');
    const [scrSubmitting, setScrSubmitting] = useState(false);
    const [scrError, setScrError] = useState('');
    const [scrSuccess, setScrSuccess] = useState('');
    // OCR state
    const [ocrRunning, setOcrRunning] = useState(false);
    const [ocrRawText, setOcrRawText] = useState('');
    const [ocrTextExpanded, setOcrTextExpanded] = useState(false);
    // Detail modal state
    const [detailActivity, setDetailActivity] = useState(null);
    // Likes cache for activity cards
    const [likesMap, setLikesMap] = useState({});
    const gpxInputRef = useRef(null);
    const screenshotInputRef = useRef(null);
    const loadActivities = useCallback(async () => {
        if (!user)
            return;
        setLoading(true);
        try {
            const params = { page, limit: PAGE_SIZE };
            if (filterSport)
                params.sport = filterSport;
            if (dateFrom)
                params.dateFrom = dateFrom;
            if (dateTo)
                params.dateTo = dateTo;
            const res = await api.activities.list(params);
            setActivities(res?.items ?? []);
            setTotalPages(res?.pagination?.totalPages ?? 1);
        }
        catch {
            setActivities([]);
        }
        finally {
            setLoading(false);
        }
    }, [user, page, filterSport, dateFrom, dateTo]);
    useEffect(() => {
        if (!user)
            return;
        api.profile
            .statsSummary()
            .then((res) => {
            setWeeklyDist(res?.weeklyDistance ?? 0);
            setMonthlyDist(res?.monthlyDistance ?? 0);
        })
            .catch(() => { });
    }, [user]);
    useEffect(() => {
        loadActivities();
    }, [loadActivities]);
    // Load likes for visible activities
    useEffect(() => {
        if (activities.length === 0)
            return;
        activities.forEach((act) => {
            if (!likesMap[act.id]) {
                api.photos.getLikes(act.id).then((r) => {
                    setLikesMap((prev) => ({ ...prev, [act.id]: { liked: r?.liked ?? false, count: r?.count ?? 0 } }));
                }).catch(() => { });
            }
        });
    }, [activities]); // eslint-disable-line react-hooks/exhaustive-deps
    const handleSubmit = useCallback(async (e) => {
        e.preventDefault();
        if (!user)
            return;
        setSubmitting(true);
        setFormError('');
        try {
            const distKm = parseFloat(formDistance);
            if (isNaN(distKm) || distKm <= 0) {
                setFormError('Укажите дистанцию');
                setSubmitting(false);
                return;
            }
            const h = parseInt(formHours || '0', 10);
            const m = parseInt(formMinutes || '0', 10);
            const s = parseInt(formSeconds || '0', 10);
            const duration = h * 3600 + m * 60 + s;
            if (duration <= 0) {
                setFormError('Укажите время');
                setSubmitting(false);
                return;
            }
            await api.activities.create({
                sport: formSport,
                distance: distKm,
                duration,
                title: formTitle || undefined,
                description: formDesc || undefined,
                startedAt: formDate ? new Date(formDate).toISOString() : new Date().toISOString(),
                isManual: true,
            });
            setFormDistance('');
            setFormHours('');
            setFormMinutes('');
            setFormSeconds('');
            setFormTitle('');
            setFormDate('');
            setFormDesc('');
            setShowForm(false);
            setPage(1);
            loadActivities();
        }
        catch (err) {
            setFormError(err instanceof Error ? err.message : 'Ошибка при создании активности');
        }
        finally {
            setSubmitting(false);
        }
    }, [user, formSport, formDistance, formHours, formMinutes, formSeconds, formTitle, formDate, formDesc, loadActivities]);
    const handleGpxUpload = useCallback(async (e) => {
        const file = e.target.files?.[0];
        if (!file)
            return;
        setGpxUploading(true);
        setFormError('');
        try {
            await api.activities.uploadGpx(file);
            setPage(1);
            loadActivities();
        }
        catch (err) {
            setFormError(err instanceof Error ? err.message : 'Ошибка загрузки GPX');
        }
        finally {
            setGpxUploading(false);
            if (gpxInputRef.current)
                gpxInputRef.current.value = '';
        }
    }, [loadActivities]);
    const handleScreenshotUpload = useCallback(async (e) => {
        const file = e.target.files?.[0];
        if (!file)
            return;
        setScreenshotUploading(true);
        setOcrRunning(true);
        setScrError('');
        setScrSuccess('');
        setOcrRawText('');
        setOcrTextExpanded(false);
        try {
            // Run OCR and upload simultaneously
            const [ocrResult, uploadRes] = await Promise.allSettled([
                Tesseract.recognize(file, 'eng+rus'),
                api.activities.uploadScreenshot(file),
            ]);
            // Handle upload result
            if (uploadRes.status === 'fulfilled') {
                setScreenshotPreviewUrl(uploadRes.value.imageUrl);
            }
            else {
                throw uploadRes.reason instanceof Error
                    ? uploadRes.reason
                    : new Error('Ошибка загрузки скриншота');
            }
            // Handle OCR result - graceful degradation
            if (ocrResult.status === 'fulfilled') {
                const text = ocrResult.value.data.text;
                setOcrRawText(text);
                console.log('=== OCR RAW TEXT ===');
                console.log(text);
                console.log('===================');
                // 1. Parse distance (number + "км" without "/ч")
                const parsedDistance = parseDistanceFromText(text);
                if (parsedDistance)
                    setScrDistance(parsedDistance);
                // 2. Parse duration (HH:MM:SS patterns)
                const parsedDuration = parseDurationFromText(text);
                if (parsedDuration.hours)
                    setScrHours(parsedDuration.hours);
                if (parsedDuration.minutes)
                    setScrMinutes(parsedDuration.minutes);
                if (parsedDuration.seconds)
                    setScrSeconds(parsedDuration.seconds);
                // 3. Parse speed (number + "км/ч")
                const speedMatch = text.match(/(\d{1,4}[.,]\d{1,3})\s*(?:км\s*\/\s*ч|km\s*\/\s*h)/i);
                const speedKmh = speedMatch ? parseFloat(speedMatch[1].replace(',', '.')) : 0;
                // 4. If no distance found but have speed + duration → calculate distance
                if (!parsedDistance && speedKmh > 0) {
                    const h = parseInt(parsedDuration.hours || '0', 10);
                    const m = parseInt(parsedDuration.minutes || '0', 10);
                    const s = parseInt(parsedDuration.seconds || '0', 10);
                    const totalHours = h + m / 60 + s / 3600;
                    if (totalHours > 0) {
                        const calcDist = (speedKmh * totalHours).toFixed(1);
                        setScrDistance(calcDist);
                        console.log(`Distance calculated: ${speedKmh} км/ч × ${totalHours.toFixed(2)} ч = ${calcDist} км`);
                    }
                }
                // 5. If no duration but have pace + distance, calculate
                if (!parsedDuration.hours && !parsedDuration.minutes && !parsedDuration.seconds) {
                    const pace = parsePaceFromText(text);
                    const dist = parsedDistance ? parseFloat(parsedDistance) : 0;
                    if (pace && dist > 0) {
                        const paceMinutes = parseInt(pace.minutes, 10);
                        const paceSeconds = parseInt(pace.seconds, 10);
                        const totalPaceSec = paceMinutes * 60 + paceSeconds;
                        const totalSec = Math.round(totalPaceSec * dist);
                        const h = Math.floor(totalSec / 3600);
                        const m = Math.floor((totalSec % 3600) / 60);
                        const s = totalSec % 60;
                        if (h > 0)
                            setScrHours(String(h));
                        if (m > 0)
                            setScrMinutes(String(m));
                        if (s > 0)
                            setScrSeconds(String(s));
                    }
                }
            }
            // If OCR fails, fields stay empty - user fills manually
            setScrDate(new Date().toISOString().slice(0, 10));
        }
        catch (err) {
            setScrError(err instanceof Error ? err.message : 'Ошибка загрузки скриншота');
        }
        finally {
            setScreenshotUploading(false);
            setOcrRunning(false);
            if (screenshotInputRef.current)
                screenshotInputRef.current.value = '';
        }
    }, []);
    const handleScreenshotConfirm = useCallback(async (e) => {
        e.preventDefault();
        if (!user)
            return;
        setScrSubmitting(true);
        setScrError('');
        setScrSuccess('');
        try {
            const distKm = parseFloat(scrDistance);
            if (isNaN(distKm) || distKm <= 0) {
                setScrError('Укажите дистанцию');
                setScrSubmitting(false);
                return;
            }
            const h = parseInt(scrHours || '0', 10);
            const m = parseInt(scrMinutes || '0', 10);
            const s = parseInt(scrSeconds || '0', 10);
            const duration = h * 3600 + m * 60 + s;
            if (duration <= 0) {
                setScrError('Укажите время');
                setScrSubmitting(false);
                return;
            }
            await api.activities.create({
                sport: scrSport,
                distance: distKm,
                duration,
                title: scrTitle || undefined,
                startedAt: scrDate ? new Date(scrDate).toISOString() : new Date().toISOString(),
                isManual: true,
            });
            setScrSuccess('Активность успешно сохранена!');
            setScrDistance('');
            setScrHours('');
            setScrMinutes('');
            setScrSeconds('');
            setScrTitle('');
            setScrDate('');
            setScreenshotPreviewUrl(null);
            setOcrRawText('');
            setOcrTextExpanded(false);
            setPage(1);
            loadActivities();
        }
        catch (err) {
            setScrError(err instanceof Error ? err.message : 'Ошибка при создании активности');
        }
        finally {
            setScrSubmitting(false);
        }
    }, [user, scrSport, scrDistance, scrHours, scrMinutes, scrSeconds, scrTitle, scrDate, loadActivities]);
    const handleCancelScreenshot = useCallback(() => {
        setScreenshotPreviewUrl(null);
        setScrDistance('');
        setScrHours('');
        setScrMinutes('');
        setScrSeconds('');
        setScrTitle('');
        setScrDate('');
        setScrError('');
        setScrSuccess('');
        setOcrRawText('');
        setOcrTextExpanded(false);
    }, []);
    const handleDelete = useCallback(async (id) => {
        if (!confirm('Удалить эту активность?'))
            return;
        try {
            await api.activities.delete(id);
            loadActivities();
        }
        catch {
            // ignore
        }
    }, [loadActivities]);
    if (!user) {
        return (_jsx("div", { style: {
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                minHeight: '60vh',
                color: '#666',
                fontSize: 18,
            }, children: "\u0412\u043E\u0439\u0434\u0438\u0442\u0435 \u0447\u0442\u043E\u0431\u044B \u0443\u0432\u0438\u0434\u0435\u0442\u044C \u0430\u043A\u0442\u0438\u0432\u043D\u043E\u0441\u0442\u0438" }));
    }
    const inputStyle = {
        padding: '8px 12px',
        borderRadius: 8,
        border: '1px solid #e0e0e0',
        fontSize: 14,
        outline: 'none',
        boxSizing: 'border-box',
    };
    return (_jsxs("div", { style: { maxWidth: 800, margin: '0 auto', padding: '24px 16px' }, children: [detailActivity && (_jsx(ActivityDetailModal, { activity: detailActivity, onClose: () => setDetailActivity(null), isOwner: true })), _jsxs("div", { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }, children: [_jsxs("div", { style: {
                            background: '#fff',
                            borderRadius: 16,
                            padding: 16,
                            boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
                            border: '1px solid #e0e0e0',
                            textAlign: 'center',
                        }, children: [_jsx("div", { style: { fontSize: 22, fontWeight: 700, color: '#fc4c02' }, children: formatDistance(weeklyDist) }), _jsx("div", { style: { fontSize: 13, color: '#666', marginTop: 4 }, children: "\u0417\u0430 \u043D\u0435\u0434\u0435\u043B\u044E" })] }), _jsxs("div", { style: {
                            background: '#fff',
                            borderRadius: 16,
                            padding: 16,
                            boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
                            border: '1px solid #e0e0e0',
                            textAlign: 'center',
                        }, children: [_jsx("div", { style: { fontSize: 22, fontWeight: 700, color: '#fc4c02' }, children: formatDistance(monthlyDist) }), _jsx("div", { style: { fontSize: 13, color: '#666', marginTop: 4 }, children: "\u0417\u0430 \u043C\u0435\u0441\u044F\u0446" })] })] }), _jsxs("div", { style: { marginBottom: 16, display: 'flex', gap: 10, flexWrap: 'wrap' }, children: [_jsx("button", { type: "button", onClick: () => setShowForm((v) => !v), style: {
                            padding: '10px 20px',
                            borderRadius: 8,
                            border: 'none',
                            background: '#fc4c02',
                            color: '#fff',
                            fontSize: 14,
                            fontWeight: 600,
                            cursor: 'pointer',
                        }, children: showForm ? 'Отмена' : 'Добавить активность' }), _jsxs("label", { style: {
                            padding: '10px 20px',
                            borderRadius: 8,
                            border: '1px solid #e0e0e0',
                            background: '#fff',
                            color: '#242424',
                            fontSize: 14,
                            fontWeight: 600,
                            cursor: gpxUploading ? 'not-allowed' : 'pointer',
                            opacity: gpxUploading ? 0.7 : 1,
                            display: 'inline-flex',
                            alignItems: 'center',
                        }, children: [gpxUploading ? 'Загрузка...' : 'Загрузить GPX', _jsx("input", { ref: gpxInputRef, type: "file", accept: ".gpx", onChange: handleGpxUpload, style: { display: 'none' } })] }), _jsxs("label", { style: {
                            padding: '10px 20px',
                            borderRadius: 8,
                            border: '1px solid #e0e0e0',
                            background: '#fff',
                            color: '#242424',
                            fontSize: 14,
                            fontWeight: 600,
                            cursor: screenshotUploading ? 'not-allowed' : 'pointer',
                            opacity: screenshotUploading ? 0.7 : 1,
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 6,
                        }, children: [screenshotUploading ? 'Загрузка...' : '📷 Загрузить скриншот результата', _jsx("input", { ref: screenshotInputRef, type: "file", accept: "image/*", onChange: handleScreenshotUpload, style: { display: 'none' } })] })] }), (screenshotUploading || ocrRunning) && !screenshotPreviewUrl && (_jsxs("div", { style: {
                    background: '#fff',
                    borderRadius: 16,
                    padding: 24,
                    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                    border: '1px solid #e0e0e0',
                    marginBottom: 20,
                    textAlign: 'center',
                }, children: [_jsx("div", { style: { fontSize: 28, marginBottom: 12 }, children: "\uD83D\uDD0D" }), _jsx("div", { style: { fontSize: 15, fontWeight: 600, color: '#242424', marginBottom: 6 }, children: "\u0420\u0430\u0441\u043F\u043E\u0437\u043D\u0430\u0451\u043C \u0434\u0430\u043D\u043D\u044B\u0435..." }), _jsx("div", { style: { fontSize: 13, color: '#999' }, children: "\u0417\u0430\u0433\u0440\u0443\u0436\u0430\u0435\u043C \u0441\u043A\u0440\u0438\u043D\u0448\u043E\u0442 \u0438 \u0438\u0437\u0432\u043B\u0435\u043A\u0430\u0435\u043C \u0434\u0438\u0441\u0442\u0430\u043D\u0446\u0438\u044E \u0438 \u0432\u0440\u0435\u043C\u044F" })] })), screenshotPreviewUrl && (_jsxs("div", { style: {
                    background: '#fff',
                    borderRadius: 16,
                    padding: 20,
                    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                    border: '1px solid #e0e0e0',
                    marginBottom: 20,
                }, children: [_jsxs("div", { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }, children: [_jsx("div", { style: { fontSize: 16, fontWeight: 700, color: '#242424' }, children: "\uD83D\uDCF7 \u0421\u043A\u0440\u0438\u043D\u0448\u043E\u0442 \u0437\u0430\u0433\u0440\u0443\u0436\u0435\u043D! \u041F\u0440\u043E\u0432\u0435\u0440\u044C\u0442\u0435 \u0434\u0430\u043D\u043D\u044B\u0435" }), _jsx("button", { type: "button", onClick: handleCancelScreenshot, style: {
                                    background: 'none',
                                    border: 'none',
                                    color: '#999',
                                    cursor: 'pointer',
                                    fontSize: 18,
                                    padding: '4px 8px',
                                }, children: "\u2715" })] }), _jsxs("div", { style: { display: 'flex', gap: 20, flexWrap: 'wrap' }, children: [_jsxs("div", { style: { flexShrink: 0 }, children: [_jsx("img", { src: screenshotPreviewUrl, alt: "\u0421\u043A\u0440\u0438\u043D\u0448\u043E\u0442 \u0440\u0435\u0437\u0443\u043B\u044C\u0442\u0430\u0442\u0430", style: {
                                            maxWidth: 300,
                                            maxHeight: 400,
                                            borderRadius: 12,
                                            boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
                                            objectFit: 'contain',
                                            display: 'block',
                                        } }), _jsx("div", { style: { fontSize: 12, color: '#999', marginTop: 8, textAlign: 'center' }, children: "\u041F\u0440\u043E\u0432\u0435\u0440\u044C\u0442\u0435 \u0440\u0435\u0437\u0443\u043B\u044C\u0442\u0430\u0442" })] }), _jsxs("form", { onSubmit: handleScreenshotConfirm, style: { flex: 1, minWidth: 240 }, children: [_jsxs("div", { style: { marginBottom: 14 }, children: [_jsx("div", { style: { fontSize: 13, color: '#666', marginBottom: 6 }, children: "\u0412\u0438\u0434 \u0441\u043F\u043E\u0440\u0442\u0430" }), _jsx("div", { style: { display: 'flex', gap: 6, flexWrap: 'wrap' }, children: ALL_SPORTS.map((s) => (_jsxs("button", { type: "button", onClick: () => setScrSport(s), style: {
                                                        padding: '6px 12px',
                                                        borderRadius: 8,
                                                        border: scrSport === s ? `2px solid ${SPORT_COLORS[s]}` : '1px solid #e0e0e0',
                                                        background: scrSport === s ? '#fff' : '#eef0f4',
                                                        cursor: 'pointer',
                                                        fontSize: 13,
                                                        fontWeight: scrSport === s ? 600 : 400,
                                                        color: scrSport === s ? SPORT_COLORS[s] : '#666',
                                                    }, children: [SPORT_ICONS[s], " ", SPORT_LABELS[s]] }, s))) })] }), _jsxs("div", { style: { marginBottom: 12 }, children: [_jsx("label", { style: { fontSize: 13, color: '#666', display: 'block', marginBottom: 4 }, children: "\u0414\u0438\u0441\u0442\u0430\u043D\u0446\u0438\u044F (\u043A\u043C)" }), _jsx("input", { type: "number", step: "0.01", min: "0", value: scrDistance, onChange: (e) => setScrDistance(e.target.value), placeholder: "5.0", style: { ...inputStyle, width: 160 } })] }), _jsxs("div", { style: { marginBottom: 12 }, children: [_jsx("label", { style: { fontSize: 13, color: '#666', display: 'block', marginBottom: 4 }, children: "\u0414\u043B\u0438\u0442\u0435\u043B\u044C\u043D\u043E\u0441\u0442\u044C" }), _jsxs("div", { style: { display: 'flex', gap: 6, alignItems: 'center' }, children: [_jsx("input", { type: "number", min: "0", value: scrHours, onChange: (e) => setScrHours(e.target.value), placeholder: "\u0447", style: { ...inputStyle, width: 56, textAlign: 'center' } }), _jsx("span", { style: { color: '#999' }, children: ":" }), _jsx("input", { type: "number", min: "0", max: "59", value: scrMinutes, onChange: (e) => setScrMinutes(e.target.value), placeholder: "\u043C", style: { ...inputStyle, width: 56, textAlign: 'center' } }), _jsx("span", { style: { color: '#999' }, children: ":" }), _jsx("input", { type: "number", min: "0", max: "59", value: scrSeconds, onChange: (e) => setScrSeconds(e.target.value), placeholder: "\u0441", style: { ...inputStyle, width: 56, textAlign: 'center' } })] })] }), _jsxs("div", { style: { marginBottom: 12 }, children: [_jsx("label", { style: { fontSize: 13, color: '#666', display: 'block', marginBottom: 4 }, children: "\u041D\u0430\u0437\u0432\u0430\u043D\u0438\u0435 (\u043D\u0435\u043E\u0431\u044F\u0437\u0430\u0442\u0435\u043B\u044C\u043D\u043E)" }), _jsx("input", { value: scrTitle, onChange: (e) => setScrTitle(e.target.value), placeholder: "\u0423\u0442\u0440\u0435\u043D\u043D\u044F\u044F \u043F\u0440\u043E\u0431\u0435\u0436\u043A\u0430", style: { ...inputStyle, width: '100%' } })] }), _jsxs("div", { style: { marginBottom: 14 }, children: [_jsx("label", { style: { fontSize: 13, color: '#666', display: 'block', marginBottom: 4 }, children: "\u0414\u0430\u0442\u0430" }), _jsx("input", { type: "date", value: scrDate, onChange: (e) => setScrDate(e.target.value), style: { ...inputStyle, width: 180 } })] }), ocrRawText && (_jsxs("div", { style: { marginBottom: 14 }, children: [_jsxs("button", { type: "button", onClick: () => setOcrTextExpanded((v) => !v), style: {
                                                    background: 'none',
                                                    border: 'none',
                                                    padding: 0,
                                                    cursor: 'pointer',
                                                    fontSize: 13,
                                                    color: '#666',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: 4,
                                                }, children: [_jsx("span", { style: {
                                                            display: 'inline-block',
                                                            transform: ocrTextExpanded ? 'rotate(90deg)' : 'rotate(0deg)',
                                                            transition: 'transform 0.2s',
                                                            fontSize: 10,
                                                        }, children: "\u25B6" }), "\u0420\u0430\u0441\u043F\u043E\u0437\u043D\u0430\u043D\u043D\u044B\u0439 \u0442\u0435\u043A\u0441\u0442"] }), ocrTextExpanded && (_jsx("div", { style: {
                                                    marginTop: 8,
                                                    padding: 10,
                                                    background: '#f5f5f5',
                                                    borderRadius: 8,
                                                    fontSize: 12,
                                                    color: '#666',
                                                    fontFamily: 'monospace',
                                                    whiteSpace: 'pre-wrap',
                                                    wordBreak: 'break-word',
                                                    maxHeight: 200,
                                                    overflowY: 'auto',
                                                    border: '1px solid #e0e0e0',
                                                }, children: ocrRawText }))] })), scrError && (_jsx("div", { style: { color: '#d32f2f', fontSize: 13, marginBottom: 10 }, children: scrError })), scrSuccess && (_jsx("div", { style: { color: '#1a7f37', fontSize: 13, marginBottom: 10, fontWeight: 600 }, children: scrSuccess })), _jsxs("div", { style: { display: 'flex', gap: 10 }, children: [_jsx("button", { type: "submit", disabled: scrSubmitting, style: {
                                                    padding: '10px 24px',
                                                    borderRadius: 8,
                                                    border: 'none',
                                                    background: '#fc4c02',
                                                    color: '#fff',
                                                    fontSize: 14,
                                                    fontWeight: 600,
                                                    cursor: scrSubmitting ? 'not-allowed' : 'pointer',
                                                    opacity: scrSubmitting ? 0.7 : 1,
                                                }, children: scrSubmitting ? 'Сохранение...' : 'Подтвердить и сохранить' }), _jsx("button", { type: "button", onClick: handleCancelScreenshot, style: {
                                                    padding: '10px 20px',
                                                    borderRadius: 8,
                                                    border: '1px solid #e0e0e0',
                                                    background: '#fff',
                                                    color: '#666',
                                                    fontSize: 14,
                                                    cursor: 'pointer',
                                                }, children: "\u041E\u0442\u043C\u0435\u043D\u0430" })] })] })] })] })), showForm && (_jsx("div", { style: {
                    background: '#fff',
                    borderRadius: 16,
                    padding: 20,
                    boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
                    border: '1px solid #e0e0e0',
                    marginBottom: 20,
                }, children: _jsxs("form", { onSubmit: handleSubmit, children: [_jsxs("div", { style: { marginBottom: 14 }, children: [_jsx("div", { style: { fontSize: 13, color: '#666', marginBottom: 6 }, children: "\u0412\u0438\u0434 \u0441\u043F\u043E\u0440\u0442\u0430" }), _jsx("div", { style: { display: 'flex', gap: 8 }, children: ALL_SPORTS.map((s) => (_jsxs("button", { type: "button", onClick: () => setFormSport(s), style: {
                                            padding: '8px 14px',
                                            borderRadius: 8,
                                            border: formSport === s ? `2px solid ${SPORT_COLORS[s]}` : '1px solid #e0e0e0',
                                            background: formSport === s ? '#fff' : '#eef0f4',
                                            cursor: 'pointer',
                                            fontSize: 14,
                                            fontWeight: formSport === s ? 600 : 400,
                                            color: formSport === s ? SPORT_COLORS[s] : '#666',
                                        }, children: [SPORT_ICONS[s], " ", SPORT_LABELS[s]] }, s))) })] }), _jsxs("div", { style: { marginBottom: 12 }, children: [_jsx("label", { style: { fontSize: 13, color: '#666', display: 'block', marginBottom: 4 }, children: "\u0414\u0438\u0441\u0442\u0430\u043D\u0446\u0438\u044F (\u043A\u043C)" }), _jsx("input", { type: "number", step: "0.01", min: "0", value: formDistance, onChange: (e) => setFormDistance(e.target.value), placeholder: "5.0", style: { ...inputStyle, width: 160 } })] }), _jsxs("div", { style: { marginBottom: 12 }, children: [_jsx("label", { style: { fontSize: 13, color: '#666', display: 'block', marginBottom: 4 }, children: "\u0414\u043B\u0438\u0442\u0435\u043B\u044C\u043D\u043E\u0441\u0442\u044C" }), _jsxs("div", { style: { display: 'flex', gap: 8, alignItems: 'center' }, children: [_jsx("input", { type: "number", min: "0", value: formHours, onChange: (e) => setFormHours(e.target.value), placeholder: "\u0447", style: { ...inputStyle, width: 60, textAlign: 'center' } }), _jsx("span", { style: { color: '#999' }, children: ":" }), _jsx("input", { type: "number", min: "0", max: "59", value: formMinutes, onChange: (e) => setFormMinutes(e.target.value), placeholder: "\u043C", style: { ...inputStyle, width: 60, textAlign: 'center' } }), _jsx("span", { style: { color: '#999' }, children: ":" }), _jsx("input", { type: "number", min: "0", max: "59", value: formSeconds, onChange: (e) => setFormSeconds(e.target.value), placeholder: "\u0441", style: { ...inputStyle, width: 60, textAlign: 'center' } })] })] }), _jsxs("div", { style: { marginBottom: 12 }, children: [_jsx("label", { style: { fontSize: 13, color: '#666', display: 'block', marginBottom: 4 }, children: "\u041D\u0430\u0437\u0432\u0430\u043D\u0438\u0435 (\u043D\u0435\u043E\u0431\u044F\u0437\u0430\u0442\u0435\u043B\u044C\u043D\u043E)" }), _jsx("input", { value: formTitle, onChange: (e) => setFormTitle(e.target.value), placeholder: "\u0423\u0442\u0440\u0435\u043D\u043D\u044F\u044F \u043F\u0440\u043E\u0431\u0435\u0436\u043A\u0430", style: { ...inputStyle, width: '100%' } })] }), _jsxs("div", { style: { marginBottom: 12 }, children: [_jsx("label", { style: { fontSize: 13, color: '#666', display: 'block', marginBottom: 4 }, children: "\u0414\u0430\u0442\u0430" }), _jsx("input", { type: "date", value: formDate, max: new Date().toISOString().split('T')[0], onChange: (e) => setFormDate(e.target.value), style: { ...inputStyle, width: 180 } })] }), _jsxs("div", { style: { marginBottom: 16 }, children: [_jsx("label", { style: { fontSize: 13, color: '#666', display: 'block', marginBottom: 4 }, children: "\u041E\u043F\u0438\u0441\u0430\u043D\u0438\u0435 (\u043D\u0435\u043E\u0431\u044F\u0437\u0430\u0442\u0435\u043B\u044C\u043D\u043E)" }), _jsx("textarea", { value: formDesc, onChange: (e) => setFormDesc(e.target.value), rows: 2, style: { ...inputStyle, width: '100%', resize: 'vertical', fontFamily: 'inherit' } })] }), formError && (_jsx("div", { style: { color: '#d32f2f', fontSize: 13, marginBottom: 10 }, children: formError })), _jsx("button", { type: "submit", disabled: submitting, style: {
                                padding: '10px 24px',
                                borderRadius: 8,
                                border: 'none',
                                background: '#fc4c02',
                                color: '#fff',
                                fontSize: 14,
                                fontWeight: 600,
                                cursor: submitting ? 'not-allowed' : 'pointer',
                                opacity: submitting ? 0.7 : 1,
                            }, children: submitting ? 'Сохранение...' : 'Сохранить активность' })] }) })), _jsxs("div", { style: {
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: 8,
                    alignItems: 'center',
                    marginBottom: 16,
                }, children: [_jsx("button", { type: "button", onClick: () => { setFilterSport(null); setPage(1); }, style: {
                            padding: '6px 14px',
                            borderRadius: 20,
                            border: filterSport === null ? '2px solid #fc4c02' : '1px solid #e0e0e0',
                            background: filterSport === null ? '#fff' : '#eef0f4',
                            color: filterSport === null ? '#fc4c02' : '#666',
                            fontWeight: filterSport === null ? 600 : 400,
                            fontSize: 13,
                            cursor: 'pointer',
                        }, children: "\u0412\u0441\u0435" }), ALL_SPORTS.map((s) => (_jsxs("button", { type: "button", onClick: () => { setFilterSport(s); setPage(1); }, style: {
                            padding: '6px 14px',
                            borderRadius: 20,
                            border: filterSport === s ? `2px solid ${SPORT_COLORS[s]}` : '1px solid #e0e0e0',
                            background: filterSport === s ? '#fff' : '#eef0f4',
                            color: filterSport === s ? SPORT_COLORS[s] : '#666',
                            fontWeight: filterSport === s ? 600 : 400,
                            fontSize: 13,
                            cursor: 'pointer',
                        }, children: [SPORT_ICONS[s], " ", SPORT_LABELS[s]] }, s))), _jsx("input", { type: "date", value: dateFrom, onChange: (e) => { setDateFrom(e.target.value); setPage(1); }, placeholder: "\u0421", style: { ...inputStyle, fontSize: 13 } }), _jsx("input", { type: "date", value: dateTo, onChange: (e) => { setDateTo(e.target.value); setPage(1); }, placeholder: "\u041F\u043E", style: { ...inputStyle, fontSize: 13 } })] }), loading ? (_jsx("div", { style: { textAlign: 'center', color: '#999', padding: 40, fontSize: 15 }, children: "\u0417\u0430\u0433\u0440\u0443\u0437\u043A\u0430..." })) : activities.length === 0 ? (_jsx("div", { style: {
                    textAlign: 'center',
                    color: '#999',
                    padding: 40,
                    fontSize: 15,
                    background: '#fff',
                    borderRadius: 16,
                    border: '1px solid #e0e0e0',
                }, children: "\u041D\u0435\u0442 \u0430\u043A\u0442\u0438\u0432\u043D\u043E\u0441\u0442\u0435\u0439. \u041D\u0430\u0447\u043D\u0438\u0442\u0435 \u0441 \u043F\u0435\u0440\u0432\u043E\u0439 \u0442\u0440\u0435\u043D\u0438\u0440\u043E\u0432\u043A\u0438!" })) : (_jsx("div", { style: { display: 'flex', flexDirection: 'column', gap: 10 }, children: activities.map((act) => {
                    const distKm = act.distance ?? 0;
                    const durationSec = act.duration ?? 0;
                    const showPace = act.sport === 'RUNNING' || act.sport === 'WALKING';
                    const title = act.title || autoTitle(act.sport, act.distance ?? 0);
                    return (_jsxs("div", { style: {
                            background: '#fff',
                            borderRadius: 16,
                            padding: 16,
                            boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
                            border: '1px solid #e0e0e0',
                            cursor: 'pointer',
                            transition: 'box-shadow 0.2s',
                        }, onClick: () => setDetailActivity(act), onMouseEnter: (e) => {
                            e.currentTarget.style.boxShadow = '0 2px 12px rgba(0,0,0,0.12)';
                        }, onMouseLeave: (e) => {
                            e.currentTarget.style.boxShadow = '0 1px 4px rgba(0,0,0,0.06)';
                        }, children: [_jsxs("div", { style: { display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }, children: [_jsxs("div", { style: { display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }, children: [_jsx("span", { style: { fontSize: 28 }, children: SPORT_ICONS[act.sport] }), _jsxs("div", { style: { minWidth: 0 }, children: [_jsx("div", { style: {
                                                            fontSize: 16,
                                                            fontWeight: 600,
                                                            color: '#242424',
                                                            overflow: 'hidden',
                                                            textOverflow: 'ellipsis',
                                                            whiteSpace: 'nowrap',
                                                        }, children: title }), _jsx("div", { style: { fontSize: 12, color: '#999', marginTop: 2 }, children: formatDate(act.startedAt ?? act.createdAt) })] })] }), _jsx("button", { type: "button", onClick: (e) => {
                                            e.stopPropagation();
                                            handleDelete(act.id);
                                        }, style: {
                                            background: 'none',
                                            border: 'none',
                                            color: '#999',
                                            cursor: 'pointer',
                                            fontSize: 18,
                                            padding: '4px 8px',
                                            borderRadius: 6,
                                            flexShrink: 0,
                                        }, title: "\u0423\u0434\u0430\u043B\u0438\u0442\u044C", children: "\u2715" })] }), _jsxs("div", { style: { display: 'flex', gap: 20, marginTop: 10, flexWrap: 'wrap', alignItems: 'center' }, children: [_jsxs("div", { children: [_jsx("div", { style: { fontSize: 16, fontWeight: 700, color: SPORT_COLORS[act.sport] }, children: formatDistance(act.distance ?? 0) }), _jsx("div", { style: { fontSize: 11, color: '#999' }, children: "\u0414\u0438\u0441\u0442\u0430\u043D\u0446\u0438\u044F" })] }), _jsxs("div", { children: [_jsx("div", { style: { fontSize: 16, fontWeight: 700, color: '#242424' }, children: formatDuration(durationSec) }), _jsx("div", { style: { fontSize: 11, color: '#999' }, children: "\u0412\u0440\u0435\u043C\u044F" })] }), _jsxs("div", { children: [_jsx("div", { style: { fontSize: 16, fontWeight: 700, color: '#242424' }, children: showPace ? formatPace(durationSec, distKm) : formatSpeed(durationSec, distKm) }), _jsx("div", { style: { fontSize: 11, color: '#999' }, children: showPace ? 'Темп' : 'Скорость' })] }), (likesMap[act.id]?.count ?? 0) > 0 && (_jsxs("div", { style: { marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 4, color: '#fc4c02', fontSize: 14, fontWeight: 600 }, children: [_jsx("span", { children: '\u2764\uFE0F' }), _jsx("span", { children: likesMap[act.id].count })] }))] })] }, act.id));
                }) })), totalPages > 1 && (_jsxs("div", { style: { display: 'flex', justifyContent: 'center', gap: 8, marginTop: 20 }, children: [_jsx("button", { type: "button", disabled: page <= 1, onClick: () => setPage((p) => Math.max(1, p - 1)), style: {
                            padding: '8px 16px',
                            borderRadius: 8,
                            border: '1px solid #e0e0e0',
                            background: '#fff',
                            cursor: page <= 1 ? 'not-allowed' : 'pointer',
                            opacity: page <= 1 ? 0.5 : 1,
                            fontSize: 14,
                            color: '#242424',
                        }, children: "\u041D\u0430\u0437\u0430\u0434" }), _jsxs("span", { style: {
                            padding: '8px 12px',
                            fontSize: 14,
                            color: '#666',
                            display: 'flex',
                            alignItems: 'center',
                        }, children: [page, " / ", totalPages] }), _jsx("button", { type: "button", disabled: page >= totalPages, onClick: () => setPage((p) => Math.min(totalPages, p + 1)), style: {
                            padding: '8px 16px',
                            borderRadius: 8,
                            border: '1px solid #e0e0e0',
                            background: '#fff',
                            cursor: page >= totalPages ? 'not-allowed' : 'pointer',
                            opacity: page >= totalPages ? 0.5 : 1,
                            fontSize: 14,
                            color: '#242424',
                        }, children: "\u0412\u043F\u0435\u0440\u0451\u0434" })] }))] }));
}
