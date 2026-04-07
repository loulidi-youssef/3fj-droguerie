# 3FJ Droguerie - Launch Checklist

Use this checklist before going live.

## 1. Environment variables (Production)
Set these values in your hosting platform (for example Vercel):

```env
NEXT_PUBLIC_SITE_URL=https://3fj-droguerie.ma
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
ADMIN_ACCESS_PASSWORD_HASH=pbkdf2_sha256$<iterations>$<salt>$<hex_digest>
ADMIN_SESSION_SECRET=<long_random_secret_at_least_32_chars>
```

Rules:
- Never expose `SUPABASE_SERVICE_ROLE_KEY` in frontend code.
- `ADMIN_ACCESS_PASSWORD_HASH` must be `pbkdf2_sha256$<iterations>$<salt>$<hex_digest>` (bcrypt is not supported).
- Generate hash locally with `npm run admin:hash -- "your-plain-admin-password"`.
- Verify hash locally with `npm run admin:hash -- --verify "your-plain-admin-password" 'pbkdf2_sha256$...'`.
- If your shell expands `$`, keep the hash in single quotes.
- Set `ADMIN_ACCESS_PASSWORD_HASH` only (do not set deprecated `ADMIN_ACCESS_PASSWORD` / `ADMIN_PASSWORD` in production).
- Use a strong random `ADMIN_SESSION_SECRET` (32+ characters).

Vercel steps:
1. Open Project -> Settings -> Environment Variables.
2. Add/update `ADMIN_ACCESS_PASSWORD_HASH` and `ADMIN_SESSION_SECRET` for `Production`.
3. Remove `ADMIN_ACCESS_PASSWORD` and `ADMIN_PASSWORD` if present.
4. Trigger a new deployment (env var changes are applied per deployment).
5. Verify `/admin/login` with the original plaintext password used to generate the hash.

## 2. Supabase production checks
1. Run latest SQL schema/migrations.
2. Confirm tables exist: `products`, `offers`, `orders`, `order_items`, `blog_posts`, `reviews`.
3. Confirm RLS is enabled on all public tables.
4. Confirm public read policies exist only for active/published content.
5. Verify `orders` and `order_items` inserts work from `/panier`.

## 3. Build and deploy
1. Run local checks:
   - `npm run typecheck`
   - `npm run build`
2. Deploy production build.
3. Attach your real domain (`3fj-droguerie.ma`).

## 4. Post-deploy smoke test
1. Visit main pages:
   - `/`
   - `/produits`
   - `/offres`
   - `/blog`
   - `/contact`
2. Test cart flow:
   - Add product
   - Go to `/panier`
   - Confirm order
   - Verify WhatsApp opens
3. Verify order saved in Supabase (`orders` + `order_items`).
4. Test admin:
   - `/admin/login`
   - `/admin/orders`
   - `/admin/products`
   - `/admin/offres`
   - `/admin/blog`
   - `/admin/reviews`
   - Confirm no message about missing `ADMIN_ACCESS_PASSWORD_HASH` / `ADMIN_SESSION_SECRET`
   - Confirm successful login with the original plaintext password
5. Check SEO files:
   - `/robots.txt`
   - `/sitemap.xml`

## 5. Launch day operations
1. Keep one person monitoring admin orders continuously.
2. Keep one person monitoring WhatsApp response time.
3. Save daily Supabase backup/export for the first week.
4. Track failed orders and customer phone issues.

## 6. Nice-to-have right after launch
1. Connect analytics (GA4 or Plausible).
2. Add uptime monitoring for homepage and `/api/orders`.
3. Add alerting on Supabase errors.
