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
import { buildSocialMetadata, localBusinessJsonLd } from "@/lib/seo";

const homeTitle = "Droguerie materiaux de construction a Fes | Prix Maroc";
const homeDescription =
  "3FJ Droguerie a Fes: materiaux de construction, peinture, outillage et quincaillerie avec livraison rapide et paiement a la livraison.";

export const metadata: Metadata = {
  title: homeTitle,
  description: homeDescription,
  ...buildSocialMetadata({
    title: homeTitle,
    description: homeDescription,
    canonicalPath: "/",
  }),
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
      <div className="hidden md:block">
        <HomepageAdBanner ad={activeAds.top} slot="top" />
      </div>
      <HeroSection />
      <section className="hidden bg-[#f1f3f5] pb-3 md:block">
        <div className="mx-auto max-w-7xl px-3 sm:px-5 lg:px-6">
          <div className="rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-xs text-slate-700 shadow-[0_6px_14px_rgba(15,42,77,0.08)] sm:rounded-xl sm:px-5 sm:py-4 sm:text-sm">
            <h2 className="text-sm font-extrabold uppercase tracking-tight text-brand-blue sm:text-lg">
              Droguerie materiaux de construction a Fes
            </h2>
            <p className="mt-1 leading-relaxed">
              Commandez vos materiaux de construction, outils et produits de quincaillerie avec livraison rapide a Fes, retrait magasin et paiement a la livraison.
            </p>
            <div className="mt-1.5 flex max-w-full gap-1.5 overflow-x-auto pb-0.5 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden sm:mt-2.5 sm:flex-wrap sm:overflow-visible sm:pb-0 sm:gap-2">
              <a
                href="/produits?categorie=peinture"
                className="inline-flex shrink-0 rounded-full border border-slate-300 bg-white px-2.5 py-0.5 text-[11px] font-semibold text-brand-blue transition hover:border-brand-orange hover:text-brand-orange sm:px-3 sm:py-1 sm:text-xs"
              >
                Peinture
              </a>
              <a
                href="/produits?categorie=outillage"
                className="inline-flex shrink-0 rounded-full border border-slate-300 bg-white px-2.5 py-0.5 text-[11px] font-semibold text-brand-blue transition hover:border-brand-orange hover:text-brand-orange sm:px-3 sm:py-1 sm:text-xs"
              >
                Outillage
              </a>
              <a
                href="/produits?categorie=bricolage"
                className="inline-flex shrink-0 rounded-full border border-slate-300 bg-white px-2.5 py-0.5 text-[11px] font-semibold text-brand-blue transition hover:border-brand-orange hover:text-brand-orange sm:px-3 sm:py-1 sm:text-xs"
              >
                Bricolage
              </a>
              <a
                href="/offres"
                className="inline-flex shrink-0 rounded-full border border-orange-200 bg-orange-50 px-2.5 py-0.5 text-[11px] font-semibold text-brand-orange transition hover:border-brand-orange sm:px-3 sm:py-1 sm:text-xs"
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
      <OfferSection variant="homepage" maxOffers={2} />
      <HomepageSocialSection />
      <FloatingWhatsAppButton />
    </>
  );
}
