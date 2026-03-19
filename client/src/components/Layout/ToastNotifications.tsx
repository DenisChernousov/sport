import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '@/services/api';
import { useAuth } from '@/context/AuthContext';

interface Toast {
  id: string;
  text: string;
  type: 'follow' | 'message' | 'achievement' | 'like' | 'comment' | 'event_start' | string;
  fromUser?: { username: string; avatarUrl?: string };
  createdAt: string;
}

function toastIcon(type: string) {
  if (type === 'message') return '💬';
  if (type === 'follow') return '👤';
  if (type === 'achievement') return '🏆';
  if (type === 'like') return '❤️';
  if (type === 'comment') return '💬';
  if (type === 'event_start') return '🏁';
  return '🔔';
}

function toastColor(type: string) {
  if (type === 'achievement') return '#7c3aed';
  if (type === 'follow') return '#0061ff';
  if (type === 'message') return '#059669';
  if (type === 'like') return '#e11d48';
  return '#fc4c02';
}

export function ToastNotifications() {
  const { isAuthenticated } = useAuth();
  const [toasts, setToasts] = useState<(Toast & { visible: boolean })[]>([]);
  const seenIds = useRef<Set<string>>(new Set());
  const initialized = useRef(false);

  const dismissToast = useCallback((id: string) => {
    setToasts(prev => prev.map(t => t.id === id ? { ...t, visible: false } : t));
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 400);
  }, []);

  const checkNotifs = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      const res = await api.notifications.list();
      const notifs: Toast[] = res.notifications ?? [];

      if (!initialized.current) {
        // On first load, just mark all as seen — don't show toasts for old ones
        notifs.forEach(n => seenIds.current.add(n.id));
        initialized.current = true;
        return;
      }

      const newOnes = notifs.filter(n => !seenIds.current.has(n.id) && !n.isRead);
      if (newOnes.length === 0) return;

      newOnes.forEach(n => seenIds.current.add(n.id));

      setToasts(prev => [
        ...prev,
        ...newOnes.map(n => ({ ...n, visible: true })),
      ]);

      // Auto-dismiss each after 5s
      newOnes.forEach(n => {
        setTimeout(() => dismissToast(n.id), 5000);
      });
    } catch {}
  }, [isAuthenticated, dismissToast]);

  useEffect(() => {
    if (!isAuthenticated) return;
    checkNotifs(); // initial (marks as seen)
    const t = setInterval(checkNotifs, 15000);
    return () => clearInterval(t);
  }, [isAuthenticated, checkNotifs]);

  if (toasts.length === 0) return null;

  return (
    <div style={{
      position: 'fixed', bottom: 24, right: 24,
      display: 'flex', flexDirection: 'column-reverse', gap: 10,
      zIndex: 9999, pointerEvents: 'none',
    }}>
      {toasts.map(toast => (
        <div
          key={toast.id}
          style={{
            display: 'flex', alignItems: 'flex-start', gap: 10,
            background: '#fff', borderRadius: 14,
            boxShadow: '0 8px 32px rgba(0,0,0,0.15), 0 2px 8px rgba(0,0,0,0.08)',
            border: '1px solid #f0f0f0',
            padding: '12px 14px',
            width: 300,
            pointerEvents: 'all',
            opacity: toast.visible ? 1 : 0,
            transform: toast.visible ? 'translateX(0)' : 'translateX(20px)',
            transition: 'opacity 0.35s ease, transform 0.35s ease',
            cursor: 'default',
            borderLeft: `4px solid ${toastColor(toast.type)}`,
          }}
        >
          {/* Avatar / Icon */}
          <div style={{
            width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
            background: toast.fromUser?.avatarUrl ? 'none' : `${toastColor(toast.type)}22`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: toast.fromUser?.avatarUrl ? undefined : 18, overflow: 'hidden',
          }}>
            {toast.fromUser?.avatarUrl
              ? <img src={toast.fromUser.avatarUrl} alt="" style={{ width: 36, height: 36, objectFit: 'cover', borderRadius: '50%' }} />
              : toastIcon(toast.type)}
          </div>

          {/* Text */}
          <div style={{ flex: 1, minWidth: 0 }}>
            {toast.fromUser && (
              <div style={{ fontSize: 13, fontWeight: 700, color: '#1a1a1a', marginBottom: 2 }}>
                {toast.fromUser.username}
              </div>
            )}
            <div style={{ fontSize: 13, color: '#444', lineHeight: 1.4 }}>{toast.text}</div>
          </div>

          {/* Close */}
          <button
            onClick={() => dismissToast(toast.id)}
            style={{
              width: 20, height: 20, borderRadius: '50%', border: 'none',
              background: 'none', cursor: 'pointer', color: '#bbb',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0, padding: 0, fontSize: 14, lineHeight: 1,
            }}
          >×</button>
        </div>
      ))}
    </div>
  );
}
