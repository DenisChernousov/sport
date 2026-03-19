import { useCallback, useEffect, useRef, useState } from 'react';
import type { ChangeEvent, FormEvent } from 'react';
import type { Activity, SportType } from '@/types';
import { api } from '@/services/api';
import { useAuth } from '@/context/AuthContext';
import Tesseract from 'tesseract.js';

const SPORT_ICONS: Record<SportType, string> = {
  RUNNING: '🏃',
  CYCLING: '🚴',
  SKIING: '⛷️',
  WALKING: '🚶',
};

const SPORT_COLORS: Record<SportType, string> = {
  RUNNING: '#fc4c02',
  CYCLING: '#0061ff',
  SKIING: '#0891b2',
  WALKING: '#7c3aed',
};

const SPORT_LABELS: Record<SportType, string> = {
  RUNNING: 'Бег',
  CYCLING: 'Велосипед',
  SKIING: 'Лыжи',
  WALKING: 'Ходьба',
};

const SPORT_AUTO_TITLES: Record<SportType, string> = {
  RUNNING: 'Пробежка',
  CYCLING: 'Велопрогулка',
  SKIING: 'Лыжная прогулка',
  WALKING: 'Прогулка',
};

const ALL_SPORTS: SportType[] = ['RUNNING', 'CYCLING', 'SKIING', 'WALKING'];

function formatDistance(km: number): string {
  return `${km.toFixed(1)} км`;
}

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) return `${h}ч ${m}м`;
  if (m > 0) return `${m}м ${s}с`;
  return `${s}с`;
}

function formatPace(durationSec: number, distanceKm: number): string {
  if (distanceKm <= 0) return '—';
  const totalMinutes = durationSec / distanceKm / 60;
  const mins = Math.floor(totalMinutes);
  const secs = Math.round((totalMinutes - mins) * 60);
  return `${mins}:${String(secs).padStart(2, '0')} мин/км`;
}

function formatSpeed(durationSec: number, distanceKm: number): string {
  if (durationSec <= 0) return '—';
  const speed = (distanceKm / durationSec) * 3600;
  return `${speed.toFixed(1)} км/ч`;
}

function formatDate(dateStr: string): string {
  try {
    return new Intl.DateTimeFormat('ru-RU', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }).format(new Date(dateStr));
  } catch {
    return dateStr;
  }
}

function autoTitle(sport: SportType, distanceMeters: number): string {
  return `${SPORT_AUTO_TITLES[sport]} ${distanceMeters.toFixed(1)} км`;
}

// --- OCR parsing helpers ---

function parseDistanceFromText(text: string): string {
  // Simple rule: "км" WITHOUT "/ч" or "в час" = distance. Everything else ignored.
  // Speed is NOT parsed from OCR — we calculate it from distance/time.

  const allText = text.replace(/\n/g, ' ');

  // Step 1: Remove everything that is speed (км/ч, km/h, кмч, etc.)
  const noSpeed = allText
    .replace(/\d{1,4}[.,]?\d{0,3}\s*(?:[кК][мМ]\s*\/\s*[чЧ]|km\s*\/\s*h|кмч|mph)/gi, '')
    .replace(/\d{1,4}[.,]?\d{0,3}\s*(?:[мМ]ин\s*\/\s*[кК][мМ]|min\s*\/\s*km)/gi, '')
    .replace(/\d{1,5}\s*(?:ккал|kcal|cal)/gi, '')
    .replace(/\d{1,4}[.,]\d{2}\s*(?:\/\s*)?(?:[кК][мМ]|km)\b/gi, '') // pace without explicit unit "мин"
    .replace(/\d{5,}/g, ''); // remove long digit sequences

  // Step 2: Find number + "км" or "km" in cleaned text
  const distMatch = noSpeed.match(/(\d{1,4}[.,]\d{1,3})\s*(?:км|km)/i)
    || noSpeed.match(/(\d{1,4})\s*(?:км|km)/i);
  if (distMatch) return distMatch[1].replace(',', '.');

  // Step 3: Check if "км" is on a separate line after a number
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  for (let i = 0; i < lines.length; i++) {
    if (/^км$/i.test(lines[i]) && i > 0) {
      const prev = lines[i - 1].match(/(\d{1,4}[.,]\d{1,3})/);
      if (prev) return prev[1].replace(',', '.');
    }
  }

  // Step 4: Find decimal numbers in order of appearance (top-to-bottom OCR scan).
  // Distance is usually the first prominent metric shown; pace/speed are already removed.
  const decimalNums = [...noSpeed.matchAll(/(\d{1,4}[.,]\d{1,3})/g)]
    .map(m => ({ raw: m[1], val: parseFloat(m[1].replace(',', '.')) }))
    .filter(c => c.val >= 0.5 && c.val <= 300);
  if (decimalNums.length > 0) {
    // Prefer values in the common recreational distance range (0.5–100 km) that appear first
    const inRange = decimalNums.filter(c => c.val <= 100);
    const chosen = inRange.length > 0 ? inRange[0] : decimalNums[0];
    return chosen.raw.replace(',', '.');
  }

  // Step 5: No decimals found — try integers
  const intNums = [...noSpeed.matchAll(/\b(\d{1,4})\b/g)]
    .map(m => ({ raw: m[1], val: parseInt(m[1], 10) }))
    .filter(c => c.val >= 1 && c.val <= 300);
  if (intNums.length > 0) {
    return intNums[0].raw;
  }

  return '';
}

interface ParsedDuration {
  hours: string;
  minutes: string;
  seconds: string;
}

function parseDurationFromText(text: string): ParsedDuration {
  const empty: ParsedDuration = { hours: '', minutes: '', seconds: '' };

  // "1:05:30" or "01:05:30"
  const hmsMatch = text.match(/(\d{1,2}):(\d{2}):(\d{2})/);
  if (hmsMatch) {
    return { hours: hmsMatch[1], minutes: hmsMatch[2], seconds: hmsMatch[3] };
  }

  // "30:15" (mm:ss)
  const msMatch = text.match(/\b(\d{1,3}):(\d{2})\b/);
  if (msMatch) {
    const mins = parseInt(msMatch[1], 10);
    if (mins < 60) {
      return { hours: '', minutes: msMatch[1], seconds: msMatch[2] };
    } else {
      const h = Math.floor(mins / 60);
      const m = mins % 60;
      return { hours: String(h), minutes: String(m), seconds: msMatch[2] };
    }
  }

  // "1ч 05м", "1ч05м", "1 ч 05 м"
  const ruMatch = text.match(/(\d{1,2})\s*ч\s*(\d{1,2})\s*м/i);
  if (ruMatch) {
    return { hours: ruMatch[1], minutes: ruMatch[2], seconds: '' };
  }

  // "30м" or "30 мин" or "30 min"
  const minOnly = text.match(/(\d{1,3})\s*(?:м(?:ин)?|min)\b/i);
  if (minOnly) {
    return { hours: '', minutes: minOnly[1], seconds: '' };
  }

  return empty;
}

function parsePaceFromText(text: string): { minutes: string; seconds: string } | null {
  // "5:30 /km", "5:30/км", "5'30", "5'30\""
  const paceMatch = text.match(/(\d{1,2})[:'′](\d{2})\s*(?:\/?\s*(?:km|км|\/km|\/км))?/i);
  if (paceMatch) {
    return { minutes: paceMatch[1], seconds: paceMatch[2] };
  }
  return null;
}

// --- Activity Detail Modal ---

interface ActivityPhotoItem {
  id: string;
  activityId: string;
  imageUrl: string;
  createdAt: string;
}

function ActivityDetailModal({
  activity,
  onClose,
  isOwner,
}: {
  activity: Activity;
  onClose: () => void;
  isOwner: boolean;
}) {
  const distKm = activity.distance ?? 0;
  const durationSec = activity.duration ?? 0;
  const showPace = activity.sport === 'RUNNING' || activity.sport === 'WALKING';
  const title = activity.title || autoTitle(activity.sport, activity.distance ?? 0);

  const [photos, setPhotos] = useState<ActivityPhotoItem[]>([]);
  const [lightboxIdx, setLightboxIdx] = useState<number | null>(null);
  const [uploading, setUploading] = useState(false);
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const photoInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    api.photos.list(activity.id).then(setPhotos).catch(() => {});
    api.photos.getLikes(activity.id).then((r) => {
      setLiked(r?.liked ?? false);
      setLikeCount(r?.count ?? 0);
    }).catch(() => {});
  }, [activity.id]);

  const handlePhotoUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files;
    if (!fileList || fileList.length === 0) return;
    setUploading(true);
    try {
      const files = Array.from(fileList).slice(0, 5);
      const newPhotos = await api.photos.upload(activity.id, files);
      setPhotos((prev) => [...prev, ...(newPhotos ?? [])]);
    } catch {
      // ignore
    } finally {
      setUploading(false);
      if (photoInputRef.current) photoInputRef.current.value = '';
    }
  };

  const handleDeletePhoto = async (photoId: string) => {
    try {
      await api.photos.delete(photoId);
      setPhotos((prev) => prev.filter((p) => p.id !== photoId));
    } catch {
      // ignore
    }
  };

  const handleLike = async () => {
    try {
      const result = await api.photos.like(activity.id);
      setLiked(result?.liked ?? false);
      setLikeCount(result?.count ?? 0);
    } catch {
      // ignore
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
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        style={{
          background: '#fff',
          borderRadius: 20,
          padding: 28,
          maxWidth: 560,
          width: '100%',
          maxHeight: '90vh',
          overflowY: 'auto',
          boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
          position: 'relative',
        }}
      >
        {/* Закрыть */}
        <button
          type="button"
          onClick={onClose}
          style={{
            position: 'absolute',
            top: 16,
            right: 16,
            background: 'none',
            border: 'none',
            color: '#999',
            cursor: 'pointer',
            fontSize: 22,
            padding: '4px 8px',
            borderRadius: 6,
            lineHeight: 1,
          }}
        >
          ✕
        </button>

        {/* Заголовок */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
          <span style={{ fontSize: 40 }}>{SPORT_ICONS[activity.sport]}</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 20, fontWeight: 700, color: '#242424' }}>{title}</div>
            <div style={{ fontSize: 13, color: '#999', marginTop: 2 }}>
              {SPORT_LABELS[activity.sport]} &middot; {formatDate(activity.startedAt ?? activity.createdAt)}
            </div>
          </div>
          {/* Like button */}
          <button
            type="button"
            onClick={handleLike}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              background: liked ? '#fff0f0' : '#f5f5f5',
              border: liked ? '1.5px solid #fc4c02' : '1.5px solid #e0e0e0',
              borderRadius: 20,
              padding: '6px 14px',
              cursor: 'pointer',
              fontSize: 14,
              fontWeight: 600,
              color: liked ? '#fc4c02' : '#999',
              transition: 'all 0.2s',
              flexShrink: 0,
            }}
          >
            <span style={{ fontSize: 16 }}>{liked ? '❤️' : '♡'}</span>
            {likeCount > 0 && <span>{likeCount}</span>}
          </button>
        </div>

        {/* Основные метрики */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr 1fr',
            gap: 12,
            marginBottom: 20,
          }}
        >
          <div
            style={{
              background: '#fef3ee',
              borderRadius: 12,
              padding: 16,
              textAlign: 'center',
            }}
          >
            <div style={{ fontSize: 24, fontWeight: 700, color: SPORT_COLORS[activity.sport] }}>
              {formatDistance(activity.distance ?? 0)}
            </div>
            <div style={{ fontSize: 12, color: '#999', marginTop: 4 }}>Дистанция</div>
          </div>
          <div
            style={{
              background: '#f5f5f5',
              borderRadius: 12,
              padding: 16,
              textAlign: 'center',
            }}
          >
            <div style={{ fontSize: 24, fontWeight: 700, color: '#242424' }}>
              {formatDuration(durationSec)}
            </div>
            <div style={{ fontSize: 12, color: '#999', marginTop: 4 }}>Время</div>
          </div>
          <div
            style={{
              background: '#f5f5f5',
              borderRadius: 12,
              padding: 16,
              textAlign: 'center',
            }}
          >
            <div style={{ fontSize: 24, fontWeight: 700, color: '#242424' }}>
              {showPace ? formatPace(durationSec, distKm) : formatSpeed(durationSec, distKm)}
            </div>
            <div style={{ fontSize: 12, color: '#999', marginTop: 4 }}>
              {showPace ? 'Темп' : 'Скорость'}
            </div>
          </div>
        </div>

        {/* Описание */}
        {activity.description && (
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 13, color: '#999', marginBottom: 6 }}>Описание</div>
            <div style={{ fontSize: 14, color: '#242424', lineHeight: 1.5 }}>
              {activity.description}
            </div>
          </div>
        )}


        {/* Photo gallery */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <div style={{ fontSize: 13, color: '#999' }}>Фотографии {photos.length > 0 ? `(${photos.length})` : ''}</div>
            {isOwner && (
              <label
                style={{
                  padding: '5px 12px',
                  borderRadius: 8,
                  border: '1.5px solid #fc4c02',
                  background: '#fff',
                  color: '#fc4c02',
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: uploading ? 'not-allowed' : 'pointer',
                  opacity: uploading ? 0.6 : 1,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 4,
                }}
              >
                {uploading ? 'Загрузка...' : 'Добавить фото'}
                <input
                  ref={photoInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handlePhotoUpload}
                  style={{ display: 'none' }}
                />
              </label>
            )}
          </div>
          {photos.length > 0 ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', gap: 8 }}>
              {photos.map((photo, idx) => (
                <div key={photo.id} style={{ position: 'relative', aspectRatio: '1', borderRadius: 10, overflow: 'hidden' }}>
                  <img
                    src={photo.imageUrl}
                    alt=""
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                      cursor: 'pointer',
                      display: 'block',
                    }}
                    onClick={() => setLightboxIdx(idx)}
                  />
                  {isOwner && (
                    <button
                      type="button"
                      onClick={() => handleDeletePhoto(photo.id)}
                      style={{
                        position: 'absolute',
                        top: 4,
                        right: 4,
                        width: 22,
                        height: 22,
                        borderRadius: '50%',
                        background: 'rgba(0,0,0,0.6)',
                        color: '#fff',
                        border: 'none',
                        cursor: 'pointer',
                        fontSize: 12,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        lineHeight: 1,
                      }}
                    >
                      ✕
                    </button>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div style={{ fontSize: 13, color: '#ccc', textAlign: 'center', padding: '16px 0' }}>
              Нет фотографий
            </div>
          )}
        </div>

        {/* Lightbox */}
        {lightboxIdx !== null && photos[lightboxIdx] && (
          <div
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'rgba(0,0,0,0.85)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 10001,
              padding: 24,
            }}
            onClick={() => setLightboxIdx(null)}
          >
            <button
              type="button"
              onClick={() => setLightboxIdx(null)}
              style={{
                position: 'absolute',
                top: 20,
                right: 20,
                background: 'none',
                border: 'none',
                color: '#fff',
                fontSize: 28,
                cursor: 'pointer',
              }}
            >
              ✕
            </button>
            {lightboxIdx > 0 && (
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); setLightboxIdx((i) => (i ?? 1) - 1); }}
                style={{
                  position: 'absolute',
                  left: 20,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'rgba(255,255,255,0.2)',
                  border: 'none',
                  color: '#fff',
                  fontSize: 28,
                  cursor: 'pointer',
                  width: 44,
                  height: 44,
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                ‹
              </button>
            )}
            {lightboxIdx < photos.length - 1 && (
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); setLightboxIdx((i) => (i ?? 0) + 1); }}
                style={{
                  position: 'absolute',
                  right: 20,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'rgba(255,255,255,0.2)',
                  border: 'none',
                  color: '#fff',
                  fontSize: 28,
                  cursor: 'pointer',
                  width: 44,
                  height: 44,
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                ›
              </button>
            )}
            <img
              src={photos[lightboxIdx].imageUrl}
              alt=""
              onClick={(e) => e.stopPropagation()}
              style={{
                maxWidth: '90vw',
                maxHeight: '85vh',
                borderRadius: 8,
                objectFit: 'contain',
              }}
            />
          </div>
        )}

        {/* Скриншот / заглушка карты */}
        {activity.imageUrl ? (
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 13, color: '#999', marginBottom: 8 }}>Скриншот</div>
            <img
              src={activity.imageUrl}
              alt="Скриншот активности"
              style={{
                maxWidth: '100%',
                maxHeight: 480,
                borderRadius: 12,
                boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                objectFit: 'contain',
                display: 'block',
              }}
            />
          </div>
        ) : (
          <div style={{
            background: '#f5f5f5', borderRadius: 12, padding: 20,
            textAlign: 'center', marginBottom: 20, border: '1px dashed #e0e0e0',
          }}>
            <div style={{ fontSize: 24, marginBottom: 8 }}>🗺️</div>
            <div style={{ fontSize: 14, color: '#999' }}>Карта маршрута скоро будет доступна</div>
          </div>
        )}

        {/* Дополнительная информация */}
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', fontSize: 13, color: '#999' }}>
          {activity.elevGain != null && activity.elevGain > 0 && (
            <span>Набор высоты: {activity.elevGain} м</span>
          )}
          {activity.calories != null && activity.calories > 0 && (
            <span>Калории: {activity.calories} ккал</span>
          )}
          <span>{activity.isManual ? 'Ручной ввод' : 'GPS-трек'}</span>
        </div>

        {/* Кнопка закрыть */}
        <div style={{ marginTop: 20, textAlign: 'center' }}>
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: '10px 32px',
              borderRadius: 8,
              border: '1px solid #e0e0e0',
              background: '#fff',
              color: '#242424',
              fontSize: 14,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Закрыть
          </button>
        </div>
      </div>
    </div>
  );
}

// --- Activity Wizard ---

function ActivityWizard({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);

  // Step 1/2
  const [screenshotUrl, setScreenshotUrl] = useState<string | null>(null);
  const [ocrRunning, setOcrRunning] = useState(false);

  // Step 2
  const [sport, setSport] = useState<SportType>('RUNNING');
  const [distance, setDistance] = useState('');
  const [hours, setHours] = useState('');
  const [minutes, setMinutes] = useState('');
  const [seconds, setSeconds] = useState('');

  // Step 3
  const [title, setTitle] = useState('');
  const [desc, setDesc] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);

  // Step 4
  const [photoFiles, setPhotoFiles] = useState<File[]>([]);
  const [photoUrls, setPhotoUrls] = useState<string[]>([]);

  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [gpxLoading, setGpxLoading] = useState(false);

  const screenshotRef = useRef<HTMLInputElement>(null);
  const gpxRef = useRef<HTMLInputElement>(null);
  const photoRef = useRef<HTMLInputElement>(null);

  const handleScreenshotFile = async (file: File) => {
    setOcrRunning(true);
    setError('');
    try {
      const [ocrResult, uploadRes] = await Promise.allSettled([
        Tesseract.recognize(file, 'eng+rus'),
        api.activities.uploadScreenshot(file),
      ]);
      if (uploadRes.status === 'rejected') throw new Error('Ошибка загрузки скриншота');
      setScreenshotUrl((uploadRes as PromiseFulfilledResult<{ imageUrl: string; message: string }>).value.imageUrl);

      if (ocrResult.status === 'fulfilled') {
        const text = ocrResult.value.data.text;
        const dur = parseDurationFromText(text);
        if (dur.hours) setHours(dur.hours);
        if (dur.minutes) setMinutes(dur.minutes);
        if (dur.seconds) setSeconds(dur.seconds);

        const allText = text.replace(/\n/g, ' ');

        // Speed: handle uppercase Cyrillic (КМ/Ч, Км/ч etc.)
        const speedMatch = allText.match(/(\d{1,4}[.,]\d{1,3})\s*[кКkK][мМmM]\s*\/\s*[чЧhH]/i)
          || allText.match(/(\d{1,4})\s*[кКkK][мМmM]\s*\/\s*[чЧhH]/i)
          || allText.match(/(\d{1,4}[.,]\d{1,3})\s*(?:кмч|kmh)/i)
          || allText.match(/(\d{1,4})\s*(?:кмч|kmh)/i);
        const spd = speedMatch ? parseFloat(speedMatch[1].replace(',', '.')) : 0;

        if (spd > 0) {
          const h = parseInt(dur.hours || '0', 10);
          const m = parseInt(dur.minutes || '0', 10);
          const s = parseInt(dur.seconds || '0', 10);
          const totalHours = h + m / 60 + s / 3600;
          if (totalHours > 0) setDistance((spd * totalHours).toFixed(2));
        }

        // Fallback: parse distance directly from text (e.g. "25,06км")
        if (!spd) {
          const directDist = parseDistanceFromText(text);
          if (directDist) setDistance(directDist);
        }
      }
      setStep(2);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка');
    } finally {
      setOcrRunning(false);
      if (screenshotRef.current) screenshotRef.current.value = '';
    }
  };

  const handleGpxFile = async (file: File) => {
    setGpxLoading(true);
    setError('');
    try {
      await api.activities.uploadGpx(file);
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка загрузки GPX');
      setGpxLoading(false);
    }
  };

  const handlePhotoFiles = (files: FileList) => {
    const arr = Array.from(files).slice(0, 5);
    setPhotoFiles(arr);
    setPhotoUrls(arr.map(f => URL.createObjectURL(f)));
  };

  const removePhoto = (i: number) => {
    setPhotoFiles(f => f.filter((_, fi) => fi !== i));
    setPhotoUrls(u => u.filter((_, ui) => ui !== i));
  };

  const validateStep2 = () => {
    const d = parseFloat(distance);
    if (isNaN(d) || d <= 0) { setError('Укажите дистанцию'); return false; }
    const dur = parseInt(hours || '0') * 3600 + parseInt(minutes || '0') * 60 + parseInt(seconds || '0');
    if (dur <= 0) { setError('Укажите время'); return false; }
    return true;
  };

  const handleSave = async () => {
    setError('');
    if (!validateStep2()) return;
    const distKm = parseFloat(distance);
    const dur = parseInt(hours || '0') * 3600 + parseInt(minutes || '0') * 60 + parseInt(seconds || '0');
    setSaving(true);
    try {
      const activity = await api.activities.create({
        sport, distance: distKm, duration: dur,
        title: title || undefined, description: desc || undefined,
        startedAt: date ? new Date(date).toISOString() : new Date().toISOString(),
        isManual: true,
        ...(screenshotUrl ? { imageUrl: screenshotUrl } : {}),
      } as Parameters<typeof api.activities.create>[0]);
      if (photoFiles.length > 0 && (activity as { id?: string })?.id) {
        await api.photos.upload((activity as { id: string }).id, photoFiles).catch(() => {});
      }
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка сохранения');
      setSaving(false);
    }
  };

  const inputStyle = {
    padding: '8px 12px', borderRadius: 8, border: '1px solid #e0e0e0',
    fontSize: 14, outline: 'none', boxSizing: 'border-box' as const,
  };
  const primaryBtn = {
    padding: '10px 24px', borderRadius: 10, border: 'none',
    background: '#fc4c02', color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer',
  };
  const outlineBtn = {
    padding: '10px 20px', borderRadius: 10, border: '1px solid #e0e0e0',
    background: '#fff', color: '#666', fontSize: 14, cursor: 'pointer',
  };

  const stepLabels = ['Данные', 'Описание', 'Фото'];
  const displayStep = step - 1; // steps 2,3,4 → 1,2,3

  return (
    <div
      style={{
        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
        background: 'rgba(0,0,0,0.55)', display: 'flex',
        alignItems: 'center', justifyContent: 'center', zIndex: 9998, padding: 16,
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{
        background: '#fff', borderRadius: 20, padding: 28,
        maxWidth: 540, width: '100%', maxHeight: '90vh',
        overflowY: 'auto', boxShadow: '0 8px 40px rgba(0,0,0,0.2)', position: 'relative',
      }}>
        <button onClick={onClose} style={{
          position: 'absolute', top: 16, right: 16,
          background: 'none', border: 'none', color: '#999', cursor: 'pointer', fontSize: 22,
        }}>✕</button>

        <div style={{ fontSize: 20, fontWeight: 800, color: '#242424', marginBottom: 20 }}>
          Добавить активность
        </div>

        {/* Step indicator (steps 2-4) */}
        {step > 1 && (
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: 24 }}>
            {stepLabels.map((label, i) => {
              const s = i + 1;
              const isDone = s < displayStep;
              const isActive = s === displayStep;
              return (
                <div key={label} style={{ display: 'flex', alignItems: 'center', flex: i < 2 ? 1 : undefined }}>
                  <div style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
                  }}>
                    <div style={{
                      width: 28, height: 28, borderRadius: '50%',
                      background: isActive || isDone ? '#fc4c02' : '#f0f0f0',
                      color: isActive || isDone ? '#fff' : '#aaa',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 12, fontWeight: 700,
                    }}>
                      {isDone ? '✓' : s}
                    </div>
                    <span style={{ fontSize: 10, color: isActive ? '#fc4c02' : '#aaa', fontWeight: isActive ? 700 : 400 }}>
                      {label}
                    </span>
                  </div>
                  {i < 2 && (
                    <div style={{
                      flex: 1, height: 2, margin: '0 6px',
                      background: isDone ? '#fc4c02' : '#e0e0e0',
                      borderRadius: 2, marginBottom: 16,
                    }} />
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* STEP 1: Choose source */}
        {step === 1 && !ocrRunning && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <label style={{
              display: 'flex', alignItems: 'center', gap: 16,
              padding: '18px 20px', borderRadius: 14,
              border: '2px dashed #fc4c02', background: '#fff8f5', cursor: 'pointer',
            }}>
              <span style={{ fontSize: 32, flexShrink: 0 }}>📷</span>
              <div>
                <div style={{ fontSize: 15, fontWeight: 700, color: '#242424' }}>Загрузить скриншот</div>
                <div style={{ fontSize: 13, color: '#999', marginTop: 2 }}>Данные распознаются автоматически</div>
              </div>
              <input ref={screenshotRef} type="file" accept="image/*" style={{ display: 'none' }}
                onChange={(e) => { const f = e.target.files?.[0]; if (f) handleScreenshotFile(f); }} />
            </label>

            <label style={{
              display: 'flex', alignItems: 'center', gap: 16,
              padding: '18px 20px', borderRadius: 14,
              border: '1.5px solid #e0e0e0', background: '#fff',
              cursor: gpxLoading ? 'not-allowed' : 'pointer',
              opacity: gpxLoading ? 0.7 : 1,
            }}>
              <span style={{ fontSize: 32, flexShrink: 0 }}>📁</span>
              <div>
                <div style={{ fontSize: 15, fontWeight: 700, color: '#242424' }}>
                  {gpxLoading ? 'Загрузка...' : 'Загрузить GPX'}
                </div>
                <div style={{ fontSize: 13, color: '#999', marginTop: 2 }}>Импорт GPS-трека</div>
              </div>
              <input ref={gpxRef} type="file" accept=".gpx" style={{ display: 'none' }}
                onChange={(e) => { const f = e.target.files?.[0]; if (f) handleGpxFile(f); }} />
            </label>

            {error && <div style={{ color: '#d32f2f', fontSize: 13, marginTop: 4 }}>{error}</div>}
          </div>
        )}

        {/* OCR loading */}
        {step === 1 && ocrRunning && (
          <div style={{ textAlign: 'center', padding: '40px 0' }}>
            <div style={{ fontSize: 40, marginBottom: 16 }}>🔍</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: '#242424', marginBottom: 8 }}>Распознаём данные...</div>
            <div style={{ fontSize: 13, color: '#999' }}>Загружаем скриншот и извлекаем дистанцию и время</div>
          </div>
        )}

        {/* STEP 2: Stats */}
        {step === 2 && (
          <div>
            {screenshotUrl && (
              <div style={{ marginBottom: 16, textAlign: 'center' }}>
                <img src={screenshotUrl} alt="" style={{
                  maxWidth: '100%', maxHeight: 180, borderRadius: 12,
                  objectFit: 'contain', border: '1px solid #f0f0f0',
                }} />
              </div>
            )}

            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 13, color: '#666', marginBottom: 8 }}>Вид спорта</div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {ALL_SPORTS.map((s) => (
                  <button key={s} type="button" onClick={() => setSport(s)} style={{
                    padding: '8px 14px', borderRadius: 8,
                    border: sport === s ? `2px solid ${SPORT_COLORS[s]}` : '1px solid #e0e0e0',
                    background: sport === s ? '#fff' : '#f5f5f5',
                    cursor: 'pointer', fontSize: 14,
                    fontWeight: sport === s ? 600 : 400,
                    color: sport === s ? SPORT_COLORS[s] : '#666',
                  }}>
                    {SPORT_ICONS[s]} {SPORT_LABELS[s]}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 13, color: '#666', display: 'block', marginBottom: 6 }}>Дистанция (км)</label>
              <input type="number" step="0.01" min="0" value={distance}
                onChange={(e) => setDistance(e.target.value)}
                placeholder="5.0" style={{ ...inputStyle, width: 160 }} />
            </div>

            <div style={{ marginBottom: 20 }}>
              <label style={{ fontSize: 13, color: '#666', display: 'block', marginBottom: 6 }}>Время</label>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <input type="number" min="0" value={hours} onChange={(e) => setHours(e.target.value)}
                  placeholder="ч" style={{ ...inputStyle, width: 60, textAlign: 'center' }} />
                <span style={{ color: '#999' }}>:</span>
                <input type="number" min="0" max="59" value={minutes} onChange={(e) => setMinutes(e.target.value)}
                  placeholder="м" style={{ ...inputStyle, width: 60, textAlign: 'center' }} />
                <span style={{ color: '#999' }}>:</span>
                <input type="number" min="0" max="59" value={seconds} onChange={(e) => setSeconds(e.target.value)}
                  placeholder="с" style={{ ...inputStyle, width: 60, textAlign: 'center' }} />
              </div>
            </div>

            {error && <div style={{ color: '#d32f2f', fontSize: 13, marginBottom: 12 }}>{error}</div>}

            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => { setError(''); setStep(1); setScreenshotUrl(null); }} style={outlineBtn}>
                Назад
              </button>
              <button onClick={() => { setError(''); if (validateStep2()) setStep(3); }} style={primaryBtn}>
                Далее
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: Details */}
        {step === 3 && (
          <div>
            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 13, color: '#666', display: 'block', marginBottom: 6 }}>
                Название (необязательно)
              </label>
              <input value={title} onChange={(e) => setTitle(e.target.value)}
                placeholder={`${SPORT_AUTO_TITLES[sport]} ${distance} км`}
                style={{ ...inputStyle, width: '100%' }} />
            </div>
            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 13, color: '#666', display: 'block', marginBottom: 6 }}>
                Описание (необязательно)
              </label>
              <textarea value={desc} onChange={(e) => setDesc(e.target.value)}
                rows={3} style={{ ...inputStyle, width: '100%', resize: 'vertical', fontFamily: 'inherit' }} />
            </div>
            <div style={{ marginBottom: 24 }}>
              <label style={{ fontSize: 13, color: '#666', display: 'block', marginBottom: 6 }}>Дата</label>
              <input type="date" value={date} max={new Date().toISOString().split('T')[0]}
                onChange={(e) => setDate(e.target.value)} style={{ ...inputStyle, width: 180 }} />
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setStep(2)} style={outlineBtn}>Назад</button>
              <button onClick={() => setStep(4)} style={primaryBtn}>Далее</button>
            </div>
          </div>
        )}

        {/* STEP 4: Photos + Save */}
        {step === 4 && (
          <div>
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 14, color: '#666', marginBottom: 12 }}>
                Добавьте фотографии (необязательно, до 5 штук)
              </div>
              <label style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                gap: 8, padding: 16, borderRadius: 12,
                border: '2px dashed #e0e0e0', background: '#fafafa',
                cursor: 'pointer', fontSize: 14, color: '#666',
              }}>
                <span>🖼️</span> Выбрать фотографии
                <input ref={photoRef} type="file" accept="image/*" multiple style={{ display: 'none' }}
                  onChange={(e) => { if (e.target.files) handlePhotoFiles(e.target.files); }} />
              </label>
              {photoUrls.length > 0 && (
                <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
                  {photoUrls.map((url, i) => (
                    <div key={i} style={{ position: 'relative' }}>
                      <img src={url} alt="" style={{
                        width: 80, height: 80, objectFit: 'cover', borderRadius: 8, border: '1px solid #e0e0e0',
                      }} />
                      <button onClick={() => removePhoto(i)} style={{
                        position: 'absolute', top: -6, right: -6,
                        width: 20, height: 20, borderRadius: '50%',
                        background: '#fc4c02', color: '#fff', border: 'none',
                        cursor: 'pointer', fontSize: 11,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}>✕</button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {error && <div style={{ color: '#d32f2f', fontSize: 13, marginBottom: 12 }}>{error}</div>}

            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <button onClick={() => setStep(3)} style={outlineBtn}>Назад</button>
              <button onClick={handleSave} disabled={saving} style={{
                ...primaryBtn, opacity: saving ? 0.7 : 1, cursor: saving ? 'not-allowed' : 'pointer',
              }}>
                {saving ? 'Сохранение...' : 'Сохранить активность'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

const PAGE_SIZE = 10;

export default function ActivitiesPanel() {
  const { user } = useAuth();

  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  useEffect(() => {
    const h = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', h);
    return () => window.removeEventListener('resize', h);
  }, []);

  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const [filterSport, setFilterSport] = useState<SportType | null>(null);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const [weeklyDist, setWeeklyDist] = useState(0);
  const [monthlyDist, setMonthlyDist] = useState(0);

  const [wizardOpen, setWizardOpen] = useState(false);

  // Detail modal state
  const [detailActivity, setDetailActivity] = useState<Activity | null>(null);

  // Likes cache for activity cards
  const [likesMap, setLikesMap] = useState<Record<string, { liked: boolean; count: number }>>({});

  const loadActivities = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const params: Record<string, unknown> = { page, limit: PAGE_SIZE };
      if (filterSport) params.sport = filterSport;
      if (dateFrom) params.dateFrom = dateFrom;
      if (dateTo) params.dateTo = dateTo;
      const res = await api.activities.list(params as Parameters<typeof api.activities.list>[0]);
      setActivities(res?.items ?? []);
      setTotalPages(res?.pagination?.totalPages ?? 1);
    } catch {
      setActivities([]);
    } finally {
      setLoading(false);
    }
  }, [user, page, filterSport, dateFrom, dateTo]);

  const loadStats = useCallback(() => {
    if (!user) return;
    api.profile.statsSummary()
      .then((res) => {
        setWeeklyDist(res?.weeklyDistance ?? 0);
        setMonthlyDist(res?.monthlyDistance ?? 0);
      })
      .catch(() => {});
  }, [user]);

  useEffect(() => { loadStats(); }, [loadStats]);

  const refreshAll = useCallback(() => {
    loadActivities();
    loadStats();
  }, [loadActivities, loadStats]);

  useEffect(() => {
    loadActivities();
  }, [loadActivities]);

  useEffect(() => {
    const h = () => setWizardOpen(true);
    window.addEventListener('open-add-activity', h);
    return () => window.removeEventListener('open-add-activity', h);
  }, []);

  // Load likes for visible activities
  useEffect(() => {
    if (activities.length === 0) return;
    activities.forEach((act) => {
      if (!likesMap[act.id]) {
        api.photos.getLikes(act.id).then((r) => {
          setLikesMap((prev) => ({ ...prev, [act.id]: { liked: r?.liked ?? false, count: r?.count ?? 0 } }));
        }).catch(() => {});
      }
    });
  }, [activities]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleDelete = useCallback(
    async (id: string) => {
      if (!confirm('Удалить эту активность?')) return;
      try {
        await api.activities.delete(id);
        refreshAll();
      } catch {
        // ignore
      }
    },
    [loadActivities],
  );

  if (!user) {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '60vh',
          color: '#666',
          fontSize: 18,
        }}
      >
        Войдите чтобы увидеть активности
      </div>
    );
  }

  const inputStyle: React.CSSProperties = {
    padding: '8px 12px',
    borderRadius: 8,
    border: '1px solid #e0e0e0',
    fontSize: 14,
    outline: 'none',
    boxSizing: 'border-box',
  };

  return (
    <div style={{ maxWidth: 800, margin: '0 auto', padding: '24px 16px' }}>
      {/* Detail modal */}
      {detailActivity && (
        <ActivityDetailModal
          activity={detailActivity}
          onClose={() => setDetailActivity(null)}
          isOwner={true}
        />
      )}

      {/* Сводка */}
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 12, marginBottom: 20 }}>
        <div
          style={{
            background: '#fff',
            borderRadius: 16,
            padding: 16,
            boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
            border: '1px solid #e0e0e0',
            textAlign: 'center',
          }}
        >
          <div style={{ fontSize: 22, fontWeight: 700, color: '#fc4c02' }}>
            {formatDistance(weeklyDist)}
          </div>
          <div style={{ fontSize: 13, color: '#666', marginTop: 4 }}>За неделю</div>
        </div>
        <div
          style={{
            background: '#fff',
            borderRadius: 16,
            padding: 16,
            boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
            border: '1px solid #e0e0e0',
            textAlign: 'center',
          }}
        >
          <div style={{ fontSize: 22, fontWeight: 700, color: '#fc4c02' }}>
            {formatDistance(monthlyDist)}
          </div>
          <div style={{ fontSize: 13, color: '#666', marginTop: 4 }}>За месяц</div>
        </div>
      </div>

      {/* Wizard */}
      {wizardOpen && (
        <ActivityWizard
          onClose={() => setWizardOpen(false)}
          onSuccess={() => { setWizardOpen(false); setPage(1); refreshAll(); }}
        />
      )}

      {/* Кнопка добавления */}
      <div style={{ marginBottom: 16 }}>
        <button
          type="button"
          onClick={() => setWizardOpen(true)}
          style={{
            padding: '10px 24px', borderRadius: 10, border: 'none',
            background: 'linear-gradient(135deg, #fc4c02, #ff6b2b)',
            color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer',
            boxShadow: '0 2px 10px rgba(252,76,2,0.25)',
          }}
        >
          + Добавить активность
        </button>
      </div>

      {/* Фильтры */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 8,
          alignItems: 'center',
          marginBottom: 16,
        }}
      >
        <button
          type="button"
          onClick={() => { setFilterSport(null); setPage(1); }}
          style={{
            padding: '6px 14px',
            borderRadius: 20,
            border: filterSport === null ? '2px solid #fc4c02' : '1px solid #e0e0e0',
            background: filterSport === null ? '#fff' : '#eef0f4',
            color: filterSport === null ? '#fc4c02' : '#666',
            fontWeight: filterSport === null ? 600 : 400,
            fontSize: 13,
            cursor: 'pointer',
          }}
        >
          Все
        </button>
        {ALL_SPORTS.map((s) => (
          <button
            type="button"
            key={s}
            onClick={() => { setFilterSport(s); setPage(1); }}
            style={{
              padding: '6px 14px',
              borderRadius: 20,
              border: filterSport === s ? `2px solid ${SPORT_COLORS[s]}` : '1px solid #e0e0e0',
              background: filterSport === s ? '#fff' : '#eef0f4',
              color: filterSport === s ? SPORT_COLORS[s] : '#666',
              fontWeight: filterSport === s ? 600 : 400,
              fontSize: 13,
              cursor: 'pointer',
            }}
          >
            {SPORT_ICONS[s]} {SPORT_LABELS[s]}
          </button>
        ))}
        <input
          type="date"
          value={dateFrom}
          onChange={(e) => { setDateFrom(e.target.value); setPage(1); }}
          placeholder="С"
          style={{ ...inputStyle, fontSize: 13 }}
        />
        <input
          type="date"
          value={dateTo}
          onChange={(e) => { setDateTo(e.target.value); setPage(1); }}
          placeholder="По"
          style={{ ...inputStyle, fontSize: 13 }}
        />
      </div>

      {/* Список активностей */}
      {loading ? (
        <div style={{ textAlign: 'center', color: '#999', padding: 40, fontSize: 15 }}>
          Загрузка...
        </div>
      ) : activities.length === 0 ? (
        <div
          style={{
            textAlign: 'center',
            color: '#999',
            padding: 40,
            fontSize: 15,
            background: '#fff',
            borderRadius: 16,
            border: '1px solid #e0e0e0',
          }}
        >
          Нет активностей. Начните с первой тренировки!
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {activities.map((act) => {
            const distKm = act.distance ?? 0;
            const durationSec = act.duration ?? 0;
            const showPace = act.sport === 'RUNNING' || act.sport === 'WALKING';
            const title = act.title || autoTitle(act.sport, act.distance ?? 0);

            return (
              <div
                key={act.id}
                style={{
                  background: '#fff',
                  borderRadius: 16,
                  padding: 16,
                  boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
                  border: '1px solid #e0e0e0',
                  cursor: 'pointer',
                  transition: 'box-shadow 0.2s',
                }}
                onClick={() => setDetailActivity(act)}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLDivElement).style.boxShadow = '0 2px 12px rgba(0,0,0,0.12)';
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLDivElement).style.boxShadow = '0 1px 4px rgba(0,0,0,0.06)';
                }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                    <span style={{ fontSize: 28 }}>{SPORT_ICONS[act.sport]}</span>
                    <div style={{ minWidth: 0 }}>
                      <div
                        style={{
                          fontSize: 16,
                          fontWeight: 600,
                          color: '#242424',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {title}
                      </div>
                      <div style={{ fontSize: 12, color: '#999', marginTop: 2 }}>
                        {formatDate(act.startedAt ?? act.createdAt)}
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(act.id);
                    }}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#999',
                      cursor: 'pointer',
                      fontSize: 18,
                      padding: '4px 8px',
                      borderRadius: 6,
                      flexShrink: 0,
                    }}
                    title="Удалить"
                  >
                    ✕
                  </button>
                </div>
                <div style={{ display: 'flex', gap: 20, marginTop: 10, flexWrap: 'wrap', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontSize: 16, fontWeight: 700, color: SPORT_COLORS[act.sport] }}>
                      {formatDistance(act.distance ?? 0)}
                    </div>
                    <div style={{ fontSize: 11, color: '#999' }}>Дистанция</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 16, fontWeight: 700, color: '#242424' }}>
                      {formatDuration(durationSec)}
                    </div>
                    <div style={{ fontSize: 11, color: '#999' }}>Время</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 16, fontWeight: 700, color: '#242424' }}>
                      {showPace ? formatPace(durationSec, distKm) : formatSpeed(durationSec, distKm)}
                    </div>
                    <div style={{ fontSize: 11, color: '#999' }}>
                      {showPace ? 'Темп' : 'Скорость'}
                    </div>
                  </div>
                  {(likesMap[act.id]?.count ?? 0) > 0 && (
                    <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 4, color: '#fc4c02', fontSize: 14, fontWeight: 600 }}>
                      <span>{'❤️'}</span>
                      <span>{likesMap[act.id].count}</span>
                    </div>
                  )}
                </div>
                {/* Photo thumbnails */}
                {(act as any).photos?.length > 0 && (
                  <div style={{ display: 'flex', gap: 6, marginTop: 10 }}>
                    {((act as any).photos as { id: string; imageUrl: string }[]).slice(0, 4).map((photo, idx) => (
                      <div key={photo.id} style={{ position: 'relative', width: 60, height: 60, borderRadius: 8, overflow: 'hidden', flexShrink: 0 }}>
                        <img src={photo.imageUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        {idx === 3 && (act as any).photos.length > 4 && (
                          <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 13, fontWeight: 700 }}>
                            +{(act as any).photos.length - 4}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Пагинация */}
      {totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 20 }}>
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            style={{
              padding: '8px 16px',
              borderRadius: 8,
              border: '1px solid #e0e0e0',
              background: '#fff',
              cursor: page <= 1 ? 'not-allowed' : 'pointer',
              opacity: page <= 1 ? 0.5 : 1,
              fontSize: 14,
              color: '#242424',
            }}
          >
            Назад
          </button>
          <span
            style={{
              padding: '8px 12px',
              fontSize: 14,
              color: '#666',
              display: 'flex',
              alignItems: 'center',
            }}
          >
            {page} / {totalPages}
          </span>
          <button
            type="button"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            style={{
              padding: '8px 16px',
              borderRadius: 8,
              border: '1px solid #e0e0e0',
              background: '#fff',
              cursor: page >= totalPages ? 'not-allowed' : 'pointer',
              opacity: page >= totalPages ? 0.5 : 1,
              fontSize: 14,
              color: '#242424',
            }}
          >
            Вперёд
          </button>
        </div>
      )}
    </div>
  );
}
