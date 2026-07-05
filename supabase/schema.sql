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

-- ------------------------------------------------------------
-- Security (RLS): everyone reads, only you (authenticated) write
-- ------------------------------------------------------------
alter table public.eras enable row level security;
alter table public.videos enable row level security;
alter table public.timeline_moments enable row level security;

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

-- ------------------------------------------------------------
-- Starter content (the same the site shows without Supabase).
-- Edit or delete everything later in /admin.
-- ------------------------------------------------------------
insert into public.eras (slug, name, years, description, accent, sort) values
  ('the-fame', 'The Fame', '2008 – 2010', 'The birth of the phenomenon: The Fame and The Fame Monster turn Stefani Germanotta into Lady Gaga, and pop music is never the same again.', '#d4af37', 1),
  ('born-this-way', 'Born This Way', '2011 – 2012', 'Leather, metal and an anthem of freedom. The era that founded the Little Monster nation and took the Monster Ball around the world.', '#9fb4c7', 2),
  ('artpop', 'ARTPOP', '2013 – 2015', 'Pop as art, art as pop. The most experimental and misunderstood era — and exactly for that reason, beloved by the fans.', '#a6e22e', 3),
  ('joanne', 'Joanne', '2016 – 2017', 'The pink hat, a soul laid bare, and Super Bowl LI. Gaga''s most intimate era, dedicated to her aunt Joanne.', '#e8a798', 4),
  ('a-star-is-born', 'A Star Is Born', '2018 – 2019', 'Ally, Bradley Cooper and an Oscar for ''Shallow''. Gaga conquers Hollywood and proves there is no stage she can''t own.', '#c98a4b', 5),
  ('chromatica', 'Chromatica', '2020 – 2022', 'Hot pink, chrome and healing dance-pop. From a mid-pandemic release to the Chromatica Ball across the world''s stadiums.', '#ff3e9a', 6),
  ('harlequin', 'Harlequin', '2024', 'Lee Quinzel sings the classics. The companion album to Joker: Folie à Deux shows jazz Gaga at her most theatrical.', '#c8102e', 7),
  ('mayhem', 'MAYHEM', '2025 – now', 'The return to dark, raw pop. Abracadabra, Disease, the historic Coachella headline and the chrome-gothic era this site is dressed in.', '#e04e20', 8)
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
  ('Bad Romance', 'https://www.youtube.com/watch?v=qrO4YZeyl0I', 'mv', 'the-fame', 'Official Music Video', '2009-11-23', false),
  ('Telephone (feat. Beyoncé)', 'https://www.youtube.com/watch?v=EVBsypHzF3U', 'mv', 'the-fame', 'Official Music Video', '2010-03-15', false),
  ('Poker Face', 'https://www.youtube.com/watch?v=bESGLojNYSo', 'mv', 'the-fame', 'Official Music Video', '2008-10-24', false),
  ('Just Dance (feat. Colby O''Donis)', 'https://www.youtube.com/watch?v=2Abk1jAONjw', 'mv', 'the-fame', 'Official Music Video', '2008-06-17', false),
  ('Paparazzi', 'https://www.youtube.com/watch?v=d2smz_1L2_0', 'mv', 'the-fame', 'Official Music Video', '2009-06-08', false),
  ('Alejandro', 'https://www.youtube.com/watch?v=niqrrmev4mA', 'mv', 'the-fame', 'Official Music Video', '2010-06-08', false);

insert into public.timeline_moments (date, title, body, era_slug) values
  ('2008-08-19', 'The Fame', 'The debut album introduces Lady Gaga to the world. Just Dance and Poker Face hit #1 in dozens of countries.', 'the-fame'),
  ('2009-11-18', 'The Fame Monster', 'Bad Romance arrives with the most iconic video of the decade, and the Monster Ball begins.', 'the-fame'),
  ('2010-09-12', 'The meat dress', 'At the VMAs, Gaga accepts Video of the Year dressed in… meat. Pop culture never recovered.', 'the-fame'),
  ('2011-05-23', 'Born This Way', 'An anthem of acceptance selling millions: the era that named the Little Monsters and the Born This Way Foundation.', 'born-this-way'),
  ('2013-11-06', 'ARTPOP', 'Gaga fuses music, technology and performance art — flying drone dress at the artRAVE included.', 'artpop'),
  ('2015-02-22', 'The Sound of Music tribute', 'At the Oscars, Gaga silences the skeptics with a Julie Andrews tribute that relaunches her vocal career.', 'artpop'),
  ('2016-10-21', 'Joanne', 'Her most personal record, dedicated to her aunt Joanne. Million Reasons becomes an instant classic.', 'joanne'),
  ('2017-02-05', 'Super Bowl LI Halftime', 'From the stadium roof into history: one of the most acclaimed halftime shows of all time.', 'joanne'),
  ('2018-10-05', 'A Star Is Born', 'Ally is born. The film with Bradley Cooper becomes a global box-office and critical phenomenon.', 'a-star-is-born'),
  ('2019-02-24', 'Oscar for Shallow', 'Best Original Song — and that piano duet with Bradley Cooper that stopped the world.', 'a-star-is-born'),
  ('2020-05-29', 'Chromatica', 'Dance-pop as healing in the middle of a pandemic. Rain On Me hands Gaga another global #1.', 'chromatica'),
  ('2022-07-17', 'The Chromatica Ball', 'The stadium tour finally happens — brutalist, theatrical and unforgettable.', 'chromatica'),
  ('2024-09-27', 'Harlequin', 'The companion album to Joker: Folie à Deux revisits the classics through the lens of Lee Quinzel.', 'harlequin'),
  ('2025-03-07', 'MAYHEM', 'The return to dark pop. Abracadabra and Disease dominate the charts, and the chrome-gothic aesthetic defines the era.', 'mayhem'),
  ('2025-04-11', 'Coachella: The Art of Personal Chaos', 'A historic two-hour headline set that fans (and critics) rank among the festival''s greatest ever.', 'mayhem');
