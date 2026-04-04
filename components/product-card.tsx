"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { useCart } from "@/components/cart-provider";
import { FavoriteButton } from "@/components/favorite-button";
import { StarRating } from "@/components/star-rating";
import { useToast } from "@/components/toast-provider";
import { getCategoryNameBySlug } from "@/data/categories";
import { formatDh } from "@/lib/currency";
import { getProductAvailabilityMeta } from "@/lib/product-availability";
import { buildProductWhatsAppLink } from "@/lib/whatsapp";
import type { Product } from "@/types";

type ProductCardProps = {
  product: Product;
  variant?: "default" | "homepage";
};

export const ProductCard = ({ product, variant = "default" }: ProductCardProps) => {
  const { addItem } = useCart();
  const { showToast } = useToast();
  const [isAdding, setIsAdding] = useState(false);
  const badgeLabel = product.badgeLabel?.trim()
    ? product.badgeLabel.trim()
    : product.isPromo
      ? "Promo"
      : product.isNew
        ? "Nouveau"
        : "";
  const hasBadge = badgeLabel.length > 0;
  const isPromoBadge = product.isPromo || badgeLabel.toLowerCase().includes("promo");
  const availability = getProductAvailabilityMeta(product);
  const isHomepageVariant = variant === "homepage";
  const reviewCount = Math.max(12, Math.round(product.rating * 8));

  const handleAddToCart = () => {
    addItem(product.id, 1);
    showToast("Produit ajoute au panier", {
      primaryAction: {
        label: "Voir panier",
        href: "/panier",
      },
      secondaryAction: {
        label: "Continuer les achats",
      },
      durationMs: 5200,
    });
    setIsAdding(true);
    window.setTimeout(() => setIsAdding(false), 250);
  };

  if (isHomepageVariant) {
    return (
      <article className="group flex h-full flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-[0_8px_18px_rgba(15,42,77,0.08)] transition hover:-translate-y-0.5 hover:shadow-[0_14px_26px_rgba(15,42,77,0.12)]">
        <Link href={`/produits/${product.slug}`} className="block p-3">
          <div className="relative flex h-40 w-full items-center justify-center overflow-hidden rounded-lg bg-slate-50">
            <Image
              src={product.images[0]}
              alt={product.name}
              fill
              sizes="(max-width: 768px) 50vw, 25vw"
              className="object-contain p-3 transition-transform duration-300 group-hover:scale-105"
            />
          </div>
        </Link>
        <div className="flex flex-1 flex-col px-3 pb-3">
          <Link
            href={`/produits/${product.slug}`}
            className="min-h-[46px] text-[1.12rem] font-semibold leading-tight text-brand-blue transition hover:text-brand-orange"
          >
            {product.name}
          </Link>
          <p className="mt-1 text-[1.65rem] font-extrabold leading-none text-brand-orange">
            {formatDh(product.price)}
          </p>
          <div className="mt-2 flex items-center gap-0.5 text-amber-500">
            {Array.from({ length: 5 }).map((_, index) => (
              <svg
                key={index}
                viewBox="0 0 20 20"
                className={`h-4 w-4 ${index < Math.round(product.rating) ? "fill-current" : "fill-transparent"} stroke-current`}
                aria-hidden
              >
                <path d="M10 1.5 12.9 7.4l6.5.9-4.7 4.6 1.1 6.5L10 16.6l-5.8 2.8 1.1-6.5L.6 8.3l6.5-.9L10 1.5Z" />
              </svg>
            ))}
            <span className="ml-1 text-xs text-slate-500">({reviewCount})</span>
          </div>

          <div className="mt-3 grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={handleAddToCart}
              className={`inline-flex h-9 items-center justify-center rounded-md bg-brand-orange px-2 text-[11px] font-semibold text-white transition hover:bg-brand-orangeDark ${
                isAdding ? "scale-[0.98]" : ""
              }`}
            >
              Ajouter au panier
            </button>
            <a
              href={buildProductWhatsAppLink(product.name)}
              target="_blank"
              rel="noreferrer"
              className="inline-flex h-9 items-center justify-center gap-1 rounded-md bg-[#1db954] px-2 text-[11px] font-semibold text-white transition hover:brightness-95"
            >
              <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="currentColor" aria-hidden>
                <path d="M19.05 4.94A9.86 9.86 0 0012.02 2c-5.45 0-9.88 4.43-9.88 9.88 0 1.74.45 3.45 1.32 4.96L2 22l5.31-1.39a9.84 9.84 0 004.71 1.2h.01c5.45 0 9.88-4.43 9.88-9.88 0-2.64-1.03-5.12-2.86-6.99zm-7.03 15.2h-.01a8.2 8.2 0 01-4.17-1.14l-.3-.18-3.15.83.84-3.07-.2-.31a8.2 8.2 0 01-1.26-4.35c0-4.52 3.68-8.2 8.21-8.2 2.19 0 4.24.85 5.79 2.4a8.13 8.13 0 012.4 5.8c0 4.52-3.68 8.21-8.15 8.22zm4.5-6.16c-.25-.12-1.49-.74-1.72-.82-.23-.08-.4-.12-.57.12-.17.25-.66.82-.8.99-.15.17-.29.19-.54.06-.25-.12-1.05-.39-2-1.24-.74-.66-1.24-1.48-1.39-1.73-.14-.25-.02-.39.11-.51.12-.12.25-.29.37-.44.12-.15.17-.25.25-.41.08-.17.04-.31-.02-.43-.06-.12-.57-1.37-.78-1.88-.21-.5-.43-.43-.57-.44h-.49c-.17 0-.43.06-.66.31-.23.25-.87.85-.87 2.07 0 1.22.89 2.4 1.01 2.57.12.17 1.75 2.68 4.24 3.75.59.25 1.05.4 1.41.51.59.19 1.12.16 1.54.1.47-.07 1.49-.61 1.7-1.21.21-.6.21-1.12.15-1.21-.06-.1-.23-.16-.48-.29z" />
              </svg>
              WhatsApp
            </a>
          </div>
        </div>
      </article>
    );
  }

  return (
    <article className="group flex h-full flex-col overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-[0_8px_22px_rgba(15,42,77,0.09)] transition-all duration-300 ease-out hover:-translate-y-0.5 hover:shadow-[0_14px_30px_rgba(15,42,77,0.14)]">
      <Link href={`/produits/${product.slug}`} className="block p-3 pb-0">
        <div className="relative flex h-40 w-full items-center justify-center overflow-hidden rounded-xl bg-gray-50 sm:h-48">
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
            src={product.images[0]}
            alt={product.name}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
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

        <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-3">
          <p className="text-lg font-extrabold tracking-tight text-brand-blue sm:text-2xl">
            {formatDh(product.price)}
          </p>
          <StarRating value={product.rating} />
        </div>

        <p
          className={`mt-2 inline-flex w-fit items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold ${availability.className}`}
        >
          {availability.label}
        </p>

        <div className="mt-4 grid grid-cols-2 gap-2.5">
          <button
            type="button"
            onClick={handleAddToCart}
            className={`btn-primary h-10 w-full px-2 text-center text-[11px] sm:h-11 sm:text-sm ${
              isAdding ? "scale-[0.98]" : ""
            }`}
          >
            Ajouter au panier
          </button>
          <a
            href={buildProductWhatsAppLink(product.name)}
            target="_blank"
            rel="noreferrer"
            className="btn-outline-brand h-10 w-full gap-1.5 px-2 text-center text-[11px] sm:h-11 sm:text-sm"
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden="true">
              <path d="M19.05 4.94A9.86 9.86 0 0012.02 2c-5.45 0-9.88 4.43-9.88 9.88 0 1.74.45 3.45 1.32 4.96L2 22l5.31-1.39a9.84 9.84 0 004.71 1.2h.01c5.45 0 9.88-4.43 9.88-9.88 0-2.64-1.03-5.12-2.86-6.99zm-7.03 15.2h-.01a8.2 8.2 0 01-4.17-1.14l-.3-.18-3.15.83.84-3.07-.2-.31a8.2 8.2 0 01-1.26-4.35c0-4.52 3.68-8.2 8.21-8.2 2.19 0 4.24.85 5.79 2.4a8.13 8.13 0 012.4 5.8c0 4.52-3.68 8.21-8.15 8.22zm4.5-6.16c-.25-.12-1.49-.74-1.72-.82-.23-.08-.4-.12-.57.12-.17.25-.66.82-.8.99-.15.17-.29.19-.54.06-.25-.12-1.05-.39-2-1.24-.74-.66-1.24-1.48-1.39-1.73-.14-.25-.02-.39.11-.51.12-.12.25-.29.37-.44.12-.15.17-.25.25-.41.08-.17.04-.31-.02-.43-.06-.12-.57-1.37-.78-1.88-.21-.5-.43-.43-.57-.44h-.49c-.17 0-.43.06-.66.31-.23.25-.87.85-.87 2.07 0 1.22.89 2.4 1.01 2.57.12.17 1.75 2.68 4.24 3.75.59.25 1.05.4 1.41.51.59.19 1.12.16 1.54.1.47-.07 1.49-.61 1.7-1.21.21-.6.21-1.12.15-1.21-.06-.1-.23-.16-.48-.29z" />
            </svg>
            Commander WhatsApp
          </a>
        </div>
      </div>
    </article>
  );
};
