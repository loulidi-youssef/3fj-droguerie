import { businessInfo } from "@/data/business";

export const localBusinessJsonLd = {
  "@context": "https://schema.org",
  "@type": "HardwareStore",
  name: businessInfo.brandName,
  legalName: businessInfo.legalName,
  telephone: businessInfo.phoneDisplay,
  address: {
    "@type": "PostalAddress",
    streetAddress: businessInfo.address,
    addressLocality: businessInfo.city,
    addressCountry: "MA",
  },
  areaServed: "Fes",
  url: "https://3fj-droguerie.ma",
};