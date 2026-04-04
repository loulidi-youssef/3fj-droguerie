import type { Metadata } from "next";
import { OfferSection } from "@/components/offer-section";

export const metadata: Metadata = {
  title: "Offres",
  description:
    "Offres speciales sur les produits de droguerie et materiaux de construction a Fes.",
};

export default async function OffresPage() {
  return (
    <section className="bg-brand-light py-12">
      <div className="mx-auto max-w-7xl px-4 sm:px-5 lg:px-6">
        <h1 className="text-3xl font-extrabold text-brand-blue">Offres et Promotions</h1>
        <p className="mt-2 text-sm text-slate-600">
          Retrouvez toutes les offres actives sur nos produits pour vos travaux a Fes.
        </p>
      </div>
      <OfferSection variant="offres-page" />
    </section>
  );
}
