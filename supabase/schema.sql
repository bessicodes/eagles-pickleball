-- =====================================================================
--  EAGLES PICKLEBALL — NORTHCLIFF
--  Supabase schema: tables, relationships, RLS, and matchmaking helpers.
--  Run this in the Supabase SQL editor, then run seed.sql.
-- =====================================================================

-- Extensions ----------------------------------------------------------
create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------
--  PLAYERS  (profile, linked 1:1 to auth.users)
-- ---------------------------------------------------------------------
create table if not exists public.players (
  id            uuid primary key default gen_random_uuid(),
  auth_id       uuid unique references auth.users(id) on delete cascade,
  name          text not null,
  nickname      text not null,
  skill         text not null default 'Intermediate'
                  check (skill in ('Beginner','Intermediate','Advanced')),
  avatar_url    text,
  emoji         text default '🦅',
  rating        int  not null default 1200,
  wins          int  not null default 0,
  losses        int  not null default 0,
  points        int  not null default 0,
  streak        int  not null default 0,
  is_walk_in    boolean not null default false,
  created_at    timestamptz not null default now()
);

-- ---------------------------------------------------------------------
--  LEAGUE NIGHTS  (Monday / Wednesday 18:30, entry R55)
-- ---------------------------------------------------------------------
create table if not exists public.league_nights (
  id          uuid primary key default gen_random_uuid(),
  day         text not null check (day in ('Monday','Wednesday')),
  night_date  date not null,
  start_time  time not null default '18:30',
  entry_cents int  not null default 5500,           -- R55.00
  status      text not null default 'open'
                check (status in ('open','live','closed')),
  created_at  timestamptz not null default now(),
  unique (night_date)
);

-- ---------------------------------------------------------------------
--  COURTS  (4 physical courts)
-- ---------------------------------------------------------------------
create table if not exists public.courts (
  id        int primary key,                          -- 1..4
  name      text not null,
  night_id  uuid references public.league_nights(id) on delete cascade,
  match_id  uuid                                       -- current live match
);

-- ---------------------------------------------------------------------
--  REGISTRATIONS  (a player joining a night, payment + check-in)
-- ---------------------------------------------------------------------
create table if not exists public.registrations (
  id                    uuid primary key default gen_random_uuid(),
  night_id              uuid not null references public.league_nights(id) on delete cascade,
  player_id             uuid not null references public.players(id) on delete cascade,
  paid                  boolean not null default false,
  checked_in            boolean not null default false,
  requested_partner_id  uuid references public.players(id),
  partner_id            uuid references public.players(id),   -- locked when mutual
  any_partner           boolean not null default false,
  amount_cents          int not null default 5500,
  provider              text,                                  -- 'yoco' | 'paystack'
  paid_at               timestamptz,
  created_at            timestamptz not null default now(),
  unique (night_id, player_id)
);

-- ---------------------------------------------------------------------
--  QUEUE ENTRIES  (FIFO units — a single player or a locked pair)
-- ---------------------------------------------------------------------
create table if not exists public.queue_entries (
  id         uuid primary key default gen_random_uuid(),
  night_id   uuid not null references public.league_nights(id) on delete cascade,
  player_ids uuid[] not null,                          -- 1 or 2 players
  joined_at  timestamptz not null default now()
);

-- ---------------------------------------------------------------------
--  MATCHES  (2v2 game on a court)
-- ---------------------------------------------------------------------
create table if not exists public.matches (
  id           uuid primary key default gen_random_uuid(),
  night_id     uuid not null references public.league_nights(id) on delete cascade,
  court_id     int  references public.courts(id),
  team_a       uuid[] not null,                         -- 2 player ids
  team_b       uuid[] not null,
  score_a      int,
  score_b      int,
  status       text not null default 'live'
                 check (status in ('live','completed')),
  submitted_by uuid references public.players(id),
  started_at   timestamptz not null default now(),
  completed_at timestamptz
);

-- Add the FK from courts -> matches after matches exists.
do $$ begin
  alter table public.courts
    add constraint courts_match_fk
    foreign key (match_id) references public.matches(id) on delete set null;
exception when duplicate_object then null; end $$;

-- Helpful indexes -----------------------------------------------------
create index if not exists idx_reg_night        on public.registrations(night_id);
create index if not exists idx_queue_night       on public.queue_entries(night_id, joined_at);
create index if not exists idx_matches_night     on public.matches(night_id, status);

-- =====================================================================
--  SCORING FUNCTION
--  Points = 3 for a win + the point differential. Updates W/L + streak.
-- =====================================================================
create or replace function public.complete_match(
  p_match_id uuid,
  p_score_a  int,
  p_score_b  int
) returns void language plpgsql security definer as $$
declare
  m           public.matches%rowtype;
  winners     uuid[];
  losers      uuid[];
  diff        int;
  win_points  int;
begin
  select * into m from public.matches where id = p_match_id and status = 'live';
  if not found then return; end if;

  diff := abs(p_score_a - p_score_b);
  win_points := 3 + diff;

  if p_score_a > p_score_b then
    winners := m.team_a; losers := m.team_b;
  else
    winners := m.team_b; losers := m.team_a;
  end if;

  update public.players
     set wins   = wins + 1,
         points = points + win_points,
         streak = streak + 1,
         rating = rating + 8
   where id = any(winners);

  update public.players
     set losses = losses + 1,
         streak = 0,
         rating = greatest(800, rating - 6)
   where id = any(losers);

  update public.matches
     set status = 'completed', score_a = p_score_a, score_b = p_score_b,
         completed_at = now()
   where id = p_match_id;

  update public.courts set match_id = null where match_id = p_match_id;
end $$;

-- =====================================================================
--  ROW LEVEL SECURITY
--  Read: anyone signed in can read the league state (leaderboard, courts).
--  Write: a player can only mutate their own rows; scoring via RPC.
-- =====================================================================
alter table public.players        enable row level security;
alter table public.league_nights  enable row level security;
alter table public.courts         enable row level security;
alter table public.registrations  enable row level security;
alter table public.queue_entries  enable row level security;
alter table public.matches        enable row level security;

-- Players ----------------------------------------------------------
create policy "players readable"           on public.players
  for select using (true);
create policy "insert own player"          on public.players
  for insert with check (auth.uid() = auth_id);
create policy "update own player"          on public.players
  for update using (auth.uid() = auth_id);

-- League nights + courts are public read-only for clients.
create policy "nights readable"            on public.league_nights
  for select using (true);
create policy "courts readable"            on public.courts
  for select using (true);

-- Registrations ----------------------------------------------------
create policy "read registrations"         on public.registrations
  for select using (true);
create policy "insert own registration"    on public.registrations
  for insert with check (
    player_id in (select id from public.players where auth_id = auth.uid())
  );
create policy "update own registration"    on public.registrations
  for update using (
    player_id in (select id from public.players where auth_id = auth.uid())
  );

-- Queue + matches are readable by all; writes happen through RPCs /
-- an admin/service role in production.
create policy "read queue"                 on public.queue_entries
  for select using (true);
create policy "read matches"               on public.matches
  for select using (true);

-- =====================================================================
--  REALTIME
--  Add the live tables to the realtime publication.
-- =====================================================================
do $$ begin
  alter publication supabase_realtime add table public.courts;
  alter publication supabase_realtime add table public.matches;
  alter publication supabase_realtime add table public.queue_entries;
  alter publication supabase_realtime add table public.registrations;
  alter publication supabase_realtime add table public.players;
exception when duplicate_object then null; end $$;
