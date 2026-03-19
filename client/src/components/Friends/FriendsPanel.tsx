import { useEffect, useState } from 'react';
import { api } from '@/services/api';
import { useAuth } from '@/context/AuthContext';

type Friend = { id: string; username: string; avatarUrl?: string; city?: string; level: number; totalDistance: number };
type MutualUser = { id: string; username: string; avatarUrl?: string; city?: string; level: number };

function Avatar({ user, size = 48 }: { user: { username: string; avatarUrl?: string }; size?: number }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%', flexShrink: 0, overflow: 'hidden',
      background: user.avatarUrl ? 'none' : 'linear-gradient(135deg, #fc4c02, #ff6b2b)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: size * 0.38, color: '#fff', fontWeight: 700,
    }}>
      {user.avatarUrl
        ? <img src={user.avatarUrl} alt="" style={{ width: size, height: size, objectFit: 'cover' }} />
        : (user.username[0] ?? '?').toUpperCase()}
    </div>
  );
}

function MutualFriendsRow({ friendId }: { friendId: string }) {
  const [mutuals, setMutuals] = useState<MutualUser[] | null>(null);

  useEffect(() => {
    api.social.mutualFriends(friendId).then(setMutuals).catch(() => setMutuals([]));
  }, [friendId]);

  if (!mutuals || mutuals.length === 0) return null;

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 6 }}>
      <div style={{ display: 'flex' }}>
        {mutuals.slice(0, 3).map((m, i) => (
          <div key={m.id} style={{ marginLeft: i > 0 ? -8 : 0, zIndex: 3 - i }}>
            <Avatar user={m} size={20} />
          </div>
        ))}
      </div>
      <span style={{ fontSize: 12, color: '#888' }}>
        {mutuals.length === 1
          ? `${mutuals[0].username} — общий друг`
          : `${mutuals.length} общих друга`}
      </span>
    </div>
  );
}

function FriendCard({ friend, onOpenProfile }: { friend: Friend; onOpenProfile: (id: string) => void }) {
  return (
    <div style={{
      background: '#fff', borderRadius: 14, padding: '14px 16px',
      boxShadow: '0 1px 4px rgba(0,0,0,0.06), 0 0 0 1px rgba(0,0,0,0.04)',
      display: 'flex', alignItems: 'flex-start', gap: 12,
    }}>
      <button onClick={() => onOpenProfile(friend.id)} style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', flexShrink: 0 }}>
        <Avatar user={friend} size={48} />
      </button>

      <div style={{ flex: 1, minWidth: 0 }}>
        <button
          onClick={() => onOpenProfile(friend.id)}
          style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', textAlign: 'left' }}
        >
          <div style={{ fontSize: 15, fontWeight: 700, color: '#1a1a1a' }}>{friend.username}</div>
        </button>
        <div style={{ fontSize: 12, color: '#888', marginTop: 2 }}>
          {[friend.city, `Ур. ${friend.level}`, `${(friend.totalDistance / 1000).toFixed(0)} км`].filter(Boolean).join(' · ')}
        </div>
        <MutualFriendsRow friendId={friend.id} />
      </div>

      <button
        onClick={() => {
          window.dispatchEvent(new CustomEvent('open-messages-with', {
            detail: { userId: friend.id, username: friend.username, avatarUrl: friend.avatarUrl, level: friend.level },
          }));
        }}
        style={{
          flexShrink: 0, padding: '6px 12px', borderRadius: 8, border: '1px solid #e0e0e0',
          background: '#fff', color: '#555', fontSize: 12, fontWeight: 600, cursor: 'pointer',
        }}
      >
        Написать
      </button>
    </div>
  );
}

export default function FriendsPanel() {
  const { user } = useAuth();
  const [friends, setFriends] = useState<Friend[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewUserId, setViewUserId] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    api.social.myFriends()
      .then(setFriends)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [user]);

  useEffect(() => {
    if (!viewUserId) return;
    window.dispatchEvent(new CustomEvent('open-profile', { detail: { userId: viewUserId } }));
    setViewUserId(null);
  }, [viewUserId]);

  if (!user) {
    return <div style={{ textAlign: 'center', padding: 60, color: '#999' }}>Войдите, чтобы видеть друзей</div>;
  }

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 22, fontWeight: 800, color: '#1a1a1a' }}>Мои друзья</div>
        {!loading && (
          <div style={{ fontSize: 13, color: '#888', marginTop: 4 }}>
            {friends.length === 0 ? 'Пока нет друзей' : `${friends.length} ${plural(friends.length, 'друг', 'друга', 'друзей')}`}
          </div>
        )}
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}>
          <div style={{ width: 32, height: 32, border: '3px solid rgba(252,76,2,0.15)', borderTopColor: '#fc4c02', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
        </div>
      ) : friends.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 20px', background: '#fff', borderRadius: 16, boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>👥</div>
          <div style={{ fontSize: 16, fontWeight: 700, color: '#1a1a1a', marginBottom: 8 }}>Друзей пока нет</div>
          <div style={{ fontSize: 14, color: '#888' }}>
            Друзья — это те, кто подписан на вас, и вы подписаны на них
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {friends.map(f => (
            <FriendCard key={f.id} friend={f} onOpenProfile={id => window.dispatchEvent(new CustomEvent('open-profile', { detail: { userId: id } }))} />
          ))}
        </div>
      )}
    </div>
  );
}

function plural(n: number, one: string, two: string, five: string) {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return one;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return two;
  return five;
}
