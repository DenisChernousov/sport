import { useEffect, useRef, useState } from 'react';
import { useGpsTracker } from '@/hooks/useGpsTracker';
import { useTheme } from '@/context/ThemeContext';
import { api } from '@/services/api';
import type { TrackerStats } from '@/hooks/useGpsTracker';

interface Props { onClose: () => void; onSaved?: () => void; }

const SPORTS = [
  { id: 'running',  label: 'Бег',        icon: '🏃' },
  { id: 'cycling',  label: 'Велосипед',   icon: '🚴' },
  { id: 'walking',  label: 'Ходьба',      icon: '🚶' },
  { id: 'skiing',   label: 'Лыжи',        icon: '⛷️' },
];

function pad(n: number) { return n.toString().padStart(2, '0'); }
function fmtTime(s: number) {
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = Math.floor(s % 60);
  return h > 0 ? `${h}:${pad(m)}:${pad(sec)}` : `${pad(m)}:${pad(sec)}`;
}
function fmtDist(km: number) {
  return km >= 1 ? `${km.toFixed(2)} км` : `${Math.round(km * 1000)} м`;
}

export default function GpsTracker({ onClose, onSaved }: Props) {
  const { preset, primary } = useTheme();
  const { state, points, stats, error, accuracy, start, pause, resume, stop, reset } = useGpsTracker();
  const [sport, setSport] = useState('running');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [showSave, setShowSave] = useState(false);
  const [title, setTitle] = useState('');
  const [savedOk, setSavedOk] = useState(false);
  const [finalStats, setFinalStats] = useState<TrackerStats | null>(null);

  const mapRef = useRef<HTMLDivElement>(null);
  const leafRef = useRef<{ map: any; line: any; dot: any } | null>(null);

  // Init map
  useEffect(() => {
    if (!mapRef.current) return;
    let alive = true;
    import('leaflet').then(L => {
      if (!alive || leafRef.current || !mapRef.current) return;
      const map = L.map(mapRef.current!, { zoomControl: false, attributionControl: false })
        .setView([55.75, 37.62], 14);
      L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19 }).addTo(map);

      // zoom control top-right
      L.control.zoom({ position: 'topright' }).addTo(map);

      const line = L.polyline([], { color: primary, weight: 5, opacity: 0.9 }).addTo(map);

      // Pulsing dot for current position
      const dot = L.circleMarker([55.75, 37.62], {
        radius: 10, fillColor: primary, color: '#fff', weight: 3, fillOpacity: 1,
      }).addTo(map);

      leafRef.current = { map, line, dot };
    });
    return () => { alive = false; leafRef.current?.map.remove(); leafRef.current = null; };
  }, []);

  // Update track on new points
  useEffect(() => {
    if (!leafRef.current || points.length === 0) return;
    const { map, line, dot } = leafRef.current;
    const lls = points.map(p => [p.lat, p.lng] as [number, number]);
    line.setLatLngs(lls);
    const last = points[points.length - 1];
    dot.setLatLng([last.lat, last.lng]);
    if (points.length <= 2) map.setView([last.lat, last.lng], 17);
    else map.panTo([last.lat, last.lng], { animate: true, duration: 0.5 });
  }, [points]);

  const handleStop = () => {
    const res = stop();
    setFinalStats(res.stats);
    // Always show save form — let user correct manually if GPS didn't work
    setShowSave(true);
  };

  const handleSave = async () => {
    const fs = finalStats ?? stats;
    if (fs.distance <= 0 || fs.duration <= 0) {
      setSaveError('GPS не записал данные. Нужно двигаться с активным GPS.');
      return;
    }
    setSaving(true); setSaveError('');
    try {
      await api.activities.create({
        sport,
        title: title || `${SPORTS.find(s => s.id === sport)?.label} ${new Date().toLocaleDateString('ru-RU')}`,
        distance: fs.distance,
        duration: Math.round(fs.duration),
        calories: fs.calories || null,
        elevGain: fs.elevGain > 0 ? Math.round(fs.elevGain) : null,
        startedAt: new Date(Date.now() - fs.duration * 1000).toISOString(),
        gpsTrack: points.length >= 2 ? {
          type: 'LineString',
          coordinates: points.map(p => [p.lng, p.lat, p.alt ?? 0]),
        } : null,
      });
      setSavedOk(true);
      setTimeout(() => { onSaved?.(); onClose(); }, 1400);
    } catch { setSaveError('Ошибка сохранения. Попробуйте ещё раз.'); }
    finally { setSaving(false); }
  };

  const isIdle = state === 'idle';
  const isRunning = state === 'tracking';
  const isPaused = state === 'paused';
  const isActive = isRunning || isPaused;

  const acColor = accuracy == null ? '#888' : accuracy < 15 ? '#2ecc71' : accuracy < 40 ? '#E8C84A' : '#e74c3c';
  const acBg   = accuracy == null ? 'rgba(255,255,255,0.08)' : accuracy < 15 ? 'rgba(46,204,113,0.18)' : accuracy < 40 ? 'rgba(232,200,74,0.18)' : 'rgba(204,43,43,0.2)';

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      display: 'flex', flexDirection: 'column',
      background: '#0a1628',
      // safe area support
      paddingTop: 'env(safe-area-inset-top)',
      paddingBottom: 'env(safe-area-inset-bottom)',
    }}>

      {/* ── Header ─────────────────────────────── */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '10px 14px', background: preset.dark, flexShrink: 0,
        borderBottom: `1px solid rgba(255,255,255,0.07)`,
      }}>
        <button onClick={onClose} style={{
          width: 38, height: 38, borderRadius: 10, border: 'none',
          background: 'rgba(255,255,255,0.1)', color: preset.light,
          fontSize: 20, cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>‹</button>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {isRunning && <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#2ecc71', display: 'inline-block', boxShadow: '0 0 6px #2ecc71' }} />}
          {isPaused  && <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#E8C84A', display: 'inline-block' }} />}
          <span style={{ color: preset.light, fontWeight: 800, fontSize: 15 }}>
            {isIdle ? 'GPS Тренировка' : isRunning ? 'Запись...' : 'Пауза'}
          </span>
        </div>

        <div style={{ padding: '4px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700, background: acBg, color: acColor }}>
          {accuracy == null ? 'GPS…' : `±${Math.round(accuracy)}м`}
        </div>
      </div>

      {/* ── Map ─────────────────────────────────── */}
      <div style={{ position: 'relative', flex: 1, minHeight: 0 }}>
        <div ref={mapRef} style={{ position: 'absolute', inset: 0 }} />

        {/* Error banner over map */}
        {error && (
          <div style={{
            position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10,
            background: 'rgba(204,43,43,0.95)', color: '#fff',
            padding: '10px 16px', fontSize: 13, fontWeight: 600, textAlign: 'center',
          }}>{error}</div>
        )}

        {/* Stats overlay (active/paused) — bottom of map */}
        {isActive && (
          <div style={{
            position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 10,
            background: 'linear-gradient(transparent, rgba(10,22,40,0.97) 30%)',
            padding: '28px 14px 14px',
            pointerEvents: 'none',
          }}>
            {/* Timer */}
            <div style={{ textAlign: 'center', marginBottom: 8, fontVariantNumeric: 'tabular-nums' }}>
              <span style={{
                fontSize: 44, fontWeight: 900, color: '#fff',
                letterSpacing: -2, lineHeight: 1, fontFamily: 'ui-monospace, monospace',
              }}>
                {fmtTime(stats.duration)}
              </span>
            </div>
            {/* Stats row */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6 }}>
              <Stat label="Дистанция" value={fmtDist(stats.distance)} accent={primary} />
              <Stat label="Ср. темп"  value={stats.avgPace + ' /км'} accent={primary} />
              <Stat label="Скорость"  value={stats.currentSpeed.toFixed(1) + ' км/ч'} accent={primary} />
            </div>
          </div>
        )}
      </div>

      {/* ── Bottom bar (controls only) ───────────── */}
      <div style={{
        background: preset.dark, flexShrink: 0,
        borderTop: `1px solid rgba(255,255,255,0.08)`,
        padding: '12px 0 16px',
      }}>
        {/* Sport selector (idle only) */}
        {isIdle && (
          <>
            <div style={{ display: 'flex', gap: 6, padding: '0 14px 10px', justifyContent: 'center', flexWrap: 'wrap' }}>
              {SPORTS.map(s => (
                <button key={s.id} onClick={() => setSport(s.id)} style={{
                  padding: '7px 13px', borderRadius: 10,
                  border: `1.5px solid ${sport === s.id ? primary : 'rgba(255,255,255,0.15)'}`,
                  background: sport === s.id ? `${primary}28` : 'transparent',
                  color: sport === s.id ? primary : '#8aadcc',
                  fontSize: 13, fontWeight: 700, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: 5,
                }}>
                  <span style={{ fontSize: 16 }}>{s.icon}</span>{s.label}
                </button>
              ))}
            </div>
            <p style={{ color: '#4a6a88', fontSize: 12, textAlign: 'center', margin: '0 0 10px' }}>
              Нажмите ▶ для старта записи маршрута
            </p>
          </>
        )}

        {/* Controls */}
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 20 }}>
          {isIdle && (
            <Btn size={72} bg={primary} shadow={primary} onClick={start}>
              <svg viewBox="0 0 24 24" fill="white" style={{ width: 28, height: 28, marginLeft: 3 }}>
                <path d="M8 5v14l11-7z"/>
              </svg>
            </Btn>
          )}

          {isRunning && (
            <>
              <Btn size={56} bg="rgba(255,255,255,0.1)" onClick={pause}>
                <svg viewBox="0 0 24 24" fill="white" style={{ width: 22, height: 22 }}>
                  <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>
                </svg>
              </Btn>
              <Btn size={72} bg={primary} shadow={primary} onClick={handleStop}>
                <svg viewBox="0 0 24 24" fill="white" style={{ width: 26, height: 26 }}>
                  <path d="M6 6h12v12H6z"/>
                </svg>
              </Btn>
            </>
          )}

          {isPaused && (
            <>
              <Btn size={72} bg={primary} shadow={primary} onClick={resume}>
                <svg viewBox="0 0 24 24" fill="white" style={{ width: 28, height: 28, marginLeft: 3 }}>
                  <path d="M8 5v14l11-7z"/>
                </svg>
              </Btn>
              <Btn size={56} bg="rgba(204,43,43,0.25)" border="#CC2B2B" onClick={handleStop}>
                <svg viewBox="0 0 24 24" fill="#e74c3c" style={{ width: 22, height: 22 }}>
                  <path d="M6 6h12v12H6z"/>
                </svg>
              </Btn>
            </>
          )}
        </div>
      </div>

      {/* ── Save sheet ──────────────────────────── */}
      {showSave && (
        <div style={{
          position: 'absolute', inset: 0,
          background: 'rgba(0,0,0,0.7)',
          display: 'flex', alignItems: 'flex-end', zIndex: 20,
        }}>
          <div style={{
            width: '100%', background: '#0f2035',
            borderRadius: '22px 22px 0 0',
            padding: '6px 0 0',
            maxHeight: '90vh',
            overflowY: 'auto',
            WebkitOverflowScrolling: 'touch',
          } as React.CSSProperties}>
            {/* drag handle */}
            <div style={{ width: 40, height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.2)', margin: '0 auto 18px' }} />

            {savedOk ? (
              <div style={{ textAlign: 'center', padding: '24px 20px 40px' }}>
                <div style={{ fontSize: 56, marginBottom: 12 }}>✅</div>
                <div style={{ color: '#fff', fontWeight: 900, fontSize: 22 }}>Сохранено!</div>
              </div>
            ) : (
              <div style={{ padding: '0 20px 40px' }}>
                <div style={{ color: '#fff', fontWeight: 900, fontSize: 20, marginBottom: 14 }}>
                  Сохранить тренировку
                </div>

                {/* Summary row */}
                <div style={{
                  display: 'grid', gridTemplateColumns: '1fr 1fr 1fr',
                  gap: 8, marginBottom: 18,
                  background: 'rgba(255,255,255,0.05)', borderRadius: 14, padding: '14px 10px',
                }}>
                  <SaveStat label="Дистанция" value={fmtDist(finalStats?.distance ?? stats.distance)} />
                  <SaveStat label="Время"     value={fmtTime(finalStats?.duration ?? stats.duration)} />
                  <SaveStat label="Темп"      value={(finalStats?.avgPace ?? stats.avgPace) + '/км'} />
                  <SaveStat label="Скорость"  value={(finalStats?.avgSpeed ?? stats.avgSpeed).toFixed(1) + ' км/ч'} />
                  <SaveStat label="Калории"   value={(finalStats?.calories ?? stats.calories) + ' кк'} />
                  <SaveStat label="Подъём"    value={(finalStats?.elevGain ?? stats.elevGain) + ' м'} />
                </div>

                <input
                  placeholder="Название тренировки (необязательно)"
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  style={{
                    width: '100%', padding: '13px 14px', borderRadius: 12,
                    border: '1.5px solid rgba(255,255,255,0.15)',
                    background: 'rgba(255,255,255,0.07)', color: '#fff',
                    fontSize: 14, outline: 'none', boxSizing: 'border-box', marginBottom: 14,
                  }}
                />

                {/* Sport selector in save form */}
                <div style={{ display: 'flex', gap: 6, marginBottom: 16, flexWrap: 'wrap' }}>
                  {SPORTS.map(s => (
                    <button key={s.id} onClick={() => setSport(s.id)} style={{
                      padding: '6px 12px', borderRadius: 8,
                      border: `1.5px solid ${sport === s.id ? primary : 'rgba(255,255,255,0.15)'}`,
                      background: sport === s.id ? `${primary}28` : 'transparent',
                      color: sport === s.id ? primary : '#8aadcc',
                      fontSize: 13, fontWeight: 700, cursor: 'pointer',
                    }}>{s.icon} {s.label}</button>
                  ))}
                </div>

                {saveError && <div style={{ color: '#e74c3c', fontSize: 13, marginBottom: 12 }}>{saveError}</div>}

                <div style={{ display: 'flex', gap: 10 }}>
                  <button onClick={() => { setShowSave(false); reset(); }} style={{
                    flex: 1, padding: '14px 0', borderRadius: 13,
                    border: '1px solid rgba(255,255,255,0.15)',
                    background: 'transparent', color: '#8aadcc',
                    fontSize: 14, fontWeight: 700, cursor: 'pointer',
                  }}>Удалить</button>
                  <button onClick={handleSave} disabled={saving} style={{
                    flex: 2, padding: '14px 0', borderRadius: 13, border: 'none',
                    background: primary, color: '#fff',
                    fontSize: 15, fontWeight: 900, cursor: 'pointer',
                    opacity: saving ? 0.7 : 1,
                    boxShadow: `0 4px 16px ${primary}55`,
                  }}>
                    {saving ? 'Сохранение...' : 'Сохранить ✓'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/* ── helpers ── */

function Btn({ size, bg, shadow, border, onClick, children }: {
  size: number; bg: string; shadow?: string; border?: string;
  onClick: () => void; children: React.ReactNode;
}) {
  return (
    <button onClick={onClick} style={{
      width: size, height: size, borderRadius: '50%', border: border ? `2px solid ${border}` : 'none',
      background: bg, cursor: 'pointer', flexShrink: 0,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      boxShadow: shadow ? `0 4px 20px ${shadow}55` : 'none',
    }}>{children}</button>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent: string }) {
  return (
    <div style={{
      background: 'rgba(255,255,255,0.05)', borderRadius: 10,
      padding: '8px 10px', textAlign: 'center',
    }}>
      <div style={{ fontSize: 10, color: '#4a6a88', fontWeight: 600, marginBottom: 3, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</div>
      <div style={{ fontSize: 15, fontWeight: 800, color: '#fff', lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>{value}</div>
    </div>
  );
}

function SaveStat({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{ fontSize: 10, color: '#4a6a88', fontWeight: 600, marginBottom: 3 }}>{label}</div>
      <div style={{ fontSize: 14, fontWeight: 800, color: '#fff', fontVariantNumeric: 'tabular-nums' }}>{value}</div>
    </div>
  );
}
