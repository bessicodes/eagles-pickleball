'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useStore, playersMap, currentUser, matchById } from '@/lib/store';
import type { Court, Match, Player } from '@/lib/types';
import { Avatar, Button, Card, Eyebrow, Sheet } from './ui';
import { cn, haptic } from '@/lib/utils';

/** Live 1s clock for elapsed timers. */
function useNow(ms = 1000) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), ms);
    return () => clearInterval(id);
  }, [ms]);
  return now;
}

function elapsed(from: number, now: number) {
  const s = Math.max(0, Math.floor((now - from) / 1000));
  const m = Math.floor(s / 60);
  return `${m}:${String(s % 60).padStart(2, '0')}`;
}

export default function CourtsTab() {
  const courts = useStore((s) => s.courts);
  const matches = useStore((s) => s.matches);
  const [scoreFor, setScoreFor] = useState<string | null>(null);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <Eyebrow live>Courts</Eyebrow>
          <h1 className="font-display mt-1 text-3xl font-semibold tracking-tightest text-white">
            4 courts live
          </h1>
        </div>
        <span className="rounded-md bg-white/[0.05] px-3 py-1.5 text-xs text-white/50">
          {matches.filter((m) => m.status === 'live').length}/4 in play
        </span>
      </div>

      <div className="grid grid-cols-1 gap-3">
        {courts.map((court, i) => (
          <CourtCard key={court.id} court={court} delay={i * 0.05} onScore={() => setScoreFor(court.matchId)} />
        ))}
      </div>

      <ScoreSheet matchId={scoreFor} onClose={() => setScoreFor(null)} />
    </div>
  );
}

function CourtCard({
  court,
  delay,
  onScore,
}: {
  court: Court;
  delay: number;
  onScore: () => void;
}) {
  const match = useStore((s) => matchById(s, court.matchId));
  const me = useStore(currentUser);
  const now = useNow();
  const mine = !!(match && me && [...match.teamA, ...match.teamB].includes(me.id));

  return (
    <Card
      className={cn('overflow-hidden p-4', mine && 'ring-1 ring-lime')}
      transition={{ delay, type: 'spring', stiffness: 320, damping: 30 }}
    >
      <div className="mb-3 flex items-center justify-between">
        <span className="font-display text-sm font-semibold text-white/70">{court.name}</span>
        {match ? (
          <span className="flex items-center gap-1.5 text-xs text-white/45">
            <span className="h-1.5 w-1.5 rounded-full bg-lime animate-pulseDot" />
            {elapsed(match.startedAt, now)}
          </span>
        ) : (
          <span className="text-xs text-white/30">Available</span>
        )}
      </div>

      {match ? (
        <>
          <TeamRow match={match} which="A" />
          <div className="my-2 flex items-center gap-3">
            <div className="h-px flex-1 bg-white/[0.06]" />
            <span className="font-display text-xs font-bold text-white/30">VS</span>
            <div className="h-px flex-1 bg-white/[0.06]" />
          </div>
          <TeamRow match={match} which="B" />

          {mine && (
            <Button className="mt-4 w-full" onClick={() => { haptic(12); onScore(); }}>
              Submit score
            </Button>
          )}
        </>
      ) : (
        <div className="flex flex-col items-center py-6">
          <div className="grid h-12 w-12 place-items-center rounded-full bg-white/[0.04] text-xl">
            🏓
          </div>
          <p className="mt-2 text-sm text-white/40">Court open — next up incoming</p>
        </div>
      )}
    </Card>
  );
}

function TeamRow({ match, which }: { match: Match; which: 'A' | 'B' }) {
  const pMap = useStore(playersMap);
  const viewPlayer = useStore((s) => s.viewPlayer);
  const team = which === 'A' ? match.teamA : match.teamB;
  const players = team.map((id) => pMap[id]).filter(Boolean) as Player[];

  return (
    <div className="flex items-center gap-3">
      <div className="flex -space-x-2">
        {players.map((p) => (
          <button
            key={p.id}
            onClick={() => {
              haptic(6);
              viewPlayer(p.id);
            }}
            className="active:scale-90 transition-transform"
            aria-label={`View ${p.nickname}`}
          >
            <Avatar player={p} size={38} ring="#141416" />
          </button>
        ))}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-white">
          {players.map((p) => p.nickname).join(' & ')}
        </p>
        <p className="text-xs text-white/40">
          {Math.round(players.reduce((s, p) => s + p.rating, 0) / (players.length || 1))} avg
        </p>
      </div>
    </div>
  );
}

// ── Score submission sheet ───────────────────────────────────────────
function ScoreSheet({ matchId, onClose }: { matchId: string | null; onClose: () => void }) {
  const match = useStore((s) => matchById(s, matchId));
  const pMap = useStore(playersMap);
  const submitScore = useStore((s) => s.submitScore);

  const [a, setA] = useState(11);
  const [b, setB] = useState(7);
  const [confirming, setConfirming] = useState(false);

  // Reset when a new match opens.
  useEffect(() => {
    if (matchId) {
      setA(11);
      setB(7);
      setConfirming(false);
    }
  }, [matchId]);

  if (!match) return <Sheet open={false} onClose={onClose}>{null}</Sheet>;

  const teamAName = match.teamA.map((id) => pMap[id]?.nickname).join(' & ');
  const teamBName = match.teamB.map((id) => pMap[id]?.nickname).join(' & ');
  const valid = a !== b && a >= 0 && b >= 0;

  function finalize() {
    if (!valid || !match) return;
    haptic([20, 30, 60]);
    submitScore(match.id, a, b);
    onClose();
  }

  return (
    <Sheet open={!!matchId} onClose={onClose} title="Submit final score">
      <Stepper label={teamAName} value={a} onChange={setA} accent="lime" />
      <div className="my-2 text-center font-display text-xs font-bold text-white/30">VS</div>
      <Stepper label={teamBName} value={b} onChange={setB} accent="violet" />

      <div className="mt-4 rounded-xl border border-white/[0.06] bg-white/[0.02] p-3 text-center text-sm">
        {a === b ? (
          <span className="text-amber-300">Games can&apos;t end in a tie.</span>
        ) : (
          <span className="text-white/60">
            Winner:{' '}
            <span className="font-semibold text-lime">{a > b ? teamAName : teamBName}</span> ·{' '}
            <span className="text-white/70">
              +{3 + Math.abs(a - b)} pts each
            </span>
          </span>
        )}
      </div>

      {!confirming ? (
        <Button className="mt-4 w-full" disabled={!valid} onClick={() => setConfirming(true)}>
          Review result
        </Button>
      ) : (
        <div className="mt-4 space-y-2">
          <p className="text-center text-xs text-white/45">
            Both teams tap to confirm {a}–{b}. Opponent auto-confirms in this demo.
          </p>
          <Button className="w-full" onClick={finalize}>
            Confirm {a}–{b} ✓
          </Button>
          <Button variant="ghost" className="w-full" onClick={() => setConfirming(false)}>
            Edit score
          </Button>
        </div>
      )}
    </Sheet>
  );
}

function Stepper({
  label,
  value,
  onChange,
  accent,
}: {
  label: string;
  value: number;
  onChange: (n: number) => void;
  accent: 'lime' | 'violet';
}) {
  const set = (n: number) => {
    haptic(6);
    onChange(Math.max(0, Math.min(21, n)));
  };
  return (
    <div className="flex items-center justify-between rounded-xl border border-white/[0.06] bg-white/[0.02] p-3">
      <span className="min-w-0 flex-1 truncate pr-2 text-sm font-semibold text-white">{label}</span>
      <div className="flex items-center gap-3">
        <button
          onClick={() => set(value - 1)}
          className="grid h-10 w-10 place-items-center rounded-full bg-white/[0.06] text-xl text-white active:scale-90"
        >
          −
        </button>
        <span
          className={cn(
            'w-10 text-center font-display text-3xl font-bold tabular',
            accent === 'lime' ? 'text-lime' : 'text-violet'
          )}
        >
          {value}
        </span>
        <button
          onClick={() => set(value + 1)}
          className="grid h-10 w-10 place-items-center rounded-full bg-white/[0.06] text-xl text-white active:scale-90"
        >
          +
        </button>
      </div>
    </div>
  );
}
