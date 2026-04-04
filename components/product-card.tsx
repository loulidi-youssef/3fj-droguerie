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
import { buildProductWhatsAppLink } from "@/lib/whatsapp";
import type { Product } from "@/types";

type ProductCardProps = {
  product: Product;
};

export const ProductCard = ({ product }: ProductCardProps) => {
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
  const isPromoBadge =
    product.isPromo || badgeLabel.toLowerCase().includes("promo");

  const handleAddToCart = () => {
    addItem(product.id, 1);
    showToast("Produit ajout\u00E9 au panier");
    setIsAdding(true);
    window.setTimeout(() => setIsAdding(false), 250);
  };

  return (
    <article className="group flex h-full flex-col overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-[0_8px_22px_rgba(15,42,77,0.09)] transition-all duration-300 ease-out hover:-translate-y-0.5 hover:shadow-[0_14px_30px_rgba(15,42,77,0.14)]">
      <Link href={`/produits/${product.slug}`} className="block p-3 pb-0">
        <div className="relative flex h-40 w-full items-center justify-center overflow-hidden rounded-xl bg-gray-50 sm:h-48">
          {hasBadge ? (
            <span
              className={`pointer-events-none absolute left-2 top-2 z-10 inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide ${
                isPromoBadge
                  ? "bg-brand-orange text-white"
                  : "bg-brand-blue/90 text-white"
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

        <div className="mt-4 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={handleAddToCart}
            className={`btn-primary h-9 w-full px-1.5 text-center text-[11px] sm:h-10 sm:px-2 sm:text-sm ${
              isAdding ? "scale-[0.98]" : ""
            }`}
          >
            Ajouter au panier
          </button>
          <a
            href={buildProductWhatsAppLink(product.name)}
            target="_blank"
            rel="noreferrer"
            className="btn-outline-brand h-9 w-full px-1.5 text-center text-[11px] sm:h-10 sm:px-2 sm:text-sm"
          >
            WhatsApp
          </a>
        </div>
      </div>
    </article>
  );
};
