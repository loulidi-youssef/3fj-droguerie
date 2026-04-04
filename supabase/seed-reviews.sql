-- 3FJ Droguerie - initial reviews seed
-- Run after schema.sql and blog/reviews migration.

insert into public.reviews (
  id,
  customer_name,
  rating,
  testimonial_text,
  role,
  avatar_image_path,
  is_active
)
values
(
  'r1',
  'Youssef E.',
  5,
  'Service rapide, bons prix et produits fiables. Je recommande 3FJ Droguerie pour les chantiers.',
  'Entrepreneur a Fes',
  null,
  true
),
(
  'r2',
  'Khadija M.',
  5,
  'J''ai trouve facilement tout le necessaire pour la renovation de ma maison. Equipe professionnelle.',
  'Particuliere',
  null,
  true
),
(
  'r3',
  'Hamza T.',
  4,
  'Tres bon rapport qualite-prix, livraison correcte et bon accompagnement sur WhatsApp.',
  'Artisan',
  null,
  true
)
on conflict (id) do update set
  customer_name = excluded.customer_name,
  rating = excluded.rating,
  testimonial_text = excluded.testimonial_text,
  role = excluded.role,
  avatar_image_path = excluded.avatar_image_path,
  is_active = excluded.is_active,
  updated_at = now();
