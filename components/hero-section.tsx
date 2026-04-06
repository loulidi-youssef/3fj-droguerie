import Link from "next/link";
import Image from "next/image";
import { businessInfo, deliveryRules } from "@/data/business";
import { homepageContent } from "@/data/homepage";
import { siteImages } from "@/data/images";

const salesHighlights = [
  "Paiement a la livraison",
  "Livraison rapide 24h-48h a Fes",
  "Retrait magasin en environ 2h",
];

export const HeroSection = () => {
  const freeDeliveryText = homepageContent.deliveryCard.freeDeliveryLabel.replace(
    "{freeFrom}",
    String(deliveryRules.freeFrom),
  );
  const paidDeliveryText = homepageContent.deliveryCard.paidDeliveryLabel
    .replace("{fee}", String(deliveryRules.fee))
    .replace("{freeFrom}", String(deliveryRules.freeFrom));
  const mobileSubtitle = "Materiaux et outillage a Fes avec livraison rapide.";

  return (
    <section className="bg-[#f1f3f5] pb-2 pt-1 sm:pb-7 sm:pt-3">
      <div className="mx-auto max-w-7xl px-3 sm:px-5 lg:px-6">
        <div className="relative overflow-hidden rounded-xl shadow-[0_10px_22px_rgba(15,42,77,0.15)] sm:rounded-[28px] sm:shadow-[0_16px_34px_rgba(15,42,77,0.18)]">
          <Image
            src={siteImages.hero}
            alt="Magasin de materiaux de construction a Fes"
            width={1400}
            height={720}
            className="h-[182px] w-full object-cover object-center sm:h-[520px]"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-r from-brand-blue/90 via-brand-blue/78 to-brand-blue/35" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/35 via-transparent to-transparent" />

          <div className="absolute inset-0 flex items-center px-3 py-2 sm:px-8 sm:py-8 lg:px-12">
            <div className="max-w-[700px]">
              <p className="inline-flex rounded-full border border-white/45 bg-white/10 px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.08em] text-slate-100 backdrop-blur sm:px-3 sm:py-1 sm:text-xs">
                {homepageContent.hero.badge}
              </p>
              <h1 className="mt-1.5 text-[1.08rem] font-extrabold uppercase leading-[1.03] tracking-tight text-white drop-shadow-[0_4px_12px_rgba(15,42,77,0.45)] sm:mt-3 sm:text-5xl sm:leading-[1.02] lg:text-[3.5rem]">
                {homepageContent.hero.title}
              </h1>
              <p className="mt-1 max-w-xl text-[11px] leading-4 text-slate-100 md:hidden">
                {mobileSubtitle}
              </p>
              <p className="mt-1 hidden max-w-xl text-[11px] leading-4 text-slate-100 md:mt-4 md:block md:text-[1.08rem] md:leading-relaxed">
                {homepageContent.hero.subtitle}
              </p>

              <div className="mt-1.5 hidden max-w-full gap-1.5 overflow-x-auto pb-0.5 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden md:mt-4 md:flex md:flex-wrap md:overflow-visible md:pb-0 md:gap-2">
                {salesHighlights.map((item) => (
                  <span
                    key={item}
                    className="inline-flex shrink-0 rounded-full bg-white/95 px-2 py-0.5 text-[9px] font-bold text-brand-blue sm:px-3 sm:py-1 sm:text-xs"
                  >
                    {item}
                  </span>
                ))}
              </div>

              <div className="mt-2 flex flex-wrap gap-1.5 sm:mt-7 sm:flex-row sm:flex-wrap sm:gap-3">
                <Link
                  href="/produits"
                  className="inline-flex h-8 items-center justify-center rounded-full bg-brand-orange px-3.5 text-[11px] font-extrabold text-white shadow-[0_8px_14px_rgba(249,115,22,0.3)] transition hover:bg-brand-orangeDark sm:h-12 sm:px-7 sm:text-base sm:shadow-[0_12px_22px_rgba(249,115,22,0.34)]"
                >
                  Commander maintenant
                </Link>
                <Link
                  href="/offres"
                  className="hidden h-8 items-center justify-center rounded-full border border-white/55 bg-white/10 px-3 text-[10px] font-bold text-white backdrop-blur transition hover:bg-white/20 md:inline-flex md:h-12 md:px-6 md:text-sm"
                >
                  Voir les offres actives
                </Link>
                <a
                  href={`https://wa.me/${businessInfo.whatsappPhone}`}
                  target="_blank"
                  rel="noreferrer"
                  className="hidden h-8 items-center justify-center gap-1.5 rounded-full bg-[#1db954] px-3 text-[10px] font-bold text-white shadow-[0_8px_14px_rgba(34,197,94,0.24)] transition hover:brightness-95 md:inline-flex md:h-12 md:px-5 md:text-sm md:shadow-[0_10px_18px_rgba(34,197,94,0.28)]"
                >
                  <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 sm:h-4 sm:w-4" fill="currentColor" aria-hidden>
                    <path d="M19.05 4.94A9.86 9.86 0 0012.02 2c-5.45 0-9.88 4.43-9.88 9.88 0 1.74.45 3.45 1.32 4.96L2 22l5.31-1.39a9.84 9.84 0 004.71 1.2h.01c5.45 0 9.88-4.43 9.88-9.88 0-2.64-1.03-5.12-2.86-6.99zm-7.03 15.2h-.01a8.2 8.2 0 01-4.17-1.14l-.3-.18-3.15.83.84-3.07-.2-.31a8.2 8.2 0 01-1.26-4.35c0-4.52 3.68-8.2 8.21-8.2 2.19 0 4.24.85 5.79 2.4a8.13 8.13 0 012.4 5.8c0 4.52-3.68 8.21-8.15 8.22zm4.5-6.16c-.25-.12-1.49-.74-1.72-.82-.23-.08-.4-.12-.57.12-.17.25-.66.82-.8.99-.15.17-.29.19-.54.06-.25-.12-1.05-.39-2-1.24-.74-.66-1.24-1.48-1.39-1.73-.14-.25-.02-.39.11-.51.12-.12.25-.29.37-.44.12-.15.17-.25.25-.41.08-.17.04-.31-.02-.43-.06-.12-.57-1.37-.78-1.88-.21-.5-.43-.43-.57-.44h-.49c-.17 0-.43.06-.66.31-.23.25-.87.85-.87 2.07 0 1.22.89 2.4 1.01 2.57.12.17 1.75 2.68 4.24 3.75.59.25 1.05.4 1.41.51.59.19 1.12.16 1.54.1.47-.07 1.49-.61 1.7-1.21.21-.6.21-1.12.15-1.21-.06-.1-.23-.16-.48-.29z" />
                  </svg>
                  {homepageContent.hero.whatsappCta}
                </a>
              </div>
            </div>
          </div>

          <aside className="absolute right-8 top-1/2 hidden w-[350px] -translate-y-1/2 rounded-[22px] border border-slate-200 bg-white p-5 shadow-[0_16px_30px_rgba(15,42,77,0.2)] lg:block">
            <h2 className="text-base font-extrabold uppercase tracking-wide text-brand-blue">
              Pourquoi commander ici ?
            </h2>
            <div className="mt-3 space-y-3 text-brand-blue">
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                <p className="text-sm font-extrabold">Paiement a la livraison</p>
                <p className="mt-1 text-xs text-slate-700">Confirmez et payez a la reception.</p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                <p className="text-sm font-extrabold">Livraison rapide</p>
                <p className="mt-1 text-xs text-slate-700">{freeDeliveryText}</p>
                <p className="text-xs text-slate-700">{paidDeliveryText}</p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                <p className="text-sm font-extrabold">Retrait en magasin</p>
                <p className="mt-1 text-xs text-slate-700">Recuperez votre commande rapidement a Fes.</p>
              </div>
            </div>
          </aside>
        </div>

        <aside className="mt-1.5 hidden rounded-xl border border-slate-200 bg-white p-2.5 shadow-card md:block lg:hidden">
          <h2 className="text-sm font-bold text-brand-blue">{homepageContent.deliveryCard.title}</h2>
          <p className="mt-1 text-[11px] font-semibold text-slate-700">{freeDeliveryText}</p>
          <p className="mt-0.5 text-[10px] text-slate-600">{paidDeliveryText}</p>
          <div className="mt-1.5 grid grid-cols-2 gap-1">
            <p className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-[9px] font-semibold text-slate-700">
              Paiement a la livraison
            </p>
            <p className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-[9px] font-semibold text-slate-700">
              Retrait magasin rapide
            </p>
          </div>
        </aside>
      </div>
    </section>
  );
};
