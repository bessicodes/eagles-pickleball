-- =====================================================================
--  EAGLES PICKLEBALL — seed data
--  24 realistic South African players + this week's league nights + 4 courts.
--  Run AFTER schema.sql.
-- =====================================================================

insert into public.players (name, nickname, skill, emoji, rating, wins, losses, points, streak) values
  ('Ruan Bester',        'Bessie',   'Advanced',     '🦅', 1520, 41, 18, 168, 4),
  ('Jandré van Wyk',     'JD',       'Advanced',     '🔥', 1495, 38, 20, 151, 0),
  ('Thabo Mokoena',      'T-Bo',     'Advanced',     '⚡', 1488, 36, 19, 149, 2),
  ('Lerato Dlamini',     'Rato',     'Advanced',     '🌟', 1472, 34, 21, 142, 1),
  ('Pieter Coetzee',     'Pekkie',   'Intermediate', '🎯', 1360, 28, 24, 118, 0),
  ('Naledi Khumalo',     'Nax',      'Intermediate', '💫', 1355, 27, 25, 115, 3),
  ('Johan Pretorius',    'Joker',    'Intermediate', '🃏', 1348, 26, 26, 111, 0),
  ('Ayanda Zulu',        'Ace',      'Intermediate', '🎾', 1342, 25, 24, 108, 1),
  ('Marié du Toit',      'Riri',     'Intermediate', '🌸', 1335, 24, 26, 104, 0),
  ('Sipho Ndlovu',       'Speedy',   'Intermediate', '🚀', 1330, 24, 27, 102, 2),
  ('Hendrik Botha',      'Hennie',   'Intermediate', '🐻', 1322, 23, 25, 99,  0),
  ('Zanele Mahlangu',    'Zee',      'Intermediate', '🦋', 1318, 22, 24, 96,  1),
  ('Willem Fourie',      'Wimpie',   'Intermediate', '⚙️', 1305, 21, 26, 92,  0),
  ('Boitumelo Sithole',  'Tumi',     'Intermediate', '🍀', 1298, 20, 25, 88,  0),
  ('Kobus Steyn',        'Kobie',    'Beginner',     '🛠️', 1210, 14, 28, 62,  0),
  ('Precious Nkosi',     'Presh',    'Beginner',     '💎', 1205, 13, 27, 59,  1),
  ('Ruben Nel',          'Rubes',    'Beginner',     '🎲', 1198, 12, 26, 55,  0),
  ('Nomsa Radebe',       'Nomz',     'Beginner',     '🌼', 1192, 12, 28, 53,  0),
  ('Deon Venter',        'Deo',      'Beginner',     '🎸', 1185, 11, 27, 50,  0),
  ('Karabo Molefe',      'KB',       'Beginner',     '🧩', 1180, 10, 26, 47,  2),
  ('Anke Grobler',       'Ankie',    'Beginner',     '🐝', 1174, 10, 28, 45,  0),
  ('Sibusiso Mthembu',   'Sbu',      'Beginner',     '🥁', 1168,  9, 27, 42,  0),
  ('Elmarie Joubert',    'Elmz',     'Beginner',     '🌺', 1162,  8, 26, 39,  0),
  ('Tshepo Maluleke',    'Shepo',    'Beginner',     '🐆', 1155,  8, 28, 37,  1);

-- This week's league nights (adjust the dates to your real week).
insert into public.league_nights (day, night_date, start_time, entry_cents, status) values
  ('Monday',    (date_trunc('week', now()) + interval '0 day')::date, '18:30', 5500, 'open'),
  ('Wednesday', (date_trunc('week', now()) + interval '2 day')::date, '18:30', 5500, 'open');

-- 4 courts, bound to the Monday night by default.
insert into public.courts (id, name, night_id)
select g, 'Court ' || g,
       (select id from public.league_nights where day = 'Monday' limit 1)
from generate_series(1,4) as g;
