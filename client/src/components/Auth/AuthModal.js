import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
export function AuthModal({ isOpen, onClose, initialTab = 'login' }) {
    const { login, register } = useAuth();
    const [tab, setTab] = useState(initialTab);
    const [error, setError] = useState('');
    const [busy, setBusy] = useState(false);
    const [lv, setLv] = useState('');
    const [lp, setLp] = useState('');
    const [ru, setRu] = useState('');
    const [re, setRe] = useState('');
    const [rp, setRp] = useState('');
    const [rr, setRr] = useState('');
    const [rc, setRc] = useState(''); // city
    const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
    useEffect(() => {
        const handler = () => setIsMobile(window.innerWidth < 768);
        window.addEventListener('resize', handler);
        return () => window.removeEventListener('resize', handler);
    }, []);
    useEffect(() => {
        setTab(initialTab);
    }, [initialTab]);
    const reset = () => { setLv(''); setLp(''); setRu(''); setRe(''); setRp(''); setRr(''); setRc(''); setError(''); };
    const doLogin = async (e) => {
        e.preventDefault();
        setError('');
        setBusy(true);
        try {
            await login(lv, lp);
            reset();
            onClose();
        }
        catch (err) {
            setError(err instanceof Error ? err.message : 'Ошибка');
        }
        finally {
            setBusy(false);
        }
    };
    const doRegister = async (e) => {
        e.preventDefault();
        setError('');
        setBusy(true);
        try {
            await register(ru, re, rp, rr || undefined);
            reset();
            onClose();
        }
        catch (err) {
            setError(err instanceof Error ? err.message : 'Ошибка');
        }
        finally {
            setBusy(false);
        }
    };
    if (!isOpen)
        return null;
    const inputStyle = {
        width: '100%',
        height: 48,
        padding: '0 16px',
        borderRadius: 12,
        border: '1.5px solid #e0e0e0',
        fontSize: 15,
        color: '#242424',
        background: '#fff',
        outline: 'none',
        transition: 'border-color 0.2s, box-shadow 0.2s',
        boxSizing: 'border-box',
    };
    const inputFocusHandler = (e) => {
        e.target.style.borderColor = '#fc4c02';
        e.target.style.boxShadow = '0 0 0 3px rgba(252,76,2,0.15)';
    };
    const inputBlurHandler = (e) => {
        e.target.style.borderColor = '#e0e0e0';
        e.target.style.boxShadow = 'none';
    };
    const labelStyle = {
        display: 'block',
        fontSize: 13,
        fontWeight: 600,
        color: '#555',
        marginBottom: 6,
    };
    const btnStyle = {
        width: '100%',
        height: 48,
        borderRadius: 12,
        border: 'none',
        background: 'linear-gradient(135deg, #fc4c02, #ff6b2b)',
        color: '#fff',
        fontSize: 16,
        fontWeight: 800,
        cursor: busy ? 'wait' : 'pointer',
        opacity: busy ? 0.7 : 1,
        transition: 'all 0.2s',
        boxShadow: '0 4px 14px rgba(252,76,2,0.35)',
    };
    return (_jsx("div", { style: {
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(0,0,0,0.4)',
            backdropFilter: 'blur(4px)',
        }, onClick: (e) => { if (e.target === e.currentTarget)
            onClose(); }, children: _jsxs("div", { style: {
                display: 'flex',
                width: isMobile ? '100%' : 820,
                maxWidth: '100%',
                maxHeight: '95vh',
                borderRadius: isMobile ? 0 : 20,
                overflow: 'hidden',
                background: '#fff',
                boxShadow: '0 20px 60px rgba(0,0,0,0.25)',
                position: 'relative',
            }, children: [_jsx("button", { onClick: onClose, style: {
                        position: 'absolute',
                        top: 16,
                        right: 16,
                        width: 36,
                        height: 36,
                        borderRadius: '50%',
                        border: 'none',
                        background: isMobile ? '#f0f0f0' : 'rgba(255,255,255,0.2)',
                        fontSize: 18,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: isMobile ? '#666' : '#fff',
                        zIndex: 10,
                        transition: 'background 0.2s',
                    }, children: _jsx("svg", { width: "14", height: "14", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 2.5, children: _jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", d: "M6 18L18 6M6 6l12 12" }) }) }), !isMobile && (_jsxs("div", { style: {
                        width: 360,
                        flexShrink: 0,
                        background: 'linear-gradient(135deg, #fc4c02, #ff6b2b)',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '48px 36px',
                        position: 'relative',
                        overflow: 'hidden',
                    }, children: [['🏃', '🚴', '⛷️', '🚶', '🏅', '🎯'].map((icon, i) => (_jsx("span", { style: {
                                position: 'absolute',
                                fontSize: 28 + (i % 3) * 8,
                                opacity: 0.15,
                                top: `${10 + i * 14}%`,
                                left: `${5 + (i % 2 === 0 ? 10 : 70) + (i * 3)}%`,
                                transform: `rotate(${-15 + i * 12}deg)`,
                                pointerEvents: 'none',
                            }, children: icon }, i))), _jsx("div", { style: {
                                width: 80,
                                height: 80,
                                borderRadius: 20,
                                background: 'rgba(255,255,255,0.2)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: 40,
                                marginBottom: 24,
                                backdropFilter: 'blur(10px)',
                            }, children: "\uD83C\uDFC3" }), _jsx("div", { style: {
                                fontSize: 32,
                                fontWeight: 900,
                                color: '#fff',
                                marginBottom: 12,
                                letterSpacing: -0.5,
                            }, children: "SportRun" }), _jsx("p", { style: {
                                fontSize: 16,
                                color: 'rgba(255,255,255,0.85)',
                                textAlign: 'center',
                                lineHeight: 1.5,
                                margin: 0,
                                maxWidth: 260,
                            }, children: "\u041F\u0440\u0438\u0441\u043E\u0435\u0434\u0438\u043D\u044F\u0439\u0441\u044F \u043A \u0442\u044B\u0441\u044F\u0447\u0430\u043C \u0441\u043F\u043E\u0440\u0442\u0441\u043C\u0435\u043D\u043E\u0432. \u0423\u0447\u0430\u0441\u0442\u0432\u0443\u0439 \u0432 \u0437\u0430\u0431\u0435\u0433\u0430\u0445, \u043F\u043E\u0431\u0435\u0436\u0434\u0430\u0439 \u0438 \u043F\u043E\u043B\u0443\u0447\u0430\u0439 \u043D\u0430\u0433\u0440\u0430\u0434\u044B!" }), _jsx("div", { style: {
                                display: 'flex',
                                gap: 24,
                                marginTop: 32,
                                padding: '16px 0',
                                borderTop: '1px solid rgba(255,255,255,0.2)',
                            }, children: [
                                { val: '10K+', label: 'Спортсменов' },
                                { val: '500+', label: 'Событий' },
                            ].map((s, i) => (_jsxs("div", { style: { textAlign: 'center' }, children: [_jsx("div", { style: { fontSize: 22, fontWeight: 900, color: '#fff' }, children: s.val }), _jsx("div", { style: { fontSize: 11, color: 'rgba(255,255,255,0.7)', fontWeight: 600 }, children: s.label })] }, i))) })] })), _jsxs("div", { style: {
                        flex: 1,
                        padding: isMobile ? '24px 20px' : '40px 40px',
                        overflowY: 'auto',
                        maxHeight: '95vh',
                    }, children: [isMobile && (_jsxs("div", { style: { textAlign: 'center', marginBottom: 24 }, children: [_jsx("div", { style: {
                                        width: 56,
                                        height: 56,
                                        borderRadius: 16,
                                        background: 'linear-gradient(135deg, #fc4c02, #ff6b2b)',
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        fontSize: 28,
                                        marginBottom: 10,
                                    }, children: "\uD83C\uDFC3" }), _jsx("div", { style: { fontSize: 24, fontWeight: 900, color: '#242424' }, children: "SportRun" })] })), _jsxs("div", { style: { marginBottom: 24 }, children: [_jsx("h2", { style: { fontSize: 24, fontWeight: 900, color: '#242424', marginBottom: 16, marginTop: 0 }, children: tab === 'login' ? 'Вход в аккаунт' : 'Создать аккаунт' }), _jsx("div", { style: { display: 'flex', background: '#f4f4f5', borderRadius: 10, padding: 3 }, children: ['login', 'register'].map(t => (_jsx("button", { onClick: () => { setTab(t); setError(''); }, style: {
                                            flex: 1,
                                            padding: '10px 0',
                                            borderRadius: 8,
                                            fontSize: 14,
                                            fontWeight: 700,
                                            cursor: 'pointer',
                                            border: 'none',
                                            background: tab === t ? '#fff' : 'transparent',
                                            color: tab === t ? '#242424' : '#888',
                                            boxShadow: tab === t ? '0 1px 4px rgba(0,0,0,0.08)' : 'none',
                                            transition: 'all 0.15s',
                                        }, children: t === 'login' ? 'Вход' : 'Регистрация' }, t))) })] }), error && (_jsx("div", { style: {
                                padding: '12px 16px',
                                borderRadius: 10,
                                background: '#fef2f2',
                                color: '#dc2626',
                                fontSize: 14,
                                fontWeight: 600,
                                marginBottom: 20,
                                border: '1px solid #fecaca',
                            }, children: error })), tab === 'login' && (_jsxs("form", { onSubmit: doLogin, children: [_jsxs("div", { style: { marginBottom: 16 }, children: [_jsx("label", { style: labelStyle, children: "Email \u0438\u043B\u0438 \u0438\u043C\u044F \u043F\u043E\u043B\u044C\u0437\u043E\u0432\u0430\u0442\u0435\u043B\u044F" }), _jsx("input", { type: "text", value: lv, onChange: e => setLv(e.target.value), required: true, placeholder: "name@email.com", style: inputStyle, onFocus: inputFocusHandler, onBlur: inputBlurHandler })] }), _jsxs("div", { style: { marginBottom: 24 }, children: [_jsx("label", { style: labelStyle, children: "\u041F\u0430\u0440\u043E\u043B\u044C" }), _jsx("input", { type: "password", value: lp, onChange: e => setLp(e.target.value), required: true, placeholder: "\u0412\u0432\u0435\u0434\u0438\u0442\u0435 \u043F\u0430\u0440\u043E\u043B\u044C", style: inputStyle, onFocus: inputFocusHandler, onBlur: inputBlurHandler })] }), _jsx("button", { type: "submit", disabled: busy, style: btnStyle, children: busy ? 'Входим...' : 'Войти' }), _jsxs("div", { style: { textAlign: 'center', marginTop: 16, fontSize: 14, color: '#888' }, children: ["\u041D\u0435\u0442 \u0430\u043A\u043A\u0430\u0443\u043D\u0442\u0430?", ' ', _jsx("span", { onClick: () => { setTab('register'); setError(''); }, style: { color: '#fc4c02', fontWeight: 700, cursor: 'pointer' }, children: "\u0417\u0430\u0440\u0435\u0433\u0438\u0441\u0442\u0440\u0438\u0440\u043E\u0432\u0430\u0442\u044C\u0441\u044F" })] })] })), tab === 'register' && (_jsxs("form", { onSubmit: doRegister, children: [_jsxs("div", { style: { marginBottom: 16 }, children: [_jsx("label", { style: labelStyle, children: "\u0418\u043C\u044F \u043F\u043E\u043B\u044C\u0437\u043E\u0432\u0430\u0442\u0435\u043B\u044F" }), _jsx("input", { type: "text", value: ru, onChange: e => setRu(e.target.value), required: true, placeholder: "\u0412\u0430\u0448 \u043D\u0438\u043A\u043D\u0435\u0439\u043C", style: inputStyle, onFocus: inputFocusHandler, onBlur: inputBlurHandler })] }), _jsxs("div", { style: { marginBottom: 16 }, children: [_jsx("label", { style: labelStyle, children: "Email" }), _jsx("input", { type: "email", value: re, onChange: e => setRe(e.target.value), required: true, placeholder: "name@email.com", style: inputStyle, onFocus: inputFocusHandler, onBlur: inputBlurHandler })] }), _jsxs("div", { style: { marginBottom: 16 }, children: [_jsx("label", { style: labelStyle, children: "\u041F\u0430\u0440\u043E\u043B\u044C" }), _jsx("input", { type: "password", value: rp, onChange: e => setRp(e.target.value), required: true, minLength: 6, placeholder: "\u041C\u0438\u043D\u0438\u043C\u0443\u043C 6 \u0441\u0438\u043C\u0432\u043E\u043B\u043E\u0432", style: inputStyle, onFocus: inputFocusHandler, onBlur: inputBlurHandler })] }), _jsxs("div", { style: { marginBottom: 16 }, children: [_jsx("label", { style: labelStyle, children: "\u0413\u043E\u0440\u043E\u0434" }), _jsx("input", { type: "text", value: rc, onChange: e => setRc(e.target.value), placeholder: "\u0412\u0430\u0448 \u0433\u043E\u0440\u043E\u0434", style: inputStyle, onFocus: inputFocusHandler, onBlur: inputBlurHandler })] }), _jsxs("div", { style: { marginBottom: 24 }, children: [_jsxs("label", { style: labelStyle, children: ["\u0420\u0435\u0444\u0435\u0440\u0430\u043B\u044C\u043D\u044B\u0439 \u043A\u043E\u0434 ", _jsx("span", { style: { color: '#bbb', fontWeight: 400 }, children: "(\u043D\u0435\u043E\u0431\u044F\u0437\u0430\u0442\u0435\u043B\u044C\u043D\u043E)" })] }), _jsx("input", { type: "text", value: rr, onChange: e => setRr(e.target.value), placeholder: "\u041A\u043E\u0434 \u0434\u0440\u0443\u0433\u0430", style: inputStyle, onFocus: inputFocusHandler, onBlur: inputBlurHandler })] }), _jsx("button", { type: "submit", disabled: busy, style: btnStyle, children: busy ? 'Создаём...' : 'Создать аккаунт' }), _jsxs("div", { style: { textAlign: 'center', marginTop: 16, fontSize: 14, color: '#888' }, children: ["\u0423\u0436\u0435 \u0435\u0441\u0442\u044C \u0430\u043A\u043A\u0430\u0443\u043D\u0442?", ' ', _jsx("span", { onClick: () => { setTab('login'); setError(''); }, style: { color: '#fc4c02', fontWeight: 700, cursor: 'pointer' }, children: "\u0412\u043E\u0439\u0442\u0438" })] })] }))] })] }) }));
}
