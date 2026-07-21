'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useStore, currentUser } from '@/lib/store';
import { randInt, haptic } from '@/lib/utils';
import type { TabKey } from '@/lib/types';
import Background from '@/components/Background';
import BottomNav from '@/components/BottomNav';
import Onboarding from '@/components/Onboarding';
import TonightTab from '@/components/TonightTab';
import CourtsTab from '@/components/CourtsTab';
import LeaderboardTab from '@/components/LeaderboardTab';
import ProfileTab from '@/components/ProfileTab';
import YoureUpOverlay from '@/components/YoureUpOverlay';
import { Avatar } from '@/components/ui';

export default function Page() {
  const [mounted, setMounted] = useState(false);
  const [tab, setTab] = useState<TabKey>('tonight');
  const userId = useStore((s) => s.currentUserId);
  const me = useStore(currentUser);

  // ── Boot: hydrate store + register the service worker ──
  useEffect(() => {
    useStore.getState().hydrate();
    setMounted(true);
    // Register the offline SW only in production — in dev it would cache
    // and serve stale chunks, breaking Fast Refresh.
    if (process.env.NODE_ENV === 'production' && 'serviceWorker' in navigator) {
      const bp = process.env.NEXT_PUBLIC_BASE_PATH || '';
      navigator.serviceWorker.register(`${bp}/sw.js`, { scope: `${bp}/` }).catch(() => {});
    }
  }, []);

  // ── Engine loops ──
  useEffect(() => {
    if (!mounted) return;

    // Matchmaking: fill free courts as players become available.
    const mm = setInterval(() => useStore.getState().runMatchmaking(), 1500);

    // Ambient sim: other players' matches finish every 25–45s.
    let simTimer: ReturnType<typeof setTimeout>;
    const scheduleSim = () => {
      simTimer = setTimeout(() => {
        useStore.getState().simulateFinish();
        scheduleSim();
      }, randInt(25000, 45000));
    };
    scheduleSim();

    // Responsiveness guard: never leave the current user waiting long.
    const guard = setInterval(() => useStore.getState().tickAssist(), 4000);

    return () => {
      clearInterval(mm);
      clearTimeout(simTimer);
      clearInterval(guard);
    };
  }, [mounted]);

  // ── Confetti + haptics when the user wins ──
  const celebrate = useStore((s) => s.celebrate);
  const clearCelebrate = useStore((s) => s.clearCelebrate);
  useEffect(() => {
    if (!celebrate) return;
    if (celebrate.won) {
      haptic([0, 40, 40, 40, 40, 120]);
      import('canvas-confetti').then(({ default: confetti }) => {
        const shoot = (particleRatio: number, opts: Record<string, unknown>) =>
          confetti({
            origin: { y: 0.7 },
            colors: ['#D6FF00', '#8A5CFF', '#ffffff'],
            particleCount: Math.floor(200 * particleRatio),
            ...opts,
          });
        shoot(0.25, { spread: 26, startVelocity: 55 });
        shoot(0.2, { spread: 60 });
        shoot(0.35, { spread: 100, decay: 0.91, scalar: 0.8 });
        shoot(0.1, { spread: 120, startVelocity: 25, decay: 0.92, scalar: 1.2 });
      });
    }
    const t = setTimeout(clearCelebrate, 1600);
    return () => clearTimeout(t);
  }, [celebrate, clearCelebrate]);

  // ── Splash until client store is ready (avoids hydration flash) ──
  if (!mounted) return <Splash />;

  if (!userId || !me) {
    return (
      <>
        <Background />
        <Onboarding />
      </>
    );
  }

  return (
    <>
      <Background />
      <div className="mx-auto flex min-h-dvh w-full max-w-app flex-col">
        {/* Passive top bar — no primary actions up here (thumb-reach rule). */}
        <header className="pt-safe sticky top-0 z-30">
          <div className="flex items-center justify-between px-5 py-3">
            <div className="flex items-center gap-3">
              <Avatar player={me} size={40} ring="rgba(214,255,0,0.5)" />
              <div>
                <p className="text-xs text-white/40">{greeting()}</p>
                <p className="font-display text-base font-semibold leading-tight text-white">
                  {me.nickname}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {me.streak >= 2 && (
                <span className="rounded-pill bg-orange-500/15 px-2.5 py-1 text-xs font-semibold text-orange-300">
                  🔥 {me.streak}
                </span>
              )}
              <span className="rounded-pill bg-white/[0.05] px-3 py-1 text-xs font-semibold text-white">
                {me.points} <span className="text-white/40">pts</span>
              </span>
            </div>
          </div>
        </header>

        {/* Tab content */}
        <main className="flex-1 px-4 pb-32">
          <motion.div
            key={tab}
            initial={{ opacity: 0, x: 16 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.18 }}
            className="h-full"
          >
            {tab === 'tonight' && <TonightTab />}
            {tab === 'courts' && <CourtsTab />}
            {tab === 'leaderboard' && <LeaderboardTab />}
            {tab === 'profile' && <ProfileTab />}
          </motion.div>
        </main>
      </div>

      <BottomNav active={tab} onChange={setTab} />
      <YoureUpOverlay />
    </>
  );
}

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

function Splash() {
  return (
    <div className="grid min-h-dvh place-items-center bg-ink">
      <div className="flex flex-col items-center">
        <motion.div
          animate={{ scale: [1, 1.08, 1], opacity: [0.7, 1, 0.7] }}
          transition={{ duration: 1.4, repeat: Infinity }}
          className="font-display text-2xl font-bold tracking-tightest text-lime"
        >
          EAGLES
        </motion.div>
        <p className="mt-2 text-xs text-white/30">Loading the league…</p>
      </div>
    </div>
  );
}
