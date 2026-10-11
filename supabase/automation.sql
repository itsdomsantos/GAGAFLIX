-- ============================================================
-- GAGAFLIX — automation (catalogue inbox + Instagram autopilot)
-- Run this file ONCE in Supabase: SQL Editor → New query → paste → Run.
-- Safe to re-run: everything is "if not exists" / "on conflict do nothing".
-- Needs schema.sql to have been run first (it uses the eras/videos tables).
-- ============================================================

-- ------------------------------------------------------------
-- 1. VIDEO INBOX — new videos waiting for your approval.
--    Filled by the daily GitHub Action (YouTube RSS feeds) and by fans on
--    /submit. Nothing reaches the public site until you approve it in
--    /admin/inbox (approving creates the row in public.videos).
-- ------------------------------------------------------------
create table if not exists public.video_inbox (
  id             uuid primary key default gen_random_uuid(),
  url            text not null,
  -- YouTube video id when there is one: the duplicate guard for the robot.
  source_id      text,
  title          text not null default '',
  thumbnail_url  text,
  published_at   timestamptz,
  channel_name   text,
  -- 'rss' (robot) or 'fan' (/submit form)
  origin         text not null default 'fan' check (origin in ('rss','fan')),
  suggested_type text check (suggested_type in ('live','mv','interview','fashion','doc')),
  suggested_era  text references public.eras(slug) on update cascade on delete set null,
  -- Fan submissions only: an optional note and name (shown to you, never public).
  note           text,
  submitted_by   text,
  status         text not null default 'pending' check (status in ('pending','approved','rejected')),
  -- The video created when you approved it.
  video_id       uuid references public.videos(id) on delete set null,
  created_at     timestamptz not null default now(),
  reviewed_at    timestamptz
);

-- One inbox row per YouTube video, forever — so a video you rejected is
-- never suggested again by the robot. (Rows without a source_id — non-YouTube
-- links — don't clash: Postgres treats NULLs as distinct.)
create unique index if not exists video_inbox_source_id_key
  on public.video_inbox (source_id);
create index if not exists video_inbox_status_idx
  on public.video_inbox (status, created_at desc);

alter table public.video_inbox enable row level security;

-- Anonymous visitors (the /submit page) may ONLY insert a pending fan
-- suggestion. They can't read the inbox, can't approve, can't pre-fill
-- what the robot fills, and can't send huge payloads.
drop policy if exists "public submit to inbox" on public.video_inbox;
create policy "public submit to inbox" on public.video_inbox
  for insert to anon
  with check (
    status = 'pending'
    and origin = 'fan'
    and video_id is null
    and reviewed_at is null
    and suggested_era is null
    and char_length(url) between 8 and 500
    and url ~* '^https?://'
    and char_length(coalesce(title, '')) <= 200
    and char_length(coalesce(note, '')) <= 500
    and char_length(coalesce(submitted_by, '')) <= 60
  );

-- You (logged in to /admin) can do everything.
drop policy if exists "admin manage inbox" on public.video_inbox;
create policy "admin manage inbox" on public.video_inbox
  for all to authenticated using (true) with check (true);

-- (The GitHub Action uses the service_role key, which bypasses RLS.)

-- ------------------------------------------------------------
-- 2. INSTAGRAM IMAGES — public Storage bucket "social".
--    The autopilot uploads each card here; Instagram downloads it from the
--    public URL. Only the service_role key (GitHub Action) can write.
-- ------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('social', 'social', true)
on conflict (id) do nothing;

-- ------------------------------------------------------------
-- 3. AUTOPILOT MEMORY — what was already posted lives in site_settings
--    under the key "instagram_autopilot" (written by the GitHub Action
--    with the service_role key). Nothing to create: the row appears on the
--    first real post. To reset the memory, delete that row.
-- ------------------------------------------------------------
