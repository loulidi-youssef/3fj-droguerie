-- Convert offers to rule-based discounts.
-- Promotional price must be derived dynamically from products.price.

alter table public.offers
add column if not exists discount_type text;

alter table public.offers
add column if not exists discount_value numeric(10, 2);

-- Backfill from legacy discounted_price when needed.
update public.offers as current_offer
set
  discount_type = 'fixed',
  discount_value = greatest(
    0,
    linked_product.price - coalesce(current_offer.discounted_price, linked_product.price)
  )
from public.products as linked_product
where current_offer.product_id = linked_product.id
  and (current_offer.discount_type is null or current_offer.discount_value is null);

update public.offers
set discount_type = 'fixed'
where discount_type is null;

update public.offers
set discount_value = 0
where discount_value is null;

-- Keep legacy column only for compatibility.
alter table public.offers
alter column discounted_price drop not null;

alter table public.offers
drop constraint if exists offers_discount_type_check;

alter table public.offers
drop constraint if exists offers_discount_value_check;

alter table public.offers
drop constraint if exists offers_discount_percent_range_check;

alter table public.offers
add constraint offers_discount_type_check
check (discount_type in ('percent', 'fixed'));

alter table public.offers
add constraint offers_discount_value_check
check (discount_value >= 0);

alter table public.offers
add constraint offers_discount_percent_range_check
check (discount_type <> 'percent' or discount_value <= 100);

alter table public.offers
alter column discount_type set not null;

alter table public.offers
alter column discount_value set not null;

create index if not exists idx_offers_discount_type on public.offers(discount_type);
