// =====================================================================
//  Seed data — 24 realistic South African players + the two league nights.
//  Used by the local engine; mirrors supabase/seed.sql.
// =====================================================================

import type { LeagueNight, Player, SkillLevel } from './types';

interface SeedRow {
  name: string;
  nickname: string;
  skill: SkillLevel;
  emoji: string;
  rating: number;
  wins: number;
  losses: number;
  points: number;
  streak: number;
}

const ROWS: SeedRow[] = [
  { name: 'Jandré van Wyk',   nickname: 'JD',     skill: 'Advanced',     emoji: '🔥', rating: 1495, wins: 38, losses: 20, points: 151, streak: 0 },
  { name: 'Thabo Mokoena',    nickname: 'T-Bo',   skill: 'Advanced',     emoji: '⚡', rating: 1488, wins: 36, losses: 19, points: 149, streak: 2 },
  { name: 'Lerato Dlamini',   nickname: 'Rato',   skill: 'Advanced',     emoji: '🌟', rating: 1472, wins: 34, losses: 21, points: 142, streak: 1 },
  { name: 'Pieter Coetzee',   nickname: 'Pekkie', skill: 'Intermediate', emoji: '🎯', rating: 1360, wins: 28, losses: 24, points: 118, streak: 0 },
  { name: 'Naledi Khumalo',   nickname: 'Nax',    skill: 'Intermediate', emoji: '💫', rating: 1355, wins: 27, losses: 25, points: 115, streak: 3 },
  { name: 'Johan Pretorius',  nickname: 'Joker',  skill: 'Intermediate', emoji: '🃏', rating: 1348, wins: 26, losses: 26, points: 111, streak: 0 },
  { name: 'Ayanda Zulu',      nickname: 'Ace',    skill: 'Intermediate', emoji: '🎾', rating: 1342, wins: 25, losses: 24, points: 108, streak: 1 },
  { name: 'Marié du Toit',    nickname: 'Riri',   skill: 'Intermediate', emoji: '🌸', rating: 1335, wins: 24, losses: 26, points: 104, streak: 0 },
  { name: 'Sipho Ndlovu',     nickname: 'Speedy', skill: 'Intermediate', emoji: '🚀', rating: 1330, wins: 24, losses: 27, points: 102, streak: 2 },
  { name: 'Hendrik Botha',    nickname: 'Hennie', skill: 'Intermediate', emoji: '🐻', rating: 1322, wins: 23, losses: 25, points: 99,  streak: 0 },
  { name: 'Zanele Mahlangu',  nickname: 'Zee',    skill: 'Intermediate', emoji: '🦋', rating: 1318, wins: 22, losses: 24, points: 96,  streak: 1 },
  { name: 'Willem Fourie',    nickname: 'Wimpie', skill: 'Intermediate', emoji: '🛠️', rating: 1305, wins: 21, losses: 26, points: 92,  streak: 0 },
  { name: 'Boitumelo Sithole',nickname: 'Tumi',   skill: 'Intermediate', emoji: '🍀', rating: 1298, wins: 20, losses: 25, points: 88,  streak: 0 },
  { name: 'Kobus Steyn',      nickname: 'Kobie',  skill: 'Beginner',     emoji: '🎸', rating: 1210, wins: 14, losses: 28, points: 62,  streak: 0 },
  { name: 'Precious Nkosi',   nickname: 'Presh',  skill: 'Beginner',     emoji: '💎', rating: 1205, wins: 13, losses: 27, points: 59,  streak: 1 },
  { name: 'Ruben Nel',        nickname: 'Rubes',  skill: 'Beginner',     emoji: '🎲', rating: 1198, wins: 12, losses: 26, points: 55,  streak: 0 },
  { name: 'Nomsa Radebe',     nickname: 'Nomz',   skill: 'Beginner',     emoji: '🌼', rating: 1192, wins: 12, losses: 28, points: 53,  streak: 0 },
  { name: 'Deon Venter',      nickname: 'Deo',    skill: 'Beginner',     emoji: '🥁', rating: 1185, wins: 11, losses: 27, points: 50,  streak: 0 },
  { name: 'Karabo Molefe',    nickname: 'KB',     skill: 'Beginner',     emoji: '🧩', rating: 1180, wins: 10, losses: 26, points: 47,  streak: 2 },
  { name: 'Anke Grobler',     nickname: 'Ankie',  skill: 'Beginner',     emoji: '🐝', rating: 1174, wins: 10, losses: 28, points: 45,  streak: 0 },
  { name: 'Sibusiso Mthembu', nickname: 'Sbu',    skill: 'Beginner',     emoji: '🐆', rating: 1168, wins: 9,  losses: 27, points: 42,  streak: 0 },
  { name: 'Elmarie Joubert',  nickname: 'Elmz',   skill: 'Beginner',     emoji: '🌺', rating: 1162, wins: 8,  losses: 26, points: 39,  streak: 0 },
  { name: 'Tshepo Maluleke',  nickname: 'Shepo',  skill: 'Beginner',     emoji: '🦓', rating: 1155, wins: 8,  losses: 28, points: 37,  streak: 1 },
  { name: 'Anele Booysen',    nickname: 'Nel',    skill: 'Intermediate', emoji: '🌊', rating: 1312, wins: 22, losses: 26, points: 95,  streak: 0 },
];

/** Build the 24 seeded players. Deterministic ids so realtime keys are stable. */
export function seedPlayers(): Player[] {
  return ROWS.map((r, i) => ({
    id: `seed-${i + 1}`,
    name: r.name,
    nickname: r.nickname,
    skill: r.skill,
    emoji: r.emoji,
    avatarUrl: null,
    rating: r.rating,
    wins: r.wins,
    losses: r.losses,
    points: r.points,
    streak: r.streak,
    bestStreak: Math.max(r.streak, Math.round(r.wins / 5) + 2),
    accent: null,
    tonightWins: 0,
    tonightLosses: 0,
    tonightPoints: 0,
    // Seed a Monday history that roughly tracks all-time skill.
    mondayWins: Math.round(r.wins * 0.45),
    mondayLosses: Math.round(r.losses * 0.45),
    mondayPoints: Math.round(r.points * 0.45),
    isCurrentUser: false,
    isWalkIn: false,
  }));
}

/** The two weekly league nights, dated to the current week. */
export function seedNights(now = new Date()): LeagueNight[] {
  // Find this week's Monday (local).
  const monday = new Date(now);
  const day = (monday.getDay() + 6) % 7; // 0 = Monday
  monday.setDate(monday.getDate() - day);
  const wednesday = new Date(monday);
  wednesday.setDate(monday.getDate() + 2);

  const fmt = (d: Date) =>
    d.toLocaleDateString('en-ZA', { weekday: 'short', day: '2-digit', month: 'short' });

  return [
    {
      id: 'night-monday',
      day: 'Monday',
      label: 'Monday League',
      time: '18:30',
      entryCents: 5500,
      dateLabel: fmt(monday),
    },
    {
      id: 'night-wednesday',
      day: 'Wednesday',
      label: 'Wednesday League',
      time: '18:30',
      entryCents: 5500,
      dateLabel: fmt(wednesday),
    },
  ];
}
