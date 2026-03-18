import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';

interface Props { isOpen: boolean; onClose: () => void; initialTab?: 'login' | 'register'; }

export function AuthModal({ isOpen, onClose, initialTab = 'login' }: Props) {
  const { login, register } = useAuth();
  const [tab, setTab] = useState<'login' | 'register'>(initialTab);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [lv, setLv] = useState(''); const [lp, setLp] = useState('');
  const [ru, setRu] = useState(''); const [re, setRe] = useState('');
  const [rp, setRp] = useState(''); const [rr, setRr] = useState('');
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

  const doLogin = async (e: React.FormEvent) => {
    e.preventDefault(); setError(''); setBusy(true);
    try { await login(lv, lp); reset(); onClose(); }
    catch (err) { setError(err instanceof Error ? err.message : 'Ошибка'); }
    finally { setBusy(false); }
  };

  const doRegister = async (e: React.FormEvent) => {
    e.preventDefault(); setError(''); setBusy(true);
    try { await register(ru, re, rp, rr || undefined); reset(); onClose(); }
    catch (err) { setError(err instanceof Error ? err.message : 'Ошибка'); }
    finally { setBusy(false); }
  };

  if (!isOpen) return null;

  const inputStyle: React.CSSProperties = {
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

  const inputFocusHandler = (e: React.FocusEvent<HTMLInputElement>) => {
    e.target.style.borderColor = '#fc4c02';
    e.target.style.boxShadow = '0 0 0 3px rgba(252,76,2,0.15)';
  };

  const inputBlurHandler = (e: React.FocusEvent<HTMLInputElement>) => {
    e.target.style.borderColor = '#e0e0e0';
    e.target.style.boxShadow = 'none';
  };

  const labelStyle: React.CSSProperties = {
    display: 'block',
    fontSize: 13,
    fontWeight: 600,
    color: '#555',
    marginBottom: 6,
  };

  const btnStyle: React.CSSProperties = {
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

  return (
    <div
      style={{
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
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        style={{
          display: 'flex',
          width: isMobile ? '100%' : 820,
          maxWidth: '100%',
          maxHeight: '95vh',
          borderRadius: isMobile ? 0 : 20,
          overflow: 'hidden',
          background: '#fff',
          boxShadow: '0 20px 60px rgba(0,0,0,0.25)',
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
            background: isMobile ? '#f0f0f0' : 'rgba(255,255,255,0.2)',
            fontSize: 18,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: isMobile ? '#666' : '#fff',
            zIndex: 10,
            transition: 'background 0.2s',
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* LEFT: Brand panel (desktop only) */}
        {!isMobile && (
          <div
            style={{
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
            }}
          >
            {/* Floating sport icons */}
            {['🏃', '🚴', '⛷️', '🚶', '🏅', '🎯'].map((icon, i) => (
              <span
                key={i}
                style={{
                  position: 'absolute',
                  fontSize: 28 + (i % 3) * 8,
                  opacity: 0.15,
                  top: `${10 + i * 14}%`,
                  left: `${5 + (i % 2 === 0 ? 10 : 70) + (i * 3)}%`,
                  transform: `rotate(${-15 + i * 12}deg)`,
                  pointerEvents: 'none',
                }}
              >
                {icon}
              </span>
            ))}

            {/* Logo */}
            <div
              style={{
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
              }}
            >
              🏃
            </div>

            <div
              style={{
                fontSize: 32,
                fontWeight: 900,
                color: '#fff',
                marginBottom: 12,
                letterSpacing: -0.5,
              }}
            >
              SportRun
            </div>

            <p
              style={{
                fontSize: 16,
                color: 'rgba(255,255,255,0.85)',
                textAlign: 'center',
                lineHeight: 1.5,
                margin: 0,
                maxWidth: 260,
              }}
            >
              Присоединяйся к тысячам спортсменов. Участвуй в забегах, побеждай и получай награды!
            </p>

            {/* Stats decorative */}
            <div
              style={{
                display: 'flex',
                gap: 24,
                marginTop: 32,
                padding: '16px 0',
                borderTop: '1px solid rgba(255,255,255,0.2)',
              }}
            >
              {[
                { val: '10K+', label: 'Спортсменов' },
                { val: '500+', label: 'Событий' },
              ].map((s, i) => (
                <div key={i} style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 22, fontWeight: 900, color: '#fff' }}>{s.val}</div>
                  <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.7)', fontWeight: 600 }}>{s.label}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* RIGHT: Form */}
        <div
          style={{
            flex: 1,
            padding: isMobile ? '24px 20px' : '40px 40px',
            overflowY: 'auto',
            maxHeight: '95vh',
          }}
        >
          {/* Mobile brand header */}
          {isMobile && (
            <div style={{ textAlign: 'center', marginBottom: 24 }}>
              <div
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: 16,
                  background: 'linear-gradient(135deg, #fc4c02, #ff6b2b)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 28,
                  marginBottom: 10,
                }}
              >
                🏃
              </div>
              <div style={{ fontSize: 24, fontWeight: 900, color: '#242424' }}>SportRun</div>
            </div>
          )}

          {/* Tab switch */}
          <div style={{ marginBottom: 24 }}>
            <h2 style={{ fontSize: 24, fontWeight: 900, color: '#242424', marginBottom: 16, marginTop: 0 }}>
              {tab === 'login' ? 'Вход в аккаунт' : 'Создать аккаунт'}
            </h2>
            <div style={{ display: 'flex', background: '#f4f4f5', borderRadius: 10, padding: 3 }}>
              {(['login', 'register'] as const).map(t => (
                <button
                  key={t}
                  onClick={() => { setTab(t); setError(''); }}
                  style={{
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
                  }}
                >
                  {t === 'login' ? 'Вход' : 'Регистрация'}
                </button>
              ))}
            </div>
          </div>

          {/* Error */}
          {error && (
            <div
              style={{
                padding: '12px 16px',
                borderRadius: 10,
                background: '#fef2f2',
                color: '#dc2626',
                fontSize: 14,
                fontWeight: 600,
                marginBottom: 20,
                border: '1px solid #fecaca',
              }}
            >
              {error}
            </div>
          )}

          {/* Login form */}
          {tab === 'login' && (
            <form onSubmit={doLogin}>
              <div style={{ marginBottom: 16 }}>
                <label style={labelStyle}>Email или имя пользователя</label>
                <input
                  type="text"
                  value={lv}
                  onChange={e => setLv(e.target.value)}
                  required
                  placeholder="name@email.com"
                  style={inputStyle}
                  onFocus={inputFocusHandler}
                  onBlur={inputBlurHandler}
                />
              </div>
              <div style={{ marginBottom: 24 }}>
                <label style={labelStyle}>Пароль</label>
                <input
                  type="password"
                  value={lp}
                  onChange={e => setLp(e.target.value)}
                  required
                  placeholder="Введите пароль"
                  style={inputStyle}
                  onFocus={inputFocusHandler}
                  onBlur={inputBlurHandler}
                />
              </div>
              <button type="submit" disabled={busy} style={btnStyle}>
                {busy ? 'Входим...' : 'Войти'}
              </button>
              <div style={{ textAlign: 'center', marginTop: 16, fontSize: 14, color: '#888' }}>
                Нет аккаунта?{' '}
                <span
                  onClick={() => { setTab('register'); setError(''); }}
                  style={{ color: '#fc4c02', fontWeight: 700, cursor: 'pointer' }}
                >
                  Зарегистрироваться
                </span>
              </div>
            </form>
          )}

          {/* Register form */}
          {tab === 'register' && (
            <form onSubmit={doRegister}>
              <div style={{ marginBottom: 16 }}>
                <label style={labelStyle}>Имя пользователя</label>
                <input
                  type="text"
                  value={ru}
                  onChange={e => setRu(e.target.value)}
                  required
                  placeholder="Ваш никнейм"
                  style={inputStyle}
                  onFocus={inputFocusHandler}
                  onBlur={inputBlurHandler}
                />
              </div>
              <div style={{ marginBottom: 16 }}>
                <label style={labelStyle}>Email</label>
                <input
                  type="email"
                  value={re}
                  onChange={e => setRe(e.target.value)}
                  required
                  placeholder="name@email.com"
                  style={inputStyle}
                  onFocus={inputFocusHandler}
                  onBlur={inputBlurHandler}
                />
              </div>
              <div style={{ marginBottom: 16 }}>
                <label style={labelStyle}>Пароль</label>
                <input
                  type="password"
                  value={rp}
                  onChange={e => setRp(e.target.value)}
                  required
                  minLength={6}
                  placeholder="Минимум 6 символов"
                  style={inputStyle}
                  onFocus={inputFocusHandler}
                  onBlur={inputBlurHandler}
                />
              </div>
              <div style={{ marginBottom: 16 }}>
                <label style={labelStyle}>Город</label>
                <input
                  type="text"
                  value={rc}
                  onChange={e => setRc(e.target.value)}
                  placeholder="Ваш город"
                  style={inputStyle}
                  onFocus={inputFocusHandler}
                  onBlur={inputBlurHandler}
                />
              </div>
              <div style={{ marginBottom: 24 }}>
                <label style={labelStyle}>
                  Реферальный код <span style={{ color: '#bbb', fontWeight: 400 }}>(необязательно)</span>
                </label>
                <input
                  type="text"
                  value={rr}
                  onChange={e => setRr(e.target.value)}
                  placeholder="Код друга"
                  style={inputStyle}
                  onFocus={inputFocusHandler}
                  onBlur={inputBlurHandler}
                />
              </div>
              <button type="submit" disabled={busy} style={btnStyle}>
                {busy ? 'Создаём...' : 'Создать аккаунт'}
              </button>
              <div style={{ textAlign: 'center', marginTop: 16, fontSize: 14, color: '#888' }}>
                Уже есть аккаунт?{' '}
                <span
                  onClick={() => { setTab('login'); setError(''); }}
                  style={{ color: '#fc4c02', fontWeight: 700, cursor: 'pointer' }}
                >
                  Войти
                </span>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
