import type { Metadata } from "next";
import { businessInfo } from "@/data/business";

export const metadata: Metadata = {
  title: "Contact",
  description: "Contactez 3FJ Droguerie a Fes pour vos besoins en materiaux de construction et outillage.",
};

export default function ContactPage() {
  return (
    <section className="bg-brand-light py-12">
      <div className="mx-auto max-w-5xl px-4">
        <h1 className="text-3xl font-extrabold text-brand-blue">Contact - 3FJ Droguerie</h1>
        <p className="mt-2 text-sm text-slate-600">Nous sommes a votre ecoute pour vos commandes a Fes.</p>

        <div className="mt-6 grid gap-6 md:grid-cols-2">
          <div className="rounded-2xl bg-white p-6 shadow-card">
            <h2 className="text-xl font-bold text-brand-blue">Coordonnees</h2>
            <p className="mt-4 text-sm text-slate-700">Telephone: {businessInfo.phoneDisplay}</p>
            <p className="mt-2 text-sm text-slate-700">Email: {businessInfo.email}</p>
            <p className="mt-2 text-sm text-slate-700">Adresse: {businessInfo.address}</p>
            <p className="mt-2 text-xs text-slate-500">Horaires: {businessInfo.openingHours}</p>
            <a
              href={`https://wa.me/${businessInfo.whatsappPhone}`}
              target="_blank"
              rel="noreferrer"
              className="mt-5 inline-flex rounded-full bg-brand-orange px-4 py-2 text-sm font-semibold text-white"
            >
              Commander sur WhatsApp
            </a>
          </div>

          <div className="overflow-hidden rounded-2xl bg-white shadow-card">
            <iframe
              title="Google Maps 3FJ Droguerie"
              src={businessInfo.mapEmbedUrl}
              className="h-72 w-full"
              loading="lazy"
            />
            <div className="p-4">
              <a
                href={businessInfo.googleMapsUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex rounded-full border border-brand-blue px-4 py-2 text-sm font-semibold text-brand-blue"
              >
                Ouvrir dans Google Maps
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}