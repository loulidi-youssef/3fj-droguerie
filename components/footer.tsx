import Link from "next/link";
import { businessInfo } from "@/data/business";
import { homepageContent } from "@/data/homepage";

export const Footer = () => {
  return (
    <footer className="bg-[#0d2d55] text-white">
      <div className="mx-auto max-w-7xl px-3 py-5 md:hidden">
        <div>
          <p className="text-4xl font-black leading-none tracking-tight text-brand-orange">3FJ</p>
          <p className="-mt-0.5 text-2xl font-black leading-none tracking-tight text-white">DROGUERIE</p>
          <p className="mt-1 text-[9px] font-bold uppercase tracking-[0.08em] text-brand-orange">
            Materiaux de construction
          </p>
          <p className="mt-2 text-xs leading-relaxed text-slate-200">
            Vente en gros et detail de materiaux de construction.
          </p>
        </div>

        <ul className="mt-3 grid grid-cols-3 gap-2 text-center text-[11px] font-semibold text-slate-100">
          <li>
            <Link href="/" className="inline-flex h-8 w-full items-center justify-center rounded-lg border border-white/15 bg-white/5 transition hover:text-orange-200">
              Accueil
            </Link>
          </li>
          <li>
            <Link href="/produits" className="inline-flex h-8 w-full items-center justify-center rounded-lg border border-white/15 bg-white/5 transition hover:text-orange-200">
              Produits
            </Link>
          </li>
          <li>
            <Link href="/offres" className="inline-flex h-8 w-full items-center justify-center rounded-lg border border-white/15 bg-white/5 transition hover:text-orange-200">
              Offres
            </Link>
          </li>
        </ul>

        <div className="mt-3 space-y-2">
          <details className="overflow-hidden rounded-lg border border-white/15 bg-white/5">
            <summary className="cursor-pointer list-none px-3 py-2 text-xs font-bold uppercase tracking-wide text-orange-100">
              Plus de liens
            </summary>
            <ul className="space-y-1 border-t border-white/10 px-3 py-2 text-sm text-slate-100">
              <li>
                <Link href="/blog" className="transition hover:text-orange-200">
                  Blog
                </Link>
              </li>
              <li>
                <Link href="/contact" className="transition hover:text-orange-200">
                  Contact
                </Link>
              </li>
            </ul>
          </details>

          <details className="overflow-hidden rounded-lg border border-white/15 bg-white/5">
            <summary className="cursor-pointer list-none px-3 py-2 text-xs font-bold uppercase tracking-wide text-orange-100">
              Contact
            </summary>
            <div className="space-y-2 border-t border-white/10 px-3 py-2 text-[13px] text-slate-100">
              <p className="inline-flex items-center gap-2">
                <svg viewBox="0 0 24 24" className="h-4 w-4 text-orange-300" fill="currentColor" aria-hidden>
                  <path d="M6.35 10.28a15.1 15.1 0 0 0 7.37 7.37l1.72-1.72a1.2 1.2 0 0 1 1.22-.28c1.12.37 2.3.56 3.49.56.66 0 1.2.54 1.2 1.2V21a1.2 1.2 0 0 1-1.2 1.2A18.15 18.15 0 0 1 1.8 3.85 1.2 1.2 0 0 1 3 2.65h3.49c.66 0 1.2.54 1.2 1.2 0 1.19.19 2.37.56 3.49.13.42.03.87-.28 1.19l-1.62 1.75Z" />
                </svg>
                {businessInfo.phoneDisplay}
              </p>
              <p className="inline-flex items-start gap-2 text-xs text-slate-200">
                <svg viewBox="0 0 24 24" className="mt-0.5 h-4 w-4 text-brand-orange" fill="currentColor" aria-hidden>
                  <path d="M12 2a7 7 0 0 0-7 7c0 4.87 6.12 12.08 6.38 12.39a.8.8 0 0 0 1.24 0C12.88 21.08 19 13.87 19 9a7 7 0 0 0-7-7Zm0 9.6a2.6 2.6 0 1 1 0-5.2 2.6 2.6 0 0 1 0 5.2Z" />
                </svg>
                <span>{businessInfo.address}</span>
              </p>
              <a
                href={`https://wa.me/${businessInfo.whatsappPhone}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 rounded-full bg-[#25D366] px-3 py-1.5 text-xs font-bold text-white transition hover:brightness-95"
              >
                <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="currentColor" aria-hidden>
                  <path d="M19.05 4.94A9.86 9.86 0 0012.02 2c-5.45 0-9.88 4.43-9.88 9.88 0 1.74.45 3.45 1.32 4.96L2 22l5.31-1.39a9.84 9.84 0 004.71 1.2h.01c5.45 0 9.88-4.43 9.88-9.88 0-2.64-1.03-5.12-2.86-6.99z" />
                </svg>
                {homepageContent.footer.whatsappCta}
              </a>
            </div>
          </details>

          <details className="overflow-hidden rounded-lg border border-white/15 bg-white/5">
            <summary className="cursor-pointer list-none px-3 py-2 text-xs font-bold uppercase tracking-wide text-orange-100">
              Carte
            </summary>
            <div className="border-t border-white/10 px-3 py-2">
              <a
                href={businessInfo.googleMapsUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-brand-blue transition hover:bg-orange-100"
              >
                {homepageContent.footer.mapsCta}
              </a>
            </div>
          </details>
        </div>
      </div>

      <div className="mx-auto hidden max-w-7xl gap-8 px-4 py-11 sm:px-5 md:grid md:grid-cols-4 lg:px-6">
        <div>
          <p className="text-6xl font-black leading-none tracking-tight text-brand-orange">3FJ</p>
          <p className="-mt-1 text-4xl font-black leading-none tracking-tight text-white">DROGUERIE</p>
          <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.08em] text-brand-orange">
            Materiaux de construction
          </p>
          <p className="mt-5 max-w-[220px] text-[1.05rem] leading-relaxed text-slate-200">
            Vente en gros et detail de materiaux de construction.
          </p>
        </div>

        <div>
          <h3 className="text-3xl font-extrabold uppercase tracking-tight">{homepageContent.footer.quickLinksTitle}</h3>
          <ul className="mt-4 space-y-2 text-lg text-slate-100">
            <li>
              <Link href="/" className="transition hover:text-orange-200">
                Accueil
              </Link>
            </li>
            <li>
              <Link href="/produits" className="transition hover:text-orange-200">
                Produits
              </Link>
            </li>
            <li>
              <Link href="/offres" className="transition hover:text-orange-200">
                Offres
              </Link>
            </li>
            <li>
              <Link href="/blog" className="transition hover:text-orange-200">
                Blog
              </Link>
            </li>
            <li>
              <Link href="/contact" className="transition hover:text-orange-200">
                Contact
              </Link>
            </li>
          </ul>
        </div>

        <div>
          <h3 className="text-3xl font-extrabold uppercase tracking-tight">{homepageContent.footer.contactTitle}</h3>
          <ul className="mt-4 space-y-3 text-[1.1rem] text-slate-100">
            <li className="inline-flex items-center gap-2">
              <svg viewBox="0 0 24 24" className="h-5 w-5 text-orange-300" fill="currentColor" aria-hidden>
                <path d="M6.35 10.28a15.1 15.1 0 0 0 7.37 7.37l1.72-1.72a1.2 1.2 0 0 1 1.22-.28c1.12.37 2.3.56 3.49.56.66 0 1.2.54 1.2 1.2V21a1.2 1.2 0 0 1-1.2 1.2A18.15 18.15 0 0 1 1.8 3.85 1.2 1.2 0 0 1 3 2.65h3.49c.66 0 1.2.54 1.2 1.2 0 1.19.19 2.37.56 3.49.13.42.03.87-.28 1.19l-1.62 1.75Z" />
              </svg>
              {businessInfo.phoneDisplay}
            </li>
            <li className="inline-flex items-start gap-2">
              <svg viewBox="0 0 24 24" className="mt-0.5 h-5 w-5 text-brand-orange" fill="currentColor" aria-hidden>
                <path d="M12 2a7 7 0 0 0-7 7c0 4.87 6.12 12.08 6.38 12.39a.8.8 0 0 0 1.24 0C12.88 21.08 19 13.87 19 9a7 7 0 0 0-7-7Zm0 9.6a2.6 2.6 0 1 1 0-5.2 2.6 2.6 0 0 1 0 5.2Z" />
              </svg>
              <span>{businessInfo.address}</span>
            </li>
          </ul>
          <a
            href={`https://wa.me/${businessInfo.whatsappPhone}`}
            target="_blank"
            rel="noreferrer"
            className="mt-4 inline-flex items-center gap-2 rounded-full bg-[#25D366] px-4 py-2 text-sm font-bold text-white transition hover:brightness-95"
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden>
              <path d="M19.05 4.94A9.86 9.86 0 0012.02 2c-5.45 0-9.88 4.43-9.88 9.88 0 1.74.45 3.45 1.32 4.96L2 22l5.31-1.39a9.84 9.84 0 004.71 1.2h.01c5.45 0 9.88-4.43 9.88-9.88 0-2.64-1.03-5.12-2.86-6.99z" />
            </svg>
            {homepageContent.footer.whatsappCta}
          </a>
        </div>

        <div>
          <h3 className="text-3xl font-extrabold uppercase tracking-tight">{homepageContent.footer.mapTitle}</h3>
          <div className="mt-4 overflow-hidden rounded-xl border border-white/20">
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
            className="mt-3 inline-flex rounded-full bg-white px-4 py-2 text-sm font-semibold text-brand-blue transition hover:bg-orange-100"
          >
            {homepageContent.footer.mapsCta}
          </a>
        </div>
      </div>
      <div className="border-t border-white/15 py-2.5 text-center text-xs text-slate-200 sm:py-3 sm:text-sm">
        (c) {new Date().getFullYear()} {businessInfo.legalName} - Marchand de materiaux de construction - Fes
      </div>
    </footer>
  );
};
