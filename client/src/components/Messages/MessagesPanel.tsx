import { useEffect, useRef, useState } from 'react';
import { api } from '@/services/api';
import { useAuth } from '@/context/AuthContext';

type ConvUser = { id: string; username: string; avatarUrl?: string; level: number; city?: string };
type Conversation = { user: ConvUser; isFriend: boolean; isFollowing: boolean; isFollower: boolean; lastText: string; lastAt: string; unread: number };
type DM = { id: string; senderId: string; receiverId: string; text: string; isRead: boolean; createdAt: string };

function timeAgo(dateStr: string) {
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (diff < 60) return 'только что';
  if (diff < 3600) return `${Math.floor(diff / 60)} мин`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} ч`;
  return new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'short' }).format(new Date(dateStr));
}

function Avatar({ user, size = 40 }: { user: { username: string; avatarUrl?: string }; size?: number }) {
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

export default function MessagesPanel() {
  const { user } = useAuth();
  const [convs, setConvs] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<ConvUser | null>(null);
  const [messages, setMessages] = useState<DM[]>([]);
  const [msgLoading, setMsgLoading] = useState(false);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const bottomRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const h = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', h);
    return () => window.removeEventListener('resize', h);
  }, []);

  useEffect(() => {
    api.messages.conversations().then(setConvs).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const loadMessages = async (userId: string) => {
    setMsgLoading(true);
    try {
      const msgs = await api.messages.history(userId);
      setMessages(msgs);
    } catch {}
    finally { setMsgLoading(false); }
  };

  const selectConv = (conv: Conversation) => {
    setSelected(conv.user);
    loadMessages(conv.user.id);
    // Mark as read in local state
    setConvs(prev => prev.map(c => c.user.id === conv.user.id ? { ...c, unread: 0 } : c));
  };

  // Poll for new messages when chat is open
  useEffect(() => {
    if (!selected) return;
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = setInterval(() => {
      api.messages.history(selected.id).then(msgs => setMessages(msgs)).catch(() => {});
    }, 5000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [selected]);

  useEffect(() => {
    const el = messagesContainerRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages]);

  const handleSend = async () => {
    if (!selected || !text.trim() || sending) return;
    const t = text.trim();
    setText('');
    setSending(true);
    try {
      const msg = await api.messages.send(selected.id, t);
      setMessages(prev => [...prev, msg as DM]);
      setConvs(prev => prev.map(c =>
        c.user.id === selected.id ? { ...c, lastText: t, lastAt: new Date().toISOString() } : c
      ));
    } catch { setText(t); }
    finally { setSending(false); }
  };

  if (!user) return (
    <div style={{ textAlign: 'center', padding: 40, color: '#999' }}>Войдите чтобы видеть сообщения</div>
  );

  const showChat = selected && (!isMobile || selected);
  const showList = !isMobile || !selected;

  return (
    <div style={{
      display: 'flex', height: 600,
      background: '#fff', borderRadius: 16, overflow: 'hidden',
      boxShadow: '0 1px 4px rgba(0,0,0,0.06), 0 0 0 1px rgba(0,0,0,0.04)',
    }}>
      {/* Conversations list */}
      {showList && (
        <div style={{
          width: isMobile ? '100%' : 300, borderRight: isMobile ? 'none' : '1px solid #f0f0f0',
          display: 'flex', flexDirection: 'column', flexShrink: 0,
        }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid #f0f0f0' }}>
            <div style={{ fontSize: 18, fontWeight: 800, color: '#242424' }}>Сообщения</div>
          </div>
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {loading ? (
              <div style={{ textAlign: 'center', padding: 32, color: '#999' }}>Загрузка...</div>
            ) : convs.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 32, color: '#999', fontSize: 14 }}>
                <div style={{ fontSize: 32, marginBottom: 8 }}>💬</div>
                Нет бесед. Подпишитесь на других спортсменов, чтобы написать им.
              </div>
            ) : convs.map(conv => (
              <div
                key={conv.user.id}
                onClick={() => selectConv(conv)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '12px 16px', cursor: 'pointer',
                  background: selected?.id === conv.user.id ? '#fff8f5' : '#fff',
                  borderBottom: '1px solid #f8f8f8',
                  borderLeft: selected?.id === conv.user.id ? '3px solid #fc4c02' : '3px solid transparent',
                  transition: 'background 0.15s',
                }}
              >
                <div style={{ position: 'relative' }}>
                  <Avatar user={conv.user} size={44} />
                  {conv.isFriend && (
                    <div style={{
                      position: 'absolute', bottom: 0, right: 0,
                      width: 14, height: 14, borderRadius: '50%',
                      background: '#1a7f37', border: '2px solid #fff',
                      fontSize: 8, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>✓</div>
                  )}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 4 }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: '#242424', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {conv.user.username}
                    </div>
                    {conv.lastAt !== '1970-01-01T00:00:00.000Z' && (
                      <div style={{ fontSize: 11, color: '#aaa', flexShrink: 0 }}>{timeAgo(conv.lastAt)}</div>
                    )}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 2 }}>
                    <div style={{ fontSize: 12, color: '#999', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
                      {conv.isFriend ? '🤝 Друг' : conv.isFollowing ? '→ Вы подписаны' : '← Подписчик'}
                      {conv.lastText ? ` · ${conv.lastText}` : ''}
                    </div>
                    {conv.unread > 0 && (
                      <div style={{
                        minWidth: 18, height: 18, borderRadius: 9, background: '#fc4c02',
                        color: '#fff', fontSize: 11, fontWeight: 700,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        padding: '0 4px', flexShrink: 0,
                      }}>{conv.unread}</div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Chat window */}
      {showChat ? (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
          {/* Chat header */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 12, padding: '12px 20px',
            borderBottom: '1px solid #f0f0f0',
          }}>
            {isMobile && (
              <button onClick={() => setSelected(null)} style={{
                background: 'none', border: 'none', cursor: 'pointer', color: '#666', fontSize: 20, padding: '0 4px',
              }}>←</button>
            )}
            <Avatar user={selected} size={38} />
            <div>
              <div style={{ fontSize: 15, fontWeight: 700, color: '#242424' }}>{selected.username}</div>
              {selected.city && <div style={{ fontSize: 12, color: '#999' }}>📍 {selected.city}</div>}
            </div>
          </div>

          {/* Messages */}
          <div ref={messagesContainerRef} style={{ flex: 1, overflowY: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
            {msgLoading ? (
              <div style={{ textAlign: 'center', color: '#999', padding: 20 }}>Загрузка...</div>
            ) : messages.length === 0 ? (
              <div style={{ textAlign: 'center', color: '#999', padding: 40, fontSize: 14 }}>
                <div style={{ fontSize: 32, marginBottom: 8 }}>👋</div>
                Напишите первое сообщение!
              </div>
            ) : messages.map((msg, i) => {
              const isMe = msg.senderId === (user as any).id;
              const showDate = i === 0 || new Date(messages[i-1].createdAt).toDateString() !== new Date(msg.createdAt).toDateString();
              return (
                <div key={msg.id}>
                  {showDate && (
                    <div style={{ textAlign: 'center', fontSize: 12, color: '#aaa', margin: '8px 0' }}>
                      {new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'long' }).format(new Date(msg.createdAt))}
                    </div>
                  )}
                  <div style={{ display: 'flex', justifyContent: isMe ? 'flex-end' : 'flex-start' }}>
                    <div style={{
                      maxWidth: '72%', padding: '8px 12px', borderRadius: isMe ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                      background: isMe ? '#fc4c02' : '#f5f5f5',
                      color: isMe ? '#fff' : '#242424',
                      fontSize: 14, lineHeight: 1.5,
                    }}>
                      {msg.text}
                      <div style={{ fontSize: 10, opacity: 0.6, marginTop: 4, textAlign: 'right' }}>
                        {timeAgo(msg.createdAt)}
                        {isMe && <span style={{ marginLeft: 4 }}>{msg.isRead ? ' ✓✓' : ' ✓'}</span>}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div style={{
            display: 'flex', gap: 8, padding: 12, borderTop: '1px solid #f0f0f0',
            background: '#fff',
          }}>
            <input
              value={text}
              onChange={e => setText(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
              placeholder="Написать сообщение..."
              style={{
                flex: 1, padding: '10px 14px', borderRadius: 20, border: '1px solid #e0e0e0',
                fontSize: 14, outline: 'none', background: '#f9f9f9',
              }}
            />
            <button
              onClick={handleSend}
              disabled={!text.trim() || sending}
              style={{
                width: 40, height: 40, borderRadius: '50%', border: 'none',
                background: text.trim() ? '#fc4c02' : '#e0e0e0',
                color: '#fff', cursor: text.trim() ? 'pointer' : 'not-allowed',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0, transition: 'background 0.15s',
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
              </svg>
            </button>
          </div>
        </div>
      ) : !isMobile ? (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#999', flexDirection: 'column', gap: 12 }}>
          <div style={{ fontSize: 48 }}>💬</div>
          <div style={{ fontSize: 16, fontWeight: 600 }}>Выберите беседу</div>
          <div style={{ fontSize: 14 }}>или начните новую</div>
        </div>
      ) : null}
    </div>
  );
}
