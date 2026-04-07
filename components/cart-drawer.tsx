"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useCart } from "@/components/cart-provider";
import {
  buildDetailedCartItems,
  fetchCartProductsLookup,
  type CartProductsLookup,
} from "@/lib/cart-display";
import { formatDh, roundDhAmount } from "@/lib/currency";
import { getDeliveryCost } from "@/lib/delivery";
import { getSafeNextImageProps } from "@/lib/image-optimization";
import { PRODUCT_IMAGE_FALLBACK_SRC } from "@/lib/product-image-variants";
import { buildCartWhatsAppLink } from "@/lib/whatsapp";

type CartDrawerProps = {
  isOpen: boolean;
  onClose: () => void;
};

export const CartDrawer = ({ isOpen, onClose }: CartDrawerProps) => {
  const { items, itemCount, updateQuantity, removeItem } = useCart();
  const [cartLookup, setCartLookup] = useState<CartProductsLookup>({
    productsById: {},
    activeOfferRulesByProductId: {},
  });
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
      setCartLookup({
        productsById: {},
        activeOfferRulesByProductId: {},
      });
      setIsLoadingProducts(false);
      return;
    }

    let isActive = true;

    const fetchProducts = async () => {
      setIsLoadingProducts(true);

      try {
        const nextLookup = await fetchCartProductsLookup(uniqueProductIds);
        if (!isActive) {
          return;
        }
        setCartLookup(nextLookup);
      } catch {
        if (!isActive) {
          return;
        }
        setCartLookup({
          productsById: {},
          activeOfferRulesByProductId: {},
        });
      } finally {
        if (isActive) {
          setIsLoadingProducts(false);
        }
      }
    };

    void fetchProducts();

    return () => {
      isActive = false;
    };
  }, [isOpen, uniqueProductIds]);

  const detailedItems = useMemo(
    () => buildDetailedCartItems(items, cartLookup),
    [items, cartLookup],
  );

  const subtotal = useMemo(
    () => roundDhAmount(detailedItems.reduce((sum, item) => sum + item.lineTotal, 0)),
    [detailedItems],
  );
  const estimatedDeliveryCost = roundDhAmount(getDeliveryCost(subtotal));
  const directWhatsAppLink = buildCartWhatsAppLink(
    detailedItems.map((item) => ({
      name: item.variantLabel ? `${item.product.name} (${item.variantLabel})` : item.product.name,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
    })),
    subtotal,
    estimatedDeliveryCost,
    undefined,
  );

  const articleLabel = itemCount > 1 ? "articles" : "article";

  return (
    <div className={`fixed inset-0 z-[120] overflow-hidden ${isOpen ? "" : "pointer-events-none"}`}>
      <button
        type="button"
        onClick={onClose}
        aria-label="Fermer le panier"
        className={`fixed inset-0 bg-slate-950/40 backdrop-blur-[2px] transition-opacity duration-300 ${
          isOpen ? "opacity-100" : "opacity-0"
        }`}
      />

      <aside
        className={`absolute right-0 top-0 flex h-full w-full max-w-[560px] flex-col border-l border-slate-200 bg-[#f6f6f7] shadow-[-14px_0_42px_rgba(15,23,42,0.2)] transition-transform duration-300 ease-out will-change-transform ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
        aria-label="Mon Panier"
        role="dialog"
        aria-modal="true"
      >
        <header className="flex items-center justify-between border-b border-slate-200 bg-white px-3 py-2.5 sm:px-6 sm:py-5">
          <div className="flex items-center gap-2">
            <svg
              viewBox="0 0 24 24"
              className="h-5 w-5 text-[#ef4444] sm:h-7 sm:w-7"
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
              <h2 className="text-[1.05rem] font-extrabold leading-none text-slate-900 sm:text-[2rem]">Mon Panier</h2>
              <span className="text-xs text-slate-500 sm:text-lg">
                ({itemCount} {articleLabel})
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-9 w-9 items-center justify-center rounded-full text-slate-700 transition hover:bg-slate-100"
            aria-label="Fermer"
          >
            <svg viewBox="0 0 24 24" className="h-6 w-6 sm:h-7 sm:w-7" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M6 6l12 12M18 6 6 18" />
            </svg>
          </button>
        </header>

        <div className="flex-1 overflow-y-auto overscroll-contain px-2.5 py-2.5 sm:px-5 sm:py-5">
          {itemCount === 0 ? (
            <div className="flex h-full min-h-[280px] flex-col items-center justify-center text-center sm:min-h-[380px]">
              <svg viewBox="0 0 24 24" className="h-12 w-12 text-slate-300 sm:h-16 sm:w-16" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path d="M2 3h3l2.5 11h10L20 6H6" />
                <circle cx="10" cy="19" r="1.5" />
                <circle cx="17" cy="19" r="1.5" />
              </svg>
              <p className="mt-3 text-xl font-bold text-slate-600 sm:mt-5 sm:text-[2.05rem]">Votre panier est vide</p>
              <p className="mt-1 text-sm text-slate-500 sm:text-[1.5rem]">Ajoutez des produits pour commencer</p>
            </div>
          ) : (
            <div className="space-y-2.5">
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

              {detailedItems.map((item) => {
                const image = getSafeNextImageProps(
                  item.selectedImage ?? item.product.images[0],
                  {
                    variant: "thumbnail",
                    fallbackSrc: PRODUCT_IMAGE_FALLBACK_SRC,
                  },
                );

                return (
                <article
                  key={item.lineKey}
                  className="rounded-xl border border-slate-300/80 bg-[#f8f8f8] p-2 shadow-[0_3px_10px_rgba(15,23,42,0.04)] sm:rounded-2xl sm:p-3"
                >
                  <div className="flex items-start gap-2 sm:gap-3">
                    <div className="relative h-14 w-14 flex-shrink-0 overflow-hidden rounded-lg bg-white sm:h-20 sm:w-20 sm:rounded-xl">
                      <Image
                        src={image.src}
                        alt={item.product.name}
                        fill
                        unoptimized={image.unoptimized}
                        sizes="(max-width: 640px) 64px, 80px"
                        className="object-contain p-1"
                      />
                    </div>

                    <div className="min-w-0 flex-1">
                      <h3 className="truncate text-[13px] font-semibold leading-snug text-slate-800 sm:text-[1.55rem]">
                        {item.product.name}
                      </h3>
                      {item.variantLabel ? (
                        <p className="mt-0.5 text-xs font-medium text-slate-500">{item.variantLabel}</p>
                      ) : null}
                      <p className="mt-0.5 text-base font-extrabold leading-none text-[#ef4444] sm:text-[1.7rem]">
                        {formatDh(item.unitPrice)}
                      </p>
                      {item.originalUnitPrice ? (
                        <p className="mt-0.5 text-xs font-semibold text-slate-400 line-through">
                          {formatDh(item.originalUnitPrice)}
                        </p>
                      ) : null}
                      <div className="mt-1.5 flex items-center gap-1.5 sm:mt-3 sm:gap-2">
                        <button
                          type="button"
                          onClick={() => updateQuantity(item.productId, item.quantity - 1, item.variantId)}
                          className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-slate-300 bg-white text-sm font-bold text-slate-700 transition hover:border-slate-400 sm:h-8 sm:w-8 sm:rounded-lg"
                          aria-label={`Diminuer la quantite de ${item.product.name}`}
                        >
                          -
                        </button>
                        <span className="inline-flex min-w-6 items-center justify-center text-sm font-bold text-slate-800 sm:text-[1.3rem]">
                          {item.quantity}
                        </span>
                        <button
                          type="button"
                          onClick={() => updateQuantity(item.productId, item.quantity + 1, item.variantId)}
                          className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-slate-300 bg-white text-sm font-bold text-slate-700 transition hover:border-slate-400 sm:h-8 sm:w-8 sm:rounded-lg"
                          aria-label={`Augmenter la quantite de ${item.product.name}`}
                        >
                          +
                        </button>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => removeItem(item.productId, item.variantId)}
                      className="mt-0.5 inline-flex h-7 w-7 items-center justify-center rounded-md text-[#ef4444] transition hover:bg-red-50 sm:h-8 sm:w-8 sm:rounded-lg"
                      aria-label={`Retirer ${item.product.name} du panier`}
                    >
                      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
                        <path d="M4 7h16M9 7V5h6v2M8 10v8M12 10v8M16 10v8M6 7l1 13h10l1-13" />
                      </svg>
                    </button>
                  </div>
                </article>
                );
              })}
            </div>
          )}
        </div>

        <footer className="sticky bottom-0 border-t border-slate-200 bg-white px-3 py-2.5 sm:px-6 sm:py-5">
          <div className="mb-2.5 flex items-center justify-between sm:mb-4">
            <p className="text-sm font-semibold text-slate-600 sm:text-[2rem]">Total</p>
            <p className="text-lg font-extrabold leading-none text-slate-900 sm:text-[2.4rem]">{formatDh(subtotal)}</p>
          </div>

          <Link
            href="/panier"
            onClick={onClose}
            className="inline-flex h-10 w-full items-center justify-center rounded-lg bg-gradient-to-r from-[#f43b2f] to-[#ff7a00] text-sm font-bold text-white shadow-[0_10px_18px_rgba(249,115,22,0.26)] transition hover:brightness-95 sm:h-14 sm:rounded-2xl sm:text-[1.6rem]"
          >
            Commander maintenant
          </Link>
          <p className="mt-2 text-center text-[11px] text-slate-500 sm:text-xs">
            Paiement a la livraison apres confirmation.
          </p>
          {detailedItems.length > 0 ? (
            <a
              href={directWhatsAppLink}
              target="_blank"
              rel="noreferrer"
              className="mt-2 inline-flex h-9 w-full items-center justify-center rounded-lg border border-emerald-300 bg-emerald-50 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-100 sm:h-11 sm:rounded-2xl sm:text-sm"
            >
              Finaliser sur WhatsApp
            </a>
          ) : null}
        </footer>
      </aside>
    </div>
  );
};
