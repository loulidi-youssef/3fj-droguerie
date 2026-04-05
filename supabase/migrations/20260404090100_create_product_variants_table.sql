create extension if not exists "pgcrypto";

create table if not exists public.product_variants (
  id uuid primary key default gen_random_uuid(),
  product_id text not null references public.products(id) on delete cascade,
  color text null,
  size text null,
  price integer not null check (price > 0),
  previous_price integer null check (previous_price > price),
  stock integer not null default 0 check (stock >= 0),
  sku text null,
  image text null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint product_variants_color_or_size_check check (color is not null or size is not null)
);

drop trigger if exists trg_product_variants_updated_at on public.product_variants;
create trigger trg_product_variants_updated_at
before update on public.product_variants
for each row
execute function public.set_updated_at();

create index if not exists idx_product_variants_product_id on public.product_variants(product_id);
create index if not exists idx_product_variants_active on public.product_variants(is_active);
create index if not exists idx_product_variants_color on public.product_variants(color);
create index if not exists idx_product_variants_size on public.product_variants(size);

alter table public.product_variants enable row level security;

drop policy if exists "Public can read active product variants" on public.product_variants;
create policy "Public can read active product variants"
on public.product_variants
for select
to anon, authenticated
using (is_active = true);
