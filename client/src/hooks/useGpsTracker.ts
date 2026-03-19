import { useCallback, useEffect, useRef, useState } from 'react';

export type TrackerState = 'idle' | 'tracking' | 'paused' | 'finished';

export interface TrackPoint {
  lat: number;
  lng: number;
  alt: number | null;
  timestamp: number;
  speed: number | null; // m/s from device
}

export interface TrackerStats {
  distance: number;       // km
  duration: number;       // seconds (active, not paused)
  currentSpeed: number;   // km/h
  avgSpeed: number;       // km/h
  currentPace: string;    // "mm:ss" per km
  avgPace: string;        // "mm:ss" per km
  elevGain: number;       // metres
  calories: number;       // kcal estimate
}

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function formatPace(kmPerHour: number): string {
  if (kmPerHour < 0.5) return '--:--';
  const secPerKm = 3600 / kmPerHour;
  const m = Math.floor(secPerKm / 60);
  const s = Math.floor(secPerKm % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

const EMPTY_STATS: TrackerStats = {
  distance: 0, duration: 0,
  currentSpeed: 0, avgSpeed: 0,
  currentPace: '--:--', avgPace: '--:--',
  elevGain: 0, calories: 0,
};

export function useGpsTracker() {
  const [state, setState] = useState<TrackerState>('idle');
  const [points, setPoints] = useState<TrackPoint[]>([]);
  const [stats, setStats] = useState<TrackerStats>(EMPTY_STATS);
  const [error, setError] = useState<string | null>(null);
  const [accuracy, setAccuracy] = useState<number | null>(null);

  const watchIdRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(0);
  const pausedDurationRef = useRef<number>(0);
  const pauseStartRef = useRef<number>(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pointsRef = useRef<TrackPoint[]>([]);
  const lastAltRef = useRef<number | null>(null);
  const elevGainRef = useRef<number>(0);

  const computeStats = useCallback((pts: TrackPoint[], activeSecs: number) => {
    if (pts.length < 2) return EMPTY_STATS;

    let dist = 0;
    for (let i = 1; i < pts.length; i++) {
      dist += haversineKm(pts[i-1].lat, pts[i-1].lng, pts[i].lat, pts[i].lng);
    }

    // Current speed from last few points (last 5s)
    const now = Date.now();
    const recent = pts.filter(p => now - p.timestamp < 5000);
    let currentSpeed = 0;
    if (recent.length >= 2) {
      const d = haversineKm(recent[0].lat, recent[0].lng, recent[recent.length-1].lat, recent[recent.length-1].lng);
      const t = (recent[recent.length-1].timestamp - recent[0].timestamp) / 3600000;
      currentSpeed = t > 0 ? d / t : 0;
    } else if (pts[pts.length-1].speed != null) {
      currentSpeed = (pts[pts.length-1].speed ?? 0) * 3.6; // m/s → km/h
    }

    const avgSpeed = activeSecs > 0 ? dist / (activeSecs / 3600) : 0;
    const calories = Math.round(dist * 65); // ~65 kcal/km average estimate

    return {
      distance: dist,
      duration: activeSecs,
      currentSpeed,
      avgSpeed,
      currentPace: formatPace(currentSpeed),
      avgPace: formatPace(avgSpeed),
      elevGain: elevGainRef.current,
      calories,
    };
  }, []);

  const getActiveDuration = useCallback((): number => {
    if (state === 'tracking') {
      return (Date.now() - startTimeRef.current - pausedDurationRef.current) / 1000;
    }
    return (pauseStartRef.current - startTimeRef.current - pausedDurationRef.current) / 1000;
  }, [state]);

  const onPosition = useCallback((pos: GeolocationPosition) => {
    const { latitude: lat, longitude: lng, altitude: alt, speed, accuracy: acc } = pos.coords;

    setAccuracy(acc);
    setError(null);

    // Ignore wild inaccurate fixes
    if (acc > 50) return;

    const point: TrackPoint = { lat, lng, alt, timestamp: Date.now(), speed };

    // Elevation gain
    if (alt != null && lastAltRef.current != null) {
      const gain = alt - lastAltRef.current;
      if (gain > 0.5) elevGainRef.current += gain;
    }
    if (alt != null) lastAltRef.current = alt;

    pointsRef.current = [...pointsRef.current, point];
    setPoints(prev => [...prev, point]);
    setStats(computeStats(pointsRef.current, getActiveDuration()));
  }, [computeStats, getActiveDuration]);

  const onError = useCallback((err: GeolocationPositionError) => {
    const msg: Record<number, string> = {
      1: 'Нет разрешения на геолокацию. Разрешите доступ в настройках браузера.',
      2: 'Не удаётся получить координаты. Проверьте GPS.',
      3: 'Тайм-аут геолокации.',
    };
    setError(msg[err.code] ?? 'Ошибка геолокации');
  }, []);

  const start = useCallback(() => {
    if (!navigator.geolocation) {
      setError('Геолокация не поддерживается браузером');
      return;
    }
    pointsRef.current = [];
    elevGainRef.current = 0;
    lastAltRef.current = null;
    pausedDurationRef.current = 0;
    startTimeRef.current = Date.now();

    setPoints([]);
    setStats(EMPTY_STATS);
    setError(null);
    setState('tracking');

    watchIdRef.current = navigator.geolocation.watchPosition(onPosition, onError, {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 1000,
    });

    timerRef.current = setInterval(() => {
      setStats(computeStats(pointsRef.current, getActiveDuration()));
    }, 1000);
  }, [onPosition, onError, computeStats, getActiveDuration]);

  const pause = useCallback(() => {
    pauseStartRef.current = Date.now();
    setState('paused');
    if (watchIdRef.current != null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    if (timerRef.current) clearInterval(timerRef.current);
  }, []);

  const resume = useCallback(() => {
    pausedDurationRef.current += Date.now() - pauseStartRef.current;
    setState('tracking');

    watchIdRef.current = navigator.geolocation.watchPosition(onPosition, onError, {
      enableHighAccuracy: true, timeout: 10000, maximumAge: 1000,
    });
    timerRef.current = setInterval(() => {
      setStats(computeStats(pointsRef.current, getActiveDuration()));
    }, 1000);
  }, [onPosition, onError, computeStats, getActiveDuration]);

  const stop = useCallback((): { points: TrackPoint[]; stats: TrackerStats } => {
    if (watchIdRef.current != null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    if (timerRef.current) clearInterval(timerRef.current);
    setState('finished');

    const finalStats = computeStats(pointsRef.current, getActiveDuration());
    setStats(finalStats);
    return { points: pointsRef.current, stats: finalStats };
  }, [computeStats, getActiveDuration]);

  const reset = useCallback(() => {
    setState('idle');
    setPoints([]);
    setStats(EMPTY_STATS);
    setError(null);
    setAccuracy(null);
    pointsRef.current = [];
    elevGainRef.current = 0;
  }, []);

  useEffect(() => {
    return () => {
      if (watchIdRef.current != null) navigator.geolocation.clearWatch(watchIdRef.current);
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  return { state, points, stats, error, accuracy, start, pause, resume, stop, reset };
}
