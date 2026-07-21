'use client';

import { useStore, currentUser, playersMap, board } from '@/lib/store';
import { Avatar, Button, Card, Eyebrow, SkillChip } from './ui';
import { ago, cn, zar } from '@/lib/utils';

export default function ProfileTab() {
  const me = useStore(currentUser);
  const pMap = useStore(playersMap);
  const matches = useStore((s) => s.matches);
  const registrations = useStore((s) => s.registrations);
  const nights = useStore((s) => s.nights);
  const allTime = useStore((s) => board(s, 'alltime'));
  const signOut = useStore((s) => s.signOut);

  if (!me) return null;

  const myRank = allTime.find((r) => r.isUser)?.rank ?? '—';
  const winRate = me.wins + me.losses > 0 ? Math.round((me.wins / (me.wins + me.losses)) * 100) : 0;

  const myMatches = matches
    .filter((m) => m.status === 'completed' && [...m.teamA, ...m.teamB].includes(me.id))
    .sort((a, b) => (b.completedAt ?? 0) - (a.completedAt ?? 0))
    .slice(0, 8);

  const myPayments = registrations
    .filter((r) => r.playerId === me.id && r.paid)
    .sort((a, b) => (b.paidAt ?? 0) - (a.paidAt ?? 0));

  return (
    <div className="space-y-4 pb-2">
      {/* Hero card */}
      <Card className="relative overflow-hidden p-5">
        <div
          className="pointer-events-none absolute -right-8 -top-8 h-40 w-40 rounded-full blur-3xl"
          style={{ background: 'radial-gradient(circle, rgba(214,255,0,0.18), transparent 70%)' }}
        />
        <div className="relative flex items-center gap-4">
          <Avatar player={me} size={72} ring="rgba(214,255,0,0.6)" />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h1 className="font-display truncate text-2xl font-semibold text-white">
                {me.nickname}
              </h1>
              {me.streak >= 2 && (
                <span className="rounded-pill bg-orange-500/15 px-2 py-0.5 text-xs font-semibold text-orange-300">
                  🔥 {me.streak}
                </span>
              )}
            </div>
            <p className="truncate text-sm text-white/45">{me.name}</p>
            <div className="mt-1.5 flex items-center gap-2">
              <SkillChip skill={me.skill} />
              <span className="text-xs text-white/40">Rank #{myRank} all-time</span>
            </div>
          </div>
        </div>

        <div className="relative mt-5 grid grid-cols-4 gap-2">
          <Stat value={me.rating} label="Rating" accent />
          <Stat value={`${me.wins}-${me.losses}`} label="W-L" />
          <Stat value={`${winRate}%`} label="Win rate" />
          <Stat value={me.points} label="Points" />
        </div>
      </Card>

      {/* Match history */}
      <div>
        <Eyebrow>Match history</Eyebrow>
        <div className="mt-2 space-y-1.5">
          {myMatches.length === 0 ? (
            <Card className="flex flex-col items-center py-8">
              <span className="text-2xl">🎾</span>
              <p className="mt-2 text-sm text-white/40">No games yet — join tonight&apos;s league.</p>
            </Card>
          ) : (
            myMatches.map((m) => {
              const onA = m.teamA.includes(me.id);
              const my = onA ? m.scoreA ?? 0 : m.scoreB ?? 0;
              const opp = onA ? m.scoreB ?? 0 : m.scoreA ?? 0;
              const won = my > opp;
              const oppTeam = (onA ? m.teamB : m.teamA)
                .map((id) => pMap[id]?.nickname)
                .join(' & ');
              return (
                <Card key={m.id} className="flex items-center gap-3 p-3">
                  <span
                    className={cn(
                      'grid h-9 w-9 place-items-center rounded-full text-xs font-bold',
                      won ? 'bg-lime/15 text-lime' : 'bg-white/[0.06] text-white/50'
                    )}
                  >
                    {won ? 'W' : 'L'}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-white">vs {oppTeam}</p>
                    <p className="text-xs text-white/35">
                      Court {m.courtId} · {m.completedAt ? ago(m.completedAt) : ''}
                    </p>
                  </div>
                  <span className="font-display text-lg font-bold tabular text-white">
                    {my}<span className="text-white/30">–</span>{opp}
                  </span>
                </Card>
              );
            })
          )}
        </div>
      </div>

      {/* Payment history */}
      <div>
        <Eyebrow>Payment history</Eyebrow>
        <div className="mt-2 space-y-1.5">
          {myPayments.length === 0 ? (
            <Card className="py-6 text-center text-sm text-white/40">No payments yet.</Card>
          ) : (
            myPayments.map((r, i) => {
              const night = nights.find((n) => n.id === r.nightId);
              return (
                <Card key={i} className="flex items-center gap-3 p-3">
                  <span className="grid h-9 w-9 place-items-center rounded-full bg-emerald-400/10 text-emerald-300">
                    ✓
                  </span>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-white">
                      {night?.label ?? 'League night'}
                    </p>
                    <p className="text-xs text-white/35">
                      <span className="capitalize">{r.provider ?? 'yoco'}</span> ·{' '}
                      {r.paidAt ? ago(r.paidAt) : ''}
                    </p>
                  </div>
                  <span className="font-display text-sm font-bold text-white">
                    {zar(night?.entryCents ?? 5500)}
                  </span>
                </Card>
              );
            })
          )}
        </div>
      </div>

      <Button variant="ghost" className="w-full" onClick={signOut}>
        Sign out
      </Button>
      <p className="pb-2 text-center text-[11px] text-white/25">
        Eagles Pickleball · Northcliff · v1.0
      </p>
    </div>
  );
}

function Stat({ value, label, accent }: { value: string | number; label: string; accent?: boolean }) {
  return (
    <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] px-2 py-3 text-center">
      <p
        className={cn(
          'font-display text-xl font-bold tabular',
          accent ? 'text-lime' : 'text-white'
        )}
      >
        {value}
      </p>
      <p className="mt-0.5 text-[10px] text-white/40">{label}</p>
    </div>
  );
}
