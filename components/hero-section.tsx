import Link from "next/link";
import Image from "next/image";
import { businessInfo, deliveryRules } from "@/data/business";
import { homepageContent } from "@/data/homepage";
import { siteImages } from "@/data/images";

export const HeroSection = () => {
  const freeDeliveryText = homepageContent.deliveryCard.freeDeliveryLabel.replace(
    "{freeFrom}",
    String(deliveryRules.freeFrom),
  );
  const paidDeliveryText = homepageContent.deliveryCard.paidDeliveryLabel
    .replace("{fee}", String(deliveryRules.fee))
    .replace("{freeFrom}", String(deliveryRules.freeFrom));

  return (
    <section className="bg-[#f1f3f5] pb-7 pt-2 sm:pt-3">
      <div className="mx-auto max-w-7xl px-4 sm:px-5 lg:px-6">
        <div className="relative overflow-hidden rounded-[28px] shadow-[0_16px_34px_rgba(15,42,77,0.18)]">
          <Image
            src={siteImages.hero}
            alt="Magasin de materiaux de construction a Fes"
            width={1400}
            height={720}
            className="h-[420px] w-full object-cover object-center sm:h-[500px]"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-r from-brand-blue/90 via-brand-blue/75 to-brand-blue/35" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/35 via-transparent to-transparent" />

          <div className="absolute inset-0 flex items-center px-6 py-8 sm:px-8 lg:px-12">
            <div className="max-w-[640px]">
              <h1 className="text-[2.15rem] font-extrabold uppercase leading-[1.05] tracking-tight text-white drop-shadow-[0_4px_12px_rgba(15,42,77,0.45)] sm:text-5xl lg:text-[3.5rem]">
                {homepageContent.hero.title}
              </h1>
              <p className="mt-4 max-w-xl text-base leading-relaxed text-slate-100 sm:text-[1.08rem]">
                {homepageContent.hero.subtitle}
              </p>
              <div className="mt-7 flex flex-wrap gap-3">
                <a
                  href={`https://wa.me/${businessInfo.whatsappPhone}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 rounded-full bg-[#1db954] px-5 py-3 text-sm font-bold text-white shadow-[0_10px_18px_rgba(34,197,94,0.28)] transition hover:brightness-95"
                >
                  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden>
                    <path d="M19.05 4.94A9.86 9.86 0 0012.02 2c-5.45 0-9.88 4.43-9.88 9.88 0 1.74.45 3.45 1.32 4.96L2 22l5.31-1.39a9.84 9.84 0 004.71 1.2h.01c5.45 0 9.88-4.43 9.88-9.88 0-2.64-1.03-5.12-2.86-6.99zm-7.03 15.2h-.01a8.2 8.2 0 01-4.17-1.14l-.3-.18-3.15.83.84-3.07-.2-.31a8.2 8.2 0 01-1.26-4.35c0-4.52 3.68-8.2 8.21-8.2 2.19 0 4.24.85 5.79 2.4a8.13 8.13 0 012.4 5.8c0 4.52-3.68 8.21-8.15 8.22zm4.5-6.16c-.25-.12-1.49-.74-1.72-.82-.23-.08-.4-.12-.57.12-.17.25-.66.82-.8.99-.15.17-.29.19-.54.06-.25-.12-1.05-.39-2-1.24-.74-.66-1.24-1.48-1.39-1.73-.14-.25-.02-.39.11-.51.12-.12.25-.29.37-.44.12-.15.17-.25.25-.41.08-.17.04-.31-.02-.43-.06-.12-.57-1.37-.78-1.88-.21-.5-.43-.43-.57-.44h-.49c-.17 0-.43.06-.66.31-.23.25-.87.85-.87 2.07 0 1.22.89 2.4 1.01 2.57.12.17 1.75 2.68 4.24 3.75.59.25 1.05.4 1.41.51.59.19 1.12.16 1.54.1.47-.07 1.49-.61 1.7-1.21.21-.6.21-1.12.15-1.21-.06-.1-.23-.16-.48-.29z" />
                  </svg>
                  {homepageContent.hero.whatsappCta}
                </a>
                <Link
                  href="/produits"
                  className="inline-flex items-center justify-center rounded-full bg-brand-orange px-6 py-3 text-sm font-bold text-white shadow-[0_10px_18px_rgba(249,115,22,0.3)] transition hover:bg-brand-orangeDark"
                >
                  {homepageContent.hero.productsCta}
                </Link>
              </div>
            </div>
          </div>

          <aside className="absolute right-8 top-1/2 hidden w-[345px] -translate-y-1/2 rounded-[22px] border border-slate-200 bg-white p-5 shadow-[0_16px_30px_rgba(15,42,77,0.2)] lg:block">
            <div className="space-y-4 text-brand-blue">
              <div className="flex items-start gap-3">
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-orange-100 text-brand-orange">
                  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor" aria-hidden>
                    <path d="M3.5 6.5a1 1 0 0 1 1-1h9a1 1 0 0 1 1 1V9h2.4a1 1 0 0 1 .77.36l2.9 3.45a1 1 0 0 1 .23.64v3.05a1 1 0 0 1-1 1h-.96a2.75 2.75 0 0 1-5.34 0H9.84a2.75 2.75 0 0 1-5.34 0H4.5a1 1 0 0 1-1-1V6.5Z" />
                  </svg>
                </span>
                <div>
                  <p className="text-xl font-extrabold uppercase leading-none">Livraison gratuite</p>
                  <p className="mt-1 text-[1rem] text-slate-700">{freeDeliveryText}</p>
                </div>
              </div>
              <div className="h-px bg-slate-200" />
              <div className="flex items-start gap-3">
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-orange-100 text-brand-orange">
                  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor" aria-hidden>
                    <path d="M3.5 6.5a1 1 0 0 1 1-1h9a1 1 0 0 1 1 1V9h2.4a1 1 0 0 1 .77.36l2.9 3.45a1 1 0 0 1 .23.64v3.05a1 1 0 0 1-1 1h-.96a2.75 2.75 0 0 1-5.34 0H9.84a2.75 2.75 0 0 1-5.34 0H4.5a1 1 0 0 1-1-1V6.5Z" />
                  </svg>
                </span>
                <div>
                  <p className="text-xl font-extrabold uppercase leading-none">
                    Livraison a {deliveryRules.fee} DH
                  </p>
                  <p className="mt-1 text-[1rem] text-slate-700">{paidDeliveryText}</p>
                </div>
              </div>
            </div>
          </aside>
        </div>

        <aside className="mt-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-card lg:hidden">
          <h2 className="text-lg font-bold text-brand-blue">{homepageContent.deliveryCard.title}</h2>
          <p className="mt-2 text-sm font-semibold text-slate-700">{freeDeliveryText}</p>
          <p className="mt-1 text-sm text-slate-600">{paidDeliveryText}</p>
        </aside>
      </div>
    </section>
  );
};
