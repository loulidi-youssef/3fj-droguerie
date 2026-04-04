# Data Editing Guide

All editable business content is in this folder.

If Supabase is configured, products are read from database first.
For Supabase product editing, use `SUPABASE_SETUP.md` and update table `public.products`.

## Files to edit
- `business.ts`: brand name, phone, email, address, WhatsApp, maps links, opening hours, delivery rules.
- `homepage.ts`: homepage titles, subtitles, CTA labels, and promo texts.
- `categories.ts`: category list shown on homepage.
- `products.ts`: products and prices.
- `blog-posts.ts`: article content.
- `reviews.ts`: customer testimonials.
- `images.ts`: central image paths for hero and blog cards.

## Add a new product (beginner steps)
1. Open `products.ts`.
2. Copy one existing product object.
3. Change `id`, `slug`, `name`, `price`, `categorySlug`, descriptions, and rating.
4. Add your new image files in `/public/images/products`.
5. Update the `images` array in that product object.

## Replace images quickly
1. Place images in these folders:
   - `/public/images/products`
   - `/public/images/blog`
   - `/public/images/branding`
2. Update paths in `images.ts` (hero/blog) or `products.ts` (product images).

## Change WhatsApp number
- Edit `whatsappPhone` in `business.ts`.

## Change address and contact info
- Edit `address`, `phoneDisplay`, `email`, `openingHours`, `googleMapsUrl`, and `mapEmbedUrl` in `business.ts`.

## Edit homepage texts
- Edit `homepage.ts`.
