import { useCallback, useEffect, useRef, useState } from 'react';

export type TrackerState = 'idle' | 'tracking' | 'paused' | 'finished';

export interface TrackPoint {
  lat: number;
  lng: number;
  alt: number | null;
  timestamp: number;
  speed: number | null;
}

export interface TrackerStats {
  distance: number;
  duration: number;
  currentSpeed: number;
  avgSpeed: number;
  currentPace: string;
  avgPace: string;
  elevGain: number;
  calories: number;
}

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) ** 2;
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

  // All mutable state in refs to avoid stale closures
  const watchIdRef = useRef<number | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pointsRef = useRef<TrackPoint[]>([]);
  const startTimeRef = useRef<number>(0);
  const pausedDurationRef = useRef<number>(0);
  const pauseStartRef = useRef<number>(0);
  const stateRef = useRef<TrackerState>('idle');
  const elevGainRef = useRef<number>(0);
  const lastAltRef = useRef<number | null>(null);
  const lastGoodPointRef = useRef<TrackPoint | null>(null);

  const getActiveSecs = useCallback((): number => {
    const now = Date.now();
    if (stateRef.current === 'tracking') {
      return (now - startTimeRef.current - pausedDurationRef.current) / 1000;
    }
    // paused or finished
    return (pauseStartRef.current - startTimeRef.current - pausedDurationRef.current) / 1000;
  }, []);

  const computeStats = useCallback((pts: TrackPoint[], secs: number): TrackerStats => {
    if (pts.length === 0) return EMPTY_STATS;

    let dist = 0;
    for (let i = 1; i < pts.length; i++) {
      const d = haversineKm(pts[i-1].lat, pts[i-1].lng, pts[i].lat, pts[i].lng);
      // Skip impossible jumps (>500m in <5s = likely GPS glitch)
      const dt = (pts[i].timestamp - pts[i-1].timestamp) / 1000;
      if (d < 0.5 || dt > 5) dist += d;
    }

    // Current speed from last 5 seconds of points
    const now = Date.now();
    const recent = pts.filter(p => now - p.timestamp < 6000);
    let currentSpeed = 0;
    if (recent.length >= 2) {
      const d = haversineKm(recent[0].lat, recent[0].lng, recent[recent.length-1].lat, recent[recent.length-1].lng);
      const t = (recent[recent.length-1].timestamp - recent[0].timestamp) / 3600000;
      currentSpeed = t > 0 ? Math.min(d / t, 60) : 0; // cap at 60 km/h
    } else if (pts.length > 0 && pts[pts.length-1].speed != null) {
      currentSpeed = Math.min((pts[pts.length-1].speed ?? 0) * 3.6, 60);
    }

    const avgSpeed = secs > 10 ? dist / (secs / 3600) : 0;

    return {
      distance: dist,
      duration: Math.max(0, secs),
      currentSpeed,
      avgSpeed,
      currentPace: formatPace(currentSpeed),
      avgPace: formatPace(avgSpeed),
      elevGain: Math.round(elevGainRef.current),
      calories: Math.round(dist * 65),
    };
  }, []);

  const refreshStats = useCallback(() => {
    const s = computeStats(pointsRef.current, getActiveSecs());
    setStats(s);
  }, [computeStats, getActiveSecs]);

  // GPS position handler — uses only refs, no stale closure issues
  const handlePosition = useCallback((pos: GeolocationPosition) => {
    const { latitude: lat, longitude: lng, altitude: alt, speed, accuracy: acc } = pos.coords;

    setAccuracy(acc);
    setError(null);

    // Accept any fix for first point, then filter bad accuracy
    const isFirst = pointsRef.current.length === 0;
    if (!isFirst && acc > 100) return; // skip very inaccurate fixes after we have a track

    // Skip points too close to previous (GPS jitter)
    const last = lastGoodPointRef.current;
    if (last && !isFirst) {
      const dist = haversineKm(last.lat, last.lng, lat, lng);
      const dt = (Date.now() - last.timestamp) / 1000;
      // skip if moved < 2m and < 3 seconds (noise)
      if (dist < 0.002 && dt < 3) return;
    }

    // Elevation gain
    if (alt != null && lastAltRef.current != null) {
      const gain = alt - lastAltRef.current;
      if (gain > 1) elevGainRef.current += gain;
    }
    if (alt != null) lastAltRef.current = alt;

    const point: TrackPoint = { lat, lng, alt, timestamp: Date.now(), speed };
    lastGoodPointRef.current = point;
    pointsRef.current = [...pointsRef.current, point];
    setPoints(p => [...p, point]);
    setStats(computeStats(pointsRef.current, getActiveSecs()));
  }, [computeStats, getActiveSecs]);

  const handleError = useCallback((err: GeolocationPositionError) => {
    const msgs: Record<number, string> = {
      1: 'Нет доступа к геолокации. Разрешите в настройках браузера.',
      2: 'Не удаётся определить местоположение. Выйдите на улицу.',
      3: 'GPS не отвечает. Проверьте настройки.',
    };
    setError(msgs[err.code] ?? `Ошибка GPS (${err.code})`);
  }, []);

  const startWatch = useCallback(() => {
    if (!navigator.geolocation) {
      setError('Геолокация не поддерживается этим браузером');
      return false;
    }
    // Check HTTPS (geolocation requires secure context)
    if (location.protocol !== 'https:' && location.hostname !== 'localhost') {
      setError('Для GPS требуется HTTPS. Используйте https://');
      return false;
    }
    watchIdRef.current = navigator.geolocation.watchPosition(
      handlePosition,
      handleError,
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 2000 },
    );
    return true;
  }, [handlePosition, handleError]);

  const start = useCallback(() => {
    pointsRef.current = [];
    elevGainRef.current = 0;
    lastAltRef.current = null;
    lastGoodPointRef.current = null;
    pausedDurationRef.current = 0;
    startTimeRef.current = Date.now();
    stateRef.current = 'tracking';

    setPoints([]);
    setStats(EMPTY_STATS);
    setError(null);
    setState('tracking');

    if (!startWatch()) {
      stateRef.current = 'idle';
      setState('idle');
      return;
    }

    timerRef.current = setInterval(refreshStats, 1000);
  }, [startWatch, refreshStats]);

  const pause = useCallback(() => {
    pauseStartRef.current = Date.now();
    stateRef.current = 'paused';
    setState('paused');
    if (watchIdRef.current != null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    refreshStats();
  }, [refreshStats]);

  const resume = useCallback(() => {
    pausedDurationRef.current += Date.now() - pauseStartRef.current;
    stateRef.current = 'tracking';
    setState('tracking');
    startWatch();
    timerRef.current = setInterval(refreshStats, 1000);
  }, [startWatch, refreshStats]);

  const stop = useCallback((): { points: TrackPoint[]; stats: TrackerStats } => {
    pauseStartRef.current = Date.now();
    stateRef.current = 'finished';
    if (watchIdRef.current != null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    setState('finished');
    const finalStats = computeStats(pointsRef.current, getActiveSecs());
    setStats(finalStats);
    return { points: pointsRef.current, stats: finalStats };
  }, [computeStats, getActiveSecs]);

  const reset = useCallback(() => {
    stateRef.current = 'idle';
    setState('idle');
    setPoints([]);
    setStats(EMPTY_STATS);
    setError(null);
    setAccuracy(null);
    pointsRef.current = [];
    elevGainRef.current = 0;
    lastGoodPointRef.current = null;
  }, []);

  useEffect(() => () => {
    if (watchIdRef.current != null) navigator.geolocation.clearWatch(watchIdRef.current);
    if (timerRef.current) clearInterval(timerRef.current);
  }, []);

  return { state, points, stats, error, accuracy, start, pause, resume, stop, reset };
}
