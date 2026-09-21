create table if not exists public.verify_rate_limits (
  bucket_key text primary key,
  window_started_at timestamptz not null,
  request_count integer not null default 0 check (request_count > 0),
  expires_at timestamptz not null
);

create index if not exists verify_rate_limits_expires_idx
  on public.verify_rate_limits (expires_at);

alter table public.verify_rate_limits enable row level security;
revoke all on table public.verify_rate_limits from anon, authenticated;

create or replace function public.consume_verify_rate_limit(
  p_bucket_key text,
  p_limit integer,
  p_window_seconds integer
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.verify_rate_limits%rowtype;
  v_now timestamptz := now();
begin
  if p_bucket_key is null or p_bucket_key = '' or p_limit < 1 or p_window_seconds < 1 then
    return false;
  end if;

  delete from public.verify_rate_limits
  where expires_at < v_now;

  select *
    into v_row
    from public.verify_rate_limits
   where bucket_key = p_bucket_key
   for update;

  if not found or v_row.expires_at <= v_now then
    insert into public.verify_rate_limits (
      bucket_key,
      window_started_at,
      request_count,
      expires_at
    ) values (
      p_bucket_key,
      v_now,
      1,
      v_now + make_interval(secs => p_window_seconds)
    )
    on conflict (bucket_key) do update
      set window_started_at = excluded.window_started_at,
          request_count = 1,
          expires_at = excluded.expires_at;

    return true;
  end if;

  if v_row.request_count >= p_limit then
    return false;
  end if;

  update public.verify_rate_limits
     set request_count = request_count + 1
   where bucket_key = p_bucket_key;

  return true;
end;
$$;

revoke all on function public.consume_verify_rate_limit(text, integer, integer) from public;
revoke all on function public.consume_verify_rate_limit(text, integer, integer) from anon;
revoke all on function public.consume_verify_rate_limit(text, integer, integer) from authenticated;
grant execute on function public.consume_verify_rate_limit(text, integer, integer) to service_role;
