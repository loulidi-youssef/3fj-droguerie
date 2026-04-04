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
    <section className="bg-brand-light pb-8 pt-10 sm:pt-12">
      <div className="mx-auto grid max-w-7xl gap-5 px-4 sm:px-5 lg:grid-cols-3 lg:px-6">
        <div className="relative overflow-hidden rounded-3xl shadow-card lg:col-span-2">
          <Image
            src={siteImages.hero}
            alt="Magasin de materiaux de construction a Fes"
            width={1200}
            height={700}
            className="h-full min-h-[390px] w-full object-cover sm:min-h-[460px]"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-r from-brand-blue/90 via-brand-blue/72 to-brand-blue/40" />
          <div className="absolute inset-0 bg-gradient-to-t from-brand-blue/35 to-transparent" />
          <div className="absolute inset-0 flex flex-col justify-center px-6 py-8 sm:px-10 lg:px-12">
            <p className="mb-3 inline-flex w-fit rounded-full bg-white/15 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-orange-100 backdrop-blur-sm">
              {homepageContent.hero.badge}
            </p>
            <h1 className="max-w-2xl text-3xl font-extrabold leading-tight text-white sm:text-5xl">
              {homepageContent.hero.title}
            </h1>
            <p className="mt-4 max-w-xl text-sm leading-relaxed text-slate-100 sm:text-base">{homepageContent.hero.subtitle}</p>
            <div className="mt-7 flex flex-wrap gap-3">
              <a
                href={`https://wa.me/${businessInfo.whatsappPhone}`}
                target="_blank"
                rel="noreferrer"
                className="rounded-full bg-brand-orange px-5 py-3 text-sm font-bold text-white shadow-md shadow-orange-900/25 transition hover:bg-brand-orangeDark"
              >
                {homepageContent.hero.whatsappCta}
              </a>
              <Link
                href="/produits"
                className="rounded-full border border-white/80 bg-white/5 px-5 py-3 text-sm font-bold text-white transition hover:bg-white hover:text-brand-blue"
              >
                {homepageContent.hero.productsCta}
              </Link>
            </div>
          </div>
        </div>

        <aside className="rounded-3xl border border-slate-200 bg-white p-6 shadow-card">
          <h2 className="text-xl font-bold text-brand-blue sm:text-2xl">{homepageContent.deliveryCard.title}</h2>
          <div className="mt-5 space-y-3 text-sm text-slate-700">
            <div className="rounded-2xl border border-orange-100 bg-brand-light p-4">
              <p className="font-semibold text-brand-blue">{freeDeliveryText}</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="font-semibold text-brand-blue">{paidDeliveryText}</p>
            </div>
            <p className="pt-1 text-xs leading-relaxed text-slate-500">{homepageContent.deliveryCard.note}</p>
          </div>
        </aside>
      </div>
    </section>
  );
};
