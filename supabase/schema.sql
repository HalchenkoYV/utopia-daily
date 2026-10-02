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
  if start_level not in ('a1', 'a2', 'b1', 'b2', 'c1', 'native') then
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

-- Only the trigger may run it — not callable through the public API.
revoke execute on function public.handle_new_user() from public, anon, authenticated;

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

-- Translations (in the reader's language), the sentence the word came from,
-- and the word a "word family" entry was found from.
alter table public.saved_words add column if not exists translation text;
alter table public.saved_words add column if not exists context text;
alter table public.saved_words add column if not exists related_to text;
alter table public.saved_words add column if not exists updated_at timestamptz;
alter table public.saved_words drop constraint if exists saved_words_translation_len;
alter table public.saved_words add constraint saved_words_translation_len check (char_length(translation) <= 200);
alter table public.saved_words drop constraint if exists saved_words_context_len;
alter table public.saved_words add constraint saved_words_context_len check (char_length(context) <= 600);
alter table public.saved_words drop constraint if exists saved_words_related_to_len;
alter table public.saved_words add constraint saved_words_related_to_len check (char_length(related_to) <= 64);

-- Language for translations, e.g. 'uk', 'es', 'pt-BR'.
alter table public.profiles add column if not exists translate_to text;
alter table public.profiles drop constraint if exists profiles_translate_to_format;
alter table public.profiles add constraint profiles_translate_to_format check (translate_to ~ '^[a-z]{2,3}(-[A-Z]{2})?$');

-- ============================================================
-- ai_usage: one row per AI request (translation, word family, retelling),
-- used for the daily per-user limit. Users cannot update or delete rows.
-- ============================================================
create table if not exists public.ai_usage (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  kind text not null check (kind in ('translate', 'family', 'retelling')),
  created_at timestamptz not null default now()
);

create index if not exists ai_usage_user_created_idx on public.ai_usage (user_id, created_at desc);

alter table public.ai_usage enable row level security;

drop policy if exists "Users read own AI usage" on public.ai_usage;
create policy "Users read own AI usage" on public.ai_usage
  for select to authenticated using ((select auth.uid()) = user_id);

drop policy if exists "Users add own AI usage" on public.ai_usage;
create policy "Users add own AI usage" on public.ai_usage
  for insert to authenticated with check ((select auth.uid()) = user_id);

grant select, insert on public.ai_usage to authenticated;

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

-- Most viewed stories over the last N days. Public on purpose (the Popular block);
-- SECURITY DEFINER lets it count rows that nobody can read directly.
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

-- ============================================================
-- Utopia Timeline (since 1 October 2026): stories and the world's memory
-- live in the database. Applied as migration "utopia_timeline_content".
-- ============================================================
create table if not exists public.stories (
  date date not null,
  n smallint not null check (n between 1 and 20),
  status text not null default 'draft' check (status in ('draft', 'published')),
  timeline_day integer not null check (timeline_day >= 1),
  rubric text not null check (rubric in ('Politics & Peace', 'Health', 'Mind', 'Society', 'Food & Land', 'Planet & Energy', 'Technology & AI', 'Economy & Work', 'Culture & Sport')),
  dateline text not null default '',
  format text not null default 'news',
  lead_type text,
  threads text[] not null default '{}',
  entities text[] not null default '{}',
  links text[] not null default '{}',
  reality_source text,
  levels jsonb not null default '{}'::jsonb,
  images jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (date, n)
);
create index if not exists stories_date_idx on public.stories (date desc, n);
alter table public.stories enable row level security;
drop policy if exists "Published stories are public" on public.stories;
create policy "Published stories are public" on public.stories
  for select to anon, authenticated using (status = 'published');
revoke insert, update, delete, truncate on public.stories from anon, authenticated;
grant select on public.stories to anon, authenticated;

-- Private world memory (no API access; written by the scheduled task through SQL).
create table if not exists public.world_docs (path text primary key, content text not null, updated_at timestamptz not null default now());
create table if not exists public.world_docs_history (id bigserial primary key, path text not null, content text not null, saved_at timestamptz not null default now());
create table if not exists public.world_chronicle (
  id bigserial primary key, date date not null, day integer not null, n smallint not null,
  rubric text not null, headline text not null, facts text not null, threads text[] not null default '{}',
  created_at timestamptz not null default now(), unique (date, n)
);
create table if not exists public.world_entities (
  name text primary key,
  kind text not null check (kind in ('company', 'organization', 'place', 'person', 'law', 'program', 'technology', 'event', 'other')),
  rubric text, stands_for text, fictional boolean not null default true,
  first_day integer, first_ref text, summary text not null default '', last_day integer,
  updated_at timestamptz not null default now()
);
create table if not exists public.world_metrics (
  key text primary key, label text not null, rubric text, baseline text not null, baseline_source text not null,
  current_value text not null, last_change_day integer, speed_limit text not null, sort smallint not null default 0,
  updated_at timestamptz not null default now()
);
alter table public.world_docs enable row level security;
alter table public.world_docs_history enable row level security;
alter table public.world_chronicle enable row level security;
alter table public.world_entities enable row level security;
alter table public.world_metrics enable row level security;

-- Native level for profiles, saved words and retellings.
alter table public.profiles drop constraint if exists profiles_level_check;
alter table public.profiles add constraint profiles_level_check check (level in ('a1', 'a2', 'b1', 'b2', 'c1', 'native'));
alter table public.saved_words drop constraint if exists saved_words_level_check;
alter table public.saved_words add constraint saved_words_level_check check (level in ('a1', 'a2', 'b1', 'b2', 'c1', 'native'));
alter table public.retellings drop constraint if exists retellings_level_check;
alter table public.retellings add constraint retellings_level_check check (level in ('a1', 'a2', 'b1', 'b2', 'c1', 'native'));
-- (The full migration also adds history/updated_at triggers and public.check_issue(date).)
