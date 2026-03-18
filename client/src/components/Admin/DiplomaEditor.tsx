import { useState } from 'react';
import type { Event, DiplomaSettings } from '@/types';

const BRAND = '#fc4c02';
const TEXT = '#242424';
const BORDER = '#e0e0e0';

const DEFAULT_SETTINGS: DiplomaSettings = {
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

const TYPE_LABELS: Record<string, string> = {
  RACE: 'Виртуальный забег',
  CHALLENGE: 'Виртуальный челлендж',
  ULTRAMARATHON: 'Виртуальный ультрамарафон',
  WEEKLY: 'Еженедельный забег',
  BATTLE: 'Батл',
};

interface ColorFieldProps {
  label: string;
  value: string;
  onChange: (v: string) => void;
}

function ColorField({ label, value, onChange }: ColorFieldProps) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
      <input
        type="color"
        value={value}
        onChange={e => onChange(e.target.value)}
        style={{ width: 36, height: 36, border: `1.5px solid ${BORDER}`, borderRadius: 8, cursor: 'pointer', padding: 2 }}
      />
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: TEXT }}>{label}</div>
        <div style={{ fontSize: 11, color: '#999', fontFamily: 'monospace' }}>{value}</div>
      </div>
    </div>
  );
}

interface SizeFieldProps {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
}

function SizeField({ label, value, onChange, min = 20, max = 60 }: SizeFieldProps) {
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: TEXT }}>{label}</span>
        <span style={{ fontSize: 13, fontWeight: 700, color: BRAND }}>{value}px</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={e => onChange(Number(e.target.value))}
        style={{ width: '100%', accentColor: BRAND }}
      />
    </div>
  );
}

export function DiplomaEditor({ event, onSave }: { event: Event; onSave: (settings: DiplomaSettings) => void }) {
  const [settings, setSettings] = useState<DiplomaSettings>(() => ({
    ...DEFAULT_SETTINGS,
    ...(event.diplomaSettings || {}),
  }));
  const [saving, setSaving] = useState(false);

  const set = <K extends keyof DiplomaSettings>(key: K, value: DiplomaSettings[K]) =>
    setSettings(prev => ({ ...prev, [key]: value }));

  const subtitle = TYPE_LABELS[event.type] || 'Виртуальный забег';

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave(settings);
    } finally {
      setSaving(false);
    }
  };

  // Preview dimensions — A4 landscape ratio 297:210
  const previewWidth = 560;
  const previewHeight = Math.round(previewWidth * (210 / 297));

  const bgUrl = event.diplomaBgUrl
    ? (event.diplomaBgUrl.startsWith('/') ? event.diplomaBgUrl : event.diplomaBgUrl)
    : null;

  return (
    <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
      {/* ─── Controls Panel ─── */}
      <div style={{ flex: '0 0 280px', minWidth: 260 }}>
        <h4 style={{ fontSize: 16, fontWeight: 900, color: TEXT, marginBottom: 16, marginTop: 0 }}>
          Настройки цветов
        </h4>

        <ColorField label="Заголовок (ДИПЛОМ)" value={settings.titleColor} onChange={v => set('titleColor', v)} />
        <ColorField label="Подзаголовок" value={settings.subtitleColor} onChange={v => set('subtitleColor', v)} />
        <ColorField label="Имя участника" value={settings.nameColor} onChange={v => set('nameColor', v)} />
        <ColorField label="Дистанция" value={settings.distanceColor} onChange={v => set('distanceColor', v)} />
        <ColorField label="Вспомогательный текст" value={settings.textColor} onChange={v => set('textColor', v)} />
        <ColorField label="Подвал" value={settings.footerColor} onChange={v => set('footerColor', v)} />

        <div style={{ height: 1, background: BORDER, margin: '16px 0' }} />

        <h4 style={{ fontSize: 16, fontWeight: 900, color: TEXT, marginBottom: 16, marginTop: 0 }}>
          Размеры шрифтов
        </h4>

        <SizeField label="Заголовок" value={settings.titleSize} onChange={v => set('titleSize', v)} />
        <SizeField label="Имя участника" value={settings.nameSize} onChange={v => set('nameSize', v)} />
        <SizeField label="Дистанция" value={settings.distanceSize} onChange={v => set('distanceSize', v)} />

        <div style={{ height: 1, background: BORDER, margin: '16px 0' }} />

        <h4 style={{ fontSize: 16, fontWeight: 900, color: TEXT, marginBottom: 16, marginTop: 0 }}>
          Рамка
        </h4>

        <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 14, fontWeight: 700, color: TEXT, marginBottom: 12 }}>
          <input
            type="checkbox"
            checked={settings.showBorder}
            onChange={e => set('showBorder', e.target.checked)}
            style={{ width: 18, height: 18, accentColor: BRAND }}
          />
          Показывать рамку
        </label>

        {settings.showBorder && (
          <ColorField label="Цвет рамки" value={settings.borderColor} onChange={v => set('borderColor', v)} />
        )}

        <div style={{ height: 1, background: BORDER, margin: '16px 0' }} />

        <button
          onClick={handleSave}
          disabled={saving}
          style={{
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
          }}
        >
          {saving ? 'Сохранение...' : 'Сохранить настройки'}
        </button>

        <button
          onClick={() => setSettings({ ...DEFAULT_SETTINGS })}
          style={{
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
          }}
        >
          Сбросить по умолчанию
        </button>
      </div>

      {/* ─── Preview Panel ─── */}
      <div style={{ flex: 1, minWidth: 400 }}>
        <h4 style={{ fontSize: 16, fontWeight: 900, color: TEXT, marginBottom: 16, marginTop: 0 }}>
          Предпросмотр диплома
        </h4>

        <div
          style={{
            width: previewWidth,
            height: previewHeight,
            position: 'relative',
            background: bgUrl ? `url(${bgUrl}) center/cover no-repeat` : '#fff',
            borderRadius: 8,
            overflow: 'hidden',
            boxShadow: '0 4px 24px rgba(0,0,0,0.12)',
            border: `1px solid ${BORDER}`,
          }}
        >
          {/* Border overlay */}
          {settings.showBorder && (
            <>
              <div style={{
                position: 'absolute',
                top: 10,
                left: 10,
                right: 10,
                bottom: 10,
                border: `2px solid ${settings.borderColor}`,
                borderRadius: 2,
                pointerEvents: 'none',
              }} />
              <div style={{
                position: 'absolute',
                top: 16,
                left: 16,
                right: 16,
                bottom: 16,
                border: `1px solid ${settings.borderColor}`,
                borderRadius: 2,
                pointerEvents: 'none',
              }} />
            </>
          )}

          {/* Content */}
          <div style={{
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
          }}>
            {/* Top line */}
            <div style={{
              position: 'absolute',
              top: 28,
              left: 40,
              right: 40,
              height: 2,
              background: settings.footerColor,
            }} />

            {/* Title */}
            <div style={{
              fontSize: settings.titleSize * (previewWidth / 842),
              fontWeight: 900,
              color: settings.titleColor,
              letterSpacing: 2,
              marginBottom: 4,
            }}>
              ДИПЛОМ
            </div>

            {/* Subtitle */}
            <div style={{
              fontSize: 10,
              color: settings.subtitleColor,
              marginBottom: 2,
            }}>
              {subtitle}
            </div>

            {/* Event title */}
            <div style={{
              fontSize: 16,
              fontWeight: 700,
              color: settings.titleColor,
              marginBottom: 6,
              textAlign: 'center',
            }}>
              {event.title}
            </div>

            {/* Divider */}
            <div style={{ width: 120, height: 1, background: '#ddd', marginBottom: 6 }} />

            {/* Confirmation text */}
            <div style={{
              fontSize: 9,
              color: settings.textColor,
              marginBottom: 4,
            }}>
              Настоящим подтверждается, что
            </div>

            {/* Name */}
            <div style={{
              fontSize: settings.nameSize * (previewWidth / 842),
              fontWeight: 700,
              color: settings.nameColor,
              marginBottom: 4,
            }}>
              Иван Петров
            </div>

            {/* Completed text */}
            <div style={{
              fontSize: 9,
              color: settings.textColor,
              marginBottom: 4,
            }}>
              успешно завершил(а) дистанцию
            </div>

            {/* Distance */}
            <div style={{
              fontSize: settings.distanceSize * (previewWidth / 842),
              fontWeight: 900,
              color: settings.distanceColor,
              marginBottom: 6,
            }}>
              42.2 км
            </div>

            {/* Date info */}
            <div style={{
              fontSize: 7,
              color: settings.textColor,
              marginBottom: 2,
            }}>
              Период события: 1 января 2026 — 31 марта 2026
            </div>
            <div style={{
              fontSize: 7,
              color: settings.textColor,
              marginBottom: 8,
            }}>
              Дата завершения: 15 марта 2026
            </div>

            {/* Bottom line */}
            <div style={{
              position: 'absolute',
              bottom: 38,
              left: 40,
              right: 40,
              height: 2,
              background: settings.footerColor,
            }} />

            {/* Footer */}
            <div style={{
              position: 'absolute',
              bottom: 18,
              left: 0,
              right: 0,
              textAlign: 'center',
              fontSize: 9,
              fontWeight: 700,
              color: settings.footerColor,
            }}>
              SportRun — Виртуальные забеги
            </div>
          </div>
        </div>

        <div style={{ fontSize: 12, color: '#999', marginTop: 10 }}>
          Предпросмотр приблизительный. Реальный PDF может незначительно отличаться.
        </div>
      </div>
    </div>
  );
}
