# 3FJ Droguerie - Beginner Guide

## Run project
1. `npm install`
2. `npm run dev`
3. Open `http://localhost:3000`

## Production launch
- Use `LAUNCH_CHECKLIST.md` for the final deployment checklist.
- Set all production environment variables (including `NEXT_PUBLIC_SITE_URL`).
- For admin auth, set `ADMIN_ACCESS_PASSWORD_HASH` (pbkdf2 format) and `ADMIN_SESSION_SECRET` in Vercel, then redeploy.
- Verify `robots.txt` and `sitemap.xml` after deploy:
  - `/robots.txt`
  - `/sitemap.xml`

## Supabase integration
- Setup guide: `SUPABASE_SETUP.md`
- SQL files: `supabase/schema.sql`, `supabase/seed-products.sql`, `supabase/seed-offers.sql`, `supabase/seed-blog-posts.sql`, `supabase/seed-reviews.sql`
- Migrations: `supabase/migrations/*`
- Admin orders: `/admin/login` then `/admin/orders`
- Admin products: `/admin/login` then `/admin/products`
- Admin offers: `/admin/login` then `/admin/offres`
- Admin blog: `/admin/login` then `/admin/blog`
- Admin reviews: `/admin/login` then `/admin/reviews`

## Beginner edits (most common)
- Add product: `data/products.ts`
- Replace images: `public/images/products`, `public/images/blog`, `public/images/branding`
- Change WhatsApp: `data/business.ts` -> `whatsappPhone`
- Edit homepage texts: `data/homepage.ts`
- Edit address/phone/email/hours/maps: `data/business.ts`

More details: `data/README.md`
