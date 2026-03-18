import { useCallback, useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Battle, SportType } from '@/types';
import { api } from '@/services/api';
import { useAuth } from '@/context/AuthContext';

const SPORT_OPTIONS: { key: SportType; icon: string; label: string }[] = [
  { key: 'RUNNING', icon: '🏃', label: 'Бег' },
  { key: 'CYCLING', icon: '🚴', label: 'Вело' },
  { key: 'SKIING', icon: '⛷️', label: 'Лыжи' },
  { key: 'WALKING', icon: '🚶', label: 'Ходьба' },
];

function sportIcon(sport: SportType) {
  const map: Record<SportType, string> = {
    RUNNING: '🏃',
    CYCLING: '🚴',
    SKIING: '⛷️',
    WALKING: '🚶',
  };
  return map[sport] ?? '🏃';
}

function statusLabel(status: string) {
  const map: Record<string, { text: string; color: string }> = {
    PENDING: { text: 'Ожидание', color: 'bg-accent/15 text-accent' },
    ACTIVE: { text: 'Активный', color: 'bg-primary/15 text-primary' },
    FINISHED: { text: 'Завершён', color: 'bg-secondary/15 text-secondary' },
    DECLINED: { text: 'Отклонён', color: 'bg-danger/15 text-danger' },
  };
  return map[status] ?? { text: status, color: 'bg-surface-light text-gray-400' };
}

function useCountdown(endsAt?: string) {
  const [remaining, setRemaining] = useState('');
  useEffect(() => {
    if (!endsAt) return;
    const update = () => {
      const diff = new Date(endsAt).getTime() - Date.now();
      if (diff <= 0) {
        setRemaining('Завершено');
        return;
      }
      const hours = Math.floor(diff / 3600000);
      const mins = Math.floor((diff % 3600000) / 60000);
      const secs = Math.floor((diff % 60000) / 1000);
      setRemaining(`${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`);
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [endsAt]);
  return remaining;
}

function BattleCard({
  battle,
  userId,
  onAccept,
  onDecline,
}: {
  battle: Battle;
  userId: string;
  onAccept: (id: string) => void;
  onDecline: (id: string) => void;
}) {
  const countdown = useCountdown(battle.status === 'ACTIVE' ? battle.endsAt : undefined);
  const isChallenger = battle.challengerId === userId;
  const isPendingReceived = battle.status === 'PENDING' && battle.opponentId === userId;
  const isPendingSent = battle.status === 'PENDING' && battle.challengerId === userId;

  const target = battle.targetDistance;
  const challengerPct = target > 0 ? Math.min((battle.challengerDistance / target) * 100, 100) : 0;
  const opponentPct = target > 0 ? Math.min((battle.opponentDistance / target) * 100, 100) : 0;

  const isWinner =
    battle.status === 'FINISHED' && battle.winnerId === userId;
  const isLoser =
    battle.status === 'FINISHED' && battle.winnerId && battle.winnerId !== userId;

  const st = statusLabel(battle.status);

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      whileHover={{ y: -2, transition: { duration: 0.2 } }}
      className={`rounded-xl border bg-surface p-5 space-y-4 transition-colors ${
        isWinner
          ? 'border-primary/40'
          : isLoser
            ? 'border-danger/20'
            : 'border-surface-light hover:border-surface-light/80'
      }`}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-2xl">{sportIcon(battle.sport)}</span>
          <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${st.color}`}>
            {st.text}
          </span>
        </div>
        {battle.status === 'ACTIVE' && countdown && (
          <span className="font-mono text-sm text-accent">{countdown}</span>
        )}
        {battle.status === 'FINISHED' && battle.winnerId && (
          <span
            className={`text-xs font-semibold ${isWinner ? 'text-primary' : 'text-danger'}`}
          >
            {isWinner ? 'Победа!' : 'Поражение'}
          </span>
        )}
      </div>

      {/* VS Layout */}
      <div className="flex items-center gap-3">
        {/* Challenger */}
        <div className="flex-1 text-center space-y-1">
          <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-surface-light text-sm font-bold text-white">
            {battle.challenger?.avatarUrl ? (
              <img
                src={battle.challenger.avatarUrl}
                alt=""
                className="h-10 w-10 rounded-full object-cover"
              />
            ) : (
              battle.challenger?.username?.charAt(0).toUpperCase() ?? '?'
            )}
          </div>
          <p className="text-sm font-medium text-white truncate">
            {battle.challenger?.username ?? 'Участник'}
            {isChallenger && (
              <span className="ml-1 text-[10px] text-gray-500">(вы)</span>
            )}
          </p>
          <p className="text-lg font-bold text-white">
            {(battle.challengerDistance / 1000).toFixed(2)}{' '}
            <span className="text-xs text-gray-500">км</span>
          </p>
        </div>

        {/* VS */}
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-bg text-sm font-bold text-gray-500">
          VS
        </div>

        {/* Opponent */}
        <div className="flex-1 text-center space-y-1">
          <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-surface-light text-sm font-bold text-white">
            {battle.opponent?.avatarUrl ? (
              <img
                src={battle.opponent.avatarUrl}
                alt=""
                className="h-10 w-10 rounded-full object-cover"
              />
            ) : (
              battle.opponent?.username?.charAt(0).toUpperCase() ?? '?'
            )}
          </div>
          <p className="text-sm font-medium text-white truncate">
            {battle.opponent?.username ?? 'Соперник'}
            {!isChallenger && (
              <span className="ml-1 text-[10px] text-gray-500">(вы)</span>
            )}
          </p>
          <p className="text-lg font-bold text-white">
            {(battle.opponentDistance / 1000).toFixed(2)}{' '}
            <span className="text-xs text-gray-500">км</span>
          </p>
        </div>
      </div>

      {/* Progress bars */}
      {(battle.status === 'ACTIVE' || battle.status === 'FINISHED') && target > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <span>Цель: {(target / 1000).toFixed(1)} км</span>
          </div>
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="w-16 truncate text-xs text-gray-400">
                {battle.challenger?.username}
              </span>
              <div className="flex-1 h-2 rounded-full bg-bg overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${challengerPct}%` }}
                  transition={{ duration: 0.8, ease: 'easeOut' }}
                  className="h-full rounded-full bg-primary"
                />
              </div>
              <span className="text-xs text-gray-400 w-10 text-right">
                {challengerPct.toFixed(0)}%
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-16 truncate text-xs text-gray-400">
                {battle.opponent?.username}
              </span>
              <div className="flex-1 h-2 rounded-full bg-bg overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${opponentPct}%` }}
                  transition={{ duration: 0.8, ease: 'easeOut' }}
                  className="h-full rounded-full bg-secondary"
                />
              </div>
              <span className="text-xs text-gray-400 w-10 text-right">
                {opponentPct.toFixed(0)}%
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Pending actions */}
      {isPendingReceived && (
        <div className="flex gap-2">
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() => onAccept(battle.id)}
            className="flex-1 rounded-lg bg-primary py-2 text-sm font-semibold text-white transition-colors hover:bg-primary-dark"
          >
            Принять
          </motion.button>
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() => onDecline(battle.id)}
            className="flex-1 rounded-lg bg-danger/10 py-2 text-sm font-semibold text-danger transition-colors hover:bg-danger/20"
          >
            Отклонить
          </motion.button>
        </div>
      )}
      {isPendingSent && (
        <div className="text-center text-sm text-accent">Ожидание ответа соперника...</div>
      )}
    </motion.div>
  );
}

export default function BattlesSection() {
  const { user } = useAuth();
  const [battles, setBattles] = useState<Battle[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);

  // Create form
  const [opponentName, setOpponentName] = useState('');
  const [selectedSport, setSelectedSport] = useState<SportType>('RUNNING');
  const [targetDistance, setTargetDistance] = useState('10');
  const [duration, setDuration] = useState('24');
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');

  const loadBattles = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.battles.list();
      setBattles(res);
    } catch {
      setBattles([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadBattles();
  }, [loadBattles]);

  const handleCreate = async () => {
    if (!opponentName.trim() || !targetDistance || !duration) return;
    setCreating(true);
    setCreateError('');
    try {
      await api.battles.create({
        opponentId: opponentName.trim(),
        sport: selectedSport,
        targetDistance: parseFloat(targetDistance) * 1000,
        duration: parseFloat(duration) * 3600,
      });
      setShowCreate(false);
      setOpponentName('');
      setTargetDistance('10');
      setDuration('24');
      loadBattles();
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : 'Ошибка создания');
    } finally {
      setCreating(false);
    }
  };

  const handleAccept = async (id: string) => {
    try {
      await api.battles.accept(id);
      loadBattles();
    } catch {
      /* ignore */
    }
  };

  const handleDecline = async (id: string) => {
    try {
      await api.battles.decline(id);
      loadBattles();
    } catch {
      /* ignore */
    }
  };

  const userId = user?.id ?? '';

  const { active, pendingReceived, pendingSent, finished } = useMemo(() => {
    const active: Battle[] = [];
    const pendingReceived: Battle[] = [];
    const pendingSent: Battle[] = [];
    const finished: Battle[] = [];
    for (const b of battles) {
      if (b.status === 'ACTIVE') active.push(b);
      else if (b.status === 'PENDING' && b.opponentId === userId) pendingReceived.push(b);
      else if (b.status === 'PENDING' && b.challengerId === userId) pendingSent.push(b);
      else if (b.status === 'FINISHED' || b.status === 'DECLINED') finished.push(b);
    }
    return { active, pendingReceived, pendingSent, finished };
  }, [battles, userId]);

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <h1 className="text-2xl font-bold text-white">Батлы</h1>
        <motion.button
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          onClick={() => setShowCreate(!showCreate)}
          className="rounded-lg bg-danger px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-red-700"
        >
          Вызвать на бой
        </motion.button>
      </motion.div>

      {/* Create form */}
      <AnimatePresence>
        {showCreate && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="rounded-xl border border-danger/20 bg-surface p-5 space-y-4">
              <h3 className="text-lg font-semibold text-white">Новый батл</h3>

              <div className="space-y-1">
                <label className="text-sm text-gray-400">Соперник (имя пользователя)</label>
                <input
                  type="text"
                  placeholder="Введите имя соперника"
                  value={opponentName}
                  onChange={(e) => setOpponentName(e.target.value)}
                  className="w-full rounded-lg border border-surface-light bg-bg px-4 py-2.5 text-white placeholder-gray-500 outline-none focus:border-danger transition-colors"
                />
              </div>

              <div className="space-y-1">
                <label className="text-sm text-gray-400">Вид спорта</label>
                <div className="flex gap-2">
                  {SPORT_OPTIONS.map((s) => (
                    <button
                      key={s.key}
                      onClick={() => setSelectedSport(s.key)}
                      className={`flex-1 rounded-lg px-3 py-2.5 text-sm font-medium transition-all ${
                        selectedSport === s.key
                          ? 'bg-danger text-white'
                          : 'bg-bg text-gray-400 hover:bg-surface-light hover:text-white'
                      }`}
                    >
                      {s.icon} {s.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-sm text-gray-400">Дистанция (км)</label>
                  <input
                    type="number"
                    min="1"
                    step="0.5"
                    value={targetDistance}
                    onChange={(e) => setTargetDistance(e.target.value)}
                    className="w-full rounded-lg border border-surface-light bg-bg px-4 py-2.5 text-white outline-none focus:border-danger transition-colors"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-sm text-gray-400">Длительность (часов)</label>
                  <input
                    type="number"
                    min="1"
                    step="1"
                    value={duration}
                    onChange={(e) => setDuration(e.target.value)}
                    className="w-full rounded-lg border border-surface-light bg-bg px-4 py-2.5 text-white outline-none focus:border-danger transition-colors"
                  />
                </div>
              </div>

              {createError && (
                <p className="text-sm text-danger">{createError}</p>
              )}

              <div className="flex gap-2">
                <motion.button
                  whileTap={{ scale: 0.97 }}
                  onClick={handleCreate}
                  disabled={creating || !opponentName.trim()}
                  className="rounded-lg bg-danger px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-red-700 disabled:opacity-50"
                >
                  {creating ? 'Создание...' : 'Отправить вызов'}
                </motion.button>
                <button
                  onClick={() => setShowCreate(false)}
                  className="rounded-lg px-5 py-2 text-sm text-gray-400 hover:text-white transition-colors"
                >
                  Отмена
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Loading */}
      {loading ? (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="animate-pulse rounded-xl border border-surface-light bg-surface p-5 space-y-4"
            >
              <div className="flex items-center gap-2">
                <div className="h-6 w-6 rounded bg-surface-light" />
                <div className="h-5 w-20 rounded bg-surface-light" />
              </div>
              <div className="flex items-center gap-4">
                <div className="flex-1 space-y-2 text-center">
                  <div className="mx-auto h-10 w-10 rounded-full bg-surface-light" />
                  <div className="mx-auto h-4 w-20 rounded bg-surface-light" />
                </div>
                <div className="h-10 w-10 rounded-full bg-surface-light" />
                <div className="flex-1 space-y-2 text-center">
                  <div className="mx-auto h-10 w-10 rounded-full bg-surface-light" />
                  <div className="mx-auto h-4 w-20 rounded bg-surface-light" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : battles.length === 0 ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="rounded-xl border border-surface-light bg-surface p-10 text-center"
        >
          <p className="text-4xl mb-3">⚔️</p>
          <p className="text-gray-400">У вас пока нет батлов</p>
          <p className="mt-1 text-sm text-gray-500">Вызовите кого-нибудь на бой!</p>
        </motion.div>
      ) : (
        <div className="space-y-6">
          {/* Pending received */}
          {pendingReceived.length > 0 && (
            <div className="space-y-3">
              <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-accent">
                <span className="h-2 w-2 rounded-full bg-accent animate-pulse" />
                Входящие вызовы
              </h2>
              <div className="grid gap-4 sm:grid-cols-2">
                <AnimatePresence>
                  {pendingReceived.map((b) => (
                    <BattleCard
                      key={b.id}
                      battle={b}
                      userId={userId}
                      onAccept={handleAccept}
                      onDecline={handleDecline}
                    />
                  ))}
                </AnimatePresence>
              </div>
            </div>
          )}

          {/* Active */}
          {active.length > 0 && (
            <div className="space-y-3">
              <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-primary">
                <span className="h-2 w-2 rounded-full bg-primary animate-pulse" />
                Активные батлы
              </h2>
              <div className="grid gap-4 sm:grid-cols-2">
                <AnimatePresence>
                  {active.map((b) => (
                    <BattleCard
                      key={b.id}
                      battle={b}
                      userId={userId}
                      onAccept={handleAccept}
                      onDecline={handleDecline}
                    />
                  ))}
                </AnimatePresence>
              </div>
            </div>
          )}

          {/* Pending sent */}
          {pendingSent.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-500">
                Отправленные вызовы
              </h2>
              <div className="grid gap-4 sm:grid-cols-2">
                <AnimatePresence>
                  {pendingSent.map((b) => (
                    <BattleCard
                      key={b.id}
                      battle={b}
                      userId={userId}
                      onAccept={handleAccept}
                      onDecline={handleDecline}
                    />
                  ))}
                </AnimatePresence>
              </div>
            </div>
          )}

          {/* Finished */}
          {finished.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-500">
                Завершённые
              </h2>
              <div className="grid gap-4 sm:grid-cols-2">
                <AnimatePresence>
                  {finished.map((b) => (
                    <BattleCard
                      key={b.id}
                      battle={b}
                      userId={userId}
                      onAccept={handleAccept}
                      onDecline={handleDecline}
                    />
                  ))}
                </AnimatePresence>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
