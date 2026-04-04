-- 3FJ Droguerie - initial products seed
-- Run after schema.sql.

insert into public.products (
  id,
  slug,
  name,
  price,
  stock,
  short_description,
  description,
  category_slug,
  rating,
  images,
  is_active
)
values
(
  'peinture-atlas-20kg',
  'peinture-atlas-20kg',
  'Peinture Atlas 20kg',
  200,
  25,
  'Peinture de finition resistante pour interieur et exterieur.',
  'Peinture Atlas de haute qualite avec excellente couvrance et bonne durabilite.',
  'peinture',
  4.8,
  array[
    '/images/products/peinture-atlas.svg',
    '/images/products/peinture-atlas-detail-1.svg',
    '/images/products/peinture-atlas-detail-2.svg'
  ],
  true
),
(
  'ciment-50kg',
  'ciment-50kg',
  'Ciment 50kg',
  80,
  40,
  'Ciment solide pour construction et travaux.',
  'Ciment de qualite professionnelle adapte aux travaux de construction et de renovation.',
  'materiaux-construction',
  4.7,
  array['/images/products/peinture-atlas-detail-1.svg'],
  true
),
(
  'marteau',
  'marteau',
  'Marteau',
  60,
  30,
  'Marteau robuste pour travaux de bricolage.',
  'Marteau solide et durable pour usage professionnel et domestique.',
  'outillage',
  4.5,
  array['/images/products/marteau-pro.jpg'],
  true
),
(
  'perceuse',
  'perceuse',
  'Perceuse',
  350,
  12,
  'Perceuse puissante pour tous travaux.',
  'Perceuse performante ideale pour percage dans differents materiaux.',
  'outillage',
  4.6,
  array[
    '/images/products/perceuse-bosch.jpg',
    '/images/products/perceuse-electrique.svg'
  ],
  true
),
(
  'tournevis',
  'tournevis',
  'Tournevis',
  30,
  55,
  'Tournevis pratique pour visser et devisser.',
  'Outil essentiel pour travaux de bricolage et maintenance.',
  'outillage',
  4.4,
  array['/images/products/perceuse-electrique-detail-1.svg'],
  true
),
(
  'cable-electrique',
  'cable-electrique',
  'Cable electrique',
  100,
  20,
  'Cable electrique securise et fiable.',
  'Cable de haute qualite pour installations electriques domestiques et professionnelles.',
  'electricite',
  4.5,
  array['/images/products/perceuse-electrique-detail-2.svg'],
  true
)
on conflict (id) do update set
  slug = excluded.slug,
  name = excluded.name,
  price = excluded.price,
  stock = excluded.stock,
  short_description = excluded.short_description,
  description = excluded.description,
  category_slug = excluded.category_slug,
  rating = excluded.rating,
  images = excluded.images,
  is_active = excluded.is_active,
  updated_at = now();
