# 🦅 Eagles Pickleball — Northcliff

A native-feeling **PWA** that replaces NextUp for the Eagles league nights.
Players scan a QR, pay **R55** in-app, request a partner, get **auto-matched**
into 2v2 games all night, submit scores, and watch a **live leaderboard**.
No codes. No counter slips. Ever.

> **League nights:** every **Monday & Wednesday 18:30** · Entry **R55**

---

## ✨ What's in the box

| Area | Built |
|---|---|
| **Design** | AI-2026 aesthetic — pure-dark `#0A0A0B`, neon-lime `#D6FF00`, electric-violet `#8A5CFF`, glassmorphism, noise grain, radial mesh, Space Grotesk display type, Framer Motion springs, confetti on win, haptics. |
| **Mobile UI** | Mobile-first 390px, max-width 440px centred, bottom nav (Tonight / Courts / Ranks / Profile), 48px thumb targets, safe-area insets, skeletons + empty + error states. |
| **Auth** | Email + password or phone OTP onboarding (local mock, mirrors Supabase Auth), profile with avatar upload / emoji, skill level. |
| **Tonight** | Monday & Wednesday cards with live counts & spots, join → partner request sheet → simulated Yoco/Paystack checkout → status card + live queue. |
| **Matchmaking** | Real FIFO engine that respects locked partner pairs, forms balanced 2v2s across 4 courts, avoids instant rematches, and simulates other games finishing every 25–45s. Full-screen **"YOU'RE UP — COURT X"** + vibration on assignment. |
| **Courts** | 4-court grid, live timers, lime-highlighted your court, score modal (both-confirm) → points = 3 + point differential. |
| **Leaderboard** | Tonight / Mondays / All-Time tabs, sticky current-user row, rank-movement arrows, streak flames, live updates. |
| **Admin** | Hidden `/admin` (PIN) — paid list, queue, live matches, override score, add walk-in, end/reset night, export CSV. |
| **PWA** | Installable manifest, offline service worker, iOS standalone meta. |

---

## 🚀 Run it

```bash
npm install
npm run dev
```

Open **http://localhost:3000** on your phone (same Wi-Fi, use your machine's
LAN IP) or in a mobile viewport. It works **immediately** — no backend needed.

Full demo path: **sign up → join Monday → pay R55 → request partner →
auto-matched in seconds → submit score → watch your rank jump.**

- Hidden admin: **`/admin`** (default PIN **`2620`**, change in `.env.local`).
- Install as an app: browser menu → *Add to Home Screen*.

### Build / deploy (Vercel)

```bash
npm run build && npm start
```

Push to GitHub and import into Vercel — zero config. It's a standard Next.js 14
app.

---

## 🧠 How the demo works without a server

Everything runs through a self-contained client **engine** in
[`src/lib/store.ts`](src/lib/store.ts) (Zustand + localStorage). It seeds 24
realistic SA players, keeps a lively night going, and drives real matchmaking,
scoring, and stats — so the whole flow is playable offline. State survives
refresh; reset it any time from **/admin → Reset night**.

The state shapes are a **1:1 mirror of the SQL schema**, so going live is a
data-layer swap, not a rewrite.

---

## 🔌 Going live with Supabase (when you're ready)

1. Create a Supabase project.
2. In the SQL editor run **[`supabase/schema.sql`](supabase/schema.sql)** then
   **[`supabase/seed.sql`](supabase/seed.sql)** (tables, RLS, realtime,
   `complete_match()` scoring RPC, 24 seeded players).
3. Copy `.env.local.example` → `.env.local` and fill:
   ```
   NEXT_PUBLIC_SUPABASE_URL=…
   NEXT_PUBLIC_SUPABASE_ANON_KEY=…
   NEXT_PUBLIC_USE_SUPABASE=true
   ```
4. The adapter in [`src/lib/supabase.ts`](src/lib/supabase.ts) is stubbed and
   commented with the realtime subscription + scoring-RPC wiring to drop in.

### Real Yoco later

The checkout in `TonightTab.tsx` is a clean simulated gateway (1.5s → success).
Swap `payNow()` for a Yoco popup/redirect and mark the registration paid on the
webhook — the rest of the flow is unchanged.

---

## 🗂 Structure

```
src/
  app/            layout, globals, main app shell (/), hidden /admin
  components/     Onboarding, TonightTab, CourtsTab, LeaderboardTab,
                  ProfileTab, BottomNav, YoureUpOverlay, Background, ui
  lib/            store.ts (engine) · matchmaking.ts · seed.ts ·
                  types.ts · supabase.ts · utils.ts
supabase/         schema.sql · seed.sql
public/           manifest, service worker, icons
```

Built for the Eagles league in Northcliff. 🎾
