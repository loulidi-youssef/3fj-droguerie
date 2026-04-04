import { categories } from "@/data/categories";
import type { Product } from "@/types";

// Beginner tip:
// 1) Copy one product object
// 2) Change id, slug, name, price, categorySlug
// 3) Update descriptions and images
export const products: Product[] = [
  {
    id: "peinture-atlas-20kg",
    slug: "peinture-atlas-20kg",
    name: "Peinture Atlas 20kg",
    price: 200,
    previousPrice: 240,
    categorySlug: "peinture",
    shortDescription: "Peinture de finition resistante pour interieur et exterieur.",
    description:
      "Peinture Atlas de haute qualite avec excellente couvrance et bonne durabilite.",
    rating: 4.8,
    isPromo: true,
    badgeLabel: "Promo",
    images: [
      "/images/products/peinture-atlas.svg",
      "/images/products/peinture-atlas-detail-1.svg",
      "/images/products/peinture-atlas-detail-2.svg",
    ],
  },
  {
    id: "ciment-50kg",
    slug: "ciment-50kg",
    name: "Ciment 50kg",
    price: 80,
    categorySlug: "materiaux-construction",
    shortDescription: "Ciment solide pour construction et travaux.",
    description:
      "Ciment de qualite professionnelle adapte aux travaux de construction et de renovation.",
    rating: 4.7,
    images: ["/images/products/peinture-atlas-detail-1.svg"],
  },
  {
    id: "marteau",
    slug: "marteau",
    name: "Marteau",
    price: 60,
    categorySlug: "outillage",
    shortDescription: "Marteau robuste pour travaux de bricolage.",
    description: "Marteau solide et durable pour usage professionnel et domestique.",
    rating: 4.5,
    images: ["/images/products/marteau-pro.jpg"],
  },
  {
    id: "perceuse",
    slug: "perceuse",
    name: "Perceuse",
    price: 350,
    categorySlug: "outillage",
    shortDescription: "Perceuse puissante pour tous travaux.",
    description: "Perceuse performante ideale pour percage dans differents materiaux.",
    rating: 4.6,
    isNew: true,
    badgeLabel: "Nouveau",
    images: [
      "/images/products/perceuse-bosch.jpg",
      "/images/products/perceuse-electrique.svg",
    ],
  },
  {
    id: "tournevis",
    slug: "tournevis",
    name: "Tournevis",
    price: 30,
    categorySlug: "outillage",
    shortDescription: "Tournevis pratique pour visser et devisser.",
    description: "Outil essentiel pour travaux de bricolage et maintenance.",
    rating: 4.4,
    images: ["/images/products/perceuse-electrique-detail-1.svg"],
  },
  {
    id: "cable-electrique",
    slug: "cable-electrique",
    name: "Cable electrique",
    price: 100,
    categorySlug: "electricite",
    shortDescription: "Cable electrique securise et fiable.",
    description:
      "Cable de haute qualite pour installations electriques domestiques et professionnelles.",
    rating: 4.5,
    images: ["/images/products/perceuse-electrique-detail-2.svg"],
  },
];

const categorySlugSet = new Set(categories.map((category) => category.slug));
const productSlugSet = new Set<string>();

for (const product of products) {
  if (!product.id.trim()) throw new Error(`Produit invalide: id manquant`);
  if (!product.slug.trim()) throw new Error(`Produit invalide (${product.id}): slug manquant`);
  if (productSlugSet.has(product.slug)) {
    throw new Error(`Produit invalide (${product.id}): slug duplique (${product.slug})`);
  }
  productSlugSet.add(product.slug);

  if (!categorySlugSet.has(product.categorySlug)) {
    throw new Error(
      `Produit invalide (${product.id}): categorySlug inconnu (${product.categorySlug})`,
    );
  }

  if (!Array.isArray(product.images) || product.images.length === 0) {
    throw new Error(`Produit invalide (${product.id}): images manquantes`);
  }

  if (product.images.some((image) => !image.startsWith("/images/"))) {
    throw new Error(
      `Produit invalide (${product.id}): image doit commencer par /images/`,
    );
  }

  if (product.price <= 0) {
    throw new Error(`Produit invalide (${product.id}): prix incorrect`);
  }
}
