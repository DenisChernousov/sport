import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Activity, SportType } from '@/types';
import { api } from '@/services/api';
import { useAuth } from '@/context/AuthContext';

const SPORT: Record<SportType, { icon: string; label: string; color: string; bg: string }> = {
  RUNNING: { icon: '🏃', label: 'Пробежка', color: '#fc4c02', bg: '#fff4ef' },
  CYCLING: { icon: '🚴', label: 'Вело', color: '#0061ff', bg: '#eef4ff' },
  SKIING:  { icon: '⛷️', label: 'Лыжи', color: '#0891b2', bg: '#edfbfe' },
  WALKING: { icon: '🚶', label: 'Ходьба', color: '#7c3aed', bg: '#f5f0ff' },
};

interface FeedItem extends Activity {
  user: { id: string; username: string; avatarUrl?: string; level: number };
  photos: { id: string; imageUrl: string }[];
  _count: { likes: number };
  isLiked: boolean;
}

function formatTimeAgo(dateStr: string): string {
  const now = Date.now();
  const date = new Date(dateStr).getTime();
  const diff = Math.floor((now - date) / 1000);

  if (diff < 60) return `${diff} сек. назад`;
  const mins = Math.floor(diff / 60);
  if (mins < 60) return `${mins} мин. назад`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} ч. назад`;
  const days = Math.floor(hours / 24);
  if (days === 1) return 'вчера';
  if (days < 7) return `${days} дн. назад`;
  const weeks = Math.floor(days / 7);
  if (weeks < 4) return `${weeks} нед. назад`;
  const months = Math.floor(days / 30);
  return `${months} мес. назад`;
}

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  return h > 0
    ? `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
    : `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function formatPace(avgPace?: number): string {
  if (!avgPace) return '--:--';
  const mins = Math.floor(avgPace);
  const secs = Math.round((avgPace - mins) * 60);
  return `${mins}:${String(secs).padStart(2, '0')}`;
}

export default function FeedPanel() {
  const { isAuthenticated } = useAuth();
  const [items, setItems] = useState<FeedItem[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [enlargedPhoto, setEnlargedPhoto] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  useEffect(() => {
    const h = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', h);
    return () => window.removeEventListener('resize', h);
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
    } catch (err) {
      console.error('Like error:', err);
    }
  }, [isAuthenticated]);

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        <h2 style={{ fontSize: 24, fontWeight: 800, color: '#242424', margin: 0 }}>
          {'📰'} Лента активностей
        </h2>
        {[1, 2, 3].map(i => (
          <div key={i} style={{
            background: '#fff', borderRadius: 16, border: '1px solid #e0e0e0',
            boxShadow: '0 2px 12px rgba(0,0,0,0.04)', padding: 24, overflow: 'hidden',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
              <div style={{ width: 40, height: 40, borderRadius: '50%', background: '#f0f0f0', animation: 'pulse 1.5s infinite' }} />
              <div style={{ flex: 1 }}>
                <div style={{ width: 120, height: 14, borderRadius: 6, background: '#f0f0f0', marginBottom: 6, animation: 'pulse 1.5s infinite' }} />
                <div style={{ width: 80, height: 10, borderRadius: 6, background: '#f5f5f5', animation: 'pulse 1.5s infinite' }} />
              </div>
            </div>
            <div style={{ width: '60%', height: 18, borderRadius: 6, background: '#f0f0f0', marginBottom: 16, animation: 'pulse 1.5s infinite' }} />
            <div style={{ display: 'flex', gap: 24 }}>
              {[1, 2, 3].map(j => (
                <div key={j} style={{ flex: 1 }}>
                  <div style={{ width: '80%', height: 20, borderRadius: 6, background: '#f0f0f0', marginBottom: 4, animation: 'pulse 1.5s infinite' }} />
                  <div style={{ width: '60%', height: 12, borderRadius: 6, background: '#f5f5f5', animation: 'pulse 1.5s infinite' }} />
                </div>
              ))}
            </div>
          </div>
        ))}
        <style>{`@keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }`}</style>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '80px 24px' }}>
        <div style={{ fontSize: 64, marginBottom: 16 }}>{'🏃'}</div>
        <h3 style={{ fontSize: 20, fontWeight: 700, color: '#242424', margin: '0 0 8px' }}>
          Нет активностей
        </h3>
        <p style={{ fontSize: 14, color: '#999', margin: 0 }}>
          Пока никто не добавил активность. Будьте первым!
        </p>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <h2 style={{ fontSize: 24, fontWeight: 800, color: '#242424', margin: 0 }}>
        {'📰'} Лента активностей
      </h2>

      {items.map(item => {
        const sport = SPORT[item.sport] ?? SPORT.RUNNING;
        const distKm = (item.distance ?? 0) / 1000;
        const speedKmH = item.avgSpeed ?? (item.duration > 0 ? (distKm / (item.duration / 3600)) : 0);
        const photos = item.photos ?? [];
        const likeCount = item._count?.likes ?? 0;

        return (
          <motion.div
            key={item.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            style={{
              background: '#fff',
              borderRadius: 16,
              border: '1px solid #e0e0e0',
              boxShadow: '0 2px 12px rgba(0,0,0,0.04)',
              overflow: 'hidden',
            }}
          >
            {/* Header: avatar + username + level + time */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: isMobile ? 8 : 12,
              padding: isMobile ? '12px 14px 8px' : '16px 20px 12px',
            }}>
              <div
                onClick={() => window.dispatchEvent(new CustomEvent('open-profile', { detail: { userId: item.user.id } }))}
                style={{
                  width: 40, height: 40, minWidth: 40, borderRadius: '50%',
                  background: item.user.avatarUrl ? 'none' : 'linear-gradient(135deg, #fc4c02, #ff6b2b)',
                  color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 16, fontWeight: 700, overflow: 'hidden',
                  boxShadow: '0 1px 4px rgba(0,0,0,0.1)',
                  cursor: 'pointer',
                }}
              >
                {item.user.avatarUrl
                  ? <img src={item.user.avatarUrl} alt="" style={{ width: 40, height: 40, borderRadius: '50%', objectFit: 'cover' }} />
                  : (item.user.username ?? '?')[0].toUpperCase()}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <span
                    onClick={() => window.dispatchEvent(new CustomEvent('open-profile', { detail: { userId: item.user.id } }))}
                    style={{ fontSize: 14, fontWeight: 700, color: '#242424', cursor: 'pointer' }}
                    onMouseEnter={(e) => { (e.target as HTMLElement).style.color = '#fc4c02'; }}
                    onMouseLeave={(e) => { (e.target as HTMLElement).style.color = '#242424'; }}
                  >
                    {item.user.username ?? 'Пользователь'}
                  </span>
                  <span style={{
                    fontSize: 11, fontWeight: 600, color: sport.color,
                    background: sport.bg, padding: '2px 8px', borderRadius: 10,
                  }}>
                    Ур. {item.user.level ?? 0}
                  </span>
                </div>
                <div style={{ fontSize: 12, color: '#aaa', marginTop: 2 }}>
                  {formatTimeAgo(item.startedAt ?? item.createdAt)}
                </div>
              </div>
            </div>

            {/* Activity title */}
            <div style={{ padding: isMobile ? '0 14px 8px' : '0 20px 12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 20 }}>{sport.icon}</span>
                <span style={{ fontSize: 16, fontWeight: 700, color: '#242424' }}>
                  {item.title ?? sport.label} {distKm.toFixed(1)} км
                </span>
              </div>
            </div>

            {/* Stats row */}
            <div style={{
              display: 'flex', gap: 0, padding: isMobile ? '8px 14px' : '12px 20px',
              borderTop: '1px solid #f5f5f5', borderBottom: photos.length > 0 ? '1px solid #f5f5f5' : 'none',
            }}>
              <div style={{ flex: 1, textAlign: 'center' }}>
                <div style={{ fontSize: isMobile ? 15 : 18, fontWeight: 800, color: '#242424' }}>
                  {distKm.toFixed(1)}
                </div>
                <div style={{ fontSize: isMobile ? 10 : 11, color: '#aaa', marginTop: 2 }}>Дистанция, км</div>
              </div>
              <div style={{ width: 1, background: '#f0f0f0', margin: '0 4px' }} />
              <div style={{ flex: 1, textAlign: 'center' }}>
                <div style={{ fontSize: isMobile ? 15 : 18, fontWeight: 800, color: '#242424' }}>
                  {formatDuration(item.duration ?? 0)}
                </div>
                <div style={{ fontSize: isMobile ? 10 : 11, color: '#aaa', marginTop: 2 }}>Время</div>
              </div>
              <div style={{ width: 1, background: '#f0f0f0', margin: '0 4px' }} />
              <div style={{ flex: 1, textAlign: 'center' }}>
                {item.sport === 'RUNNING' || item.sport === 'WALKING' ? (
                  <>
                    <div style={{ fontSize: isMobile ? 15 : 18, fontWeight: 800, color: '#242424' }}>
                      {formatPace(item.avgPace)}
                    </div>
                    <div style={{ fontSize: isMobile ? 10 : 11, color: '#aaa', marginTop: 2 }}>Темп, мин/км</div>
                  </>
                ) : (
                  <>
                    <div style={{ fontSize: isMobile ? 15 : 18, fontWeight: 800, color: '#242424' }}>
                      {speedKmH.toFixed(1)}
                    </div>
                    <div style={{ fontSize: isMobile ? 10 : 11, color: '#aaa', marginTop: 2 }}>Скорость, км/ч</div>
                  </>
                )}
              </div>
            </div>

            {/* Photos */}
            {photos.length > 0 && (
              <div style={{
                display: 'flex', gap: 6, padding: '12px 20px',
                overflowX: 'auto',
              }}>
                {photos.map(photo => (
                  <div
                    key={photo.id}
                    onClick={() => setEnlargedPhoto(photo.imageUrl)}
                    style={{
                      width: 100, height: 100, minWidth: 100, borderRadius: 12,
                      overflow: 'hidden', cursor: 'pointer',
                      border: '1px solid #f0f0f0',
                    }}
                  >
                    <img
                      src={photo.imageUrl}
                      alt=""
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  </div>
                ))}
              </div>
            )}

            {/* Like button */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '12px 20px 16px',
            }}>
              <motion.button
                whileTap={{ scale: 0.85 }}
                onClick={() => handleLike(item.id)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  background: 'none', border: 'none', cursor: isAuthenticated ? 'pointer' : 'default',
                  padding: '4px 8px', borderRadius: 8, fontSize: 14, fontWeight: 600,
                  color: item.isLiked ? '#fc4c02' : '#aaa',
                  transition: 'color 0.2s',
                }}
              >
                <motion.span
                  key={item.isLiked ? 'liked' : 'not'}
                  initial={{ scale: 1 }}
                  animate={{ scale: [1, 1.3, 1] }}
                  transition={{ duration: 0.3 }}
                  style={{ fontSize: 18 }}
                >
                  {item.isLiked ? '❤️' : '🤍'}
                </motion.span>
                {likeCount > 0 && (
                  <span style={{ fontSize: 13 }}>
                    {likeCount}
                  </span>
                )}
              </motion.button>
            </div>
          </motion.div>
        );
      })}

      {/* Load more */}
      {page < totalPages && (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '8px 0' }}>
          <button
            onClick={() => loadFeed(page + 1, true)}
            disabled={loadingMore}
            style={{
              padding: '12px 32px', fontSize: 14, fontWeight: 700,
              color: '#fff', background: loadingMore ? '#ccc' : 'linear-gradient(135deg, #fc4c02, #ff6b2b)',
              border: 'none', borderRadius: 12, cursor: loadingMore ? 'not-allowed' : 'pointer',
              boxShadow: '0 2px 10px rgba(252,76,2,0.2)',
              transition: 'all 0.2s',
            }}
          >
            {loadingMore ? 'Загрузка...' : 'Загрузить ещё'}
          </button>
        </div>
      )}

      {/* Enlarged photo overlay */}
      <AnimatePresence>
        {enlargedPhoto && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setEnlargedPhoto(null)}
            style={{
              position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
              background: 'rgba(0,0,0,0.85)', display: 'flex',
              alignItems: 'center', justifyContent: 'center',
              zIndex: 9999, cursor: 'pointer', padding: 24,
            }}
          >
            <motion.img
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              src={enlargedPhoto}
              alt=""
              style={{
                maxWidth: '90vw', maxHeight: '90vh', borderRadius: 16,
                objectFit: 'contain', boxShadow: '0 8px 40px rgba(0,0,0,0.4)',
              }}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
