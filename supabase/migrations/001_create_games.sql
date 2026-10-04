-- 001_create_games.sql
-- Run this once in the Supabase dashboard: SQL Editor > New query > paste > Run.
--
-- Creates the one table the app needs and locks it down so that a signed-in
-- user can only ever see and change their own rows.

-- 1. Table -------------------------------------------------------------------
-- One row per game per user.
create table public.games (
  id               uuid primary key default gen_random_uuid(),
  -- Owner of the row. Filled in automatically with the signed-in user's id.
  user_id          uuid not null default auth.uid()
                     references auth.users (id) on delete cascade,
  -- Steam's id for the game. Empty (null) for games added by hand.
  steam_appid      integer,
  title            text not null
                     check (char_length(btrim(title)) between 1 and 200),
  playtime_minutes integer not null default 0
                     check (playtime_minutes >= 0),
  status           text not null default 'not_started'
                     check (status in ('not_started', 'playing', 'completed', 'no_campaign')),
  hidden           boolean not null default false,
  notes            text not null default ''
                     check (char_length(notes) <= 2000),
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  -- A user can only have each Steam game once, so re-importing a library
  -- never creates duplicates. Hand-added games (null appid) are not limited.
  constraint games_user_steam_appid_key unique (user_id, steam_appid)
);

-- 2. Keep updated_at current ---------------------------------------------------
create function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger games_set_updated_at
  before update on public.games
  for each row
  execute function public.set_updated_at();

-- 3. Row-level security ---------------------------------------------------------
-- With RLS on, a query only touches rows that pass one of the policies below.
alter table public.games enable row level security;

create policy "Users can view their own games"
  on public.games for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "Users can add games to their own library"
  on public.games for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

create policy "Users can update their own games"
  on public.games for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "Users can delete their own games"
  on public.games for delete
  to authenticated
  using ((select auth.uid()) = user_id);

-- 4. Data API access ------------------------------------------------------------
-- This project has "Automatically expose new tables" turned off, so the table
-- is unreachable from the app until access is granted explicitly.
-- Signed-in users get full CRUD (still filtered by the policies above).
-- Visitors who are not signed in (the "anon" role) get nothing.
revoke all on public.games from anon;
grant select, insert, update, delete on public.games to authenticated;
grant select, insert, update, delete on public.games to service_role;
