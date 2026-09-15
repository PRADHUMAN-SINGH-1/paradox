create table if not exists public.analyses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  repo_full_name text not null,
  score integer not null default 0 check (score between 0 and 100),
  verdict text not null,
  result jsonb not null,
  created_at timestamptz not null default now(),
  unique (user_id, repo_full_name)
);

alter table public.analyses enable row level security;

drop policy if exists "Users can read their analyses" on public.analyses;
create policy "Users can read their analyses" on public.analyses for select using (auth.uid() = user_id);

drop policy if exists "Users can save their analyses" on public.analyses;
create policy "Users can save their analyses" on public.analyses for insert with check (auth.uid() = user_id);

drop policy if exists "Users can update their analyses" on public.analyses;
create policy "Users can update their analyses" on public.analyses for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "Users can delete their analyses" on public.analyses;
create policy "Users can delete their analyses" on public.analyses for delete using (auth.uid() = user_id);
