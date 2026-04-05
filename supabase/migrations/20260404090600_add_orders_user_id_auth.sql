-- Link orders to authenticated customers (optional account flow).
-- Guest checkout remains supported because user_id stays nullable.

alter table public.orders
add column if not exists user_id uuid references auth.users(id) on delete set null;

create index if not exists idx_orders_user_id on public.orders(user_id);

alter table public.orders enable row level security;

drop policy if exists "Authenticated users can read own orders" on public.orders;
create policy "Authenticated users can read own orders"
on public.orders
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "Authenticated users can cancel own recent new orders" on public.orders;
create policy "Authenticated users can cancel own recent new orders"
on public.orders
for update
to authenticated
using (
  auth.uid() = user_id
  and status = 'new'
  and created_at >= now() - interval '1 hour'
)
with check (
  auth.uid() = user_id
  and status = 'cancelled'
);
