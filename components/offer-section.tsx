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
      <section className="bg-[#f1f3f5] pb-7">
        <div className="mx-auto max-w-7xl px-4 sm:px-5 lg:px-6">
          <div className="relative overflow-hidden rounded-xl bg-gradient-to-r from-[#ff8d1a] via-brand-orange to-[#e1560c] px-6 py-5 text-white shadow-[0_12px_28px_rgba(249,115,22,0.28)] sm:px-7">
            <div className="absolute -left-6 -top-6 h-28 w-28 rounded-full bg-yellow-300/30 blur-sm" />
            <div className="absolute -right-14 -bottom-14 h-40 w-40 rounded-full bg-black/10" />
            <div className="relative flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex items-center gap-4">
                <span className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-yellow-300/80 text-orange-700 shadow-inner">
                  <svg viewBox="0 0 24 24" className="h-8 w-8" fill="currentColor" aria-hidden>
                    <path d="M7.25 6.5A2.25 2.25 0 1 1 5 8.75 2.25 2.25 0 0 1 7.25 6.5Zm9.5 8.75A2.25 2.25 0 1 1 14.5 17.5a2.25 2.25 0 0 1 2.25-2.25ZM6.47 18.94 17.94 5.47l1.52 1.06L8 20Z" />
                  </svg>
                </span>
                <div>
                  <p className="text-4xl font-extrabold uppercase tracking-tight">Offre speciale</p>
                  <p className="text-3xl font-extrabold uppercase leading-tight">
                    -{savingsPercent}% sur certains produits
                  </p>
                  <Link
                    href={`/produits/${product.slug}`}
                    className="mt-1 inline-flex text-sm font-semibold text-orange-50/95 underline underline-offset-4 hover:text-white"
                  >
                    Voir le produit concerne
                  </Link>
                </div>
              </div>

              <div className="min-w-[260px]">
                <p className="mb-1 text-right text-[1.18rem] font-extrabold">Offre limitee !</p>
                {offer.endAt ? (
                  <CountdownTimer expiresAt={offer.endAt} variant="homepage-offer" />
                ) : (
                  <div className="grid grid-cols-4 gap-2">
                    {["00", "12", "30", "45"].map((value) => (
                      <div
                        key={value}
                        className="rounded-lg bg-brand-blue px-3 py-2 text-center shadow-[inset_0_0_0_1px_rgba(255,255,255,0.1)]"
                      >
                        <p className="text-3xl font-extrabold leading-none">{value}</p>
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
    <section className="section-padding">
      <div className="mx-auto max-w-7xl px-4 sm:px-5 lg:px-6">
        <div className="relative overflow-hidden rounded-3xl bg-brand-blue p-6 shadow-card sm:p-8">
          {offer.imagePath ? (
            <div
              className="absolute inset-0 bg-cover bg-center opacity-15"
              style={{ backgroundImage: `url('${offer.imagePath}')` }}
            />
          ) : null}
          <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-orange-400/20 blur-2xl" />
          <div className="absolute -bottom-10 left-1/3 h-32 w-32 rounded-full bg-white/10 blur-2xl" />
          <p className="relative inline-flex rounded-full bg-brand-orange px-3 py-1 text-xs font-bold uppercase tracking-wide text-white">
            {offer.discountLabel}
          </p>
          <h2 className="relative mt-3 text-2xl font-extrabold text-white sm:text-3xl">{offer.title}</h2>
          <p className="relative mt-2 text-sm font-semibold text-orange-100">Produit: {product.name}</p>
          <p className="relative mt-2 max-w-2xl text-sm leading-relaxed text-slate-100">
            {offer.shortDescription}
          </p>
          <Link
            href={`/produits/${product.slug}`}
            className="relative mt-4 inline-flex rounded-xl border border-white/35 bg-white/10 px-4 py-2 text-sm font-semibold text-white transition-all duration-200 hover:-translate-y-px hover:bg-white/20"
          >
            Voir le produit
          </Link>
          <div className="relative mt-4 grid gap-2 sm:grid-cols-3">
            <p className="rounded-2xl border border-white/15 bg-white/10 p-3 text-sm font-semibold text-white">
              Avant: <span className="line-through opacity-90">{formatDh(originalPrice)}</span>
            </p>
            <p className="rounded-2xl border border-white/15 bg-orange-400/20 p-3 text-sm font-bold text-white">
              Maintenant: {formatDh(discountedPrice)}
            </p>
            <p className="rounded-2xl border border-white/15 bg-white/10 p-3 text-sm font-semibold text-white">
              Economie: {formatDh(savingsAmount)} ({savingsPercent}%)
            </p>
          </div>
          {offer.bannerText ? (
            <p className="relative mt-2 max-w-2xl text-xs font-semibold uppercase tracking-wide text-orange-100">
              {offer.bannerText}
            </p>
          ) : null}
          {offer.endAt ? <CountdownTimer expiresAt={offer.endAt} /> : null}
        </div>

        {visibleOtherOffers.length > 0 ? (
          <div className="mt-5 grid gap-4 sm:gap-5 md:grid-cols-2 xl:grid-cols-3">
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
                  className="rounded-2xl border border-slate-200 bg-white p-5 shadow-card transition duration-300 hover:-translate-y-0.5 hover:shadow-[0_14px_28px_rgba(15,42,77,0.12)]"
                >
                  <p className="inline-flex rounded-full bg-brand-orange/10 px-2.5 py-1 text-xs font-bold text-brand-orange">
                    {secondaryOffer.discountLabel}
                  </p>
                  <h3 className="mt-2 text-lg font-extrabold text-brand-blue">{secondaryProduct.name}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-slate-600">
                    {secondaryOffer.shortDescription}
                  </p>
                  <div className="mt-3 space-y-1 text-sm text-slate-700">
                    <p>
                      Avant:{" "}
                      <span className="font-semibold line-through">{formatDh(secondaryOriginalPrice)}</span>
                    </p>
                    <p>
                      Maintenant:{" "}
                      <span className="text-base font-extrabold text-brand-blue">
                        {formatDh(secondaryDiscountedPrice)}
                      </span>
                    </p>
                    <p className="font-semibold text-emerald-700">
                      Economie: {formatDh(secondarySavingsAmount)} ({secondarySavingsPercent}%)
                    </p>
                  </div>
                  {secondaryOffer.endAt ? (
                    <div className="mt-3">
                      <CountdownTimer expiresAt={secondaryOffer.endAt} compact />
                    </div>
                  ) : null}
                  <Link
                    href={`/produits/${secondaryProduct.slug}`}
                    className="mt-4 inline-flex rounded-xl border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 transition-colors duration-200 hover:border-brand-orange hover:text-brand-orange"
                  >
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
