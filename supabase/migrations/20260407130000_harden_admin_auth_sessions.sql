-- Harden admin authentication with server-side sessions and login throttling.
-- Tables are accessed only via the service-role key from server code.

create extension if not exists "pgcrypto";

create table if not exists public.admin_auth_sessions (
  id uuid primary key default gen_random_uuid(),
  token_hash text not null unique,
  expires_at timestamptz not null,
  revoked_at timestamptz null,
  last_seen_at timestamptz null,
  created_at timestamptz not null default now(),
  constraint admin_auth_sessions_expiry_check check (expires_at > created_at)
);

create index if not exists idx_admin_auth_sessions_expires_at
on public.admin_auth_sessions(expires_at);

create index if not exists idx_admin_auth_sessions_revoked_at
on public.admin_auth_sessions(revoked_at);

create index if not exists idx_admin_auth_sessions_created_at
on public.admin_auth_sessions(created_at desc);

create table if not exists public.admin_login_attempts (
  key_hash text primary key,
  failure_count integer not null default 0,
  window_started_at timestamptz not null default now(),
  locked_until timestamptz null,
  updated_at timestamptz not null default now(),
  constraint admin_login_attempts_failure_count_check check (failure_count >= 0),
  constraint admin_login_attempts_lock_window_check check (
    locked_until is null or locked_until >= window_started_at
  )
);

create index if not exists idx_admin_login_attempts_locked_until
on public.admin_login_attempts(locked_until);

create index if not exists idx_admin_login_attempts_updated_at
on public.admin_login_attempts(updated_at desc);

alter table public.admin_auth_sessions enable row level security;
alter table public.admin_login_attempts enable row level security;
