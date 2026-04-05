-- Align customer cancellation RLS policy with business rule: 2-hour window.

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
