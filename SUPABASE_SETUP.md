# Supabase Setup (3FJ Droguerie)

This guide connects the current Next.js frontend to Supabase without rebuilding the UI.

## 1. Create Supabase project
1. Go to https://supabase.com and create a new project.
2. Choose a strong database password and save it.
3. Wait until the project is fully provisioned.

## 2. Create tables
1. In Supabase, open `SQL Editor`.
2. Run `supabase/schema.sql`.
3. Run `supabase/seed-products.sql` to insert the current products.
4. Run `supabase/seed-offers.sql` to insert the initial offer.
5. Run `supabase/seed-blog-posts.sql` to insert initial blog posts.
6. Run `supabase/seed-reviews.sql` to insert initial reviews.
7. If your database was created before stock/offers support, run:
   - `supabase/migrations/2026-04-04-add-stock-to-products.sql`
   - `supabase/migrations/2026-04-04-create-offers-table.sql`
   - `supabase/migrations/2026-04-04-link-offers-to-products.sql`
   - `supabase/migrations/2026-04-04-create-blog-and-reviews-tables.sql`
   - `supabase/migrations/2026-04-04-add-orders-user-id-auth.sql`
   - `supabase/migrations/2026-04-04-create-favorites-table.sql`

## 3. Get API keys
1. Open `Project Settings` -> `API`.
2. Copy:
   - `Project URL`
   - `anon public` key
   - `service_role` key (server-only, never expose on client)

## 4. Configure environment variables
1. Copy `.env.example` to `.env.local`.
2. Fill values:

```env
NEXT_PUBLIC_SITE_URL=https://3fj-droguerie.ma
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
ADMIN_ACCESS_PASSWORD_HASH=pbkdf2_sha256$<iterations>$<salt>$<hex_digest>
ADMIN_SESSION_SECRET=<long_random_secret_at_least_32_chars>
# Development only fallback:
# ADMIN_ACCESS_PASSWORD=...
```

## 5. Run project
1. `npm run dev`
2. Open `http://localhost:3000`

## 6. Quick verification
1. `/produits` should show products from Supabase.
2. Add products to cart.
3. In `/panier`, fill customer info and click `Confirmer et ouvrir WhatsApp`.
4. Check Supabase:
   - new row in `orders`
   - related rows in `order_items`

## 7. Customer account setup (optional)
1. In Supabase, open `Authentication` -> `Providers` and keep `Email` enabled.
2. Open `Authentication` -> `URL Configuration` and add your site URL.
3. Test `/register`, `/login`, and `/compte/commandes` from your app.
4. Logged-in checkout should create orders with `user_id`; guest checkout keeps `user_id` as null.

## Notes
- Delivery rules are still in code:
  - free delivery when subtotal `>= 300 DH`
  - otherwise `20 DH`
- If Supabase read config is missing, products fall back to `data/products.ts`.
- Order saving needs `SUPABASE_SERVICE_ROLE_KEY` configured.
- Admin orders page is available at `/admin/orders` after login on `/admin/login`.
- Admin products page is available at `/admin/products` after login on `/admin/login`.
- Admin offers page is available at `/admin/offres` after login on `/admin/login`.
- Admin blog page is available at `/admin/blog` after login on `/admin/login`.
- Admin reviews page is available at `/admin/reviews` after login on `/admin/login`.
