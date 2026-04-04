import type { Offer } from "@/types";

export const offers: Offer[] = [
  {
    id: "offre-prix-printemps",
    title: "Offre Speciale Chantier",
    shortDescription:
      "Remise immediate sur une selection de produits de bricolage et materiaux de construction.",
    discountLabel: "-20%",
    productId: "perceuse",
    discountedPrice: 300,
    startAt: "2026-04-01T00:00:00+01:00",
    endAt: "2026-12-31T23:59:59+01:00",
    bannerText: "Offre limitee - stock disponible en magasin",
    imagePath: null,
    isActive: true,
    isFeatured: true,
  },
];
