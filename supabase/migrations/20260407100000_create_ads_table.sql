-- Add homepage advertisements management table.
-- Ads are rendered only when active and inside the configured schedule.

create extension if not exists "pgcrypto";

create table if not exists public.ads (
  id uuid primary key default gen_random_uuid(),
  image_url text not null,
  title text null,
  description text null,
  link text not null,
  position text not null,
  is_active boolean not null default false,
  start_date timestamptz null,
  end_date timestamptz null,
  created_at timestamptz not null default now(),
  constraint ads_position_check check (position in ('top', 'middle')),
  constraint ads_date_range_check check (
    end_date is null
    or start_date is null
    or end_date > start_date
  )
);

create index if not exists idx_ads_is_active on public.ads(is_active);
create index if not exists idx_ads_position on public.ads(position);
create index if not exists idx_ads_created_at on public.ads(created_at desc);
create index if not exists idx_ads_start_date on public.ads(start_date);
create index if not exists idx_ads_end_date on public.ads(end_date);

alter table public.ads enable row level security;

drop policy if exists "Public can read active scheduled ads" on public.ads;
create policy "Public can read active scheduled ads"
on public.ads
for select
to anon, authenticated
using (
  is_active = true
  and (start_date is null or start_date <= now())
  and (end_date is null or end_date > now())
);
