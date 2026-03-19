import { useState, useEffect, useCallback, useRef } from 'react';
import type { Event, DiplomaSettings } from '@/types';
import { api } from '@/services/api';
import { DiplomaEditor } from './DiplomaEditor';

interface MerchPackage {
  id: string;
  name: string;
  price: number;
  features: string[];
  icon: string;
  imageUrl?: string;
  description?: string;
  sortOrder: number;
  isActive: boolean;
}

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

const STATUS_COLORS: Record<string, string> = {
  DRAFT: '#888',
  REGISTRATION: '#2563eb',
  ACTIVE: '#16a34a',
  FINISHED: '#7c3aed',
  CANCELLED: '#dc2626',
};

const BRAND = '#fc4c02';
const TEXT = '#1e293b';
const BORDER = '#e2e8f0';
const BRAND_BG = '#fff4ef';
const SIDEBAR_W = 248;
const SIDEBAR_BG = '#0f172a';

function formatDate(d: string | Date): string {
  return new Date(d).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function toInputDate(d: string | Date | null | undefined): string {
  if (!d) return '';
  const date = new Date(d);
  return date.toISOString().slice(0, 16);
}

// ─── SVG Icons ───────────────────────────────────────────

function IconStats() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" />
    </svg>
  );
}
function IconUsers() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}
function IconEvents() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
  );
}
function IconPackages() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" /><polyline points="3.27 6.96 12 12.01 20.73 6.96" /><line x1="12" y1="22.08" x2="12" y2="12" />
    </svg>
  );
}
function IconAchievements() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="8" r="6" /><path d="M15.477 12.89L17 22l-5-3-5 3 1.523-9.11" />
    </svg>
  );
}
function IconSettings() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  );
}
function IconActivities() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
    </svg>
  );
}

// ─── Styles ──────────────────────────────────────────────

const styles = {
  card: { background: '#fff', borderRadius: 12, border: `1px solid ${BORDER}`, padding: 24, marginBottom: 16, boxShadow: '0 1px 3px rgba(0,0,0,0.04)' } as React.CSSProperties,
  btn: (variant: 'primary' | 'secondary' | 'danger' = 'primary'): React.CSSProperties => ({
    padding: '9px 20px',
    borderRadius: 8,
    border: variant === 'secondary' ? `1.5px solid ${BORDER}` : 'none',
    background: variant === 'primary' ? BRAND : variant === 'danger' ? '#ef4444' : '#fff',
    color: variant === 'secondary' ? TEXT : '#fff',
    fontSize: 13,
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.15s',
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
  }),
  smallBtn: (variant: 'primary' | 'secondary' | 'danger' = 'primary'): React.CSSProperties => ({
    padding: '5px 12px',
    borderRadius: 6,
    border: variant === 'secondary' ? `1.5px solid ${BORDER}` : 'none',
    background: variant === 'primary' ? BRAND : variant === 'danger' ? '#ef4444' : '#fff',
    color: variant === 'secondary' ? '#64748b' : '#fff',
    fontSize: 12,
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.15s',
  }),
  iconBtn: (color = '#64748b', bg = '#f1f5f9'): React.CSSProperties => ({
    width: 30, height: 30, borderRadius: 6, border: 'none',
    background: bg, color, fontSize: 13, cursor: 'pointer',
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    transition: 'all 0.15s',
  }),
  input: { width: '100%', padding: '9px 12px', borderRadius: 8, border: `1.5px solid ${BORDER}`, fontSize: 14, outline: 'none', boxSizing: 'border-box' as const, color: TEXT, background: '#fff' } as React.CSSProperties,
  select: { width: '100%', padding: '9px 12px', borderRadius: 8, border: `1.5px solid ${BORDER}`, fontSize: 14, outline: 'none', boxSizing: 'border-box' as const, color: TEXT, background: '#fff' } as React.CSSProperties,
  label: { display: 'block', fontSize: 12, fontWeight: 600, color: '#64748b', marginBottom: 5, textTransform: 'uppercase' as const, letterSpacing: '0.04em' } as React.CSSProperties,
  fieldGroup: { marginBottom: 16 } as React.CSSProperties,
  grid2: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 } as React.CSSProperties,
  grid3: { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 } as React.CSSProperties,
  overlay: { position: 'fixed' as const, top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15,23,42,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: 16, backdropFilter: 'blur(4px)' },
  modal: { background: '#fff', borderRadius: 16, maxWidth: 720, width: '100%', maxHeight: '90vh', overflow: 'auto', padding: 32, boxShadow: '0 20px 60px rgba(0,0,0,0.2)' } as React.CSSProperties,
  badge: (color: string): React.CSSProperties => ({
    display: 'inline-flex', alignItems: 'center',
    padding: '3px 10px', borderRadius: 20,
    fontSize: 11, fontWeight: 700, color: '#fff', background: color,
  }),
  table: { width: '100%', borderCollapse: 'collapse' as const } as React.CSSProperties,
  th: { textAlign: 'left' as const, padding: '11px 16px', fontSize: 11, fontWeight: 700, color: '#94a3b8', borderBottom: `1px solid ${BORDER}`, background: '#f8fafc', textTransform: 'uppercase' as const, letterSpacing: '0.06em' } as React.CSSProperties,
  td: { padding: '13px 16px', fontSize: 14, color: TEXT, borderBottom: `1px solid ${BORDER}` } as React.CSSProperties,
};

// ─── Toast Notification ──────────────────────────────────

interface Toast {
  id: number;
  message: string;
  type: 'success' | 'error';
}

function ToastContainer({ toasts, onRemove }: { toasts: Toast[]; onRemove: (id: number) => void }) {
  return (
    <div style={{
      position: 'fixed',
      top: 24,
      right: 24,
      zIndex: 10000,
      display: 'flex',
      flexDirection: 'column',
      gap: 10,
      pointerEvents: 'none',
    }}>
      {toasts.map((t) => (
        <div key={t.id} style={{
          background: t.type === 'success' ? '#16a34a' : '#dc2626',
          color: '#fff',
          padding: '12px 20px',
          borderRadius: 12,
          fontSize: 14,
          fontWeight: 700,
          boxShadow: '0 4px 20px rgba(0,0,0,0.18)',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          minWidth: 260,
          animation: 'slideIn 0.2s ease',
          pointerEvents: 'all',
        }}>
          <span style={{ flex: 1 }}>{t.message}</span>
          <button onClick={() => onRemove(t.id)} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.8)', cursor: 'pointer', fontSize: 16, padding: 0, lineHeight: 1 }}>×</button>
        </div>
      ))}
    </div>
  );
}

function useToast() {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const counter = useRef(0);

  const addToast = useCallback((message: string, type: 'success' | 'error' = 'success') => {
    const id = ++counter.current;
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 3000);
  }, []);

  const removeToast = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return { toasts, addToast, removeToast };
}

// ─── Sidebar Nav ─────────────────────────────────────────

type TabKey = 'stats' | 'users' | 'events' | 'packages' | 'achievements' | 'activities' | 'settings';

const NAV_ITEMS: { key: TabKey; label: string; Icon: () => React.ReactElement }[] = [
  { key: 'stats', label: 'Статистика', Icon: IconStats },
  { key: 'users', label: 'Пользователи', Icon: IconUsers },
  { key: 'events', label: 'События', Icon: IconEvents },
  { key: 'packages', label: 'Пакеты', Icon: IconPackages },
  { key: 'achievements', label: 'Достижения', Icon: IconAchievements },
  { key: 'activities', label: 'Активности', Icon: IconActivities },
  { key: 'settings', label: 'Настройки', Icon: IconSettings },
];

const TAB_LABELS: Record<TabKey, string> = {
  stats: 'Статистика',
  users: 'Пользователи',
  events: 'События',
  packages: 'Пакеты',
  achievements: 'Достижения',
  activities: 'Активности',
  settings: 'Настройки',
};

function SidebarNav({ active, onChange, isMobile }: { active: TabKey; onChange: (t: TabKey) => void; isMobile: boolean }) {
  if (isMobile) {
    return (
      <div style={{ display: 'flex', gap: 6, overflowX: 'auto', padding: '0 0 12px 0', scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch' } as React.CSSProperties}>
        {NAV_ITEMS.map(({ key, label, Icon }) => {
          const isActive = active === key;
          return (
            <button key={key} onClick={() => onChange(key)} style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              padding: '7px 14px', borderRadius: 20,
              border: isActive ? 'none' : `1px solid ${BORDER}`,
              background: isActive ? BRAND : '#fff',
              color: isActive ? '#fff' : '#64748b',
              fontSize: 12, fontWeight: 600, cursor: 'pointer',
              whiteSpace: 'nowrap', flexShrink: 0, transition: 'all 0.15s',
            }}>
              <Icon />{label}
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <aside style={{
      position: 'fixed', top: 52, left: 0,
      width: SIDEBAR_W, height: 'calc(100vh - 52px)',
      background: SIDEBAR_BG, overflowY: 'auto',
      display: 'flex', flexDirection: 'column', zIndex: 50,
      boxShadow: '2px 0 12px rgba(0,0,0,0.15)',
    }}>
      {/* Brand */}
      <div style={{ padding: '18px 16px 14px', borderBottom: '1px solid rgba(255,255,255,0.06)', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 34, height: 34, borderRadius: 9, background: BRAND, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 17, flexShrink: 0 }}>⚙️</div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 800, color: '#f1f5f9', letterSpacing: '-0.01em' }}>Admin Panel</div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', marginTop: 1 }}>SportRun</div>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, padding: '8px 10px' }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.22)', letterSpacing: '0.1em', textTransform: 'uppercase', padding: '10px 6px 6px' }}>Разделы</div>
        {NAV_ITEMS.map(({ key, label, Icon }) => {
          const isActive = active === key;
          return (
            <button key={key} onClick={() => onChange(key)} style={{
              display: 'flex', alignItems: 'center', gap: 10,
              width: '100%', padding: '9px 10px', borderRadius: 8,
              border: 'none', marginBottom: 2,
              background: isActive ? 'rgba(252,76,2,0.16)' : 'transparent',
              color: isActive ? '#fc6d2f' : 'rgba(255,255,255,0.5)',
              fontSize: 13, fontWeight: isActive ? 700 : 400,
              cursor: 'pointer', textAlign: 'left', transition: 'all 0.12s',
              boxSizing: 'border-box',
            } as React.CSSProperties}>
              <div style={{ width: 30, height: 30, borderRadius: 8, background: isActive ? 'rgba(252,76,2,0.22)' : 'rgba(255,255,255,0.04)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'all 0.12s' }}>
                <Icon />
              </div>
              <span style={{ flex: 1 }}>{label}</span>
              {isActive && <div style={{ width: 5, height: 5, borderRadius: '50%', background: BRAND, flexShrink: 0 }} />}
            </button>
          );
        })}
      </nav>

      <div style={{ padding: '10px 16px 14px', borderTop: '1px solid rgba(255,255,255,0.05)', fontSize: 11, color: 'rgba(255,255,255,0.18)', flexShrink: 0 }}>
        SportRun Admin v1.0
      </div>
    </aside>
  );
}

// ─── Event Form ──────────────────────────────────────────

interface EventFormData {
  title: string;
  description: string;
  imageUrl: string;
  sport: string;
  type: string;
  status: string;
  targetDistance: string;
  minDistance: string;
  maxDistance: string;
  startDate: string;
  endDate: string;
  xpReward: string;
  medalName: string;
  medalIcon: string;
  isPaid: boolean;
  price: string;
}

const emptyEventForm: EventFormData = {
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

function eventToForm(e: Event): EventFormData {
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

function EventFormModal({ initial, onSave, onClose, saving, eventId }: {
  initial: EventFormData;
  onSave: (data: EventFormData) => void;
  onClose: () => void;
  saving: boolean;
  eventId?: string;
}) {
  const [form, setForm] = useState<EventFormData>(initial);
  const [bgFile, setBgFile] = useState<File | null>(null);
  const [bgPreview, setBgPreview] = useState<string>('');
  const [bgUploading, setBgUploading] = useState(false);
  const isEdit = initial.title !== '';

  const set = (key: keyof EventFormData, value: string | boolean) =>
    setForm(prev => ({ ...prev, [key]: value }));

  return (
    <div style={styles.overlay} onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={styles.modal}>
        <h3 style={{ fontSize: 22, fontWeight: 900, color: TEXT, marginBottom: 24 }}>
          {isEdit ? 'Редактирование события' : 'Создание события'}
        </h3>

        <div style={styles.fieldGroup}>
          <label style={styles.label}>Название *</label>
          <input style={styles.input} value={form.title} onChange={e => set('title', e.target.value)} placeholder="Название события" />
        </div>

        <div style={styles.fieldGroup}>
          <label style={styles.label}>Описание</label>
          <textarea
            style={{ ...styles.input, minHeight: 80, resize: 'vertical' as const }}
            value={form.description}
            onChange={e => set('description', e.target.value)}
            placeholder="Описание события"
          />
        </div>

        <div style={styles.grid2}>
          <div style={styles.fieldGroup}>
            <label style={styles.label}>Вид спорта *</label>
            <select style={styles.select} value={form.sport} onChange={e => set('sport', e.target.value)}>
              {SPORT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
          <div style={styles.fieldGroup}>
            <label style={styles.label}>Тип *</label>
            <select style={styles.select} value={form.type} onChange={e => set('type', e.target.value)}>
              {TYPE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
        </div>

        <div style={styles.fieldGroup}>
          <label style={styles.label}>Статус</label>
          <select style={styles.select} value={form.status} onChange={e => set('status', e.target.value)}>
            {STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>

        <div style={styles.grid3}>
          <div style={styles.fieldGroup}>
            <label style={styles.label}>Целевая дистанция (км)</label>
            <input style={styles.input} type="number" step="0.1" value={form.targetDistance} onChange={e => set('targetDistance', e.target.value)} />
          </div>
          <div style={styles.fieldGroup}>
            <label style={styles.label}>Мин. дистанция (км)</label>
            <input style={styles.input} type="number" step="0.1" value={form.minDistance} onChange={e => set('minDistance', e.target.value)} />
          </div>
          <div style={styles.fieldGroup}>
            <label style={styles.label}>Макс. дистанция (км)</label>
            <input style={styles.input} type="number" step="0.1" value={form.maxDistance} onChange={e => set('maxDistance', e.target.value)} />
          </div>
        </div>

        <div style={styles.grid2}>
          <div style={styles.fieldGroup}>
            <label style={styles.label}>Дата начала *</label>
            <input style={styles.input} type="datetime-local" value={form.startDate} onChange={e => set('startDate', e.target.value)} />
          </div>
          <div style={styles.fieldGroup}>
            <label style={styles.label}>Дата окончания *</label>
            <input style={styles.input} type="datetime-local" value={form.endDate} onChange={e => set('endDate', e.target.value)} />
          </div>
        </div>

        <div style={styles.grid3}>
          <div style={styles.fieldGroup}>
            <label style={styles.label}>XP награда</label>
            <input style={styles.input} type="number" value={form.xpReward} onChange={e => set('xpReward', e.target.value)} />
          </div>
          <div style={styles.fieldGroup}>
            <label style={styles.label}>Название медали</label>
            <input style={styles.input} value={form.medalName} onChange={e => set('medalName', e.target.value)} placeholder="Финишёр" />
          </div>
          <div style={styles.fieldGroup}>
            <label style={styles.label}>Иконка медали</label>
            <input style={styles.input} value={form.medalIcon} onChange={e => set('medalIcon', e.target.value)} placeholder="🏅" />
          </div>
        </div>

        <div style={styles.fieldGroup}>
          <label style={styles.label}>Картинка события</label>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <input style={{ ...styles.input, flex: 1 }} value={form.imageUrl} onChange={e => set('imageUrl', e.target.value)} placeholder="URL или загрузите файл →" />
            {eventId && (
              <label style={{
                padding: '8px 16px', borderRadius: 8, border: '2px dashed #fc4c02',
                background: '#fff8f5', color: '#fc4c02', fontSize: 13, fontWeight: 700,
                cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0,
              }}>
                📷 Загрузить
                <input type="file" accept="image/*" style={{ display: 'none' }}
                  onChange={async (e) => {
                    const f = e.target.files?.[0];
                    if (!f || !eventId) return;
                    try {
                      const res = await api.events.uploadImage(eventId, f);
                      set('imageUrl', res.imageUrl);
                    } catch { alert('Ошибка загрузки'); }
                  }}
                />
              </label>
            )}
          </div>
          {form.imageUrl && <img src={form.imageUrl} alt="" style={{ marginTop: 8, maxWidth: 200, borderRadius: 8, border: '1px solid #e0e0e0' }} />}
        </div>

        <div style={styles.fieldGroup}>
          <label style={styles.label}>Фон диплома (изображение A4 landscape)</label>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <label style={{
              padding: '8px 20px', borderRadius: 8, border: `2px dashed ${BRAND}`,
              background: '#fff8f5', color: BRAND, fontSize: 13, fontWeight: 700,
              cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6,
            }}>
              🖼️ {bgFile ? bgFile.name : 'Выбрать файл'}
              <input type="file" accept="image/*" style={{ display: 'none' }}
                onChange={e => {
                  const f = e.target.files?.[0];
                  if (f) {
                    setBgFile(f);
                    setBgPreview(URL.createObjectURL(f));
                  }
                }}
              />
            </label>
            {eventId && bgFile && !bgUploading && (
              <button type="button" onClick={async () => {
                setBgUploading(true);
                try {
                  await api.events.uploadDiplomaBg(eventId, bgFile);
                  setBgFile(null);
                  setBgPreview('');
                  alert('Фон диплома загружен!');
                } catch { alert('Ошибка загрузки'); }
                finally { setBgUploading(false); }
              }} style={{
                padding: '8px 16px', borderRadius: 8, border: 'none',
                background: BRAND, color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer',
              }}>
                {bgUploading ? 'Загрузка...' : 'Загрузить'}
              </button>
            )}
            {!eventId && bgFile && (
              <span style={{ fontSize: 12, color: '#999' }}>Сохраните событие, затем загрузите фон</span>
            )}
          </div>
          {bgPreview && (
            <img src={bgPreview} alt="preview" style={{ marginTop: 8, maxWidth: 300, borderRadius: 8, border: '1px solid #e0e0e0' }} />
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 16 }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 14, fontWeight: 700, color: TEXT }}>
            <input
              type="checkbox"
              checked={form.isPaid}
              onChange={e => set('isPaid', e.target.checked)}
              style={{ width: 18, height: 18, accentColor: BRAND }}
            />
            Платное участие
          </label>
          {form.isPaid && (
            <div style={{ flex: 1, maxWidth: 200 }}>
              <input style={styles.input} type="number" value={form.price} onChange={e => set('price', e.target.value)} placeholder="Цена, руб." />
            </div>
          )}
        </div>

        <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 24 }}>
          <button style={styles.btn('secondary')} onClick={onClose}>Отмена</button>
          <button
            style={{ ...styles.btn('primary'), opacity: saving ? 0.6 : 1 }}
            disabled={saving}
            onClick={() => onSave(form)}
          >
            {saving ? 'Сохранение...' : isEdit ? 'Сохранить' : 'Создать'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Package Form ────────────────────────────────────────

interface PackageFormData {
  name: string;
  price: string;
  icon: string;
  features: string;
  description: string;
  isActive: boolean;
  sortOrder: string;
}

const emptyPackageForm: PackageFormData = {
  name: '',
  price: '0',
  icon: '🎫',
  features: '',
  description: '',
  isActive: true,
  sortOrder: '0',
};

function pkgToForm(p: MerchPackage): PackageFormData {
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

function PackageFormModal({ initial, onSave, onClose, saving, packageId }: {
  initial: PackageFormData;
  onSave: (data: PackageFormData) => void;
  onClose: () => void;
  saving: boolean;
  packageId?: string;
}) {
  const [form, setForm] = useState<PackageFormData>(initial);
  const [imgFile, setImgFile] = useState<File | null>(null);
  const [imgPreview, setImgPreview] = useState<string>('');
  const [imgUploading, setImgUploading] = useState(false);
  const isEdit = initial.name !== '';

  const set = (key: keyof PackageFormData, value: string | boolean) =>
    setForm(prev => ({ ...prev, [key]: value }));

  return (
    <div style={styles.overlay} onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{ ...styles.modal, maxWidth: 520 }}>
        <h3 style={{ fontSize: 22, fontWeight: 900, color: TEXT, marginBottom: 24 }}>
          {isEdit ? 'Редактирование пакета' : 'Создание пакета'}
        </h3>

        <div style={styles.fieldGroup}>
          <label style={styles.label}>Название *</label>
          <input style={styles.input} value={form.name} onChange={e => set('name', e.target.value)} placeholder="Название пакета" />
        </div>

        <div style={styles.fieldGroup}>
          <label style={styles.label}>Описание</label>
          <textarea
            style={{ ...styles.input, minHeight: 60, resize: 'vertical' as const }}
            value={form.description}
            onChange={e => set('description', e.target.value)}
            placeholder="Краткое описание пакета"
          />
        </div>

        <div style={styles.grid2}>
          <div style={styles.fieldGroup}>
            <label style={styles.label}>Цена (руб.)</label>
            <input style={styles.input} type="number" value={form.price} onChange={e => set('price', e.target.value)} />
          </div>
          <div style={styles.fieldGroup}>
            <label style={styles.label}>Иконка (emoji)</label>
            <input style={styles.input} value={form.icon} onChange={e => set('icon', e.target.value)} placeholder="🎫" />
          </div>
        </div>

        <div style={styles.fieldGroup}>
          <label style={styles.label}>Изображение пакета</label>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <label style={{
              padding: '8px 20px', borderRadius: 8, border: `2px dashed ${BRAND}`,
              background: '#fff8f5', color: BRAND, fontSize: 13, fontWeight: 700,
              cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6,
            }}>
              🖼️ {imgFile ? imgFile.name : 'Выбрать файл'}
              <input type="file" accept="image/*" style={{ display: 'none' }}
                onChange={e => {
                  const f = e.target.files?.[0];
                  if (f) {
                    setImgFile(f);
                    setImgPreview(URL.createObjectURL(f));
                  }
                }}
              />
            </label>
            {packageId && imgFile && !imgUploading && (
              <button type="button" onClick={async () => {
                setImgUploading(true);
                try {
                  await api.packages.uploadImage(packageId, imgFile);
                  setImgFile(null);
                  setImgPreview('');
                  alert('Изображение загружено!');
                } catch { alert('Ошибка загрузки'); }
                finally { setImgUploading(false); }
              }} style={{
                padding: '8px 16px', borderRadius: 8, border: 'none',
                background: BRAND, color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer',
              }}>
                {imgUploading ? 'Загрузка...' : 'Загрузить'}
              </button>
            )}
            {!packageId && imgFile && (
              <span style={{ fontSize: 12, color: '#999' }}>Сохраните пакет, затем загрузите изображение</span>
            )}
          </div>
          {imgPreview && (
            <img src={imgPreview} alt="preview" style={{ marginTop: 8, maxWidth: 200, maxHeight: 120, borderRadius: 8, border: '1px solid #e0e0e0', objectFit: 'cover' }} />
          )}
        </div>

        <div style={styles.fieldGroup}>
          <label style={styles.label}>Фичи (по одной на строку)</label>
          <textarea
            style={{ ...styles.input, minHeight: 120, resize: 'vertical' as const }}
            value={form.features}
            onChange={e => set('features', e.target.value)}
            placeholder={'Участие в событии\nЭлектронный диплом\nПопадание в рейтинг'}
          />
        </div>

        <div style={styles.grid2}>
          <div style={styles.fieldGroup}>
            <label style={styles.label}>Порядок сортировки</label>
            <input style={styles.input} type="number" value={form.sortOrder} onChange={e => set('sortOrder', e.target.value)} />
          </div>
          <div style={{ ...styles.fieldGroup, display: 'flex', alignItems: 'flex-end' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 14, fontWeight: 700, color: TEXT, paddingBottom: 10 }}>
              <input
                type="checkbox"
                checked={form.isActive}
                onChange={e => set('isActive', e.target.checked)}
                style={{ width: 18, height: 18, accentColor: BRAND }}
              />
              Активен
            </label>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 24 }}>
          <button style={styles.btn('secondary')} onClick={onClose}>Отмена</button>
          <button
            style={{ ...styles.btn('primary'), opacity: saving ? 0.6 : 1 }}
            disabled={saving}
            onClick={() => onSave(form)}
          >
            {saving ? 'Сохранение...' : isEdit ? 'Сохранить' : 'Создать'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Achievement Form Modal ─────────────────────────────

const ACH_CATEGORY_OPTIONS = [
  { value: 'distance', label: 'Дистанция' },
  { value: 'streak', label: 'Стрик' },
  { value: 'events', label: 'События' },
  { value: 'social', label: 'Социальные' },
  { value: 'speed', label: 'Скорость' },
];

interface AchFormData {
  name: string;
  description: string;
  icon: string;
  iconFile: File | null;
  iconPreview: string;
  xpReward: string;
  category: string;
  threshold: string;
}

function AchievementFormModal({ initial, onSave, onClose, saving, isEditing }: {
  initial: AchFormData;
  onSave: (form: AchFormData) => void;
  onClose: () => void;
  saving: boolean;
  isEditing: boolean;
}) {
  const [form, setForm] = useState<AchFormData>(initial);

  const set = (key: keyof AchFormData, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleIconFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const preview = URL.createObjectURL(file);
    setForm((prev) => ({ ...prev, iconFile: file, iconPreview: preview, icon: '' }));
  };

  const clearIconFile = () => {
    setForm((prev) => ({ ...prev, iconFile: null, iconPreview: '', icon: '🏅' }));
  };

  const displayIcon = form.iconPreview || form.icon;

  return (
    <div style={styles.overlay} onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={styles.modal}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h3 style={{ fontSize: 22, fontWeight: 900, color: TEXT, margin: 0 }}>
            {isEditing ? 'Редактировать достижение' : 'Новое достижение'}
          </h3>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', fontSize: 24, color: '#888', cursor: 'pointer', padding: '4px 8px' }}
          >
            x
          </button>
        </div>

        <div style={styles.fieldGroup}>
          <label style={styles.label}>Название</label>
          <input style={styles.input} value={form.name} onChange={e => set('name', e.target.value)} placeholder="Первые 10 км" />
        </div>

        <div style={styles.fieldGroup}>
          <label style={styles.label}>Описание</label>
          <input style={styles.input} value={form.description} onChange={e => set('description', e.target.value)} placeholder="Пробеги 10 км суммарно" />
        </div>

        <div style={styles.grid3}>
          <div style={styles.fieldGroup}>
            <label style={styles.label}>Иконка (изображение)</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {form.iconPreview ? (
                <div style={{ position: 'relative' as const }}>
                  <img src={form.iconPreview} alt="Иконка" style={{ width: 48, height: 48, borderRadius: 8, objectFit: 'cover', border: `1px solid ${BORDER}` }} />
                  <button
                    type="button"
                    onClick={clearIconFile}
                    style={{ position: 'absolute' as const, top: -6, right: -6, width: 18, height: 18, borderRadius: '50%', background: '#dc2626', color: '#fff', border: 'none', fontSize: 11, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1, padding: 0 }}
                  >
                    x
                  </button>
                </div>
              ) : (
                <div style={{ fontSize: 32, width: 48, height: 48, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f5f5f5', borderRadius: 8, border: `1px solid ${BORDER}` }}>
                  {form.icon || '🏅'}
                </div>
              )}
              <label style={{ ...styles.btn('secondary'), display: 'inline-flex', alignItems: 'center', cursor: 'pointer', fontSize: 12, padding: '6px 12px' }}>
                Загрузить
                <input type="file" accept="image/*" onChange={handleIconFile} style={{ display: 'none' }} />
              </label>
            </div>
          </div>
          <div style={styles.fieldGroup}>
            <label style={styles.label}>XP награда</label>
            <input style={styles.input} type="number" value={form.xpReward} onChange={e => set('xpReward', e.target.value)} placeholder="25" />
          </div>
          <div style={styles.fieldGroup}>
            <label style={styles.label}>Порог</label>
            <input style={styles.input} type="number" value={form.threshold} onChange={e => set('threshold', e.target.value)} placeholder="10" />
          </div>
        </div>

        <div style={styles.fieldGroup}>
          <label style={styles.label}>Категория</label>
          <select style={styles.select} value={form.category} onChange={e => set('category', e.target.value)}>
            {ACH_CATEGORY_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>

        {(displayIcon || form.name) && (
          <div style={{ textAlign: 'center', margin: '16px 0', padding: 20, background: '#f9f9f9', borderRadius: 12 }}>
            {form.iconPreview ? (
              <img src={form.iconPreview} alt="Предпросмотр" style={{ width: 56, height: 56, borderRadius: 10, objectFit: 'cover', marginBottom: 8 }} />
            ) : (
              <div style={{ fontSize: 48, marginBottom: 8 }}>{form.icon || '🏅'}</div>
            )}
            <div style={{ fontSize: 15, fontWeight: 700, color: TEXT }}>{form.name || 'Название'}</div>
            <div style={{ fontSize: 12, color: '#888', marginTop: 2 }}>{form.description || 'Описание'}</div>
            <div style={{ fontSize: 12, fontWeight: 700, color: BRAND, marginTop: 4 }}>+{form.xpReward || 0} XP</div>
          </div>
        )}

        <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 20 }}>
          <button style={styles.btn('secondary')} onClick={onClose}>Отмена</button>
          <button style={styles.btn('primary')} onClick={() => onSave(form)} disabled={saving}>
            {saving ? 'Сохранение...' : 'Сохранить'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Confirm Dialog ──────────────────────────────────────

function ConfirmDialog({ message, onConfirm, onCancel }: {
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div style={styles.overlay} onClick={(e) => { if (e.target === e.currentTarget) onCancel(); }}>
      <div style={{ ...styles.modal, maxWidth: 400, textAlign: 'center' as const }}>
        <p style={{ fontSize: 16, fontWeight: 600, color: TEXT, marginBottom: 24 }}>{message}</p>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
          <button style={styles.btn('secondary')} onClick={onCancel}>Отмена</button>
          <button style={styles.btn('danger')} onClick={onConfirm}>Удалить</button>
        </div>
      </div>
    </div>
  );
}

// ─── Admin Stats Types ──────────────────────────────────

interface AdminStats {
  totalUsers: number;
  totalEvents: number;
  totalActivities: number;
  totalTeams: number;
  newUsersThisWeek: number;
  newUsersThisMonth: number;
  totalDistance: number;
  topUsers: { id: string; username: string; avatarUrl?: string; totalDistance: number; level: number; city?: string }[];
  recentActivities: { id: string; sport: string; title?: string; distance: number; duration: number; createdAt: string; user: { id: string; username: string; avatarUrl?: string } }[];
  eventParticipation: { id: string; title: string; participantCount: number }[];
}

interface AdminUser {
  id: string;
  username: string;
  email: string;
  role: string;
  city?: string;
  level: number;
  xp: number;
  totalDistance: number;
  totalActivities: number;
  currentStreak: number;
  referralCode: string;
  referredById?: string;
  createdAt: string;
  _count: { referrals: number };
}

const ROLE_COLORS: Record<string, string> = {
  USER: '#888',
  MODERATOR: '#2563eb',
  ADMIN: '#dc2626',
};

function formatDurationShort(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}ч ${m}м`;
  return `${m}м`;
}

// ─── Stats Tab ──────────────────────────────────────────

const STAT_CARD_META: { label: string; key: keyof AdminStats; color: string; bgColor: string; icon: string; note?: string }[] = [
  { label: 'Пользователи', key: 'totalUsers', color: '#2563eb', bgColor: '#eff6ff', icon: '👥' },
  { label: 'События', key: 'totalEvents', color: '#7c3aed', bgColor: '#f5f3ff', icon: '🏆' },
  { label: 'Активности', key: 'totalActivities', color: '#16a34a', bgColor: '#f0fdf4', icon: '⚡' },
  { label: 'Команды', key: 'totalTeams', color: '#ea580c', bgColor: '#fff7ed', icon: '🤝' },
  { label: 'Новых за неделю', key: 'newUsersThisWeek', color: '#0891b2', bgColor: '#ecfeff', icon: '📈' },
  { label: 'За месяц', key: 'newUsersThisMonth', color: '#9333ea', bgColor: '#faf5ff', icon: '📅' },
];

function UserAvatar({ username, avatarUrl, size = 32 }: { username: string; avatarUrl?: string; size?: number }) {
  if (avatarUrl) {
    return <img src={avatarUrl} alt="" style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />;
  }
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%', background: BRAND, color: '#fff',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: size * 0.4, fontWeight: 700, flexShrink: 0,
    }}>
      {(username ?? '?')[0].toUpperCase()}
    </div>
  );
}

function StatsTab() {
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  useEffect(() => {
    const h = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', h);
    return () => window.removeEventListener('resize', h);
  }, []);
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    setLoading(true);
    api.admin.stats()
      .then(setStats)
      .catch((err: unknown) => setError(err instanceof Error ? err.message : 'Ошибка загрузки'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div style={{ textAlign: 'center', padding: 60, color: '#888', fontSize: 15 }}>Загрузка...</div>;
  if (error) return <div style={{ padding: '12px 16px', background: '#fff0f0', color: '#c00', borderRadius: 10, fontSize: 14 }}>{error}</div>;
  if (!stats) return null;

  const totalDistanceVal = `${(stats.totalDistance ?? 0).toFixed(1)} км`;

  return (
    <div>
      {/* Summary stat cards */}
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(3, 1fr)', gap: 16, marginBottom: 24 }}>
        {STAT_CARD_META.map((card) => {
          const rawVal = stats[card.key];
          const value = typeof rawVal === 'number' ? rawVal : 0;
          return (
            <div key={card.label} style={{
              background: '#fff',
              borderRadius: 14,
              border: `1px solid ${BORDER}`,
              padding: '20px 20px 18px',
              display: 'flex',
              alignItems: 'flex-start',
              gap: 14,
            }}>
              <div style={{
                width: 46, height: 46, borderRadius: 12, background: card.bgColor,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 22, flexShrink: 0,
              }}>
                {card.icon}
              </div>
              <div>
                <div style={{ fontSize: 26, fontWeight: 900, color: card.color, lineHeight: 1 }}>{value.toLocaleString('ru-RU')}</div>
                <div style={{ fontSize: 12, color: '#888', marginTop: 5, fontWeight: 600 }}>{card.label}</div>
              </div>
            </div>
          );
        })}
        {/* Total distance card */}
        <div style={{
          background: '#fff',
          borderRadius: 14,
          border: `1px solid ${BORDER}`,
          padding: '20px 20px 18px',
          display: 'flex',
          alignItems: 'flex-start',
          gap: 14,
        }}>
          <div style={{
            width: 46, height: 46, borderRadius: 12, background: '#fff8f5',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 22, flexShrink: 0,
          }}>
            🏃
          </div>
          <div>
            <div style={{ fontSize: 22, fontWeight: 900, color: BRAND, lineHeight: 1 }}>{totalDistanceVal}</div>
            <div style={{ fontSize: 12, color: '#888', marginTop: 5, fontWeight: 600 }}>Общая дистанция</div>
          </div>
        </div>
      </div>

      {/* Top 5 users */}
      <div style={{ background: '#fff', borderRadius: 14, border: `1px solid ${BORDER}`, padding: 24, marginBottom: 16, overflowX: isMobile ? 'auto' : undefined }}>
        <div style={{ fontSize: 17, fontWeight: 800, color: TEXT, marginBottom: 16 }}>
          Топ-5 пользователей по дистанции
        </div>
        <table style={{ ...styles.table, minWidth: isMobile ? 500 : undefined }}>
          <thead>
            <tr>
              <th style={styles.th}>#</th>
              <th style={styles.th}>Пользователь</th>
              <th style={styles.th}>Город</th>
              <th style={styles.th}>Уровень</th>
              <th style={styles.th}>Дистанция</th>
            </tr>
          </thead>
          <tbody>
            {stats.topUsers.map((u, idx) => (
              <tr key={u.id} style={{ background: idx % 2 === 0 ? '#fff' : '#fafafa' }}>
                <td style={{ ...styles.td, fontWeight: 800, color: idx === 0 ? '#f59e0b' : idx === 1 ? '#94a3b8' : idx === 2 ? '#d97706' : '#aaa', width: 36 }}>
                  {idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : idx + 1}
                </td>
                <td style={{ ...styles.td, fontWeight: 700 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <UserAvatar username={u.username} avatarUrl={u.avatarUrl} size={34} />
                    <span>{u.username}</span>
                  </div>
                </td>
                <td style={{ ...styles.td, color: '#666' }}>{u.city ?? '—'}</td>
                <td style={styles.td}>
                  <span style={{ padding: '2px 10px', background: '#f5f5f5', borderRadius: 20, fontSize: 12, fontWeight: 700 }}>
                    Ур. {u.level}
                  </span>
                </td>
                <td style={{ ...styles.td, fontWeight: 800, color: BRAND }}>{(u.totalDistance ?? 0).toFixed(1)} км</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Recent activities */}
      <div style={{ background: '#fff', borderRadius: 14, border: `1px solid ${BORDER}`, padding: 24 }}>
        <div style={{ fontSize: 17, fontWeight: 800, color: TEXT, marginBottom: 16 }}>
          Последние активности
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
          {stats.recentActivities.map((a, idx) => (
            <div key={a.id} style={{
              display: 'flex',
              alignItems: 'center',
              gap: 14,
              padding: '12px 0',
              borderBottom: idx < stats.recentActivities.length - 1 ? `1px solid ${BORDER}` : 'none',
            }}>
              <UserAvatar username={a.user.username} avatarUrl={a.user.avatarUrl} size={36} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: TEXT }}>
                  {a.user.username} — {a.title ?? a.sport}
                </div>
                <div style={{ fontSize: 12, color: '#888', marginTop: 2 }}>
                  {(a.distance ?? 0).toFixed(1)} км · {formatDurationShort(a.duration ?? 0)}
                </div>
              </div>
              <div style={{ fontSize: 11, color: '#aaa', flexShrink: 0 }}>
                {new Date(a.createdAt).toLocaleDateString('ru-RU')}
              </div>
            </div>
          ))}
          {stats.recentActivities.length === 0 && (
            <div style={{ textAlign: 'center', color: '#888', padding: 32, fontSize: 14 }}>Нет активностей</div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Users Tab ──────────────────────────────────────────

function UsersTab() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [search, setSearch] = useState('');
  const [localFilter, setLocalFilter] = useState('');
  const [roleEdits, setRoleEdits] = useState<Record<string, string>>({});
  const [savingRole, setSavingRole] = useState<string | null>(null);
  const [hoveredRow, setHoveredRow] = useState<string | null>(null);
  const [confirmDeleteUser, setConfirmDeleteUser] = useState<AdminUser | null>(null);
  const [deletingUser, setDeletingUser] = useState<string | null>(null);
  const [xpModal, setXpModal] = useState<AdminUser | null>(null);
  const [xpAmount, setXpAmount] = useState('');
  const [xpReason, setXpReason] = useState('');
  const [savingXp, setSavingXp] = useState(false);

  const loadUsers = useCallback(async (searchVal?: string) => {
    setLoading(true);
    setError('');
    try {
      const res = await api.admin.users(searchVal ? { search: searchVal } : undefined);
      setUsers(res);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Ошибка загрузки');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const handleSearch = useCallback(() => {
    loadUsers(search);
  }, [search, loadUsers]);

  const handleRoleChange = useCallback(async (userId: string) => {
    const newRole = roleEdits[userId];
    if (!newRole) return;
    setSavingRole(userId);
    setError('');
    try {
      await api.admin.setRole(userId, newRole);
      setUsers((prev) => prev.map((u) => u.id === userId ? { ...u, role: newRole } : u));
      setRoleEdits((prev) => {
        const next = { ...prev };
        delete next[userId];
        return next;
      });
      setSuccess('Роль обновлена');
      setTimeout(() => setSuccess(''), 2000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Ошибка обновления роли');
    } finally {
      setSavingRole(null);
    }
  }, [roleEdits]);

  const handleDeleteUser = useCallback(async (userId: string) => {
    setDeletingUser(userId);
    try {
      await api.admin.deleteUser(userId);
      setUsers((prev) => prev.filter((u) => u.id !== userId));
      setSuccess('Пользователь удалён');
      setTimeout(() => setSuccess(''), 2000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Ошибка удаления');
    } finally {
      setDeletingUser(null);
      setConfirmDeleteUser(null);
    }
  }, []);

  const handleGiveXp = useCallback(async () => {
    if (!xpModal) return;
    const amount = parseInt(xpAmount, 10);
    if (isNaN(amount)) { setError('Введите число'); return; }
    setSavingXp(true);
    try {
      const updated = await api.admin.giveXp(xpModal.id, amount, xpReason || undefined);
      setUsers((prev) => prev.map((u) => u.id === xpModal.id ? { ...u, xp: updated.xp, level: updated.level } : u));
      setSuccess(`XP обновлён: ${updated.xp} XP, уровень ${updated.level}`);
      setTimeout(() => setSuccess(''), 3000);
      setXpModal(null);
      setXpAmount('');
      setXpReason('');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Ошибка начисления XP');
    } finally {
      setSavingXp(false);
    }
  }, [xpModal, xpAmount, xpReason]);

  const filteredUsers = localFilter.trim()
    ? users.filter((u) => {
        const q = localFilter.toLowerCase();
        return (
          u.username.toLowerCase().includes(q) ||
          u.email.toLowerCase().includes(q) ||
          (u.city ?? '').toLowerCase().includes(q)
        );
      })
    : users;

  return (
    <div>
      {error && <div style={{ padding: '10px 14px', background: '#fff0f0', color: '#c00', borderRadius: 8, fontSize: 13, fontWeight: 600, marginBottom: 16 }}>{error}</div>}
      {success && <div style={{ padding: '10px 14px', background: '#f0fff0', color: '#16a34a', borderRadius: 8, fontSize: 13, fontWeight: 600, marginBottom: 16 }}>{success}</div>}

      {/* Search bar */}
      <div style={{ background: '#fff', borderRadius: 14, border: `1px solid ${BORDER}`, padding: 16, marginBottom: 16 }}>
        <div style={{ display: 'flex', gap: 8 }}>
          <div style={{ flex: 1, position: 'relative' as const }}>
            <input
              style={{ ...styles.input, paddingLeft: 40 }}
              value={search}
              onChange={(e) => { setSearch(e.target.value); setLocalFilter(e.target.value); }}
              placeholder="Поиск по имени, email или городу..."
              onKeyDown={(e) => { if (e.key === 'Enter') handleSearch(); }}
            />
            <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#aaa', fontSize: 16, pointerEvents: 'none' }}>
              🔍
            </span>
          </div>
          <button style={styles.btn('primary')} onClick={handleSearch}>Найти</button>
        </div>
        {filteredUsers.length !== users.length && (
          <div style={{ fontSize: 12, color: '#888', marginTop: 8 }}>
            Показано: {filteredUsers.length} из {users.length}
          </div>
        )}
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 60, color: '#888', fontSize: 15 }}>Загрузка...</div>
      ) : (
        <div style={{ background: '#fff', borderRadius: 14, border: `1px solid ${BORDER}`, overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={styles.table}>
              <thead>
                <tr style={{ background: '#fafafa' }}>
                  <th style={styles.th}>Пользователь</th>
                  <th style={styles.th}>Email</th>
                  <th style={styles.th}>Роль</th>
                  <th style={styles.th}>Город</th>
                  <th style={styles.th}>Уровень / XP</th>
                  <th style={styles.th}>Дистанция</th>
                  <th style={styles.th}>Рефералы</th>
                  <th style={styles.th}>Дата рег.</th>
                  <th style={styles.th}>Действия</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((u, idx) => {
                  const currentEditRole = roleEdits[u.id];
                  const displayRole = currentEditRole ?? u.role;
                  const isDirty = currentEditRole != null && currentEditRole !== u.role;
                  const isHovered = hoveredRow === u.id;
                  return (
                    <tr
                      key={u.id}
                      onMouseEnter={() => setHoveredRow(u.id)}
                      onMouseLeave={() => setHoveredRow(null)}
                      style={{ background: isHovered ? '#fff8f5' : idx % 2 === 0 ? '#fff' : '#fafafa', transition: 'background 0.1s' }}
                    >
                      <td style={{ ...styles.td, fontWeight: 700 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <UserAvatar username={u.username} size={28} />
                          {u.username}
                        </div>
                      </td>
                      <td style={{ ...styles.td, fontSize: 12, color: '#666' }}>{u.email}</td>
                      <td style={styles.td}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <select
                            value={displayRole}
                            onChange={(e) => setRoleEdits((prev) => ({ ...prev, [u.id]: e.target.value }))}
                            style={{
                              padding: '4px 8px',
                              borderRadius: 6,
                              border: `1.5px solid ${ROLE_COLORS[displayRole] ?? '#888'}`,
                              fontSize: 12,
                              fontWeight: 700,
                              color: ROLE_COLORS[displayRole] ?? '#888',
                              background: '#fff',
                              outline: 'none',
                              cursor: 'pointer',
                            }}
                          >
                            <option value="USER">USER</option>
                            <option value="MODERATOR">MODERATOR</option>
                            <option value="ADMIN">ADMIN</option>
                          </select>
                          {isDirty && (
                            <button
                              title="Сохранить роль"
                              style={{ ...styles.iconBtn('#fff', BRAND), opacity: savingRole === u.id ? 0.6 : 1, fontSize: 11 }}
                              disabled={savingRole === u.id}
                              onClick={() => handleRoleChange(u.id)}
                            >
                              {savingRole === u.id ? '…' : '✓'}
                            </button>
                          )}
                        </div>
                      </td>
                      <td style={{ ...styles.td, color: '#666' }}>{u.city ?? '—'}</td>
                      <td style={styles.td}>
                        <span style={{ padding: '2px 8px', background: '#f5f5f5', borderRadius: 20, fontSize: 12, fontWeight: 700 }}>
                          Ур.{u.level}
                        </span>
                        <span style={{ marginLeft: 4, fontSize: 11, color: '#888' }}>{u.xp} XP</span>
                      </td>
                      <td style={{ ...styles.td, fontWeight: 600, color: BRAND }}>{(u.totalDistance ?? 0).toFixed(1)} км</td>
                      <td style={{ ...styles.td, textAlign: 'center' }}>{u._count?.referrals ?? 0}</td>
                      <td style={{ ...styles.td, fontSize: 12, color: '#888', whiteSpace: 'nowrap' }}>
                        {new Date(u.createdAt).toLocaleDateString('ru-RU')}
                      </td>
                      <td style={{ ...styles.td, whiteSpace: 'nowrap' }}>
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button
                            title="Начислить / списать XP"
                            style={styles.iconBtn('#475569', '#f1f5f9')}
                            onClick={() => { setXpModal(u); setXpAmount(''); setXpReason(''); }}
                          >⚡</button>
                          <button
                            title="Удалить пользователя"
                            style={{ ...styles.iconBtn('#fff', '#ef4444'), opacity: deletingUser === u.id ? 0.6 : 1 }}
                            disabled={deletingUser === u.id}
                            onClick={() => setConfirmDeleteUser(u)}
                          >🗑</button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {filteredUsers.length === 0 && (
                  <tr>
                    <td colSpan={9} style={{ ...styles.td, textAlign: 'center', color: '#888', padding: 48 }}>
                      Пользователи не найдены
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Delete user confirm */}
      {confirmDeleteUser && (
        <ConfirmDialog
          message={`Удалить пользователя "${confirmDeleteUser.username}"? Все его данные будут удалены безвозвратно.`}
          onConfirm={() => handleDeleteUser(confirmDeleteUser.id)}
          onCancel={() => setConfirmDeleteUser(null)}
        />
      )}

      {/* Give XP modal */}
      {xpModal && (
        <div style={styles.overlay} onClick={(e) => { if (e.target === e.currentTarget) setXpModal(null); }}>
          <div style={{ ...styles.modal, maxWidth: 400 }}>
            <h3 style={{ fontSize: 20, fontWeight: 900, color: TEXT, marginBottom: 20 }}>
              ⚡ XP для {xpModal.username}
            </h3>
            <div style={{ fontSize: 13, color: '#888', marginBottom: 16 }}>
              Текущий XP: <strong>{xpModal.xp}</strong> · Уровень: <strong>{xpModal.level}</strong>
            </div>
            <div style={styles.fieldGroup}>
              <label style={styles.label}>Количество XP (отрицательное = списание) *</label>
              <input
                style={styles.input}
                type="number"
                value={xpAmount}
                onChange={(e) => setXpAmount(e.target.value)}
                placeholder="+100 или -50"
                autoFocus
              />
            </div>
            <div style={styles.fieldGroup}>
              <label style={styles.label}>Причина (необязательно)</label>
              <input
                style={styles.input}
                value={xpReason}
                onChange={(e) => setXpReason(e.target.value)}
                placeholder="Бонус за активность..."
              />
            </div>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 8 }}>
              <button style={styles.btn('secondary')} onClick={() => setXpModal(null)}>Отмена</button>
              <button
                style={{ ...styles.btn('primary'), opacity: savingXp ? 0.6 : 1 }}
                disabled={savingXp || !xpAmount}
                onClick={handleGiveXp}
              >
                {savingXp ? 'Сохранение...' : 'Применить'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Activities Tab ──────────────────────────────────────

interface AdminActivity {
  id: string;
  sport: string;
  title?: string;
  distance: number;
  duration: number;
  startedAt?: string;
  createdAt: string;
  user: { id: string; username: string; avatarUrl?: string; level: number };
}

const SPORT_LABELS: Record<string, string> = {
  RUNNING: 'Бег',
  CYCLING: 'Вело',
  SKIING: 'Лыжи',
  WALKING: 'Ходьба',
  SWIMMING: 'Плавание',
  TRIATHLON: 'Три',
};
const SPORT_COLORS: Record<string, string> = {
  RUNNING: '#fc4c02',
  CYCLING: '#2563eb',
  SKIING: '#0891b2',
  WALKING: '#16a34a',
  SWIMMING: '#7c3aed',
  TRIATHLON: '#ea580c',
};

interface EditActivityForm {
  sport: string;
  title: string;
  description: string;
  distance: string;
  duration: string;
  startedAt: string;
  calories: string;
  elevGain: string;
}

function ActivitiesTab() {
  const [activities, setActivities] = useState<AdminActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [confirmDelete, setConfirmDelete] = useState<AdminActivity | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [hoveredRow, setHoveredRow] = useState<string | null>(null);
  const [editModal, setEditModal] = useState<AdminActivity | null>(null);
  const [editForm, setEditForm] = useState<EditActivityForm>({ sport: '', title: '', description: '', distance: '', duration: '', startedAt: '', calories: '', elevGain: '' });
  const [savingEdit, setSavingEdit] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.admin.listActivities(100);
      setActivities(res);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Ошибка загрузки');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleDelete = useCallback(async (id: string) => {
    setDeletingId(id);
    try {
      await api.admin.deleteActivity(id);
      setActivities((prev) => prev.filter((a) => a.id !== id));
      setSuccess('Активность удалена');
      setTimeout(() => setSuccess(''), 2000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Ошибка удаления');
    } finally {
      setDeletingId(null);
      setConfirmDelete(null);
    }
  }, []);

  const openEdit = useCallback((a: AdminActivity) => {
    const durationMin = Math.floor(a.duration / 60);
    const durationSec = a.duration % 60;
    setEditForm({
      sport: a.sport,
      title: a.title ?? '',
      description: '',
      distance: String(a.distance),
      duration: `${durationMin}:${String(durationSec).padStart(2, '0')}`,
      startedAt: a.startedAt ? new Date(a.startedAt).toISOString().slice(0, 16) : '',
      calories: '',
      elevGain: '',
    });
    setEditModal(a);
  }, []);

  const handleSaveEdit = useCallback(async () => {
    if (!editModal) return;
    setSavingEdit(true);
    try {
      const [min, sec] = editForm.duration.split(':').map(Number);
      const durationSec = ((min || 0) * 60) + (sec || 0);
      const updated = await api.admin.editActivity(editModal.id, {
        sport: editForm.sport || undefined,
        title: editForm.title || undefined,
        description: editForm.description || undefined,
        distance: editForm.distance ? parseFloat(editForm.distance) : undefined,
        duration: durationSec || undefined,
        startedAt: editForm.startedAt || undefined,
        calories: editForm.calories ? parseInt(editForm.calories, 10) : null,
        elevGain: editForm.elevGain ? parseFloat(editForm.elevGain) : null,
      });
      setActivities((prev) => prev.map((a) => a.id === editModal.id ? { ...a, ...updated } : a));
      setSuccess('Активность обновлена');
      setTimeout(() => setSuccess(''), 2000);
      setEditModal(null);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Ошибка сохранения');
    } finally {
      setSavingEdit(false);
    }
  }, [editModal, editForm]);

  return (
    <div>
      {error && <div style={{ padding: '10px 14px', background: '#fff0f0', color: '#c00', borderRadius: 8, fontSize: 13, fontWeight: 600, marginBottom: 16 }}>{error}</div>}
      {success && <div style={{ padding: '10px 14px', background: '#f0fff0', color: '#16a34a', borderRadius: 8, fontSize: 13, fontWeight: 600, marginBottom: 16 }}>{success}</div>}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div>
          <div style={{ fontSize: 18, fontWeight: 800, color: TEXT }}>Все активности</div>
          <div style={{ fontSize: 13, color: '#888', marginTop: 2 }}>Последние {activities.length} записей</div>
        </div>
        <button style={styles.btn('secondary')} onClick={load}>↻ Обновить</button>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 60, color: '#888', fontSize: 15 }}>Загрузка...</div>
      ) : (
        <div style={{ background: '#fff', borderRadius: 14, border: `1px solid ${BORDER}`, overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={styles.table}>
              <thead>
                <tr style={{ background: '#fafafa' }}>
                  <th style={styles.th}>Спорт</th>
                  <th style={styles.th}>Название</th>
                  <th style={styles.th}>Пользователь</th>
                  <th style={styles.th}>Дистанция</th>
                  <th style={styles.th}>Время</th>
                  <th style={styles.th}>Дата</th>
                  <th style={styles.th}></th>
                </tr>
              </thead>
              <tbody>
                {activities.map((a, idx) => {
                  const isHovered = hoveredRow === a.id;
                  const sportColor = SPORT_COLORS[a.sport] ?? '#888';
                  return (
                    <tr
                      key={a.id}
                      onMouseEnter={() => setHoveredRow(a.id)}
                      onMouseLeave={() => setHoveredRow(null)}
                      style={{ background: isHovered ? '#fff8f5' : idx % 2 === 0 ? '#fff' : '#fafafa', transition: 'background 0.1s' }}
                    >
                      <td style={styles.td}>
                        <span style={{
                          display: 'inline-block',
                          padding: '2px 10px',
                          borderRadius: 20,
                          fontSize: 11,
                          fontWeight: 700,
                          color: '#fff',
                          background: sportColor,
                        }}>
                          {SPORT_LABELS[a.sport] ?? a.sport}
                        </span>
                      </td>
                      <td style={{ ...styles.td, maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {a.title || '—'}
                      </td>
                      <td style={styles.td}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <UserAvatar username={a.user.username} avatarUrl={a.user.avatarUrl} size={26} />
                          <span style={{ fontSize: 13, fontWeight: 600 }}>{a.user.username}</span>
                        </div>
                      </td>
                      <td style={{ ...styles.td, fontWeight: 700, color: BRAND }}>{(a.distance ?? 0).toFixed(2)} км</td>
                      <td style={{ ...styles.td, color: '#666' }}>{formatDurationShort(a.duration)}</td>
                      <td style={{ ...styles.td, fontSize: 12, color: '#888', whiteSpace: 'nowrap' }}>
                        {new Date(a.createdAt).toLocaleDateString('ru-RU')}
                      </td>
                      <td style={{ ...styles.td, whiteSpace: 'nowrap' }}>
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button
                            title="Редактировать"
                            style={styles.iconBtn('#475569', '#f1f5f9')}
                            onClick={() => openEdit(a)}
                          >✏️</button>
                          <button
                            title="Удалить"
                            style={{ ...styles.iconBtn('#fff', '#ef4444'), opacity: deletingId === a.id ? 0.6 : 1 }}
                            disabled={deletingId === a.id}
                            onClick={() => setConfirmDelete(a)}
                          >🗑</button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {activities.length === 0 && (
                  <tr>
                    <td colSpan={7} style={{ ...styles.td, textAlign: 'center', color: '#888', padding: 48 }}>
                      Нет активностей
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {confirmDelete && (
        <ConfirmDialog
          message={`Удалить активность "${confirmDelete.title || confirmDelete.sport}" пользователя ${confirmDelete.user.username}?`}
          onConfirm={() => handleDelete(confirmDelete.id)}
          onCancel={() => setConfirmDelete(null)}
        />
      )}

      {editModal && (
        <div style={styles.overlay} onClick={(e) => { if (e.target === e.currentTarget) setEditModal(null); }}>
          <div style={{ ...styles.modal, maxWidth: 520 }}>
            <h3 style={{ fontSize: 20, fontWeight: 900, color: TEXT, marginBottom: 20 }}>
              ✏️ Редактировать активность
            </h3>
            <div style={{ fontSize: 13, color: '#888', marginBottom: 16 }}>
              Пользователь: <strong>{editModal.user.username}</strong>
            </div>
            <div style={styles.grid2}>
              <div style={styles.fieldGroup}>
                <label style={styles.label}>Вид спорта</label>
                <select style={styles.select} value={editForm.sport} onChange={(e) => setEditForm(p => ({ ...p, sport: e.target.value }))}>
                  <option value="RUNNING">Бег</option>
                  <option value="CYCLING">Велоспорт</option>
                  <option value="SKIING">Лыжи</option>
                  <option value="WALKING">Ходьба</option>
                </select>
              </div>
              <div style={styles.fieldGroup}>
                <label style={styles.label}>Дата и время</label>
                <input type="datetime-local" style={styles.input} value={editForm.startedAt} onChange={(e) => setEditForm(p => ({ ...p, startedAt: e.target.value }))} />
              </div>
            </div>
            <div style={styles.fieldGroup}>
              <label style={styles.label}>Название</label>
              <input style={styles.input} value={editForm.title} onChange={(e) => setEditForm(p => ({ ...p, title: e.target.value }))} placeholder="Название активности" />
            </div>
            <div style={styles.grid2}>
              <div style={styles.fieldGroup}>
                <label style={styles.label}>Дистанция (км)</label>
                <input type="number" step="0.01" style={styles.input} value={editForm.distance} onChange={(e) => setEditForm(p => ({ ...p, distance: e.target.value }))} placeholder="10.5" />
              </div>
              <div style={styles.fieldGroup}>
                <label style={styles.label}>Время (мм:сс)</label>
                <input style={styles.input} value={editForm.duration} onChange={(e) => setEditForm(p => ({ ...p, duration: e.target.value }))} placeholder="45:30" />
              </div>
            </div>
            <div style={styles.grid2}>
              <div style={styles.fieldGroup}>
                <label style={styles.label}>Калории</label>
                <input type="number" style={styles.input} value={editForm.calories} onChange={(e) => setEditForm(p => ({ ...p, calories: e.target.value }))} placeholder="450" />
              </div>
              <div style={styles.fieldGroup}>
                <label style={styles.label}>Набор высоты (м)</label>
                <input type="number" step="1" style={styles.input} value={editForm.elevGain} onChange={(e) => setEditForm(p => ({ ...p, elevGain: e.target.value }))} placeholder="120" />
              </div>
            </div>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 8 }}>
              <button style={styles.btn('secondary')} onClick={() => setEditModal(null)}>Отмена</button>
              <button style={{ ...styles.btn('primary'), opacity: savingEdit ? 0.6 : 1 }} disabled={savingEdit} onClick={handleSaveEdit}>
                {savingEdit ? 'Сохранение...' : 'Сохранить'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Settings Tab ───────────────────────────────────────

function SettingsTab() {
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [loadingSettings, setLoadingSettings] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [heroBgPreview, setHeroBgPreview] = useState<string>('');
  const [heroBgFile, setHeroBgFile] = useState<File | null>(null);
  const [settingsMsg, setSettingsMsg] = useState('');

  useEffect(() => {
    setLoadingSettings(true);
    api.settings.getPublic()
      .then((data) => {
        setSettings(data ?? {});
        setHeroBgPreview(data?.['hero_bg_url'] ?? '');
      })
      .catch(() => {})
      .finally(() => setLoadingSettings(false));
  }, []);

  const flash = (msg: string) => {
    setSettingsMsg(msg);
    setTimeout(() => setSettingsMsg(''), 2500);
  };

  const saveSetting = async (key: string) => {
    setSaving(key);
    try {
      await api.settings.update(key, settings[key] ?? '');
      flash('Сохранено');
    } catch {
      flash('Ошибка сохранения');
    } finally {
      setSaving(null);
    }
  };

  const handleHeroBgUpload = async () => {
    if (!heroBgFile) return;
    setSaving('hero_bg_url');
    try {
      const res = await api.settings.uploadHeroBg(heroBgFile);
      const url = res?.url ?? '';
      setSettings(prev => ({ ...prev, hero_bg_url: url }));
      setHeroBgPreview(url);
      setHeroBgFile(null);
      flash('Фон загружен');
    } catch {
      flash('Ошибка загрузки');
    } finally {
      setSaving(null);
    }
  };

  const clearHeroBg = async () => {
    setSaving('hero_bg_url');
    try {
      await api.settings.update('hero_bg_url', '');
      setSettings(prev => ({ ...prev, hero_bg_url: '' }));
      setHeroBgPreview('');
      setHeroBgFile(null);
      flash('Фон удалён');
    } catch {
      flash('Ошибка');
    } finally {
      setSaving(null);
    }
  };

  if (loadingSettings) {
    return <div style={{ textAlign: 'center', padding: 40, color: '#888', fontSize: 15 }}>Загрузка настроек...</div>;
  }

  return (
    <div>
      {settingsMsg && <div style={{ padding: '10px 14px', background: '#f0fff0', color: '#16a34a', borderRadius: 8, fontSize: 13, fontWeight: 600, marginBottom: 16 }}>{settingsMsg}</div>}

      <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #e0e0e0', padding: 24, marginBottom: 16 }}>
        <h3 style={{ fontSize: 18, fontWeight: 800, color: '#242424', margin: '0 0 20px' }}>Герой-баннер</h3>

        {/* Hero title */}
        <div style={{ marginBottom: 16 }}>
          <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#242424', marginBottom: 6 }}>Заголовок</label>
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              style={{ flex: 1, padding: '10px 14px', borderRadius: 8, border: '1.5px solid #e0e0e0', fontSize: 14, outline: 'none', boxSizing: 'border-box' as const, color: '#242424' }}
              value={settings['hero_title'] ?? ''}
              onChange={(e) => setSettings(prev => ({ ...prev, hero_title: e.target.value }))}
            />
            <button
              style={{ padding: '10px 20px', borderRadius: 10, border: 'none', background: '#fc4c02', color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer', opacity: saving === 'hero_title' ? 0.6 : 1 }}
              onClick={() => saveSetting('hero_title')}
              disabled={saving === 'hero_title'}
            >
              {saving === 'hero_title' ? '...' : 'Сохранить'}
            </button>
          </div>
        </div>

        {/* Hero subtitle */}
        <div style={{ marginBottom: 16 }}>
          <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#242424', marginBottom: 6 }}>Подзаголовок</label>
          <div style={{ display: 'flex', gap: 8 }}>
            <textarea
              style={{ flex: 1, padding: '10px 14px', borderRadius: 8, border: '1.5px solid #e0e0e0', fontSize: 14, outline: 'none', boxSizing: 'border-box' as const, color: '#242424', minHeight: 60, resize: 'vertical' as const, fontFamily: 'inherit' }}
              value={settings['hero_subtitle'] ?? ''}
              onChange={(e) => setSettings(prev => ({ ...prev, hero_subtitle: e.target.value }))}
            />
            <button
              style={{ padding: '10px 20px', borderRadius: 10, border: 'none', background: '#fc4c02', color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer', alignSelf: 'flex-start', opacity: saving === 'hero_subtitle' ? 0.6 : 1 }}
              onClick={() => saveSetting('hero_subtitle')}
              disabled={saving === 'hero_subtitle'}
            >
              {saving === 'hero_subtitle' ? '...' : 'Сохранить'}
            </button>
          </div>
        </div>

        {/* Hero bg color */}
        <div style={{ marginBottom: 16 }}>
          <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#242424', marginBottom: 6 }}>Цвет фона (если нет картинки)</label>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <input
              type="color"
              style={{ width: 48, height: 40, border: '1.5px solid #e0e0e0', borderRadius: 8, cursor: 'pointer', padding: 2 }}
              value={settings['hero_bg_color'] ?? '#fc4c02'}
              onChange={(e) => setSettings(prev => ({ ...prev, hero_bg_color: e.target.value }))}
            />
            <input
              style={{ width: 120, padding: '10px 14px', borderRadius: 8, border: '1.5px solid #e0e0e0', fontSize: 14, outline: 'none', color: '#242424' }}
              value={settings['hero_bg_color'] ?? '#fc4c02'}
              onChange={(e) => setSettings(prev => ({ ...prev, hero_bg_color: e.target.value }))}
            />
            <button
              style={{ padding: '10px 20px', borderRadius: 10, border: 'none', background: '#fc4c02', color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer', opacity: saving === 'hero_bg_color' ? 0.6 : 1 }}
              onClick={() => saveSetting('hero_bg_color')}
              disabled={saving === 'hero_bg_color'}
            >
              {saving === 'hero_bg_color' ? '...' : 'Сохранить'}
            </button>
          </div>
        </div>

        {/* Hero bg image */}
        <div style={{ marginBottom: 0 }}>
          <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#242424', marginBottom: 6 }}>Фоновое изображение</label>
          {(heroBgPreview ?? '') && (
            <div style={{ marginBottom: 10, position: 'relative', display: 'inline-block' }}>
              <img src={heroBgPreview} alt="" style={{ maxWidth: 320, maxHeight: 160, borderRadius: 10, objectFit: 'cover', border: '1px solid #e0e0e0' }} />
              <button
                onClick={clearHeroBg}
                style={{ position: 'absolute', top: 6, right: 6, width: 24, height: 24, borderRadius: '50%', border: 'none', background: 'rgba(0,0,0,0.6)', color: '#fff', fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                x
              </button>
            </div>
          )}
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => {
                const f = e.target.files?.[0] ?? null;
                setHeroBgFile(f);
                if (f) {
                  const reader = new FileReader();
                  reader.onload = (ev) => setHeroBgPreview((ev.target?.result as string) ?? '');
                  reader.readAsDataURL(f);
                }
              }}
              style={{ fontSize: 13 }}
            />
            {heroBgFile && (
              <button
                style={{ padding: '10px 20px', borderRadius: 10, border: 'none', background: '#fc4c02', color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer', opacity: saving === 'hero_bg_url' ? 0.6 : 1 }}
                onClick={handleHeroBgUpload}
                disabled={saving === 'hero_bg_url'}
              >
                {saving === 'hero_bg_url' ? '...' : 'Загрузить'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main Admin Panel ────────────────────────────────────

export default function AdminPanel() {
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  useEffect(() => {
    const h = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', h);
    return () => window.removeEventListener('resize', h);
  }, []);

  const { toasts, addToast, removeToast } = useToast();

  const [tab, setTab] = useState<TabKey>('stats');
  const [events, setEvents] = useState<Event[]>([]);
  const [packages, setPackages] = useState<MerchPackage[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Event form
  const [showEventForm, setShowEventForm] = useState(false);
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);
  const [savingEvent, setSavingEvent] = useState(false);

  // Package form
  const [showPkgForm, setShowPkgForm] = useState(false);
  const [editingPkg, setEditingPkg] = useState<MerchPackage | null>(null);
  const [savingPkg, setSavingPkg] = useState(false);

  // Achievement management
  const [adminAchievements, setAdminAchievements] = useState<{ id: string; code: string; name: string; description: string; icon: string; iconUrl?: string | null; xpReward: number; category: string; threshold: number | null; userCount: number }[]>([]);
  const [showAchForm, setShowAchForm] = useState(false);
  const [editingAch, setEditingAch] = useState<{ id: string; code: string; name: string; description: string; icon: string; iconUrl?: string | null; xpReward: number; category: string; threshold: number | null; userCount: number } | null>(null);
  const [savingAch, setSavingAch] = useState(false);

  // Confirm delete
  const [confirmDelete, setConfirmDelete] = useState<{ type: 'event' | 'package' | 'achievement'; id: string; name: string } | null>(null);

  // Diploma editor
  const [diplomaEvent, setDiplomaEvent] = useState<Event | null>(null);

  // Events table hover
  const [hoveredEventRow, setHoveredEventRow] = useState<string | null>(null);
  const [hoveredAchRow, setHoveredAchRow] = useState<string | null>(null);

  const flash = (msg: string, type: 'success' | 'error' = 'success') => {
    addToast(msg, type);
  };

  // ─── Load events ────────────────────────────────────────

  const loadEvents = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.events.list({ limit: 100 });
      setEvents(res.items);
    } catch (err: any) {
      setError(err.message || 'Ошибка загрузки событий');
    } finally {
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
    } catch (err: any) {
      setError(err.message || 'Ошибка загрузки пакетов');
    } finally {
      setLoading(false);
    }
  }, []);

  // ─── Load achievements ─────────────────────────────────

  const loadAchievements = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.admin.achievements();
      setAdminAchievements(res);
    } catch (err: any) {
      setError(err.message || 'Ошибка загрузки достижений');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (tab === 'events') loadEvents();
    else if (tab === 'packages') loadPackages();
    else if (tab === 'achievements') loadAchievements();
  }, [tab, loadEvents, loadPackages, loadAchievements]);

  // ─── Event handlers ─────────────────────────────────────

  const handleSaveEvent = async (form: EventFormData) => {
    if (!form.title || !form.sport || !form.type || !form.startDate || !form.endDate) {
      flash('Заполните обязательные поля: Название, Вид спорта, Тип, Даты', 'error');
      return;
    }

    setSavingEvent(true);
    setError('');
    try {
      const data: Record<string, unknown> = {
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
        await api.events.update(editingEvent.id, data as Partial<Event>);
        flash('Событие обновлено');
      } else {
        await api.events.create(data as Partial<Event>);
        flash('Событие создано');
      }

      setShowEventForm(false);
      setEditingEvent(null);
      loadEvents();
    } catch (err: any) {
      flash(err.message || 'Ошибка сохранения', 'error');
    } finally {
      setSavingEvent(false);
    }
  };

  const handleQuickStatus = async (eventId: string, status: string) => {
    setError('');
    try {
      await api.events.update(eventId, { status } as Partial<Event>);
      flash('Статус обновлён');
      loadEvents();
    } catch (err: any) {
      flash(err.message || 'Ошибка обновления статуса', 'error');
    }
  };

  const handleDeleteEvent = async (id: string) => {
    setError('');
    try {
      await api.events.delete(id);
      flash('Событие удалено');
      setConfirmDelete(null);
      loadEvents();
    } catch (err: any) {
      flash(err.message || 'Ошибка удаления', 'error');
      setConfirmDelete(null);
    }
  };

  // ─── Package handlers ───────────────────────────────────

  const handleSavePkg = async (form: PackageFormData) => {
    if (!form.name) {
      flash('Укажите название пакета', 'error');
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
      } else {
        await api.packages.create(data);
        flash('Пакет создан');
      }

      setShowPkgForm(false);
      setEditingPkg(null);
      loadPackages();
    } catch (err: any) {
      flash(err.message || 'Ошибка сохранения', 'error');
    } finally {
      setSavingPkg(false);
    }
  };

  const handleDeletePkg = async (id: string) => {
    setError('');
    try {
      await api.packages.delete(id);
      flash('Пакет удалён');
      setConfirmDelete(null);
      loadPackages();
    } catch (err: any) {
      flash(err.message || 'Ошибка удаления', 'error');
      setConfirmDelete(null);
    }
  };

  // ─── Achievement handlers ──────────────────────────────

  const handleSaveAch = async (form: AchFormData) => {
    if (!form.name || !form.description || !form.category) {
      flash('Заполните обязательные поля: Название, Описание, Категория', 'error');
      return;
    }

    setSavingAch(true);
    setError('');
    try {
      const data = {
        name: form.name,
        description: form.description,
        icon: form.icon || '🏅',
        xpReward: parseInt(form.xpReward, 10) || 25,
        category: form.category,
        threshold: form.threshold ? parseFloat(form.threshold) : null,
      };

      let savedId: string;
      if (editingAch) {
        const result = await api.admin.updateAchievement(editingAch.id, data);
        savedId = result.id;
        flash('Достижение обновлено');
      } else {
        const result = await api.admin.createAchievement(data);
        savedId = result.id;
        flash('Достижение создано');
      }

      // Загрузка иконки, если выбран файл
      if (form.iconFile) {
        await api.admin.uploadAchievementIcon(savedId, form.iconFile);
      }

      setShowAchForm(false);
      setEditingAch(null);
      loadAchievements();
    } catch (err: any) {
      flash(err.message ?? 'Ошибка сохранения достижения', 'error');
    } finally {
      setSavingAch(false);
    }
  };

  const handleDeleteAch = async (id: string) => {
    setError('');
    try {
      await api.admin.deleteAchievement(id);
      flash('Достижение удалено');
      setConfirmDelete(null);
      loadAchievements();
    } catch (err: any) {
      flash(err.message || 'Ошибка удаления достижения', 'error');
      setConfirmDelete(null);
    }
  };

  // ─── Render ─────────────────────────────────────────────

  return (
    <div style={{ minHeight: 'calc(100vh - 52px)', background: '#f1f5f9' }}>
      <style>{`
        @keyframes slideIn { from { opacity: 0; transform: translateX(20px); } to { opacity: 1; transform: translateX(0); } }
        .admin-tr:hover td { background: #f8fafc !important; }
      `}</style>

      <ToastContainer toasts={toasts} onRemove={removeToast} />

      {/* Fixed desktop sidebar */}
      {!isMobile && <SidebarNav active={tab} onChange={setTab} isMobile={false} />}

      {/* Main content pushed right of fixed sidebar */}
      <div style={{ marginLeft: isMobile ? 0 : SIDEBAR_W, minHeight: 'calc(100vh - 52px)', display: 'flex', flexDirection: 'column' }}>
        {/* Top bar inside admin */}
        <div style={{ background: '#fff', borderBottom: `1px solid ${BORDER}`, padding: '0 32px', height: 56, display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 52, zIndex: 40 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 12, color: '#94a3b8' }}>Администрирование</span>
            <span style={{ color: '#cbd5e1', fontSize: 14 }}>›</span>
            <span style={{ fontSize: 13, color: TEXT, fontWeight: 700 }}>{TAB_LABELS[tab]}</span>
          </div>
          {isMobile && (
            <SidebarNav active={tab} onChange={setTab} isMobile={true} />
          )}
        </div>

        {/* Content area */}
        <main style={{ flex: 1, padding: '28px 32px 60px', minWidth: 0 }}>
          {/* Mobile nav */}
          {isMobile && (
            <div style={{ marginBottom: 16 }}>
              <SidebarNav active={tab} onChange={setTab} isMobile={true} />
            </div>
          )}

          {/* Page title */}
          <div style={{ marginBottom: 24 }}>
            <h1 style={{ fontSize: 24, fontWeight: 800, color: TEXT, margin: 0 }}>{TAB_LABELS[tab]}</h1>
          </div>

          {/* Inline error */}
          {error && (
            <div style={{ padding: '10px 14px', background: '#fef2f2', color: '#dc2626', borderRadius: 8, fontSize: 13, fontWeight: 600, marginBottom: 16, border: '1px solid #fecaca' }}>
              {error}
            </div>
          )}

          {/* ─── Stats Tab ─────────────────────────────────── */}
          {tab === 'stats' && <StatsTab />}

          {/* ─── Users Tab ─────────────────────────────────── */}
          {tab === 'users' && <UsersTab />}

          {/* ─── Activities Tab ────────────────────────────── */}
          {tab === 'activities' && <ActivitiesTab />}

          {/* ─── Events Tab ────────────────────────────────── */}
          {tab === 'events' && !loading && (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <div style={{ fontSize: 13, color: '#64748b' }}>Всего событий: <strong style={{ color: TEXT }}>{events.length}</strong></div>
                <button style={styles.btn('primary')} onClick={() => { setEditingEvent(null); setShowEventForm(true); }}>
                  + Создать событие
                </button>
              </div>

              <div style={{ background: '#fff', borderRadius: 14, border: `1px solid ${BORDER}`, overflow: 'hidden' }}>
                <div style={{ overflowX: 'auto' }}>
                  <table style={styles.table}>
                    <thead>
                      <tr style={{ background: '#fafafa' }}>
                        <th style={styles.th}>Название</th>
                        <th style={styles.th}>Спорт</th>
                        <th style={styles.th}>Тип</th>
                        <th style={styles.th}>Статус</th>
                        <th style={styles.th}>Даты</th>
                        <th style={styles.th}>Участники</th>
                        <th style={styles.th}>Действия</th>
                      </tr>
                    </thead>
                    <tbody>
                      {events.map((ev, idx) => {
                        const isHovered = hoveredEventRow === ev.id;
                        return (
                          <tr
                            key={ev.id}
                            onMouseEnter={() => setHoveredEventRow(ev.id)}
                            onMouseLeave={() => setHoveredEventRow(null)}
                            style={{ background: isHovered ? '#fff8f5' : idx % 2 === 0 ? '#fff' : '#fafafa', transition: 'background 0.1s' }}
                          >
                            <td style={{ ...styles.td, fontWeight: 700, maxWidth: 200 }}>{ev.title}</td>
                            <td style={styles.td}>
                              {SPORT_OPTIONS.find(s => s.value === ev.sport)?.label || ev.sport}
                            </td>
                            <td style={styles.td}>
                              {TYPE_OPTIONS.find(t => t.value === ev.type)?.label || ev.type}
                            </td>
                            <td style={styles.td}>
                              <span style={styles.badge(STATUS_COLORS[ev.status] || '#888')}>
                                {STATUS_OPTIONS.find(s => s.value === ev.status)?.label || ev.status}
                              </span>
                            </td>
                            <td style={{ ...styles.td, fontSize: 12, color: '#666', whiteSpace: 'nowrap' }}>
                              {formatDate(ev.startDate)} — {formatDate(ev.endDate)}
                            </td>
                            <td style={{ ...styles.td, textAlign: 'center' }}>
                              {(ev as any).participantCount ?? '—'}
                            </td>
                            <td style={{ ...styles.td, whiteSpace: 'nowrap' }}>
                              <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                                <button title="Редактировать" style={styles.iconBtn('#475569', '#f1f5f9')} onClick={() => { setEditingEvent(ev); setShowEventForm(true); }}>✏️</button>
                                <button title="Диплом" style={styles.iconBtn('#475569', '#f1f5f9')} onClick={() => setDiplomaEvent(ev)}>🏅</button>
                                {ev.status === 'DRAFT' && (
                                  <button title="Открыть регистрацию" style={{ ...styles.iconBtn('#fff', '#2563eb'), fontSize: 11, width: 'auto', padding: '0 8px' }} onClick={() => handleQuickStatus(ev.id, 'REGISTRATION')}>Рег.</button>
                                )}
                                {ev.status === 'REGISTRATION' && (
                                  <button title="Запустить" style={{ ...styles.iconBtn('#fff', '#16a34a'), fontSize: 11, width: 'auto', padding: '0 8px' }} onClick={() => handleQuickStatus(ev.id, 'ACTIVE')}>Старт</button>
                                )}
                                {ev.status === 'ACTIVE' && (
                                  <button title="Завершить" style={{ ...styles.iconBtn('#fff', '#7c3aed'), fontSize: 11, width: 'auto', padding: '0 8px' }} onClick={() => handleQuickStatus(ev.id, 'FINISHED')}>Финиш</button>
                                )}
                                <button title="Удалить" style={styles.iconBtn('#fff', '#ef4444')} onClick={() => setConfirmDelete({ type: 'event', id: ev.id, name: ev.title })}>🗑</button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                      {events.length === 0 && (
                        <tr>
                          <td colSpan={7} style={{ ...styles.td, textAlign: 'center', color: '#888', padding: 48 }}>
                            Нет событий
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}

          {/* ─── Packages Tab ──────────────────────────────── */}
          {tab === 'packages' && !loading && (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <div style={{ fontSize: 13, color: '#64748b' }}>Всего пакетов: <strong style={{ color: TEXT }}>{packages.length}</strong></div>
                <button style={styles.btn('primary')} onClick={() => { setEditingPkg(null); setShowPkgForm(true); }}>+ Добавить пакет</button>
              </div>

              <div style={{ display: 'grid', gap: 16 }}>
                {packages.map(pkg => (
                  <div key={pkg.id} style={{ background: '#fff', borderRadius: 14, border: `1px solid ${BORDER}`, padding: 24, display: 'flex', gap: 20, alignItems: 'flex-start', opacity: pkg.isActive ? 1 : 0.5 }}>
                    {pkg.imageUrl ? (
                      <img src={pkg.imageUrl} alt={pkg.name} style={{ width: 80, height: 80, borderRadius: 12, objectFit: 'cover', flexShrink: 0 }} />
                    ) : (
                      <div style={{ fontSize: 40, flexShrink: 0, width: 80, height: 80, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f9f9f9', borderRadius: 12 }}>{pkg.icon}</div>
                    )}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                        <span style={{ fontSize: 17, fontWeight: 800, color: TEXT }}>{pkg.name}</span>
                        {!pkg.isActive && (
                          <span style={{ ...styles.badge('#888'), fontSize: 10 }}>Неактивен</span>
                        )}
                      </div>
                      {pkg.description && (
                        <p style={{ fontSize: 13, color: '#888', margin: '0 0 6px 0', lineHeight: 1.4 }}>{pkg.description}</p>
                      )}
                      <div style={{ fontSize: 20, fontWeight: 900, color: pkg.price === 0 ? '#16a34a' : BRAND, marginBottom: 8 }}>
                        {pkg.price === 0 ? 'Бесплатно' : `${pkg.price.toLocaleString('ru-RU')} \u20BD`}
                      </div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                        {pkg.features.map((f, i) => (
                          <span key={i} style={{ padding: '3px 10px', background: '#f0f0f0', borderRadius: 6, fontSize: 12, color: '#555' }}>
                            {f}
                          </span>
                        ))}
                      </div>
                      <div style={{ fontSize: 11, color: '#aaa', marginTop: 8 }}>
                        Порядок: {pkg.sortOrder}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                      <button title="Редактировать" style={styles.iconBtn('#475569', '#f1f5f9')} onClick={() => { setEditingPkg(pkg); setShowPkgForm(true); }}>✏️</button>
                      <button title="Удалить" style={styles.iconBtn('#fff', '#ef4444')} onClick={() => setConfirmDelete({ type: 'package', id: pkg.id, name: pkg.name })}>🗑</button>
                    </div>
                  </div>
                ))}
                {packages.length === 0 && (
                  <div style={{ textAlign: 'center', padding: 48, color: '#888', fontSize: 15, background: '#fff', borderRadius: 14, border: `1px solid ${BORDER}` }}>
                    Нет пакетов
                  </div>
                )}
              </div>
            </>
          )}

          {/* ─── Achievements Tab ───────────────────────────── */}
          {tab === 'achievements' && !loading && (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <div style={{ fontSize: 13, color: '#64748b' }}>Всего достижений: <strong style={{ color: TEXT }}>{adminAchievements.length}</strong></div>
                <button style={styles.btn('primary')} onClick={() => { setEditingAch(null); setShowAchForm(true); }}>+ Добавить достижение</button>
              </div>

              <div style={{ background: '#fff', borderRadius: 14, border: `1px solid ${BORDER}`, overflow: 'hidden' }}>
                <div style={{ overflowX: 'auto' }}>
                  <table style={styles.table}>
                    <thead>
                      <tr style={{ background: '#fafafa' }}>
                        <th style={styles.th}>Иконка</th>
                        <th style={styles.th}>Код</th>
                        <th style={styles.th}>Название</th>
                        <th style={styles.th}>Описание</th>
                        <th style={styles.th}>Категория</th>
                        <th style={styles.th}>XP</th>
                        <th style={styles.th}>Порог</th>
                        <th style={styles.th}>Получили</th>
                        <th style={styles.th}>Действия</th>
                      </tr>
                    </thead>
                    <tbody>
                      {adminAchievements.map((ach, idx) => {
                        const catLabels: Record<string, string> = {
                          distance: 'Дистанция',
                          streak: 'Стрик',
                          events: 'События',
                          social: 'Социальные',
                          speed: 'Скорость',
                        };
                        const catColors: Record<string, string> = {
                          distance: '#16a34a',
                          streak: '#dc6a00',
                          events: '#2563eb',
                          social: '#c026d3',
                          speed: '#dc2626',
                        };
                        const isHovered = hoveredAchRow === ach.id;
                        return (
                          <tr
                            key={ach.id}
                            onMouseEnter={() => setHoveredAchRow(ach.id)}
                            onMouseLeave={() => setHoveredAchRow(null)}
                            style={{ background: isHovered ? '#fff8f5' : idx % 2 === 0 ? '#fff' : '#fafafa', transition: 'background 0.1s' }}
                          >
                            <td style={{ ...styles.td, fontSize: 28, textAlign: 'center' }}>
                              {ach.iconUrl ? (
                                <img src={ach.iconUrl} alt={ach.name} style={{ width: 36, height: 36, borderRadius: 8, objectFit: 'cover' }} />
                              ) : (
                                ach.icon ?? '🏅'
                              )}
                            </td>
                            <td style={{ ...styles.td, fontFamily: 'monospace', fontSize: 12, color: '#888' }}>{ach.code}</td>
                            <td style={{ ...styles.td, fontWeight: 700 }}>{ach.name}</td>
                            <td style={{ ...styles.td, fontSize: 12, color: '#666', maxWidth: 200 }}>{ach.description}</td>
                            <td style={styles.td}>
                              <span style={styles.badge(catColors[ach.category] ?? '#888')}>
                                {catLabels[ach.category] ?? ach.category}
                              </span>
                            </td>
                            <td style={{ ...styles.td, fontWeight: 700, color: BRAND }}>{ach.xpReward}</td>
                            <td style={{ ...styles.td, textAlign: 'center', color: '#666' }}>{ach.threshold ?? '—'}</td>
                            <td style={{ ...styles.td, textAlign: 'center', fontWeight: 700 }}>{ach.userCount}</td>
                            <td style={{ ...styles.td, whiteSpace: 'nowrap' }}>
                              <div style={{ display: 'flex', gap: 6 }}>
                                <button
                                  title="Редактировать"
                                  style={styles.iconBtn('#475569', '#f1f5f9')}
                                  onClick={() => { setEditingAch(ach); setShowAchForm(true); }}
                                >✏️</button>
                                <button
                                  title="Удалить"
                                  style={styles.iconBtn('#fff', '#ef4444')}
                                  onClick={() => setConfirmDelete({ type: 'achievement', id: ach.id, name: ach.name })}
                                >🗑</button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                      {adminAchievements.length === 0 && (
                        <tr>
                          <td colSpan={9} style={{ ...styles.td, textAlign: 'center', color: '#888', padding: 48 }}>
                            Нет достижений
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}

          {/* ─── Settings Tab ──────────────────────────────── */}
          {tab === 'settings' && <SettingsTab />}

          {/* Loading spinner for events/packages/achievements tabs */}
          {loading && (tab === 'events' || tab === 'packages' || tab === 'achievements') && (
            <div style={{ textAlign: 'center', padding: 60, color: '#888', fontSize: 15 }}>
              Загрузка...
            </div>
          )}
        </main>
      </div>

      {/* ─── Modals ──────────────────────────────────────── */}

      {showEventForm && (
        <EventFormModal
          initial={editingEvent ? eventToForm(editingEvent) : emptyEventForm}
          onSave={handleSaveEvent}
          onClose={() => { setShowEventForm(false); setEditingEvent(null); }}
          saving={savingEvent}
          eventId={editingEvent?.id}
        />
      )}

      {showPkgForm && (
        <PackageFormModal
          initial={editingPkg ? pkgToForm(editingPkg) : emptyPackageForm}
          onSave={handleSavePkg}
          onClose={() => { setShowPkgForm(false); setEditingPkg(null); }}
          saving={savingPkg}
          packageId={editingPkg?.id}
        />
      )}

      {showAchForm && (
        <AchievementFormModal
          initial={editingAch ? {
            name: editingAch.name,
            description: editingAch.description,
            icon: editingAch.icon,
            iconFile: null,
            iconPreview: editingAch.iconUrl ?? '',
            xpReward: String(editingAch.xpReward),
            category: editingAch.category,
            threshold: editingAch.threshold != null ? String(editingAch.threshold) : '',
          } : {
            name: '',
            description: '',
            icon: '🏅',
            iconFile: null,
            iconPreview: '',
            xpReward: '25',
            category: 'distance',
            threshold: '',
          }}
          onSave={handleSaveAch}
          onClose={() => { setShowAchForm(false); setEditingAch(null); }}
          saving={savingAch}
          isEditing={!!editingAch}
        />
      )}

      {confirmDelete && (
        <ConfirmDialog
          message={`Удалить "${confirmDelete.name}"? Это действие необратимо.`}
          onConfirm={() => {
            if (confirmDelete.type === 'event') handleDeleteEvent(confirmDelete.id);
            else if (confirmDelete.type === 'package') handleDeletePkg(confirmDelete.id);
            else if (confirmDelete.type === 'achievement') handleDeleteAch(confirmDelete.id);
          }}
          onCancel={() => setConfirmDelete(null)}
        />
      )}

      {diplomaEvent && (
        <div style={styles.overlay} onClick={(e) => { if (e.target === e.currentTarget) setDiplomaEvent(null); }}>
          <div style={{ ...styles.modal, maxWidth: 960 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h3 style={{ fontSize: 22, fontWeight: 900, color: TEXT, margin: 0 }}>
                Настройка диплома: {diplomaEvent.title}
              </h3>
              <button
                onClick={() => setDiplomaEvent(null)}
                style={{ background: 'none', border: 'none', fontSize: 24, color: '#888', cursor: 'pointer', padding: '4px 8px' }}
              >
                x
              </button>
            </div>
            <DiplomaEditor
              event={diplomaEvent}
              onSave={async (settings: DiplomaSettings) => {
                try {
                  await api.events.update(diplomaEvent.id, { diplomaSettings: settings } as Partial<Event>);
                  flash('Настройки диплома сохранены');
                  setDiplomaEvent(null);
                  loadEvents();
                } catch (err: any) {
                  flash(err.message || 'Ошибка сохранения настроек диплома', 'error');
                }
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
