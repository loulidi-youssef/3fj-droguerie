-- Link offers to real products and add discounted price fields.
-- Run this once if your offers table already exists.

alter table public.offers
add column if not exists product_id text references public.products(id);

alter table public.offers
add column if not exists discounted_price integer check (discounted_price > 0);

create index if not exists idx_offers_product_id on public.offers(product_id);

-- Beginner-safe default for legacy rows (you can edit later in /admin/offres).
update public.offers as current_offer
set product_id = first_product.id
from (
  select id
  from public.products
  order by created_at asc
  limit 1
) as first_product
where current_offer.product_id is null;

update public.offers as current_offer
set discounted_price = greatest(1, linked_product.price - 20)
from public.products as linked_product
where current_offer.discounted_price is null
  and current_offer.product_id = linked_product.id;
