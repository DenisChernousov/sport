import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '@/services/api';
import { useAuth } from '@/context/AuthContext';

interface Toast {
  id: string;
  text: string;
  type: string;
  fromUserId?: string | null;
  entityId?: string | null;
  fromUser?: { id?: string; username: string; avatarUrl?: string };
  createdAt: string;
  visible: boolean;
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

function handleToastClick(toast: Toast) {
  if (toast.type === 'follow' && toast.fromUserId) {
    window.dispatchEvent(new CustomEvent('open-profile', { detail: { userId: toast.fromUserId } }));
  } else if (toast.type === 'message' && toast.fromUserId) {
    window.dispatchEvent(new CustomEvent('open-messages-with', {
      detail: {
        userId: toast.fromUserId,
        username: toast.fromUser?.username ?? '',
        avatarUrl: toast.fromUser?.avatarUrl,
        level: 1,
      },
    }));
  } else if (toast.type === 'achievement') {
    window.dispatchEvent(new CustomEvent('open-tab', { detail: { tab: 'profile' } }));
  } else if ((toast.type === 'like' || toast.type === 'comment') && toast.fromUserId) {
    window.dispatchEvent(new CustomEvent('open-profile', { detail: { userId: toast.fromUserId } }));
  } else if (toast.type === 'event_start' && toast.entityId) {
    window.dispatchEvent(new CustomEvent('open-tab', { detail: { tab: 'events' } }));
  }
}

export function ToastNotifications() {
  const { isAuthenticated } = useAuth();
  const [toasts, setToasts] = useState<Toast[]>([]);
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
      const notifs = res.notifications ?? [];

      if (!initialized.current) {
        notifs.forEach((n: { id: string }) => seenIds.current.add(n.id));
        initialized.current = true;
        return;
      }

      const newOnes = notifs.filter((n: { id: string; isRead: boolean }) => !seenIds.current.has(n.id) && !n.isRead);
      if (!newOnes.length) return;

      newOnes.forEach((n: { id: string }) => seenIds.current.add(n.id));
      setToasts(prev => [...prev, ...newOnes.map((n: Toast) => ({ ...n, visible: true }))]);
      newOnes.forEach((n: { id: string }) => setTimeout(() => dismissToast(n.id), 5000));
    } catch {}
  }, [isAuthenticated, dismissToast]);

  useEffect(() => {
    if (!isAuthenticated) return;
    checkNotifs();
    const t = setInterval(checkNotifs, 15000);
    return () => clearInterval(t);
  }, [isAuthenticated, checkNotifs]);

  // Listen for open-tab events (dispatched from toast click)
  useEffect(() => {
    const h = (e: Event) => {
      const tab = (e as CustomEvent).detail?.tab;
      if (tab) window.dispatchEvent(new CustomEvent('switch-tab', { detail: { tab } }));
    };
    window.addEventListener('open-tab', h);
    return () => window.removeEventListener('open-tab', h);
  }, []);

  if (!toasts.length) return null;

  return (
    <div style={{
      position: 'fixed', bottom: 24, right: 20,
      display: 'flex', flexDirection: 'column-reverse', gap: 10,
      zIndex: 9999, pointerEvents: 'none',
      maxWidth: 'calc(100vw - 40px)',
    }}>
      {toasts.map(toast => (
        <div
          key={toast.id}
          onClick={() => { handleToastClick(toast); dismissToast(toast.id); }}
          style={{
            display: 'flex', alignItems: 'flex-start', gap: 10,
            background: '#fff', borderRadius: 14,
            boxShadow: '0 8px 32px rgba(0,0,0,0.15), 0 2px 8px rgba(0,0,0,0.08)',
            border: '1px solid #f0f0f0',
            borderLeft: `4px solid ${toastColor(toast.type)}`,
            padding: '12px 14px',
            width: 300,
            pointerEvents: 'all',
            opacity: toast.visible ? 1 : 0,
            transform: toast.visible ? 'translateX(0)' : 'translateX(24px)',
            transition: 'opacity 0.3s ease, transform 0.3s ease',
            cursor: 'pointer',
          }}
        >
          {/* Avatar / Icon */}
          <div style={{
            width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
            background: toast.fromUser?.avatarUrl ? 'none' : `${toastColor(toast.type)}18`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 18, overflow: 'hidden',
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
            <div style={{ fontSize: 13, color: '#555', lineHeight: 1.4 }}>{toast.text}</div>
          </div>

          {/* Close */}
          <button
            onClick={e => { e.stopPropagation(); dismissToast(toast.id); }}
            style={{
              width: 20, height: 20, borderRadius: '50%', border: 'none',
              background: 'none', cursor: 'pointer', color: '#bbb',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0, padding: 0, fontSize: 16, lineHeight: 1,
            }}
          >×</button>
        </div>
      ))}
    </div>
  );
}
