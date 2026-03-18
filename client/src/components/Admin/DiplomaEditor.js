import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState } from 'react';
const BRAND = '#fc4c02';
const TEXT = '#242424';
const BORDER = '#e0e0e0';
const DEFAULT_SETTINGS = {
    showBorder: false,
    borderColor: '#fc4c02',
    titleColor: '#fc4c02',
    titleSize: 48,
    subtitleColor: '#666666',
    nameColor: '#242424',
    nameSize: 30,
    distanceColor: '#fc4c02',
    distanceSize: 42,
    textColor: '#666666',
    footerColor: '#fc4c02',
};
const TYPE_LABELS = {
    RACE: 'Виртуальный забег',
    CHALLENGE: 'Виртуальный челлендж',
    ULTRAMARATHON: 'Виртуальный ультрамарафон',
    WEEKLY: 'Еженедельный забег',
    BATTLE: 'Батл',
};
function ColorField({ label, value, onChange }) {
    return (_jsxs("div", { style: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }, children: [_jsx("input", { type: "color", value: value, onChange: e => onChange(e.target.value), style: { width: 36, height: 36, border: `1.5px solid ${BORDER}`, borderRadius: 8, cursor: 'pointer', padding: 2 } }), _jsxs("div", { style: { flex: 1 }, children: [_jsx("div", { style: { fontSize: 13, fontWeight: 700, color: TEXT }, children: label }), _jsx("div", { style: { fontSize: 11, color: '#999', fontFamily: 'monospace' }, children: value })] })] }));
}
function SizeField({ label, value, onChange, min = 20, max = 60 }) {
    return (_jsxs("div", { style: { marginBottom: 12 }, children: [_jsxs("div", { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }, children: [_jsx("span", { style: { fontSize: 13, fontWeight: 700, color: TEXT }, children: label }), _jsxs("span", { style: { fontSize: 13, fontWeight: 700, color: BRAND }, children: [value, "px"] })] }), _jsx("input", { type: "range", min: min, max: max, value: value, onChange: e => onChange(Number(e.target.value)), style: { width: '100%', accentColor: BRAND } })] }));
}
export function DiplomaEditor({ event, onSave }) {
    const [settings, setSettings] = useState(() => ({
        ...DEFAULT_SETTINGS,
        ...(event.diplomaSettings || {}),
    }));
    const [saving, setSaving] = useState(false);
    const set = (key, value) => setSettings(prev => ({ ...prev, [key]: value }));
    const subtitle = TYPE_LABELS[event.type] || 'Виртуальный забег';
    const handleSave = async () => {
        setSaving(true);
        try {
            await onSave(settings);
        }
        finally {
            setSaving(false);
        }
    };
    // Preview dimensions — A4 landscape ratio 297:210
    const previewWidth = 560;
    const previewHeight = Math.round(previewWidth * (210 / 297));
    const bgUrl = event.diplomaBgUrl
        ? (event.diplomaBgUrl.startsWith('/') ? event.diplomaBgUrl : event.diplomaBgUrl)
        : null;
    return (_jsxs("div", { style: { display: 'flex', gap: 24, flexWrap: 'wrap' }, children: [_jsxs("div", { style: { flex: '0 0 280px', minWidth: 260 }, children: [_jsx("h4", { style: { fontSize: 16, fontWeight: 900, color: TEXT, marginBottom: 16, marginTop: 0 }, children: "\u041D\u0430\u0441\u0442\u0440\u043E\u0439\u043A\u0438 \u0446\u0432\u0435\u0442\u043E\u0432" }), _jsx(ColorField, { label: "\u0417\u0430\u0433\u043E\u043B\u043E\u0432\u043E\u043A (\u0414\u0418\u041F\u041B\u041E\u041C)", value: settings.titleColor, onChange: v => set('titleColor', v) }), _jsx(ColorField, { label: "\u041F\u043E\u0434\u0437\u0430\u0433\u043E\u043B\u043E\u0432\u043E\u043A", value: settings.subtitleColor, onChange: v => set('subtitleColor', v) }), _jsx(ColorField, { label: "\u0418\u043C\u044F \u0443\u0447\u0430\u0441\u0442\u043D\u0438\u043A\u0430", value: settings.nameColor, onChange: v => set('nameColor', v) }), _jsx(ColorField, { label: "\u0414\u0438\u0441\u0442\u0430\u043D\u0446\u0438\u044F", value: settings.distanceColor, onChange: v => set('distanceColor', v) }), _jsx(ColorField, { label: "\u0412\u0441\u043F\u043E\u043C\u043E\u0433\u0430\u0442\u0435\u043B\u044C\u043D\u044B\u0439 \u0442\u0435\u043A\u0441\u0442", value: settings.textColor, onChange: v => set('textColor', v) }), _jsx(ColorField, { label: "\u041F\u043E\u0434\u0432\u0430\u043B", value: settings.footerColor, onChange: v => set('footerColor', v) }), _jsx("div", { style: { height: 1, background: BORDER, margin: '16px 0' } }), _jsx("h4", { style: { fontSize: 16, fontWeight: 900, color: TEXT, marginBottom: 16, marginTop: 0 }, children: "\u0420\u0430\u0437\u043C\u0435\u0440\u044B \u0448\u0440\u0438\u0444\u0442\u043E\u0432" }), _jsx(SizeField, { label: "\u0417\u0430\u0433\u043E\u043B\u043E\u0432\u043E\u043A", value: settings.titleSize, onChange: v => set('titleSize', v) }), _jsx(SizeField, { label: "\u0418\u043C\u044F \u0443\u0447\u0430\u0441\u0442\u043D\u0438\u043A\u0430", value: settings.nameSize, onChange: v => set('nameSize', v) }), _jsx(SizeField, { label: "\u0414\u0438\u0441\u0442\u0430\u043D\u0446\u0438\u044F", value: settings.distanceSize, onChange: v => set('distanceSize', v) }), _jsx("div", { style: { height: 1, background: BORDER, margin: '16px 0' } }), _jsx("h4", { style: { fontSize: 16, fontWeight: 900, color: TEXT, marginBottom: 16, marginTop: 0 }, children: "\u0420\u0430\u043C\u043A\u0430" }), _jsxs("label", { style: { display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 14, fontWeight: 700, color: TEXT, marginBottom: 12 }, children: [_jsx("input", { type: "checkbox", checked: settings.showBorder, onChange: e => set('showBorder', e.target.checked), style: { width: 18, height: 18, accentColor: BRAND } }), "\u041F\u043E\u043A\u0430\u0437\u044B\u0432\u0430\u0442\u044C \u0440\u0430\u043C\u043A\u0443"] }), settings.showBorder && (_jsx(ColorField, { label: "\u0426\u0432\u0435\u0442 \u0440\u0430\u043C\u043A\u0438", value: settings.borderColor, onChange: v => set('borderColor', v) })), _jsx("div", { style: { height: 1, background: BORDER, margin: '16px 0' } }), _jsx("button", { onClick: handleSave, disabled: saving, style: {
                            width: '100%',
                            padding: '12px 20px',
                            borderRadius: 10,
                            border: 'none',
                            background: BRAND,
                            color: '#fff',
                            fontSize: 15,
                            fontWeight: 700,
                            cursor: saving ? 'not-allowed' : 'pointer',
                            opacity: saving ? 0.6 : 1,
                            transition: 'all 0.15s',
                        }, children: saving ? 'Сохранение...' : 'Сохранить настройки' }), _jsx("button", { onClick: () => setSettings({ ...DEFAULT_SETTINGS }), style: {
                            width: '100%',
                            marginTop: 8,
                            padding: '10px 20px',
                            borderRadius: 10,
                            border: `1.5px solid ${BORDER}`,
                            background: '#fff',
                            color: TEXT,
                            fontSize: 13,
                            fontWeight: 700,
                            cursor: 'pointer',
                            transition: 'all 0.15s',
                        }, children: "\u0421\u0431\u0440\u043E\u0441\u0438\u0442\u044C \u043F\u043E \u0443\u043C\u043E\u043B\u0447\u0430\u043D\u0438\u044E" })] }), _jsxs("div", { style: { flex: 1, minWidth: 400 }, children: [_jsx("h4", { style: { fontSize: 16, fontWeight: 900, color: TEXT, marginBottom: 16, marginTop: 0 }, children: "\u041F\u0440\u0435\u0434\u043F\u0440\u043E\u0441\u043C\u043E\u0442\u0440 \u0434\u0438\u043F\u043B\u043E\u043C\u0430" }), _jsxs("div", { style: {
                            width: previewWidth,
                            height: previewHeight,
                            position: 'relative',
                            background: bgUrl ? `url(${bgUrl}) center/cover no-repeat` : '#fff',
                            borderRadius: 8,
                            overflow: 'hidden',
                            boxShadow: '0 4px 24px rgba(0,0,0,0.12)',
                            border: `1px solid ${BORDER}`,
                        }, children: [settings.showBorder && (_jsxs(_Fragment, { children: [_jsx("div", { style: {
                                            position: 'absolute',
                                            top: 10,
                                            left: 10,
                                            right: 10,
                                            bottom: 10,
                                            border: `2px solid ${settings.borderColor}`,
                                            borderRadius: 2,
                                            pointerEvents: 'none',
                                        } }), _jsx("div", { style: {
                                            position: 'absolute',
                                            top: 16,
                                            left: 16,
                                            right: 16,
                                            bottom: 16,
                                            border: `1px solid ${settings.borderColor}`,
                                            borderRadius: 2,
                                            pointerEvents: 'none',
                                        } })] })), _jsxs("div", { style: {
                                    position: 'absolute',
                                    top: 0,
                                    left: 0,
                                    right: 0,
                                    bottom: 0,
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    padding: '20px 30px',
                                }, children: [_jsx("div", { style: {
                                            position: 'absolute',
                                            top: 28,
                                            left: 40,
                                            right: 40,
                                            height: 2,
                                            background: settings.footerColor,
                                        } }), _jsx("div", { style: {
                                            fontSize: settings.titleSize * (previewWidth / 842),
                                            fontWeight: 900,
                                            color: settings.titleColor,
                                            letterSpacing: 2,
                                            marginBottom: 4,
                                        }, children: "\u0414\u0418\u041F\u041B\u041E\u041C" }), _jsx("div", { style: {
                                            fontSize: 10,
                                            color: settings.subtitleColor,
                                            marginBottom: 2,
                                        }, children: subtitle }), _jsx("div", { style: {
                                            fontSize: 16,
                                            fontWeight: 700,
                                            color: settings.titleColor,
                                            marginBottom: 6,
                                            textAlign: 'center',
                                        }, children: event.title }), _jsx("div", { style: { width: 120, height: 1, background: '#ddd', marginBottom: 6 } }), _jsx("div", { style: {
                                            fontSize: 9,
                                            color: settings.textColor,
                                            marginBottom: 4,
                                        }, children: "\u041D\u0430\u0441\u0442\u043E\u044F\u0449\u0438\u043C \u043F\u043E\u0434\u0442\u0432\u0435\u0440\u0436\u0434\u0430\u0435\u0442\u0441\u044F, \u0447\u0442\u043E" }), _jsx("div", { style: {
                                            fontSize: settings.nameSize * (previewWidth / 842),
                                            fontWeight: 700,
                                            color: settings.nameColor,
                                            marginBottom: 4,
                                        }, children: "\u0418\u0432\u0430\u043D \u041F\u0435\u0442\u0440\u043E\u0432" }), _jsx("div", { style: {
                                            fontSize: 9,
                                            color: settings.textColor,
                                            marginBottom: 4,
                                        }, children: "\u0443\u0441\u043F\u0435\u0448\u043D\u043E \u0437\u0430\u0432\u0435\u0440\u0448\u0438\u043B(\u0430) \u0434\u0438\u0441\u0442\u0430\u043D\u0446\u0438\u044E" }), _jsx("div", { style: {
                                            fontSize: settings.distanceSize * (previewWidth / 842),
                                            fontWeight: 900,
                                            color: settings.distanceColor,
                                            marginBottom: 6,
                                        }, children: "42.2 \u043A\u043C" }), _jsx("div", { style: {
                                            fontSize: 7,
                                            color: settings.textColor,
                                            marginBottom: 2,
                                        }, children: "\u041F\u0435\u0440\u0438\u043E\u0434 \u0441\u043E\u0431\u044B\u0442\u0438\u044F: 1 \u044F\u043D\u0432\u0430\u0440\u044F 2026 \u2014 31 \u043C\u0430\u0440\u0442\u0430 2026" }), _jsx("div", { style: {
                                            fontSize: 7,
                                            color: settings.textColor,
                                            marginBottom: 8,
                                        }, children: "\u0414\u0430\u0442\u0430 \u0437\u0430\u0432\u0435\u0440\u0448\u0435\u043D\u0438\u044F: 15 \u043C\u0430\u0440\u0442\u0430 2026" }), _jsx("div", { style: {
                                            position: 'absolute',
                                            bottom: 38,
                                            left: 40,
                                            right: 40,
                                            height: 2,
                                            background: settings.footerColor,
                                        } }), _jsx("div", { style: {
                                            position: 'absolute',
                                            bottom: 18,
                                            left: 0,
                                            right: 0,
                                            textAlign: 'center',
                                            fontSize: 9,
                                            fontWeight: 700,
                                            color: settings.footerColor,
                                        }, children: "SportRun \u2014 \u0412\u0438\u0440\u0442\u0443\u0430\u043B\u044C\u043D\u044B\u0435 \u0437\u0430\u0431\u0435\u0433\u0438" })] })] }), _jsx("div", { style: { fontSize: 12, color: '#999', marginTop: 10 }, children: "\u041F\u0440\u0435\u0434\u043F\u0440\u043E\u0441\u043C\u043E\u0442\u0440 \u043F\u0440\u0438\u0431\u043B\u0438\u0437\u0438\u0442\u0435\u043B\u044C\u043D\u044B\u0439. \u0420\u0435\u0430\u043B\u044C\u043D\u044B\u0439 PDF \u043C\u043E\u0436\u0435\u0442 \u043D\u0435\u0437\u043D\u0430\u0447\u0438\u0442\u0435\u043B\u044C\u043D\u043E \u043E\u0442\u043B\u0438\u0447\u0430\u0442\u044C\u0441\u044F." })] })] }));
}
