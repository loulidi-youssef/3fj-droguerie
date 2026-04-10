# Supabase Setup (3FJ Droguerie)

This project uses `supabase/migrations/*` as the database source of truth.

## 1. Create Supabase project
1. Create a new Supabase project at https://supabase.com.
2. Save your database password and wait for provisioning to complete.

## 2. Apply database schema (canonical path)
Preferred: migration-driven setup.

Option A (recommended, Supabase CLI):
1. Link your local project: `supabase link --project-ref <project-ref>`.
2. Apply all migrations in order: `supabase db push`.

Option B (SQL Editor, no CLI):
1. Open `SQL Editor` in Supabase.
2. Run each file from `supabase/migrations` in filename order.
3. Do not cherry-pick older migration names from previous docs.

Notes:
- `supabase/schema.sql` is a convenience snapshot for audit/reference.
- If there is any mismatch, migrations win.

## 3. Seed initial content
Run these seed files after migrations:
1. `supabase/seed-products.sql`
2. `supabase/seed-offers.sql`
3. `supabase/seed-blog-posts.sql`
4. `supabase/seed-reviews.sql`

## 4. Configure environment variables
Copy `.env.example` to `.env.local` and set:

```env
NEXT_PUBLIC_SITE_URL=https://3fj-droguerie.ma
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
ADMIN_ACCESS_PASSWORD_HASH=pbkdf2_sha256$<iterations>$<salt>$<hex_digest>
ADMIN_SESSION_SECRET=<long_random_secret_at_least_32_chars>
# Development-only fallback:
# ADMIN_ACCESS_PASSWORD=...
```

Generate admin hash locally:
1. `npm run admin:hash -- "your-plain-admin-password"`
2. Optional verify: `npm run admin:hash -- --verify "your-plain-admin-password" 'pbkdf2_sha256$...'`

## 5. Run app
1. `npm install`
2. `npm run dev`
3. Open `http://localhost:3000`

## 6. Quick verification
1. `/produits` shows products from Supabase.
2. `/offres` shows active offers.
3. `/panier` checkout works for both guest and authenticated users.
4. In Supabase, verify inserts in `orders` and `order_items`.

## 7. Customer auth (optional)
1. In Supabase `Authentication > Providers`, keep Email enabled.
2. In `Authentication > URL Configuration`, add your site URL.
3. Test `/register`, `/login`, `/compte/commandes`.

## Operational notes
- Commerce writes (orders, quote requests, admin mutations) require `SUPABASE_SERVICE_ROLE_KEY`.
- Keep service role key server-only.
- Admin pages require `/admin/login`.
