// =====================================================================
//  Matchmaking engine — pure, deterministic helpers.
//
//  Rules (from the brief):
//   • Queue is FIFO but respects locked partner pairs.
//   • When 4 players are ready and a court is free, create a 2v2 match.
//   • Keep requested partners on the same team.
//   • Balance the two teams by total rating.
//   • Avoid immediate rematches against the same opponents when possible.
// =====================================================================

import type { Match, Player, QueueUnit, Registration } from './types';

/** Canonical key for an unordered player pair (opponent-history tracking). */
export function pairKey(a: string, b: string): string {
  return a < b ? `${a}|${b}` : `${b}|${a}`;
}

/** All cross-team opponent pairs for a matchup. */
export function crossPairs(teamA: string[], teamB: string[]): string[] {
  const out: string[] = [];
  for (const a of teamA) for (const b of teamB) out.push(pairKey(a, b));
  return out;
}

function teamRating(team: string[], players: Record<string, Player>): number {
  return team.reduce((sum, id) => sum + (players[id]?.rating ?? 1200), 0);
}

/**
 * Derive the live FIFO queue from the source-of-truth state.
 * A player is "waiting" when they're paid + checked-in, not in a live match,
 * and their re-entry time (waitingSince) has passed. Mutual partners who are
 * both waiting collapse into a single pair unit, ordered by the earliest of
 * the two join times.
 */
export function computeQueue(args: {
  players: Player[];
  regsByPlayer: Record<string, Registration>;
  liveMatches: Match[];
  waitingSince: Record<string, number>;
  now: number;
}): QueueUnit[] {
  const { players, regsByPlayer, liveMatches, waitingSince, now } = args;

  const inLive = new Set<string>();
  for (const m of liveMatches) {
    for (const id of [...m.teamA, ...m.teamB]) inLive.add(id);
  }

  const waiting = players
    .filter((p) => {
      const r = regsByPlayer[p.id];
      if (!r || !r.paid || !r.checkedIn) return false;
      if (inLive.has(p.id)) return false;
      if (r.reservedFor) return false; // held for a user still paying
      const since = waitingSince[p.id] ?? 0;
      return since <= now; // future timestamp = still on 5s cool-down
    })
    .map((p) => p.id)
    .sort((a, b) => (waitingSince[a] ?? 0) - (waitingSince[b] ?? 0));

  const waitingSet = new Set(waiting);

  // A locked partner who isn't waiting yet but is still in play (mid-match or
  // on cool-down) will return — so we hold their teammate rather than pairing
  // them with strangers.
  const willReturn = (id: string): boolean => {
    const r = regsByPlayer[id];
    return !!r && r.checkedIn && r.paid;
  };

  const used = new Set<string>();
  const units: QueueUnit[] = [];

  for (const id of waiting) {
    if (used.has(id)) continue;
    const r = regsByPlayer[id];
    const partner = r?.partnerId ?? null;
    const partnerMutual = !!partner && regsByPlayer[partner]?.partnerId === id;

    if (partnerMutual && partner && waitingSet.has(partner) && !used.has(partner)) {
      // Both locked partners are ready → pair them.
      used.add(id);
      used.add(partner);
      units.push({
        id: `u-${pairKey(id, partner)}`,
        playerIds: [id, partner],
        joinedAt: Math.min(waitingSince[id] ?? 0, waitingSince[partner] ?? 0),
      });
    } else if (partnerMutual && partner && willReturn(partner)) {
      // Partner is briefly busy — hold this player out until they're back.
      used.add(id);
    } else {
      used.add(id);
      units.push({ id: `u-${id}`, playerIds: [id], joinedAt: waitingSince[id] ?? 0 });
    }
  }

  units.sort((a, b) => a.joinedAt - b.joinedAt);
  return units;
}

export interface Matchup {
  teamA: string[];
  teamB: string[];
  usedUnitIds: string[];
}

/**
 * Select the next 4 players from the front of the queue and split them into
 * two balanced teams. Returns null if 4 players can't be assembled yet.
 */
export function nextMatchup(
  queue: QueueUnit[],
  players: Record<string, Player>,
  recent: Set<string>
): Matchup | null {
  // Greedily gather units front-to-back to exactly 4 players, skipping a unit
  // that would overshoot (keeps pairs intact without starving singles).
  const chosen: QueueUnit[] = [];
  let count = 0;
  for (const u of queue) {
    if (count === 4) break;
    if (count + u.playerIds.length <= 4) {
      chosen.push(u);
      count += u.playerIds.length;
    }
  }
  if (count < 4) return null;

  const pairs = chosen.filter((u) => u.playerIds.length === 2);
  const singles = chosen.filter((u) => u.playerIds.length === 1).map((u) => u.playerIds[0]);
  const usedUnitIds = chosen.map((u) => u.id);

  let teamA: string[];
  let teamB: string[];

  if (pairs.length === 2) {
    // Two locked pairs face off.
    teamA = pairs[0].playerIds;
    teamB = pairs[1].playerIds;
  } else if (pairs.length === 1) {
    // A locked pair vs the two singles.
    teamA = pairs[0].playerIds;
    teamB = singles;
  } else {
    // Four singles: strongest + weakest vs the middle two → tightest balance.
    const sorted = [...singles].sort((a, b) => players[b].rating - players[a].rating);
    teamA = [sorted[0], sorted[3]];
    teamB = [sorted[1], sorted[2]];

    // Avoid an immediate rematch if an alternate split is fresher.
    if (isRematch(teamA, teamB, recent)) {
      const altA = [sorted[0], sorted[2]];
      const altB = [sorted[1], sorted[3]];
      if (!isRematch(altA, altB, recent)) {
        teamA = altA;
        teamB = altB;
      }
    }
  }

  return { teamA, teamB, usedUnitIds };
}

/** True when most cross-team pairings were just played. */
function isRematch(teamA: string[], teamB: string[], recent: Set<string>): boolean {
  const cp = crossPairs(teamA, teamB);
  const repeats = cp.filter((k) => recent.has(k)).length;
  return repeats >= 3;
}

/** Rating gap between the two teams (0 = perfectly balanced). */
export function ratingGap(
  teamA: string[],
  teamB: string[],
  players: Record<string, Player>
): number {
  return Math.abs(teamRating(teamA, players) - teamRating(teamB, players));
}
