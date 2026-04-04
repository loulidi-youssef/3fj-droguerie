import Link from "next/link";
import { businessInfo } from "@/data/business";
import { homepageContent } from "@/data/homepage";

export const Footer = () => {
  return (
    <footer className="bg-gradient-to-b from-brand-blue to-[#0b1f3a] text-white">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-12 sm:px-5 md:grid-cols-4 lg:px-6">
        <div>
          <h2 className="text-2xl font-extrabold">3FJ Droguerie</h2>
          <p className="mt-3 text-sm leading-relaxed text-slate-200">{homepageContent.footer.description}</p>
        </div>

        <div>
          <h3 className="text-lg font-bold">{homepageContent.footer.quickLinksTitle}</h3>
          <ul className="mt-3 space-y-2 text-sm text-slate-200">
            <li><Link href="/" className="hover:text-white">Accueil</Link></li>
            <li><Link href="/produits" className="hover:text-white">Produits</Link></li>
            <li><Link href="/offres" className="hover:text-white">Offres</Link></li>
            <li><Link href="/blog" className="hover:text-white">Blog</Link></li>
            <li><Link href="/contact" className="hover:text-white">Contact</Link></li>
          </ul>
        </div>

        <div>
          <h3 className="text-lg font-bold">{homepageContent.footer.contactTitle}</h3>
          <p className="mt-3 text-sm text-slate-200">{businessInfo.phoneDisplay}</p>
          <p className="mt-2 text-sm text-slate-200">{businessInfo.email}</p>
          <p className="mt-2 text-sm leading-relaxed text-slate-200">{businessInfo.address}</p>
          <p className="mt-2 text-xs text-slate-300">{businessInfo.openingHours}</p>
          <a
            href={`https://wa.me/${businessInfo.whatsappPhone}`}
            target="_blank"
            rel="noreferrer"
            className="mt-4 inline-flex rounded-full bg-brand-orange px-4 py-2 text-sm font-semibold text-white shadow-md shadow-orange-900/30"
          >
            {homepageContent.footer.whatsappCta}
          </a>
        </div>

        <div>
          <h3 className="text-lg font-bold">{homepageContent.footer.mapTitle}</h3>
          <div className="mt-3 overflow-hidden rounded-2xl border border-white/20 bg-white/5">
            <iframe
              title="Carte Google Maps 3FJ Droguerie"
              src={businessInfo.mapEmbedUrl}
              className="h-40 w-full"
              loading="lazy"
            />
          </div>
          <a
            href={businessInfo.googleMapsUrl}
            target="_blank"
            rel="noreferrer"
            className="mt-3 inline-flex rounded-full border border-white/40 px-4 py-2 text-sm font-semibold text-white hover:bg-white hover:text-brand-blue"
          >
            {homepageContent.footer.mapsCta}
          </a>
        </div>
      </div>
      <div className="border-t border-white/10 py-4 text-center text-xs text-slate-300">
        {new Date().getFullYear()} {businessInfo.legalName}. {homepageContent.footer.rightsSuffix}
      </div>
    </footer>
  );
};
