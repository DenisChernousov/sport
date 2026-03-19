import { useEffect, useRef, useState } from 'react';
import { api } from '@/services/api';
import { useAuth } from '@/context/AuthContext';

const EMOJI_CATEGORIES = [
  { label: '😀', emojis: ['😀','😂','😍','🥰','😎','🤩','😊','🙃','🤔','😅','😭','😤','🥳','🤗','😏','😬','🤯','😴','🥺','😱'] },
  { label: '👍', emojis: ['👍','👎','👏','🙌','🤝','💪','🫶','❤️','🔥','⭐','✅','🎉','🏆','💯','🚀','💪','🫠','🤌','👀','💀'] },
  { label: '🏃', emojis: ['🏃','🚴','⛷️','🚶','🏋️','🤸','🏊','🧗','🤾','⛹️','🏇','🧘','🏌️','🤺','🏄','🥊','🎯','🏅','🥇','🏆'] },
  { label: '😤', emojis: ['😤','💪','🔥','⚡','💥','🎯','🏅','👊','🤜','🫡','🫶','❤️‍🔥','💦','😮‍💨','🥵','🤮','🤢','😵','😵‍💫','🤕'] },
];

type ConvUser = { id: string; username: string; avatarUrl?: string; level: number; city?: string };
type Conversation = { user: ConvUser; isFriend: boolean; isFollowing: boolean; isFollower: boolean; lastText: string; lastAt: string; unread: number };
type DM = { id: string; senderId: string; receiverId: string; text: string; isRead: boolean; createdAt: string };
type SearchUser = { id: string; username: string; avatarUrl?: string; city?: string; level: number };

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
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Emoji picker
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [emojiCat, setEmojiCat] = useState(0);
  const emojiRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (emojiRef.current && !emojiRef.current.contains(e.target as Node)) setEmojiOpen(false);
    };
    if (emojiOpen) document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [emojiOpen]);

  const insertEmoji = (emoji: string) => {
    const input = inputRef.current;
    if (!input) { setText(t => t + emoji); return; }
    const start = input.selectionStart ?? text.length;
    const end = input.selectionEnd ?? text.length;
    const next = text.slice(0, start) + emoji + text.slice(end);
    setText(next);
    requestAnimationFrame(() => {
      input.focus();
      input.setSelectionRange(start + emoji.length, start + emoji.length);
    });
  };

  // New conversation search
  const [searchMode, setSearchMode] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchUser[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Filter existing convs
  const [convsFilter, setConvsFilter] = useState('');

  useEffect(() => {
    const h = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', h);
    return () => window.removeEventListener('resize', h);
  }, []);

  useEffect(() => {
    api.messages.conversations().then(setConvs).catch(() => {}).finally(() => setLoading(false));
  }, []);

  // Listen for "open chat with user" event from profile popup
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail as { userId: string; username: string; avatarUrl?: string; level: number };
      if (!detail?.userId) return;
      const convUser: ConvUser = { id: detail.userId, username: detail.username, avatarUrl: detail.avatarUrl, level: detail.level };
      selectConv(convUser);
    };
    window.addEventListener('open-messages-with', handler);
    return () => window.removeEventListener('open-messages-with', handler);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadMessages = async (userId: string) => {
    setMsgLoading(true);
    try {
      const msgs = await api.messages.history(userId);
      setMessages(msgs);
    } catch {}
    finally { setMsgLoading(false); }
  };

  const selectConv = (convUser: ConvUser) => {
    setSelected(convUser);
    loadMessages(convUser.id);
    setConvs(prev => prev.map(c => c.user.id === convUser.id ? { ...c, unread: 0 } : c));
    setSearchMode(false);
    setSearchQuery('');
    setSearchResults([]);
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

  const handleSearch = (q: string) => {
    setSearchQuery(q);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    if (!q.trim()) { setSearchResults([]); return; }
    setSearchLoading(true);
    searchTimer.current = setTimeout(async () => {
      try {
        const res = await api.social.searchUsers({ q });
        setSearchResults((Array.isArray(res) ? res : []).filter((u: SearchUser) => u.id !== (user as { id: string } | null)?.id));
      } catch {}
      finally { setSearchLoading(false); }
    }, 300);
  };

  const handleSend = async () => {
    if (!selected || !text.trim() || sending) return;
    const t = text.trim();
    setText('');
    setSending(true);
    try {
      const msg = await api.messages.send(selected.id, t);
      setMessages(prev => [...prev, msg as DM]);
      setConvs(prev => {
        const exists = prev.find(c => c.user.id === selected.id);
        if (exists) return prev.map(c => c.user.id === selected.id ? { ...c, lastText: t, lastAt: new Date().toISOString() } : c);
        return [{ user: selected, isFriend: false, isFollowing: false, isFollower: false, lastText: t, lastAt: new Date().toISOString(), unread: 0 }, ...prev];
      });
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
          width: isMobile ? '100%' : 280, borderRight: isMobile ? 'none' : '1px solid #f0f0f0',
          display: 'flex', flexDirection: 'column', flexShrink: 0,
        }}>
          {/* Header */}
          <div style={{ padding: '14px 16px 10px', borderBottom: '1px solid #f0f0f0' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <div style={{ fontSize: 17, fontWeight: 800, color: '#242424' }}>Сообщения</div>
              <button
                onClick={() => { setSearchMode(!searchMode); setSearchQuery(''); setSearchResults([]); }}
                title="Написать"
                style={{
                  width: 32, height: 32, borderRadius: 8, border: 'none',
                  background: searchMode ? '#fff4ef' : '#f5f5f5',
                  cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: searchMode ? '#fc4c02' : '#555',
                }}
              >
                <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </button>
            </div>

            {/* Search input */}
            {searchMode ? (
              <div style={{ position: 'relative' }}>
                <svg style={{ position: 'absolute', left: 9, top: '50%', transform: 'translateY(-50%)', width: 14, height: 14, color: '#aaa', pointerEvents: 'none' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  autoFocus
                  value={searchQuery}
                  onChange={e => handleSearch(e.target.value)}
                  placeholder="Найти человека..."
                  style={{
                    width: '100%', height: 32, padding: '0 10px 0 30px',
                    borderRadius: 8, border: '1px solid #e8e8e8',
                    background: '#f5f5f5', fontSize: 13, outline: 'none', boxSizing: 'border-box',
                  }}
                />
              </div>
            ) : (
              <div style={{ position: 'relative' }}>
                <svg style={{ position: 'absolute', left: 9, top: '50%', transform: 'translateY(-50%)', width: 14, height: 14, color: '#aaa', pointerEvents: 'none' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  value={convsFilter}
                  onChange={e => setConvsFilter(e.target.value)}
                  placeholder="Поиск по беседам..."
                  style={{
                    width: '100%', height: 32, padding: '0 10px 0 30px',
                    borderRadius: 8, border: '1px solid #e8e8e8',
                    background: '#f5f5f5', fontSize: 13, outline: 'none', boxSizing: 'border-box',
                  }}
                />
              </div>
            )}
          </div>

          <div style={{ flex: 1, overflowY: 'auto' }}>
            {/* Search results */}
            {searchMode ? (
              searchLoading ? (
                <div style={{ padding: '16px', textAlign: 'center', color: '#999', fontSize: 13 }}>Поиск...</div>
              ) : searchQuery && searchResults.length === 0 ? (
                <div style={{ padding: '16px', textAlign: 'center', color: '#999', fontSize: 13 }}>Никого не найдено</div>
              ) : !searchQuery ? (
                <div style={{ padding: '16px', textAlign: 'center', color: '#bbb', fontSize: 13 }}>Введите имя пользователя</div>
              ) : searchResults.map(u => (
                <div
                  key={u.id}
                  onClick={() => selectConv({ id: u.id, username: u.username, avatarUrl: u.avatarUrl, level: u.level, city: u.city })}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '10px 16px', cursor: 'pointer',
                    borderBottom: '1px solid #f8f8f8', transition: 'background 0.1s',
                  }}
                  onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.background = '#f9f9f9'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.background = ''; }}
                >
                  <Avatar user={u} size={40} />
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: '#242424' }}>{u.username}</div>
                    <div style={{ fontSize: 12, color: '#999' }}>{u.city ?? `Ур. ${u.level}`}</div>
                  </div>
                </div>
              ))
            ) : (
              /* Normal conversations list */
              loading ? (
                <div style={{ textAlign: 'center', padding: 32, color: '#999' }}>Загрузка...</div>
              ) : convs.length === 0 ? (
                <div style={{ textAlign: 'center', padding: 32, color: '#999', fontSize: 13 }}>
                  <div style={{ fontSize: 32, marginBottom: 8 }}>💬</div>
                  Нет бесед. Нажмите карандаш, чтобы написать кому-нибудь.
                </div>
              ) : convs.filter(c => !convsFilter || c.user.username.toLowerCase().includes(convsFilter.toLowerCase())).map(conv => (
                <div
                  key={conv.user.id}
                  onClick={() => selectConv(conv.user)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '10px 14px', cursor: 'pointer',
                    background: selected?.id === conv.user.id ? '#fff8f5' : '#fff',
                    borderBottom: '1px solid #f8f8f8',
                    borderLeft: selected?.id === conv.user.id ? '3px solid #fc4c02' : '3px solid transparent',
                    transition: 'background 0.15s',
                  }}
                >
                  <div style={{ position: 'relative' }}>
                    <Avatar user={conv.user} size={42} />
                    {conv.isFriend && (
                      <div style={{
                        position: 'absolute', bottom: 0, right: 0,
                        width: 13, height: 13, borderRadius: '50%',
                        background: '#1a7f37', border: '2px solid #fff',
                        fontSize: 7, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff',
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
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 1 }}>
                      <div style={{ fontSize: 12, color: '#999', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
                        {conv.lastText || (conv.isFriend ? '🤝 Друг' : conv.isFollowing ? 'Вы подписаны' : 'Подписчик')}
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
              ))
            )}
          </div>
        </div>
      )}

      {/* Chat window */}
      {showChat ? (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
          {/* Chat header */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 10, padding: '12px 18px',
            borderBottom: '1px solid #f0f0f0',
          }}>
            {isMobile && (
              <button onClick={() => setSelected(null)} style={{
                background: 'none', border: 'none', cursor: 'pointer', color: '#666', fontSize: 20, padding: '0 4px',
              }}>←</button>
            )}
            <Avatar user={selected} size={36} />
            <div>
              <div style={{ fontSize: 15, fontWeight: 700, color: '#242424' }}>{selected.username}</div>
              {selected.city && <div style={{ fontSize: 12, color: '#999' }}>📍 {selected.city}</div>}
            </div>
          </div>

          {/* Messages */}
          <div ref={messagesContainerRef} style={{ flex: 1, overflowY: 'auto', padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 6 }}>
            {msgLoading ? (
              <div style={{ textAlign: 'center', color: '#999', padding: 20 }}>Загрузка...</div>
            ) : messages.length === 0 ? (
              <div style={{ textAlign: 'center', color: '#999', padding: 40, fontSize: 14 }}>
                <div style={{ fontSize: 32, marginBottom: 8 }}>👋</div>
                Напишите первое сообщение!
              </div>
            ) : messages.map((msg, i) => {
              const isMe = msg.senderId === (user as { id: string }).id;
              const showDate = i === 0 || new Date(messages[i-1].createdAt).toDateString() !== new Date(msg.createdAt).toDateString();
              return (
                <div key={msg.id}>
                  {showDate && (
                    <div style={{ textAlign: 'center', fontSize: 12, color: '#aaa', margin: '6px 0' }}>
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
                      <div style={{ fontSize: 10, opacity: 0.6, marginTop: 3, textAlign: 'right' }}>
                        {timeAgo(msg.createdAt)}
                        {isMe && <span style={{ marginLeft: 4 }}>{msg.isRead ? '✓✓' : '✓'}</span>}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Input */}
          <div style={{ borderTop: '1px solid #f0f0f0', background: '#fff' }}>
            {/* Emoji picker */}
            {emojiOpen && (
              <div ref={emojiRef} style={{
                padding: '8px 10px', borderBottom: '1px solid #f0f0f0',
                background: '#fafafa',
              }}>
                {/* Category tabs */}
                <div style={{ display: 'flex', gap: 4, marginBottom: 6 }}>
                  {EMOJI_CATEGORIES.map((cat, i) => (
                    <button key={i} onClick={() => setEmojiCat(i)} style={{
                      padding: '3px 8px', borderRadius: 6, border: 'none', cursor: 'pointer',
                      background: emojiCat === i ? '#fc4c02' : 'transparent',
                      fontSize: 16, lineHeight: 1,
                    }}>{cat.label}</button>
                  ))}
                </div>
                {/* Emoji grid */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
                  {EMOJI_CATEGORIES[emojiCat].emojis.map(emoji => (
                    <button key={emoji} onClick={() => insertEmoji(emoji)} style={{
                      width: 34, height: 34, borderRadius: 6, border: 'none', background: 'none',
                      cursor: 'pointer', fontSize: 20, display: 'flex', alignItems: 'center', justifyContent: 'center',
                      transition: 'background 0.1s',
                    }}
                      onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = '#f0f0f0'; }}
                      onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'none'; }}
                    >{emoji}</button>
                  ))}
                </div>
              </div>
            )}
            <div style={{ display: 'flex', gap: 6, padding: '10px 12px', alignItems: 'center' }}>
              {/* Emoji button */}
              <button
                onClick={() => setEmojiOpen(o => !o)}
                style={{
                  width: 34, height: 34, borderRadius: '50%', border: 'none', flexShrink: 0,
                  background: emojiOpen ? '#fff4ef' : 'transparent',
                  cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 20, transition: 'background 0.15s',
                }}
              >😊</button>
              <input
                ref={inputRef}
                value={text}
                onChange={e => setText(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                placeholder="Написать сообщение..."
                style={{
                  flex: 1, padding: '9px 14px', borderRadius: 20, border: '1px solid #e0e0e0',
                  fontSize: 14, outline: 'none', background: '#f9f9f9',
                }}
              />
              <button
                onClick={handleSend}
                disabled={!text.trim() || sending}
                style={{
                  width: 38, height: 38, borderRadius: '50%', border: 'none',
                  background: text.trim() ? '#fc4c02' : '#e0e0e0',
                  color: '#fff', cursor: text.trim() ? 'pointer' : 'not-allowed',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0, transition: 'background 0.15s',
                }}
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
                </svg>
              </button>
            </div>
          </div>
        </div>
      ) : !isMobile ? (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#bbb', flexDirection: 'column', gap: 10 }}>
          <svg width="52" height="52" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1} style={{ opacity: 0.4 }}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
          <div style={{ fontSize: 15, fontWeight: 600, color: '#999' }}>Выберите беседу</div>
          <div style={{ fontSize: 13, color: '#bbb' }}>или нажмите карандаш, чтобы написать кому-нибудь</div>
        </div>
      ) : null}
    </div>
  );
}
