import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Activity, SportType } from '@/types';
import { api } from '@/services/api';
import { useAuth } from '@/context/AuthContext';

const SPORT: Record<SportType, { icon: string; label: string; color: string; bg: string; gradient: string }> = {
  RUNNING: { icon: '🏃', label: 'Пробежка', color: '#fc4c02', bg: '#fff4ef', gradient: 'linear-gradient(135deg,#fc4c02,#ff8a50)' },
  CYCLING: { icon: '🚴', label: 'Велоспорт', color: '#0061ff', bg: '#eef4ff', gradient: 'linear-gradient(135deg,#0061ff,#4da3ff)' },
  SKIING:  { icon: '⛷️', label: 'Лыжи', color: '#0891b2', bg: '#edfbfe', gradient: 'linear-gradient(135deg,#0891b2,#22d3ee)' },
  WALKING: { icon: '🚶', label: 'Ходьба', color: '#7c3aed', bg: '#f5f0ff', gradient: 'linear-gradient(135deg,#7c3aed,#a78bfa)' },
};

interface FeedItem extends Activity {
  user: { id: string; username: string; avatarUrl?: string; level: number };
  photos: { id: string; imageUrl: string }[];
  _count: { likes: number };
  isLiked: boolean;
}

function formatTimeAgo(dateStr: string): string {
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (diff < 60) return `${diff} с`;
  const mins = Math.floor(diff / 60);
  if (mins < 60) return `${mins} мин`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} ч`;
  const days = Math.floor(hours / 24);
  if (days === 1) return 'вчера';
  if (days < 7) return `${days} дн`;
  return `${Math.floor(days / 7)} нед`;
}

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  return h > 0
    ? `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`
    : `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
}

function formatPace(avgPace?: number): string {
  if (!avgPace) return '--:--';
  const mins = Math.floor(avgPace);
  const secs = Math.round((avgPace - mins) * 60);
  return `${mins}:${String(secs).padStart(2,'0')}`;
}

function SkeletonCard() {
  return (
    <div style={{ background: '#fff', borderRadius: 20, border: '1px solid #eeeeee', overflow: 'hidden', boxShadow: '0 2px 16px rgba(0,0,0,0.05)' }}>
      <div style={{ height: 4, background: 'linear-gradient(90deg,#f0f0f0 30%,#e8e8e8 50%,#f0f0f0 70%)', backgroundSize: '200% 100%', animation: 'shimmer 1.4s infinite' }} />
      <div style={{ padding: '16px 20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
          <div style={{ width: 48, height: 48, borderRadius: '50%', background: '#f0f0f0' }} />
          <div style={{ flex: 1 }}>
            <div style={{ width: 110, height: 13, borderRadius: 6, background: '#f0f0f0', marginBottom: 7 }} />
            <div style={{ width: 70, height: 10, borderRadius: 6, background: '#f5f5f5' }} />
          </div>
          <div style={{ width: 60, height: 24, borderRadius: 20, background: '#f0f0f0' }} />
        </div>
        <div style={{ width: '65%', height: 16, borderRadius: 6, background: '#f0f0f0', marginBottom: 16 }} />
        <div style={{ display: 'flex', gap: 12 }}>
          {[1,2,3].map(j => (
            <div key={j} style={{ flex: 1, background: '#f9f9f9', borderRadius: 12, padding: '10px 8px' }}>
              <div style={{ width: '70%', height: 18, borderRadius: 5, background: '#eeeeee', margin: '0 auto 5px' }} />
              <div style={{ width: '50%', height: 10, borderRadius: 5, background: '#f3f3f3', margin: '0 auto' }} />
            </div>
          ))}
        </div>
      </div>
      <style>{`@keyframes shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}`}</style>
    </div>
  );
}

export default function FeedPanel() {
  const { isAuthenticated } = useAuth();
  const [items, setItems] = useState<FeedItem[]>([]);
  const [trending, setTrending] = useState<FeedItem[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [enlargedPhoto, setEnlargedPhoto] = useState<string | null>(null);
  const [selectedTrending, setSelectedTrending] = useState<FeedItem | null>(null);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  useEffect(() => {
    const h = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', h);
    return () => window.removeEventListener('resize', h);
  }, []);

  useEffect(() => {
    api.social.trendingActivities()
      .then(data => setTrending(data as FeedItem[]))
      .catch(() => {});
  }, []);

  const loadFeed = useCallback(async (p: number, append: boolean) => {
    try {
      if (append) setLoadingMore(true); else setLoading(true);
      const data = await api.social.publicFeed({ page: p, limit: 20 });
      setItems(prev => append ? [...prev, ...(data.items as FeedItem[])] : (data.items as FeedItem[]));
      setTotalPages(data.pagination.totalPages);
      setPage(p);
    } catch (err) {
      console.error('Feed load error:', err);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, []);

  useEffect(() => { loadFeed(1, false); }, [loadFeed]);

  const handleLike = useCallback(async (activityId: string) => {
    if (!isAuthenticated) return;
    try {
      const res = await api.photos.like(activityId);
      setItems(prev => prev.map(item =>
        item.id === activityId
          ? { ...item, isLiked: res.liked, _count: { ...item._count, likes: res.count } }
          : item
      ));
    } catch {}
  }, [isAuthenticated]);

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {trending.length > 0 && <div style={{ height: 120, background: '#fff', borderRadius: 20, border: '1px solid #eee' }} />}
        {[1,2,3].map(i => <SkeletonCard key={i} />)}
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '80px 24px' }}>
        <div style={{ fontSize: 64, marginBottom: 16 }}>🏃</div>
        <h3 style={{ fontSize: 20, fontWeight: 700, color: '#242424', margin: '0 0 8px' }}>Нет активностей</h3>
        <p style={{ fontSize: 14, color: '#999', margin: 0 }}>Пока никто не добавил активность. Будьте первым!</p>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: isMobile ? 14 : 18 }}>

      {/* ── Trending ───────────────────────────────── */}
      {trending.length > 0 && (
        <div style={{
          background: '#fff',
          border: '1px solid #eeeeee',
          borderRadius: 20,
          padding: isMobile ? '14px 14px 10px' : '16px 20px 14px',
          boxShadow: '0 2px 16px rgba(0,0,0,0.05)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
            <span style={{ fontSize: 18 }}>🔥</span>
            <span style={{ fontSize: 15, fontWeight: 800, color: '#1a1a1a', letterSpacing: -0.3 }}>Тренды недели</span>
            <span style={{
              marginLeft: 4, fontSize: 11, fontWeight: 600,
              background: '#fff4ef', color: '#fc4c02',
              padding: '2px 8px', borderRadius: 10,
            }}>топ по лайкам</span>
          </div>
          <div style={{ display: 'flex', gap: 10, overflowX: 'auto', paddingBottom: 4, scrollbarWidth: 'none' }}>
            {trending.map((t, idx) => {
              const sp = SPORT[t.sport] ?? SPORT.RUNNING;
              return (
                <div
                  key={t.id}
                  onClick={() => setSelectedTrending(t)}
                  style={{
                    minWidth: isMobile ? 148 : 165,
                    borderRadius: 14,
                    overflow: 'hidden',
                    cursor: 'pointer',
                    flexShrink: 0,
                    background: sp.gradient,
                    position: 'relative',
                    transition: 'transform 0.15s, box-shadow 0.15s',
                  }}
                  onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-2px)'; (e.currentTarget as HTMLDivElement).style.boxShadow = `0 8px 24px ${sp.color}44`; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.transform = ''; (e.currentTarget as HTMLDivElement).style.boxShadow = ''; }}
                >
                  {/* Rank badge */}
                  <div style={{
                    position: 'absolute', top: 8, left: 8,
                    width: 24, height: 24, borderRadius: '50%',
                    background: 'rgba(0,0,0,0.25)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 11, fontWeight: 800, color: '#fff',
                  }}>
                    {idx + 1}
                  </div>

                  <div style={{ padding: '30px 12px 10px' }}>
                    {/* Sport icon */}
                    <div style={{ fontSize: 28, marginBottom: 6, lineHeight: 1 }}>{sp.icon}</div>
                    <div style={{ fontSize: 12, fontWeight: 800, color: '#fff', marginBottom: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {(t.distance ?? 0).toFixed(1)} км
                    </div>
                    <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.75)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {t.title ?? sp.label}
                    </div>
                  </div>

                  {/* Footer: avatar + likes */}
                  <div style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '6px 10px 10px', gap: 6,
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                      <div style={{
                        width: 18, height: 18, borderRadius: '50%', overflow: 'hidden',
                        background: 'rgba(255,255,255,0.3)', flexShrink: 0,
                        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, color: '#fff', fontWeight: 700,
                      }}>
                        {t.user.avatarUrl
                          ? <img src={t.user.avatarUrl} alt="" style={{ width: 18, height: 18, objectFit: 'cover' }} />
                          : t.user.username[0].toUpperCase()}
                      </div>
                      <span
                        style={{ fontSize: 11, color: 'rgba(255,255,255,0.85)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 60 }}
                        onClick={e => { e.stopPropagation(); window.dispatchEvent(new CustomEvent('open-profile', { detail: { userId: t.user.id } })); }}
                      >
                        {t.user.username}
                      </span>
                    </div>
                    <span style={{ fontSize: 11, color: '#fff', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 3, flexShrink: 0 }}>
                      ❤️ {t._count.likes}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Feed cards ─────────────────────────────── */}
      {items.map((item, index) => {
        const sport = SPORT[item.sport] ?? SPORT.RUNNING;
        const distKm = item.distance ?? 0;
        const speedKmH = item.avgSpeed ?? (item.duration > 0 ? (distKm / (item.duration / 3600)) : 0);
        const photos = item.photos ?? [];
        const likeCount = item._count?.likes ?? 0;

        const stats = [
          { value: distKm.toFixed(1), unit: 'км', label: 'Дистанция' },
          { value: formatDuration(item.duration ?? 0), unit: '', label: 'Время' },
          (item.sport === 'RUNNING' || item.sport === 'WALKING')
            ? { value: formatPace(item.avgPace), unit: 'мин/км', label: 'Темп' }
            : { value: speedKmH.toFixed(1), unit: 'км/ч', label: 'Скорость' },
        ];

        return (
          <motion.div
            key={item.id}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25, delay: Math.min(index * 0.04, 0.3) }}
            style={{
              background: '#fff',
              borderRadius: 20,
              border: '1px solid #eeeeee',
              boxShadow: '0 2px 16px rgba(0,0,0,0.05)',
              overflow: 'hidden',
            }}
          >
            {/* Colored sport top-stripe */}
            <div style={{ height: 4, background: sport.gradient }} />

            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: isMobile ? '14px 14px 10px' : '16px 20px 12px' }}>
              {/* Avatar */}
              <div
                onClick={() => window.dispatchEvent(new CustomEvent('open-profile', { detail: { userId: item.user.id } }))}
                style={{
                  position: 'relative', flexShrink: 0, cursor: 'pointer',
                }}
              >
                <div style={{
                  width: 46, height: 46, borderRadius: '50%',
                  background: item.user.avatarUrl ? 'none' : sport.gradient,
                  color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 18, fontWeight: 700, overflow: 'hidden',
                  boxShadow: `0 0 0 2px #fff, 0 0 0 3px ${sport.color}33`,
                }}>
                  {item.user.avatarUrl
                    ? <img src={item.user.avatarUrl} alt="" style={{ width: 46, height: 46, borderRadius: '50%', objectFit: 'cover' }} />
                    : (item.user.username ?? '?')[0].toUpperCase()}
                </div>
                {/* Level badge */}
                <div style={{
                  position: 'absolute', bottom: -2, right: -4,
                  background: sport.gradient, color: '#fff',
                  fontSize: 9, fontWeight: 800, padding: '1px 5px',
                  borderRadius: 8, border: '1.5px solid #fff',
                  lineHeight: 1.4, whiteSpace: 'nowrap',
                }}>
                  {item.user.level}
                </div>
              </div>

              {/* Username & time */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <span
                  onClick={() => window.dispatchEvent(new CustomEvent('open-profile', { detail: { userId: item.user.id } }))}
                  style={{ fontSize: 14, fontWeight: 700, color: '#1a1a1a', cursor: 'pointer', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                  onMouseEnter={e => { (e.target as HTMLElement).style.color = sport.color; }}
                  onMouseLeave={e => { (e.target as HTMLElement).style.color = '#1a1a1a'; }}
                >
                  {item.user.username ?? 'Пользователь'}
                </span>
                <div style={{ fontSize: 12, color: '#bbb', marginTop: 2 }}>
                  {formatTimeAgo(item.startedAt ?? item.createdAt)} назад
                </div>
              </div>

              {/* Sport pill */}
              <div style={{
                display: 'flex', alignItems: 'center', gap: 5,
                background: sport.bg, borderRadius: 20,
                padding: '5px 10px 5px 8px',
                border: `1px solid ${sport.color}22`,
              }}>
                <span style={{ fontSize: 14 }}>{sport.icon}</span>
                <span style={{ fontSize: 11, fontWeight: 700, color: sport.color }}>{sport.label}</span>
              </div>
            </div>

            {/* Activity title */}
            {(item.title || distKm > 0) && (
              <div style={{ padding: isMobile ? '0 14px 12px' : '0 20px 14px' }}>
                <span style={{ fontSize: isMobile ? 16 : 17, fontWeight: 800, color: '#1a1a1a', letterSpacing: -0.3 }}>
                  {item.title || `${sport.label} ${distKm.toFixed(1)} км`}
                </span>
                {item.description && (
                  <div style={{ fontSize: 13, color: '#888', marginTop: 4, lineHeight: 1.4 }}>{item.description}</div>
                )}
              </div>
            )}

            {/* Stats */}
            <div style={{
              display: 'flex', gap: isMobile ? 8 : 10,
              padding: isMobile ? '12px 14px' : '12px 20px',
              borderTop: '1px solid #f5f5f5',
              borderBottom: photos.length > 0 ? '1px solid #f5f5f5' : 'none',
            }}>
              {stats.map((s, i) => (
                <div
                  key={i}
                  style={{
                    flex: 1, textAlign: 'center',
                    background: '#f9f9f9', borderRadius: 14,
                    padding: isMobile ? '8px 4px' : '10px 8px',
                  }}
                >
                  <div style={{ fontSize: isMobile ? 14 : 17, fontWeight: 800, color: '#1a1a1a', lineHeight: 1.1 }}>
                    {s.value}
                    {s.unit && <span style={{ fontSize: isMobile ? 9 : 11, fontWeight: 600, color: '#bbb', marginLeft: 2 }}>{s.unit}</span>}
                  </div>
                  <div style={{ fontSize: isMobile ? 9 : 10, color: '#bbb', marginTop: 3, letterSpacing: 0.2 }}>
                    {s.label}
                  </div>
                </div>
              ))}
            </div>

            {/* Photos grid */}
            {photos.length > 0 && (
              <div style={{ padding: isMobile ? '10px 14px' : '12px 20px' }}>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: photos.length === 1 ? '1fr' : photos.length === 2 ? '1fr 1fr' : 'repeat(3, 1fr)',
                  gap: 6,
                  borderRadius: 14, overflow: 'hidden',
                }}>
                  {photos.slice(0, 3).map((photo, idx) => (
                    <div
                      key={photo.id}
                      onClick={() => setEnlargedPhoto(photo.imageUrl)}
                      style={{
                        aspectRatio: photos.length === 1 ? '16/7' : '1/1',
                        borderRadius: idx === 0 && photos.length > 1 ? 0 : 0,
                        overflow: 'hidden', cursor: 'pointer', position: 'relative',
                      }}
                    >
                      <img src={photo.imageUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                      {idx === 2 && photos.length > 3 && (
                        <div style={{
                          position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: 20, fontWeight: 800, color: '#fff',
                        }}>
                          +{photos.length - 3}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Actions row */}
            <div style={{
              display: 'flex', alignItems: 'center',
              padding: isMobile ? '8px 14px 14px' : '10px 20px 16px',
              gap: 4,
            }}>
              <motion.button
                whileTap={{ scale: 0.8 }}
                onClick={() => handleLike(item.id)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  background: item.isLiked ? `${sport.color}12` : 'transparent',
                  border: `1px solid ${item.isLiked ? sport.color + '40' : '#eee'}`,
                  borderRadius: 20, cursor: isAuthenticated ? 'pointer' : 'default',
                  padding: '6px 14px',
                  color: item.isLiked ? sport.color : '#bbb',
                  fontSize: 13, fontWeight: 700,
                  transition: 'all 0.2s',
                }}
              >
                <motion.span
                  key={item.isLiked ? 'liked' : 'not'}
                  animate={{ scale: item.isLiked ? [1, 1.4, 1] : 1 }}
                  transition={{ duration: 0.25 }}
                  style={{ fontSize: 16, lineHeight: 1 }}
                >
                  {item.isLiked ? '❤️' : '🤍'}
                </motion.span>
                <span>{likeCount > 0 ? likeCount : ''}</span>
              </motion.button>
            </div>
          </motion.div>
        );
      })}

      {/* Load more */}
      {page < totalPages && (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '4px 0 8px' }}>
          <button
            onClick={() => loadFeed(page + 1, true)}
            disabled={loadingMore}
            style={{
              padding: '12px 36px', fontSize: 14, fontWeight: 700,
              color: loadingMore ? '#aaa' : '#fff',
              background: loadingMore ? '#f0f0f0' : 'linear-gradient(135deg,#fc4c02,#ff6b2b)',
              border: 'none', borderRadius: 14,
              cursor: loadingMore ? 'not-allowed' : 'pointer',
              boxShadow: loadingMore ? 'none' : '0 4px 16px rgba(252,76,2,0.25)',
              transition: 'all 0.2s',
            }}
          >
            {loadingMore ? 'Загрузка...' : 'Загрузить ещё'}
          </button>
        </div>
      )}

      {/* ── Enlarged photo overlay ── */}
      <AnimatePresence>
        {enlargedPhoto && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setEnlargedPhoto(null)}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.9)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, cursor: 'pointer', padding: 24 }}
          >
            <motion.img
              initial={{ scale: 0.85, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.85, opacity: 0 }}
              src={enlargedPhoto} alt=""
              style={{ maxWidth: '90vw', maxHeight: '90vh', borderRadius: 16, objectFit: 'contain', boxShadow: '0 8px 40px rgba(0,0,0,0.4)' }}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Trending detail modal ── */}
      <AnimatePresence>
        {selectedTrending && (() => {
          const t = selectedTrending;
          const sp = SPORT[t.sport] ?? SPORT.RUNNING;
          const distKm = t.distance ?? 0;
          const speedKmH = t.avgSpeed ?? (t.duration > 0 ? distKm / (t.duration / 3600) : 0);
          return (
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setSelectedTrending(null)}
              style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 9998, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
                onClick={e => e.stopPropagation()}
                style={{ background: '#fff', borderRadius: 24, width: '100%', maxWidth: 440, overflow: 'hidden', boxShadow: '0 24px 80px rgba(0,0,0,0.3)' }}
              >
                {/* Gradient header */}
                <div style={{ background: sp.gradient, padding: '20px 20px 28px', position: 'relative' }}>
                  <button onClick={() => setSelectedTrending(null)} style={{ position: 'absolute', top: 14, right: 14, background: 'rgba(0,0,0,0.2)', border: 'none', borderRadius: '50%', width: 28, height: 28, cursor: 'pointer', color: '#fff', fontSize: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1 }}>×</button>
                  <div style={{ fontSize: 36, marginBottom: 8 }}>{sp.icon}</div>
                  <div style={{ fontSize: 22, fontWeight: 800, color: '#fff', letterSpacing: -0.5 }}>
                    {t.title ?? sp.label}
                  </div>
                  <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.8)', marginTop: 2 }}>
                    {distKm.toFixed(1)} км · {formatTimeAgo(t.startedAt ?? t.createdAt)} назад
                  </div>
                </div>

                <div style={{ padding: '16px 20px 20px', marginTop: -12, background: '#fff', borderRadius: '12px 12px 0 0', position: 'relative' }}>
                  {/* User row */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                    <div
                      onClick={() => { setSelectedTrending(null); window.dispatchEvent(new CustomEvent('open-profile', { detail: { userId: t.user.id } })); }}
                      style={{ width: 36, height: 36, borderRadius: '50%', overflow: 'hidden', flexShrink: 0, cursor: 'pointer', background: t.user.avatarUrl ? 'none' : sp.gradient, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, color: '#fff', fontWeight: 700 }}
                    >
                      {t.user.avatarUrl ? <img src={t.user.avatarUrl} alt="" style={{ width: 36, height: 36, objectFit: 'cover' }} /> : t.user.username[0].toUpperCase()}
                    </div>
                    <div style={{ flex: 1 }}>
                      <span
                        onClick={() => { setSelectedTrending(null); window.dispatchEvent(new CustomEvent('open-profile', { detail: { userId: t.user.id } })); }}
                        style={{ fontSize: 14, fontWeight: 700, color: '#1a1a1a', cursor: 'pointer' }}
                      >
                        {t.user.username}
                      </span>
                      <div style={{ fontSize: 12, color: '#bbb', marginTop: 1 }}>Ур. {t.user.level}</div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 13, fontWeight: 700, color: '#fc4c02', background: '#fff4ef', padding: '4px 10px', borderRadius: 16 }}>
                      ❤️ {t._count.likes}
                    </div>
                  </div>

                  {/* Stats */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: t.photos?.length ? 16 : 0 }}>
                    {[
                      { label: 'Дистанция', value: `${distKm.toFixed(1)}`, unit: 'км' },
                      { label: 'Время', value: formatDuration(t.duration ?? 0), unit: '' },
                      (t.sport === 'RUNNING' || t.sport === 'WALKING')
                        ? { label: 'Темп', value: formatPace(t.avgPace), unit: 'мин/км' }
                        : { label: 'Скорость', value: speedKmH.toFixed(1), unit: 'км/ч' },
                    ].map(s => (
                      <div key={s.label} style={{ background: '#f7f7f7', borderRadius: 14, padding: '12px 8px', textAlign: 'center' }}>
                        <div style={{ fontSize: 17, fontWeight: 800, color: '#1a1a1a' }}>{s.value}</div>
                        {s.unit && <div style={{ fontSize: 10, color: sp.color, fontWeight: 700, marginTop: 1 }}>{s.unit}</div>}
                        <div style={{ fontSize: 10, color: '#bbb', marginTop: 2 }}>{s.label}</div>
                      </div>
                    ))}
                  </div>

                  {/* Photos */}
                  {t.photos?.length > 0 && (
                    <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4 }}>
                      {t.photos.map(p => (
                        <div key={p.id} onClick={() => setEnlargedPhoto(p.imageUrl)} style={{ width: 80, height: 80, minWidth: 80, borderRadius: 10, overflow: 'hidden', cursor: 'pointer', flexShrink: 0 }}>
                          <img src={p.imageUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </motion.div>
            </motion.div>
          );
        })()}
      </AnimatePresence>
    </div>
  );
}
