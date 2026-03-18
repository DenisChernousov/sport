import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/context/AuthContext';

interface Props { isOpen: boolean; onClose: () => void; initialTab?: 'login' | 'register'; }

const inp = 'w-full px-3.5 py-2.5 rounded-lg bg-white border border-gray-200 text-gray-900 placeholder-gray-400 focus:outline-none focus:border-brand focus:ring-2 focus:ring-brand/20 transition text-sm';

export function AuthModal({ isOpen, onClose, initialTab = 'login' }: Props) {
  const { login, register } = useAuth();
  const [tab, setTab] = useState<'login' | 'register'>(initialTab);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [lv, setLv] = useState(''); const [lp, setLp] = useState('');
  const [ru, setRu] = useState(''); const [re, setRe] = useState('');
  const [rp, setRp] = useState(''); const [rr, setRr] = useState('');

  const reset = () => { setLv(''); setLp(''); setRu(''); setRe(''); setRp(''); setRr(''); setError(''); };

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

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div className="fixed inset-0 z-50 flex items-center justify-center p-4"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <motion.div className="absolute inset-0 bg-black/20 backdrop-blur-sm" onClick={onClose} />

          <motion.div className="relative w-full max-w-sm rounded-2xl bg-white shadow-2xl overflow-hidden"
            initial={{ scale: 0.95, opacity: 0, y: 10 }} animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 10 }} transition={{ type: 'spring', damping: 25, stiffness: 300 }}>

            <button onClick={onClose} className="absolute top-3.5 right-3.5 text-gray-400 hover:text-gray-600 transition p-1 z-10">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            <div className="px-6 pt-6 pb-3">
              <h2 className="text-xl font-bold text-gray-900 text-center mb-4">
                {tab === 'login' ? 'Вход в аккаунт' : 'Создать аккаунт'}
              </h2>
              <div className="flex bg-gray-100 rounded-lg p-0.5">
                {(['login', 'register'] as const).map(t => (
                  <button key={t} onClick={() => { setTab(t); setError(''); }}
                    className={`flex-1 py-2 rounded-md text-sm font-semibold transition ${
                      tab === t ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-400 hover:text-gray-600'
                    }`}>
                    {t === 'login' ? 'Вход' : 'Регистрация'}
                  </button>
                ))}
              </div>
            </div>

            {error && (
              <div className="mx-6 p-2.5 rounded-lg bg-red-50 text-red-600 text-sm font-medium border border-red-100">{error}</div>
            )}

            <div className="p-6 pt-3">
              <AnimatePresence mode="wait">
                {tab === 'login' ? (
                  <motion.form key="l" onSubmit={doLogin} initial={{ opacity: 0, x: -12 }}
                    animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 12 }} className="space-y-3">
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 mb-1">Email или имя пользователя</label>
                      <input type="text" value={lv} onChange={e => setLv(e.target.value)} required className={inp} placeholder="name@email.com" />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 mb-1">Пароль</label>
                      <input type="password" value={lp} onChange={e => setLp(e.target.value)} required className={inp} placeholder="Введите пароль" />
                    </div>
                    <button type="submit" disabled={busy}
                      className="w-full py-2.5 rounded-lg bg-brand hover:bg-brand-dark text-white font-bold text-sm transition disabled:opacity-50 mt-1">
                      {busy ? 'Входим...' : 'Войти'}
                    </button>
                  </motion.form>
                ) : (
                  <motion.form key="r" onSubmit={doRegister} initial={{ opacity: 0, x: 12 }}
                    animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -12 }} className="space-y-3">
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 mb-1">Имя пользователя</label>
                      <input type="text" value={ru} onChange={e => setRu(e.target.value)} required className={inp} placeholder="Ваш никнейм" />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 mb-1">Email</label>
                      <input type="email" value={re} onChange={e => setRe(e.target.value)} required className={inp} placeholder="name@email.com" />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 mb-1">Пароль</label>
                      <input type="password" value={rp} onChange={e => setRp(e.target.value)} required minLength={6} className={inp} placeholder="Минимум 6 символов" />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 mb-1">Реферальный код <span className="text-gray-300 font-normal">(необязательно)</span></label>
                      <input type="text" value={rr} onChange={e => setRr(e.target.value)} className={inp} placeholder="Код друга" />
                    </div>
                    <button type="submit" disabled={busy}
                      className="w-full py-2.5 rounded-lg bg-brand hover:bg-brand-dark text-white font-bold text-sm transition disabled:opacity-50 mt-1">
                      {busy ? 'Создаём...' : 'Зарегистрироваться'}
                    </button>
                  </motion.form>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
