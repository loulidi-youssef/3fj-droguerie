-- Bulk pricing tiers by quantity, per product.
-- Example:
-- [
--   { "minQty": 1, "price": 7.00 },
--   { "minQty": 10, "price": 6.50 },
--   { "minQty": 50, "price": 6.00 }
-- ]

alter table if exists public.products
add column if not exists bulk_price_tiers jsonb not null default '[]'::jsonb;

update public.products
set bulk_price_tiers = '[]'::jsonb
where bulk_price_tiers is null;

alter table if exists public.products
drop constraint if exists products_bulk_price_tiers_is_array_check;

alter table if exists public.products
add constraint products_bulk_price_tiers_is_array_check
check (jsonb_typeof(bulk_price_tiers) = 'array');
