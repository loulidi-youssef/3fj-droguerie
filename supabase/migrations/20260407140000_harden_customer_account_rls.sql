-- Harden customer account data isolation with explicit RLS policies.
-- Scope: orders, order_items, favorites.

alter table if exists public.orders enable row level security;
alter table if exists public.order_items enable row level security;
alter table if exists public.favorites enable row level security;

-- Orders: authenticated customers can read only their own orders.
drop policy if exists "Authenticated users can read own orders" on public.orders;
create policy "Authenticated users can read own orders"
on public.orders
for select
to authenticated
using (auth.uid() = user_id);

-- Orders: authenticated customers can cancel only their own recent "new" orders.
drop policy if exists "Authenticated users can cancel own recent new orders" on public.orders;
create policy "Authenticated users can cancel own recent new orders"
on public.orders
for update
to authenticated
using (
  auth.uid() = user_id
  and status = 'new'
  and created_at >= now() - interval '2 hour'
)
with check (
  auth.uid() = user_id
  and status = 'cancelled'
);

-- Order items: authenticated customers can read only items linked to their own orders.
drop policy if exists "Authenticated users can read own order items" on public.order_items;
create policy "Authenticated users can read own order items"
on public.order_items
for select
to authenticated
using (
  exists (
    select 1
    from public.orders
    where orders.id = order_items.order_id
      and orders.user_id = auth.uid()
  )
);

-- Favorites: authenticated customers can CRUD only their own favorites.
drop policy if exists "Authenticated users can read own favorites" on public.favorites;
create policy "Authenticated users can read own favorites"
on public.favorites
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "Authenticated users can add own favorites" on public.favorites;
create policy "Authenticated users can add own favorites"
on public.favorites
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "Authenticated users can update own favorites" on public.favorites;
create policy "Authenticated users can update own favorites"
on public.favorites
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Authenticated users can remove own favorites" on public.favorites;
create policy "Authenticated users can remove own favorites"
on public.favorites
for delete
to authenticated
using (auth.uid() = user_id);
