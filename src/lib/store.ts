// =====================================================================
//  Global store + engine (Zustand, localStorage-persisted).
//
//  This is the app's brain. It owns the whole league-night lifecycle:
//  registrations, payments, the FIFO+partner queue, the matchmaking loop,
//  scoring, and the "other players finishing" simulation. Every piece of
//  state mirrors supabase/schema.sql so swapping to real Supabase is a
//  data-layer change, not a rewrite.
// =====================================================================

'use client';

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type {
  BoardKey,
  Court,
  LeagueNight,
  Match,
  Player,
  Registration,
  QueueUnit,
} from './types';
import { seedNights, seedPlayers } from './seed';
import {
  computeQueue,
  crossPairs,
  nextMatchup,
} from './matchmaking';
import { haptic, pick, randInt, uid } from './utils';

// ── Tunables ─────────────────────────────────────────────────────────
const COURT_COUNT = 4;
const NIGHT_CAP = 32; // capacity per night (for "spots left")
const RETURN_DELAY_USER = 5000; // players return to queue 5s after their game
const RETURN_DELAY_SIM = 2600;
const RECENT_MAX = 24; // rolling opponent-history window

function makeCourts(): Court[] {
  return Array.from({ length: COURT_COUNT }, (_, i) => ({
    id: i + 1,
    name: `Court ${i + 1}`,
    matchId: null,
  }));
}

function byId(players: Player[]): Record<string, Player> {
  const m: Record<string, Player> = {};
  for (const p of players) m[p.id] = p;
  return m;
}

// ── State shape ──────────────────────────────────────────────────────
interface State {
  // Source of truth
  players: Player[];
  nights: LeagueNight[];
  registrations: Registration[];
  courts: Court[];
  matches: Match[];
  waitingSince: Record<string, number>; // player -> queue re-entry time
  recentOpponentKeys: string[];
  lastResult: Record<string, 'W' | 'L'>; // last game outcome (rank movement)

  currentUserId: string | null;
  activeNightId: string | null; // the night the user joined
  simNightId: string; // the night the simulation is running on
  initialized: boolean;

  // Transient UI signals (not persisted)
  youreUpMatchId: string | null;
  celebrate: { token: number; won: boolean } | null;

  // ── Actions ──
  hydrate: () => void;
  ensureNightSeeded: (nightId: string) => void;

  signUp: (p: {
    name: string;
    nickname: string;
    skill: Player['skill'];
    emoji: string;
    avatarUrl?: string | null;
  }) => void;
  updateProfile: (patch: Partial<Player>) => void;
  signOut: () => void;

  joinNight: (nightId: string) => void;
  setPartnerRequest: (nightId: string, req: { requestedPartnerId?: string | null; anyPartner: boolean }) => void;
  clearPartnerRequest: (nightId: string) => void;
  pay: (nightId: string, provider: 'yoco' | 'paystack') => void;

  runMatchmaking: () => void;
  submitScore: (matchId: string, scoreA: number, scoreB: number) => void;
  simulateFinish: () => void;
  tickAssist: () => void;

  dismissYoureUp: () => void;
  clearCelebrate: () => void;

  // Admin
  addWalkIn: (name: string, skill: Player['skill']) => void;
  overrideScore: (matchId: string, a: number, b: number) => void;
  endNight: () => void;
  resetNight: () => void;
}

// ── Internal helpers (operate on a snapshot) ─────────────────────────
function regMapFor(state: State, nightId: string): Record<string, Registration> {
  const m: Record<string, Registration> = {};
  for (const r of state.registrations) if (r.nightId === nightId) m[r.playerId] = r;
  return m;
}

/** Undo any partner request/reservation this user currently holds for a night. */
function releaseUserPartner(
  regs: Registration[],
  userId: string,
  nightId: string
): Registration[] {
  return regs.map((r) => {
    if (r.nightId !== nightId) return r;
    if (r.playerId === userId) {
      return { ...r, requestedPartnerId: null, partnerId: null, anyPartner: true };
    }
    if (r.reservedFor === userId || r.partnerId === userId) {
      return {
        ...r,
        reservedFor: r.reservedFor === userId ? null : r.reservedFor,
        partnerId: r.partnerId === userId ? null : r.partnerId,
      };
    }
    return r;
  });
}

/** Apply the scoring rules for a completed match and return the next state. */
function applyCompletion(
  state: State,
  match: Match,
  scoreA: number,
  scoreB: number,
  returnDelay: number,
  submittedBy?: string
): Partial<State> {
  const aWon = scoreA > scoreB;
  const winners = aWon ? match.teamA : match.teamB;
  const losers = aWon ? match.teamB : match.teamA;
  const diff = Math.abs(scoreA - scoreB);
  const winPoints = 3 + diff; // 3 for the win + point differential
  const isMonday = state.nights.find((n) => n.id === state.simNightId)?.day === 'Monday';

  const winSet = new Set(winners);
  const loseSet = new Set(losers);

  const players = state.players.map((p) => {
    if (winSet.has(p.id)) {
      return {
        ...p,
        wins: p.wins + 1,
        points: p.points + winPoints,
        streak: p.streak + 1,
        rating: p.rating + 8,
        tonightWins: p.tonightWins + 1,
        tonightPoints: p.tonightPoints + winPoints,
        mondayWins: isMonday ? p.mondayWins + 1 : p.mondayWins,
        mondayPoints: isMonday ? p.mondayPoints + winPoints : p.mondayPoints,
      };
    }
    if (loseSet.has(p.id)) {
      return {
        ...p,
        losses: p.losses + 1,
        streak: 0,
        rating: Math.max(900, p.rating - 6),
        tonightLosses: p.tonightLosses + 1,
        mondayLosses: isMonday ? p.mondayLosses + 1 : p.mondayLosses,
      };
    }
    return p;
  });

  const now = Date.now();
  const waitingSince = { ...state.waitingSince };
  const stagger = [0, 200, 400, 600];
  [...match.teamA, ...match.teamB].forEach((id, i) => {
    waitingSince[id] = now + returnDelay + stagger[i]; // cool-down before re-queue
  });

  const lastResult = { ...state.lastResult };
  winners.forEach((id) => (lastResult[id] = 'W'));
  losers.forEach((id) => (lastResult[id] = 'L'));

  const recentOpponentKeys = [
    ...crossPairs(match.teamA, match.teamB),
    ...state.recentOpponentKeys,
  ].slice(0, RECENT_MAX);

  const matches = state.matches.map((m) =>
    m.id === match.id
      ? { ...m, status: 'completed' as const, scoreA, scoreB, completedAt: now, submittedBy }
      : m
  );
  const courts = state.courts.map((c) => (c.matchId === match.id ? { ...c, matchId: null } : c));

  // Celebrate only for the current user's games.
  let celebrate = state.celebrate;
  let youreUpMatchId = state.youreUpMatchId;
  if (state.currentUserId && match.involvesUser) {
    celebrate = { token: now, won: winSet.has(state.currentUserId) };
    if (youreUpMatchId === match.id) youreUpMatchId = null;
  }

  return { players, matches, courts, waitingSince, lastResult, recentOpponentKeys, celebrate, youreUpMatchId };
}

// ── Store ────────────────────────────────────────────────────────────
export const useStore = create<State>()(
  persist(
    (set, get) => ({
      players: [],
      nights: [],
      registrations: [],
      courts: makeCourts(),
      matches: [],
      waitingSince: {},
      recentOpponentKeys: [],
      lastResult: {},
      currentUserId: null,
      activeNightId: null,
      simNightId: 'night-monday',
      initialized: false,
      youreUpMatchId: null,
      celebrate: null,

      // First-run bootstrap: seed players/nights and start a lively Monday.
      hydrate: () => {
        const s = get();
        if (!s.initialized) {
          set({
            players: seedPlayers(),
            nights: seedNights(),
            initialized: true,
            simNightId: 'night-monday',
          });
          get().ensureNightSeeded('night-monday');
        } else if (s.nights.length === 0) {
          set({ nights: seedNights() });
        }
      },

      // Make `nightId` the live simulated night with ~15 fake players already
      // checked in, some as locked pairs, and a few matches already underway.
      ensureNightSeeded: (nightId) => {
        const s = get();
        const alreadyLive =
          s.simNightId === nightId &&
          s.registrations.some(
            (r) => r.nightId === nightId && r.checkedIn && r.playerId.startsWith('seed-')
          );
        if (alreadyLive) return;

        const seeds = s.players.filter((p) => p.id.startsWith('seed-'));
        const chosen = seeds.slice(0, 15);
        const now = Date.now();

        // Three locked partner pairs among the first six.
        const partnerOf: Record<string, string> = {};
        for (let i = 0; i < 6; i += 2) {
          partnerOf[chosen[i].id] = chosen[i + 1].id;
          partnerOf[chosen[i + 1].id] = chosen[i].id;
        }

        const regs: Registration[] = [];
        const waitingSince: Record<string, number> = {};
        chosen.forEach((p, idx) => {
          regs.push({
            playerId: p.id,
            nightId,
            paid: true,
            checkedIn: true,
            anyPartner: !partnerOf[p.id],
            requestedPartnerId: partnerOf[p.id] ?? null,
            partnerId: partnerOf[p.id] ?? null,
            paidAt: now,
            provider: 'yoco',
          });
          // Older joiners first → stable FIFO.
          waitingSince[p.id] = now - (chosen.length - idx) * 15000 - randInt(0, 8000);
        });

        // Preserve the user's own registration on this night, if any.
        const userRegs = s.registrations.filter(
          (r) => r.playerId === s.currentUserId && r.nightId === nightId
        );
        if (userRegs.length && s.currentUserId && userRegs[0].checkedIn) {
          waitingSince[s.currentUserId] = now;
        }

        set({
          simNightId: nightId,
          registrations: [...regs, ...userRegs],
          matches: [],
          courts: makeCourts(),
          waitingSince,
          recentOpponentKeys: [],
          lastResult: {},
          youreUpMatchId: null,
        });

        // Fill the free courts, then backdate those matches so the courts
        // show realistic elapsed time.
        get().runMatchmaking();
        set((st) => ({
          matches: st.matches.map((m) => ({
            ...m,
            startedAt: m.startedAt - randInt(60_000, 8 * 60_000),
          })),
        }));
      },

      signUp: ({ name, nickname, skill, emoji, avatarUrl }) => {
        const id = uid('me');
        const me: Player = {
          id,
          name,
          nickname: nickname || name.split(' ')[0],
          skill,
          emoji: emoji || '🦅',
          avatarUrl: avatarUrl ?? null,
          rating: skill === 'Advanced' ? 1400 : skill === 'Intermediate' ? 1250 : 1150,
          wins: 0,
          losses: 0,
          points: 0,
          streak: 0,
          tonightWins: 0,
          tonightLosses: 0,
          tonightPoints: 0,
          mondayWins: 0,
          mondayLosses: 0,
          mondayPoints: 0,
          isCurrentUser: true,
        };
        set((s) => ({ players: [...s.players, me], currentUserId: id }));
      },

      updateProfile: (patch) => {
        const id = get().currentUserId;
        if (!id) return;
        set((s) => ({ players: s.players.map((p) => (p.id === id ? { ...p, ...patch } : p)) }));
      },

      signOut: () => set({ currentUserId: null, activeNightId: null }),

      joinNight: (nightId) => {
        const s = get();
        const uidv = s.currentUserId;
        if (!uidv) return;
        get().ensureNightSeeded(nightId);

        const exists = get().registrations.find(
          (r) => r.playerId === uidv && r.nightId === nightId
        );
        if (!exists) {
          set((st) => ({
            registrations: [
              ...st.registrations,
              {
                playerId: uidv,
                nightId,
                paid: false,
                checkedIn: false,
                anyPartner: true,
                requestedPartnerId: null,
                partnerId: null,
              },
            ],
          }));
        }
        set({ activeNightId: nightId });
      },

      // Request (or clear) a specific partner. The chosen partner is reserved —
      // held out of matchmaking — so they can't be pulled into a game while the
      // user finishes checking out. Mutual lock is set both ways.
      setPartnerRequest: (nightId, req) => {
        const s = get();
        const uidv = s.currentUserId;
        if (!uidv) return;
        const partnerId = req.requestedPartnerId ?? null;

        // Drop any previous reservation first, then apply the new request.
        let regs = releaseUserPartner(s.registrations, uidv, nightId);
        regs = regs.map((r) =>
          r.playerId === uidv && r.nightId === nightId
            ? { ...r, requestedPartnerId: partnerId, partnerId, anyPartner: !partnerId }
            : r
        );

        if (partnerId) {
          const exists = regs.some((r) => r.playerId === partnerId && r.nightId === nightId);
          if (exists) {
            regs = regs.map((r) =>
              r.playerId === partnerId && r.nightId === nightId
                ? { ...r, checkedIn: true, paid: true, reservedFor: uidv, partnerId: uidv }
                : r
            );
          } else {
            regs = [
              ...regs,
              {
                playerId: partnerId,
                nightId,
                paid: true,
                checkedIn: true,
                anyPartner: false,
                requestedPartnerId: uidv,
                partnerId: uidv,
                reservedFor: uidv,
                provider: 'yoco',
              },
            ];
          }
        }
        set({ registrations: regs });
      },

      clearPartnerRequest: (nightId) => {
        const uidv = get().currentUserId;
        if (!uidv) return;
        set((s) => ({ registrations: releaseUserPartner(s.registrations, uidv, nightId) }));
      },

      pay: (nightId, provider) => {
        const s = get();
        const uidv = s.currentUserId;
        if (!uidv) return;

        const myReg = s.registrations.find((r) => r.playerId === uidv && r.nightId === nightId);
        const requested = myReg?.partnerId ?? myReg?.requestedPartnerId ?? null;
        const now = Date.now();

        const registrations = s.registrations.map((r) => {
          if (r.playerId === uidv && r.nightId === nightId) {
            return {
              ...r,
              paid: true,
              checkedIn: true,
              paidAt: now,
              provider,
              partnerId: requested,
              anyPartner: !requested,
            };
          }
          // Release the reservation → the held partner becomes an active lock.
          if (requested && r.playerId === requested && r.nightId === nightId) {
            return { ...r, checkedIn: true, paid: true, reservedFor: null, partnerId: uidv };
          }
          return r;
        });

        const waitingSince = { ...s.waitingSince, [uidv]: now };
        if (requested && waitingSince[requested] == null) waitingSince[requested] = now;

        set({ registrations, waitingSince, activeNightId: nightId });
        get().runMatchmaking();
      },

      runMatchmaking: () => {
        const s = get();
        const free = s.courts.filter((c) => !c.matchId);
        if (!free.length) return;

        const now = Date.now();
        const regs = regMapFor(s, s.simNightId);
        const players = byId(s.players);
        const recent = new Set(s.recentOpponentKeys);
        let queue = computeQueue({
          players: s.players,
          regsByPlayer: regs,
          liveMatches: s.matches.filter((m) => m.status === 'live'),
          waitingSince: s.waitingSince,
          now,
        });

        const newMatches: Match[] = [];
        const courtAssign: Record<number, string> = {};
        let userAssigned: string | null = null;

        for (const court of free) {
          const mu = nextMatchup(queue, players, recent);
          if (!mu) break;
          const involvesUser = s.currentUserId
            ? [...mu.teamA, ...mu.teamB].includes(s.currentUserId)
            : false;
          const match: Match = {
            id: uid('match'),
            courtId: court.id,
            teamA: mu.teamA,
            teamB: mu.teamB,
            scoreA: null,
            scoreB: null,
            status: 'live',
            startedAt: now,
            involvesUser,
          };
          newMatches.push(match);
          courtAssign[court.id] = match.id;
          if (involvesUser) userAssigned = match.id;
          queue = queue.filter((u) => !mu.usedUnitIds.includes(u.id));
        }

        if (!newMatches.length) return;
        set({
          matches: [...s.matches, ...newMatches],
          courts: s.courts.map((c) =>
            courtAssign[c.id] ? { ...c, matchId: courtAssign[c.id] } : c
          ),
          youreUpMatchId: userAssigned ?? s.youreUpMatchId,
        });
        if (userAssigned) haptic([40, 30, 40, 30, 140]);
      },

      submitScore: (matchId, scoreA, scoreB) => {
        const s = get();
        const match = s.matches.find((m) => m.id === matchId && m.status === 'live');
        if (!match) return;
        set(applyCompletion(s, match, scoreA, scoreB, RETURN_DELAY_USER, s.currentUserId ?? undefined));
        get().runMatchmaking();
      },

      simulateFinish: () => {
        const s = get();
        const live = s.matches.filter((m) => m.status === 'live' && !m.involvesUser);
        if (!live.length) return;
        const match = pick(live);
        // Realistic pickleball score: winner to 11, win by ≥2.
        const win = 11;
        const lose = pick([5, 6, 7, 8, 9, 9]);
        const [a, b] = Math.random() < 0.5 ? [win, lose] : [lose, win];
        set(applyCompletion(s, match, a, b, RETURN_DELAY_SIM));
        get().runMatchmaking();
      },

      // Keeps the current user moving: if they're waiting on a locked partner
      // who's mid-game, wrap that game up; otherwise free a court so they get
      // matched within seconds rather than waiting on the ambient 25–45s sim.
      tickAssist: () => {
        const s = get();
        const uidv = s.currentUserId;
        if (!uidv) return;
        const reg = s.registrations.find(
          (r) => r.playerId === uidv && r.nightId === s.simNightId && r.checkedIn && r.paid
        );
        if (!reg) return;
        const userInLive = s.matches.some(
          (m) => m.status === 'live' && [...m.teamA, ...m.teamB].includes(uidv)
        );
        if (userInLive) return;

        // Waiting for a locked partner who's still on court → end their game.
        if (reg.partnerId) {
          const pMatch = s.matches.find(
            (m) => m.status === 'live' && [...m.teamA, ...m.teamB].includes(reg.partnerId!)
          );
          if (pMatch) {
            get().overrideScore(pMatch.id, 11, randInt(4, 9));
            return;
          }
        }

        const queued = (s.waitingSince[uidv] ?? Infinity) <= Date.now();
        if (!queued) return;
        if (s.courts.some((c) => !c.matchId)) get().runMatchmaking();
        else get().simulateFinish();
      },

      dismissYoureUp: () => set({ youreUpMatchId: null }),
      clearCelebrate: () => set({ celebrate: null }),

      // ── Admin ──
      addWalkIn: (name, skill) => {
        const s = get();
        const id = uid('walk');
        const player: Player = {
          id,
          name,
          nickname: name.split(' ')[0],
          skill,
          emoji: '🚶',
          avatarUrl: null,
          rating: skill === 'Advanced' ? 1380 : skill === 'Intermediate' ? 1250 : 1150,
          wins: 0,
          losses: 0,
          points: 0,
          streak: 0,
          tonightWins: 0,
          tonightLosses: 0,
          tonightPoints: 0,
          mondayWins: 0,
          mondayLosses: 0,
          mondayPoints: 0,
          isWalkIn: true,
        };
        const now = Date.now();
        set({
          players: [...s.players, player],
          registrations: [
            ...s.registrations,
            {
              playerId: id,
              nightId: s.simNightId,
              paid: true,
              checkedIn: true,
              anyPartner: true,
              requestedPartnerId: null,
              partnerId: null,
              paidAt: now,
              provider: 'yoco',
            },
          ],
          waitingSince: { ...s.waitingSince, [id]: now },
        });
        get().runMatchmaking();
      },

      overrideScore: (matchId, a, b) => {
        const s = get();
        const match = s.matches.find((m) => m.id === matchId && m.status === 'live');
        if (!match) return;
        set(applyCompletion(s, match, a, b, RETURN_DELAY_SIM));
        get().runMatchmaking();
      },

      endNight: () => {
        set((s) => ({
          matches: s.matches.map((m) =>
            m.status === 'live' ? { ...m, status: 'completed' as const, completedAt: Date.now() } : m
          ),
          courts: makeCourts(),
          registrations: s.registrations.filter((r) => r.nightId !== s.simNightId),
          waitingSince: {},
        }));
      },

      resetNight: () => {
        const s = get();
        // Reset tonight counters, then reseed a fresh lively night.
        set({
          players: s.players.map((p) => ({
            ...p,
            tonightWins: 0,
            tonightLosses: 0,
            tonightPoints: 0,
          })),
          registrations: s.registrations.filter((r) => r.playerId === s.currentUserId && !r.nightId.startsWith('night-')),
          matches: [],
          courts: makeCourts(),
          waitingSince: {},
          recentOpponentKeys: [],
          lastResult: {},
        });
        const night = get().simNightId;
        set({ simNightId: '__none__' }); // force reseed
        get().ensureNightSeeded(night);
      },
    }),
    {
      name: 'eagles-store-v1',
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({
        players: s.players,
        nights: s.nights,
        registrations: s.registrations,
        courts: s.courts,
        matches: s.matches,
        waitingSince: s.waitingSince,
        recentOpponentKeys: s.recentOpponentKeys,
        lastResult: s.lastResult,
        currentUserId: s.currentUserId,
        activeNightId: s.activeNightId,
        simNightId: s.simNightId,
        initialized: s.initialized,
      }),
    }
  )
);

// =====================================================================
//  Selectors — pure reads over the store (used across components).
// =====================================================================
export function playersMap(s: State): Record<string, Player> {
  return byId(s.players);
}

export function currentUser(s: State): Player | null {
  return s.players.find((p) => p.id === s.currentUserId) ?? null;
}

export function simNight(s: State): LeagueNight | undefined {
  return s.nights.find((n) => n.id === s.simNightId);
}

export function userRegistration(s: State, nightId: string): Registration | undefined {
  return s.registrations.find((r) => r.playerId === s.currentUserId && r.nightId === nightId);
}

export function liveMatches(s: State): Match[] {
  return s.matches.filter((m) => m.status === 'live');
}

export function userLiveMatch(s: State): Match | undefined {
  if (!s.currentUserId) return undefined;
  return s.matches.find(
    (m) => m.status === 'live' && [...m.teamA, ...m.teamB].includes(s.currentUserId!)
  );
}

export function queueUnits(s: State): QueueUnit[] {
  return computeQueue({
    players: s.players,
    regsByPlayer: regMapFor(s, s.simNightId),
    liveMatches: liveMatches(s),
    waitingSince: s.waitingSince,
    now: Date.now(),
  });
}

/** Checked-in count for a night; other nights show a cosmetic preview. */
export function nightCounts(s: State, nightId: string): { players: number; spotsLeft: number } {
  if (nightId === s.simNightId) {
    const players = s.registrations.filter((r) => r.nightId === nightId && r.checkedIn).length;
    return { players, spotsLeft: Math.max(0, NIGHT_CAP - players) };
  }
  // Deterministic social-proof number for the not-yet-active night.
  const preview = nightId === 'night-wednesday' ? 8 : 6;
  return { players: preview, spotsLeft: NIGHT_CAP - preview };
}

export interface BoardRow {
  player: Player;
  rank: number;
  wins: number;
  losses: number;
  points: number;
  move: 'up' | 'down' | 'none';
  isUser: boolean;
}

export function board(s: State, key: BoardKey): BoardRow[] {
  const pick3 = (p: Player) => {
    if (key === 'tonight') return { w: p.tonightWins, l: p.tonightLosses, pts: p.tonightPoints };
    if (key === 'mondays') return { w: p.mondayWins, l: p.mondayLosses, pts: p.mondayPoints };
    return { w: p.wins, l: p.losses, pts: p.points };
  };

  let pool = s.players;
  if (key === 'tonight') {
    const checkedIn = new Set(
      s.registrations.filter((r) => r.nightId === s.simNightId && r.checkedIn).map((r) => r.playerId)
    );
    pool = s.players.filter(
      (p) => checkedIn.has(p.id) || p.tonightWins + p.tonightLosses > 0 || p.id === s.currentUserId
    );
  }

  const rows = pool
    .map((p) => {
      const v = pick3(p);
      const last = s.lastResult[p.id];
      return {
        player: p,
        rank: 0,
        wins: v.w,
        losses: v.l,
        points: v.pts,
        move: (key === 'tonight' ? (last === 'W' ? 'up' : last === 'L' ? 'down' : 'none') : 'none') as
          | 'up'
          | 'down'
          | 'none',
        isUser: p.id === s.currentUserId,
      };
    })
    .sort((a, b) => b.points - a.points || b.wins - a.wins || a.player.rating - b.player.rating);

  rows.forEach((r, i) => (r.rank = i + 1));
  return rows;
}

export function matchById(s: State, id: string | null): Match | undefined {
  if (!id) return undefined;
  return s.matches.find((m) => m.id === id);
}
