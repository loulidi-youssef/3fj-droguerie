import Link from "next/link";
import { CountdownTimer } from "@/components/countdown-timer";
import { formatDh } from "@/lib/currency";
import { getActiveOffersWithProducts } from "@/lib/offers";

type OfferSectionProps = {
  variant?: "homepage" | "offres-page";
  maxOffers?: number;
};

export const OfferSection = async ({ variant = "homepage", maxOffers }: OfferSectionProps) => {
  const activeOffers = await getActiveOffersWithProducts();

  if (activeOffers.length === 0) {
    return (
      <section className="section-padding">
        <div className="mx-auto max-w-7xl px-4 sm:px-5 lg:px-6">
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-card sm:p-8">
            <h2 className="section-title">Offres</h2>
            <p className="mt-2 text-sm leading-relaxed text-slate-600">
              Aucune offre disponible pour le moment.
            </p>
          </div>
        </div>
      </section>
    );
  }

  const featuredOffer =
    activeOffers.find((offerWithProduct) => offerWithProduct.offer.isFeatured) ??
    activeOffers[0];

  const featuredOfferId = featuredOffer.offer.id;
  const otherOffers = activeOffers.filter(
    (offerWithProduct) => offerWithProduct.offer.id !== featuredOfferId,
  );
  const resolvedMaxOffers =
    typeof maxOffers === "number"
      ? Math.max(1, Math.floor(maxOffers))
      : variant === "homepage"
        ? 4
        : Number.POSITIVE_INFINITY;
  const otherOffersLimit =
    resolvedMaxOffers === Number.POSITIVE_INFINITY ? Number.POSITIVE_INFINITY : resolvedMaxOffers - 1;
  const visibleOtherOffers = otherOffers.slice(0, Math.max(0, otherOffersLimit));
  const hiddenOffersCount = Math.max(0, otherOffers.length - visibleOtherOffers.length);

  const { offer, product, originalPrice, discountedPrice, savingsAmount, savingsPercent } = featuredOffer;

  if (variant === "homepage") {
    return (
      <section id="offres-actives" className="bg-[#f1f3f5] pb-5 sm:pb-7">
        <div className="mx-auto max-w-7xl px-4 sm:px-5 lg:px-6">
          <div className="mb-2 flex flex-wrap items-end justify-between gap-2 sm:mb-3">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-brand-orange sm:text-xs">
                Offres actives du moment
              </p>
              <h2 className="text-lg font-extrabold uppercase tracking-tight text-brand-blue sm:text-2xl">
                Promotions a ne pas manquer
              </h2>
            </div>
            <Link
              href="/offres"
              className="inline-flex rounded-full border border-slate-300 bg-white px-2.5 py-0.5 text-[10px] font-bold text-slate-700 transition hover:border-brand-orange hover:text-brand-orange sm:px-3 sm:py-1 sm:text-xs"
            >
              Voir toutes les offres
            </Link>
          </div>
          <div className="relative overflow-hidden rounded-xl bg-gradient-to-r from-[#ff8d1a] via-brand-orange to-[#e1560c] px-4 py-4 text-white shadow-[0_12px_28px_rgba(249,115,22,0.28)] sm:px-7 sm:py-5">
            <div className="absolute -left-6 -top-6 h-24 w-24 rounded-full bg-yellow-300/30 blur-sm sm:h-28 sm:w-28" />
            <div className="absolute -right-14 -bottom-14 h-32 w-32 rounded-full bg-black/10 sm:h-40 sm:w-40" />
            <div className="relative flex flex-col gap-3 sm:gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex items-center gap-3 sm:gap-4">
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-yellow-300/80 text-orange-700 shadow-inner sm:h-14 sm:w-14">
                  <svg viewBox="0 0 24 24" className="h-5 w-5 sm:h-8 sm:w-8" fill="currentColor" aria-hidden>
                    <path d="M7.25 6.5A2.25 2.25 0 1 1 5 8.75 2.25 2.25 0 0 1 7.25 6.5Zm9.5 8.75A2.25 2.25 0 1 1 14.5 17.5a2.25 2.25 0 0 1 2.25-2.25ZM6.47 18.94 17.94 5.47l1.52 1.06L8 20Z" />
                  </svg>
                </span>
                <div>
                  <p className="text-2xl font-extrabold uppercase tracking-tight sm:text-4xl">Offre speciale</p>
                  <p className="text-xl font-extrabold uppercase leading-tight sm:text-3xl">
                    -{savingsPercent}% sur certains produits
                  </p>
                  <Link
                    href={`/produits/${product.slug}`}
                    className="mt-1 inline-flex text-xs font-semibold text-orange-50/95 underline underline-offset-4 hover:text-white sm:text-sm"
                  >
                    Voir le produit concerne
                  </Link>
                </div>
              </div>

              <div className="w-full sm:min-w-[260px]">
                <p className="mb-1 text-right text-sm font-extrabold sm:text-[1.18rem]">Offre limitee !</p>
                {offer.endAt ? (
                  <CountdownTimer expiresAt={offer.endAt} variant="homepage-offer" />
                ) : (
                  <div className="grid grid-cols-4 gap-2">
                    {["00", "12", "30", "45"].map((value) => (
                      <div
                        key={value}
                        className="rounded-lg bg-brand-blue px-2 py-1.5 text-center shadow-[inset_0_0_0_1px_rgba(255,255,255,0.1)] sm:px-3 sm:py-2"
                      >
                        <p className="text-xl font-extrabold leading-none sm:text-3xl">{value}</p>
                        <p className="mt-1 text-[10px] uppercase tracking-wide text-slate-200">Timer</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="pb-10 pt-6">
      <div className="mx-auto max-w-7xl px-4 sm:px-5 lg:px-6">
        <article className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 shadow-[0_12px_28px_rgba(15,42,77,0.1)] sm:p-7">
          <div className="absolute -right-12 -top-12 h-40 w-40 rounded-full bg-orange-100/80" />
          <div className="absolute -bottom-16 left-1/3 h-44 w-44 rounded-full bg-brand-blue/5" />
          <div className="relative grid gap-6 lg:grid-cols-12 lg:items-start">
            <div className="lg:col-span-8">
              <p className="inline-flex rounded-full bg-brand-orange px-3 py-1 text-xs font-bold uppercase tracking-wide text-white">
                {offer.discountLabel}
              </p>
              <h2 className="mt-3 text-3xl font-extrabold leading-tight text-brand-blue sm:text-4xl">
                {offer.title}
              </h2>
              <p className="mt-2 text-base font-semibold text-slate-700">Produit: {product.name}</p>
              <p className="mt-2 max-w-3xl text-sm leading-relaxed text-slate-600">{offer.shortDescription}</p>
              <div className="mt-4 grid gap-2 sm:grid-cols-3">
                <p className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm font-semibold text-slate-700">
                  Avant: <span className="line-through">{formatDh(originalPrice)}</span>
                </p>
                <p className="rounded-xl border border-orange-200 bg-orange-50 p-3 text-sm font-extrabold text-brand-orange">
                  Maintenant: {formatDh(discountedPrice)}
                </p>
                <p className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm font-bold text-emerald-700">
                  Economie: {formatDh(savingsAmount)} ({savingsPercent}%)
                </p>
              </div>
              {offer.bannerText ? (
                <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  {offer.bannerText}
                </p>
              ) : null}
              <Link href={`/produits/${product.slug}`} className="btn-primary mt-5 px-5 py-2.5">
                Voir le produit
              </Link>
            </div>

            <aside className="lg:col-span-4">
              <div className="rounded-xl bg-brand-blue p-3 text-white shadow-[0_10px_22px_rgba(15,42,77,0.25)]">
                <p className="mb-2 text-center text-sm font-bold uppercase tracking-wide text-orange-100">
                  Offre limitee
                </p>
                {offer.endAt ? (
                  <CountdownTimer expiresAt={offer.endAt} variant="homepage-offer" />
                ) : (
                  <div className="rounded-lg bg-white/10 px-3 py-5 text-center text-sm text-slate-200">
                    Offre en cours
                  </div>
                )}
              </div>
            </aside>
          </div>
        </article>

        {visibleOtherOffers.length > 0 ? (
          <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {visibleOtherOffers.map((offerWithProduct) => {
              const {
                offer: secondaryOffer,
                product: secondaryProduct,
                originalPrice: secondaryOriginalPrice,
                discountedPrice: secondaryDiscountedPrice,
                savingsAmount: secondarySavingsAmount,
                savingsPercent: secondarySavingsPercent,
              } = offerWithProduct;

              return (
                <article
                  key={secondaryOffer.id}
                  className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_10px_24px_rgba(15,42,77,0.08)] transition hover:-translate-y-0.5 hover:shadow-[0_14px_28px_rgba(15,42,77,0.12)]"
                >
                  <div className="flex items-center justify-between gap-3">
                    <p className="inline-flex rounded-full bg-brand-orange/10 px-2.5 py-1 text-xs font-bold text-brand-orange">
                      {secondaryOffer.discountLabel}
                    </p>
                    <p className="text-sm font-bold text-emerald-700">-{secondarySavingsPercent}%</p>
                  </div>
                  <h3 className="mt-3 text-xl font-extrabold leading-tight text-brand-blue">
                    {secondaryProduct.name}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-slate-600">
                    {secondaryOffer.shortDescription}
                  </p>
                  <div className="mt-3 space-y-1 text-sm text-slate-700">
                    <p>
                      Avant:{" "}
                      <span className="font-semibold line-through">{formatDh(secondaryOriginalPrice)}</span>
                    </p>
                    <p className="font-extrabold text-brand-orange">
                      Maintenant: {formatDh(secondaryDiscountedPrice)}
                    </p>
                    <p className="font-semibold text-emerald-700">
                      Economie: {formatDh(secondarySavingsAmount)}
                    </p>
                  </div>
                  {secondaryOffer.endAt ? (
                    <div className="mt-3">
                      <CountdownTimer
                        expiresAt={secondaryOffer.endAt}
                        compact
                        variant="homepage-offer"
                      />
                    </div>
                  ) : null}
                  <Link href={`/produits/${secondaryProduct.slug}`} className="btn-primary mt-4 px-4 py-2">
                    Voir le produit
                  </Link>
                </article>
              );
            })}
          </div>
        ) : null}

        {hiddenOffersCount > 0 ? (
          <div className="mt-4">
            <Link
              href="/offres"
              className="inline-flex rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition-colors duration-200 hover:border-brand-orange hover:text-brand-orange"
            >
              Voir toutes les offres ({activeOffers.length})
            </Link>
          </div>
        ) : null}
      </div>
    </section>
  );
};
