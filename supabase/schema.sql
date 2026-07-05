-- ============================================================
-- GAGAFLIX — esquema da base de dados (Supabase / Postgres)
-- Corre este ficheiro UMA vez no SQL Editor do teu projeto Supabase:
-- Dashboard → SQL Editor → New query → colar tudo → Run
-- ============================================================

-- Eras da carreira
create table if not exists public.eras (
  slug        text primary key,
  name        text not null,
  years       text not null default '',
  description text not null default '',
  accent      text not null default '#e04e20',
  image_url   text,
  sort        integer not null default 99
);

-- Vídeos (cada vídeo tem UMA fonte: o link)
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

-- Marcos da timeline
create table if not exists public.timeline_moments (
  id        uuid primary key default gen_random_uuid(),
  date      date not null,
  title     text not null,
  body      text,
  era_slug  text references public.eras(slug) on update cascade on delete set null,
  image_url text
);

-- ------------------------------------------------------------
-- Segurança (RLS): toda a gente lê, só tu (autenticado) escreves
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
-- Conteúdo de arranque (o mesmo que o site mostra sem Supabase).
-- Podes editar ou apagar tudo depois, no /admin.
-- ------------------------------------------------------------
insert into public.eras (slug, name, years, description, accent, sort) values
  ('the-fame', 'The Fame', '2008 – 2010', 'O nascimento do fenómeno: The Fame e The Fame Monster transformam Stefani Germanotta em Lady Gaga e o pop nunca mais foi o mesmo.', '#d4af37', 1),
  ('born-this-way', 'Born This Way', '2011 – 2012', 'Couro, metal e um hino de liberdade. A era que fundou a nação Little Monster e levou o Monster Ball ao mundo inteiro.', '#9fb4c7', 2),
  ('artpop', 'ARTPOP', '2013 – 2015', 'Pop como arte, arte como pop. A era mais experimental e incompreendida — e por isso mesmo adorada pelos fãs.', '#a6e22e', 3),
  ('joanne', 'Joanne', '2016 – 2017', 'O chapéu rosa, a alma a descoberto e o Super Bowl LI. A era mais íntima de Gaga, dedicada à tia Joanne.', '#e8a798', 4),
  ('a-star-is-born', 'A Star Is Born', '2018 – 2019', 'Ally, Bradley Cooper e um Óscar para ''Shallow''. Gaga conquista Hollywood e prova que não há palco que não domine.', '#c98a4b', 5),
  ('chromatica', 'Chromatica', '2020 – 2022', 'Rosa choque, cromados e dance-pop curativo. Do lançamento em plena pandemia à Chromatica Ball pelos estádios do mundo.', '#ff3e9a', 6),
  ('harlequin', 'Harlequin', '2024', 'Lee Quinzel canta os clássicos. O álbum-companheiro de Joker: Folie à Deux mostra a Gaga jazz no seu registo mais teatral.', '#c8102e', 7),
  ('mayhem', 'MAYHEM', '2025 – hoje', 'O regresso ao pop escuro e cru. Abracadabra, Disease, o headline histórico de Coachella e a era chrome-gothic que dá a cara a este site.', '#e04e20', 8)
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
  ('2008-08-19', 'The Fame', 'O álbum de estreia apresenta Lady Gaga ao mundo. Just Dance e Poker Face conquistam o nº 1 em dezenas de países.', 'the-fame'),
  ('2009-11-18', 'The Fame Monster', 'Bad Romance chega com o vídeo mais icónico da década e o Monster Ball arranca.', 'the-fame'),
  ('2010-09-12', 'O vestido de carne', 'Nos VMAs, Gaga recebe o prémio de Video of the Year vestida de… carne. A cultura pop nunca recuperou.', 'the-fame'),
  ('2011-05-23', 'Born This Way', 'Um hino de aceitação vendido em milhões: a era que deu nome aos Little Monsters e à Born This Way Foundation.', 'born-this-way'),
  ('2013-11-06', 'ARTPOP', 'Gaga funde música, tecnologia e arte performativa — com direito a voo em vestido drone no artRAVE.', 'artpop'),
  ('2015-02-22', 'Tributo a Sound of Music', 'Nos Óscares, Gaga silencia os céticos com um tributo a Julie Andrews que relança a sua carreira vocal.', 'artpop'),
  ('2016-10-21', 'Joanne', 'O registo mais pessoal, dedicado à tia Joanne. Million Reasons torna-se um clássico instantâneo.', 'joanne'),
  ('2017-02-05', 'Super Bowl LI Halftime', 'Do telhado do estádio para a história: um dos halftime shows mais aclamados de sempre.', 'joanne'),
  ('2018-10-05', 'A Star Is Born', 'Ally nasce. O filme com Bradley Cooper é um fenómeno global de bilheteira e crítica.', 'a-star-is-born'),
  ('2019-02-24', 'Óscar por Shallow', 'Melhor Canção Original — e aquele dueto ao piano com Bradley Cooper que parou o mundo.', 'a-star-is-born'),
  ('2020-05-29', 'Chromatica', 'Dance-pop como cura em plena pandemia. Rain On Me dá a Gaga mais um nº 1 global.', 'chromatica'),
  ('2022-07-17', 'The Chromatica Ball', 'A digressão de estádios finalmente acontece — brutalista, teatral e inesquecível.', 'chromatica'),
  ('2024-09-27', 'Harlequin', 'O álbum-companheiro de Joker: Folie à Deux revisita clássicos pela lente de Lee Quinzel.', 'harlequin'),
  ('2025-03-07', 'MAYHEM', 'O regresso ao pop escuro. Abracadabra e Disease dominam as tabelas e a estética chrome-gothic define a era.', 'mayhem'),
  ('2025-04-11', 'Coachella: The Art of Personal Chaos', 'Um headline histórico de duas horas que os fãs (e a crítica) colocam entre os melhores de sempre do festival.', 'mayhem');
