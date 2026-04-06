"use client";

import { useEffect, useMemo, useState } from "react";
import { ProductCard } from "@/components/product-card";
import type { Product } from "@/types";

type RecentlyViewedProductsProps = {
  currentProductId: string;
  products: Product[];
  limit?: number;
};

const STORAGE_KEY = "3fj-recently-viewed-products-v1";
const MAX_STORED_IDS = 16;

const sanitizeStoredIds = (value: unknown): string[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  const seen = new Set<string>();
  const ids: string[] = [];

  for (const item of value) {
    if (typeof item !== "string") {
      continue;
    }

    const trimmed = item.trim();
    if (!trimmed || seen.has(trimmed)) {
      continue;
    }

    seen.add(trimmed);
    ids.push(trimmed);
  }

  return ids;
};

export const RecentlyViewedProducts = ({
  currentProductId,
  products,
  limit = 6,
}: RecentlyViewedProductsProps) => {
  const [recentIds, setRecentIds] = useState<string[]>([]);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      const parsed = raw ? (JSON.parse(raw) as unknown) : [];
      const sanitized = sanitizeStoredIds(parsed);
      const nextIds = [currentProductId, ...sanitized.filter((id) => id !== currentProductId)].slice(
        0,
        MAX_STORED_IDS,
      );

      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(nextIds));
      setRecentIds(nextIds);
    } catch {
      const fallbackIds = [currentProductId];
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(fallbackIds));
      } catch {
        // Ignore storage write failures (private mode, quota, etc.).
      }
      setRecentIds(fallbackIds);
    }
  }, [currentProductId]);

  const productsById = useMemo(
    () => new Map(products.map((product) => [product.id, product])),
    [products],
  );

  const recentlyViewedProducts = useMemo(() => {
    return recentIds
      .filter((id) => id !== currentProductId)
      .map((id) => productsById.get(id))
      .filter((product): product is Product => Boolean(product))
      .slice(0, limit);
  }, [currentProductId, limit, productsById, recentIds]);

  if (recentlyViewedProducts.length === 0) {
    return null;
  }

  return (
    <section className="mt-7 sm:mt-12">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <h2 className="text-[1.2rem] font-extrabold tracking-tight text-brand-blue sm:text-[2rem]">
          Recemment consultes
        </h2>
        <p className="text-xs font-medium text-slate-500 sm:text-sm">
          Reprenez la ou vous vous etiez arrete.
        </p>
      </div>

      <div className="mt-3 flex gap-2.5 overflow-x-auto pb-1 sm:hidden [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
        {recentlyViewedProducts.map((recentProduct) => (
          <div key={recentProduct.id} className="w-[170px] shrink-0">
            <ProductCard product={recentProduct} variant="listing" />
          </div>
        ))}
      </div>

      <div className="mt-4 hidden grid-cols-2 gap-4 sm:grid lg:grid-cols-3">
        {recentlyViewedProducts.map((recentProduct) => (
          <ProductCard key={recentProduct.id} product={recentProduct} />
        ))}
      </div>
    </section>
  );
};
