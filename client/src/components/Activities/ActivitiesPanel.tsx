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
    .replace(/\d{1,4}[.,]?\d{0,3}\s*(?:км\s*\/\s*ч|km\s*\/\s*h|кмч|mph)/gi, '')
    .replace(/\d{1,4}[.,]?\d{0,3}\s*(?:мин\s*\/\s*км|min\s*\/\s*km)/gi, '')
    .replace(/\d{1,5}\s*(?:ккал|kcal|cal)/gi, '')
    .replace(/\d{5,}/g, ''); // remove phone numbers and other long digit sequences

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

  // Step 4: Find numbers with decimals first (15.65, 30.37 — these are usually distance)
  // Then fall back to largest integer
  const decimalNums = [...noSpeed.matchAll(/(\d{1,4}[.,]\d{1,3})/g)]
    .map(m => ({ raw: m[1], val: parseFloat(m[1].replace(',', '.')) }))
    .filter(c => c.val >= 1 && c.val <= 500);
  if (decimalNums.length > 0) {
    // Prefer the largest decimal number (distance is usually the biggest)
    decimalNums.sort((a, b) => b.val - a.val);
    return decimalNums[0].raw.replace(',', '.');
  }

  // Step 5: No decimals found — try integers near "км" context
  const intNums = [...noSpeed.matchAll(/\b(\d{1,4})\b/g)]
    .map(m => ({ raw: m[1], val: parseInt(m[1], 10) }))
    .filter(c => c.val >= 1 && c.val <= 500);
  if (intNums.length > 0) {
    intNums.sort((a, b) => b.val - a.val);
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

        {/* Скриншот */}
        {activity.imageUrl && (
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 13, color: '#999', marginBottom: 8 }}>Скриншот</div>
            <img
              src={activity.imageUrl}
              alt="Скриншот активности"
              style={{
                maxWidth: '100%',
                maxHeight: 400,
                borderRadius: 12,
                boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                objectFit: 'contain',
                display: 'block',
              }}
            />
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

        {/* Карта (заглушка) */}
        <div
          style={{
            background: '#f5f5f5',
            borderRadius: 12,
            padding: 20,
            textAlign: 'center',
            marginBottom: 20,
            border: '1px dashed #e0e0e0',
          }}
        >
          <div style={{ fontSize: 24, marginBottom: 8 }}>🗺️</div>
          <div style={{ fontSize: 14, color: '#999' }}>
            Карта маршрута скоро будет доступна
          </div>
        </div>

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

  const [showForm, setShowForm] = useState(false);
  const [formSport, setFormSport] = useState<SportType>('RUNNING');
  const [formDistance, setFormDistance] = useState('');
  const [formHours, setFormHours] = useState('');
  const [formMinutes, setFormMinutes] = useState('');
  const [formSeconds, setFormSeconds] = useState('');
  const [formTitle, setFormTitle] = useState('');
  const [formDate, setFormDate] = useState(new Date().toISOString().split('T')[0]);
  const [formDesc, setFormDesc] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [gpxUploading, setGpxUploading] = useState(false);

  // Screenshot upload state
  const [screenshotUploading, setScreenshotUploading] = useState(false);
  const [screenshotPreviewUrl, setScreenshotPreviewUrl] = useState<string | null>(null);
  const [scrSport, setScrSport] = useState<SportType>('RUNNING');
  const [scrDistance, setScrDistance] = useState('');
  const [scrHours, setScrHours] = useState('');
  const [scrMinutes, setScrMinutes] = useState('');
  const [scrSeconds, setScrSeconds] = useState('');
  const [scrTitle, setScrTitle] = useState('');
  const [scrDate, setScrDate] = useState('');
  const [scrSubmitting, setScrSubmitting] = useState(false);
  const [scrError, setScrError] = useState('');
  const [scrSuccess, setScrSuccess] = useState('');

  // OCR state
  const [ocrRunning, setOcrRunning] = useState(false);
  const [ocrRawText, setOcrRawText] = useState('');
  const [ocrTextExpanded, setOcrTextExpanded] = useState(false);

  // Detail modal state
  const [detailActivity, setDetailActivity] = useState<Activity | null>(null);

  // Likes cache for activity cards
  const [likesMap, setLikesMap] = useState<Record<string, { liked: boolean; count: number }>>({});

  const gpxInputRef = useRef<HTMLInputElement>(null);
  const screenshotInputRef = useRef<HTMLInputElement>(null);

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

  const handleSubmit = useCallback(
    async (e: FormEvent) => {
      e.preventDefault();
      if (!user) return;
      setSubmitting(true);
      setFormError('');
      try {
        const distKm = parseFloat(formDistance);
        if (isNaN(distKm) || distKm <= 0) {
          setFormError('Укажите дистанцию');
          setSubmitting(false);
          return;
        }
        const h = parseInt(formHours || '0', 10);
        const m = parseInt(formMinutes || '0', 10);
        const s = parseInt(formSeconds || '0', 10);
        const duration = h * 3600 + m * 60 + s;
        if (duration <= 0) {
          setFormError('Укажите время');
          setSubmitting(false);
          return;
        }
        await api.activities.create({
          sport: formSport,
          distance: distKm,
          duration,
          title: formTitle || undefined,
          description: formDesc || undefined,
          startedAt: formDate ? new Date(formDate).toISOString() : new Date().toISOString(),
          isManual: true,
        });
        setFormDistance('');
        setFormHours('');
        setFormMinutes('');
        setFormSeconds('');
        setFormTitle('');
        setFormDate('');
        setFormDesc('');
        setShowForm(false);
        setPage(1);
        refreshAll();
      } catch (err: unknown) {
        setFormError(err instanceof Error ? err.message : 'Ошибка при создании активности');
      } finally {
        setSubmitting(false);
      }
    },
    [user, formSport, formDistance, formHours, formMinutes, formSeconds, formTitle, formDate, formDesc, loadActivities],
  );

  const handleGpxUpload = useCallback(
    async (e: ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      setGpxUploading(true);
      setFormError('');
      try {
        await api.activities.uploadGpx(file);
        setPage(1);
        refreshAll();
      } catch (err: unknown) {
        setFormError(err instanceof Error ? err.message : 'Ошибка загрузки GPX');
      } finally {
        setGpxUploading(false);
        if (gpxInputRef.current) gpxInputRef.current.value = '';
      }
    },
    [loadActivities],
  );

  const handleScreenshotUpload = useCallback(
    async (e: ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      setScreenshotUploading(true);
      setOcrRunning(true);
      setScrError('');
      setScrSuccess('');
      setOcrRawText('');
      setOcrTextExpanded(false);
      try {
        // Run OCR and upload simultaneously
        const [ocrResult, uploadRes] = await Promise.allSettled([
          Tesseract.recognize(file, 'eng+rus'),
          api.activities.uploadScreenshot(file),
        ]);

        // Handle upload result
        if (uploadRes.status === 'fulfilled') {
          setScreenshotPreviewUrl(uploadRes.value.imageUrl);
        } else {
          throw uploadRes.reason instanceof Error
            ? uploadRes.reason
            : new Error('Ошибка загрузки скриншота');
        }

        // Handle OCR result - graceful degradation
        if (ocrResult.status === 'fulfilled') {
          const text = ocrResult.value.data.text;
          setOcrRawText(text);

          // 1. Parse duration (HH:MM:SS) — works well
          const parsedDuration = parseDurationFromText(text);
          if (parsedDuration.hours) setScrHours(parsedDuration.hours);
          if (parsedDuration.minutes) setScrMinutes(parsedDuration.minutes);
          if (parsedDuration.seconds) setScrSeconds(parsedDuration.seconds);

          // 2. Parse speed (км/ч) — works well
          // Parse speed: supports "16.4км/ч", "16,4 км/ч", "16.4 km/h", also multiline
          const allText = text.replace(/\n/g, ' ');
          const speedMatch = allText.match(/(\d{1,4}[.,]\d{1,3})\s*(?:км\s*\/\s*ч|km\s*\/\s*h|кмч)/i)
            || allText.match(/(\d{1,4})\s*(?:км\s*\/\s*ч|km\s*\/\s*h|кмч)/i);
          const speedKmh = speedMatch ? parseFloat(speedMatch[1].replace(',', '.')) : 0;

          // 3. ALWAYS calculate distance = speed × time (OCR distance is unreliable)
          if (speedKmh > 0) {
            const h = parseInt(parsedDuration.hours || '0', 10);
            const m = parseInt(parsedDuration.minutes || '0', 10);
            const s = parseInt(parsedDuration.seconds || '0', 10);
            const totalHours = h + m / 60 + s / 3600;
            if (totalHours > 0) {
              const calcDist = (speedKmh * totalHours).toFixed(2);
              setScrDistance(calcDist);
            }
          }

          // 4. If no speed but have pace (мин/км), calculate duration from pace
          if (!speedKmh) {
            const pace = parsePaceFromText(text);
            if (pace) {
              // Can't calculate distance without speed or distance input
              // Leave distance empty for user
            }
          }
        }
        // If OCR fails, fields stay empty - user fills manually

        setScrDate(new Date().toISOString().slice(0, 10));
      } catch (err: unknown) {
        setScrError(err instanceof Error ? err.message : 'Ошибка загрузки скриншота');
      } finally {
        setScreenshotUploading(false);
        setOcrRunning(false);
        if (screenshotInputRef.current) screenshotInputRef.current.value = '';
      }
    },
    [],
  );

  const handleScreenshotConfirm = useCallback(
    async (e: FormEvent) => {
      e.preventDefault();
      if (!user) return;
      setScrSubmitting(true);
      setScrError('');
      setScrSuccess('');
      try {
        const distKm = parseFloat(scrDistance);
        if (isNaN(distKm) || distKm <= 0) {
          setScrError('Укажите дистанцию');
          setScrSubmitting(false);
          return;
        }
        const h = parseInt(scrHours || '0', 10);
        const m = parseInt(scrMinutes || '0', 10);
        const s = parseInt(scrSeconds || '0', 10);
        const duration = h * 3600 + m * 60 + s;
        if (duration <= 0) {
          setScrError('Укажите время');
          setScrSubmitting(false);
          return;
        }
        await api.activities.create({
          sport: scrSport,
          distance: distKm,
          duration,
          title: scrTitle || undefined,
          startedAt: scrDate ? new Date(scrDate).toISOString() : new Date().toISOString(),
          isManual: true,
        });
        setScrSuccess('Активность успешно сохранена!');
        setScrDistance('');
        setScrHours('');
        setScrMinutes('');
        setScrSeconds('');
        setScrTitle('');
        setScrDate('');
        setScreenshotPreviewUrl(null);
        setOcrRawText('');
        setOcrTextExpanded(false);
        setPage(1);
        refreshAll();
      } catch (err: unknown) {
        setScrError(err instanceof Error ? err.message : 'Ошибка при создании активности');
      } finally {
        setScrSubmitting(false);
      }
    },
    [user, scrSport, scrDistance, scrHours, scrMinutes, scrSeconds, scrTitle, scrDate, loadActivities],
  );

  const handleCancelScreenshot = useCallback(() => {
    setScreenshotPreviewUrl(null);
    setScrDistance('');
    setScrHours('');
    setScrMinutes('');
    setScrSeconds('');
    setScrTitle('');
    setScrDate('');
    setScrError('');
    setScrSuccess('');
    setOcrRawText('');
    setOcrTextExpanded(false);
  }, []);

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

      {/* Кнопки действий */}
      <div style={{ marginBottom: 16, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        <button
          type="button"
          onClick={() => setShowForm((v) => !v)}
          style={{
            padding: '10px 20px',
            borderRadius: 8,
            border: 'none',
            background: '#fc4c02',
            color: '#fff',
            fontSize: 14,
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          {showForm ? 'Отмена' : 'Добавить активность'}
        </button>
        <label
          style={{
            padding: '10px 20px',
            borderRadius: 8,
            border: '1px solid #e0e0e0',
            background: '#fff',
            color: '#242424',
            fontSize: 14,
            fontWeight: 600,
            cursor: gpxUploading ? 'not-allowed' : 'pointer',
            opacity: gpxUploading ? 0.7 : 1,
            display: 'inline-flex',
            alignItems: 'center',
          }}
        >
          {gpxUploading ? 'Загрузка...' : 'Загрузить GPX'}
          <input
            ref={gpxInputRef}
            type="file"
            accept=".gpx"
            onChange={handleGpxUpload}
            style={{ display: 'none' }}
          />
        </label>
        <label
          style={{
            padding: '10px 20px',
            borderRadius: 8,
            border: '1px solid #e0e0e0',
            background: '#fff',
            color: '#242424',
            fontSize: 14,
            fontWeight: 600,
            cursor: screenshotUploading ? 'not-allowed' : 'pointer',
            opacity: screenshotUploading ? 0.7 : 1,
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
          }}
        >
          {screenshotUploading ? 'Загрузка...' : '📷 Загрузить скриншот результата'}
          <input
            ref={screenshotInputRef}
            type="file"
            accept="image/*"
            onChange={handleScreenshotUpload}
            style={{ display: 'none' }}
          />
        </label>
      </div>

      {/* OCR loading indicator */}
      {(screenshotUploading || ocrRunning) && !screenshotPreviewUrl && (
        <div
          style={{
            background: '#fff',
            borderRadius: 16,
            padding: 24,
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
            border: '1px solid #e0e0e0',
            marginBottom: 20,
            textAlign: 'center',
          }}
        >
          <div style={{ fontSize: 28, marginBottom: 12 }}>🔍</div>
          <div style={{ fontSize: 15, fontWeight: 600, color: '#242424', marginBottom: 6 }}>
            Распознаём данные...
          </div>
          <div style={{ fontSize: 13, color: '#999' }}>
            Загружаем скриншот и извлекаем дистанцию и время
          </div>
        </div>
      )}

      {/* Скриншот превью и форма */}
      {screenshotPreviewUrl && (
        <div
          style={{
            background: '#fff',
            borderRadius: 16,
            padding: 20,
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
            border: '1px solid #e0e0e0',
            marginBottom: 20,
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <div style={{ fontSize: 16, fontWeight: 700, color: '#242424' }}>
              📷 Скриншот загружен! Проверьте данные
            </div>
            <button
              type="button"
              onClick={handleCancelScreenshot}
              style={{
                background: 'none',
                border: 'none',
                color: '#999',
                cursor: 'pointer',
                fontSize: 18,
                padding: '4px 8px',
              }}
            >
              ✕
            </button>
          </div>

          <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', flexDirection: isMobile ? 'column' : 'row' }}>
            {/* Превью изображения */}
            <div style={{ flexShrink: 0, width: isMobile ? '100%' : undefined }}>
              <img
                src={screenshotPreviewUrl}
                alt="Скриншот результата"
                style={{
                  maxWidth: isMobile ? '100%' : 300,
                  maxHeight: 400,
                  borderRadius: 12,
                  boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
                  objectFit: 'contain',
                  display: 'block',
                }}
              />
              <div style={{ fontSize: 12, color: '#999', marginTop: 8, textAlign: 'center' }}>
                Проверьте результат
              </div>
            </div>

            {/* Форма ввода данных */}
            <form onSubmit={handleScreenshotConfirm} style={{ flex: 1, minWidth: 240 }}>
              {/* Вид спорта */}
              <div style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 13, color: '#666', marginBottom: 6 }}>Вид спорта</div>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {ALL_SPORTS.map((s) => (
                    <button
                      type="button"
                      key={s}
                      onClick={() => setScrSport(s)}
                      style={{
                        padding: '6px 12px',
                        borderRadius: 8,
                        border: scrSport === s ? `2px solid ${SPORT_COLORS[s]}` : '1px solid #e0e0e0',
                        background: scrSport === s ? '#fff' : '#eef0f4',
                        cursor: 'pointer',
                        fontSize: 13,
                        fontWeight: scrSport === s ? 600 : 400,
                        color: scrSport === s ? SPORT_COLORS[s] : '#666',
                      }}
                    >
                      {SPORT_ICONS[s]} {SPORT_LABELS[s]}
                    </button>
                  ))}
                </div>
              </div>

              {/* Дистанция */}
              <div style={{ marginBottom: 12 }}>
                <label style={{ fontSize: 13, color: '#666', display: 'block', marginBottom: 4 }}>
                  Дистанция (км)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={scrDistance}
                  onChange={(e) => setScrDistance(e.target.value)}
                  placeholder="5.0"
                  style={{ ...inputStyle, width: 160 }}
                />
              </div>

              {/* Длительность */}
              <div style={{ marginBottom: 12 }}>
                <label style={{ fontSize: 13, color: '#666', display: 'block', marginBottom: 4 }}>
                  Длительность
                </label>
                <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                  <input
                    type="number"
                    min="0"
                    value={scrHours}
                    onChange={(e) => setScrHours(e.target.value)}
                    placeholder="ч"
                    style={{ ...inputStyle, width: 56, textAlign: 'center' }}
                  />
                  <span style={{ color: '#999' }}>:</span>
                  <input
                    type="number"
                    min="0"
                    max="59"
                    value={scrMinutes}
                    onChange={(e) => setScrMinutes(e.target.value)}
                    placeholder="м"
                    style={{ ...inputStyle, width: 56, textAlign: 'center' }}
                  />
                  <span style={{ color: '#999' }}>:</span>
                  <input
                    type="number"
                    min="0"
                    max="59"
                    value={scrSeconds}
                    onChange={(e) => setScrSeconds(e.target.value)}
                    placeholder="с"
                    style={{ ...inputStyle, width: 56, textAlign: 'center' }}
                  />
                </div>
              </div>

              {/* Название */}
              <div style={{ marginBottom: 12 }}>
                <label style={{ fontSize: 13, color: '#666', display: 'block', marginBottom: 4 }}>
                  Название (необязательно)
                </label>
                <input
                  value={scrTitle}
                  onChange={(e) => setScrTitle(e.target.value)}
                  placeholder="Утренняя пробежка"
                  style={{ ...inputStyle, width: '100%' }}
                />
              </div>

              {/* Дата */}
              <div style={{ marginBottom: 14 }}>
                <label style={{ fontSize: 13, color: '#666', display: 'block', marginBottom: 4 }}>
                  Дата
                </label>
                <input
                  type="date"
                  value={scrDate}
                  onChange={(e) => setScrDate(e.target.value)}
                  style={{ ...inputStyle, width: 180 }}
                />
              </div>

              {/* Распознанный текст (collapsible) */}
              {ocrRawText && (
                <div style={{ marginBottom: 14 }}>
                  <button
                    type="button"
                    onClick={() => setOcrTextExpanded((v) => !v)}
                    style={{
                      background: 'none',
                      border: 'none',
                      padding: 0,
                      cursor: 'pointer',
                      fontSize: 13,
                      color: '#666',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4,
                    }}
                  >
                    <span style={{
                      display: 'inline-block',
                      transform: ocrTextExpanded ? 'rotate(90deg)' : 'rotate(0deg)',
                      transition: 'transform 0.2s',
                      fontSize: 10,
                    }}>
                      ▶
                    </span>
                    Распознанный текст
                  </button>
                  {ocrTextExpanded && (
                    <div
                      style={{
                        marginTop: 8,
                        padding: 10,
                        background: '#f5f5f5',
                        borderRadius: 8,
                        fontSize: 12,
                        color: '#666',
                        fontFamily: 'monospace',
                        whiteSpace: 'pre-wrap',
                        wordBreak: 'break-word',
                        maxHeight: 200,
                        overflowY: 'auto',
                        border: '1px solid #e0e0e0',
                      }}
                    >
                      {ocrRawText}
                    </div>
                  )}
                </div>
              )}

              {scrError && (
                <div style={{ color: '#d32f2f', fontSize: 13, marginBottom: 10 }}>{scrError}</div>
              )}

              {scrSuccess && (
                <div style={{ color: '#1a7f37', fontSize: 13, marginBottom: 10, fontWeight: 600 }}>{scrSuccess}</div>
              )}

              <div style={{ display: 'flex', gap: 10 }}>
                <button
                  type="submit"
                  disabled={scrSubmitting}
                  style={{
                    padding: '10px 24px',
                    borderRadius: 8,
                    border: 'none',
                    background: '#fc4c02',
                    color: '#fff',
                    fontSize: 14,
                    fontWeight: 600,
                    cursor: scrSubmitting ? 'not-allowed' : 'pointer',
                    opacity: scrSubmitting ? 0.7 : 1,
                  }}
                >
                  {scrSubmitting ? 'Сохранение...' : 'Подтвердить и сохранить'}
                </button>
                <button
                  type="button"
                  onClick={handleCancelScreenshot}
                  style={{
                    padding: '10px 20px',
                    borderRadius: 8,
                    border: '1px solid #e0e0e0',
                    background: '#fff',
                    color: '#666',
                    fontSize: 14,
                    cursor: 'pointer',
                  }}
                >
                  Отмена
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Форма добавления */}
      {showForm && (
        <div
          style={{
            background: '#fff',
            borderRadius: 16,
            padding: 20,
            boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
            border: '1px solid #e0e0e0',
            marginBottom: 20,
          }}
        >
          <form onSubmit={handleSubmit}>
            {/* Вид спорта */}
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 13, color: '#666', marginBottom: 6 }}>Вид спорта</div>
              <div style={{ display: 'flex', gap: 8 }}>
                {ALL_SPORTS.map((s) => (
                  <button
                    type="button"
                    key={s}
                    onClick={() => setFormSport(s)}
                    style={{
                      padding: '8px 14px',
                      borderRadius: 8,
                      border: formSport === s ? `2px solid ${SPORT_COLORS[s]}` : '1px solid #e0e0e0',
                      background: formSport === s ? '#fff' : '#eef0f4',
                      cursor: 'pointer',
                      fontSize: 14,
                      fontWeight: formSport === s ? 600 : 400,
                      color: formSport === s ? SPORT_COLORS[s] : '#666',
                    }}
                  >
                    {SPORT_ICONS[s]} {SPORT_LABELS[s]}
                  </button>
                ))}
              </div>
            </div>

            {/* Дистанция */}
            <div style={{ marginBottom: 12 }}>
              <label style={{ fontSize: 13, color: '#666', display: 'block', marginBottom: 4 }}>
                Дистанция (км)
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={formDistance}
                onChange={(e) => setFormDistance(e.target.value)}
                placeholder="5.0"
                style={{ ...inputStyle, width: isMobile ? '100%' : 160 }}
              />
            </div>

            {/* Длительность */}
            <div style={{ marginBottom: 12 }}>
              <label style={{ fontSize: 13, color: '#666', display: 'block', marginBottom: 4 }}>
                Длительность
              </label>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <input
                  type="number"
                  min="0"
                  value={formHours}
                  onChange={(e) => setFormHours(e.target.value)}
                  placeholder="ч"
                  style={{ ...inputStyle, width: isMobile ? '100%' : 60, textAlign: 'center' }}
                />
                <span style={{ color: '#999' }}>:</span>
                <input
                  type="number"
                  min="0"
                  max="59"
                  value={formMinutes}
                  onChange={(e) => setFormMinutes(e.target.value)}
                  placeholder="м"
                  style={{ ...inputStyle, width: isMobile ? '100%' : 60, textAlign: 'center' }}
                />
                <span style={{ color: '#999' }}>:</span>
                <input
                  type="number"
                  min="0"
                  max="59"
                  value={formSeconds}
                  onChange={(e) => setFormSeconds(e.target.value)}
                  placeholder="с"
                  style={{ ...inputStyle, width: isMobile ? '100%' : 60, textAlign: 'center' }}
                />
              </div>
            </div>

            {/* Название */}
            <div style={{ marginBottom: 12 }}>
              <label style={{ fontSize: 13, color: '#666', display: 'block', marginBottom: 4 }}>
                Название (необязательно)
              </label>
              <input
                value={formTitle}
                onChange={(e) => setFormTitle(e.target.value)}
                placeholder="Утренняя пробежка"
                style={{ ...inputStyle, width: '100%' }}
              />
            </div>

            {/* Дата */}
            <div style={{ marginBottom: 12 }}>
              <label style={{ fontSize: 13, color: '#666', display: 'block', marginBottom: 4 }}>
                Дата
              </label>
              <input
                type="date"
                value={formDate}
                max={new Date().toISOString().split('T')[0]}
                onChange={(e) => setFormDate(e.target.value)}
                style={{ ...inputStyle, width: 180 }}
              />
            </div>

            {/* Описание */}
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 13, color: '#666', display: 'block', marginBottom: 4 }}>
                Описание (необязательно)
              </label>
              <textarea
                value={formDesc}
                onChange={(e) => setFormDesc(e.target.value)}
                rows={2}
                style={{ ...inputStyle, width: '100%', resize: 'vertical', fontFamily: 'inherit' }}
              />
            </div>

            {formError && (
              <div style={{ color: '#d32f2f', fontSize: 13, marginBottom: 10 }}>{formError}</div>
            )}

            <button
              type="submit"
              disabled={submitting}
              style={{
                padding: '10px 24px',
                borderRadius: 8,
                border: 'none',
                background: '#fc4c02',
                color: '#fff',
                fontSize: 14,
                fontWeight: 600,
                cursor: submitting ? 'not-allowed' : 'pointer',
                opacity: submitting ? 0.7 : 1,
              }}
            >
              {submitting ? 'Сохранение...' : 'Сохранить активность'}
            </button>
          </form>
        </div>
      )}

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
