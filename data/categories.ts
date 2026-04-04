import type { Category } from "@/types";

export const categories: Category[] = [
  { id: "bricolage", name: "Bricolage", slug: "bricolage" },
  { id: "peinture", name: "Peinture", slug: "peinture" },
  { id: "outillage", name: "Outillage", slug: "outillage" },
  { id: "electricite", name: "Electricite", slug: "electricite" },
  { id: "plomberie", name: "Plomberie", slug: "plomberie" },
  { id: "quincaillerie", name: "Quincaillerie", slug: "quincaillerie" },
  {
    id: "materiaux-construction",
    name: "Materiaux de construction",
    slug: "materiaux-construction",
  },
  {
    id: "location-outils",
    name: "Location des outils de bricolage",
    slug: "location-outils",
  },
];

export const getCategoryBySlug = (slug: string) =>
  categories.find((category) => category.slug === slug);

export const getCategoryNameBySlug = (slug: string) =>
  getCategoryBySlug(slug)?.name ?? "Categorie";