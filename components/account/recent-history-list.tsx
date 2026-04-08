"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useCart } from "@/components/cart-provider";
import { useToast } from "@/components/toast-provider";
import { RECENTLY_VIEWED_STORAGE_KEY } from "@/components/account/account-config";
import { QuickAddIcon } from "@/components/account/account-icons";
import { formatDh } from "@/lib/currency";
import type { Product } from "@/types";

type ProductsApiResponse = {
  products?: Product[];
  activeOfferRulesByProductId?: Record<string, unknown>;
  error?: string;
};

type RecentHistoryEntry = {
  product: Product;
  statusLabel: string;
};

const sanitizeStoredIds = (value: unknown): string[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  const seen = new Set<string>();
  const sanitizedIds: string[] = [];

  for (const item of value) {
    if (typeof item !== "string") {
      continue;
    }

    const normalized = item.trim();
    if (!normalized || seen.has(normalized)) {
      continue;
    }

    seen.add(normalized);
    sanitizedIds.push(normalized);
  }

  return sanitizedIds;
};

const buildStockStatus = (product: Product, hasOffer: boolean): string => {
  if (hasOffer) {
    return "Offre active";
  }

  if (typeof product.stock === "number") {
    if (product.stock <= 0) {
      return "Rupture de stock";
    }

    if (product.stock <= 5) {
      return "Presque épuisé";
    }
  }

  return "En stock";
};

export const RecentHistoryList = () => {
  const { addItem } = useCart();
  const { showToast } = useToast();
  const [entries, setEntries] = useState<RecentHistoryEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [addingProductId, setAddingProductId] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    const controller = new AbortController();

    const loadEntries = async () => {
      setIsLoading(true);
      setErrorMessage(null);

      let orderedIds: string[] = [];
      try {
        const raw = window.localStorage.getItem(RECENTLY_VIEWED_STORAGE_KEY);
        const parsed = raw ? (JSON.parse(raw) as unknown) : [];
        orderedIds = sanitizeStoredIds(parsed);
      } catch {
        orderedIds = [];
      }

      if (orderedIds.length === 0) {
        if (isMounted) {
          setEntries([]);
          setIsLoading(false);
        }
        return;
      }

      try {
        const response = await fetch(
          `/api/products?ids=${encodeURIComponent(orderedIds.join(","))}&includeOffers=1`,
          {
            signal: controller.signal,
            cache: "no-store",
          },
        );

        const payload = (await response.json()) as ProductsApiResponse;
        if (!response.ok) {
          throw new Error(payload.error ?? "Impossible de charger l'historique.");
        }

        if (!isMounted) {
          return;
        }

        const productsById = new Map(
          (payload.products ?? []).map((product) => [product.id, product]),
        );
        const offerMap = payload.activeOfferRulesByProductId ?? {};

        const nextEntries = orderedIds
          .map((id) => productsById.get(id))
          .filter((product): product is Product => Boolean(product))
          .map((product) => ({
            product,
            statusLabel: buildStockStatus(product, Boolean(offerMap[product.id])),
          }));

        setEntries(nextEntries);
      } catch (error) {
        if ((error as { name?: string }).name === "AbortError") {
          return;
        }

        if (!isMounted) {
          return;
        }

        setEntries([]);
        setErrorMessage(
          error instanceof Error ? error.message : "Impossible de charger l'historique.",
        );
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    void loadEntries();

    return () => {
      isMounted = false;
      controller.abort();
    };
  }, []);

  const visibleEntries = useMemo(() => entries.slice(0, 18), [entries]);

  const quickAdd = (entry: RecentHistoryEntry) => {
    const maxQuantity = typeof entry.product.stock === "number" ? entry.product.stock : undefined;
    if (typeof maxQuantity === "number" && maxQuantity <= 0) {
      showToast("Produit indisponible pour le moment.", { variant: "info" });
      return;
    }

    setAddingProductId(entry.product.id);
    addItem(entry.product.id, 1, undefined, maxQuantity);
    showToast("Produit ajouté au panier.", {
      primaryAction: {
        label: "Voir panier",
        href: "/panier",
      },
      durationMs: 3200,
    });
    window.setTimeout(() => {
      setAddingProductId((current) => (current === entry.product.id ? null : current));
    }, 260);
  };

  return (
    <aside
      id="historique-compte"
      className="rounded-3xl border border-slate-200/80 bg-white p-4 shadow-[0_12px_26px_rgba(15,23,42,0.08)]"
      aria-label="Historique des produits récemment consultés"
    >
      <div className="flex items-center justify-between gap-2">
        <div>
          <h2 className="text-lg font-bold text-brand-blue">Produits récemment consultés</h2>
          <p className="mt-1 text-xs text-slate-500">Retrouvez vos produits vus en dernier.</p>
        </div>
        <Link
          href="/produits"
          className="inline-flex items-center rounded-full border border-slate-300 px-3 py-1 text-[11px] font-semibold text-slate-600 transition hover:border-brand-orange hover:text-brand-orange"
        >
          Catalogue
        </Link>
      </div>

      {isLoading ? (
        <p className="mt-4 rounded-xl bg-slate-50 px-3 py-3 text-sm text-slate-600">
          Chargement de l&apos;historique...
        </p>
      ) : null}

      {errorMessage ? (
        <p className="mt-4 rounded-xl bg-rose-50 px-3 py-3 text-sm font-medium text-rose-700">
          {errorMessage}
        </p>
      ) : null}

      {!isLoading && !errorMessage && visibleEntries.length === 0 ? (
        <p className="mt-4 rounded-xl border border-dashed border-slate-300 px-3 py-4 text-sm text-slate-600">
          Aucun produit récemment consulté.
        </p>
      ) : null}

      {!isLoading && visibleEntries.length > 0 ? (
        <div className="mt-4 max-h-[31rem] space-y-2 overflow-y-auto pr-1">
          {visibleEntries.map((entry) => {
            const productImage = entry.product.images[0] ?? "/images/placeholders/product-placeholder.svg";
            const isOutOfStock = typeof entry.product.stock === "number" && entry.product.stock <= 0;

            return (
              <article
                key={entry.product.id}
                className="flex items-center gap-3 rounded-2xl border border-slate-200/80 px-3 py-2.5 transition hover:border-slate-300 hover:bg-slate-50/60"
              >
                <Link
                  href={`/produits/${entry.product.slug}`}
                  className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl border border-slate-200 bg-white"
                >
                  <Image
                    src={productImage}
                    alt={entry.product.name}
                    fill
                    className="object-cover"
                    sizes="56px"
                  />
                </Link>

                <div className="min-w-0 flex-1">
                  <Link
                    href={`/produits/${entry.product.slug}`}
                    className="block text-sm font-semibold text-slate-900 transition hover:text-brand-blue"
                    style={{
                      display: "-webkit-box",
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: "vertical",
                      overflow: "hidden",
                    }}
                  >
                    {entry.product.name}
                  </Link>
                  <p className="mt-1 text-[11px] font-medium text-slate-500">{entry.statusLabel}</p>
                  <p className="mt-0.5 text-xs font-bold text-brand-blue">{formatDh(entry.product.price)}</p>
                </div>

                <button
                  type="button"
                  onClick={() => quickAdd(entry)}
                  disabled={isOutOfStock}
                  aria-label={`Ajouter ${entry.product.name} au panier`}
                  className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-slate-300 bg-white text-slate-600 transition hover:border-brand-orange hover:text-brand-orange focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-orange/35 disabled:cursor-not-allowed disabled:opacity-45"
                >
                  {addingProductId === entry.product.id ? (
                    <span className="h-3 w-3 animate-pulse rounded-full bg-brand-orange" />
                  ) : (
                    <QuickAddIcon />
                  )}
                </button>
              </article>
            );
          })}
        </div>
      ) : null}
    </aside>
  );
};

