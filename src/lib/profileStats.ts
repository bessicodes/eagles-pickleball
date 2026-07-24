// =====================================================================
//  Shared profile stats — used by your own profile and the public
//  player-profile viewer so the numbers are computed identically.
// =====================================================================

import type { Match, Player } from './types';

/** A player's completed matches, newest first. */
export function playerMatches(playerId: string, matches: Match[]): Match[] {
  return matches
    .filter((m) => m.status === 'completed' && [...m.teamA, ...m.teamB].includes(playerId))
    .sort((a, b) => (b.completedAt ?? 0) - (a.completedAt ?? 0));
}

export function resultFor(playerId: string, m: Match): { mine: number; opp: number; won: boolean } {
  const onA = m.teamA.includes(playerId);
  const mine = (onA ? m.scoreA : m.scoreB) ?? 0;
  const opp = (onA ? m.scoreB : m.scoreA) ?? 0;
  return { mine, opp, won: mine > opp };
}

/** Last N results as W/L (newest first). */
export function formGuide(playerId: string, matches: Match[], n = 5): Array<'W' | 'L'> {
  return playerMatches(playerId, matches)
    .slice(0, n)
    .map((m) => (resultFor(playerId, m).won ? 'W' : 'L'));
}

export function hasBigWin(playerId: string, matches: Match[]): boolean {
  return playerMatches(playerId, matches).some((m) => {
    const r = resultFor(playerId, m);
    return r.won && r.mine - r.opp >= 8;
  });
}

/** Teammate this player has partnered with most. */
export function favouritePartner(
  playerId: string,
  matches: Match[]
): { id: string; games: number } | null {
  const counts: Record<string, number> = {};
  for (const m of playerMatches(playerId, matches)) {
    const team = m.teamA.includes(playerId) ? m.teamA : m.teamB;
    for (const id of team) if (id !== playerId) counts[id] = (counts[id] ?? 0) + 1;
  }
  const top = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
  return top ? { id: top[0], games: top[1] } : null;
}

export interface Achievement {
  id: string;
  label: string;
  hint: string;
  earned: boolean;
}

export function achievementsFor(p: Player, matches: Match[], rank: number | null): Achievement[] {
  const games = p.wins + p.losses;
  return [
    { id: 'debut', label: 'Debut', hint: 'Play your first game', earned: games >= 1 },
    { id: 'firstwin', label: 'First Win', hint: 'Win a game', earned: p.wins >= 1 },
    { id: 'streak', label: 'On Fire', hint: '3-win streak', earned: (p.bestStreak ?? 0) >= 3 },
    { id: 'blowout', label: 'Blowout', hint: 'Win by 8+', earned: hasBigWin(p.id, matches) },
    { id: 'century', label: 'Centurion', hint: '100 career points', earned: p.points >= 100 },
    { id: 'podium', label: 'Podium', hint: 'Top 3 all-time', earned: !!rank && rank <= 3 },
  ];
}

/** Your record with/against another player. */
export function headToHead(
  meId: string,
  otherId: string,
  matches: Match[]
): { together: number; vs: { w: number; l: number } } {
  let together = 0;
  let w = 0;
  let l = 0;
  for (const m of matches) {
    if (m.status !== 'completed') continue;
    const all = [...m.teamA, ...m.teamB];
    if (!all.includes(meId) || !all.includes(otherId)) continue;
    const sameTeam = m.teamA.includes(meId) === m.teamA.includes(otherId);
    if (sameTeam) {
      together++;
    } else {
      resultFor(meId, m).won ? w++ : l++;
    }
  }
  return { together, vs: { w, l } };
}
