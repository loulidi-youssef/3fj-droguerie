"use client";

import Image from "next/image";
import Link from "next/link";
import { AddToCartButton } from "@/components/add-to-cart-button";
import { FavoriteButton } from "@/components/favorite-button";
import { StarRating } from "@/components/star-rating";
import { getCategoryNameBySlug } from "@/data/categories";
import { formatDh } from "@/lib/currency";
import { getSafeNextImageProps } from "@/lib/image-optimization";
import { PRODUCT_IMAGE_FALLBACK_SRC } from "@/lib/product-image-variants";
import {
  getProductAvailabilityMeta,
  getProductAvailabilityStatus,
} from "@/lib/product-availability";
import type { Product } from "@/types";

type ProductCardProps = {
  product: Product;
  variant?: "default" | "homepage" | "listing";
};

export const ProductCard = ({ product, variant = "default" }: ProductCardProps) => {
  const primaryImage = getSafeNextImageProps(product.images[0], {
    variant: "thumbnail",
    fallbackSrc: PRODUCT_IMAGE_FALLBACK_SRC,
  });
  const badgeLabel = product.badgeLabel?.trim()
    ? product.badgeLabel.trim()
    : product.isPromo
      ? "Promo"
      : product.isNew
        ? "Nouveau"
        : "";
  const hasBadge = badgeLabel.length > 0;
  const isPromoBadge = product.isPromo || badgeLabel.toLowerCase().includes("promo");
  const availabilityStatus = getProductAvailabilityStatus(product);
  const availability = getProductAvailabilityMeta(product);
  const isOutOfStock = availabilityStatus === "out-of-stock";
  const requiresVariantSelection = (product.variants?.length ?? 0) > 0;
  const isHomepageVariant = variant === "homepage";
  const isListingVariant = variant === "listing";
  const reviewCount = Math.max(12, Math.round(product.rating * 8));
  const previousPrice =
    typeof product.previousPrice === "number" && product.previousPrice > product.price
      ? product.previousPrice
      : null;

  if (isListingVariant) {
    return (
      <article className="group flex h-full flex-col overflow-hidden rounded-lg border border-slate-200 bg-white shadow-[0_6px_14px_rgba(15,42,77,0.08)] transition hover:-translate-y-0.5 hover:shadow-[0_10px_20px_rgba(15,42,77,0.11)]">
        <Link href={`/produits/${product.slug}`} className="block p-1.5 sm:p-2">
          <div className="relative flex aspect-[1/1] w-full items-center justify-center overflow-hidden rounded-md bg-slate-50">
            {hasBadge ? (
              <span
                className={`pointer-events-none absolute left-1 top-1 z-10 inline-flex rounded-full px-1.5 py-0.5 text-[8px] font-semibold uppercase tracking-wide sm:left-1.5 sm:top-1.5 sm:px-2 sm:text-[9px] ${
                  isPromoBadge ? "bg-brand-orange text-white" : "bg-brand-blue/90 text-white"
                }`}
              >
                {badgeLabel}
              </span>
            ) : null}
            <FavoriteButton
              productId={product.id}
              className="absolute right-1 top-1 z-10 inline-flex h-5 w-5 items-center justify-center rounded-full border border-slate-300 bg-white/95 text-slate-500 shadow-sm transition hover:border-rose-300 hover:text-rose-600 disabled:cursor-not-allowed disabled:opacity-70 sm:right-1.5 sm:top-1.5 sm:h-6 sm:w-6"
            />
            <Image
              src={primaryImage.src}
              alt={product.name}
              fill
              unoptimized={primaryImage.unoptimized}
              sizes="(max-width: 640px) 46vw, (max-width: 1024px) 30vw, 22vw"
              className="object-contain p-1.5 transition-transform duration-300 group-hover:scale-[1.03] sm:p-2"
            />
          </div>
        </Link>

        <div className="flex flex-1 flex-col px-1.5 pb-1.5 sm:px-2 sm:pb-2">
          <p className="text-[9px] font-semibold uppercase tracking-wide text-brand-orange sm:text-[10px]">
            {getCategoryNameBySlug(product.categorySlug)}
          </p>
          <Link
            href={`/produits/${product.slug}`}
            className="mt-0.5 min-h-[2.15rem] overflow-hidden text-[12px] font-bold leading-tight text-brand-blue transition-colors duration-200 hover:text-brand-orange sm:mt-1 sm:min-h-[2.4rem] sm:text-sm"
            style={{
              display: "-webkit-box",
              WebkitBoxOrient: "vertical",
              WebkitLineClamp: 2,
            }}
          >
            {product.name}
          </Link>

          <div className="mt-1 flex items-start justify-between">
            <div>
              <p className="text-[15px] font-extrabold leading-none tracking-tight text-brand-blue sm:text-lg">
                {formatDh(product.price)}
              </p>
              {previousPrice !== null ? (
                <p className="mt-0.5 text-[9px] font-semibold text-slate-400 line-through sm:text-[10px]">
                  {formatDh(previousPrice)}
                </p>
              ) : null}
            </div>
            <div className="scale-[0.8] origin-top-right sm:scale-[0.86]">
              <StarRating value={product.rating} />
            </div>
          </div>

          <p
            className={`mt-1 inline-flex w-fit items-center rounded-full border px-1.5 py-0.5 text-[9px] font-semibold sm:mt-1.5 sm:px-2 sm:text-[10px] ${availability.className}`}
          >
            {availability.label}
          </p>

          <div className="mt-1.5 sm:mt-2">
            {requiresVariantSelection ? (
              <Link
                href={`/produits/${product.slug}`}
                className="inline-flex h-7 w-full items-center justify-center rounded-md border border-brand-blue px-2 text-center text-[9px] font-semibold text-brand-blue transition hover:bg-slate-50 sm:h-9 sm:text-[11px]"
              >
                Choisir variante
              </Link>
            ) : (
              <AddToCartButton
                productId={product.id}
                disabled={isOutOfStock}
                compact
                className="inline-flex h-7 w-full items-center justify-center rounded-md bg-brand-orange px-2 text-center text-[9px] font-semibold text-white transition hover:bg-brand-orangeDark disabled:hover:bg-brand-orange sm:h-9 sm:text-[11px]"
                controlsClassName="inline-flex h-7 w-full items-center justify-center rounded-md border border-slate-300 bg-white px-2 sm:h-9"
              />
            )}
          </div>
        </div>
      </article>
    );
  }

  if (isHomepageVariant) {
    return (
      <article className="group flex h-full flex-col overflow-hidden rounded-lg border border-slate-200 bg-white shadow-[0_7px_15px_rgba(15,42,77,0.08)] transition hover:-translate-y-0.5 hover:shadow-[0_14px_26px_rgba(15,42,77,0.12)] sm:rounded-xl sm:shadow-[0_8px_18px_rgba(15,42,77,0.08)]">
        <Link href={`/produits/${product.slug}`} className="block p-1.5 sm:p-3">
          <div className="relative flex aspect-square w-full items-center justify-center overflow-hidden rounded-md bg-slate-50 sm:rounded-lg">
            <Image
              src={primaryImage.src}
              alt={product.name}
              fill
              unoptimized={primaryImage.unoptimized}
              sizes="(max-width: 768px) 45vw, 23vw"
              className="object-contain p-1.5 transition-transform duration-300 group-hover:scale-105 sm:p-3"
            />
          </div>
        </Link>
        <div className="flex flex-1 flex-col px-1.5 pb-1.5 sm:px-3 sm:pb-3">
          <Link
            href={`/produits/${product.slug}`}
            className="min-h-[2.15rem] overflow-hidden text-[12px] font-semibold leading-tight text-brand-blue transition hover:text-brand-orange sm:min-h-[46px] sm:text-[1.12rem]"
            style={{
              display: "-webkit-box",
              WebkitBoxOrient: "vertical",
              WebkitLineClamp: 2,
            }}
          >
            {product.name}
          </Link>
          <div className="mt-0.5 sm:mt-1">
            <p className="text-[1rem] font-extrabold leading-none text-brand-orange sm:text-[1.65rem]">
              {formatDh(product.price)}
            </p>
            {previousPrice !== null ? (
              <p className="mt-0.5 text-[9px] font-semibold text-slate-400 line-through sm:mt-1 sm:text-xs">
                {formatDh(previousPrice)}
              </p>
            ) : null}
          </div>
          <div className="mt-1 flex items-center gap-0.5 text-amber-500 sm:mt-2">
            {Array.from({ length: 5 }).map((_, index) => (
              <svg
                key={index}
                viewBox="0 0 20 20"
                className={`h-3 w-3 sm:h-4 sm:w-4 ${index < Math.round(product.rating) ? "fill-current" : "fill-transparent"} stroke-current`}
                aria-hidden
              >
                <path d="M10 1.5 12.9 7.4l6.5.9-4.7 4.6 1.1 6.5L10 16.6l-5.8 2.8 1.1-6.5L.6 8.3l6.5-.9L10 1.5Z" />
              </svg>
            ))}
            <span className="ml-0.5 text-[9px] text-slate-500 sm:ml-1 sm:text-xs">({reviewCount})</span>
          </div>
          <p
            className={`mt-1 inline-flex w-fit items-center rounded-full border px-1.5 py-0.5 text-[9px] font-semibold sm:mt-2 sm:px-2.5 sm:py-1 sm:text-[11px] ${availability.className}`}
          >
            {availability.label}
          </p>

          <div className="mt-1.5 sm:mt-3">
            {requiresVariantSelection ? (
              <Link
                href={`/produits/${product.slug}`}
                className="inline-flex h-7 w-full items-center justify-center rounded-md border border-brand-orange bg-white px-2 text-[9px] font-semibold text-brand-orange transition hover:bg-orange-50 sm:h-9 sm:text-[11px]"
              >
                Choisir une variante
              </Link>
            ) : (
              <AddToCartButton
                productId={product.id}
                disabled={isOutOfStock}
                compact
                className="inline-flex h-7 w-full items-center justify-center rounded-md bg-brand-orange px-2 text-[9px] font-semibold text-white transition hover:bg-brand-orangeDark disabled:hover:bg-brand-orange sm:h-9 sm:text-[11px]"
                controlsClassName="inline-flex h-7 w-full items-center justify-center rounded-md border border-slate-300 bg-white px-2 sm:h-9"
              />
            )}
          </div>
        </div>
      </article>
    );
  }

  return (
    <article className="group flex h-full flex-col overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-[0_8px_22px_rgba(15,42,77,0.09)] transition-all duration-300 ease-out hover:-translate-y-0.5 hover:shadow-[0_14px_30px_rgba(15,42,77,0.14)]">
      <Link href={`/produits/${product.slug}`} className="block p-3 pb-0">
        <div className="relative flex aspect-square w-full items-center justify-center overflow-hidden rounded-xl bg-gray-50">
          {hasBadge ? (
            <span
              className={`pointer-events-none absolute left-2 top-2 z-10 inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide ${
                isPromoBadge ? "bg-brand-orange text-white" : "bg-brand-blue/90 text-white"
              }`}
            >
              {badgeLabel}
            </span>
          ) : null}
          <FavoriteButton
            productId={product.id}
            className="absolute right-2 top-2 z-10 inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-300 bg-white/95 text-slate-500 shadow-sm transition hover:border-rose-300 hover:text-rose-600 disabled:cursor-not-allowed disabled:opacity-70"
          />
          <Image
            src={primaryImage.src}
            alt={product.name}
            fill
            unoptimized={primaryImage.unoptimized}
            sizes="(max-width: 640px) 45vw, (max-width: 1024px) 31vw, 24vw"
            className="object-contain p-3 transition-transform duration-500 ease-out group-hover:scale-[1.035]"
          />
        </div>
      </Link>

      <div className="flex flex-1 flex-col p-3 sm:p-[18px]">
        <p className="text-xs font-semibold uppercase tracking-wide text-brand-orange">
          {getCategoryNameBySlug(product.categorySlug)}
        </p>
        <Link
          href={`/produits/${product.slug}`}
          className="mt-1 min-h-[44px] text-sm font-bold leading-snug text-brand-blue transition-colors duration-200 hover:text-brand-orange sm:min-h-[48px] sm:text-[1.02rem]"
        >
          {product.name}
        </Link>
        <p className="mt-1.5 min-h-[42px] text-xs leading-normal text-slate-600 sm:min-h-[56px] sm:text-sm">
          {product.shortDescription}
        </p>

        <div className="mt-3 flex items-start justify-between border-t border-slate-100 pt-3">
          <div>
            <p className="text-lg font-extrabold tracking-tight text-brand-blue sm:text-2xl">
              {formatDh(product.price)}
            </p>
            {previousPrice !== null ? (
              <p className="mt-0.5 text-xs font-semibold text-slate-400 line-through sm:text-sm">
                {formatDh(previousPrice)}
              </p>
            ) : null}
          </div>
          <StarRating value={product.rating} />
        </div>

        <p
          className={`mt-2 inline-flex w-fit items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold ${availability.className}`}
        >
          {availability.label}
        </p>

        <div className="mt-4">
          {requiresVariantSelection ? (
            <Link
              href={`/produits/${product.slug}`}
              className="inline-flex h-10 w-full items-center justify-center rounded-xl border border-brand-blue px-2 text-center text-[11px] font-semibold text-brand-blue transition hover:bg-slate-50 sm:h-11 sm:text-sm"
            >
              Choisir une variante
            </Link>
          ) : (
            <AddToCartButton
              productId={product.id}
              disabled={isOutOfStock}
              compact
              className="btn-primary h-10 w-full px-2 text-center text-[11px] sm:h-11 sm:text-sm"
              controlsClassName="inline-flex h-10 w-full items-center justify-center rounded-xl border border-slate-300 bg-white px-2 sm:h-11"
            />
          )}
        </div>
      </div>
    </article>
  );
};
