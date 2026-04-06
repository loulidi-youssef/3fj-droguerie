import type { Metadata } from "next";
import { OfferSection } from "@/components/offer-section";

export const metadata: Metadata = {
  title: "Offres materiaux de construction a Fes",
  description:
    "Offres speciales sur les produits de droguerie et materiaux de construction a Fes.",
  alternates: {
    canonical: "/offres",
  },
};

export default async function OffresPage() {
  return (
    <section className="bg-[#f1f3f5] py-8 sm:py-10">
      <div className="mx-auto max-w-7xl px-4 sm:px-5 lg:px-6">
        <div className="rounded-2xl border border-slate-200 bg-white px-5 py-5 shadow-[0_10px_24px_rgba(15,42,77,0.08)] sm:px-6">
          <h1 className="text-[2rem] font-extrabold uppercase tracking-tight text-brand-blue sm:text-[2.35rem]">
            Offres et promotions
          </h1>
          <p className="mt-1 text-base text-slate-600">
            Retrouvez toutes les offres actives sur nos produits pour vos travaux a Fes.
          </p>
        </div>
      </div>
      <OfferSection variant="offres-page" />
    </section>
  );
}
