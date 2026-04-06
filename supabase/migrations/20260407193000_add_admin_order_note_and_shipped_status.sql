-- Admin orders quality-of-life upgrade:
-- 1) Add internal admin note field.
-- 2) Add delivery "shipped" status in constraints.

alter table if exists public.orders
add column if not exists admin_note text;

alter table if exists public.orders
drop constraint if exists orders_status_check;

alter table if exists public.orders
add constraint orders_status_check
check (
  status in (
    'new',
    'confirmed',
    'preparing',
    'ready',
    'shipped',
    'collected',
    'delivered',
    'cancelled'
  )
);

alter table if exists public.orders
drop constraint if exists orders_status_fulfillment_compat_check;

alter table if exists public.orders
add constraint orders_status_fulfillment_compat_check
check (
  (
    fulfillment_method = 'delivery'
    and status in ('new', 'confirmed', 'shipped', 'delivered', 'cancelled')
  )
  or (
    fulfillment_method = 'pickup'
    and status in ('new', 'confirmed', 'preparing', 'ready', 'collected', 'cancelled')
  )
);
