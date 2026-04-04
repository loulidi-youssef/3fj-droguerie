"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { useCart } from "@/components/cart-provider";
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

  const handleAddToCart = () => {
    addItem(product.id, 1);
    showToast("Produit ajout\u00E9 au panier");
    setIsAdding(true);
    window.setTimeout(() => setIsAdding(false), 250);
  };

  return (
    <article className="group flex h-full flex-col overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-card transition duration-300 hover:-translate-y-0.5 hover:shadow-[0_14px_28px_rgba(15,42,77,0.14)]">
      <Link href={`/produits/${product.slug}`}>
        <Image
          src={product.images[0]}
          alt={product.name}
          width={600}
          height={380}
          className="h-40 w-full object-cover transition duration-300 group-hover:scale-[1.02] sm:h-44"
        />
      </Link>

      <div className="flex flex-1 flex-col p-4 sm:p-[18px]">
        <p className="text-xs font-semibold uppercase tracking-wide text-brand-orange">
          {getCategoryNameBySlug(product.categorySlug)}
        </p>
        <Link
          href={`/produits/${product.slug}`}
          className="mt-1 min-h-[48px] text-[1.02rem] font-bold leading-snug text-brand-blue transition-colors duration-200 hover:text-brand-orange"
        >
          {product.name}
        </Link>
        <p className="mt-1.5 min-h-[56px] text-sm leading-normal text-slate-600">
          {product.shortDescription}
        </p>

        <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-3">
          <p className="text-2xl font-extrabold tracking-tight text-brand-blue">{formatDh(product.price)}</p>
          <StarRating value={product.rating} />
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={handleAddToCart}
            className={`btn-primary h-10 w-full px-2 text-center text-[13px] sm:text-sm ${
              isAdding ? "scale-[0.98]" : ""
            }`}
          >
            Ajouter au panier
          </button>
          <a
            href={buildProductWhatsAppLink(product.name)}
            target="_blank"
            rel="noreferrer"
            className="btn-outline-brand h-10 w-full px-2 text-center text-[13px] sm:text-sm"
          >
            WhatsApp
          </a>
        </div>
      </div>
    </article>
  );
};
