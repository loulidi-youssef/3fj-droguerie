-- Critical RLS hardening sweep for production.
-- Goals:
-- 1) ensure RLS is enabled on every app table
-- 2) reset policies to least privilege
-- 3) preserve server-side service-role flows

create or replace function public.current_request_header(header_name text)
returns text
language sql
stable
as $$
  select nullif(
    btrim(
      coalesce(
        (
          nullif(current_setting('request.headers', true), '')::jsonb
          ->> lower(header_name)
        ),
        ''
      )
    ),
    ''
  );
$$;

-- Ensure RLS is enabled across all app tables.
alter table if exists public.products enable row level security;
alter table if exists public.product_variants enable row level security;
alter table if exists public.orders enable row level security;
alter table if exists public.order_items enable row level security;
alter table if exists public.offers enable row level security;
alter table if exists public.ads enable row level security;
alter table if exists public.ad_plans enable row level security;
alter table if exists public.ad_events enable row level security;
alter table if exists public.ad_event_stats enable row level security;
alter table if exists public.blog_posts enable row level security;
alter table if exists public.reviews enable row level security;
alter table if exists public.favorites enable row level security;
alter table if exists public.quote_requests enable row level security;
alter table if exists public.quote_request_notes enable row level security;
alter table if exists public.admin_auth_sessions enable row level security;
alter table if exists public.admin_login_attempts enable row level security;
alter table if exists public.order_idempotency_keys enable row level security;
alter table if exists public.request_rate_limits enable row level security;

-- Public catalog tables: read-only for anon/authenticated.
drop policy if exists "Public can read active products" on public.products;
create policy "Public can read active products"
on public.products
for select
to anon, authenticated
using (is_active = true);

drop policy if exists "Service role full access products" on public.products;
create policy "Service role full access products"
on public.products
for all
to service_role
using (true)
with check (true);

drop policy if exists "Public can read active product variants" on public.product_variants;
create policy "Public can read active product variants"
on public.product_variants
for select
to anon, authenticated
using (is_active = true);

drop policy if exists "Service role full access product variants" on public.product_variants;
create policy "Service role full access product variants"
on public.product_variants
for all
to service_role
using (true)
with check (true);

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

drop policy if exists "Service role full access offers" on public.offers;
create policy "Service role full access offers"
on public.offers
for all
to service_role
using (true)
with check (true);

drop policy if exists "Public can read active scheduled ads" on public.ads;
create policy "Public can read active scheduled ads"
on public.ads
for select
to anon, authenticated
using (
  is_active = true
  and (start_date is null or start_date <= now())
  and (end_date is null or end_date > now())
);

drop policy if exists "Service role full access ads" on public.ads;
create policy "Service role full access ads"
on public.ads
for all
to service_role
using (true)
with check (true);

drop policy if exists "Public can read published blog posts" on public.blog_posts;
create policy "Public can read published blog posts"
on public.blog_posts
for select
to anon, authenticated
using (
  is_published = true
  and (published_at is null or published_at <= now())
);

drop policy if exists "Service role full access blog posts" on public.blog_posts;
create policy "Service role full access blog posts"
on public.blog_posts
for all
to service_role
using (true)
with check (true);

drop policy if exists "Public can read active reviews" on public.reviews;
create policy "Public can read active reviews"
on public.reviews
for select
to anon, authenticated
using (is_active = true);

drop policy if exists "Service role full access reviews" on public.reviews;
create policy "Service role full access reviews"
on public.reviews
for all
to service_role
using (true)
with check (true);

-- Orders: user-owned reads, all writes via backend service-role paths.
drop policy if exists "Authenticated users can read own orders" on public.orders;
create policy "Authenticated users can read own orders"
on public.orders
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "Authenticated users can cancel own recent new orders" on public.orders;

drop policy if exists "Service role full access orders" on public.orders;
create policy "Service role full access orders"
on public.orders
for all
to service_role
using (true)
with check (true);

-- Order items: only owner can read, writes via backend service role.
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

drop policy if exists "Service role full access order items" on public.order_items;
create policy "Service role full access order items"
on public.order_items
for all
to service_role
using (true)
with check (true);

-- Favorites: authenticated users manage only their rows.
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

drop policy if exists "Service role full access favorites" on public.favorites;
create policy "Service role full access favorites"
on public.favorites
for all
to service_role
using (true)
with check (true);

-- Quote requests:
-- - read: own user rows (authenticated) OR matching anonymous id header (anon)
-- - write: backend service role only (API validation path)

drop policy if exists "Authenticated users can read own quote requests" on public.quote_requests;
create policy "Authenticated users can read own quote requests"
on public.quote_requests
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "Anonymous users can read own quote requests by anonymous id" on public.quote_requests;
create policy "Anonymous users can read own quote requests by anonymous id"
on public.quote_requests
for select
to anon
using (
  anonymous_id = public.current_request_header('x-quote-anonymous-id')
);

drop policy if exists "Authenticated users can create own quote requests" on public.quote_requests;
drop policy if exists "Anonymous users can create quote requests" on public.quote_requests;

drop policy if exists "Service role can read quote requests" on public.quote_requests;
drop policy if exists "Service role can update quote requests" on public.quote_requests;
drop policy if exists "Service role full access quote requests" on public.quote_requests;
create policy "Service role full access quote requests"
on public.quote_requests
for all
to service_role
using (true)
with check (true);

-- Quote notes: admin/service-role only.
drop policy if exists "Service role can read quote request notes" on public.quote_request_notes;
drop policy if exists "Service role can create quote request notes" on public.quote_request_notes;
drop policy if exists "Service role can update quote request notes" on public.quote_request_notes;
drop policy if exists "Service role can delete quote request notes" on public.quote_request_notes;
drop policy if exists "Service role full access quote request notes" on public.quote_request_notes;
create policy "Service role full access quote request notes"
on public.quote_request_notes
for all
to service_role
using (true)
with check (true);

-- Ads monetization/internal analytics: backend service-role only.
drop policy if exists "Service role full access ad plans" on public.ad_plans;
create policy "Service role full access ad plans"
on public.ad_plans
for all
to service_role
using (true)
with check (true);

drop policy if exists "Service role full access ad events" on public.ad_events;
create policy "Service role full access ad events"
on public.ad_events
for all
to service_role
using (true)
with check (true);

drop policy if exists "Service role full access ad event stats" on public.ad_event_stats;
create policy "Service role full access ad event stats"
on public.ad_event_stats
for all
to service_role
using (true)
with check (true);

-- Admin auth + infra guards: service-role only.
drop policy if exists "Service role full access admin auth sessions" on public.admin_auth_sessions;
create policy "Service role full access admin auth sessions"
on public.admin_auth_sessions
for all
to service_role
using (true)
with check (true);

drop policy if exists "Service role full access admin login attempts" on public.admin_login_attempts;
create policy "Service role full access admin login attempts"
on public.admin_login_attempts
for all
to service_role
using (true)
with check (true);

drop policy if exists "Service role full access order idempotency keys" on public.order_idempotency_keys;
create policy "Service role full access order idempotency keys"
on public.order_idempotency_keys
for all
to service_role
using (true)
with check (true);

drop policy if exists "Service role full access request rate limits" on public.request_rate_limits;
create policy "Service role full access request rate limits"
on public.request_rate_limits
for all
to service_role
using (true)
with check (true);

-- Defensive privilege revocations for sensitive tables.
revoke all on table public.quote_request_notes from public, anon, authenticated;
revoke all on table public.admin_auth_sessions from public, anon, authenticated;
revoke all on table public.admin_login_attempts from public, anon, authenticated;
revoke all on table public.order_idempotency_keys from public, anon, authenticated;
revoke all on table public.request_rate_limits from public, anon, authenticated;
revoke all on table public.ad_events from public, anon, authenticated;
revoke all on table public.ad_event_stats from public, anon, authenticated;
revoke all on table public.ad_plans from public, anon, authenticated;
