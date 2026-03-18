import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState, useEffect } from 'react';
import { api } from '@/services/api';
const FALLBACK_PACKAGES = [
    {
        id: 'free',
        name: 'Бесплатное участие',
        price: 0,
        features: [
            'Участие в событии',
            'Электронный диплом',
            'Попадание в рейтинг',
        ],
        icon: '🎫',
    },
    {
        id: 'medal',
        name: 'Медаль',
        price: 990,
        features: [
            'Участие в событии',
            'Электронный диплом',
            'Попадание в рейтинг',
            'Персональная медаль с гравировкой',
            'Доставка по России',
        ],
        icon: '🏅',
    },
    {
        id: 'premium',
        name: 'Премиум',
        price: 1990,
        features: [
            'Участие в событии',
            'Электронный диплом',
            'Попадание в рейтинг',
            'Персональная медаль с гравировкой',
            'Доставка по России',
            'Фирменная футболка',
            'Бафф/повязка',
            'Наклейки',
        ],
        icon: '🎁',
    },
    {
        id: 'vip',
        name: 'VIP',
        price: 3490,
        features: [
            'Участие в событии',
            'Электронный диплом',
            'Попадание в рейтинг',
            'Персональная медаль с гравировкой',
            'Доставка по России',
            'Фирменная футболка',
            'Бафф/повязка',
            'Наклейки',
            'Худи с символикой',
            'Бутылка для воды',
            'Персональный номер',
        ],
        icon: '👑',
    },
];
export function MedalShopModal({ isOpen, event, onClose, onJoin }) {
    const [packages, setPackages] = useState(FALLBACK_PACKAGES);
    const [selected, setSelected] = useState('');
    const [address, setAddress] = useState('');
    const [phone, setPhone] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');
    const [loadingPkgs, setLoadingPkgs] = useState(false);
    useEffect(() => {
        if (!isOpen)
            return;
        let cancelled = false;
        setLoadingPkgs(true);
        api.packages.list()
            .then((data) => {
            if (cancelled)
                return;
            if (data && data.length > 0) {
                setPackages(data);
                // Select first (cheapest) package by default
                setSelected(data[0].id);
            }
            else {
                setPackages(FALLBACK_PACKAGES);
                setSelected(FALLBACK_PACKAGES[0].id);
            }
        })
            .catch(() => {
            if (cancelled)
                return;
            // Fallback to hardcoded
            setPackages(FALLBACK_PACKAGES);
            setSelected(FALLBACK_PACKAGES[0].id);
        })
            .finally(() => {
            if (!cancelled)
                setLoadingPkgs(false);
        });
        return () => { cancelled = true; };
    }, [isOpen]);
    if (!isOpen)
        return null;
    const selectedPkg = packages.find(p => p.id === selected);
    const isPaid = selectedPkg ? selectedPkg.price > 0 : false;
    const handleSubmit = async () => {
        setError('');
        if (isPaid && !address.trim()) {
            setError('Укажите адрес доставки');
            return;
        }
        if (isPaid && !phone.trim()) {
            setError('Укажите номер телефона');
            return;
        }
        setSubmitting(true);
        try {
            // Join the event (ignore 409 = already joined)
            try {
                await api.events.join(event.id);
            }
            catch { /* already joined is ok */ }
            // Create merch order
            await api.merch.createOrder({
                eventId: event.id,
                package: selected,
                ...(isPaid ? { address: address.trim(), phone: phone.trim() } : {}),
            });
            onJoin(event.id);
            onClose();
        }
        catch (err) {
            setError(err.message || 'Произошла ошибка');
        }
        finally {
            setSubmitting(false);
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
        }, onClick: (e) => { if (e.target === e.currentTarget)
            onClose(); }, children: _jsxs("div", { style: {
                background: '#fff',
                borderRadius: 20,
                boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
                maxWidth: 880,
                width: '100%',
                maxHeight: '90vh',
                overflow: 'auto',
                position: 'relative',
            }, children: [_jsx("button", { onClick: onClose, style: {
                        position: 'absolute',
                        top: 16,
                        right: 16,
                        width: 36,
                        height: 36,
                        borderRadius: '50%',
                        border: 'none',
                        background: '#f0f0f0',
                        fontSize: 18,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#666',
                        zIndex: 1,
                    }, children: "\u2715" }), _jsxs("div", { style: { padding: '32px 32px 0' }, children: [_jsx("h2", { style: { fontSize: 24, fontWeight: 900, color: '#242424', marginBottom: 4 }, children: "\u0412\u044B\u0431\u0435\u0440\u0438\u0442\u0435 \u043F\u0430\u043A\u0435\u0442 \u0443\u0447\u0430\u0441\u0442\u0438\u044F" }), _jsx("p", { style: { fontSize: 14, color: '#888', marginBottom: 0 }, children: event.title })] }), loadingPkgs ? (_jsx("div", { style: { padding: '40px 32px', textAlign: 'center', color: '#888', fontSize: 14 }, children: "\u0417\u0430\u0433\u0440\u0443\u0437\u043A\u0430 \u043F\u0430\u043A\u0435\u0442\u043E\u0432..." })) : (_jsxs(_Fragment, { children: [_jsx("div", { style: {
                                display: 'grid',
                                gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                                gap: 16,
                                padding: '24px 32px',
                            }, children: packages.map((pkg) => {
                                const isSelected = selected === pkg.id;
                                return (_jsxs("div", { onClick: () => setSelected(pkg.id), style: {
                                        border: isSelected ? '2px solid #fc4c02' : '1.5px solid #e0e0e0',
                                        borderRadius: 14,
                                        cursor: 'pointer',
                                        background: isSelected ? '#fff8f5' : '#fff',
                                        transition: 'all 0.15s',
                                        position: 'relative',
                                        overflow: 'hidden',
                                    }, children: [isSelected && (_jsx("div", { style: {
                                                position: 'absolute',
                                                top: -1,
                                                left: -1,
                                                right: -1,
                                                height: 4,
                                                background: '#fc4c02',
                                                borderRadius: '14px 14px 0 0',
                                                zIndex: 1,
                                            } })), pkg.imageUrl && (_jsx("img", { src: pkg.imageUrl, alt: pkg.name, style: {
                                                width: '100%',
                                                height: 120,
                                                objectFit: 'cover',
                                                display: 'block',
                                            } })), _jsxs("div", { style: { padding: 20 }, children: [_jsx("div", { style: { fontSize: 32, marginBottom: 8 }, children: pkg.icon }), _jsx("div", { style: {
                                                        fontSize: 15,
                                                        fontWeight: 800,
                                                        color: '#242424',
                                                        marginBottom: 4,
                                                    }, children: pkg.name }), pkg.description && (_jsx("p", { style: {
                                                        fontSize: 12,
                                                        color: '#888',
                                                        lineHeight: 1.5,
                                                        margin: '0 0 8px 0',
                                                    }, children: pkg.description })), _jsx("div", { style: {
                                                        fontSize: 22,
                                                        fontWeight: 900,
                                                        color: pkg.price === 0 ? '#1a7f37' : '#fc4c02',
                                                        marginBottom: 12,
                                                    }, children: pkg.price === 0 ? 'Бесплатно' : `${pkg.price.toLocaleString('ru-RU')}\u20BD` }), _jsx("ul", { style: { listStyle: 'none', padding: 0, margin: 0 }, children: pkg.features.map((f, i) => (_jsxs("li", { style: {
                                                            fontSize: 12,
                                                            color: '#666',
                                                            lineHeight: 1.5,
                                                            display: 'flex',
                                                            alignItems: 'flex-start',
                                                            gap: 6,
                                                            marginBottom: 4,
                                                        }, children: [_jsx("span", { style: { color: '#1a7f37', fontSize: 13, flexShrink: 0 }, children: "\u2713" }), f] }, i))) })] })] }, pkg.id));
                            }) }), isPaid && (_jsx("div", { style: { padding: '0 32px 8px' }, children: _jsxs("div", { style: {
                                    background: '#eef0f4',
                                    borderRadius: 12,
                                    padding: 20,
                                }, children: [_jsx("div", { style: { fontSize: 14, fontWeight: 700, color: '#242424', marginBottom: 12 }, children: "\u0414\u0430\u043D\u043D\u044B\u0435 \u0434\u043B\u044F \u0434\u043E\u0441\u0442\u0430\u0432\u043A\u0438" }), _jsxs("div", { style: { display: 'flex', gap: 12, flexWrap: 'wrap' }, children: [_jsx("input", { type: "text", placeholder: "\u0410\u0434\u0440\u0435\u0441 \u0434\u043E\u0441\u0442\u0430\u0432\u043A\u0438", value: address, onChange: (e) => setAddress(e.target.value), style: {
                                                    flex: '1 1 280px',
                                                    padding: '10px 14px',
                                                    borderRadius: 8,
                                                    border: '1.5px solid #e0e0e0',
                                                    fontSize: 14,
                                                    outline: 'none',
                                                    background: '#fff',
                                                } }), _jsx("input", { type: "tel", placeholder: "\u0422\u0435\u043B\u0435\u0444\u043E\u043D", value: phone, onChange: (e) => setPhone(e.target.value), style: {
                                                    flex: '1 1 180px',
                                                    padding: '10px 14px',
                                                    borderRadius: 8,
                                                    border: '1.5px solid #e0e0e0',
                                                    fontSize: 14,
                                                    outline: 'none',
                                                    background: '#fff',
                                                } })] })] }) })), error && (_jsx("div", { style: {
                                margin: '0 32px',
                                padding: '10px 14px',
                                background: '#fff0f0',
                                color: '#c00',
                                borderRadius: 8,
                                fontSize: 13,
                                fontWeight: 600,
                            }, children: error })), _jsxs("div", { style: {
                                padding: '16px 32px 28px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                gap: 16,
                                flexWrap: 'wrap',
                            }, children: [_jsx("div", { style: { fontSize: 13, color: '#888' }, children: isPaid && selectedPkg && (_jsxs("span", { children: ["\u0418\u0442\u043E\u0433\u043E: ", _jsxs("strong", { style: { color: '#242424', fontSize: 16 }, children: [selectedPkg.price.toLocaleString('ru-RU'), "\u00A0\u20BD"] })] })) }), _jsx("button", { onClick: handleSubmit, disabled: submitting, style: {
                                        padding: '14px 32px',
                                        borderRadius: 12,
                                        border: 'none',
                                        background: '#fc4c02',
                                        color: '#fff',
                                        fontSize: 15,
                                        fontWeight: 800,
                                        cursor: submitting ? 'wait' : 'pointer',
                                        opacity: submitting ? 0.6 : 1,
                                        transition: 'all 0.15s',
                                        boxShadow: '0 2px 8px rgba(252,76,2,0.3)',
                                    }, children: submitting
                                        ? 'Загрузка...'
                                        : isPaid
                                            ? 'Оформить заказ'
                                            : 'Участвовать бесплатно' })] })] }))] }) }));
}
