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
    <article className="group flex h-full flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-card transition duration-200 hover:-translate-y-1 hover:shadow-xl">
      <Link href={`/produits/${product.slug}`}>
        <Image
          src={product.images[0]}
          alt={product.name}
          width={600}
          height={380}
          className="aspect-[4/3] w-full object-cover transition duration-300 group-hover:scale-[1.02]"
        />
      </Link>

      <div className="flex flex-1 flex-col p-5">
        <p className="text-xs font-semibold uppercase tracking-wide text-brand-orange">
          {getCategoryNameBySlug(product.categorySlug)}
        </p>
        <Link
          href={`/produits/${product.slug}`}
          className="mt-1 min-h-[56px] text-lg font-bold leading-tight text-brand-blue hover:text-brand-orange"
        >
          {product.name}
        </Link>
        <p className="mt-2 min-h-[66px] text-sm leading-relaxed text-slate-600">{product.shortDescription}</p>

        <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-4">
          <p className="text-2xl font-extrabold text-brand-blue">{formatDh(product.price)}</p>
          <StarRating value={product.rating} />
        </div>

        <div className="mt-5 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={handleAddToCart}
            className={`rounded-xl bg-brand-orange px-3 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-orangeDark ${
              isAdding ? "scale-[0.98]" : ""
            }`}
          >
            Ajouter au panier
          </button>
          <a
            href={buildProductWhatsAppLink(product.name)}
            target="_blank"
            rel="noreferrer"
            className="rounded-xl border border-brand-blue px-3 py-2.5 text-center text-sm font-semibold text-brand-blue transition hover:bg-brand-blue hover:text-white"
          >
            WhatsApp
          </a>
        </div>
      </div>
    </article>
  );
};