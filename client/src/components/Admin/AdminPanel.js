import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState, useEffect, useCallback } from 'react';
import { api } from '@/services/api';
import { DiplomaEditor } from './DiplomaEditor';
const SPORT_OPTIONS = [
    { value: 'RUNNING', label: 'Бег' },
    { value: 'CYCLING', label: 'Велоспорт' },
    { value: 'SKIING', label: 'Лыжи' },
    { value: 'WALKING', label: 'Ходьба' },
];
const TYPE_OPTIONS = [
    { value: 'RACE', label: 'Забег' },
    { value: 'CHALLENGE', label: 'Челлендж' },
    { value: 'ULTRAMARATHON', label: 'Ультрамарафон' },
    { value: 'WEEKLY', label: 'Еженедельный' },
];
const STATUS_OPTIONS = [
    { value: 'DRAFT', label: 'Черновик' },
    { value: 'REGISTRATION', label: 'Регистрация' },
    { value: 'ACTIVE', label: 'Активный' },
    { value: 'FINISHED', label: 'Завершён' },
    { value: 'CANCELLED', label: 'Отменён' },
];
const STATUS_COLORS = {
    DRAFT: '#888',
    REGISTRATION: '#2563eb',
    ACTIVE: '#16a34a',
    FINISHED: '#7c3aed',
    CANCELLED: '#dc2626',
};
const BRAND = '#fc4c02';
const TEXT = '#242424';
const BORDER = '#e0e0e0';
function formatDate(d) {
    return new Date(d).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' });
}
function toInputDate(d) {
    if (!d)
        return '';
    const date = new Date(d);
    return date.toISOString().slice(0, 16);
}
// ─── Styles ──────────────────────────────────────────────
const styles = {
    container: { maxWidth: 1200, margin: '0 auto', padding: 24 },
    heading: { fontSize: 28, fontWeight: 900, color: TEXT, marginBottom: 24 },
    tabBar: { display: 'flex', gap: 0, marginBottom: 24, borderBottom: `2px solid ${BORDER}` },
    tab: (active) => ({
        padding: '12px 24px',
        fontSize: 15,
        fontWeight: 700,
        color: active ? BRAND : '#888',
        background: 'none',
        border: 'none',
        borderBottom: active ? `3px solid ${BRAND}` : '3px solid transparent',
        cursor: 'pointer',
        marginBottom: -2,
        transition: 'all 0.15s',
    }),
    card: { background: '#fff', borderRadius: 14, border: `1px solid ${BORDER}`, padding: 24, marginBottom: 16 },
    btn: (variant = 'primary') => ({
        padding: '10px 20px',
        borderRadius: 10,
        border: variant === 'secondary' ? `1.5px solid ${BORDER}` : 'none',
        background: variant === 'primary' ? BRAND : variant === 'danger' ? '#dc2626' : '#fff',
        color: variant === 'secondary' ? TEXT : '#fff',
        fontSize: 14,
        fontWeight: 700,
        cursor: 'pointer',
        transition: 'all 0.15s',
    }),
    smallBtn: (variant = 'primary') => ({
        padding: '6px 14px',
        borderRadius: 8,
        border: variant === 'secondary' ? `1.5px solid ${BORDER}` : 'none',
        background: variant === 'primary' ? BRAND : variant === 'danger' ? '#dc2626' : '#fff',
        color: variant === 'secondary' ? TEXT : '#fff',
        fontSize: 12,
        fontWeight: 700,
        cursor: 'pointer',
        transition: 'all 0.15s',
    }),
    input: { width: '100%', padding: '10px 14px', borderRadius: 8, border: `1.5px solid ${BORDER}`, fontSize: 14, outline: 'none', boxSizing: 'border-box', color: TEXT },
    select: { width: '100%', padding: '10px 14px', borderRadius: 8, border: `1.5px solid ${BORDER}`, fontSize: 14, outline: 'none', boxSizing: 'border-box', color: TEXT, background: '#fff' },
    label: { display: 'block', fontSize: 13, fontWeight: 700, color: TEXT, marginBottom: 6 },
    fieldGroup: { marginBottom: 16 },
    grid2: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 },
    grid3: { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 },
    error: { padding: '10px 14px', background: '#fff0f0', color: '#c00', borderRadius: 8, fontSize: 13, fontWeight: 600, marginBottom: 16 },
    success: { padding: '10px 14px', background: '#f0fff0', color: '#16a34a', borderRadius: 8, fontSize: 13, fontWeight: 600, marginBottom: 16 },
    overlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: 16 },
    modal: { background: '#fff', borderRadius: 20, maxWidth: 720, width: '100%', maxHeight: '90vh', overflow: 'auto', padding: 32 },
    badge: (color) => ({
        display: 'inline-block',
        padding: '3px 10px',
        borderRadius: 6,
        fontSize: 11,
        fontWeight: 700,
        color: '#fff',
        background: color,
    }),
    table: { width: '100%', borderCollapse: 'collapse' },
    th: { textAlign: 'left', padding: '10px 12px', fontSize: 12, fontWeight: 700, color: '#888', borderBottom: `2px solid ${BORDER}` },
    td: { padding: '12px', fontSize: 14, color: TEXT, borderBottom: `1px solid ${BORDER}` },
};
const emptyEventForm = {
    title: '',
    description: '',
    imageUrl: '',
    sport: 'RUNNING',
    type: 'RACE',
    status: 'DRAFT',
    targetDistance: '',
    minDistance: '',
    maxDistance: '',
    startDate: '',
    endDate: '',
    xpReward: '50',
    medalName: '',
    medalIcon: '',
    isPaid: false,
    price: '',
};
function eventToForm(e) {
    return {
        title: e.title || '',
        description: e.description || '',
        imageUrl: e.imageUrl || '',
        sport: e.sport || 'RUNNING',
        type: e.type || 'RACE',
        status: e.status || 'DRAFT',
        targetDistance: e.targetDistance != null ? String(e.targetDistance) : '',
        minDistance: e.minDistance != null ? String(e.minDistance) : '',
        maxDistance: e.maxDistance != null ? String(e.maxDistance) : '',
        startDate: toInputDate(e.startDate),
        endDate: toInputDate(e.endDate),
        xpReward: String(e.xpReward ?? 50),
        medalName: e.medalName || '',
        medalIcon: e.medalIcon || '',
        isPaid: e.isPaid || false,
        price: e.price != null ? String(e.price) : '',
    };
}
function EventFormModal({ initial, onSave, onClose, saving, eventId }) {
    const [form, setForm] = useState(initial);
    const [bgFile, setBgFile] = useState(null);
    const [bgPreview, setBgPreview] = useState('');
    const [bgUploading, setBgUploading] = useState(false);
    const isEdit = initial.title !== '';
    const set = (key, value) => setForm(prev => ({ ...prev, [key]: value }));
    return (_jsx("div", { style: styles.overlay, onClick: (e) => { if (e.target === e.currentTarget)
            onClose(); }, children: _jsxs("div", { style: styles.modal, children: [_jsx("h3", { style: { fontSize: 22, fontWeight: 900, color: TEXT, marginBottom: 24 }, children: isEdit ? 'Редактирование события' : 'Создание события' }), _jsxs("div", { style: styles.fieldGroup, children: [_jsx("label", { style: styles.label, children: "\u041D\u0430\u0437\u0432\u0430\u043D\u0438\u0435 *" }), _jsx("input", { style: styles.input, value: form.title, onChange: e => set('title', e.target.value), placeholder: "\u041D\u0430\u0437\u0432\u0430\u043D\u0438\u0435 \u0441\u043E\u0431\u044B\u0442\u0438\u044F" })] }), _jsxs("div", { style: styles.fieldGroup, children: [_jsx("label", { style: styles.label, children: "\u041E\u043F\u0438\u0441\u0430\u043D\u0438\u0435" }), _jsx("textarea", { style: { ...styles.input, minHeight: 80, resize: 'vertical' }, value: form.description, onChange: e => set('description', e.target.value), placeholder: "\u041E\u043F\u0438\u0441\u0430\u043D\u0438\u0435 \u0441\u043E\u0431\u044B\u0442\u0438\u044F" })] }), _jsxs("div", { style: styles.grid2, children: [_jsxs("div", { style: styles.fieldGroup, children: [_jsx("label", { style: styles.label, children: "\u0412\u0438\u0434 \u0441\u043F\u043E\u0440\u0442\u0430 *" }), _jsx("select", { style: styles.select, value: form.sport, onChange: e => set('sport', e.target.value), children: SPORT_OPTIONS.map(o => _jsx("option", { value: o.value, children: o.label }, o.value)) })] }), _jsxs("div", { style: styles.fieldGroup, children: [_jsx("label", { style: styles.label, children: "\u0422\u0438\u043F *" }), _jsx("select", { style: styles.select, value: form.type, onChange: e => set('type', e.target.value), children: TYPE_OPTIONS.map(o => _jsx("option", { value: o.value, children: o.label }, o.value)) })] })] }), _jsxs("div", { style: styles.fieldGroup, children: [_jsx("label", { style: styles.label, children: "\u0421\u0442\u0430\u0442\u0443\u0441" }), _jsx("select", { style: styles.select, value: form.status, onChange: e => set('status', e.target.value), children: STATUS_OPTIONS.map(o => _jsx("option", { value: o.value, children: o.label }, o.value)) })] }), _jsxs("div", { style: styles.grid3, children: [_jsxs("div", { style: styles.fieldGroup, children: [_jsx("label", { style: styles.label, children: "\u0426\u0435\u043B\u0435\u0432\u0430\u044F \u0434\u0438\u0441\u0442\u0430\u043D\u0446\u0438\u044F (\u043A\u043C)" }), _jsx("input", { style: styles.input, type: "number", step: "0.1", value: form.targetDistance, onChange: e => set('targetDistance', e.target.value) })] }), _jsxs("div", { style: styles.fieldGroup, children: [_jsx("label", { style: styles.label, children: "\u041C\u0438\u043D. \u0434\u0438\u0441\u0442\u0430\u043D\u0446\u0438\u044F (\u043A\u043C)" }), _jsx("input", { style: styles.input, type: "number", step: "0.1", value: form.minDistance, onChange: e => set('minDistance', e.target.value) })] }), _jsxs("div", { style: styles.fieldGroup, children: [_jsx("label", { style: styles.label, children: "\u041C\u0430\u043A\u0441. \u0434\u0438\u0441\u0442\u0430\u043D\u0446\u0438\u044F (\u043A\u043C)" }), _jsx("input", { style: styles.input, type: "number", step: "0.1", value: form.maxDistance, onChange: e => set('maxDistance', e.target.value) })] })] }), _jsxs("div", { style: styles.grid2, children: [_jsxs("div", { style: styles.fieldGroup, children: [_jsx("label", { style: styles.label, children: "\u0414\u0430\u0442\u0430 \u043D\u0430\u0447\u0430\u043B\u0430 *" }), _jsx("input", { style: styles.input, type: "datetime-local", value: form.startDate, onChange: e => set('startDate', e.target.value) })] }), _jsxs("div", { style: styles.fieldGroup, children: [_jsx("label", { style: styles.label, children: "\u0414\u0430\u0442\u0430 \u043E\u043A\u043E\u043D\u0447\u0430\u043D\u0438\u044F *" }), _jsx("input", { style: styles.input, type: "datetime-local", value: form.endDate, onChange: e => set('endDate', e.target.value) })] })] }), _jsxs("div", { style: styles.grid3, children: [_jsxs("div", { style: styles.fieldGroup, children: [_jsx("label", { style: styles.label, children: "XP \u043D\u0430\u0433\u0440\u0430\u0434\u0430" }), _jsx("input", { style: styles.input, type: "number", value: form.xpReward, onChange: e => set('xpReward', e.target.value) })] }), _jsxs("div", { style: styles.fieldGroup, children: [_jsx("label", { style: styles.label, children: "\u041D\u0430\u0437\u0432\u0430\u043D\u0438\u0435 \u043C\u0435\u0434\u0430\u043B\u0438" }), _jsx("input", { style: styles.input, value: form.medalName, onChange: e => set('medalName', e.target.value), placeholder: "\u0424\u0438\u043D\u0438\u0448\u0451\u0440" })] }), _jsxs("div", { style: styles.fieldGroup, children: [_jsx("label", { style: styles.label, children: "\u0418\u043A\u043E\u043D\u043A\u0430 \u043C\u0435\u0434\u0430\u043B\u0438" }), _jsx("input", { style: styles.input, value: form.medalIcon, onChange: e => set('medalIcon', e.target.value), placeholder: "\uD83C\uDFC5" })] })] }), _jsxs("div", { style: styles.fieldGroup, children: [_jsx("label", { style: styles.label, children: "\u041A\u0430\u0440\u0442\u0438\u043D\u043A\u0430 \u0441\u043E\u0431\u044B\u0442\u0438\u044F (URL)" }), _jsx("input", { style: styles.input, value: form.imageUrl, onChange: e => set('imageUrl', e.target.value), placeholder: "https://..." })] }), _jsxs("div", { style: styles.fieldGroup, children: [_jsx("label", { style: styles.label, children: "\u0424\u043E\u043D \u0434\u0438\u043F\u043B\u043E\u043C\u0430 (\u0438\u0437\u043E\u0431\u0440\u0430\u0436\u0435\u043D\u0438\u0435 A4 landscape)" }), _jsxs("div", { style: { display: 'flex', alignItems: 'center', gap: 12 }, children: [_jsxs("label", { style: {
                                        padding: '8px 20px', borderRadius: 8, border: `2px dashed ${BRAND}`,
                                        background: '#fff8f5', color: BRAND, fontSize: 13, fontWeight: 700,
                                        cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6,
                                    }, children: ["\uD83D\uDDBC\uFE0F ", bgFile ? bgFile.name : 'Выбрать файл', _jsx("input", { type: "file", accept: "image/*", style: { display: 'none' }, onChange: e => {
                                                const f = e.target.files?.[0];
                                                if (f) {
                                                    setBgFile(f);
                                                    setBgPreview(URL.createObjectURL(f));
                                                }
                                            } })] }), eventId && bgFile && !bgUploading && (_jsx("button", { type: "button", onClick: async () => {
                                        setBgUploading(true);
                                        try {
                                            await api.events.uploadDiplomaBg(eventId, bgFile);
                                            setBgFile(null);
                                            setBgPreview('');
                                            alert('Фон диплома загружен!');
                                        }
                                        catch {
                                            alert('Ошибка загрузки');
                                        }
                                        finally {
                                            setBgUploading(false);
                                        }
                                    }, style: {
                                        padding: '8px 16px', borderRadius: 8, border: 'none',
                                        background: BRAND, color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer',
                                    }, children: bgUploading ? 'Загрузка...' : 'Загрузить' })), !eventId && bgFile && (_jsx("span", { style: { fontSize: 12, color: '#999' }, children: "\u0421\u043E\u0445\u0440\u0430\u043D\u0438\u0442\u0435 \u0441\u043E\u0431\u044B\u0442\u0438\u0435, \u0437\u0430\u0442\u0435\u043C \u0437\u0430\u0433\u0440\u0443\u0437\u0438\u0442\u0435 \u0444\u043E\u043D" }))] }), bgPreview && (_jsx("img", { src: bgPreview, alt: "preview", style: { marginTop: 8, maxWidth: 300, borderRadius: 8, border: '1px solid #e0e0e0' } }))] }), _jsxs("div", { style: { display: 'flex', alignItems: 'center', gap: 16, marginBottom: 16 }, children: [_jsxs("label", { style: { display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 14, fontWeight: 700, color: TEXT }, children: [_jsx("input", { type: "checkbox", checked: form.isPaid, onChange: e => set('isPaid', e.target.checked), style: { width: 18, height: 18, accentColor: BRAND } }), "\u041F\u043B\u0430\u0442\u043D\u043E\u0435 \u0443\u0447\u0430\u0441\u0442\u0438\u0435"] }), form.isPaid && (_jsx("div", { style: { flex: 1, maxWidth: 200 }, children: _jsx("input", { style: styles.input, type: "number", value: form.price, onChange: e => set('price', e.target.value), placeholder: "\u0426\u0435\u043D\u0430, \u0440\u0443\u0431." }) }))] }), _jsxs("div", { style: { display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 24 }, children: [_jsx("button", { style: styles.btn('secondary'), onClick: onClose, children: "\u041E\u0442\u043C\u0435\u043D\u0430" }), _jsx("button", { style: { ...styles.btn('primary'), opacity: saving ? 0.6 : 1 }, disabled: saving, onClick: () => onSave(form), children: saving ? 'Сохранение...' : isEdit ? 'Сохранить' : 'Создать' })] })] }) }));
}
const emptyPackageForm = {
    name: '',
    price: '0',
    icon: '🎫',
    features: '',
    description: '',
    isActive: true,
    sortOrder: '0',
};
function pkgToForm(p) {
    return {
        name: p.name,
        price: String(p.price),
        icon: p.icon,
        features: p.features.join('\n'),
        description: p.description || '',
        isActive: p.isActive,
        sortOrder: String(p.sortOrder),
    };
}
function PackageFormModal({ initial, onSave, onClose, saving, packageId }) {
    const [form, setForm] = useState(initial);
    const [imgFile, setImgFile] = useState(null);
    const [imgPreview, setImgPreview] = useState('');
    const [imgUploading, setImgUploading] = useState(false);
    const isEdit = initial.name !== '';
    const set = (key, value) => setForm(prev => ({ ...prev, [key]: value }));
    return (_jsx("div", { style: styles.overlay, onClick: (e) => { if (e.target === e.currentTarget)
            onClose(); }, children: _jsxs("div", { style: { ...styles.modal, maxWidth: 520 }, children: [_jsx("h3", { style: { fontSize: 22, fontWeight: 900, color: TEXT, marginBottom: 24 }, children: isEdit ? 'Редактирование пакета' : 'Создание пакета' }), _jsxs("div", { style: styles.fieldGroup, children: [_jsx("label", { style: styles.label, children: "\u041D\u0430\u0437\u0432\u0430\u043D\u0438\u0435 *" }), _jsx("input", { style: styles.input, value: form.name, onChange: e => set('name', e.target.value), placeholder: "\u041D\u0430\u0437\u0432\u0430\u043D\u0438\u0435 \u043F\u0430\u043A\u0435\u0442\u0430" })] }), _jsxs("div", { style: styles.fieldGroup, children: [_jsx("label", { style: styles.label, children: "\u041E\u043F\u0438\u0441\u0430\u043D\u0438\u0435" }), _jsx("textarea", { style: { ...styles.input, minHeight: 60, resize: 'vertical' }, value: form.description, onChange: e => set('description', e.target.value), placeholder: "\u041A\u0440\u0430\u0442\u043A\u043E\u0435 \u043E\u043F\u0438\u0441\u0430\u043D\u0438\u0435 \u043F\u0430\u043A\u0435\u0442\u0430" })] }), _jsxs("div", { style: styles.grid2, children: [_jsxs("div", { style: styles.fieldGroup, children: [_jsx("label", { style: styles.label, children: "\u0426\u0435\u043D\u0430 (\u0440\u0443\u0431.)" }), _jsx("input", { style: styles.input, type: "number", value: form.price, onChange: e => set('price', e.target.value) })] }), _jsxs("div", { style: styles.fieldGroup, children: [_jsx("label", { style: styles.label, children: "\u0418\u043A\u043E\u043D\u043A\u0430 (emoji)" }), _jsx("input", { style: styles.input, value: form.icon, onChange: e => set('icon', e.target.value), placeholder: "\uD83C\uDFAB" })] })] }), _jsxs("div", { style: styles.fieldGroup, children: [_jsx("label", { style: styles.label, children: "\u0418\u0437\u043E\u0431\u0440\u0430\u0436\u0435\u043D\u0438\u0435 \u043F\u0430\u043A\u0435\u0442\u0430" }), _jsxs("div", { style: { display: 'flex', alignItems: 'center', gap: 12 }, children: [_jsxs("label", { style: {
                                        padding: '8px 20px', borderRadius: 8, border: `2px dashed ${BRAND}`,
                                        background: '#fff8f5', color: BRAND, fontSize: 13, fontWeight: 700,
                                        cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6,
                                    }, children: ["\uD83D\uDDBC\uFE0F ", imgFile ? imgFile.name : 'Выбрать файл', _jsx("input", { type: "file", accept: "image/*", style: { display: 'none' }, onChange: e => {
                                                const f = e.target.files?.[0];
                                                if (f) {
                                                    setImgFile(f);
                                                    setImgPreview(URL.createObjectURL(f));
                                                }
                                            } })] }), packageId && imgFile && !imgUploading && (_jsx("button", { type: "button", onClick: async () => {
                                        setImgUploading(true);
                                        try {
                                            await api.packages.uploadImage(packageId, imgFile);
                                            setImgFile(null);
                                            setImgPreview('');
                                            alert('Изображение загружено!');
                                        }
                                        catch {
                                            alert('Ошибка загрузки');
                                        }
                                        finally {
                                            setImgUploading(false);
                                        }
                                    }, style: {
                                        padding: '8px 16px', borderRadius: 8, border: 'none',
                                        background: BRAND, color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer',
                                    }, children: imgUploading ? 'Загрузка...' : 'Загрузить' })), !packageId && imgFile && (_jsx("span", { style: { fontSize: 12, color: '#999' }, children: "\u0421\u043E\u0445\u0440\u0430\u043D\u0438\u0442\u0435 \u043F\u0430\u043A\u0435\u0442, \u0437\u0430\u0442\u0435\u043C \u0437\u0430\u0433\u0440\u0443\u0437\u0438\u0442\u0435 \u0438\u0437\u043E\u0431\u0440\u0430\u0436\u0435\u043D\u0438\u0435" }))] }), imgPreview && (_jsx("img", { src: imgPreview, alt: "preview", style: { marginTop: 8, maxWidth: 200, maxHeight: 120, borderRadius: 8, border: '1px solid #e0e0e0', objectFit: 'cover' } }))] }), _jsxs("div", { style: styles.fieldGroup, children: [_jsx("label", { style: styles.label, children: "\u0424\u0438\u0447\u0438 (\u043F\u043E \u043E\u0434\u043D\u043E\u0439 \u043D\u0430 \u0441\u0442\u0440\u043E\u043A\u0443)" }), _jsx("textarea", { style: { ...styles.input, minHeight: 120, resize: 'vertical' }, value: form.features, onChange: e => set('features', e.target.value), placeholder: 'Участие в событии\nЭлектронный диплом\nПопадание в рейтинг' })] }), _jsxs("div", { style: styles.grid2, children: [_jsxs("div", { style: styles.fieldGroup, children: [_jsx("label", { style: styles.label, children: "\u041F\u043E\u0440\u044F\u0434\u043E\u043A \u0441\u043E\u0440\u0442\u0438\u0440\u043E\u0432\u043A\u0438" }), _jsx("input", { style: styles.input, type: "number", value: form.sortOrder, onChange: e => set('sortOrder', e.target.value) })] }), _jsx("div", { style: { ...styles.fieldGroup, display: 'flex', alignItems: 'flex-end' }, children: _jsxs("label", { style: { display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 14, fontWeight: 700, color: TEXT, paddingBottom: 10 }, children: [_jsx("input", { type: "checkbox", checked: form.isActive, onChange: e => set('isActive', e.target.checked), style: { width: 18, height: 18, accentColor: BRAND } }), "\u0410\u043A\u0442\u0438\u0432\u0435\u043D"] }) })] }), _jsxs("div", { style: { display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 24 }, children: [_jsx("button", { style: styles.btn('secondary'), onClick: onClose, children: "\u041E\u0442\u043C\u0435\u043D\u0430" }), _jsx("button", { style: { ...styles.btn('primary'), opacity: saving ? 0.6 : 1 }, disabled: saving, onClick: () => onSave(form), children: saving ? 'Сохранение...' : isEdit ? 'Сохранить' : 'Создать' })] })] }) }));
}
// ─── Confirm Dialog ──────────────────────────────────────
function ConfirmDialog({ message, onConfirm, onCancel }) {
    return (_jsx("div", { style: styles.overlay, onClick: (e) => { if (e.target === e.currentTarget)
            onCancel(); }, children: _jsxs("div", { style: { ...styles.modal, maxWidth: 400, textAlign: 'center' }, children: [_jsx("p", { style: { fontSize: 16, fontWeight: 600, color: TEXT, marginBottom: 24 }, children: message }), _jsxs("div", { style: { display: 'flex', gap: 12, justifyContent: 'center' }, children: [_jsx("button", { style: styles.btn('secondary'), onClick: onCancel, children: "\u041E\u0442\u043C\u0435\u043D\u0430" }), _jsx("button", { style: styles.btn('danger'), onClick: onConfirm, children: "\u0423\u0434\u0430\u043B\u0438\u0442\u044C" })] })] }) }));
}
// ─── Main Admin Panel ────────────────────────────────────
export default function AdminPanel() {
    const [tab, setTab] = useState('events');
    const [events, setEvents] = useState([]);
    const [packages, setPackages] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    // Event form
    const [showEventForm, setShowEventForm] = useState(false);
    const [editingEvent, setEditingEvent] = useState(null);
    const [savingEvent, setSavingEvent] = useState(false);
    // Package form
    const [showPkgForm, setShowPkgForm] = useState(false);
    const [editingPkg, setEditingPkg] = useState(null);
    const [savingPkg, setSavingPkg] = useState(false);
    // Confirm delete
    const [confirmDelete, setConfirmDelete] = useState(null);
    // Diploma editor
    const [diplomaEvent, setDiplomaEvent] = useState(null);
    const flash = (msg) => {
        setSuccess(msg);
        setTimeout(() => setSuccess(''), 3000);
    };
    // ─── Load events ────────────────────────────────────────
    const loadEvents = useCallback(async () => {
        setLoading(true);
        setError('');
        try {
            const res = await api.events.list({ limit: 100 });
            setEvents(res.items);
        }
        catch (err) {
            setError(err.message || 'Ошибка загрузки событий');
        }
        finally {
            setLoading(false);
        }
    }, []);
    // ─── Load packages ──────────────────────────────────────
    const loadPackages = useCallback(async () => {
        setLoading(true);
        setError('');
        try {
            const res = await api.packages.adminList();
            setPackages(res);
        }
        catch (err) {
            setError(err.message || 'Ошибка загрузки пакетов');
        }
        finally {
            setLoading(false);
        }
    }, []);
    useEffect(() => {
        if (tab === 'events')
            loadEvents();
        else
            loadPackages();
    }, [tab, loadEvents, loadPackages]);
    // ─── Event handlers ─────────────────────────────────────
    const handleSaveEvent = async (form) => {
        if (!form.title || !form.sport || !form.type || !form.startDate || !form.endDate) {
            setError('Заполните обязательные поля: Название, Вид спорта, Тип, Даты');
            return;
        }
        setSavingEvent(true);
        setError('');
        try {
            const data = {
                title: form.title,
                description: form.description || null,
                imageUrl: form.imageUrl || null,
                sport: form.sport,
                type: form.type,
                status: form.status,
                targetDistance: form.targetDistance || null,
                minDistance: form.minDistance || null,
                maxDistance: form.maxDistance || null,
                startDate: new Date(form.startDate).toISOString(),
                endDate: new Date(form.endDate).toISOString(),
                xpReward: form.xpReward ? parseInt(form.xpReward, 10) : 50,
                medalName: form.medalName || null,
                medalIcon: form.medalIcon || null,
                isPaid: form.isPaid,
                price: form.isPaid && form.price ? form.price : null,
            };
            if (editingEvent) {
                await api.events.update(editingEvent.id, data);
                flash('Событие обновлено');
            }
            else {
                await api.events.create(data);
                flash('Событие создано');
            }
            setShowEventForm(false);
            setEditingEvent(null);
            loadEvents();
        }
        catch (err) {
            setError(err.message || 'Ошибка сохранения');
        }
        finally {
            setSavingEvent(false);
        }
    };
    const handleQuickStatus = async (eventId, status) => {
        setError('');
        try {
            await api.events.update(eventId, { status });
            flash('Статус обновлён');
            loadEvents();
        }
        catch (err) {
            setError(err.message || 'Ошибка обновления статуса');
        }
    };
    const handleDeleteEvent = async (id) => {
        setError('');
        try {
            await api.events.delete(id);
            flash('Событие удалено');
            setConfirmDelete(null);
            loadEvents();
        }
        catch (err) {
            setError(err.message || 'Ошибка удаления');
            setConfirmDelete(null);
        }
    };
    // ─── Package handlers ───────────────────────────────────
    const handleSavePkg = async (form) => {
        if (!form.name) {
            setError('Укажите название пакета');
            return;
        }
        setSavingPkg(true);
        setError('');
        try {
            const features = form.features
                .split('\n')
                .map(s => s.trim())
                .filter(Boolean);
            const data = {
                name: form.name,
                price: parseFloat(form.price) || 0,
                icon: form.icon || '🎫',
                features,
                description: form.description || undefined,
                isActive: form.isActive,
                sortOrder: parseInt(form.sortOrder, 10) || 0,
            };
            if (editingPkg) {
                await api.packages.update(editingPkg.id, data);
                flash('Пакет обновлён');
            }
            else {
                await api.packages.create(data);
                flash('Пакет создан');
            }
            setShowPkgForm(false);
            setEditingPkg(null);
            loadPackages();
        }
        catch (err) {
            setError(err.message || 'Ошибка сохранения');
        }
        finally {
            setSavingPkg(false);
        }
    };
    const handleDeletePkg = async (id) => {
        setError('');
        try {
            await api.packages.delete(id);
            flash('Пакет удалён');
            setConfirmDelete(null);
            loadPackages();
        }
        catch (err) {
            setError(err.message || 'Ошибка удаления');
            setConfirmDelete(null);
        }
    };
    // ─── Render ─────────────────────────────────────────────
    return (_jsxs("div", { style: styles.container, children: [_jsx("h1", { style: styles.heading, children: "\u041F\u0430\u043D\u0435\u043B\u044C \u0430\u0434\u043C\u0438\u043D\u0438\u0441\u0442\u0440\u0430\u0442\u043E\u0440\u0430" }), _jsxs("div", { style: styles.tabBar, children: [_jsx("button", { style: styles.tab(tab === 'events'), onClick: () => setTab('events'), children: "\u0423\u043F\u0440\u0430\u0432\u043B\u0435\u043D\u0438\u0435 \u0441\u043E\u0431\u044B\u0442\u0438\u044F\u043C\u0438" }), _jsx("button", { style: styles.tab(tab === 'packages'), onClick: () => setTab('packages'), children: "\u041F\u0430\u043A\u0435\u0442\u044B \u0443\u0447\u0430\u0441\u0442\u0438\u044F" })] }), error && _jsx("div", { style: styles.error, children: error }), success && _jsx("div", { style: styles.success, children: success }), loading && (_jsx("div", { style: { textAlign: 'center', padding: 40, color: '#888', fontSize: 15 }, children: "\u0417\u0430\u0433\u0440\u0443\u0437\u043A\u0430..." })), tab === 'events' && !loading && (_jsxs(_Fragment, { children: [_jsxs("div", { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }, children: [_jsxs("span", { style: { fontSize: 14, color: '#888' }, children: ["\u0412\u0441\u0435\u0433\u043E \u0441\u043E\u0431\u044B\u0442\u0438\u0439: ", events.length] }), _jsx("button", { style: styles.btn('primary'), onClick: () => { setEditingEvent(null); setShowEventForm(true); }, children: "+ \u0421\u043E\u0437\u0434\u0430\u0442\u044C \u0441\u043E\u0431\u044B\u0442\u0438\u0435" })] }), _jsx("div", { style: { overflowX: 'auto' }, children: _jsxs("table", { style: styles.table, children: [_jsx("thead", { children: _jsxs("tr", { children: [_jsx("th", { style: styles.th, children: "\u041D\u0430\u0437\u0432\u0430\u043D\u0438\u0435" }), _jsx("th", { style: styles.th, children: "\u0421\u043F\u043E\u0440\u0442" }), _jsx("th", { style: styles.th, children: "\u0422\u0438\u043F" }), _jsx("th", { style: styles.th, children: "\u0421\u0442\u0430\u0442\u0443\u0441" }), _jsx("th", { style: styles.th, children: "\u0414\u0430\u0442\u044B" }), _jsx("th", { style: styles.th, children: "\u0423\u0447\u0430\u0441\u0442\u043D\u0438\u043A\u0438" }), _jsx("th", { style: styles.th, children: "\u0414\u0435\u0439\u0441\u0442\u0432\u0438\u044F" })] }) }), _jsxs("tbody", { children: [events.map(ev => (_jsxs("tr", { children: [_jsx("td", { style: { ...styles.td, fontWeight: 700, maxWidth: 200 }, children: ev.title }), _jsx("td", { style: styles.td, children: SPORT_OPTIONS.find(s => s.value === ev.sport)?.label || ev.sport }), _jsx("td", { style: styles.td, children: TYPE_OPTIONS.find(t => t.value === ev.type)?.label || ev.type }), _jsx("td", { style: styles.td, children: _jsx("span", { style: styles.badge(STATUS_COLORS[ev.status] || '#888'), children: STATUS_OPTIONS.find(s => s.value === ev.status)?.label || ev.status }) }), _jsxs("td", { style: { ...styles.td, fontSize: 12, whiteSpace: 'nowrap' }, children: [formatDate(ev.startDate), " \u2014 ", formatDate(ev.endDate)] }), _jsx("td", { style: { ...styles.td, textAlign: 'center' }, children: ev.participantCount ?? '—' }), _jsx("td", { style: { ...styles.td, whiteSpace: 'nowrap' }, children: _jsxs("div", { style: { display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }, children: [_jsx("button", { style: styles.smallBtn('secondary'), onClick: () => { setEditingEvent(ev); setShowEventForm(true); }, children: "\u0418\u0437\u043C." }), _jsx("button", { style: styles.smallBtn('danger'), onClick: () => setConfirmDelete({ type: 'event', id: ev.id, name: ev.title }), children: "\u0423\u0434\u0430\u043B." }), _jsx("button", { style: { ...styles.smallBtn('secondary'), fontSize: 11 }, onClick: () => setDiplomaEvent(ev), children: "\u0414\u0438\u043F\u043B\u043E\u043C" }), ev.status === 'DRAFT' && (_jsx("button", { style: { ...styles.smallBtn('primary'), background: '#2563eb', fontSize: 11 }, onClick: () => handleQuickStatus(ev.id, 'REGISTRATION'), children: "\u041E\u0442\u043A\u0440\u044B\u0442\u044C \u0440\u0435\u0433." })), ev.status === 'REGISTRATION' && (_jsx("button", { style: { ...styles.smallBtn('primary'), background: '#16a34a', fontSize: 11 }, onClick: () => handleQuickStatus(ev.id, 'ACTIVE'), children: "\u0421\u0442\u0430\u0440\u0442" })), ev.status === 'ACTIVE' && (_jsx("button", { style: { ...styles.smallBtn('primary'), background: '#7c3aed', fontSize: 11 }, onClick: () => handleQuickStatus(ev.id, 'FINISHED'), children: "\u0417\u0430\u0432\u0435\u0440\u0448\u0438\u0442\u044C" }))] }) })] }, ev.id))), events.length === 0 && (_jsx("tr", { children: _jsx("td", { colSpan: 7, style: { ...styles.td, textAlign: 'center', color: '#888', padding: 40 }, children: "\u041D\u0435\u0442 \u0441\u043E\u0431\u044B\u0442\u0438\u0439" }) }))] })] }) })] })), tab === 'packages' && !loading && (_jsxs(_Fragment, { children: [_jsxs("div", { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }, children: [_jsxs("span", { style: { fontSize: 14, color: '#888' }, children: ["\u0412\u0441\u0435\u0433\u043E \u043F\u0430\u043A\u0435\u0442\u043E\u0432: ", packages.length] }), _jsx("button", { style: styles.btn('primary'), onClick: () => { setEditingPkg(null); setShowPkgForm(true); }, children: "+ \u0414\u043E\u0431\u0430\u0432\u0438\u0442\u044C \u043F\u0430\u043A\u0435\u0442" })] }), _jsxs("div", { style: { display: 'grid', gap: 16 }, children: [packages.map(pkg => (_jsxs("div", { style: { ...styles.card, display: 'flex', gap: 20, alignItems: 'flex-start', opacity: pkg.isActive ? 1 : 0.5 }, children: [pkg.imageUrl ? (_jsx("img", { src: pkg.imageUrl, alt: pkg.name, style: { width: 80, height: 80, borderRadius: 12, objectFit: 'cover', flexShrink: 0 } })) : (_jsx("div", { style: { fontSize: 40, flexShrink: 0 }, children: pkg.icon })), _jsxs("div", { style: { flex: 1, minWidth: 0 }, children: [_jsxs("div", { style: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }, children: [_jsx("span", { style: { fontSize: 17, fontWeight: 800, color: TEXT }, children: pkg.name }), !pkg.isActive && (_jsx("span", { style: { ...styles.badge('#888'), fontSize: 10 }, children: "\u041D\u0435\u0430\u043A\u0442\u0438\u0432\u0435\u043D" }))] }), pkg.description && (_jsx("p", { style: { fontSize: 13, color: '#888', margin: '0 0 6px 0', lineHeight: 1.4 }, children: pkg.description })), _jsx("div", { style: { fontSize: 20, fontWeight: 900, color: pkg.price === 0 ? '#16a34a' : BRAND, marginBottom: 8 }, children: pkg.price === 0 ? 'Бесплатно' : `${pkg.price.toLocaleString('ru-RU')} \u20BD` }), _jsx("div", { style: { display: 'flex', flexWrap: 'wrap', gap: 6 }, children: pkg.features.map((f, i) => (_jsx("span", { style: { padding: '3px 10px', background: '#f0f0f0', borderRadius: 6, fontSize: 12, color: '#555' }, children: f }, i))) }), _jsxs("div", { style: { fontSize: 11, color: '#aaa', marginTop: 8 }, children: ["\u041F\u043E\u0440\u044F\u0434\u043E\u043A: ", pkg.sortOrder] })] }), _jsxs("div", { style: { display: 'flex', gap: 8, flexShrink: 0 }, children: [_jsx("button", { style: styles.smallBtn('secondary'), onClick: () => { setEditingPkg(pkg); setShowPkgForm(true); }, children: "\u0418\u0437\u043C." }), _jsx("button", { style: styles.smallBtn('danger'), onClick: () => setConfirmDelete({ type: 'package', id: pkg.id, name: pkg.name }), children: "\u0423\u0434\u0430\u043B." })] })] }, pkg.id))), packages.length === 0 && (_jsx("div", { style: { textAlign: 'center', padding: 40, color: '#888', fontSize: 15 }, children: "\u041D\u0435\u0442 \u043F\u0430\u043A\u0435\u0442\u043E\u0432" }))] })] })), showEventForm && (_jsx(EventFormModal, { initial: editingEvent ? eventToForm(editingEvent) : emptyEventForm, onSave: handleSaveEvent, onClose: () => { setShowEventForm(false); setEditingEvent(null); }, saving: savingEvent, eventId: editingEvent?.id })), showPkgForm && (_jsx(PackageFormModal, { initial: editingPkg ? pkgToForm(editingPkg) : emptyPackageForm, onSave: handleSavePkg, onClose: () => { setShowPkgForm(false); setEditingPkg(null); }, saving: savingPkg, packageId: editingPkg?.id })), confirmDelete && (_jsx(ConfirmDialog, { message: `Удалить "${confirmDelete.name}"? Это действие необратимо.`, onConfirm: () => {
                    if (confirmDelete.type === 'event')
                        handleDeleteEvent(confirmDelete.id);
                    else
                        handleDeletePkg(confirmDelete.id);
                }, onCancel: () => setConfirmDelete(null) })), diplomaEvent && (_jsx("div", { style: styles.overlay, onClick: (e) => { if (e.target === e.currentTarget)
                    setDiplomaEvent(null); }, children: _jsxs("div", { style: { ...styles.modal, maxWidth: 960 }, children: [_jsxs("div", { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }, children: [_jsxs("h3", { style: { fontSize: 22, fontWeight: 900, color: TEXT, margin: 0 }, children: ["\u041D\u0430\u0441\u0442\u0440\u043E\u0439\u043A\u0430 \u0434\u0438\u043F\u043B\u043E\u043C\u0430: ", diplomaEvent.title] }), _jsx("button", { onClick: () => setDiplomaEvent(null), style: { background: 'none', border: 'none', fontSize: 24, color: '#888', cursor: 'pointer', padding: '4px 8px' }, children: "x" })] }), _jsx(DiplomaEditor, { event: diplomaEvent, onSave: async (settings) => {
                                try {
                                    await api.events.update(diplomaEvent.id, { diplomaSettings: settings });
                                    flash('Настройки диплома сохранены');
                                    setDiplomaEvent(null);
                                    loadEvents();
                                }
                                catch (err) {
                                    setError(err.message || 'Ошибка сохранения настроек диплома');
                                }
                            } })] }) }))] }));
}
