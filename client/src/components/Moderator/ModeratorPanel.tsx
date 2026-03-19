import { useState, useEffect, useCallback, useRef } from 'react';
import { api } from '@/services/api';

const BRAND = '#7c3aed';
const BRAND_BG = '#f5f3ff';
const TEXT = '#242424';
const BORDER = '#e0e0e0';

const SPORT_LABELS: Record<string, string> = {
  RUNNING: 'Бег', CYCLING: 'Вело', SKIING: 'Лыжи', WALKING: 'Ходьба', SWIMMING: 'Плавание', TRIATHLON: 'Три',
};
const SPORT_COLORS: Record<string, string> = {
  RUNNING: '#fc4c02', CYCLING: '#2563eb', SKIING: '#0891b2', WALKING: '#16a34a', SWIMMING: '#7c3aed', TRIATHLON: '#ea580c',
};
const ROLE_COLORS: Record<string, string> = { USER: '#888', MODERATOR: '#7c3aed', ADMIN: '#dc2626' };

type ModTab = 'overview' | 'activities' | 'users';
const NAV: { key: ModTab; label: string; icon: string }[] = [
  { key: 'overview', label: 'Обзор', icon: '📊' },
  { key: 'activities', label: 'Активности', icon: '⚡' },
  { key: 'users', label: 'Пользователи', icon: '👥' },
];

// ─── Toast ───────────────────────────────────────────────

interface Toast { id: number; message: string; type: 'success' | 'error' }

function useToast() {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const counter = useRef(0);
  const add = useCallback((message: string, type: 'success' | 'error' = 'success') => {
    const id = ++counter.current;
    setToasts(p => [...p, { id, message, type }]);
    setTimeout(() => setToasts(p => p.filter(t => t.id !== id)), 3000);
  }, []);
  return { toasts, add };
}

function ToastList({ toasts }: { toasts: Toast[] }) {
  return (
    <div style={{ position: 'fixed', top: 24, right: 24, zIndex: 10000, display: 'flex', flexDirection: 'column', gap: 10, pointerEvents: 'none' }}>
      {toasts.map(t => (
        <div key={t.id} style={{ background: t.type === 'success' ? '#16a34a' : '#dc2626', color: '#fff', padding: '12px 20px', borderRadius: 12, fontSize: 14, fontWeight: 700, boxShadow: '0 4px 20px rgba(0,0,0,0.18)', minWidth: 260, animation: 'slideInRight 0.2s ease' }}>
          {t.message}
        </div>
      ))}
    </div>
  );
}

// ─── Confirm Dialog ───────────────────────────────────────

function Confirm({ message, onConfirm, onCancel }: { message: string; onConfirm: () => void; onCancel: () => void }) {
  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }} onClick={(e) => { if (e.target === e.currentTarget) onCancel(); }}>
      <div style={{ background: '#fff', borderRadius: 20, maxWidth: 400, width: '90%', padding: 32, textAlign: 'center' }}>
        <p style={{ fontSize: 16, fontWeight: 600, color: TEXT, marginBottom: 24 }}>{message}</p>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
          <button onClick={onCancel} style={{ padding: '10px 20px', borderRadius: 10, border: `1.5px solid ${BORDER}`, background: '#fff', color: TEXT, fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>Отмена</button>
          <button onClick={onConfirm} style={{ padding: '10px 20px', borderRadius: 10, border: 'none', background: '#dc2626', color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>Удалить</button>
        </div>
      </div>
    </div>
  );
}

// ─── User Avatar ─────────────────────────────────────────

function Avatar({ username, avatarUrl, size = 32 }: { username: string; avatarUrl?: string; size?: number }) {
  if (avatarUrl) return <img src={avatarUrl} alt="" style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />;
  return (
    <div style={{ width: size, height: size, borderRadius: '50%', background: 'linear-gradient(135deg, #fc4c02, #ff7c3a)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: size * 0.4, color: '#fff', fontWeight: 700, flexShrink: 0 }}>
      {(username ?? '?')[0].toUpperCase()}
    </div>
  );
}

function formatDur(s: number) {
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60);
  return h > 0 ? `${h}ч ${m}м` : `${m}м`;
}

// ─── Overview Tab ────────────────────────────────────────

function OverviewTab({ toast }: { toast: (msg: string, type?: 'success' | 'error') => void }) {
  const [stats, setStats] = useState<{
    totalUsers: number; totalActivities: number; activitiesToday: number; activitiesThisWeek: number;
    recentActivities: { id: string; sport: string; title?: string; distance: number; duration: number; createdAt: string; user: { id: string; username: string; avatarUrl?: string } }[];
    topActiveUsers: { id: string; username: string; avatarUrl?: string; totalActivities: number; totalDistance: number; level: number }[];
  } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.mod.stats()
      .then(setStats)
      .catch(() => toast('Ошибка загрузки статистики', 'error'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div style={{ textAlign: 'center', padding: 80, color: '#888', fontSize: 15 }}>Загрузка...</div>;
  if (!stats) return null;

  const cards = [
    { label: 'Пользователей', value: stats.totalUsers, color: '#2563eb', bg: '#eff6ff', icon: '👥' },
    { label: 'Активностей всего', value: stats.totalActivities, color: '#16a34a', bg: '#f0fdf4', icon: '⚡' },
    { label: 'За сегодня', value: stats.activitiesToday, color: BRAND, bg: BRAND_BG, icon: '📅' },
    { label: 'За неделю', value: stats.activitiesThisWeek, color: '#ea580c', bg: '#fff7ed', icon: '📈' },
  ];

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16, marginBottom: 24 }}>
        {cards.map(c => (
          <div key={c.label} style={{ background: '#fff', borderRadius: 14, border: `1px solid ${BORDER}`, padding: '20px 24px' }}>
            <div style={{ fontSize: 28, marginBottom: 8 }}>{c.icon}</div>
            <div style={{ fontSize: 28, fontWeight: 900, color: c.color }}>{c.value.toLocaleString('ru-RU')}</div>
            <div style={{ fontSize: 13, color: '#888', marginTop: 4 }}>{c.label}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 16 }}>
        {/* Recent activities */}
        <div style={{ background: '#fff', borderRadius: 14, border: `1px solid ${BORDER}`, overflow: 'hidden' }}>
          <div style={{ padding: '16px 20px', borderBottom: `1px solid ${BORDER}`, fontWeight: 800, fontSize: 15 }}>Последние активности</div>
          <div style={{ maxHeight: 400, overflowY: 'auto' }}>
            {stats.recentActivities.map(a => (
              <div key={a.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 20px', borderBottom: `1px solid #f5f5f5` }}>
                <span style={{ width: 48, textAlign: 'center', padding: '3px 0', borderRadius: 20, fontSize: 11, fontWeight: 700, color: '#fff', background: SPORT_COLORS[a.sport] ?? '#888', flexShrink: 0 }}>
                  {SPORT_LABELS[a.sport] ?? a.sport}
                </span>
                <Avatar username={a.user.username} avatarUrl={a.user.avatarUrl} size={28} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: TEXT, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {a.title || `${SPORT_LABELS[a.sport] ?? a.sport} · ${a.user.username}`}
                  </div>
                  <div style={{ fontSize: 11, color: '#888' }}>
                    {a.distance.toFixed(1)} км · {new Date(a.createdAt).toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Top users */}
        <div style={{ background: '#fff', borderRadius: 14, border: `1px solid ${BORDER}`, overflow: 'hidden' }}>
          <div style={{ padding: '16px 20px', borderBottom: `1px solid ${BORDER}`, fontWeight: 800, fontSize: 15 }}>Топ по активностям</div>
          {stats.topActiveUsers.map((u, i) => (
            <div key={u.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 20px', borderBottom: `1px solid #f5f5f5` }}>
              <span style={{ fontSize: 18, width: 24, textAlign: 'center' }}>{['🥇', '🥈', '🥉', '4️⃣', '5️⃣'][i]}</span>
              <Avatar username={u.username} avatarUrl={u.avatarUrl} size={32} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 700 }}>{u.username}</div>
                <div style={{ fontSize: 11, color: '#888' }}>{u.totalActivities} акт. · {u.totalDistance.toFixed(1)} км</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Activities Tab ───────────────────────────────────────

type ModActivity = { id: string; sport: string; title?: string; description?: string; distance: number; duration: number; startedAt: string; createdAt: string; isManual: boolean; user: { id: string; username: string; avatarUrl?: string; level: number } };

function ActivitiesTab({ toast }: { toast: (msg: string, type?: 'success' | 'error') => void }) {
  const [activities, setActivities] = useState<ModActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [sportFilter, setSportFilter] = useState('');
  const [confirm, setConfirm] = useState<ModActivity | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [hoveredRow, setHoveredRow] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.mod.activities({ limit: 100, sport: sportFilter || undefined, search: search || undefined });
      setActivities(res);
    } catch {
      toast('Ошибка загрузки активностей', 'error');
    } finally {
      setLoading(false);
    }
  }, [sportFilter, search]);

  useEffect(() => { load(); }, [load]);

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      await api.mod.deleteActivity(id);
      setActivities(p => p.filter(a => a.id !== id));
      toast('Активность удалена');
    } catch {
      toast('Ошибка удаления', 'error');
    } finally {
      setDeletingId(null);
      setConfirm(null);
    }
  };

  return (
    <div>
      {/* Filters */}
      <div style={{ background: '#fff', borderRadius: 14, border: `1px solid ${BORDER}`, padding: 16, marginBottom: 16 }}>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <input
            style={{ flex: 1, minWidth: 200, padding: '9px 14px', borderRadius: 8, border: `1.5px solid ${BORDER}`, fontSize: 14, outline: 'none' }}
            value={search}
            onChange={e => setSearch(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') load(); }}
            placeholder="Поиск по названию или пользователю..."
          />
          <select
            value={sportFilter}
            onChange={e => setSportFilter(e.target.value)}
            style={{ padding: '9px 14px', borderRadius: 8, border: `1.5px solid ${BORDER}`, fontSize: 14, outline: 'none', background: '#fff' }}
          >
            <option value="">Все виды спорта</option>
            {Object.entries(SPORT_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
          <button onClick={load} style={{ padding: '9px 18px', borderRadius: 8, border: 'none', background: BRAND, color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
            Найти
          </button>
        </div>
        <div style={{ fontSize: 12, color: '#888', marginTop: 8 }}>Найдено: {activities.length}</div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 60, color: '#888' }}>Загрузка...</div>
      ) : (
        <div style={{ background: '#fff', borderRadius: 14, border: `1px solid ${BORDER}`, overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#fafafa' }}>
                  {['Спорт', 'Название', 'Пользователь', 'Дистанция', 'Время', 'Дата', ''].map(h => (
                    <th key={h} style={{ textAlign: 'left', padding: '10px 12px', fontSize: 12, fontWeight: 700, color: '#888', borderBottom: `2px solid ${BORDER}` }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {activities.map((a, idx) => (
                  <tr key={a.id} onMouseEnter={() => setHoveredRow(a.id)} onMouseLeave={() => setHoveredRow(null)} style={{ background: hoveredRow === a.id ? '#fdf5ff' : idx % 2 === 0 ? '#fff' : '#fafafa', transition: 'background 0.1s' }}>
                    <td style={{ padding: 12 }}>
                      <span style={{ display: 'inline-block', padding: '2px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700, color: '#fff', background: SPORT_COLORS[a.sport] ?? '#888' }}>
                        {SPORT_LABELS[a.sport] ?? a.sport}
                      </span>
                    </td>
                    <td style={{ padding: 12, maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 14, color: TEXT }}>
                      {a.title || '—'}
                      {a.isManual && <span style={{ marginLeft: 6, fontSize: 10, color: '#888' }}>вручную</span>}
                    </td>
                    <td style={{ padding: 12 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <Avatar username={a.user.username} avatarUrl={a.user.avatarUrl} size={26} />
                        <span style={{ fontSize: 13, fontWeight: 600 }}>{a.user.username}</span>
                      </div>
                    </td>
                    <td style={{ padding: 12, fontSize: 14, fontWeight: 700, color: '#fc4c02' }}>{a.distance.toFixed(2)} км</td>
                    <td style={{ padding: 12, fontSize: 14, color: '#666' }}>{formatDur(a.duration)}</td>
                    <td style={{ padding: 12, fontSize: 12, color: '#888', whiteSpace: 'nowrap' }}>
                      {new Date(a.createdAt).toLocaleDateString('ru-RU')}
                    </td>
                    <td style={{ padding: 12 }}>
                      <button
                        disabled={deletingId === a.id}
                        onClick={() => setConfirm(a)}
                        style={{ padding: '5px 12px', borderRadius: 8, border: 'none', background: '#dc2626', color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer', opacity: deletingId === a.id ? 0.6 : 1 }}
                      >
                        🗑
                      </button>
                    </td>
                  </tr>
                ))}
                {activities.length === 0 && (
                  <tr><td colSpan={7} style={{ textAlign: 'center', padding: 48, color: '#888' }}>Нет активностей</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {confirm && (
        <Confirm
          message={`Удалить активность "${confirm.title || confirm.sport}" пользователя ${confirm.user.username}?`}
          onConfirm={() => handleDelete(confirm.id)}
          onCancel={() => setConfirm(null)}
        />
      )}
    </div>
  );
}

// ─── Users Tab ────────────────────────────────────────────

type ModUser = { id: string; username: string; email: string; role: string; city?: string; level: number; xp: number; totalDistance: number; totalActivities: number; currentStreak: number; createdAt: string; avatarUrl?: string };

function UsersTab({ toast }: { toast: (msg: string, type?: 'success' | 'error') => void }) {
  const [users, setUsers] = useState<ModUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [hoveredRow, setHoveredRow] = useState<string | null>(null);
  const [warnModal, setWarnModal] = useState<ModUser | null>(null);
  const [warnReason, setWarnReason] = useState('');
  const [sendingWarn, setSendingWarn] = useState(false);

  const load = useCallback(async (s?: string) => {
    setLoading(true);
    try {
      const res = await api.mod.users(s);
      setUsers(res);
    } catch {
      toast('Ошибка загрузки пользователей', 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleWarn = async () => {
    if (!warnModal || !warnReason.trim()) return;
    setSendingWarn(true);
    try {
      await api.mod.warnUser(warnModal.id, warnReason);
      toast(`Предупреждение отправлено пользователю ${warnModal.username}`);
      setWarnModal(null);
      setWarnReason('');
    } catch {
      toast('Ошибка отправки предупреждения', 'error');
    } finally {
      setSendingWarn(false);
    }
  };

  return (
    <div>
      <div style={{ background: '#fff', borderRadius: 14, border: `1px solid ${BORDER}`, padding: 16, marginBottom: 16 }}>
        <div style={{ display: 'flex', gap: 8 }}>
          <input
            style={{ flex: 1, padding: '9px 14px', borderRadius: 8, border: `1.5px solid ${BORDER}`, fontSize: 14, outline: 'none' }}
            value={search}
            onChange={e => setSearch(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') load(search); }}
            placeholder="Поиск по имени, email, городу..."
          />
          <button onClick={() => load(search)} style={{ padding: '9px 18px', borderRadius: 8, border: 'none', background: BRAND, color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
            Найти
          </button>
        </div>
        <div style={{ fontSize: 12, color: '#888', marginTop: 8 }}>Пользователей: {users.length}</div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 60, color: '#888' }}>Загрузка...</div>
      ) : (
        <div style={{ background: '#fff', borderRadius: 14, border: `1px solid ${BORDER}`, overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#fafafa' }}>
                  {['Пользователь', 'Email', 'Роль', 'Город', 'Ур. / XP', 'Активн.', 'Дата рег.', 'Действия'].map(h => (
                    <th key={h} style={{ textAlign: 'left', padding: '10px 12px', fontSize: 12, fontWeight: 700, color: '#888', borderBottom: `2px solid ${BORDER}` }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {users.map((u, idx) => (
                  <tr key={u.id} onMouseEnter={() => setHoveredRow(u.id)} onMouseLeave={() => setHoveredRow(null)} style={{ background: hoveredRow === u.id ? '#fdf5ff' : idx % 2 === 0 ? '#fff' : '#fafafa', transition: 'background 0.1s' }}>
                    <td style={{ padding: 12 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <Avatar username={u.username} avatarUrl={u.avatarUrl} size={28} />
                        <span style={{ fontSize: 14, fontWeight: 700, color: TEXT }}>{u.username}</span>
                      </div>
                    </td>
                    <td style={{ padding: 12, fontSize: 12, color: '#666' }}>{u.email}</td>
                    <td style={{ padding: 12 }}>
                      <span style={{ display: 'inline-block', padding: '2px 10px', borderRadius: 6, fontSize: 11, fontWeight: 700, color: '#fff', background: ROLE_COLORS[u.role] ?? '#888' }}>
                        {u.role}
                      </span>
                    </td>
                    <td style={{ padding: 12, fontSize: 13, color: '#666' }}>{u.city ?? '—'}</td>
                    <td style={{ padding: 12 }}>
                      <span style={{ padding: '2px 8px', background: '#f5f5f5', borderRadius: 20, fontSize: 12, fontWeight: 700 }}>Ур.{u.level}</span>
                      <span style={{ marginLeft: 4, fontSize: 11, color: '#888' }}>{u.xp} XP</span>
                    </td>
                    <td style={{ padding: 12, fontSize: 14, fontWeight: 600, color: BRAND }}>{u.totalActivities}</td>
                    <td style={{ padding: 12, fontSize: 12, color: '#888', whiteSpace: 'nowrap' }}>{new Date(u.createdAt).toLocaleDateString('ru-RU')}</td>
                    <td style={{ padding: 12 }}>
                      <button
                        onClick={() => { setWarnModal(u); setWarnReason(''); }}
                        style={{ padding: '5px 12px', borderRadius: 8, border: `1.5px solid ${BRAND}`, background: '#fff', color: BRAND, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}
                      >
                        ⚠️ Предупр.
                      </button>
                    </td>
                  </tr>
                ))}
                {users.length === 0 && (
                  <tr><td colSpan={8} style={{ textAlign: 'center', padding: 48, color: '#888' }}>Пользователи не найдены</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {warnModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }} onClick={(e) => { if (e.target === e.currentTarget) setWarnModal(null); }}>
          <div style={{ background: '#fff', borderRadius: 20, maxWidth: 420, width: '90%', padding: 32 }}>
            <h3 style={{ fontSize: 20, fontWeight: 900, color: TEXT, marginBottom: 16 }}>⚠️ Предупреждение</h3>
            <div style={{ fontSize: 13, color: '#888', marginBottom: 16 }}>Пользователь: <strong>{warnModal.username}</strong></div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: TEXT, marginBottom: 6 }}>Причина *</label>
            <textarea
              style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: `1.5px solid ${BORDER}`, fontSize: 14, outline: 'none', minHeight: 100, resize: 'vertical', boxSizing: 'border-box', color: TEXT }}
              value={warnReason}
              onChange={e => setWarnReason(e.target.value)}
              placeholder="Опишите причину предупреждения..."
            />
            <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 16 }}>
              <button onClick={() => setWarnModal(null)} style={{ padding: '10px 20px', borderRadius: 10, border: `1.5px solid ${BORDER}`, background: '#fff', color: TEXT, fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>Отмена</button>
              <button onClick={handleWarn} disabled={sendingWarn || !warnReason.trim()} style={{ padding: '10px 20px', borderRadius: 10, border: 'none', background: BRAND, color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer', opacity: sendingWarn ? 0.6 : 1 }}>
                {sendingWarn ? 'Отправка...' : 'Отправить'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main ModeratorPanel ─────────────────────────────────

export default function ModeratorPanel() {
  const [tab, setTab] = useState<ModTab>('overview');
  const { toasts, add: toast } = useToast();
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    const h = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', h);
    return () => window.removeEventListener('resize', h);
  }, []);

  const activeNav = NAV.find(n => n.key === tab)!;

  return (
    <div style={{ maxWidth: 1280, margin: '0 auto', padding: '24px 16px 48px' }}>
      <style>{`@keyframes slideInRight { from { opacity: 0; transform: translateX(20px); } to { opacity: 1; transform: translateX(0); } }`}</style>
      <ToastList toasts={toasts} />

      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
          <span style={{ fontSize: 13, color: '#aaa', fontWeight: 500 }}>Модерация</span>
          <span style={{ color: '#ddd' }}>›</span>
          <span style={{ fontSize: 13, color: BRAND, fontWeight: 700 }}>{activeNav.label}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 40, height: 40, borderRadius: 12, background: BRAND_BG, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>🛡️</div>
          <h1 style={{ fontSize: 28, fontWeight: 900, color: TEXT, margin: 0 }}>Панель модератора</h1>
        </div>
      </div>

      {/* Mobile nav */}
      {isMobile && (
        <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 16, scrollbarWidth: 'none' }}>
          {NAV.map(n => (
            <button key={n.key} onClick={() => setTab(n.key)} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 24, border: tab === n.key ? 'none' : `1.5px solid ${BORDER}`, background: tab === n.key ? BRAND : '#fff', color: tab === n.key ? '#fff' : '#666', fontSize: 13, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0 }}>
              {n.icon} {n.label}
            </button>
          ))}
        </div>
      )}

      <div style={{ display: 'flex', gap: 24, alignItems: 'flex-start' }}>
        {/* Desktop sidebar */}
        {!isMobile && (
          <aside style={{ width: 200, flexShrink: 0, position: 'sticky', top: 24, alignSelf: 'flex-start', background: '#fff', borderRadius: 16, border: `1px solid ${BORDER}`, padding: '12px 0' }}>
            <div style={{ padding: '8px 16px 16px', borderBottom: `1px solid ${BORDER}`, marginBottom: 8 }}>
              <div style={{ fontSize: 11, fontWeight: 800, color: '#aaa', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Навигация</div>
            </div>
            {NAV.map(n => {
              const isActive = tab === n.key;
              return (
                <button key={n.key} onClick={() => setTab(n.key)} style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '11px 16px', border: 'none', borderLeft: isActive ? `3px solid ${BRAND}` : '3px solid transparent', background: isActive ? BRAND_BG : 'transparent', color: isActive ? BRAND : '#555', fontSize: 14, fontWeight: isActive ? 700 : 500, cursor: 'pointer', textAlign: 'left', boxSizing: 'border-box' } as React.CSSProperties}>
                  <span style={{ fontSize: 16 }}>{n.icon}</span>
                  {n.label}
                </button>
              );
            })}
          </aside>
        )}

        {/* Content */}
        <main style={{ flex: 1, minWidth: 0 }}>
          {tab === 'overview' && <OverviewTab toast={toast} />}
          {tab === 'activities' && <ActivitiesTab toast={toast} />}
          {tab === 'users' && <UsersTab toast={toast} />}
        </main>
      </div>
    </div>
  );
}
