import type { Metadata } from "next";
import { businessInfo } from "@/data/business";
import { buildSocialMetadata } from "@/lib/seo";

const contactTitle = "Contact droguerie a Fes";
const contactDescription =
  "Contactez 3FJ Droguerie a Fes pour vos besoins en materiaux de construction et outillage.";

export const metadata: Metadata = {
  title: contactTitle,
  description: contactDescription,
  ...buildSocialMetadata({
    title: contactTitle,
    description: contactDescription,
    canonicalPath: "/contact",
  }),
};

export default function ContactPage() {
  return (
    <section className="section-padding bg-brand-light">
      <div className="mx-auto max-w-5xl px-4 sm:px-5 lg:px-6">
        <h1 className="text-3xl font-extrabold tracking-tight text-brand-blue sm:text-4xl">
          Contact - 3FJ Droguerie
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-slate-600 sm:text-[0.95rem]">
          Nous sommes a votre ecoute pour vos commandes a Fes.
        </p>

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
              className="btn-primary-pill mt-5 px-4 py-2"
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
                className="btn-outline-brand rounded-full"
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
