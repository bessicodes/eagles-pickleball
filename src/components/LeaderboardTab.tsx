'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useStore, board, type BoardRow } from '@/lib/store';
import type { BoardKey } from '@/lib/types';
import { Avatar, Eyebrow } from './ui';
import { cn, haptic } from '@/lib/utils';

const TABS: { key: BoardKey; label: string }[] = [
  { key: 'tonight', label: 'Tonight' },
  { key: 'mondays', label: 'Mondays' },
  { key: 'alltime', label: 'All-Time' },
];

export default function LeaderboardTab() {
  const [tab, setTab] = useState<BoardKey>('tonight');
  const rows = useStore((s) => board(s, tab));
  const meId = useStore((s) => s.currentUserId);
  const myRow = rows.find((r) => r.isUser);

  return (
    <div className="flex h-full flex-col">
      <div>
        <Eyebrow live>Leaderboard</Eyebrow>
        <h1 className="font-display mt-1 text-3xl font-semibold tracking-tightest text-white">
          Who&apos;s on top
        </h1>
      </div>

      {/* segmented control */}
      <div className="mt-4 flex rounded-lg bg-white/[0.05] p-1">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className="relative flex-1 rounded-lg py-2.5 text-sm font-semibold"
          >
            {tab === t.key && (
              <motion.span
                layoutId="board-pill"
                className="absolute inset-0 rounded-lg bg-lime"
                transition={{ type: 'spring', stiffness: 380, damping: 32 }}
              />
            )}
            <span className={cn('relative z-10', tab === t.key ? 'text-ink' : 'text-white/50')}>
              {t.label}
            </span>
          </button>
        ))}
      </div>

      {/* header row */}
      <div className="mt-4 flex items-center gap-3 px-3 pb-2 text-[11px] font-semibold uppercase tracking-wider text-white/30">
        <span className="w-6 text-center">#</span>
        <span className="flex-1">Player</span>
        <span className="w-14 text-center">W-L</span>
        <span className="w-12 text-right">Pts</span>
      </div>

      {/* list */}
      <div className="flex-1 space-y-1.5 overflow-y-auto no-scrollbar pb-2">
        {rows.length === 0 ? (
          <EmptyBoard tab={tab} />
        ) : (
          <AnimatePresence initial={false}>
            {rows.map((row) => (
              <Row key={row.player.id} row={row} highlight={row.player.id === meId} />
            ))}
          </AnimatePresence>
        )}
      </div>

      {/* sticky current-user row */}
      {myRow && (
        <div className="sticky bottom-0 pt-2">
          <div className="rounded-xl border border-lime/40 bg-lime/[0.08] p-0.5 backdrop-blur-xl">
            <Row row={myRow} highlight compact />
          </div>
        </div>
      )}
    </div>
  );
}

function Row({
  row,
  highlight,
  compact,
}: {
  row: BoardRow;
  highlight?: boolean;
  compact?: boolean;
}) {
  const viewPlayer = useStore((s) => s.viewPlayer);
  const rankColor =
    row.rank === 1
      ? 'text-lime'
      : row.rank === 2
        ? 'text-white/80'
        : row.rank === 3
          ? 'text-amber-500'
          : 'text-white/40';

  return (
    <motion.div
      layout={!compact}
      initial={compact ? false : { opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      onClick={() => {
        haptic(6);
        viewPlayer(row.player.id);
      }}
      role="button"
      className={cn(
        'flex cursor-pointer items-center gap-3 rounded-xl p-2.5 active:opacity-80',
        highlight && !compact ? 'bg-lime/[0.06]' : !compact ? 'bg-white/[0.02]' : ''
      )}
    >
      <div className="flex w-6 flex-col items-center">
        <span className={cn('font-display text-base font-bold tabular', rankColor)}>{row.rank}</span>
        {row.move !== 'none' && (
          <span className={cn('text-[9px]', row.move === 'up' ? 'text-emerald-400' : 'text-red-400')}>
            {row.move === 'up' ? '▲' : '▼'}
          </span>
        )}
      </div>

      <Avatar player={row.player} size={38} ring={row.rank === 1 ? '#D6FF00' : undefined} />

      <div className="min-w-0 flex-1">
        <p className="flex items-center gap-1.5 truncate text-sm font-semibold text-white">
          {row.player.nickname}
          {row.isUser && <span className="text-[10px] text-lime">YOU</span>}
          {row.player.streak >= 2 && (
            <span className="text-[11px]" title={`${row.player.streak} win streak`}>
              🔥{row.player.streak}
            </span>
          )}
        </p>
        <p className="truncate text-xs text-white/35">{row.player.name}</p>
      </div>

      <span className="w-14 text-center text-sm text-white/55 tabular">
        {row.wins}-{row.losses}
      </span>
      <span className="w-12 text-right font-display text-base font-bold text-white tabular">
        {row.points}
      </span>
    </motion.div>
  );
}

function EmptyBoard({ tab }: { tab: BoardKey }) {
  return (
    <div className="flex flex-col items-center py-16 text-center">
      <span className="text-4xl">🏆</span>
      <p className="mt-3 font-semibold text-white">
        {tab === 'tonight' ? 'No games played yet tonight' : 'Nothing here yet'}
      </p>
      <p className="mt-1 max-w-[220px] text-sm text-white/40">
        {tab === 'tonight'
          ? 'Win a match and you’ll shoot up the board instantly.'
          : 'Play some league nights to build your record.'}
      </p>
    </div>
  );
}
