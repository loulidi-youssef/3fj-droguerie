import Script from "next/script";
import type { Metadata } from "next";
import { HeroSection } from "@/components/hero-section";
import { HomepageAdBanner } from "@/components/homepage-ad-banner";
import { FeaturesStrip } from "@/components/features-strip";
import { CategoriesProductsSection } from "@/components/categories-products-section";
import { OfferSection } from "@/components/offer-section";
import { HomepageSocialSection } from "@/components/homepage-social-section";
import { FloatingWhatsAppButton } from "@/components/floating-whatsapp-button";
import { getActiveAdsGroupedByPosition } from "@/lib/ads";
import { localBusinessJsonLd } from "@/lib/seo";

export const metadata: Metadata = {
  title: "Droguerie materiaux de construction a Fes | Prix Maroc",
  description:
    "3FJ Droguerie a Fes: materiaux de construction, peinture, outillage et quincaillerie avec livraison rapide et paiement a la livraison.",
  alternates: {
    canonical: "/",
  },
};

export default async function Home() {
  const activeAds = await getActiveAdsGroupedByPosition();

  return (
    <>
      <Script
        id="local-business-jsonld"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(localBusinessJsonLd) }}
      />
      <HomepageAdBanner ad={activeAds.top} slot="top" />
      <HeroSection />
      <section className="bg-[#f1f3f5] pb-4">
        <div className="mx-auto max-w-7xl px-4 sm:px-5 lg:px-6">
          <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 shadow-[0_6px_14px_rgba(15,42,77,0.08)] sm:px-5 sm:py-4">
            <h2 className="text-base font-extrabold uppercase tracking-tight text-brand-blue sm:text-lg">
              Droguerie materiaux de construction a Fes
            </h2>
            <p className="mt-1.5 leading-relaxed">
              Commandez vos materiaux de construction, outils et produits de quincaillerie avec livraison rapide a Fes, retrait magasin et paiement a la livraison.
            </p>
            <div className="mt-2.5 flex flex-wrap gap-2">
              <a
                href="/produits?categorie=peinture"
                className="inline-flex rounded-full border border-slate-300 bg-white px-3 py-1 text-xs font-semibold text-brand-blue transition hover:border-brand-orange hover:text-brand-orange"
              >
                Peinture
              </a>
              <a
                href="/produits?categorie=outillage"
                className="inline-flex rounded-full border border-slate-300 bg-white px-3 py-1 text-xs font-semibold text-brand-blue transition hover:border-brand-orange hover:text-brand-orange"
              >
                Outillage
              </a>
              <a
                href="/produits?categorie=bricolage"
                className="inline-flex rounded-full border border-slate-300 bg-white px-3 py-1 text-xs font-semibold text-brand-blue transition hover:border-brand-orange hover:text-brand-orange"
              >
                Bricolage
              </a>
              <a
                href="/offres"
                className="inline-flex rounded-full border border-orange-200 bg-orange-50 px-3 py-1 text-xs font-semibold text-brand-orange transition hover:border-brand-orange"
              >
                Offres actives
              </a>
            </div>
          </div>
        </div>
      </section>
      <FeaturesStrip />
      <CategoriesProductsSection />
      <HomepageAdBanner ad={activeAds.middle} slot="middle" />
      <OfferSection variant="homepage" maxOffers={4} />
      <HomepageSocialSection />
      <FloatingWhatsAppButton />
    </>
  );
}
