import Script from "next/script";
import type { Metadata } from "next";
import { headers } from "next/headers";
import { HeroSection } from "@/components/hero-section";
import { HomepageAdBanner } from "@/components/homepage-ad-banner";
import { FeaturesStrip } from "@/components/features-strip";
import { CategoriesProductsSection } from "@/components/categories-products-section";
import { OfferSection } from "@/components/offer-section";
import { HomepageSocialSection } from "@/components/homepage-social-section";
import { FloatingWhatsAppButton } from "@/components/floating-whatsapp-button";
import { getActiveAdsGroupedByPosition } from "@/lib/ads";
import { getSiteUrl } from "@/lib/site-url";
import { localBusinessJsonLd } from "@/lib/seo";
import type { Ad } from "@/types";

type AdsApiResponse = {
  ads?: {
    top?: AdsApiAd | null;
    middle?: AdsApiAd | null;
  };
};

type AdsApiAd = {
  id?: string;
  image_url?: string;
  title?: string | null;
  description?: string | null;
  link?: string;
  position?: "top" | "middle";
  start_date?: string | null;
  end_date?: string | null;
};

const toAd = (value: AdsApiAd | null | undefined): Ad | null => {
  if (!value) {
    return null;
  }

  if (!value.id || !value.image_url || !value.link || !value.position) {
    return null;
  }

  return {
    id: value.id,
    imageUrl: value.image_url,
    title: value.title ?? null,
    description: value.description ?? null,
    link: value.link,
    position: value.position,
    isActive: true,
    startDate: value.start_date ?? null,
    endDate: value.end_date ?? null,
  };
};

const getRequestOrigin = (): string => {
  const requestHeaders = headers();
  const host = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host");
  const protocol =
    requestHeaders.get("x-forwarded-proto") ??
    (host?.includes("localhost") ? "http" : "https");

  if (!host) {
    return getSiteUrl();
  }

  return `${protocol}://${host}`;
};

const getHomepageAds = async () => {
  try {
    const response = await fetch(`${getRequestOrigin()}/api/ads`, {
      cache: "no-store",
    });

    if (!response.ok) {
      return getActiveAdsGroupedByPosition();
    }

    const payload = (await response.json()) as AdsApiResponse;
    return {
      top: toAd(payload.ads?.top),
      middle: toAd(payload.ads?.middle),
    };
  } catch {
    return getActiveAdsGroupedByPosition();
  }
};

export const metadata: Metadata = {
  title: "Droguerie a Fes - Materiaux de construction et outillage",
  description:
    "3FJ Droguerie, magasin de materiaux de construction a Fes. Peinture, outillage, quincaillerie et livraison rapide.",
};

export default async function Home() {
  const activeAds = await getHomepageAds();

  return (
    <>
      <Script
        id="local-business-jsonld"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(localBusinessJsonLd) }}
      />
      <HomepageAdBanner ad={activeAds.top} slot="top" />
      <HeroSection />
      <FeaturesStrip />
      <CategoriesProductsSection />
      <HomepageAdBanner ad={activeAds.middle} slot="middle" />
      <OfferSection variant="homepage" maxOffers={4} />
      <HomepageSocialSection />
      <FloatingWhatsAppButton />
    </>
  );
}
