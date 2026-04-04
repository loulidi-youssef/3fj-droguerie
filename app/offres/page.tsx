import type { Metadata } from "next";
import { OfferSection } from "@/components/offer-section";

export const metadata: Metadata = {
  title: "Offres",
  description:
    "Offres speciales sur les produits de droguerie et materiaux de construction a Fes.",
};

export default async function OffresPage() {
  return (
    <section className="section-padding bg-brand-light">
      <div className="mx-auto max-w-7xl px-4 sm:px-5 lg:px-6">
        <h1 className="text-3xl font-extrabold tracking-tight text-brand-blue sm:text-4xl">
          Offres et Promotions
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-slate-600 sm:text-[0.95rem]">
          Retrouvez toutes les offres actives sur nos produits pour vos travaux a Fes.
        </p>
      </div>
      <OfferSection variant="offres-page" />
    </section>
  );
}
