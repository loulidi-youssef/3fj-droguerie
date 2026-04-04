"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useCart } from "@/components/cart-provider";
import { formatDh } from "@/lib/currency";
import type { Product } from "@/types";

type CartDrawerProps = {
  isOpen: boolean;
  onClose: () => void;
};

export const CartDrawer = ({ isOpen, onClose }: CartDrawerProps) => {
  const { items, itemCount, updateQuantity, removeItem } = useCart();
  const [productsById, setProductsById] = useState<Record<string, Product>>({});
  const [isLoadingProducts, setIsLoadingProducts] = useState(false);

  const uniqueProductIds = useMemo(
    () => [...new Set(items.map((item) => item.productId))],
    [items],
  );

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const onEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    document.addEventListener("keydown", onEscape);
    return () => {
      document.removeEventListener("keydown", onEscape);
    };
  }, [isOpen, onClose]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    if (uniqueProductIds.length === 0) {
      setProductsById({});
      setIsLoadingProducts(false);
      return;
    }

    const controller = new AbortController();

    const fetchProducts = async () => {
      setIsLoadingProducts(true);

      try {
        const searchParams = new URLSearchParams({
          ids: uniqueProductIds.join(","),
        });

        const response = await fetch(`/api/products?${searchParams.toString()}`, {
          signal: controller.signal,
          cache: "no-store",
        });

        if (!response.ok) {
          throw new Error("Erreur API produits");
        }

        const payload = (await response.json()) as { products?: Product[] };
        const nextProductsById = (payload.products ?? []).reduce<Record<string, Product>>(
          (accumulator, product) => {
            accumulator[product.id] = product;
            return accumulator;
          },
          {},
        );

        setProductsById(nextProductsById);
      } catch (error) {
        if ((error as { name?: string }).name === "AbortError") {
          return;
        }
        setProductsById({});
      } finally {
        setIsLoadingProducts(false);
      }
    };

    void fetchProducts();

    return () => {
      controller.abort();
    };
  }, [isOpen, uniqueProductIds]);

  const detailedItems = useMemo(
    () =>
      items
        .map((item) => {
          const product = productsById[item.productId];
          if (!product) {
            return null;
          }

          const unitPrice =
            typeof item.selectedPrice === "number" && item.selectedPrice > 0
              ? item.selectedPrice
              : product.price;

          const variantLabelParts = [
            item.selectedColor ? `Couleur: ${item.selectedColor}` : null,
            item.selectedSize ? `Taille: ${item.selectedSize}` : null,
          ].filter((value): value is string => Boolean(value));

          return {
            ...item,
            product,
            unitPrice,
            lineTotal: unitPrice * item.quantity,
            variantLabel: variantLabelParts.join(" | "),
            lineKey: `${item.productId}::${item.variantId ?? "base"}`,
          };
        })
        .filter((item): item is NonNullable<typeof item> => item !== null),
    [items, productsById],
  );

  const subtotal = useMemo(
    () => detailedItems.reduce((sum, item) => sum + item.lineTotal, 0),
    [detailedItems],
  );

  const articleLabel = itemCount > 1 ? "articles" : "article";

  return (
    <div className={`fixed inset-0 z-[120] ${isOpen ? "" : "pointer-events-none"}`}>
      <button
        type="button"
        onClick={onClose}
        aria-label="Fermer le panier"
        className={`absolute inset-0 bg-slate-950/40 backdrop-blur-[2px] transition-opacity duration-300 ${
          isOpen ? "opacity-100" : "opacity-0"
        }`}
      />

      <aside
        className={`absolute right-0 top-0 flex h-full w-full max-w-[560px] flex-col border-l border-slate-200 bg-[#f6f6f7] shadow-[-14px_0_42px_rgba(15,23,42,0.2)] transition-transform duration-300 ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
        aria-label="Mon Panier"
        role="dialog"
        aria-modal="true"
      >
        <header className="flex items-center justify-between border-b border-slate-200 bg-white px-6 py-5">
          <div className="flex items-center gap-2.5">
            <svg
              viewBox="0 0 24 24"
              className="h-7 w-7 text-[#ef4444]"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              aria-hidden
            >
              <path d="M2 3h3l2.5 11h10L20 6H6" />
              <circle cx="10" cy="19" r="1.5" />
              <circle cx="17" cy="19" r="1.5" />
            </svg>
            <div className="flex items-baseline gap-2">
              <h2 className="text-[2rem] font-extrabold leading-none text-slate-900">Mon Panier</h2>
              <span className="text-lg text-slate-500">
                ({itemCount} {articleLabel})
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full text-slate-700 transition hover:bg-slate-100"
            aria-label="Fermer"
          >
            <svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M6 6l12 12M18 6 6 18" />
            </svg>
          </button>
        </header>

        <div className="flex-1 overflow-y-auto px-5 py-5">
          {itemCount === 0 ? (
            <div className="flex h-full min-h-[380px] flex-col items-center justify-center text-center">
              <svg viewBox="0 0 24 24" className="h-16 w-16 text-slate-300" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path d="M2 3h3l2.5 11h10L20 6H6" />
                <circle cx="10" cy="19" r="1.5" />
                <circle cx="17" cy="19" r="1.5" />
              </svg>
              <p className="mt-5 text-[2.05rem] font-bold text-slate-600">Votre panier est vide</p>
              <p className="mt-1 text-[1.5rem] text-slate-500">Ajoutez des produits pour commencer</p>
            </div>
          ) : (
            <div className="space-y-3">
              {isLoadingProducts && detailedItems.length === 0 ? (
                <p className="rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-500">
                  Chargement du panier...
                </p>
              ) : null}

              {!isLoadingProducts && detailedItems.length === 0 ? (
                <p className="rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-500">
                  Certains produits de votre panier sont indisponibles actuellement.
                </p>
              ) : null}

              {detailedItems.map((item) => (
                <article
                  key={item.lineKey}
                  className="rounded-2xl border border-slate-300/80 bg-[#f8f8f8] p-3 shadow-[0_3px_10px_rgba(15,23,42,0.04)]"
                >
                  <div className="flex items-start gap-3">
                    <div className="relative h-20 w-20 flex-shrink-0 overflow-hidden rounded-xl bg-white">
                      <Image
                        src={item.selectedImage ?? item.product.images[0]}
                        alt={item.product.name}
                        fill
                        sizes="80px"
                        className="object-cover"
                      />
                    </div>

                    <div className="min-w-0 flex-1">
                      <h3 className="truncate text-[1.55rem] font-semibold leading-snug text-slate-800">
                        {item.product.name}
                      </h3>
                      {item.variantLabel ? (
                        <p className="mt-0.5 text-xs font-medium text-slate-500">{item.variantLabel}</p>
                      ) : null}
                      <p className="mt-0.5 text-[1.7rem] font-extrabold leading-none text-[#ef4444]">
                        {formatDh(item.unitPrice)}
                      </p>
                      <div className="mt-3 flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => updateQuantity(item.productId, item.quantity - 1, item.variantId)}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-300 bg-white text-base font-bold text-slate-700 transition hover:border-slate-400"
                          aria-label={`Diminuer la quantite de ${item.product.name}`}
                        >
                          -
                        </button>
                        <span className="inline-flex min-w-7 items-center justify-center text-[1.3rem] font-bold text-slate-800">
                          {item.quantity}
                        </span>
                        <button
                          type="button"
                          onClick={() => updateQuantity(item.productId, item.quantity + 1, item.variantId)}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-300 bg-white text-base font-bold text-slate-700 transition hover:border-slate-400"
                          aria-label={`Augmenter la quantite de ${item.product.name}`}
                        >
                          +
                        </button>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => removeItem(item.productId, item.variantId)}
                      className="mt-1 inline-flex h-8 w-8 items-center justify-center rounded-lg text-[#ef4444] transition hover:bg-red-50"
                      aria-label={`Retirer ${item.product.name} du panier`}
                    >
                      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
                        <path d="M4 7h16M9 7V5h6v2M8 10v8M12 10v8M16 10v8M6 7l1 13h10l1-13" />
                      </svg>
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>

        <footer className="sticky bottom-0 border-t border-slate-200 bg-white px-6 py-5">
          <div className="mb-4 flex items-center justify-between">
            <p className="text-[2rem] font-semibold text-slate-600">Total</p>
            <p className="text-[2.4rem] font-extrabold leading-none text-slate-900">{formatDh(subtotal)}</p>
          </div>

          <Link
            href="/panier"
            onClick={onClose}
            className="inline-flex h-14 w-full items-center justify-center rounded-2xl bg-gradient-to-r from-[#f43b2f] to-[#ff7a00] text-[1.6rem] font-bold text-white shadow-[0_10px_18px_rgba(249,115,22,0.26)] transition hover:brightness-95"
          >
            Commander maintenant
          </Link>
        </footer>
      </aside>
    </div>
  );
};
