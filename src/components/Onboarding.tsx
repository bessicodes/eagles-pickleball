'use client';

import { useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { useStore } from '@/lib/store';
import { Avatar, Button } from './ui';
import { cn, haptic } from '@/lib/utils';
import type { SkillLevel } from '@/lib/types';

const EMOJIS = ['🦅', '🔥', '⚡', '🎾', '🚀', '🌟', '🃏', '🐆', '💎', '🥁', '🌊', '🎯'];
const SKILLS: SkillLevel[] = ['Beginner', 'Intermediate', 'Advanced'];

/**
 * Signup + onboarding. Auth is a local mock that mirrors Supabase Auth
 * (email+password or phone OTP); the profile step feeds store.signUp().
 */
export default function Onboarding() {
  const signUp = useStore((s) => s.signUp);

  const [step, setStep] = useState<0 | 1 | 2>(0);
  const [mode, setMode] = useState<'email' | 'phone'>('email');

  // auth fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState('');

  // profile fields
  const [name, setName] = useState('');
  const [nickname, setNickname] = useState('');
  const [skill, setSkill] = useState<SkillLevel>('Intermediate');
  const [emoji, setEmoji] = useState('🦅');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // Test mode: there's no real backend, so any input (or none) gets you in.
  const authValid = true;

  function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setAvatarUrl(reader.result as string);
    reader.readAsDataURL(file);
  }

  function finish() {
    haptic([20, 30, 40]);
    // Fall back to friendly defaults so nothing blocks a test run.
    signUp({
      name: name.trim() || 'Guest Player',
      nickname: nickname.trim() || name.trim().split(' ')[0] || 'Guest',
      skill,
      emoji,
      avatarUrl,
    });
  }

  // One-tap entry — skip the whole flow and drop straight into the app.
  function quickStart() {
    haptic([20, 30, 40]);
    signUp({ name: 'Guest Player', nickname: 'Guest', skill: 'Intermediate', emoji: '🦅', avatarUrl: null });
  }

  return (
    <div className="relative mx-auto flex min-h-dvh w-full max-w-app flex-col px-5 pt-safe pb-safe">
      {/* progress */}
      <div className="mt-4 flex gap-1.5">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className={cn(
              'h-1 flex-1 rounded-full transition-colors',
              i <= step ? 'bg-lime' : 'bg-white/10'
            )}
          />
        ))}
      </div>

      <div className="flex flex-1 flex-col">
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
                <span className="eyebrow !text-white/60">Northcliff · Mon &amp; Wed 18:30</span>
              </div>
              <h1 className="font-display text-[52px] font-bold leading-[0.95] tracking-tightest text-white">
                EAGLES
                <br />
                <span className="text-lime">PICKLE</span>BALL
              </h1>
              <p className="mt-4 max-w-[300px] text-[15px] leading-relaxed text-white/55">
                Scan, pay R55, get auto-matched into 2v2 games all night. No codes. No slips. Ever.
              </p>
              <div className="mt-8 flex items-center gap-4 text-white/40">
                <Feature icon="⚡" label="Instant match" />
                <Feature icon="🏆" label="Live ranks" />
                <Feature icon="🔥" label="Streaks" />
              </div>
            </div>
            <Button className="w-full" onClick={() => setStep(1)}>
              Get started →
            </Button>
            <button
              onClick={quickStart}
              className="mt-3 w-full text-center text-sm font-medium text-lime/80 underline-offset-4 hover:underline"
            >
              Skip — jump in as a guest
            </button>
            <p className="mt-2 text-center text-xs text-white/30">
              Test mode · no account or database needed.
            </p>
          </motion.div>
        )}

        {/* ── Step 1 — Auth ── */}
        {step === 1 && (
          <motion.div
            key="auth"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-1 flex-col"
          >
            <div className="flex flex-1 flex-col justify-center">
              <h2 className="font-display text-3xl font-semibold text-white">Create your account</h2>
              <p className="mt-1 text-sm text-white/45">
                Test mode — type anything (or leave it blank) and tap Continue.
              </p>

              <div className="mt-6 flex rounded-pill bg-white/[0.05] p-1">
                {(['email', 'phone'] as const).map((m) => (
                  <button
                    key={m}
                    onClick={() => setMode(m)}
                    className={cn(
                      'flex-1 rounded-pill py-2.5 text-sm font-semibold capitalize transition-colors',
                      mode === m ? 'bg-lime text-ink' : 'text-white/50'
                    )}
                  >
                    {m === 'email' ? 'Email' : 'Phone OTP'}
                  </button>
                ))}
              </div>

              <div className="mt-5 space-y-3">
                {mode === 'email' ? (
                  <>
                    <Field label="Email">
                      <input
                        type="email"
                        inputMode="email"
                        placeholder="you@example.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="input"
                      />
                    </Field>
                    <Field label="Password">
                      <input
                        type="password"
                        placeholder="At least 6 characters"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="input"
                      />
                    </Field>
                  </>
                ) : (
                  <>
                    <Field label="Mobile number">
                      <div className="flex gap-2">
                        <input
                          type="tel"
                          inputMode="tel"
                          placeholder="082 123 4567"
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          className="input flex-1"
                        />
                        <Button
                          variant="ghost"
                          className="!h-[52px] shrink-0 !px-4"
                          onClick={() => {
                            setOtpSent(true);
                            haptic(15);
                          }}
                        >
                          {otpSent ? 'Resend' : 'Send code'}
                        </Button>
                      </div>
                    </Field>
                    {otpSent && (
                      <Field label="Enter the 4-digit code">
                        <input
                          inputMode="numeric"
                          maxLength={4}
                          placeholder="1234"
                          value={otp}
                          onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                          className="input tracking-[0.5em] text-center text-lg"
                        />
                        <p className="mt-1.5 text-xs text-white/30">
                          Demo: any 4 digits work.
                        </p>
                      </Field>
                    )}
                  </>
                )}
              </div>
            </div>

            <div className="flex gap-3">
              <Button variant="ghost" className="!px-6" onClick={() => setStep(0)}>
                Back
              </Button>
              <Button className="flex-1" disabled={!authValid} onClick={() => setStep(2)}>
                Continue
              </Button>
            </div>
          </motion.div>
        )}

        {/* ── Step 2 — Profile ── */}
        {step === 2 && (
          <motion.div
            key="profile"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-1 flex-col"
          >
            <div className="flex-1 overflow-y-auto no-scrollbar py-4">
              <h2 className="font-display text-3xl font-semibold text-white">Your player card</h2>
              <p className="mt-1 text-sm text-white/45">This is how you show up on the courts.</p>

              {/* avatar */}
              <div className="mt-6 flex items-center gap-4">
                <button
                  onClick={() => fileRef.current?.click()}
                  className="relative"
                  aria-label="Upload avatar"
                >
                  <Avatar
                    player={{ id: 'me-preview', name: name || 'You', emoji: avatarUrl ? '' : emoji, avatarUrl }}
                    size={72}
                    ring="rgba(214,255,0,0.6)"
                  />
                  <span className="absolute -bottom-1 -right-1 grid h-6 w-6 place-items-center rounded-full bg-lime text-ink text-xs">
                    ✎
                  </span>
                </button>
                <input ref={fileRef} type="file" accept="image/*" hidden onChange={onFile} />
                <div className="flex flex-wrap gap-1.5">
                  {EMOJIS.map((e) => (
                    <button
                      key={e}
                      onClick={() => {
                        setEmoji(e);
                        setAvatarUrl(null);
                      }}
                      className={cn(
                        'grid h-9 w-9 place-items-center rounded-full text-lg transition-transform active:scale-90',
                        emoji === e && !avatarUrl ? 'bg-lime/20 ring-1 ring-lime' : 'bg-white/[0.05]'
                      )}
                    >
                      {e}
                    </button>
                  ))}
                </div>
              </div>

              <div className="mt-5 space-y-3">
                <Field label="Full name">
                  <input
                    placeholder="Ruan Bester"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="input"
                  />
                </Field>
                <Field label="Nickname (on court)">
                  <input
                    placeholder="Bessie"
                    value={nickname}
                    onChange={(e) => setNickname(e.target.value)}
                    className="input"
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
              <Button variant="ghost" className="!px-6" onClick={() => setStep(1)}>
                Back
              </Button>
              <Button className="flex-1" onClick={finish}>
                Enter the league →
              </Button>
            </div>
          </motion.div>
        )}
      </div>

      <style jsx global>{`
        .input {
          width: 100%;
          height: 52px;
          border-radius: 16px;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.08);
          padding: 0 16px;
          color: #fff;
          font-size: 15px;
          outline: none;
          transition: border-color 0.15s;
        }
        .input:focus {
          border-color: rgba(214, 255, 0, 0.5);
        }
        .input::placeholder {
          color: rgba(255, 255, 255, 0.3);
        }
      `}</style>
    </div>
  );
}

function Feature({ icon, label }: { icon: string; label: string }) {
  return (
    <div className="flex items-center gap-1.5 text-xs">
      <span className="text-base">{icon}</span>
      <span>{label}</span>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-medium text-white/45">{label}</span>
      {children}
    </label>
  );
}
