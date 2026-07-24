'use client';

import { useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { useStore } from '@/lib/store';
import { Avatar, Button } from './ui';
import { ACCENTS, cn, fileToSquareDataUrl, haptic } from '@/lib/utils';
import type { SkillLevel } from '@/lib/types';

const SKILLS: SkillLevel[] = ['Beginner', 'Intermediate', 'Advanced'];

/**
 * Two-step onboarding: brand hero → build your player card (photo, name,
 * nickname, skill, accent). No fake auth screen — there's no backend yet, so
 * you just make a card and play. Real Supabase Auth slots in later.
 */
export default function Onboarding() {
  const signUp = useStore((s) => s.signUp);

  const [step, setStep] = useState<0 | 1>(0);
  const [name, setName] = useState('');
  const [nickname, setNickname] = useState('');
  const [skill, setSkill] = useState<SkillLevel>('Intermediate');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [accent, setAccent] = useState<string>(ACCENTS[0]);
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ''; // allow re-selecting the same file
    if (!file) return;
    setBusy(true);
    try {
      const url = await fileToSquareDataUrl(file);
      setAvatarUrl(url);
      haptic(12);
    } catch {
      // ignore bad files
    } finally {
      setBusy(false);
    }
  }

  function finish() {
    haptic([20, 30, 40]);
    signUp({
      name: name.trim() || 'Guest Player',
      nickname: nickname.trim() || name.trim().split(' ')[0] || 'Guest',
      skill,
      avatarUrl,
      accent,
    });
  }

  function quickStart() {
    haptic([20, 30, 40]);
    signUp({ name: 'Guest Player', nickname: 'Guest', skill: 'Intermediate', accent: ACCENTS[0] });
  }

  const preview = { id: 'me-preview', name: name || 'You', avatarUrl, accent };

  return (
    <div className="relative mx-auto flex min-h-dvh w-full max-w-app flex-col px-5 pt-safe pb-safe">
      {/* progress */}
      <div className="mt-4 flex gap-1.5">
        {[0, 1].map((i) => (
          <div
            key={i}
            className={cn(
              'h-1 flex-1 rounded-full transition-colors',
              i <= step ? 'bg-lime' : 'bg-white/10'
            )}
          />
        ))}
      </div>

      {/* ── Step 0 — Hero ── */}
      {step === 0 && (
        <motion.div
          key="hero"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-1 flex-col"
        >
          <div className="flex flex-1 flex-col justify-center">
            <div className="mb-6 inline-flex w-fit items-center gap-2 rounded-pill border border-white/10 bg-white/[0.04] px-3 py-1.5">
              <span className="h-2 w-2 rounded-full bg-lime animate-pulseDot" />
              <span className="eyebrow !text-white/60">Northcliff · Mondays &amp; Wednesdays</span>
            </div>
            <h1 className="font-display text-[52px] font-bold leading-[0.95] tracking-tightest text-white">
              EAGLES
              <br />
              <span className="text-lime">PICKLE</span>BALL
            </h1>
            <p className="mt-4 max-w-[310px] text-[15px] leading-relaxed text-white/55">
              Club league night, sorted. Check in, get paired with a partner, and climb the ladder —
              all from your phone.
            </p>
            <div className="mt-8 flex items-center gap-4 text-white/40">
              <Feature label="Auto-matched" />
              <Dot />
              <Feature label="Live ladder" />
              <Dot />
              <Feature label="Win streaks" />
            </div>
          </div>
          <Button className="w-full" onClick={() => setStep(1)}>
            Create your player card
          </Button>
          <button
            onClick={quickStart}
            className="mt-3 w-full text-center text-sm font-medium text-white/45 underline-offset-4 hover:underline"
          >
            Just looking? Skip for now
          </button>
        </motion.div>
      )}

      {/* ── Step 1 — Player card ── */}
      {step === 1 && (
        <motion.div
          key="card"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-1 flex-col"
        >
          <div className="flex-1 overflow-y-auto no-scrollbar py-5">
            <h2 className="font-display text-3xl font-semibold tracking-tightest text-white">
              Your player card
            </h2>
            <p className="mt-1 text-sm text-white/45">
              Add a photo and your name — this is how you show up courtside.
            </p>

            {/* photo */}
            <div className="mt-7 flex flex-col items-center">
              <button
                onClick={() => fileRef.current?.click()}
                className="relative active:scale-95 transition-transform"
                aria-label="Add photo"
              >
                <Avatar player={preview} size={112} ring={accent} />
                <span
                  className="absolute -bottom-1 -right-1 grid h-9 w-9 place-items-center rounded-full border-2 border-ink text-ink"
                  style={{ background: accent }}
                >
                  {busy ? <Spinner /> : <CameraIcon />}
                </span>
              </button>
              <input ref={fileRef} type="file" accept="image/*" hidden onChange={onFile} />
              <div className="mt-3 flex items-center gap-3">
                <button
                  onClick={() => fileRef.current?.click()}
                  className="text-sm font-semibold text-lime"
                >
                  {avatarUrl ? 'Change photo' : 'Add a photo'}
                </button>
                {avatarUrl && (
                  <button
                    onClick={() => setAvatarUrl(null)}
                    className="text-sm font-medium text-white/40"
                  >
                    Remove
                  </button>
                )}
              </div>
            </div>

            {/* accent picker */}
            <div className="mt-6">
              <span className="mb-2 block text-xs font-medium text-white/45">Accent colour</span>
              <div className="flex flex-wrap gap-2.5">
                {ACCENTS.map((c) => (
                  <button
                    key={c}
                    onClick={() => {
                      setAccent(c);
                      haptic(6);
                    }}
                    aria-label={`Accent ${c}`}
                    className={cn(
                      'h-8 w-8 rounded-full transition-transform active:scale-90',
                      accent === c ? 'ring-2 ring-white ring-offset-2 ring-offset-ink' : ''
                    )}
                    style={{ background: c }}
                  />
                ))}
              </div>
            </div>

            <div className="mt-6 space-y-3">
              <Field label="Full name">
                <input
                  placeholder="e.g. Ruan Bester"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="ob-input"
                />
              </Field>
              <Field label="Nickname (on court)">
                <input
                  placeholder="e.g. Bessie"
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                  className="ob-input"
                />
              </Field>
              <Field label="Skill level">
                <div className="grid grid-cols-3 gap-2">
                  {SKILLS.map((s) => (
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
              </Field>
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <Button variant="ghost" className="!px-6" onClick={() => setStep(0)}>
              Back
            </Button>
            <Button className="flex-1" onClick={finish}>
              Enter the league →
            </Button>
          </div>
        </motion.div>
      )}
    </div>
  );
}

function Feature({ label }: { label: string }) {
  return <span className="text-xs font-medium">{label}</span>;
}
function Dot() {
  return <span className="h-1 w-1 rounded-full bg-white/20" />;
}
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-medium text-white/45">{label}</span>
      {children}
    </label>
  );
}
const CameraIcon = () => (
  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2}>
    <path d="M4 8h3l1.5-2h7L17 8h3v11H4z" strokeLinejoin="round" />
    <circle cx="12" cy="13" r="3.2" />
  </svg>
);
const Spinner = () => (
  <svg viewBox="0 0 24 24" className="h-4 w-4 animate-spin" fill="none" stroke="currentColor" strokeWidth={2.5}>
    <path d="M12 3a9 9 0 1 0 9 9" strokeLinecap="round" />
  </svg>
);
