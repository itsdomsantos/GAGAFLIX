-- ============================================================
-- GAGAFLIX — database schema (Supabase / Postgres)
-- Run this file ONCE in your Supabase project's SQL Editor:
-- Dashboard → SQL Editor → New query → paste everything → Run
-- ============================================================

-- Career eras
create table if not exists public.eras (
  slug        text primary key,
  name        text not null,
  years       text not null default '',
  description text not null default '',
  accent      text not null default '#e04e20',
  image_url   text,
  logo_url    text,
  sort        integer not null default 99
);

-- If you created the tables before logo_url existed, run just this line:
-- alter table public.eras add column if not exists logo_url text;

-- Videos (each video has ONE source: its link)
create table if not exists public.videos (
  id            uuid primary key default gen_random_uuid(),
  title         text not null,
  url           text not null,
  type          text not null check (type in ('live','mv','interview','fashion','doc')),
  era_slug      text references public.eras(slug) on update cascade on delete set null,
  event         text,
  date          date,
  thumbnail_url text,
  featured      boolean not null default false,
  created_at    timestamptz not null default now()
);

-- Timeline milestones
create table if not exists public.timeline_moments (
  id        uuid primary key default gen_random_uuid(),
  date      date not null,
  title     text not null,
  body      text,
  era_slug  text references public.eras(slug) on update cascade on delete set null,
  image_url text
);

-- Movies — 4:5 poster cards that link out to a subscription player
-- (Netflix, Disney+, Prime Video…). These are NOT hosted here: the cover is
-- a pasted image URL and the link opens the film on its streaming service.
-- (The homepage "Featured" row is just videos flagged featured, shown as
-- posters — it needs no table of its own.)
create table if not exists public.movies (
  id         uuid primary key default gen_random_uuid(),
  title      text not null,
  subtitle   text,
  cover_url  text,
  link       text,
  sort       integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists movies_sort_idx on public.movies (sort);

-- Already have the other tables and just want the movies section? Run this
-- block on its own (safe to run once):
--   create table if not exists public.movies (
--     id uuid primary key default gen_random_uuid(),
--     title text not null, subtitle text, cover_url text, link text,
--     sort integer not null default 0,
--     created_at timestamptz not null default now());
--   alter table public.movies enable row level security;
--   create policy "public read movies" on public.movies
--     for select using (true);
--   create policy "admin write movies" on public.movies
--     for all to authenticated using (true) with check (true);

-- Site analytics — one row per page view (privacy-friendly, no cookies,
-- no third parties, no personal data). visitor_id is a random id kept in
-- the browser's localStorage just to tell returning visitors apart.
create table if not exists public.page_views (
  id         uuid primary key default gen_random_uuid(),
  path       text not null,
  referrer   text,
  visitor_id text,
  country    text,
  created_at timestamptz not null default now()
);

-- Already had page_views before country existed? Run just this line:
-- alter table public.page_views add column if not exists country text;

-- Handy indexes for the stats dashboard.
create index if not exists page_views_created_at_idx on public.page_views (created_at desc);
create index if not exists page_views_path_idx on public.page_views (path);

-- Already have the other tables and just want analytics? Run this block on
-- its own (it's safe to run once):
--   create table if not exists public.page_views (
--     id uuid primary key default gen_random_uuid(),
--     path text not null, referrer text, visitor_id text, country text,
--     created_at timestamptz not null default now());
--   alter table public.page_views enable row level security;
--   create policy "public insert page_views" on public.page_views
--     for insert to anon, authenticated with check (true);
--   create policy "admin read page_views" on public.page_views
--     for select to authenticated using (true);

-- ------------------------------------------------------------
-- Security (RLS): everyone reads, only you (authenticated) write
-- ------------------------------------------------------------
alter table public.eras enable row level security;
alter table public.videos enable row level security;
alter table public.timeline_moments enable row level security;
alter table public.movies enable row level security;
alter table public.page_views enable row level security;

create policy "public read eras" on public.eras
  for select using (true);
create policy "admin write eras" on public.eras
  for all to authenticated using (true) with check (true);

create policy "public read videos" on public.videos
  for select using (true);
create policy "admin write videos" on public.videos
  for all to authenticated using (true) with check (true);

create policy "public read timeline" on public.timeline_moments
  for select using (true);
create policy "admin write timeline" on public.timeline_moments
  for all to authenticated using (true) with check (true);

create policy "public read movies" on public.movies
  for select using (true);
create policy "admin write movies" on public.movies
  for all to authenticated using (true) with check (true);

-- Analytics: anyone (the public site) can log a view, only you can read them.
create policy "public insert page_views" on public.page_views
  for insert to anon, authenticated with check (true);
create policy "admin read page_views" on public.page_views
  for select to authenticated using (true);

-- ------------------------------------------------------------
-- Starter content (the same the site shows without Supabase).
-- Edit or delete everything later in /admin.
-- ------------------------------------------------------------
insert into public.eras (slug, name, years, description, accent, sort) values
  ('the-fame', 'The Fame', '2008 – 2009', 'The debut that started it all: Just Dance, Poker Face and the birth of a pop phenomenon.', '#d4af37', 1),
  ('the-fame-monster', 'The Fame Monster', '2009 – 2010', 'The dark twin of The Fame: Bad Romance, Telephone, Alejandro and the Monster Ball that created the Haus.', '#b9bcc8', 2),
  ('born-this-way', 'Born This Way', '2011 – 2012', 'Leather, metal and an anthem of freedom. The era that founded the Little Monster nation.', '#9fb4c7', 3),
  ('artpop', 'ARTPOP', '2013 – 2014', 'Pop as art, art as pop. The most experimental and misunderstood era — and beloved by the fans for it.', '#a6e22e', 4),
  ('cheek-to-cheek', 'Cheek to Cheek', '2014 – 2015', 'Gaga meets Tony Bennett. A jazz standards album that proved the range behind the pop provocateur.', '#e63946', 5),
  ('joanne', 'Joanne', '2016 – 2017', 'The pink hat, a soul laid bare, and Super Bowl LI. Gaga''s most intimate era, dedicated to her aunt Joanne.', '#e8a798', 6),
  ('a-star-is-born', 'A Star Is Born', '2018 – 2019', 'Ally, Bradley Cooper and an Oscar for ''Shallow''. Gaga conquers Hollywood.', '#c98a4b', 7),
  ('chromatica', 'Chromatica', '2020 – 2021', 'Hot pink, chrome and healing dance-pop, from a mid-pandemic release to Rain On Me.', '#ff3e9a', 8),
  ('love-for-sale', 'Love For Sale', '2021 – 2022', 'The second jazz record with Tony Bennett — a Cole Porter songbook and the farewell to a legendary friendship.', '#6fc3df', 9),
  ('house-of-gucci', 'House of Gucci', '2021', 'Patrizia Reggiani. Father, Son and House of Gucci. Gaga''s acclaimed leading role in Ridley Scott''s crime saga.', '#8f1d1d', 10),
  ('harlequin', 'Harlequin', '2024', 'Lee Quinzel sings the classics. The companion album to Joker: Folie à Deux, jazz Gaga at her most theatrical.', '#c8102e', 11),
  ('joker', 'Joker: Folie à Deux', '2024', 'Gaga as Lee Quinzel opposite Joaquin Phoenix — madness staged as a musical.', '#4e9d50', 12),
  ('mayhem', 'MAYHEM', '2025 – now', 'The return to dark, raw pop. Abracadabra, Disease, the historic Coachella headline and the chrome-gothic era this site is dressed in.', '#e04e20', 13)
on conflict (slug) do nothing;

insert into public.videos (title, url, type, era_slug, event, date, featured) values
  ('Abracadabra', 'https://www.youtube.com/watch?v=vBynw9Isr28', 'mv', 'mayhem', 'Official Music Video', '2025-02-03', true),
  ('Abracadabra — Saturday Night Live', 'https://www.youtube.com/watch?v=NLviy39Q1A8', 'live', 'mayhem', 'SNL 50', '2025-03-09', false),
  ('Disease', 'https://www.youtube.com/watch?v=fmC6b6_ovZY', 'mv', 'mayhem', 'Official Music Video', '2024-11-01', false),
  ('Rain On Me (with Ariana Grande)', 'https://www.youtube.com/watch?v=AoAm4om0wTs', 'mv', 'chromatica', 'Official Music Video', '2020-05-22', false),
  ('Stupid Love', 'https://www.youtube.com/watch?v=5L6xyaeiV58', 'mv', 'chromatica', 'Official Music Video', '2020-02-28', false),
  ('Shallow (with Bradley Cooper)', 'https://www.youtube.com/watch?v=bo_efYhYU2A', 'mv', 'a-star-is-born', 'A Star Is Born', '2018-09-27', false),
  ('Applause', 'https://www.youtube.com/watch?v=pco91kroVgQ', 'mv', 'artpop', 'Official Music Video', '2013-08-19', false),
  ('Born This Way', 'https://www.youtube.com/watch?v=wV1FrqwZyKw', 'mv', 'born-this-way', 'Official Music Video', '2011-02-27', false),
  ('Judas', 'https://www.youtube.com/watch?v=wagn8Wrmzuc', 'mv', 'born-this-way', 'Official Music Video', '2011-05-03', false),
  ('Bad Romance', 'https://www.youtube.com/watch?v=qrO4YZeyl0I', 'mv', 'the-fame-monster', 'Official Music Video', '2009-11-23', false),
  ('Telephone (feat. Beyoncé)', 'https://www.youtube.com/watch?v=EVBsypHzF3U', 'mv', 'the-fame-monster', 'Official Music Video', '2010-03-15', false),
  ('Poker Face', 'https://www.youtube.com/watch?v=bESGLojNYSo', 'mv', 'the-fame', 'Official Music Video', '2008-10-24', false),
  ('Just Dance (feat. Colby O''Donis)', 'https://www.youtube.com/watch?v=2Abk1jAONjw', 'mv', 'the-fame', 'Official Music Video', '2008-06-17', false),
  ('Paparazzi', 'https://www.youtube.com/watch?v=d2smz_1L2_0', 'mv', 'the-fame', 'Official Music Video', '2009-06-08', false),
  ('Alejandro', 'https://www.youtube.com/watch?v=niqrrmev4mA', 'mv', 'the-fame-monster', 'Official Music Video', '2010-06-08', false);

insert into public.timeline_moments (date, title, body, era_slug) values
  ('2008-08-19', 'The Fame', 'The debut album introduces Lady Gaga to the world. Just Dance and Poker Face hit #1 in dozens of countries.', 'the-fame'),
  ('2009-11-18', 'The Fame Monster', 'Bad Romance arrives with the most iconic video of the decade, and the Monster Ball begins.', 'the-fame-monster'),
  ('2010-09-12', 'The meat dress', 'At the VMAs, Gaga accepts Video of the Year dressed in… meat. Pop culture never recovered.', 'the-fame-monster'),
  ('2011-05-23', 'Born This Way', 'An anthem of acceptance selling millions: the era that named the Little Monsters and the Born This Way Foundation.', 'born-this-way'),
  ('2013-11-06', 'ARTPOP', 'Gaga fuses music, technology and performance art — flying drone dress at the artRAVE included.', 'artpop'),
  ('2015-02-22', 'The Sound of Music tribute', 'At the Oscars, Gaga silences the skeptics with a Julie Andrews tribute that relaunches her vocal career.', 'artpop'),
  ('2014-09-19', 'Cheek to Cheek', 'Gaga and Tony Bennett top the charts with a jazz standards album and win the Grammy for it.', 'cheek-to-cheek'),
  ('2016-10-21', 'Joanne', 'Her most personal record, dedicated to her aunt Joanne. Million Reasons becomes an instant classic.', 'joanne'),
  ('2017-02-05', 'Super Bowl LI Halftime', 'From the stadium roof into history: one of the most acclaimed halftime shows of all time.', 'joanne'),
  ('2018-10-05', 'A Star Is Born', 'Ally is born. The film with Bradley Cooper becomes a global box-office and critical phenomenon.', 'a-star-is-born'),
  ('2019-02-24', 'Oscar for Shallow', 'Best Original Song — and that piano duet with Bradley Cooper that stopped the world.', 'a-star-is-born'),
  ('2020-05-29', 'Chromatica', 'Dance-pop as healing in the middle of a pandemic. Rain On Me hands Gaga another global #1.', 'chromatica'),
  ('2022-07-17', 'The Chromatica Ball', 'The stadium tour finally happens — brutalist, theatrical and unforgettable.', 'chromatica'),
  ('2021-10-01', 'Love For Sale', 'The final duet album with Tony Bennett — a Cole Porter songbook and a moving goodbye.', 'love-for-sale'),
  ('2021-11-24', 'House of Gucci', 'Gaga disappears into Patrizia Reggiani and earns worldwide acclaim in Ridley Scott''s saga.', 'house-of-gucci'),
  ('2024-09-27', 'Harlequin', 'The companion album to Joker: Folie à Deux revisits the classics through the lens of Lee Quinzel.', 'harlequin'),
  ('2024-10-04', 'Joker: Folie à Deux', 'Lee Quinzel arrives: Gaga stars opposite Joaquin Phoenix in the musical descent into madness.', 'joker'),
  ('2025-03-07', 'MAYHEM', 'The return to dark pop. Abracadabra and Disease dominate the charts, and the chrome-gothic aesthetic defines the era.', 'mayhem'),
  ('2025-04-11', 'Coachella: The Art of Personal Chaos', 'A historic two-hour headline set that fans (and critics) rank among the festival''s greatest ever.', 'mayhem');
