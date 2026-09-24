-- Utopia Daily — database schema.
-- Paste this whole file into Supabase → SQL Editor → New query → Run.
-- It is safe to run more than once.

-- ============================================================
-- profiles: one row per user, created automatically on sign-up
-- ============================================================
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  level text not null default 'b1' check (level in ('a1', 'a2', 'b1', 'b2', 'c1')),
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

drop policy if exists "Users read own profile" on public.profiles;
create policy "Users read own profile" on public.profiles
  for select to authenticated using ((select auth.uid()) = id);

drop policy if exists "Users insert own profile" on public.profiles;
create policy "Users insert own profile" on public.profiles
  for insert to authenticated with check ((select auth.uid()) = id);

drop policy if exists "Users update own profile" on public.profiles;
create policy "Users update own profile" on public.profiles
  for update to authenticated using ((select auth.uid()) = id) with check ((select auth.uid()) = id);

grant select, insert, update on public.profiles to authenticated;

-- New user → profile row. The starting level comes from the level the guest
-- had chosen before signing up (sent as user metadata), otherwise B1.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  start_level text := coalesce(new.raw_user_meta_data ->> 'level', 'b1');
begin
  if start_level not in ('a1', 'a2', 'b1', 'b2', 'c1') then
    start_level := 'b1';
  end if;
  insert into public.profiles (id, level) values (new.id, start_level)
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================
-- saved_words: the "My Words" list
-- ============================================================
create table if not exists public.saved_words (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  word text not null check (char_length(word) between 1 and 64),
  definition text check (char_length(definition) <= 500),
  story_path text check (char_length(story_path) <= 40),
  story_title text check (char_length(story_title) <= 300),
  level text check (level in ('a1', 'a2', 'b1', 'b2', 'c1')),
  created_at timestamptz not null default now(),
  unique (user_id, word)
);

create index if not exists saved_words_user_created_idx on public.saved_words (user_id, created_at desc);

alter table public.saved_words enable row level security;

drop policy if exists "Users read own words" on public.saved_words;
create policy "Users read own words" on public.saved_words
  for select to authenticated using ((select auth.uid()) = user_id);

drop policy if exists "Users add own words" on public.saved_words;
create policy "Users add own words" on public.saved_words
  for insert to authenticated with check ((select auth.uid()) = user_id);

drop policy if exists "Users update own words" on public.saved_words;
create policy "Users update own words" on public.saved_words
  for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

drop policy if exists "Users delete own words" on public.saved_words;
create policy "Users delete own words" on public.saved_words
  for delete to authenticated using ((select auth.uid()) = user_id);

grant select, insert, update, delete on public.saved_words to authenticated;

-- ============================================================
-- retellings: learner retellings + AI feedback (step 4)
-- No delete policy on purpose: the daily check limit counts these rows.
-- ============================================================
create table if not exists public.retellings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  story_path text not null check (char_length(story_path) <= 40),
  level text not null check (level in ('a1', 'a2', 'b1', 'b2', 'c1')),
  text text not null check (char_length(text) between 1 and 1000),
  feedback jsonb,
  created_at timestamptz not null default now()
);

create index if not exists retellings_user_created_idx on public.retellings (user_id, created_at desc);

alter table public.retellings enable row level security;

drop policy if exists "Users read own retellings" on public.retellings;
create policy "Users read own retellings" on public.retellings
  for select to authenticated using ((select auth.uid()) = user_id);

drop policy if exists "Users add own retellings" on public.retellings;
create policy "Users add own retellings" on public.retellings
  for insert to authenticated with check ((select auth.uid()) = user_id);

grant select, insert on public.retellings to authenticated;

-- ============================================================
-- story_views: one row per story view (step 5). Anyone may insert;
-- nobody can read rows directly — only the popular_stories() summary.
-- ============================================================
create table if not exists public.story_views (
  id uuid primary key default gen_random_uuid(),
  story_path text not null check (story_path ~ '^\d{4}-\d{2}-\d{2}/\d{1,2}$'),
  created_at timestamptz not null default now()
);

create index if not exists story_views_created_idx on public.story_views (created_at);

alter table public.story_views enable row level security;

drop policy if exists "Anyone can record a view" on public.story_views;
create policy "Anyone can record a view" on public.story_views
  for insert to anon, authenticated
  with check (story_path ~ '^\d{4}-\d{2}-\d{2}/\d{1,2}$');

grant insert on public.story_views to anon, authenticated;

-- Most viewed stories over the last N days.
create or replace function public.popular_stories(window_days integer default 7, max_results integer default 6)
returns table (story_path text, views bigint)
language sql
stable
security definer
set search_path = ''
as $$
  select v.story_path, count(*) as views
  from public.story_views v
  where v.created_at > now() - make_interval(days => least(greatest(window_days, 1), 90))
  group by v.story_path
  order by views desc, v.story_path desc
  limit least(greatest(max_results, 1), 50);
$$;

revoke all on function public.popular_stories(integer, integer) from public;
grant execute on function public.popular_stories(integer, integer) to anon, authenticated;
