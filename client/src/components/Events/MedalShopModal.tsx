import { useState, useEffect } from 'react';
import type { Event } from '@/types';
import { api } from '@/services/api';

interface MedalShopModalProps {
  isOpen: boolean;
  event: Event;
  onClose: () => void;
  onJoin: (eventId: string) => void;
}

interface Package {
  id: string;
  name: string;
  price: number;
  features: string[];
  icon: string;
  imageUrl?: string;
  description?: string;
}

const FALLBACK_PACKAGES: Package[] = [
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

export function MedalShopModal({ isOpen, event, onClose, onJoin }: MedalShopModalProps) {
  const [packages, setPackages] = useState<Package[]>(FALLBACK_PACKAGES);
  const [selected, setSelected] = useState<string>('');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [loadingPkgs, setLoadingPkgs] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    let cancelled = false;
    setLoadingPkgs(true);

    api.packages.list()
      .then((data) => {
        if (cancelled) return;
        if (data && data.length > 0) {
          setPackages(data);
          // Select first (cheapest) package by default
          setSelected(data[0].id);
        } else {
          setPackages(FALLBACK_PACKAGES);
          setSelected(FALLBACK_PACKAGES[0].id);
        }
      })
      .catch(() => {
        if (cancelled) return;
        // Fallback to hardcoded
        setPackages(FALLBACK_PACKAGES);
        setSelected(FALLBACK_PACKAGES[0].id);
      })
      .finally(() => {
        if (!cancelled) setLoadingPkgs(false);
      });

    return () => { cancelled = true; };
  }, [isOpen]);

  if (!isOpen) return null;

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
      try { await api.events.join(event.id); } catch { /* already joined is ok */ }

      // Create merch order
      await api.merch.createOrder({
        eventId: event.id,
        package: selected,
        ...(isPaid ? { address: address.trim(), phone: phone.trim() } : {}),
      });

      onJoin(event.id);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Произошла ошибка');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      style={{
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
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        style={{
          background: '#fff',
          borderRadius: 20,
          boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
          maxWidth: 880,
          width: '100%',
          maxHeight: '90vh',
          overflow: 'auto',
          position: 'relative',
        }}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          style={{
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
          }}
        >
          ✕
        </button>

        {/* Header */}
        <div style={{ padding: '32px 32px 0' }}>
          <h2 style={{ fontSize: 24, fontWeight: 900, color: '#242424', marginBottom: 4 }}>
            Выберите пакет участия
          </h2>
          <p style={{ fontSize: 14, color: '#888', marginBottom: 0 }}>
            {event.title}
          </p>
        </div>

        {/* Loading */}
        {loadingPkgs ? (
          <div style={{ padding: '40px 32px', textAlign: 'center', color: '#888', fontSize: 14 }}>
            Загрузка пакетов...
          </div>
        ) : (
          <>
            {/* Package cards */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                gap: 16,
                padding: '24px 32px',
              }}
            >
              {packages.map((pkg) => {
                const isSelected = selected === pkg.id;
                return (
                  <div
                    key={pkg.id}
                    onClick={() => setSelected(pkg.id)}
                    style={{
                      border: isSelected ? '2px solid #fc4c02' : '1.5px solid #e0e0e0',
                      borderRadius: 14,
                      cursor: 'pointer',
                      background: isSelected ? '#fff8f5' : '#fff',
                      transition: 'all 0.15s',
                      position: 'relative',
                      overflow: 'hidden',
                    }}
                  >
                    {isSelected && (
                      <div
                        style={{
                          position: 'absolute',
                          top: -1,
                          left: -1,
                          right: -1,
                          height: 4,
                          background: '#fc4c02',
                          borderRadius: '14px 14px 0 0',
                          zIndex: 1,
                        }}
                      />
                    )}

                    {/* Package image */}
                    {pkg.imageUrl && (
                      <img
                        src={pkg.imageUrl}
                        alt={pkg.name}
                        style={{
                          width: '100%',
                          height: 120,
                          objectFit: 'cover',
                          display: 'block',
                        }}
                      />
                    )}

                    <div style={{ padding: 20 }}>
                      <div style={{ fontSize: 32, marginBottom: 8 }}>
                        {pkg.icon}
                      </div>

                      <div
                        style={{
                          fontSize: 15,
                          fontWeight: 800,
                          color: '#242424',
                          marginBottom: 4,
                        }}
                      >
                        {pkg.name}
                      </div>

                      {/* Description */}
                      {pkg.description && (
                        <p
                          style={{
                            fontSize: 12,
                            color: '#888',
                            lineHeight: 1.5,
                            margin: '0 0 8px 0',
                          }}
                        >
                          {pkg.description}
                        </p>
                      )}

                      <div
                        style={{
                          fontSize: 22,
                          fontWeight: 900,
                          color: pkg.price === 0 ? '#1a7f37' : '#fc4c02',
                          marginBottom: 12,
                        }}
                      >
                        {pkg.price === 0 ? 'Бесплатно' : `${pkg.price.toLocaleString('ru-RU')}\u20BD`}
                      </div>

                      <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                        {pkg.features.map((f, i) => (
                          <li
                            key={i}
                            style={{
                              fontSize: 12,
                              color: '#666',
                              lineHeight: 1.5,
                              display: 'flex',
                              alignItems: 'flex-start',
                              gap: 6,
                              marginBottom: 4,
                            }}
                          >
                            <span style={{ color: '#1a7f37', fontSize: 13, flexShrink: 0 }}>✓</span>
                            {f}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Address/phone fields for paid packages */}
            {isPaid && (
              <div style={{ padding: '0 32px 8px' }}>
                <div
                  style={{
                    background: '#eef0f4',
                    borderRadius: 12,
                    padding: 20,
                  }}
                >
                  <div style={{ fontSize: 14, fontWeight: 700, color: '#242424', marginBottom: 12 }}>
                    Данные для доставки
                  </div>
                  <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                    <input
                      type="text"
                      placeholder="Адрес доставки"
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      style={{
                        flex: '1 1 280px',
                        padding: '10px 14px',
                        borderRadius: 8,
                        border: '1.5px solid #e0e0e0',
                        fontSize: 14,
                        outline: 'none',
                        background: '#fff',
                      }}
                    />
                    <input
                      type="tel"
                      placeholder="Телефон"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      style={{
                        flex: '1 1 180px',
                        padding: '10px 14px',
                        borderRadius: 8,
                        border: '1.5px solid #e0e0e0',
                        fontSize: 14,
                        outline: 'none',
                        background: '#fff',
                      }}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Error */}
            {error && (
              <div
                style={{
                  margin: '0 32px',
                  padding: '10px 14px',
                  background: '#fff0f0',
                  color: '#c00',
                  borderRadius: 8,
                  fontSize: 13,
                  fontWeight: 600,
                }}
              >
                {error}
              </div>
            )}

            {/* Footer */}
            <div
              style={{
                padding: '16px 32px 28px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 16,
                flexWrap: 'wrap',
              }}
            >
              <div style={{ fontSize: 13, color: '#888' }}>
                {isPaid && selectedPkg && (
                  <span>
                    Итого: <strong style={{ color: '#242424', fontSize: 16 }}>
                      {selectedPkg.price.toLocaleString('ru-RU')}&nbsp;&#8381;
                    </strong>
                  </span>
                )}
              </div>
              <button
                onClick={handleSubmit}
                disabled={submitting}
                style={{
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
                }}
              >
                {submitting
                  ? 'Загрузка...'
                  : isPaid
                    ? 'Оформить заказ'
                    : 'Участвовать бесплатно'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
