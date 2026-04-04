"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { ProductCard } from "@/components/product-card";
import { useFavorites } from "@/components/favorites-provider";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";
import type { Product } from "@/types";

type ProductsApiResponse = {
  products?: Product[];
  error?: string;
};

export default function CompteFavorisPage() {
  const router = useRouter();
  const { isReady, isAuthenticated, favoriteIds } = useFavorites();
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoadingProducts, setIsLoadingProducts] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!isReady) {
      return;
    }

    if (!isAuthenticated) {
      router.replace("/login?next=/compte/favoris");
      return;
    }

    const supabase = getSupabaseBrowserClient();
    if (!supabase) {
      router.replace("/login?next=/compte/favoris");
    }
  }, [isAuthenticated, isReady, router]);

  useEffect(() => {
    if (!isReady || !isAuthenticated) {
      return;
    }

    if (favoriteIds.length === 0) {
      setProducts([]);
      setErrorMessage(null);
      return;
    }

    let isMounted = true;
    const controller = new AbortController();

    const fetchProducts = async () => {
      setIsLoadingProducts(true);
      setErrorMessage(null);

      try {
        const params = new URLSearchParams({
          ids: favoriteIds.join(","),
        });

        const response = await fetch(`/api/products?${params.toString()}`, {
          signal: controller.signal,
          cache: "no-store",
        });

        const payload = (await response.json()) as ProductsApiResponse;
        if (!response.ok) {
          throw new Error(payload.error ?? "Impossible de charger vos favoris.");
        }

        if (!isMounted) {
          return;
        }

        setProducts(payload.products ?? []);
      } catch (error) {
        if ((error as { name?: string }).name === "AbortError") {
          return;
        }

        if (!isMounted) {
          return;
        }

        setErrorMessage(
          error instanceof Error ? error.message : "Impossible de charger vos favoris.",
        );
      } finally {
        if (isMounted) {
          setIsLoadingProducts(false);
        }
      }
    };

    void fetchProducts();

    return () => {
      isMounted = false;
      controller.abort();
    };
  }, [favoriteIds, isAuthenticated, isReady]);

  const visibleProducts = useMemo(() => {
    const productById = new Map(products.map((product) => [product.id, product]));
    return favoriteIds
      .map((id) => productById.get(id))
      .filter((product): product is Product => Boolean(product));
  }, [favoriteIds, products]);

  if (!isReady) {
    return (
      <section className="section-padding bg-brand-light">
        <div className="mx-auto max-w-7xl px-4 sm:px-5 lg:px-6">
          <p className="rounded-xl bg-white p-4 text-sm text-slate-600 shadow-card">
            Chargement de vos favoris...
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className="section-padding bg-brand-light">
      <div className="mx-auto max-w-7xl px-4 sm:px-5 lg:px-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-brand-blue sm:text-4xl">
              Mes favoris
            </h1>
            <p className="mt-2 text-sm text-slate-600">
              Retrouvez vos produits enregistres pour les retrouver rapidement.
            </p>
          </div>
          <Link href="/compte" className="btn-outline-brand">
            Retour au compte
          </Link>
        </div>

        {errorMessage ? (
          <p className="mt-4 rounded-xl bg-rose-50 p-3 text-sm font-medium text-rose-700">
            {errorMessage}
          </p>
        ) : null}

        {isLoadingProducts ? (
          <p className="mt-6 rounded-xl bg-white p-4 text-sm text-slate-600 shadow-card">
            Chargement des produits favoris...
          </p>
        ) : visibleProducts.length === 0 ? (
          <div className="mt-6 rounded-2xl bg-white p-6 shadow-card">
            <p className="text-sm text-slate-600">
              Vous n&apos;avez pas encore de favoris.
            </p>
            <Link
              href="/produits"
              className="mt-3 inline-flex text-sm font-semibold text-brand-orange hover:underline"
            >
              Explorer les produits
            </Link>
          </div>
        ) : (
          <div className="mt-6 grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-4">
            {visibleProducts.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
