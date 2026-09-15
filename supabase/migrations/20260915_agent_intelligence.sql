-- PARADOX auth data. Apply in the Supabase SQL editor.
-- Public anon key only on the frontend. Service role never in the browser.

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  display_name text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.saved_agents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  repository_url text not null,
  repository_full_name text not null,
  verdict text,
  score integer,
  created_at timestamptz not null default now(),
  unique (user_id, repository_full_name)
);

create table if not exists public.scan_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  repository_url text not null,
  repository_full_name text not null,
  verdict text,
  score integer,
  analysis_json jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.analysis_cache (
  repository_full_name text primary key,
  analyzed_at timestamptz not null default now(),
  head_sha text,
  summary jsonb not null
);

alter table public.profiles enable row level security;
alter table public.saved_agents enable row level security;
alter table public.scan_history enable row level security;
alter table public.analysis_cache enable row level security;

create policy "profiles_select_own" on public.profiles for select using (auth.uid() = id);
create policy "profiles_update_own" on public.profiles for update using (auth.uid() = id) with check (auth.uid() = id);
create policy "profiles_insert_own" on public.profiles for insert with check (auth.uid() = id);

create policy "saved_select_own" on public.saved_agents for select using (auth.uid() = user_id);
create policy "saved_insert_own" on public.saved_agents for insert with check (auth.uid() = user_id);
create policy "saved_delete_own" on public.saved_agents for delete using (auth.uid() = user_id);

create policy "history_select_own" on public.scan_history for select using (auth.uid() = user_id);
create policy "history_insert_own" on public.scan_history for insert with check (auth.uid() = user_id);
create policy "history_delete_own" on public.scan_history for delete using (auth.uid() = user_id);

-- Cache is written by Edge Functions with the service role, readable by anon for public summaries.
create policy "cache_read_public" on public.analysis_cache for select using (true);

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email) values (new.id, new.email)
  on conflict (id) do update set email = excluded.email, updated_at = now();
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
