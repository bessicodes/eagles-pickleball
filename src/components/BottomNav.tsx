'use client';

import { motion } from 'framer-motion';
import type { TabKey } from '@/lib/types';
import { cn, haptic } from '@/lib/utils';

const TABS: { key: TabKey; label: string; icon: (active: boolean) => React.ReactNode }[] = [
  {
    key: 'tonight',
    label: 'Tonight',
    icon: (a) => (
      <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={a ? 2.4 : 2}>
        <path d="M12 3l2.5 5.5L20 9l-4 4 1 6-5-3-5 3 1-6-4-4 5.5-.5z" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    key: 'courts',
    label: 'Courts',
    icon: (a) => (
      <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={a ? 2.4 : 2}>
        <rect x="3" y="4" width="18" height="16" rx="2" />
        <path d="M12 4v16M3 12h18" />
      </svg>
    ),
  },
  {
    key: 'leaderboard',
    label: 'Ranks',
    icon: (a) => (
      <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={a ? 2.4 : 2}>
        <path d="M6 20V10M12 20V4M18 20v-7" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    key: 'profile',
    label: 'Profile',
    icon: (a) => (
      <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={a ? 2.4 : 2}>
        <circle cx="12" cy="8" r="4" />
        <path d="M4 21c0-4 4-6 8-6s8 2 8 6" strokeLinecap="round" />
      </svg>
    ),
  },
];

export default function BottomNav({
  active,
  onChange,
}: {
  active: TabKey;
  onChange: (t: TabKey) => void;
}) {
  return (
    <nav className="pointer-events-none fixed inset-x-0 bottom-0 z-40 flex justify-center">
      <div className="pointer-events-auto mx-3 mb-[max(env(safe-area-inset-bottom),12px)] w-full max-w-app">
        <div className="panel-blur flex items-stretch justify-around rounded-2xl px-2 py-2">
          {TABS.map((t) => {
            const isActive = active === t.key;
            return (
              <button
                key={t.key}
                onClick={() => {
                  haptic(8);
                  onChange(t.key);
                }}
                className="relative flex min-h-12 flex-1 flex-col items-center justify-center gap-0.5 px-1"
                aria-label={t.label}
              >
                {isActive && (
                  <motion.span
                    layoutId="tab-pill"
                    className="absolute inset-0 rounded-lg bg-lime/12"
                    transition={{ type: 'spring', stiffness: 380, damping: 32 }}
                  />
                )}
                <span className={cn('relative z-10', isActive ? 'text-lime' : 'text-white/45')}>
                  {t.icon(isActive)}
                </span>
                <span
                  className={cn(
                    'relative z-10 text-[10px] font-semibold',
                    isActive ? 'text-lime' : 'text-white/45'
                  )}
                >
                  {t.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
