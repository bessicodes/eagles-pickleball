'use client';

import { motion } from 'framer-motion';
import { useStore, playersMap, board, queueUnits } from '@/lib/store';
import { Avatar, Card, Eyebrow, SkillChip } from './ui';
import {
  achievementsFor,
  favouritePartner,
  formGuide,
  headToHead,
} from '@/lib/profileStats';
import { cn, tierFor } from '@/lib/utils';

/**
 * Read-only public profile for any player. Opened by tapping a player on the
 * ladder, a court, or the queue (store.viewPlayer). Slides in over the app.
 */
export default function PlayerProfileOverlay() {
  const viewingId = useStore((s) => s.viewingPlayerId);
  const close = useStore((s) => s.closePlayerView);
  const pMap = useStore(playersMap);
  const meId = useStore((s) => s.currentUserId);
  const matches = useStore((s) => s.matches);
  const allTime = useStore((s) => board(s, 'alltime'));
  const units = useStore(queueUnits);

  const player = viewingId ? pMap[viewingId] : null;
  if (!viewingId || !player) return null;

  const isSelf = viewingId === meId;
  const rank = allTime.find((r) => r.player.id === viewingId)?.rank ?? null;
  const games = player.wins + player.losses;
  const winRate = games > 0 ? Math.round((player.wins / games) * 100) : 0;
  const tier = tierFor(player.points);
  const form = formGuide(viewingId, matches);
  const fav = favouritePartner(viewingId, matches);
  const favPlayer = fav ? pMap[fav.id] : null;
  const ach = achievementsFor(player, matches, rank);
  const h2h = !isSelf && meId ? headToHead(meId, viewingId, matches) : null;

  // Live status tonight.
  const liveMatch = matches.find(
    (m) => m.status === 'live' && [...m.teamA, ...m.teamB].includes(viewingId)
  );
  const inQueue = units.some((u) => u.playerIds.includes(viewingId));
  const status = liveMatch
    ? { label: `On Court ${liveMatch.courtId}`, tone: 'lime' as const }
    : inQueue
      ? { label: 'In tonight’s queue', tone: 'violet' as const }
      : null;

  return (
    <motion.div
      className="fixed inset-0 z-[55] bg-ink"
      initial={{ opacity: 0, x: 24 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ type: 'spring', stiffness: 340, damping: 34 }}
    >
      <div className="mx-auto flex h-dvh w-full max-w-app flex-col">
        {/* top bar */}
        <div className="pt-safe flex items-center gap-3 px-4 py-3">
          <button
            onClick={close}
            className="grid h-10 w-10 place-items-center rounded-lg border border-white/10 bg-white/[0.04] text-white"
            aria-label="Back"
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2}>
              <path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          <span className="eyebrow">Player profile</span>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto no-scrollbar px-4 pb-8">
          {/* hero */}
          <Card className="relative overflow-hidden p-5">
            <div
              className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full blur-3xl"
              style={{ background: `${player.accent ?? '#D6FF00'}22` }}
            />
            <div className="relative flex items-center gap-4">
              <Avatar player={player} size={80} ring={player.accent ?? '#D6FF00'} />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <h1 className="font-display truncate text-2xl font-semibold tracking-tight text-white">
                    {player.nickname}
                  </h1>
                  {player.streak >= 2 && (
                    <span className="shrink-0 rounded-md bg-orange-500/15 px-2 py-0.5 text-xs font-semibold text-orange-300">
                      🔥 {player.streak}
                    </span>
                  )}
                </div>
                <p className="truncate text-sm text-white/45">{player.name}</p>
                <div className="mt-1.5 flex flex-wrap items-center gap-2">
                  <SkillChip skill={player.skill} />
                  <span
                    className="rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide"
                    style={{ background: `${tier.color}22`, color: tier.color }}
                  >
                    {tier.name}
                  </span>
                  {rank && <span className="text-xs text-white/40">#{rank} all-time</span>}
                </div>
              </div>
            </div>

            {status && (
              <div className="relative mt-4 flex items-center gap-2 rounded-lg border border-white/[0.06] bg-white/[0.02] px-3 py-2">
                <span
                  className="h-1.5 w-1.5 rounded-full animate-pulseDot"
                  style={{ background: status.tone === 'lime' ? '#D6FF00' : '#8A5CFF' }}
                />
                <span className="text-sm text-white/70">{status.label}</span>
              </div>
            )}

            <div className="relative mt-5 grid grid-cols-4 gap-2">
              <Stat value={player.rating} label="Rating" accent />
              <Stat value={`${player.wins}-${player.losses}`} label="W–L" />
              <Stat value={`${winRate}%`} label="Win rate" />
              <Stat value={player.bestStreak ?? 0} label="Best streak" />
            </div>
          </Card>

          {/* head to head */}
          {h2h && (
            <Card className="p-4">
              <Eyebrow>You vs {player.nickname}</Eyebrow>
              {h2h.together === 0 && h2h.vs.w === 0 && h2h.vs.l === 0 ? (
                <p className="mt-2 text-sm text-white/35">You haven’t shared a court yet.</p>
              ) : (
                <div className="mt-3 grid grid-cols-3 gap-2">
                  <Stat value={h2h.vs.w} label="Your wins" accent />
                  <Stat value={h2h.vs.l} label="Your losses" />
                  <Stat value={h2h.together} label="As partners" />
                </div>
              )}
            </Card>
          )}

          {/* form */}
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <Eyebrow>Recent form</Eyebrow>
              {favPlayer && (
                <span className="flex items-center gap-1.5 text-xs text-white/40">
                  <Avatar player={favPlayer} size={18} />
                  {favPlayer.nickname} · {fav?.games} games
                </span>
              )}
            </div>
            {form.length === 0 ? (
              <p className="mt-3 text-sm text-white/35">No games played yet.</p>
            ) : (
              <div className="mt-3 flex gap-1.5">
                {form.map((r, i) => (
                  <span
                    key={i}
                    className={cn(
                      'grid h-9 w-9 place-items-center rounded-lg text-sm font-bold',
                      r === 'W' ? 'bg-lime/15 text-lime' : 'bg-white/[0.05] text-white/40'
                    )}
                  >
                    {r}
                  </span>
                ))}
              </div>
            )}
          </Card>

          {/* achievements */}
          <div>
            <Eyebrow>Achievements</Eyebrow>
            <div className="mt-2 grid grid-cols-3 gap-2">
              {ach.map((a) => (
                <div
                  key={a.id}
                  className={cn(
                    'rounded-xl border p-3 text-center',
                    a.earned
                      ? 'border-lime/30 bg-lime/[0.06]'
                      : 'border-white/[0.06] bg-white/[0.02] opacity-55'
                  )}
                >
                  <p className={cn('text-[11px] font-semibold', a.earned ? 'text-white' : 'text-white/50')}>
                    {a.label}
                  </p>
                  <p className="text-[9px] leading-tight text-white/35">{a.hint}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function Stat({ value, label, accent }: { value: string | number; label: string; accent?: boolean }) {
  return (
    <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] px-2 py-3 text-center">
      <p className={cn('font-display text-xl font-bold tabular', accent ? 'text-lime' : 'text-white')}>
        {value}
      </p>
      <p className="mt-0.5 text-[10px] text-white/40">{label}</p>
    </div>
  );
}
