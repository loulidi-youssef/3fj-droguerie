-- 3FJ Droguerie - initial offers seed
-- Run after schema.sql.

insert into public.offers (
  id,
  title,
  short_description,
  discount_label,
  product_id,
  discounted_price,
  start_at,
  end_at,
  image_path,
  banner_text,
  is_active,
  is_featured
)
values
(
  'offre-prix-printemps',
  'Offre Speciale Chantier',
  'Remise immediate sur une selection de produits de bricolage et materiaux de construction.',
  '-20%',
  'perceuse',
  300,
  '2026-04-01T00:00:00+01:00',
  '2026-12-31T23:59:59+01:00',
  null,
  'Offre limitee - stock disponible en magasin',
  true,
  true
)
on conflict (id) do update set
  title = excluded.title,
  short_description = excluded.short_description,
  discount_label = excluded.discount_label,
  product_id = excluded.product_id,
  discounted_price = excluded.discounted_price,
  start_at = excluded.start_at,
  end_at = excluded.end_at,
  image_path = excluded.image_path,
  banner_text = excluded.banner_text,
  is_active = excluded.is_active,
  is_featured = excluded.is_featured,
  updated_at = now();
