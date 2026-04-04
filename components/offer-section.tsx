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
      <section className="py-14">
        <div className="mx-auto max-w-7xl px-4 sm:px-5 lg:px-6">
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-card sm:p-8">
            <h2 className="text-2xl font-extrabold text-brand-blue sm:text-3xl">Offres</h2>
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

  return (
    <section className="py-14">
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
          <p className="relative mt-2 text-sm font-semibold text-orange-100">
            Produit: {product.name}
          </p>
          <p className="relative mt-2 max-w-2xl text-sm leading-relaxed text-slate-100">
            {offer.shortDescription}
          </p>
          <Link
            href={`/produits/${product.slug}`}
            className="relative mt-4 inline-flex rounded-xl border border-white/30 bg-white/10 px-4 py-2 text-sm font-semibold text-white hover:bg-white/20"
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
          <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
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
                  className="rounded-2xl border border-slate-200 bg-white p-5 shadow-card"
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
                      <span className="font-semibold line-through">
                        {formatDh(secondaryOriginalPrice)}
                      </span>
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
                    className="mt-4 inline-flex rounded-xl border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:border-brand-orange hover:text-brand-orange"
                  >
                    Voir le produit
                  </Link>
                </article>
              );
            })}
          </div>
        ) : null}

        {variant === "homepage" && hiddenOffersCount > 0 ? (
          <div className="mt-4">
            <Link
              href="/offres"
              className="inline-flex rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:border-brand-orange hover:text-brand-orange"
            >
              Voir toutes les offres ({activeOffers.length})
            </Link>
          </div>
        ) : null}
      </div>
    </section>
  );
};
