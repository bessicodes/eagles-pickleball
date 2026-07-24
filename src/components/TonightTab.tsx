'use client';

import { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  useStore,
  playersMap,
  currentUser,
  queueUnits,
  userRegistration,
  userLiveMatch,
  nightCounts,
} from '@/lib/store';
import type { LeagueNight, Player } from '@/lib/types';
import { Avatar, Button, Card, Eyebrow, LiveDot, Sheet, SkillChip } from './ui';
import { cn, haptic, zar } from '@/lib/utils';

export default function TonightTab() {
  const nights = useStore((s) => s.nights);
  const simNightId = useStore((s) => s.simNightId);
  const me = useStore(currentUser);
  const pMap = useStore(playersMap);

  const joinNight = useStore((s) => s.joinNight);
  const setPartnerRequest = useStore((s) => s.setPartnerRequest);
  const clearPartnerRequest = useStore((s) => s.clearPartnerRequest);
  const pay = useStore((s) => s.pay);

  // Which night the user is registered/paid on (if any).
  const registrations = useStore((s) => s.registrations);
  const myPaidNight = registrations.find(
    (r) => r.playerId === me?.id && r.paid && r.checkedIn
  );

  // Flow state
  const [selectedNight, setSelectedNight] = useState<LeagueNight | null>(null);
  const [partnerOpen, setPartnerOpen] = useState(false);
  const [payOpen, setPayOpen] = useState(false);
  const [requested, setRequested] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  function openJoin(night: LeagueNight) {
    haptic(12);
    joinNight(night.id);
    setSelectedNight(night);
    setRequested(null);
    setSearch('');
    setPartnerOpen(true);
  }

  function confirmPartner() {
    if (!selectedNight) return;
    setPartnerRequest(selectedNight.id, {
      requestedPartnerId: requested,
      anyPartner: !requested,
    });
    setPartnerOpen(false);
    setTimeout(() => setPayOpen(true), 180);
  }

  const livePlayerIds = useStore((s) =>
    new Set(
      s.matches.filter((m) => m.status === 'live').flatMap((m) => [...m.teamA, ...m.teamB])
    )
  );

  // Players checked-in tonight (candidate partners). Available players (in the
  // queue) surface first so the obvious pick pairs you up instantly.
  const candidates = useMemo(() => {
    const checkedIn = registrations
      .filter((r) => r.nightId === simNightId && r.checkedIn && r.playerId !== me?.id)
      .map((r) => pMap[r.playerId])
      .filter(Boolean) as Player[];
    const q = search.trim().toLowerCase();
    const filtered = q
      ? checkedIn.filter(
          (p) => p.name.toLowerCase().includes(q) || p.nickname.toLowerCase().includes(q)
        )
      : checkedIn;
    return filtered.sort((a, b) => {
      const pa = livePlayerIds.has(a.id) ? 1 : 0;
      const pb = livePlayerIds.has(b.id) ? 1 : 0;
      return pa - pb || b.rating - a.rating;
    });
  }, [registrations, simNightId, me?.id, pMap, search, livePlayerIds]);

  return (
    <div className="space-y-4">
      {/* Registered → status + live queue. Otherwise → league cards. */}
      {myPaidNight ? (
        <StatusAndQueue nightId={myPaidNight.nightId} />
      ) : (
        <>
          <div>
            <Eyebrow live>Tonight at Northcliff</Eyebrow>
            <h1 className="font-display mt-1 text-3xl font-semibold tracking-tightest text-white">
              Pick your night
            </h1>
          </div>
          {nights.map((night, i) => (
            <NightCard key={night.id} night={night} delay={i * 0.05} onJoin={() => openJoin(night)} />
          ))}
        </>
      )}

      {/* ── Partner request sheet ── */}
      <Sheet
        open={partnerOpen}
        onClose={() => {
          setPartnerOpen(false);
          if (selectedNight) clearPartnerRequest(selectedNight.id);
          setRequested(null);
        }}
        title="Choose your partner"
      >
        <button
          onClick={() => setRequested(null)}
          className={cn(
            'mb-3 flex w-full items-center gap-3 rounded-xl border p-3 text-left transition-colors',
            requested === null ? 'border-lime bg-lime/10' : 'border-white/10 bg-white/[0.03]'
          )}
        >
          <div className="grid h-11 w-11 place-items-center rounded-full bg-lime/15 text-xl">🎲</div>
          <div className="flex-1">
            <p className="font-semibold text-white">Any partner</p>
            <p className="text-xs text-white/45">We&apos;ll pair you with the next player up.</p>
          </div>
          {requested === null && <Check />}
        </button>

        <div className="mb-2 flex items-center gap-2 rounded-xl bg-white/[0.05] px-3">
          <SearchIcon />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search players…"
            className="h-11 flex-1 bg-transparent text-sm text-white outline-none placeholder:text-white/30"
          />
        </div>

        <div className="space-y-1.5">
          {candidates.length === 0 && (
            <p className="py-6 text-center text-sm text-white/35">No players match “{search}”.</p>
          )}
          {candidates.map((p) => {
            const playing = livePlayerIds.has(p.id);
            const active = requested === p.id;
            return (
              <button
                key={p.id}
                onClick={() => {
                  haptic(8);
                  setRequested(active ? null : p.id);
                }}
                className={cn(
                  'flex w-full items-center gap-3 rounded-xl border p-2.5 text-left transition-colors',
                  active ? 'border-violet bg-violet/10' : 'border-white/[0.06] bg-white/[0.02]'
                )}
              >
                <Avatar player={p} size={44} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate font-semibold text-white">{p.nickname}</p>
                    <SkillChip skill={p.skill} />
                  </div>
                  <p className="truncate text-xs text-white/40">
                    {p.name} · {p.rating} pts
                  </p>
                </div>
                <span
                  className={cn(
                    'shrink-0 rounded-md px-2 py-1 text-[10px] font-semibold',
                    playing ? 'bg-white/[0.06] text-white/45' : 'bg-lime/10 text-lime'
                  )}
                >
                  {playing ? 'Playing' : 'In queue'}
                </span>
                {active && <Check violet />}
              </button>
            );
          })}
        </div>

        <div className="sticky bottom-0 -mx-1 mt-3 bg-gradient-to-t from-black/40 to-transparent pt-3">
          <Button
            className="w-full"
            variant={requested ? 'violet' : 'lime'}
            onClick={confirmPartner}
          >
            {requested ? `Request ${pMap[requested]?.nickname} & pay` : 'Continue with any partner'}
          </Button>
        </div>
      </Sheet>

      {/* ── Payment sheet ── */}
      {selectedNight && (
        <PaymentSheet
          open={payOpen}
          night={selectedNight}
          onClose={() => {
            setPayOpen(false);
            clearPartnerRequest(selectedNight.id);
          }}
          partner={requested ? pMap[requested] : null}
          onPaid={(provider) => {
            pay(selectedNight.id, provider);
            setPayOpen(false);
          }}
        />
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────
function NightCard({
  night,
  onJoin,
  delay,
}: {
  night: LeagueNight;
  onJoin: () => void;
  delay: number;
}) {
  const counts = useStore((s) => nightCounts(s, night.id));
  return (
    <Card className="overflow-hidden p-0" transition={{ delay, type: 'spring', stiffness: 320, damping: 30 }}>
      <div className="relative p-5">
        <div className="absolute right-4 top-4 rounded-md bg-lime px-3 py-1 text-sm font-bold text-ink">
          {zar(night.entryCents)}
        </div>
        <p className="eyebrow">{night.dateLabel}</p>
        <h2 className="font-display mt-1 text-2xl font-semibold text-white">{night.label}</h2>
        <div className="mt-1 flex items-center gap-2 text-white/50">
          <ClockIcon />
          <span className="text-sm">Starts {night.time}</span>
        </div>

        <div className="mt-4 flex items-center gap-4">
          <div className="flex items-center gap-2">
            <LiveDot />
            <span className="text-sm font-semibold text-white">{counts.players}</span>
            <span className="text-sm text-white/45">playing</span>
          </div>
          <div className="h-4 w-px bg-white/10" />
          <span className="text-sm text-white/45">
            <span className="font-semibold text-white">{counts.spotsLeft}</span> spots left
          </span>
        </div>
      </div>
      <button
        onClick={onJoin}
        className="flex w-full items-center justify-between border-t border-white/[0.06] bg-lime px-5 py-4 active:opacity-90"
      >
        <span className="font-bold text-ink">Join &amp; pay {zar(night.entryCents)}</span>
        <span className="text-ink">→</span>
      </button>
    </Card>
  );
}

// ─────────────────────────────────────────────────────────────────────
function PaymentSheet({
  open,
  onClose,
  night,
  partner,
  onPaid,
}: {
  open: boolean;
  onClose: () => void;
  night: LeagueNight;
  partner: Player | null;
  onPaid: (provider: 'yoco' | 'paystack') => void;
}) {
  const [provider, setProvider] = useState<'yoco' | 'paystack'>('yoco');
  const [status, setStatus] = useState<'idle' | 'processing' | 'done'>('idle');

  function payNow() {
    setStatus('processing');
    haptic(20);
    // Simulate the real gateway round-trip (1.5s) then success.
    setTimeout(() => {
      setStatus('done');
      haptic([30, 40, 60]);
      setTimeout(() => {
        onPaid(provider);
        setStatus('idle');
      }, 900);
    }, 1500);
  }

  return (
    <Sheet open={open} onClose={status === 'idle' ? onClose : () => {}} title="Checkout">
      <div>
        {status === 'done' ? (
          <motion.div
            key="done"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center py-8"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 300, damping: 15 }}
              className="grid h-20 w-20 place-items-center rounded-full bg-lime text-4xl text-ink"
            >
              ✓
            </motion.div>
            <p className="font-display mt-4 text-xl font-semibold text-white">You&apos;re paid in!</p>
            <p className="text-sm text-white/45">Checking you into the queue…</p>
          </motion.div>
        ) : (
          <motion.div key="form" exit={{ opacity: 0 }}>
            {/* order summary */}
            <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
              <Row label={night.label} value={zar(night.entryCents)} />
              <Row label={`${night.dateLabel} · ${night.time}`} muted />
              {partner ? (
                <Row label={`Partner · ${partner.nickname}`} value="🔒 locked" violet />
              ) : (
                <Row label="Partner" value="Any (auto)" muted />
              )}
              <div className="my-3 h-px bg-white/[0.06]" />
              <Row label="Total" value={zar(night.entryCents)} bold />
            </div>

            {/* provider */}
            <p className="mb-2 mt-4 text-xs font-medium text-white/45">Pay with</p>
            <div className="grid grid-cols-2 gap-2">
              {(['yoco', 'paystack'] as const).map((pr) => (
                <button
                  key={pr}
                  onClick={() => setProvider(pr)}
                  className={cn(
                    'rounded-xl border py-3.5 text-sm font-semibold capitalize transition-colors',
                    provider === pr
                      ? 'border-lime bg-lime/10 text-lime'
                      : 'border-white/10 bg-white/[0.03] text-white/55'
                  )}
                >
                  {pr}
                </button>
              ))}
            </div>

            <p className="mt-3 flex items-center gap-1.5 text-xs text-white/30">
              <LockIcon /> Simulated gateway · wire real Yoco later (see README).
            </p>

            <Button
              className="mt-4 w-full"
              disabled={status === 'processing'}
              onClick={payNow}
            >
              {status === 'processing' ? (
                <span className="flex items-center gap-2">
                  <Spinner /> Processing…
                </span>
              ) : (
                `Pay ${zar(night.entryCents)}`
              )}
            </Button>
          </motion.div>
        )}
      </div>
    </Sheet>
  );
}

// ─────────────────────────────────────────────────────────────────────
function StatusAndQueue({ nightId }: { nightId: string }) {
  const me = useStore(currentUser);
  const pMap = useStore(playersMap);
  const units = useStore(queueUnits);
  const myMatch = useStore(userLiveMatch);
  const viewPlayer = useStore((s) => s.viewPlayer);
  const reg = useStore((s) => userRegistration(s, nightId));
  const partnerId = reg?.partnerId ?? null;

  const myUnitIndex = units.findIndex((u) => me && u.playerIds.includes(me.id));
  const position = myUnitIndex >= 0 ? myUnitIndex + 1 : null;
  const eta = position ? Math.max(1, Math.round((position / 4) * 6)) : null;

  return (
    <div className="space-y-4">
      {/* My status card */}
      <Card className="p-5">
        <div className="flex items-center justify-between">
          <Eyebrow live>My status</Eyebrow>
          <span className="rounded-md bg-lime/12 px-2.5 py-1 text-xs font-semibold text-lime">
            ✓ Checked in
          </span>
        </div>

        {myMatch ? (
          <div className="mt-3">
            <p className="font-display text-2xl font-semibold text-lime">You&apos;re playing!</p>
            <p className="text-sm text-white/55">Head to Court {myMatch.courtId} — good luck 🎾</p>
          </div>
        ) : (
          <div className="mt-3 flex items-end gap-6">
            <div>
              <p className="font-serif-display text-5xl leading-none text-white tabular">
                #{position ?? '—'}
              </p>
              <p className="mt-1 text-xs text-white/45">in the queue</p>
            </div>
            <div className="pb-1">
              <p className="text-sm text-white/45">Est. wait</p>
              <p className="font-display text-xl font-semibold text-white">
                ~{eta ?? 0} min
              </p>
            </div>
          </div>
        )}

        <div className="mt-4 flex items-center gap-2 rounded-xl border border-white/[0.06] bg-white/[0.02] p-3">
          {partnerId ? (
            <>
              <Avatar player={pMap[partnerId]} size={36} />
              <div className="flex-1">
                <p className="text-sm font-semibold text-white">{pMap[partnerId]?.nickname}</p>
                <p className="text-xs text-violet">🔒 Locked partner</p>
              </div>
            </>
          ) : (
            <>
              <div className="grid h-9 w-9 place-items-center rounded-full bg-white/[0.05] text-base">
                🎲
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-white">Any partner</p>
                <p className="text-xs text-white/40">Paired with the next player up</p>
              </div>
            </>
          )}
        </div>
      </Card>

      {/* Live queue */}
      <div>
        <div className="mb-2 flex items-center justify-between px-1">
          <Eyebrow live>Live queue</Eyebrow>
          <span className="text-xs text-white/40">{units.length} up next</span>
        </div>

        {units.length === 0 ? (
          <Card className="flex flex-col items-center py-10">
            <span className="text-3xl">🏓</span>
            <p className="mt-2 text-sm text-white/45">Queue is clear — everyone&apos;s on court.</p>
          </Card>
        ) : (
          <div className="space-y-1.5">
            <AnimatePresence initial={false}>
              {units.map((u, i) => {
                const mine = me && u.playerIds.includes(me.id);
                return (
                  <motion.div
                    key={u.id}
                    layout
                    initial={{ opacity: 0, x: -12 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 12 }}
                    className={cn(
                      'flex items-center gap-3 rounded-xl border p-2.5',
                      mine ? 'border-lime/50 bg-lime/[0.06]' : 'border-white/[0.06] bg-white/[0.02]'
                    )}
                  >
                    <span
                      className={cn(
                        'grid h-7 w-7 shrink-0 place-items-center rounded-full text-xs font-bold',
                        mine ? 'bg-lime text-ink' : 'bg-white/[0.06] text-white/50'
                      )}
                    >
                      {i + 1}
                    </span>
                    <div className="flex -space-x-2">
                      {u.playerIds.map((id) => (
                        <button
                          key={id}
                          onClick={() => {
                            haptic(6);
                            viewPlayer(id);
                          }}
                          className="active:scale-90 transition-transform"
                          aria-label={`View ${pMap[id]?.nickname}`}
                        >
                          <Avatar player={pMap[id]} size={34} ring="#141416" />
                        </button>
                      ))}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-white">
                        {u.playerIds.map((id) => pMap[id]?.nickname).join(' & ')}
                        {mine && <span className="text-lime"> · you</span>}
                      </p>
                      <p className="text-xs text-white/40">
                        {u.playerIds.length === 2 ? 'Locked team' : 'Solo — needs a partner'}
                      </p>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
}

// ── little bits ──────────────────────────────────────────────────────
function Row({
  label,
  value,
  muted,
  bold,
  violet,
}: {
  label: string;
  value?: string;
  muted?: boolean;
  bold?: boolean;
  violet?: boolean;
}) {
  return (
    <div className="flex items-center justify-between py-1">
      <span className={cn('text-sm', muted ? 'text-white/35' : 'text-white/70')}>{label}</span>
      {value && (
        <span
          className={cn(
            'text-sm',
            bold ? 'font-bold text-white' : violet ? 'font-semibold text-violet' : 'text-white/80'
          )}
        >
          {value}
        </span>
      )}
    </div>
  );
}

const Check = ({ violet }: { violet?: boolean }) => (
  <span
    className={cn(
      'grid h-6 w-6 shrink-0 place-items-center rounded-full text-xs',
      violet ? 'bg-violet text-white' : 'bg-lime text-ink'
    )}
  >
    ✓
  </span>
);
const ClockIcon = () => (
  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7v5l3 2" strokeLinecap="round" />
  </svg>
);
const SearchIcon = () => (
  <svg viewBox="0 0 24 24" className="h-4 w-4 text-white/35" fill="none" stroke="currentColor" strokeWidth={2}>
    <circle cx="11" cy="11" r="7" />
    <path d="m20 20-3-3" strokeLinecap="round" />
  </svg>
);
const LockIcon = () => (
  <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth={2}>
    <rect x="5" y="11" width="14" height="9" rx="2" />
    <path d="M8 11V8a4 4 0 0 1 8 0v3" />
  </svg>
);
const Spinner = () => (
  <svg viewBox="0 0 24 24" className="h-4 w-4 animate-spin" fill="none" stroke="currentColor" strokeWidth={2.5}>
    <path d="M12 3a9 9 0 1 0 9 9" strokeLinecap="round" />
  </svg>
);
