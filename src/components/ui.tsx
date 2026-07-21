'use client';

import { motion, AnimatePresence, type HTMLMotionProps } from 'framer-motion';
import { useEffect, type ReactNode } from 'react';
import { avatarGradient, cn, initials } from '@/lib/utils';
import type { Player } from '@/lib/types';

// ── Glass card ───────────────────────────────────────────────────────
export function Card({
  className,
  children,
  ...rest
}: HTMLMotionProps<'div'> & { children?: ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 14, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: 'spring', stiffness: 320, damping: 30 }}
      className={cn('glass rounded-card', className)}
      {...rest}
    >
      {children}
    </motion.div>
  );
}

// ── Pill button (scale 0.97 on tap) ──────────────────────────────────
type ButtonVariant = 'lime' | 'violet' | 'ghost' | 'dark';

export function Button({
  variant = 'lime',
  className,
  children,
  disabled,
  ...rest
}: HTMLMotionProps<'button'> & { variant?: ButtonVariant; children?: ReactNode }) {
  const styles: Record<ButtonVariant, string> = {
    lime: 'bg-lime text-ink shadow-lime',
    violet: 'bg-violet text-white shadow-violet',
    ghost: 'bg-white/[0.06] text-white border border-white/[0.1]',
    dark: 'bg-ink/80 text-white border border-white/[0.08]',
  };
  return (
    <motion.button
      whileTap={{ scale: disabled ? 1 : 0.97 }}
      disabled={disabled}
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-pill px-5 font-semibold',
        'h-12 min-h-12 text-[15px] transition-opacity disabled:opacity-40',
        styles[variant],
        className
      )}
      {...rest}
    >
      {children}
    </motion.button>
  );
}

// ── Avatar (emoji, uploaded image, or gradient initials) ─────────────
export function Avatar({
  player,
  size = 40,
  ring,
}: {
  player?: Pick<Player, 'id' | 'name' | 'emoji' | 'avatarUrl'> | null;
  size?: number;
  ring?: string;
}) {
  const s = { width: size, height: size };
  if (!player) {
    return (
      <div
        style={s}
        className="rounded-full bg-white/[0.06] border border-white/[0.08]"
      />
    );
  }
  const inner = player.avatarUrl ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={player.avatarUrl} alt={player.name} className="h-full w-full object-cover" />
  ) : player.emoji ? (
    <span style={{ fontSize: size * 0.5 }}>{player.emoji}</span>
  ) : (
    <span style={{ fontSize: size * 0.36 }} className="font-semibold text-white/90">
      {initials(player.name)}
    </span>
  );
  return (
    <div
      style={{
        ...s,
        background: player.avatarUrl ? undefined : avatarGradient(player.id),
        boxShadow: ring ? `0 0 0 2px ${ring}` : undefined,
      }}
      className="grid place-items-center overflow-hidden rounded-full shrink-0"
    >
      {inner}
    </div>
  );
}

// ── Live dot (pulsing) ───────────────────────────────────────────────
export function LiveDot({ color = '#D6FF00', label }: { color?: string; label?: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="relative flex h-2 w-2">
        <span
          className="absolute inline-flex h-full w-full animate-pulseDot rounded-full"
          style={{ background: color }}
        />
      </span>
      {label && <span className="eyebrow !tracking-[0.14em] !text-white/60">{label}</span>}
    </span>
  );
}

// ── Skill chip ───────────────────────────────────────────────────────
export function SkillChip({ skill }: { skill: Player['skill'] }) {
  const map = {
    Beginner: 'text-emerald-300 bg-emerald-400/10',
    Intermediate: 'text-sky-300 bg-sky-400/10',
    Advanced: 'text-lime bg-lime/10',
  } as const;
  return (
    <span className={cn('rounded-pill px-2 py-0.5 text-[10px] font-semibold', map[skill])}>
      {skill}
    </span>
  );
}

// ── Bottom sheet (drag-to-dismiss feel, spring in) ───────────────────
export function Sheet({
  open,
  onClose,
  children,
  title,
}: {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  title?: string;
}) {
  // Lock body scroll while open.
  useEffect(() => {
    if (open) document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-end justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
          <motion.div
            className="glass relative w-full max-w-app rounded-t-[28px] px-5 pt-3 pb-safe"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', stiffness: 340, damping: 34 }}
            drag="y"
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.4 }}
            onDragEnd={(_, info) => {
              if (info.offset.y > 120) onClose();
            }}
          >
            <div className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-white/20" />
            {title && (
              <h2 className="font-display mb-3 text-xl font-semibold text-white">{title}</h2>
            )}
            <div className="max-h-[72vh] overflow-y-auto no-scrollbar pb-4">{children}</div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ── Skeleton block ───────────────────────────────────────────────────
export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('skeleton rounded-2xl', className)} />;
}

// ── Section eyebrow with optional live dot ───────────────────────────
export function Eyebrow({ children, live }: { children: ReactNode; live?: boolean }) {
  return (
    <div className="flex items-center gap-2">
      {live && <LiveDot />}
      <span className="eyebrow">{children}</span>
    </div>
  );
}
