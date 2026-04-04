import Script from "next/script";
import type { Metadata } from "next";
import { HeroSection } from "@/components/hero-section";
import { FeaturesStrip } from "@/components/features-strip";
import { CategoriesProductsSection } from "@/components/categories-products-section";
import { OfferSection } from "@/components/offer-section";
import { ReviewsSection } from "@/components/reviews-section";
import { BlogSection } from "@/components/blog-section";
import { localBusinessJsonLd } from "@/lib/seo";

export const metadata: Metadata = {
  title: "Droguerie a Fes - Materiaux de construction et outillage",
  description:
    "3FJ Droguerie, magasin de materiaux de construction a Fes. Peinture, outillage, quincaillerie et livraison rapide.",
};

export default async function Home() {
  return (
    <>
      <Script
        id="local-business-jsonld"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(localBusinessJsonLd) }}
      />
      <HeroSection />
      <FeaturesStrip />
      <CategoriesProductsSection />
      <OfferSection variant="homepage" maxOffers={4} />
      <ReviewsSection />
      <BlogSection />
    </>
  );
}
