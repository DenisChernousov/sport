import { useEffect, useRef, useState } from 'react';
import { useGpsTracker } from '@/hooks/useGpsTracker';
import { useTheme } from '@/context/ThemeContext';
import { api } from '@/services/api';

interface Props {
  onClose: () => void;
  onSaved?: () => void;
}

const SPORTS = [
  { id: 'running', label: 'Бег', icon: '🏃' },
  { id: 'cycling', label: 'Велосипед', icon: '🚴' },
  { id: 'walking', label: 'Ходьба', icon: '🚶' },
  { id: 'skiing', label: 'Лыжи', icon: '⛷️' },
];

function formatDuration(secs: number): string {
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = Math.floor(secs % 60);
  if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

export default function GpsTracker({ onClose, onSaved }: Props) {
  const { preset, primary } = useTheme();
  const { state, points, stats, error, accuracy, start, pause, resume, stop, reset } = useGpsTracker();
  const [sport, setSport] = useState('running');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [showSaveForm, setShowSaveForm] = useState(false);
  const [activityTitle, setActivityTitle] = useState('');
  const [savedOk, setSavedOk] = useState(false);

  const mapRef = useRef<HTMLDivElement>(null);
  const leafletRef = useRef<{
    map: L.Map;
    polyline: L.Polyline;
    marker: L.CircleMarker;
  } | null>(null);

  // Init Leaflet map
  useEffect(() => {
    if (!mapRef.current) return;
    import('leaflet').then(L => {
      if (leafletRef.current || !mapRef.current) return;

      // Fix default icons
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      });

      const map = L.map(mapRef.current!, {
        zoomControl: true,
        attributionControl: false,
      }).setView([55.75, 37.62], 13);

      L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
      }).addTo(map);

      const polyline = L.polyline([], {
        color: primary,
        weight: 4,
        opacity: 0.85,
      }).addTo(map);

      const marker = L.circleMarker([55.75, 37.62], {
        radius: 9,
        fillColor: primary,
        color: '#fff',
        weight: 3,
        fillOpacity: 1,
      }).addTo(map);

      leafletRef.current = { map, polyline, marker };
    });

    return () => {
      leafletRef.current?.map.remove();
      leafletRef.current = null;
    };
  }, []);

  // Update map when points change
  useEffect(() => {
    if (!leafletRef.current || points.length === 0) return;
    const { map, polyline, marker } = leafletRef.current;
    const latlngs = points.map(p => [p.lat, p.lng] as [number, number]);
    polyline.setLatLngs(latlngs);
    const last = points[points.length - 1];
    marker.setLatLng([last.lat, last.lng]);
    if (points.length <= 3) {
      map.setView([last.lat, last.lng], 16);
    } else {
      map.panTo([last.lat, last.lng]);
    }
  }, [points]);

  const handleStop = () => {
    const result = stop();
    if (result.stats.distance < 0.05) {
      reset();
      return;
    }
    setShowSaveForm(true);
  };

  const handleSave = async () => {
    const finalStop = stats;
    setSaving(true);
    setSaveError('');
    try {
      const geoJson = points.length >= 2 ? {
        type: 'LineString',
        coordinates: points.map(p => [p.lng, p.lat, p.alt ?? 0]),
      } : null;

      await api.activities.create({
        sport,
        title: activityTitle || `${SPORTS.find(s => s.id === sport)?.label ?? 'Тренировка'} ${new Date().toLocaleDateString('ru-RU')}`,
        distance: finalStop.distance,
        duration: Math.round(finalStop.duration),
        calories: finalStop.calories || null,
        elevGain: finalStop.elevGain > 0 ? Math.round(finalStop.elevGain) : null,
        startedAt: new Date(Date.now() - finalStop.duration * 1000).toISOString(),
        gpsTrack: geoJson,
      });
      setSavedOk(true);
      setTimeout(() => { onSaved?.(); onClose(); }, 1500);
    } catch {
      setSaveError('Ошибка сохранения. Попробуйте ещё раз.');
    } finally {
      setSaving(false);
    }
  };

  const isRunning = state === 'tracking';
  const isPaused = state === 'paused';
  const isIdle = state === 'idle';

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      background: preset.dark,
      display: 'flex', flexDirection: 'column',
    }}>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '12px 16px',
        background: preset.dark,
        borderBottom: `1px solid ${preset.secondary}55`,
        flexShrink: 0,
      }}>
        <button onClick={onClose} style={{
          width: 36, height: 36, borderRadius: 10, border: 'none',
          background: 'rgba(255,255,255,0.08)', color: preset.light,
          fontSize: 18, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>←</button>
        <span style={{ color: preset.light, fontWeight: 800, fontSize: 16 }}>GPS Тренировка</span>
        {/* Accuracy badge */}
        <div style={{
          padding: '4px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700,
          background: accuracy == null ? 'rgba(255,255,255,0.1)' :
            accuracy < 10 ? 'rgba(39,174,96,0.3)' :
            accuracy < 30 ? 'rgba(232,200,74,0.3)' : 'rgba(204,43,43,0.3)',
          color: accuracy == null ? '#aaa' : accuracy < 10 ? '#2ecc71' : accuracy < 30 ? '#E8C84A' : '#e74c3c',
        }}>
          {accuracy == null ? 'GPS...' : `±${Math.round(accuracy)}м`}
        </div>
      </div>

      {/* Map */}
      <div ref={mapRef} style={{ flex: 1, minHeight: 0 }} />

      {/* Stats overlay */}
      {(isRunning || isPaused || state === 'finished') && (
        <div style={{
          position: 'absolute', top: 70, left: 12, right: 12,
          background: 'rgba(13,27,42,0.88)',
          backdropFilter: 'blur(8px)',
          borderRadius: 16, padding: '14px 18px',
          display: 'grid', gridTemplateColumns: '1fr 1fr 1fr',
          gap: 12, border: `1px solid ${preset.secondary}66`,
        }}>
          <StatBox label="Дистанция" value={stats.distance >= 1 ? stats.distance.toFixed(2) : (stats.distance * 1000).toFixed(0)} unit={stats.distance >= 1 ? 'км' : 'м'} primary={primary} light={preset.light} />
          <StatBox label="Время" value={formatDuration(stats.duration)} unit="" primary={primary} light={preset.light} />
          <StatBox label="Темп" value={stats.avgPace} unit="/км" primary={primary} light={preset.light} />
          <StatBox label="Скорость" value={stats.currentSpeed.toFixed(1)} unit="км/ч" primary={primary} light={preset.light} />
          <StatBox label="Ср. скорость" value={stats.avgSpeed.toFixed(1)} unit="км/ч" primary={primary} light={preset.light} />
          <StatBox label="Калории" value={String(stats.calories)} unit="ккал" primary={primary} light={preset.light} />
        </div>
      )}

      {/* Error */}
      {error && (
        <div style={{
          position: 'absolute', top: 70, left: 12, right: 12,
          background: 'rgba(204,43,43,0.9)', borderRadius: 12,
          padding: '12px 16px', color: '#fff', fontSize: 13, fontWeight: 600,
          textAlign: 'center',
        }}>
          {error}
        </div>
      )}

      {/* Bottom Controls */}
      <div style={{
        background: preset.dark,
        borderTop: `1px solid ${preset.secondary}55`,
        padding: '16px 20px 32px',
        flexShrink: 0,
      }}>
        {/* Sport selector — only when idle */}
        {isIdle && (
          <div style={{ display: 'flex', gap: 8, marginBottom: 16, justifyContent: 'center' }}>
            {SPORTS.map(s => (
              <button key={s.id} onClick={() => setSport(s.id)} style={{
                padding: '8px 14px', borderRadius: 10, border: `1.5px solid ${sport === s.id ? primary : preset.secondary + '66'}`,
                background: sport === s.id ? primary + '22' : 'transparent',
                color: sport === s.id ? primary : preset.light,
                fontSize: 13, fontWeight: 700, cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: 6,
              }}>
                <span>{s.icon}</span>{s.label}
              </button>
            ))}
          </div>
        )}

        {/* Main action buttons */}
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', alignItems: 'center' }}>
          {isIdle && (
            <button onClick={start} style={{
              width: 72, height: 72, borderRadius: '50%', border: 'none',
              background: primary, color: '#fff',
              fontSize: 28, cursor: 'pointer',
              boxShadow: `0 4px 24px ${primary}66`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>▶</button>
          )}

          {isRunning && (
            <>
              <button onClick={pause} style={{
                width: 60, height: 60, borderRadius: '50%', border: 'none',
                background: preset.secondary, color: preset.light,
                fontSize: 22, cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>⏸</button>
              <button onClick={handleStop} style={{
                width: 72, height: 72, borderRadius: '50%', border: 'none',
                background: primary, color: '#fff',
                fontSize: 26, cursor: 'pointer',
                boxShadow: `0 4px 24px ${primary}66`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>⏹</button>
            </>
          )}

          {isPaused && (
            <>
              <button onClick={resume} style={{
                width: 72, height: 72, borderRadius: '50%', border: 'none',
                background: primary, color: '#fff',
                fontSize: 28, cursor: 'pointer',
                boxShadow: `0 4px 24px ${primary}66`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>▶</button>
              <button onClick={handleStop} style={{
                width: 60, height: 60, borderRadius: '50%', border: 'none',
                background: '#CC2B2B33', color: '#e74c3c',
                fontSize: 22, cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>■</button>
            </>
          )}
        </div>

        {isIdle && (
          <p style={{ color: preset.secondary, fontSize: 12, textAlign: 'center', margin: '12px 0 0' }}>
            Выберите вид активности и нажмите ▶ для старта
          </p>
        )}
        {isRunning && (
          <p style={{ color: '#2ecc71', fontSize: 12, textAlign: 'center', margin: '12px 0 0', fontWeight: 700 }}>
            ● ЗАПИСЬ...
          </p>
        )}
        {isPaused && (
          <p style={{ color: preset.gold, fontSize: 12, textAlign: 'center', margin: '12px 0 0', fontWeight: 700 }}>
            ⏸ ПАУЗА
          </p>
        )}
      </div>

      {/* Save Form Modal */}
      {showSaveForm && (
        <div style={{
          position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.75)',
          display: 'flex', alignItems: 'flex-end', zIndex: 10,
        }}>
          <div style={{
            width: '100%', background: preset.dark, borderRadius: '20px 20px 0 0',
            padding: '24px 20px 40px', border: `1px solid ${preset.secondary}55`,
          }}>
            {savedOk ? (
              <div style={{ textAlign: 'center', padding: '20px 0' }}>
                <div style={{ fontSize: 48, marginBottom: 12 }}>✅</div>
                <div style={{ color: preset.light, fontWeight: 800, fontSize: 18 }}>Сохранено!</div>
              </div>
            ) : (
              <>
                <h3 style={{ color: preset.light, margin: '0 0 6px', fontSize: 20, fontWeight: 900 }}>
                  Сохранить тренировку
                </h3>
                <div style={{ color: preset.secondary, fontSize: 13, marginBottom: 20 }}>
                  {stats.distance.toFixed(2)} км · {formatDuration(stats.duration)} · {stats.calories} ккал
                </div>

                <input
                  placeholder="Название (необязательно)"
                  value={activityTitle}
                  onChange={e => setActivityTitle(e.target.value)}
                  style={{
                    width: '100%', padding: '12px 14px', borderRadius: 10,
                    border: `1.5px solid ${preset.secondary}66`,
                    background: 'rgba(255,255,255,0.06)', color: preset.light,
                    fontSize: 14, outline: 'none', boxSizing: 'border-box', marginBottom: 16,
                  }}
                />

                {saveError && (
                  <div style={{ color: '#e74c3c', fontSize: 13, marginBottom: 12 }}>{saveError}</div>
                )}

                <div style={{ display: 'flex', gap: 10 }}>
                  <button onClick={() => { setShowSaveForm(false); reset(); }} style={{
                    flex: 1, padding: '13px 0', borderRadius: 12, border: `1px solid ${preset.secondary}55`,
                    background: 'transparent', color: preset.light, fontSize: 14, fontWeight: 700, cursor: 'pointer',
                  }}>
                    Удалить
                  </button>
                  <button onClick={handleSave} disabled={saving} style={{
                    flex: 2, padding: '13px 0', borderRadius: 12, border: 'none',
                    background: primary, color: '#fff', fontSize: 14, fontWeight: 800, cursor: 'pointer',
                    opacity: saving ? 0.7 : 1,
                  }}>
                    {saving ? 'Сохранение...' : 'Сохранить'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function StatBox({ label, value, unit, primary, light }: {
  label: string; value: string; unit: string; primary: string; light: string;
}) {
  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{ fontSize: 11, color: '#6B8299', fontWeight: 600, marginBottom: 2 }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 900, color: light, lineHeight: 1 }}>
        {value}<span style={{ fontSize: 11, color: primary, marginLeft: 2 }}>{unit}</span>
      </div>
    </div>
  );
}
