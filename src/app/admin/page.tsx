'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  useStore,
  playersMap,
  queueUnits,
  board,
  simNight,
} from '@/lib/store';
import Background from '@/components/Background';
import { Avatar, Button, Card } from '@/components/ui';
import { zar } from '@/lib/utils';
import type { SkillLevel } from '@/lib/types';

const ADMIN_PIN = process.env.NEXT_PUBLIC_ADMIN_PIN ?? '2620';

export default function AdminPage() {
  const [pin, setPin] = useState('');
  const [ok, setOk] = useState(false);

  if (!ok) {
    return (
      <div className="grid min-h-dvh place-items-center px-6">
        <Background />
        <Card className="w-full max-w-sm p-6">
          <p className="eyebrow">Eagles · Admin</p>
          <h1 className="font-display mt-1 text-2xl font-semibold text-white">Enter PIN</h1>
          <input
            value={pin}
            onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
            inputMode="numeric"
            maxLength={6}
            placeholder="••••"
            className="mt-4 h-14 w-full rounded-xl border border-white/10 bg-white/[0.05] text-center text-2xl tracking-[0.4em] text-white outline-none focus:border-lime/50"
          />
          <Button
            className="mt-4 w-full"
            disabled={pin.length < 4}
            onClick={() => setOk(pin === ADMIN_PIN)}
          >
            Unlock
          </Button>
          {pin.length >= 4 && pin !== ADMIN_PIN && (
            <p className="mt-2 text-center text-xs text-red-400">Wrong PIN. Default is 2620.</p>
          )}
          <Link href="/" className="mt-4 block text-center text-xs text-white/40">
            ← Back to app
          </Link>
        </Card>
      </div>
    );
  }

  return <AdminConsole />;
}

function AdminConsole() {
  const night = useStore(simNight);
  const pMap = useStore(playersMap);
  const units = useStore(queueUnits);
  const registrations = useStore((s) => s.registrations);
  const simNightId = useStore((s) => s.simNightId);
  const matches = useStore((s) => s.matches);
  const rows = useStore((s) => board(s, 'tonight'));

  const overrideScore = useStore((s) => s.overrideScore);
  const addWalkIn = useStore((s) => s.addWalkIn);
  const endNight = useStore((s) => s.endNight);
  const resetNight = useStore((s) => s.resetNight);

  const paid = registrations.filter((r) => r.nightId === simNightId && r.paid);
  const live = matches.filter((m) => m.status === 'live');

  const [walkName, setWalkName] = useState('');
  const [walkSkill, setWalkSkill] = useState<SkillLevel>('Intermediate');

  function exportCsv() {
    const header = 'Rank,Name,Nickname,Wins,Losses,Points,Rating';
    const lines = rows.map(
      (r) =>
        `${r.rank},"${r.player.name}",${r.player.nickname},${r.wins},${r.losses},${r.points},${r.player.rating}`
    );
    const csv = [header, ...lines].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `eagles-${night?.day ?? 'night'}-leaderboard.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="mx-auto min-h-dvh w-full max-w-xl px-4 pb-16 pt-safe">
      <Background />

      <header className="flex items-center justify-between py-4">
        <div>
          <p className="eyebrow">Admin console</p>
          <h1 className="font-display text-2xl font-semibold text-white">
            {night?.label ?? 'Tonight'}
          </h1>
        </div>
        <Link
          href="/"
          className="rounded-md bg-white/[0.06] px-4 py-2 text-sm font-semibold text-white"
        >
          App →
        </Link>
      </header>

      {/* KPIs */}
      <div className="grid grid-cols-3 gap-2">
        <Kpi label="Paid in" value={paid.length} />
        <Kpi label="In queue" value={units.reduce((s, u) => s + u.playerIds.length, 0)} />
        <Kpi label="Live courts" value={`${live.length}/4`} />
      </div>

      {/* Actions */}
      <div className="mt-4 grid grid-cols-2 gap-2">
        <Button variant="ghost" onClick={exportCsv}>
          ⬇ Export CSV
        </Button>
        <Button variant="ghost" onClick={resetNight}>
          ♻ Reset night
        </Button>
        <Button
          variant="dark"
          className="col-span-2 !text-red-300"
          onClick={() => {
            if (confirm('End the night? This clears the queue and live matches.')) endNight();
          }}
        >
          ■ End night
        </Button>
      </div>

      {/* Add walk-in */}
      <Section title="Add walk-in">
        <div className="flex flex-col gap-2 sm:flex-row">
          <input
            value={walkName}
            onChange={(e) => setWalkName(e.target.value)}
            placeholder="Walk-in name"
            className="h-12 flex-1 rounded-xl border border-white/10 bg-white/[0.05] px-4 text-sm text-white outline-none focus:border-lime/50"
          />
          <select
            value={walkSkill}
            onChange={(e) => setWalkSkill(e.target.value as SkillLevel)}
            className="h-12 rounded-xl border border-white/10 bg-char px-3 text-sm text-white outline-none"
          >
            <option>Beginner</option>
            <option>Intermediate</option>
            <option>Advanced</option>
          </select>
          <Button
            className="!px-5"
            disabled={walkName.trim().length < 2}
            onClick={() => {
              addWalkIn(walkName.trim(), walkSkill);
              setWalkName('');
            }}
          >
            Add
          </Button>
        </div>
      </Section>

      {/* Live matches — override score */}
      <Section title={`Live matches (${live.length})`}>
        {live.length === 0 && <Empty text="No live matches." />}
        <div className="space-y-2">
          {live.map((m) => (
            <OverrideRow
              key={m.id}
              teamA={m.teamA.map((id) => pMap[id]?.nickname).join(' & ')}
              teamB={m.teamB.map((id) => pMap[id]?.nickname).join(' & ')}
              court={m.courtId}
              onSave={(a, b) => overrideScore(m.id, a, b)}
            />
          ))}
        </div>
      </Section>

      {/* Queue */}
      <Section title={`Queue (${units.length})`}>
        {units.length === 0 && <Empty text="Queue empty." />}
        <div className="space-y-1.5">
          {units.map((u, i) => (
            <div key={u.id} className="flex items-center gap-3 rounded-xl bg-white/[0.03] p-2">
              <span className="w-5 text-center text-xs font-bold text-white/40">{i + 1}</span>
              <div className="flex -space-x-2">
                {u.playerIds.map((id) => (
                  <Avatar key={id} player={pMap[id]} size={30} ring="#141416" />
                ))}
              </div>
              <span className="text-sm text-white/80">
                {u.playerIds.map((id) => pMap[id]?.nickname).join(' & ')}
              </span>
              <span className="ml-auto text-[10px] text-white/30">
                {u.playerIds.length === 2 ? 'pair' : 'solo'}
              </span>
            </div>
          ))}
        </div>
      </Section>

      {/* Paid list */}
      <Section title={`Paid list (${paid.length})`}>
        <div className="space-y-1.5">
          {paid.map((r) => (
            <div key={r.playerId} className="flex items-center gap-3 rounded-xl bg-white/[0.03] p-2">
              <Avatar player={pMap[r.playerId]} size={30} />
              <span className="text-sm text-white/80">{pMap[r.playerId]?.name}</span>
              <span className="ml-auto text-xs text-emerald-300">
                {zar(night?.entryCents ?? 5500)} · {r.provider ?? 'yoco'}
              </span>
            </div>
          ))}
        </div>
      </Section>
    </div>
  );
}

function OverrideRow({
  teamA,
  teamB,
  court,
  onSave,
}: {
  teamA: string;
  teamB: string;
  court: number;
  onSave: (a: number, b: number) => void;
}) {
  const [a, setA] = useState(11);
  const [b, setB] = useState(9);
  return (
    <div className="rounded-xl bg-white/[0.03] p-3">
      <p className="mb-2 text-[10px] uppercase tracking-wider text-white/30">Court {court}</p>
      <div className="flex items-center gap-2">
        <span className="min-w-0 flex-1 truncate text-sm text-white">{teamA}</span>
        <input
          type="number"
          value={a}
          onChange={(e) => setA(+e.target.value)}
          className="h-9 w-12 rounded-lg bg-white/[0.06] text-center text-white outline-none"
        />
        <span className="text-white/30">–</span>
        <input
          type="number"
          value={b}
          onChange={(e) => setB(+e.target.value)}
          className="h-9 w-12 rounded-lg bg-white/[0.06] text-center text-white outline-none"
        />
        <span className="min-w-0 flex-1 truncate text-right text-sm text-white">{teamB}</span>
      </div>
      <Button
        variant="ghost"
        className="mt-2 h-9 w-full !text-xs"
        disabled={a === b}
        onClick={() => onSave(a, b)}
      >
        Save result
      </Button>
    </div>
  );
}

function Kpi({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="glass rounded-xl p-3 text-center">
      <p className="font-display text-2xl font-bold text-lime">{value}</p>
      <p className="text-[10px] text-white/40">{label}</p>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-5">
      <h2 className="mb-2 text-sm font-semibold text-white/70">{title}</h2>
      {children}
    </section>
  );
}

function Empty({ text }: { text: string }) {
  return <p className="rounded-xl bg-white/[0.02] py-4 text-center text-sm text-white/30">{text}</p>;
}
