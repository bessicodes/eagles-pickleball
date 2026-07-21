'use client';

import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useStore, playersMap, currentUser, matchById } from '@/lib/store';
import { Avatar } from './ui';
import { haptic } from '@/lib/utils';

/**
 * Full-screen "YOU'RE UP — COURT X" takeover shown the moment the current
 * user is assigned to a match. Buzzes the phone on appear.
 */
export default function YoureUpOverlay() {
  const matchId = useStore((s) => s.youreUpMatchId);
  const match = useStore((s) => matchById(s, matchId));
  const me = useStore(currentUser);
  const pMap = useStore(playersMap);
  const dismiss = useStore((s) => s.dismissYoureUp);

  useEffect(() => {
    if (matchId && match?.status === 'live') {
      haptic([0, 90, 60, 90, 60, 180]);
    }
  }, [matchId, match?.status]);

  const open = !!matchId && match?.status === 'live' && !!me;
  if (!match || !me) return <AnimatePresence>{null}</AnimatePresence>;

  const onA = match.teamA.includes(me.id);
  const partnerId = (onA ? match.teamA : match.teamB).find((id) => id !== me.id);
  const opponents = onA ? match.teamB : match.teamA;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[60] flex flex-col items-center justify-center px-6 text-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          {/* pulsing lime backdrop */}
          <div className="absolute inset-0 bg-ink" />
          <motion.div
            className="absolute inset-0"
            style={{ background: 'radial-gradient(circle at 50% 40%, rgba(214,255,0,0.18), transparent 60%)' }}
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 1.6, repeat: Infinity }}
          />

          <motion.div
            className="relative"
            initial={{ scale: 0.8, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 18 }}
          >
            <p className="eyebrow !text-lime">Get to the court</p>
            <h1 className="font-display mt-2 text-6xl font-bold leading-none tracking-tightest text-white">
              YOU&apos;RE
              <br />
              UP
            </h1>
            <div className="mt-5 inline-flex items-center gap-2 rounded-pill bg-lime px-6 py-2.5">
              <span className="font-display text-2xl font-bold text-ink">COURT {match.courtId}</span>
            </div>

            {/* teams */}
            <div className="mt-8 flex items-center justify-center gap-4">
              <div className="flex flex-col items-center gap-1">
                <div className="flex -space-x-2">
                  <Avatar player={me} size={48} ring="#D6FF00" />
                  {partnerId && <Avatar player={pMap[partnerId]} size={48} ring="#D6FF00" />}
                </div>
                <span className="text-xs font-semibold text-lime">
                  You{partnerId ? ` & ${pMap[partnerId]?.nickname}` : ''}
                </span>
              </div>
              <span className="font-display text-sm font-bold text-white/40">VS</span>
              <div className="flex flex-col items-center gap-1">
                <div className="flex -space-x-2">
                  {opponents.map((id) => (
                    <Avatar key={id} player={pMap[id]} size={48} ring="#141416" />
                  ))}
                </div>
                <span className="text-xs font-semibold text-white/60">
                  {opponents.map((id) => pMap[id]?.nickname).join(' & ')}
                </span>
              </div>
            </div>
          </motion.div>

          <motion.button
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => {
              haptic(20);
              dismiss();
            }}
            className="absolute inset-x-6 bottom-[max(env(safe-area-inset-bottom),24px)] mx-auto h-14 max-w-app rounded-pill bg-lime font-bold text-ink shadow-lime"
          >
            Let&apos;s go 🎾
          </motion.button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
