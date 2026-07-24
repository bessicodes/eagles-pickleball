'use client';

import { useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { useStore, currentUser, playersMap, board } from '@/lib/store';
import { Avatar, Button, Card, Eyebrow, Sheet, SkillChip } from './ui';
import {
  ACCENTS,
  ago,
  cn,
  fileToSquareDataUrl,
  haptic,
  tierFor,
  zar,
} from '@/lib/utils';
import type { Match, Player, SkillLevel } from '@/lib/types';

export default function ProfileTab() {
  const me = useStore(currentUser);
  const pMap = useStore(playersMap);
  const matches = useStore((s) => s.matches);
  const registrations = useStore((s) => s.registrations);
  const nights = useStore((s) => s.nights);
  const allTime = useStore((s) => board(s, 'alltime'));
  const signOut = useStore((s) => s.signOut);

  const [editing, setEditing] = useState(false);

  const myMatches = useMemo(
    () =>
      matches
        .filter((m) => m.status === 'completed' && me && [...m.teamA, ...m.teamB].includes(me.id))
        .sort((a, b) => (b.completedAt ?? 0) - (a.completedAt ?? 0)),
    [matches, me]
  );

  if (!me) return null;

  const myRank = allTime.find((r) => r.isUser)?.rank ?? null;
  const games = me.wins + me.losses;
  const winRate = games > 0 ? Math.round((me.wins / games) * 100) : 0;
  const tier = tierFor(me.points);

  // Form guide — last 5 results (most recent first).
  const form = myMatches.slice(0, 5).map((m) => {
    const onA = m.teamA.includes(me.id);
    const mine = onA ? m.scoreA ?? 0 : m.scoreB ?? 0;
    const opp = onA ? m.scoreB ?? 0 : m.scoreA ?? 0;
    return mine > opp ? 'W' : 'L';
  });

  // Favourite partner — most-played-with teammate.
  const favPartner = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const m of myMatches) {
      const team = m.teamA.includes(me.id) ? m.teamA : m.teamB;
      for (const id of team) if (id !== me.id) counts[id] = (counts[id] ?? 0) + 1;
    }
    const top = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
    return top ? { player: pMap[top[0]], games: top[1] } : null;
  }, [myMatches, me.id, pMap]);

  const bigWin = myMatches.some((m) => {
    const onA = m.teamA.includes(me.id);
    const mine = onA ? m.scoreA ?? 0 : m.scoreB ?? 0;
    const opp = onA ? m.scoreB ?? 0 : m.scoreA ?? 0;
    return mine - opp >= 8;
  });

  const achievements = [
    { id: 'debut', label: 'Debut', hint: 'Play your first game', earned: games >= 1 },
    { id: 'firstwin', label: 'First Win', hint: 'Win a game', earned: me.wins >= 1 },
    { id: 'streak', label: 'On Fire', hint: '3-win streak', earned: (me.bestStreak ?? 0) >= 3 },
    { id: 'blowout', label: 'Blowout', hint: 'Win by 8+', earned: bigWin },
    { id: 'century', label: 'Centurion', hint: '100 career points', earned: me.points >= 100 },
    { id: 'podium', label: 'Podium', hint: 'Top 3 all-time', earned: !!myRank && myRank <= 3 },
  ];

  const myPayments = registrations
    .filter((r) => r.playerId === me.id && r.paid)
    .sort((a, b) => (b.paidAt ?? 0) - (a.paidAt ?? 0));

  return (
    <div className="space-y-4 pb-2">
      {/* ── Hero ── */}
      <Card className="relative overflow-hidden p-5">
        <div
          className="pointer-events-none absolute -right-10 -top-10 h-44 w-44 rounded-full blur-3xl"
          style={{ background: `radial-gradient(circle, ${accentTint(me)}, transparent 70%)` }}
        />
        <div className="relative flex items-center gap-4">
          <div className="relative">
            <Avatar player={me} size={76} ring={me.accent ?? '#D6FF00'} />
            <button
              onClick={() => setEditing(true)}
              aria-label="Edit profile"
              className="absolute -bottom-1 -right-1 grid h-7 w-7 place-items-center rounded-full border-2 border-char bg-white/10 text-white backdrop-blur"
            >
              <PencilIcon />
            </button>
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h1 className="font-display truncate text-2xl font-semibold tracking-tight text-white">
                {me.nickname}
              </h1>
              {me.streak >= 2 && (
                <span className="shrink-0 rounded-pill bg-orange-500/15 px-2 py-0.5 text-xs font-semibold text-orange-300">
                  🔥 {me.streak}
                </span>
              )}
            </div>
            <p className="truncate text-sm text-white/45">{me.name}</p>
            <div className="mt-1.5 flex flex-wrap items-center gap-2">
              <SkillChip skill={me.skill} />
              <span
                className="rounded-pill px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide"
                style={{ background: `${tier.color}22`, color: tier.color }}
              >
                {tier.name}
              </span>
              {myRank && <span className="text-xs text-white/40">#{myRank} all-time</span>}
            </div>
          </div>
        </div>

        {/* tier progress */}
        <div className="relative mt-5">
          <div className="mb-1.5 flex items-center justify-between text-xs">
            <span className="font-semibold" style={{ color: tier.color }}>
              {tier.name}
            </span>
            <span className="text-white/40">
              {tier.next ? `${tier.toNext} pts to ${tier.next.name}` : 'Top tier'}
            </span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-white/[0.06]">
            <motion.div
              className="h-full rounded-full"
              style={{ background: tier.color }}
              initial={{ width: 0 }}
              animate={{ width: `${Math.round(tier.progress * 100)}%` }}
              transition={{ type: 'spring', stiffness: 120, damping: 20 }}
            />
          </div>
        </div>

        {/* stats */}
        <div className="relative mt-5 grid grid-cols-4 gap-2">
          <Stat value={me.rating} label="Rating" accent />
          <Stat value={`${me.wins}-${me.losses}`} label="W–L" />
          <Stat value={`${winRate}%`} label="Win rate" />
          <Stat value={me.bestStreak ?? 0} label="Best streak" />
        </div>
      </Card>

      {/* ── Form ── */}
      <Card className="p-4">
        <div className="flex items-center justify-between">
          <Eyebrow>Recent form</Eyebrow>
          {favPartner && (
            <span className="flex items-center gap-1.5 text-xs text-white/40">
              <Avatar player={favPartner.player} size={18} />
              {favPartner.player?.nickname} · {favPartner.games} games
            </span>
          )}
        </div>
        {form.length === 0 ? (
          <p className="mt-3 text-sm text-white/35">No games yet — your last 5 results show here.</p>
        ) : (
          <div className="mt-3 flex gap-1.5">
            {form.map((r, i) => (
              <span
                key={i}
                className={cn(
                  'grid h-9 w-9 place-items-center rounded-xl text-sm font-bold',
                  r === 'W' ? 'bg-lime/15 text-lime' : 'bg-white/[0.05] text-white/40'
                )}
              >
                {r}
              </span>
            ))}
          </div>
        )}
      </Card>

      {/* ── Achievements ── */}
      <div>
        <Eyebrow>Achievements</Eyebrow>
        <div className="mt-2 grid grid-cols-3 gap-2">
          {achievements.map((a) => (
            <div
              key={a.id}
              className={cn(
                'rounded-2xl border p-3 text-center',
                a.earned
                  ? 'border-lime/30 bg-lime/[0.06]'
                  : 'border-white/[0.06] bg-white/[0.02] opacity-55'
              )}
            >
              <div
                className={cn(
                  'mx-auto grid h-8 w-8 place-items-center rounded-full',
                  a.earned ? 'bg-lime/15' : 'bg-white/[0.05]'
                )}
              >
                <BadgeIcon earned={a.earned} />
              </div>
              <p className={cn('mt-1.5 text-[11px] font-semibold', a.earned ? 'text-white' : 'text-white/50')}>
                {a.label}
              </p>
              <p className="text-[9px] leading-tight text-white/35">{a.hint}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── Match history ── */}
      <div>
        <Eyebrow>Match history</Eyebrow>
        <div className="mt-2 space-y-1.5">
          {myMatches.length === 0 ? (
            <Card className="flex flex-col items-center py-8">
              <span className="text-2xl">🎾</span>
              <p className="mt-2 text-sm text-white/40">No games yet — join tonight&apos;s league.</p>
            </Card>
          ) : (
            myMatches.slice(0, 10).map((m) => {
              const onA = m.teamA.includes(me.id);
              const mine = onA ? m.scoreA ?? 0 : m.scoreB ?? 0;
              const opp = onA ? m.scoreB ?? 0 : m.scoreA ?? 0;
              const won = mine > opp;
              const oppTeam = (onA ? m.teamB : m.teamA).map((id) => pMap[id]?.nickname).join(' & ');
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
                    {mine}
                    <span className="text-white/30">–</span>
                    {opp}
                  </span>
                </Card>
              );
            })
          )}
        </div>
      </div>

      {/* ── Payments ── */}
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
                    <p className="text-sm font-semibold text-white">{night?.label ?? 'League night'}</p>
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
        Eagles Pickleball · Northcliff
      </p>

      <EditProfileSheet open={editing} onClose={() => setEditing(false)} me={me} />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────
function EditProfileSheet({ open, onClose, me }: { open: boolean; onClose: () => void; me: Player }) {
  const updateProfile = useStore((s) => s.updateProfile);
  const [name, setName] = useState(me.name);
  const [nickname, setNickname] = useState(me.nickname);
  const [skill, setSkill] = useState<SkillLevel>(me.skill);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(me.avatarUrl ?? null);
  const [accent, setAccent] = useState<string>(me.accent ?? ACCENTS[0]);
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setBusy(true);
    try {
      setAvatarUrl(await fileToSquareDataUrl(file));
      haptic(12);
    } catch {
      /* ignore */
    } finally {
      setBusy(false);
    }
  }

  function save() {
    haptic([15, 25]);
    updateProfile({
      name: name.trim() || me.name,
      nickname: nickname.trim() || name.trim().split(' ')[0] || me.nickname,
      skill,
      avatarUrl,
      accent,
    });
    onClose();
  }

  const preview = { id: me.id, name: name || me.name, avatarUrl, accent };

  return (
    <Sheet open={open} onClose={onClose} title="Edit your card">
      <div className="flex flex-col items-center">
        <button onClick={() => fileRef.current?.click()} className="relative active:scale-95" aria-label="Change photo">
          <Avatar player={preview} size={96} ring={accent} />
          <span
            className="absolute -bottom-1 -right-1 grid h-8 w-8 place-items-center rounded-full border-2 border-char text-ink"
            style={{ background: accent }}
          >
            {busy ? <MiniSpinner /> : <CameraIcon />}
          </span>
        </button>
        <input ref={fileRef} type="file" accept="image/*" hidden onChange={onFile} />
        <div className="mt-2 flex items-center gap-3">
          <button onClick={() => fileRef.current?.click()} className="text-sm font-semibold text-lime">
            {avatarUrl ? 'Change photo' : 'Add a photo'}
          </button>
          {avatarUrl && (
            <button onClick={() => setAvatarUrl(null)} className="text-sm font-medium text-white/40">
              Remove
            </button>
          )}
        </div>
      </div>

      <div className="mt-5">
        <span className="mb-2 block text-xs font-medium text-white/45">Accent colour</span>
        <div className="flex flex-wrap gap-2.5">
          {ACCENTS.map((c) => (
            <button
              key={c}
              onClick={() => setAccent(c)}
              aria-label={`Accent ${c}`}
              className={cn(
                'h-8 w-8 rounded-full transition-transform active:scale-90',
                accent === c ? 'ring-2 ring-white ring-offset-2 ring-offset-char' : ''
              )}
              style={{ background: c }}
            />
          ))}
        </div>
      </div>

      <div className="mt-5 space-y-3">
        <EditField label="Full name">
          <input value={name} onChange={(e) => setName(e.target.value)} className="ob-input" />
        </EditField>
        <EditField label="Nickname">
          <input value={nickname} onChange={(e) => setNickname(e.target.value)} className="ob-input" />
        </EditField>
        <EditField label="Skill level">
          <div className="grid grid-cols-3 gap-2">
            {(['Beginner', 'Intermediate', 'Advanced'] as SkillLevel[]).map((s) => (
              <button
                key={s}
                onClick={() => setSkill(s)}
                className={cn(
                  'rounded-2xl border py-3 text-xs font-semibold transition-colors',
                  skill === s
                    ? 'border-lime bg-lime/10 text-lime'
                    : 'border-white/10 bg-white/[0.03] text-white/50'
                )}
              >
                {s}
              </button>
            ))}
          </div>
        </EditField>
      </div>

      <Button className="mt-5 w-full" onClick={save}>
        Save changes
      </Button>
    </Sheet>
  );
}

function Stat({ value, label, accent }: { value: string | number; label: string; accent?: boolean }) {
  return (
    <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] px-2 py-3 text-center">
      <p className={cn('font-display text-xl font-bold tabular', accent ? 'text-lime' : 'text-white')}>
        {value}
      </p>
      <p className="mt-0.5 text-[10px] text-white/40">{label}</p>
    </div>
  );
}

function EditField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-medium text-white/45">{label}</span>
      {children}
    </label>
  );
}

function accentTint(p: Player): string {
  const c = p.accent ?? '#D6FF00';
  return `${c}2e`;
}

const PencilIcon = () => (
  <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth={2}>
    <path d="M4 20h4L18 10l-4-4L4 16v4z" strokeLinejoin="round" />
    <path d="M14 6l4 4" />
  </svg>
);
const CameraIcon = () => (
  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2}>
    <path d="M4 8h3l1.5-2h7L17 8h3v11H4z" strokeLinejoin="round" />
    <circle cx="12" cy="13" r="3.2" />
  </svg>
);
const MiniSpinner = () => (
  <svg viewBox="0 0 24 24" className="h-4 w-4 animate-spin" fill="none" stroke="currentColor" strokeWidth={2.5}>
    <path d="M12 3a9 9 0 1 0 9 9" strokeLinecap="round" />
  </svg>
);
const BadgeIcon = ({ earned }: { earned: boolean }) => (
  <svg
    viewBox="0 0 24 24"
    className={cn('h-4 w-4', earned ? 'text-lime' : 'text-white/40')}
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
  >
    {earned ? (
      <path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
    ) : (
      <>
        <circle cx="12" cy="12" r="8" />
        <path d="M12 8v4l2 2" strokeLinecap="round" />
      </>
    )}
  </svg>
);
