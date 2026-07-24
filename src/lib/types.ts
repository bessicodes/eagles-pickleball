// =====================================================================
//  Domain types — mirror the Supabase schema so the local engine and a
//  real Supabase backend stay 1:1 (see supabase/schema.sql).
// =====================================================================

export type SkillLevel = 'Beginner' | 'Intermediate' | 'Advanced';
export type DayName = 'Monday' | 'Wednesday';

export interface Player {
  id: string;
  name: string;
  nickname: string;
  skill: SkillLevel;
  emoji: string;
  avatarUrl?: string | null; // uploaded photo (downscaled data URL)
  accent?: string | null; // chosen accent colour for the monogram avatar
  rating: number;

  // All-time record
  wins: number;
  losses: number;
  points: number;
  streak: number; // current win streak (resets on loss)
  bestStreak: number; // longest win streak ever

  // Tonight-only record (reset when the night is reset)
  tonightWins: number;
  tonightLosses: number;
  tonightPoints: number;

  // Monday board (seeded history so the tab isn't empty)
  mondayWins: number;
  mondayLosses: number;
  mondayPoints: number;

  isCurrentUser?: boolean;
  isWalkIn?: boolean;
}

export interface LeagueNight {
  id: string;
  day: DayName;
  label: string; // "Monday League"
  time: string; // "18:30"
  entryCents: number; // 5500 = R55
  dateLabel: string; // "Mon 21 Jul"
}

export interface Registration {
  playerId: string;
  nightId: string;
  paid: boolean;
  checkedIn: boolean;
  requestedPartnerId?: string | null;
  partnerId?: string | null; // locked when mutual
  anyPartner: boolean;
  paidAt?: number;
  provider?: 'yoco' | 'paystack';
  // Set on a player who has been requested by (and is being held for) a user
  // who hasn't finished paying yet. Held out of matchmaking until released.
  reservedFor?: string | null;
}

/** A FIFO queue unit: one player, or a locked pair (2 players). */
export interface QueueUnit {
  id: string;
  playerIds: string[]; // length 1 or 2
  joinedAt: number;
}

export interface Match {
  id: string;
  courtId: number;
  teamA: string[]; // 2 player ids
  teamB: string[];
  scoreA: number | null;
  scoreB: number | null;
  status: 'live' | 'completed';
  startedAt: number;
  completedAt?: number;
  submittedBy?: string;
  involvesUser: boolean; // convenience flag for the sim
}

export interface Court {
  id: number;
  name: string;
  matchId: string | null;
}

export type TabKey = 'tonight' | 'courts' | 'leaderboard' | 'profile';
export type BoardKey = 'tonight' | 'mondays' | 'alltime';
