-- 3FJ Droguerie - initial blog posts seed
-- Run after schema.sql and blog/reviews migration.

insert into public.blog_posts (
  id,
  slug,
  title,
  excerpt,
  content,
  cover_image_path,
  seo_title,
  seo_description,
  is_published,
  published_at
)
values
(
  'droguerie-fes-comment-choisir-les-bons-produits',
  'droguerie-fes-comment-choisir-les-bons-produits',
  'Droguerie Fes: comment choisir les bons produits pour vos travaux',
  'Guide pratique pour comparer qualite, budget et usage avant d''acheter en droguerie a Fes.',
  'Choisir une bonne droguerie a Fes commence par verifier la disponibilite des references essentielles: peinture, outillage, quincaillerie et consommables de chantier.

Demandez toujours des conseils sur la compatibilite des produits selon votre support: mur neuf, mur ancien, metal ou bois. Un bon choix au depart evite les surcouts.

Chez 3FJ Droguerie, nous accompagnons les clients particuliers et professionnels pour selectionner les materiaux adaptes a leur budget.',
  '/images/blog/blog-droguerie-fes.svg',
  null,
  'Conseils pour bien acheter en droguerie a Fes: qualite des materiaux, prix, et produits adaptes a chaque chantier.',
  true,
  '2026-01-12T09:00:00+01:00'
),
(
  'materiaux-construction-fes-les-erreurs-a-eviter',
  'materiaux-construction-fes-les-erreurs-a-eviter',
  'Materiaux de construction Fes: 7 erreurs a eviter avant d''acheter',
  'Evitez les erreurs frequentes qui augmentent le cout et ralentissent votre chantier a Fes.',
  'La premiere erreur est d''acheter sans estimation precise des quantites. Une bonne preparation permet de reduire les pertes.

La seconde est de privilegier uniquement le prix bas. Sur chantier, la durabilite des materiaux est determinante pour eviter des reprises.

Pensez aussi a planifier la logistique de livraison a Fes pour ne pas bloquer l''avancement des equipes.',
  '/images/blog/blog-materiaux-fes.svg',
  null,
  'Decouvrez les erreurs courantes lors de l''achat de materiaux de construction a Fes et comment les eviter.',
  true,
  '2026-01-25T09:00:00+01:00'
),
(
  'outillage-fes-perceuse-ou-visseuse',
  'outillage-fes-perceuse-ou-visseuse',
  'Outillage Fes: perceuse ou visseuse, lequel choisir?',
  'Comparatif simple pour choisir l''outil adapte selon vos usages en maison ou sur chantier.',
  'La perceuse est ideale pour percer des materiaux durs comme le beton leger, la brique ou le metal.

La visseuse offre plus de confort pour l''assemblage de meubles et la fixation repetee de vis.

Pour un usage polyvalent a Fes, optez pour un modele fiable et verifiez toujours la disponibilite des accessoires.',
  '/images/blog/blog-outillage-fes.svg',
  null,
  'Perceuse ou visseuse a Fes: quel outillage acheter selon vos besoins de bricolage et travaux.',
  true,
  '2026-02-04T09:00:00+01:00'
),
(
  'peinture-maison-fes-combien-de-couches',
  'peinture-maison-fes-combien-de-couches',
  'Peinture maison a Fes: combien de couches pour un rendu professionnel?',
  'Le nombre de couches depend du support, de la couleur et de la qualite du produit utilise.',
  'En renovation, une sous-couche est souvent necessaire pour uniformiser le support avant peinture.

Deux couches de finition suffisent dans la majorite des cas pour obtenir une bonne couvrance.

Un sechage respecte entre les couches ameliore le rendu final et la durabilite de la peinture.',
  '/images/blog/blog-peinture-fes.svg',
  null,
  'Decouvrez combien de couches de peinture prevoir pour vos murs a Fes et reussir votre finition.',
  true,
  '2026-02-17T09:00:00+01:00'
),
(
  'quincaillerie-fes-checklist-de-base',
  'quincaillerie-fes-checklist-de-base',
  'Quincaillerie Fes: la checklist de base pour vos petits travaux',
  'Vis, chevilles, rubans et accessoires: la liste indispensable a garder chez soi.',
  'Conservez un stock minimum de vis et de chevilles de differentes tailles pour gerer les urgences.

Ajoutez des colles de fixation, rubans d''etancheite et joints pour les interventions rapides.

Une bonne organisation de votre quincaillerie vous fait gagner du temps et evite les deplacements inutiles.',
  '/images/blog/blog-quincaillerie-fes.svg',
  null,
  'Checklist quincaillerie a Fes: les indispensables pour les petits travaux domestiques.',
  true,
  '2026-03-05T09:00:00+01:00'
),
(
  'livraison-materiaux-fes-conseils',
  'livraison-materiaux-fes-conseils',
  'Livraison de materiaux a Fes: comment bien planifier votre chantier',
  'Anticipez vos besoins pour recevoir les bons produits au bon moment et limiter les retards.',
  'Planifiez les etapes du chantier et repartissez les commandes en fonction des priorites reelles.

Confirmez les creneaux de livraison et les acces du site pour eviter les blocages le jour J.

Une livraison bien organisee reduit les couts caches et accelere l''execution globale du projet.',
  '/images/blog/blog-livraison-fes.svg',
  null,
  'Conseils de livraison de materiaux de construction a Fes pour un chantier plus fluide.',
  true,
  '2026-03-19T09:00:00+01:00'
)
on conflict (id) do update set
  slug = excluded.slug,
  title = excluded.title,
  excerpt = excluded.excerpt,
  content = excluded.content,
  cover_image_path = excluded.cover_image_path,
  seo_title = excluded.seo_title,
  seo_description = excluded.seo_description,
  is_published = excluded.is_published,
  published_at = excluded.published_at,
  updated_at = now();
