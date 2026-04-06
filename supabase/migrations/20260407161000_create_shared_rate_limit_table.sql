-- Shared DB-backed rate limiter for sensitive HTTP mutations.
-- Designed for multi-instance/serverless deployments (no process-memory coupling).

create table if not exists public.request_rate_limits (
  scope text not null,
  key_hash text not null,
  hit_count integer not null default 0,
  window_started_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint request_rate_limits_scope_not_blank check (btrim(scope) <> ''),
  constraint request_rate_limits_key_hash_not_blank check (btrim(key_hash) <> ''),
  constraint request_rate_limits_hit_count_non_negative check (hit_count >= 0),
  primary key (scope, key_hash)
);

drop trigger if exists trg_request_rate_limits_updated_at on public.request_rate_limits;
create trigger trg_request_rate_limits_updated_at
before update on public.request_rate_limits
for each row
execute function public.set_updated_at();

create index if not exists idx_request_rate_limits_updated_at
on public.request_rate_limits(updated_at desc);

drop function if exists public.consume_rate_limit(text, text, integer, integer);

create or replace function public.consume_rate_limit(
  p_scope text,
  p_key_hash text,
  p_limit integer,
  p_window_ms integer
)
returns table (
  allowed boolean,
  retry_after_seconds integer,
  hit_count integer,
  window_started_at timestamptz
)
language plpgsql
as $$
declare
  v_scope text;
  v_key_hash text;
  v_now timestamptz;
  v_row public.request_rate_limits%rowtype;
  v_elapsed_ms bigint;
  v_retry_after_seconds integer;
begin
  v_scope := nullif(btrim(p_scope), '');
  v_key_hash := nullif(btrim(p_key_hash), '');
  v_now := now();

  if v_scope is null then
    raise exception 'RATE_LIMIT_SCOPE_REQUIRED';
  end if;

  if v_key_hash is null then
    raise exception 'RATE_LIMIT_KEY_REQUIRED';
  end if;

  if p_limit is null or p_limit <= 0 then
    raise exception 'RATE_LIMIT_LIMIT_INVALID';
  end if;

  if p_window_ms is null or p_window_ms <= 0 then
    raise exception 'RATE_LIMIT_WINDOW_INVALID';
  end if;

  insert into public.request_rate_limits (
    scope,
    key_hash,
    hit_count,
    window_started_at
  )
  values (
    v_scope,
    v_key_hash,
    0,
    v_now
  )
  on conflict (scope, key_hash) do nothing;

  loop
    select *
    into v_row
    from public.request_rate_limits
    where scope = v_scope
      and key_hash = v_key_hash
    for update;

    exit when found;

    insert into public.request_rate_limits (
      scope,
      key_hash,
      hit_count,
      window_started_at
    )
    values (
      v_scope,
      v_key_hash,
      0,
      v_now
    )
    on conflict (scope, key_hash) do nothing;
  end loop;

  v_elapsed_ms := floor(extract(epoch from (v_now - v_row.window_started_at)) * 1000)::bigint;

  if v_elapsed_ms >= p_window_ms then
    update public.request_rate_limits
    set
      hit_count = 1,
      window_started_at = v_now,
      updated_at = v_now
    where scope = v_scope
      and key_hash = v_key_hash;

    return query
    select true, 0, 1, v_now;
    return;
  end if;

  if v_row.hit_count >= p_limit then
    v_retry_after_seconds := greatest(
      1,
      ceil((p_window_ms - v_elapsed_ms) / 1000.0)::integer
    );

    return query
    select false, v_retry_after_seconds, v_row.hit_count, v_row.window_started_at;
    return;
  end if;

  update public.request_rate_limits
  set
    hit_count = v_row.hit_count + 1,
    updated_at = v_now
  where scope = v_scope
    and key_hash = v_key_hash;

  return query
  select true, 0, v_row.hit_count + 1, v_row.window_started_at;
end;
$$;
