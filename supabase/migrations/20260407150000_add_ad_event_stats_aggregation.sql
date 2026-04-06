-- Aggregate ad analytics counters to avoid scanning raw ad_events rows.
-- Keeps ad_events as source of truth while maintaining per-ad counters.

create table if not exists public.ad_event_stats (
  ad_id uuid primary key references public.ads(id) on delete cascade,
  views bigint not null default 0,
  clicks bigint not null default 0,
  updated_at timestamptz not null default now(),
  constraint ad_event_stats_views_check check (views >= 0),
  constraint ad_event_stats_clicks_check check (clicks >= 0)
);

create index if not exists idx_ad_event_stats_updated_at
on public.ad_event_stats(updated_at desc);

create or replace function public.sync_ad_event_stats_on_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.ad_event_stats (ad_id, views, clicks, updated_at)
  values (
    new.ad_id,
    case when new.event_type = 'view' then 1 else 0 end,
    case when new.event_type = 'click' then 1 else 0 end,
    now()
  )
  on conflict (ad_id)
  do update set
    views = public.ad_event_stats.views + excluded.views,
    clicks = public.ad_event_stats.clicks + excluded.clicks,
    updated_at = now();

  return new;
end;
$$;

drop trigger if exists trg_sync_ad_event_stats_on_insert on public.ad_events;
create trigger trg_sync_ad_event_stats_on_insert
after insert on public.ad_events
for each row
execute function public.sync_ad_event_stats_on_insert();

insert into public.ad_event_stats (ad_id, views, clicks, updated_at)
select
  ad_id,
  count(*) filter (where event_type = 'view')::bigint as views,
  count(*) filter (where event_type = 'click')::bigint as clicks,
  now() as updated_at
from public.ad_events
group by ad_id
on conflict (ad_id)
do update set
  views = excluded.views,
  clicks = excluded.clicks,
  updated_at = now();

alter table public.ad_event_stats enable row level security;

