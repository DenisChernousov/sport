import { useState, useEffect, useCallback } from 'react';
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
const TEXT = '#242424';
const BORDER = '#e0e0e0';

function formatDate(d: string | Date): string {
  return new Date(d).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function toInputDate(d: string | Date | null | undefined): string {
  if (!d) return '';
  const date = new Date(d);
  return date.toISOString().slice(0, 16);
}

// ─── Styles ──────────────────────────────────────────────

const styles = {
  container: { maxWidth: 1200, margin: '0 auto', padding: 24 } as React.CSSProperties,
  heading: { fontSize: 28, fontWeight: 900, color: TEXT, marginBottom: 24 } as React.CSSProperties,
  tabBar: { display: 'flex', gap: 0, marginBottom: 24, borderBottom: `2px solid ${BORDER}` } as React.CSSProperties,
  tab: (active: boolean): React.CSSProperties => ({
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
  card: { background: '#fff', borderRadius: 14, border: `1px solid ${BORDER}`, padding: 24, marginBottom: 16 } as React.CSSProperties,
  btn: (variant: 'primary' | 'secondary' | 'danger' = 'primary'): React.CSSProperties => ({
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
  smallBtn: (variant: 'primary' | 'secondary' | 'danger' = 'primary'): React.CSSProperties => ({
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
  input: { width: '100%', padding: '10px 14px', borderRadius: 8, border: `1.5px solid ${BORDER}`, fontSize: 14, outline: 'none', boxSizing: 'border-box' as const, color: TEXT } as React.CSSProperties,
  select: { width: '100%', padding: '10px 14px', borderRadius: 8, border: `1.5px solid ${BORDER}`, fontSize: 14, outline: 'none', boxSizing: 'border-box' as const, color: TEXT, background: '#fff' } as React.CSSProperties,
  label: { display: 'block', fontSize: 13, fontWeight: 700, color: TEXT, marginBottom: 6 } as React.CSSProperties,
  fieldGroup: { marginBottom: 16 } as React.CSSProperties,
  grid2: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 } as React.CSSProperties,
  grid3: { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 } as React.CSSProperties,
  error: { padding: '10px 14px', background: '#fff0f0', color: '#c00', borderRadius: 8, fontSize: 13, fontWeight: 600, marginBottom: 16 } as React.CSSProperties,
  success: { padding: '10px 14px', background: '#f0fff0', color: '#16a34a', borderRadius: 8, fontSize: 13, fontWeight: 600, marginBottom: 16 } as React.CSSProperties,
  overlay: { position: 'fixed' as const, top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: 16 },
  modal: { background: '#fff', borderRadius: 20, maxWidth: 720, width: '100%', maxHeight: '90vh', overflow: 'auto', padding: 32 } as React.CSSProperties,
  badge: (color: string): React.CSSProperties => ({
    display: 'inline-block',
    padding: '3px 10px',
    borderRadius: 6,
    fontSize: 11,
    fontWeight: 700,
    color: '#fff',
    background: color,
  }),
  table: { width: '100%', borderCollapse: 'collapse' as const } as React.CSSProperties,
  th: { textAlign: 'left' as const, padding: '10px 12px', fontSize: 12, fontWeight: 700, color: '#888', borderBottom: `2px solid ${BORDER}` } as React.CSSProperties,
  td: { padding: '12px', fontSize: 14, color: TEXT, borderBottom: `1px solid ${BORDER}` } as React.CSSProperties,
};

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

// ─── Main Admin Panel ────────────────────────────────────

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

function StatsTab() {
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

  if (loading) return <div style={{ textAlign: 'center', padding: 40, color: '#888', fontSize: 15 }}>Загрузка...</div>;
  if (error) return <div style={styles.error}>{error}</div>;
  if (!stats) return null;

  const summaryCards = [
    { label: 'Пользователи', value: stats.totalUsers, color: '#2563eb' },
    { label: 'События', value: stats.totalEvents, color: '#7c3aed' },
    { label: 'Активности', value: stats.totalActivities, color: '#16a34a' },
    { label: 'Команды', value: stats.totalTeams, color: '#ea580c' },
    { label: 'Новых за неделю', value: stats.newUsersThisWeek, color: '#0891b2' },
    { label: 'Общая дистанция', value: `${(stats.totalDistance ?? 0).toFixed(1)} км`, color: '#fc4c02' },
  ];

  return (
    <div>
      {/* Summary cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 24 }}>
        {summaryCards.map((card) => (
          <div key={card.label} style={{
            background: '#fff',
            borderRadius: 14,
            border: `1px solid ${BORDER}`,
            padding: 20,
            textAlign: 'center',
          }}>
            <div style={{ fontSize: 28, fontWeight: 900, color: card.color }}>{card.value}</div>
            <div style={{ fontSize: 13, color: '#888', marginTop: 6, fontWeight: 600 }}>{card.label}</div>
          </div>
        ))}
      </div>

      {/* Top 5 users */}
      <div style={styles.card}>
        <div style={{ fontSize: 18, fontWeight: 800, color: TEXT, marginBottom: 16 }}>
          Топ-5 пользователей по дистанции
        </div>
        <table style={styles.table}>
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
              <tr key={u.id}>
                <td style={styles.td}>{idx + 1}</td>
                <td style={{ ...styles.td, fontWeight: 700 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    {u.avatarUrl ? (
                      <img src={u.avatarUrl} alt="" style={{ width: 28, height: 28, borderRadius: '50%', objectFit: 'cover' }} />
                    ) : (
                      <div style={{ width: 28, height: 28, borderRadius: '50%', background: BRAND, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700 }}>
                        {(u.username ?? '?')[0].toUpperCase()}
                      </div>
                    )}
                    {u.username}
                  </div>
                </td>
                <td style={styles.td}>{u.city ?? '—'}</td>
                <td style={styles.td}>{u.level}</td>
                <td style={{ ...styles.td, fontWeight: 700, color: BRAND }}>{(u.totalDistance ?? 0).toFixed(1)} км</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Recent activities */}
      <div style={{ ...styles.card, marginTop: 16 }}>
        <div style={{ fontSize: 18, fontWeight: 800, color: TEXT, marginBottom: 16 }}>
          Последние активности
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {stats.recentActivities.map((a) => (
            <div key={a.id} style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              padding: '10px 0',
              borderBottom: `1px solid ${BORDER}`,
            }}>
              {a.user.avatarUrl ? (
                <img src={a.user.avatarUrl} alt="" style={{ width: 32, height: 32, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
              ) : (
                <div style={{ width: 32, height: 32, borderRadius: '50%', background: BRAND, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 700, flexShrink: 0 }}>
                  {(a.user.username ?? '?')[0].toUpperCase()}
                </div>
              )}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: TEXT }}>
                  {a.user.username} — {a.title ?? a.sport}
                </div>
                <div style={{ fontSize: 12, color: '#888' }}>
                  {(a.distance ?? 0).toFixed(1)} км, {formatDurationShort(a.duration ?? 0)}
                </div>
              </div>
              <div style={{ fontSize: 11, color: '#aaa', flexShrink: 0 }}>
                {new Date(a.createdAt).toLocaleDateString('ru-RU')}
              </div>
            </div>
          ))}
          {stats.recentActivities.length === 0 && (
            <div style={{ textAlign: 'center', color: '#888', padding: 20 }}>Нет активностей</div>
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
  const [roleEdits, setRoleEdits] = useState<Record<string, string>>({});
  const [savingRole, setSavingRole] = useState<string | null>(null);

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

  return (
    <div>
      {error && <div style={styles.error}>{error}</div>}
      {success && <div style={styles.success}>{success}</div>}

      {/* Search */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        <input
          style={{ ...styles.input, flex: 1 }}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Поиск по имени, email или городу..."
          onKeyDown={(e) => { if (e.key === 'Enter') handleSearch(); }}
        />
        <button style={styles.btn('primary')} onClick={handleSearch}>Поиск</button>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 40, color: '#888', fontSize: 15 }}>Загрузка...</div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Пользователь</th>
                <th style={styles.th}>Email</th>
                <th style={styles.th}>Роль</th>
                <th style={styles.th}>Город</th>
                <th style={styles.th}>Уровень</th>
                <th style={styles.th}>Дистанция</th>
                <th style={styles.th}>Рефералы</th>
                <th style={styles.th}>Дата рег.</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => {
                const currentEditRole = roleEdits[u.id];
                const displayRole = currentEditRole ?? u.role;
                const isDirty = currentEditRole != null && currentEditRole !== u.role;
                return (
                  <tr key={u.id}>
                    <td style={{ ...styles.td, fontWeight: 700 }}>{u.username}</td>
                    <td style={{ ...styles.td, fontSize: 12 }}>{u.email}</td>
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
                            style={{
                              ...styles.smallBtn('primary'),
                              opacity: savingRole === u.id ? 0.6 : 1,
                              fontSize: 11,
                            }}
                            disabled={savingRole === u.id}
                            onClick={() => handleRoleChange(u.id)}
                          >
                            {savingRole === u.id ? '...' : 'Сохр.'}
                          </button>
                        )}
                      </div>
                    </td>
                    <td style={styles.td}>{u.city ?? '—'}</td>
                    <td style={styles.td}>{u.level}</td>
                    <td style={{ ...styles.td, fontWeight: 600 }}>{(u.totalDistance ?? 0).toFixed(1)} км</td>
                    <td style={{ ...styles.td, textAlign: 'center' }}>{u._count?.referrals ?? 0}</td>
                    <td style={{ ...styles.td, fontSize: 12, whiteSpace: 'nowrap' }}>
                      {new Date(u.createdAt).toLocaleDateString('ru-RU')}
                    </td>
                  </tr>
                );
              })}
              {users.length === 0 && (
                <tr>
                  <td colSpan={8} style={{ ...styles.td, textAlign: 'center', color: '#888', padding: 40 }}>
                    Пользователи не найдены
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ─── Main Admin Panel ────────────────────────────────────

export default function AdminPanel() {
  const [tab, setTab] = useState<'stats' | 'users' | 'events' | 'packages' | 'achievements'>('stats');
  const [events, setEvents] = useState<Event[]>([]);
  const [packages, setPackages] = useState<MerchPackage[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

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

  const flash = (msg: string) => {
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
      setError('Заполните обязательные поля: Название, Вид спорта, Тип, Даты');
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
      setError(err.message || 'Ошибка сохранения');
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
      setError(err.message || 'Ошибка обновления статуса');
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
      setError(err.message || 'Ошибка удаления');
      setConfirmDelete(null);
    }
  };

  // ─── Package handlers ───────────────────────────────────

  const handleSavePkg = async (form: PackageFormData) => {
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
      } else {
        await api.packages.create(data);
        flash('Пакет создан');
      }

      setShowPkgForm(false);
      setEditingPkg(null);
      loadPackages();
    } catch (err: any) {
      setError(err.message || 'Ошибка сохранения');
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
      setError(err.message || 'Ошибка удаления');
      setConfirmDelete(null);
    }
  };

  // ─── Achievement handlers ──────────────────────────────

  const handleSaveAch = async (form: AchFormData) => {
    if (!form.name || !form.description || !form.category) {
      setError('Заполните обязательные поля: Название, Описание, Категория');
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
      setError(err.message ?? 'Ошибка сохранения достижения');
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
      setError(err.message || 'Ошибка удаления достижения');
      setConfirmDelete(null);
    }
  };

  // ─── Render ─────────────────────────────────────────────

  return (
    <div style={styles.container}>
      <h1 style={styles.heading}>Панель администратора</h1>

      {/* Tabs */}
      <div style={styles.tabBar}>
        <button style={styles.tab(tab === 'stats')} onClick={() => setTab('stats')}>
          Статистика
        </button>
        <button style={styles.tab(tab === 'users')} onClick={() => setTab('users')}>
          Пользователи
        </button>
        <button style={styles.tab(tab === 'events')} onClick={() => setTab('events')}>
          Управление событиями
        </button>
        <button style={styles.tab(tab === 'packages')} onClick={() => setTab('packages')}>
          Пакеты участия
        </button>
        <button style={styles.tab(tab === 'achievements')} onClick={() => setTab('achievements')}>
          Достижения
        </button>
      </div>

      {/* Messages */}
      {error && <div style={styles.error}>{error}</div>}
      {success && <div style={styles.success}>{success}</div>}

      {loading && (
        <div style={{ textAlign: 'center', padding: 40, color: '#888', fontSize: 15 }}>
          Загрузка...
        </div>
      )}

      {/* ─── Stats Tab ───────────────────────────────────── */}
      {tab === 'stats' && <StatsTab />}

      {/* ─── Users Tab ───────────────────────────────────── */}
      {tab === 'users' && <UsersTab />}

      {/* ─── Events Tab ──────────────────────────────────── */}
      {tab === 'events' && !loading && (
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <span style={{ fontSize: 14, color: '#888' }}>
              Всего событий: {events.length}
            </span>
            <button
              style={styles.btn('primary')}
              onClick={() => { setEditingEvent(null); setShowEventForm(true); }}
            >
              + Создать событие
            </button>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={styles.table}>
              <thead>
                <tr>
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
                {events.map(ev => (
                  <tr key={ev.id}>
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
                    <td style={{ ...styles.td, fontSize: 12, whiteSpace: 'nowrap' }}>
                      {formatDate(ev.startDate)} — {formatDate(ev.endDate)}
                    </td>
                    <td style={{ ...styles.td, textAlign: 'center' }}>
                      {(ev as any).participantCount ?? '—'}
                    </td>
                    <td style={{ ...styles.td, whiteSpace: 'nowrap' }}>
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                        <button
                          style={styles.smallBtn('secondary')}
                          onClick={() => { setEditingEvent(ev); setShowEventForm(true); }}
                        >
                          Изм.
                        </button>
                        <button
                          style={styles.smallBtn('danger')}
                          onClick={() => setConfirmDelete({ type: 'event', id: ev.id, name: ev.title })}
                        >
                          Удал.
                        </button>
                        <button
                          style={{ ...styles.smallBtn('secondary'), fontSize: 11 }}
                          onClick={() => setDiplomaEvent(ev)}
                        >
                          Диплом
                        </button>

                        {/* Quick status buttons */}
                        {ev.status === 'DRAFT' && (
                          <button
                            style={{ ...styles.smallBtn('primary'), background: '#2563eb', fontSize: 11 }}
                            onClick={() => handleQuickStatus(ev.id, 'REGISTRATION')}
                          >
                            Открыть рег.
                          </button>
                        )}
                        {ev.status === 'REGISTRATION' && (
                          <button
                            style={{ ...styles.smallBtn('primary'), background: '#16a34a', fontSize: 11 }}
                            onClick={() => handleQuickStatus(ev.id, 'ACTIVE')}
                          >
                            Старт
                          </button>
                        )}
                        {ev.status === 'ACTIVE' && (
                          <button
                            style={{ ...styles.smallBtn('primary'), background: '#7c3aed', fontSize: 11 }}
                            onClick={() => handleQuickStatus(ev.id, 'FINISHED')}
                          >
                            Завершить
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {events.length === 0 && (
                  <tr>
                    <td colSpan={7} style={{ ...styles.td, textAlign: 'center', color: '#888', padding: 40 }}>
                      Нет событий
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* ─── Packages Tab ────────────────────────────────── */}
      {tab === 'packages' && !loading && (
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <span style={{ fontSize: 14, color: '#888' }}>
              Всего пакетов: {packages.length}
            </span>
            <button
              style={styles.btn('primary')}
              onClick={() => { setEditingPkg(null); setShowPkgForm(true); }}
            >
              + Добавить пакет
            </button>
          </div>

          <div style={{ display: 'grid', gap: 16 }}>
            {packages.map(pkg => (
              <div key={pkg.id} style={{ ...styles.card, display: 'flex', gap: 20, alignItems: 'flex-start', opacity: pkg.isActive ? 1 : 0.5 }}>
                {pkg.imageUrl ? (
                  <img src={pkg.imageUrl} alt={pkg.name} style={{ width: 80, height: 80, borderRadius: 12, objectFit: 'cover', flexShrink: 0 }} />
                ) : (
                  <div style={{ fontSize: 40, flexShrink: 0 }}>{pkg.icon}</div>
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
                <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                  <button
                    style={styles.smallBtn('secondary')}
                    onClick={() => { setEditingPkg(pkg); setShowPkgForm(true); }}
                  >
                    Изм.
                  </button>
                  <button
                    style={styles.smallBtn('danger')}
                    onClick={() => setConfirmDelete({ type: 'package', id: pkg.id, name: pkg.name })}
                  >
                    Удал.
                  </button>
                </div>
              </div>
            ))}
            {packages.length === 0 && (
              <div style={{ textAlign: 'center', padding: 40, color: '#888', fontSize: 15 }}>
                Нет пакетов
              </div>
            )}
          </div>
        </>
      )}

      {/* ─── Achievements Tab ─────────────────────────────── */}
      {tab === 'achievements' && !loading && (
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <span style={{ fontSize: 14, color: '#888' }}>
              Всего достижений: {adminAchievements.length}
            </span>
            <button
              style={styles.btn('primary')}
              onClick={() => { setEditingAch(null); setShowAchForm(true); }}
            >
              + Добавить достижение
            </button>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={styles.table}>
              <thead>
                <tr>
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
                {adminAchievements.map(ach => {
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
                  return (
                    <tr key={ach.id}>
                      <td style={{ ...styles.td, fontSize: 28, textAlign: 'center' }}>
                        {ach.iconUrl ? (
                          <img src={ach.iconUrl} alt={ach.name} style={{ width: 36, height: 36, borderRadius: 8, objectFit: 'cover' }} />
                        ) : (
                          ach.icon ?? '🏅'
                        )}
                      </td>
                      <td style={{ ...styles.td, fontFamily: 'monospace', fontSize: 12 }}>{ach.code}</td>
                      <td style={{ ...styles.td, fontWeight: 700 }}>{ach.name}</td>
                      <td style={{ ...styles.td, fontSize: 12, color: '#666', maxWidth: 200 }}>{ach.description}</td>
                      <td style={styles.td}>
                        <span style={styles.badge(catColors[ach.category] ?? '#888')}>
                          {catLabels[ach.category] ?? ach.category}
                        </span>
                      </td>
                      <td style={{ ...styles.td, fontWeight: 700, color: BRAND }}>{ach.xpReward}</td>
                      <td style={{ ...styles.td, textAlign: 'center' }}>{ach.threshold ?? '—'}</td>
                      <td style={{ ...styles.td, textAlign: 'center', fontWeight: 700 }}>{ach.userCount}</td>
                      <td style={{ ...styles.td, whiteSpace: 'nowrap' }}>
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button
                            style={styles.smallBtn('secondary')}
                            onClick={() => { setEditingAch(ach); setShowAchForm(true); }}
                          >
                            Изм.
                          </button>
                          <button
                            style={styles.smallBtn('danger')}
                            onClick={() => setConfirmDelete({ type: 'achievement', id: ach.id, name: ach.name })}
                          >
                            Удал.
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {adminAchievements.length === 0 && (
                  <tr>
                    <td colSpan={9} style={{ ...styles.td, textAlign: 'center', color: '#888', padding: 40 }}>
                      Нет достижений
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}

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
                  setError(err.message || 'Ошибка сохранения настроек диплома');
                }
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
