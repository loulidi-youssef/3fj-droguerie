-- Create offers table for storefront/admin offers management.
-- Run this once if your project was created before offers support.

create table if not exists public.offers (
  id text primary key,
  title text not null,
  short_description text not null,
  discount_label text not null,
  product_id text not null references public.products(id),
  discounted_price integer not null check (discounted_price > 0),
  start_at timestamptz null,
  end_at timestamptz null,
  image_path text null,
  banner_text text null,
  is_active boolean not null default true,
  is_featured boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint offers_date_range_check check (end_at is null or start_at is null or end_at > start_at)
);

alter table public.offers
add column if not exists product_id text references public.products(id);

alter table public.offers
add column if not exists discounted_price integer check (discounted_price > 0);

drop trigger if exists trg_offers_updated_at on public.offers;
create trigger trg_offers_updated_at
before update on public.offers
for each row
execute function public.set_updated_at();

create index if not exists idx_offers_active on public.offers(is_active);
create index if not exists idx_offers_featured on public.offers(is_featured);
create index if not exists idx_offers_end_at on public.offers(end_at);
create index if not exists idx_offers_product_id on public.offers(product_id);

alter table public.offers enable row level security;

drop policy if exists "Public can read active offers" on public.offers;
create policy "Public can read active offers"
on public.offers
for select
to anon, authenticated
using (
  is_active = true
  and (start_at is null or start_at <= now())
  and (end_at is null or end_at > now())
);
