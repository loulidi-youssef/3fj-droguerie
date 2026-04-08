"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type MouseEvent } from "react";
import { AddToCartButton } from "@/components/add-to-cart-button";
import { CountdownTimer } from "@/components/countdown-timer";
import { FavoriteButton } from "@/components/favorite-button";
import { getCategoryNameBySlug } from "@/data/categories";
import {
  isBulkQuoteQuantity,
  normalizeBulkQuoteUnitLabel,
  resolveBulkQuoteThreshold,
} from "@/lib/bulk-quote";
import { getUnitPriceForQuantity } from "@/lib/bulk-pricing";
import { formatDh } from "@/lib/currency";
import { calculateEffectiveUnitPricing } from "@/lib/offer-pricing";
import {
  clampQuantityToStock,
  getMaxAllowedQuantity,
  getStockStatus,
  getStockStatusClassName,
  getStockStatusLabel,
} from "@/lib/quantity";
import { captureQuoteRequestAndRedirectToWhatsApp } from "@/lib/quote-request-client";
import { buildProductWhatsAppLink, buildProductWhatsAppQuoteLink } from "@/lib/whatsapp";
import type { OfferDiscountType, Product, ProductVariant } from "@/types";

type ProductDetailPurchasePanelProps = {
  product: Product;
  offerPricing?: {
    discountType: OfferDiscountType;
    discountValue: number;
    discountLabel: string;
    endAt?: string | null;
  };
};

const normalizeVariantLabel = (value: string | null | undefined): string | null => {
  if (!value) {
    return null;
  }

  const trimmed = value.trim().replace(/\s+/g, " ");
  return trimmed.length > 0 ? trimmed : null;
};

const normalizeColorKey = (value: string | null | undefined): string | null => {
  const normalized = normalizeVariantLabel(value);
  return normalized ? normalized.toLocaleLowerCase("fr") : null;
};

const normalizeSizeKey = (value: string | null | undefined): string | null => {
  const normalized = normalizeVariantLabel(value);
  return normalized ? normalized.replace(/\s+/g, "").toLocaleLowerCase("fr") : null;
};

export const ProductDetailPurchasePanel = ({
  product,
  offerPricing,
}: ProductDetailPurchasePanelProps) => {
  const activeVariants = useMemo(
    () => (product.variants ?? []).filter((variant) => variant.isActive),
    [product.variants],
  );

  const defaultVariant = useMemo(() => {
    if (activeVariants.length === 0) {
      return null;
    }

    return activeVariants.find((variant) => (variant.stock ?? 1) > 0) ?? activeVariants[0];
  }, [activeVariants]);

  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(
    defaultVariant?.id ?? null,
  );

  const selectedVariant = useMemo(() => {
    if (!selectedVariantId) {
      return defaultVariant;
    }

    return activeVariants.find((variant) => variant.id === selectedVariantId) ?? defaultVariant;
  }, [activeVariants, defaultVariant, selectedVariantId]);
  const selectedColorKey = normalizeColorKey(selectedVariant?.color);

  const hasVariants = activeVariants.length > 0;
  const colorOptions = useMemo(() => {
    const valuesByKey = new Map<string, string>();

    for (const variant of activeVariants) {
      const colorLabel = normalizeVariantLabel(variant.color);
      const colorKey = normalizeColorKey(variant.color);
      if (!colorLabel || !colorKey || valuesByKey.has(colorKey)) {
        continue;
      }

      valuesByKey.set(colorKey, colorLabel);
    }

    return Array.from(valuesByKey.entries()).map(([key, label]) => ({ key, label }));
  }, [activeVariants]);
  const hasColorOptions = colorOptions.length > 1;

  const allSizeOptions = useMemo(() => {
    const valuesByKey = new Map<string, string>();

    for (const variant of activeVariants) {
      const sizeLabel = normalizeVariantLabel(variant.size);
      const sizeKey = normalizeSizeKey(variant.size);
      if (!sizeLabel || !sizeKey || valuesByKey.has(sizeKey)) {
        continue;
      }

      valuesByKey.set(sizeKey, sizeLabel);
    }

    return Array.from(valuesByKey.entries()).map(([key, label]) => ({ key, label }));
  }, [activeVariants]);
  const hasSizeOptions = allSizeOptions.length > 1;
  const sizeOptions = useMemo(() => {
    if (!selectedColorKey) {
      return allSizeOptions;
    }

    const valuesByKey = new Map<string, string>();

    for (const variant of activeVariants) {
      const variantColorKey = normalizeColorKey(variant.color);
      const sizeLabel = normalizeVariantLabel(variant.size);
      const sizeKey = normalizeSizeKey(variant.size);
      if (
        variantColorKey !== selectedColorKey ||
        !sizeLabel ||
        !sizeKey ||
        valuesByKey.has(sizeKey)
      ) {
        continue;
      }

      valuesByKey.set(sizeKey, sizeLabel);
    }

    return Array.from(valuesByKey.entries()).map(([key, label]) => ({ key, label }));
  }, [activeVariants, allSizeOptions, selectedColorKey]);

  useEffect(() => {
    if (activeVariants.length === 0) {
      if (selectedVariantId !== null) {
        setSelectedVariantId(null);
      }
      return;
    }

    const stillExists =
      selectedVariantId !== null && activeVariants.some((variant) => variant.id === selectedVariantId);

    if (!stillExists && defaultVariant) {
      setSelectedVariantId(defaultVariant.id);
    }
  }, [activeVariants, defaultVariant, selectedVariantId]);

  const pickVariantForColor = (colorKey: string): ProductVariant | null => {
    if (activeVariants.length === 0) {
      return null;
    }

    const selectedSizeKey = normalizeSizeKey(selectedVariant?.size);

    return (
      activeVariants.find((variant) => {
        const variantColorKey = normalizeColorKey(variant.color);
        const variantSizeKey = normalizeSizeKey(variant.size);
        return variantColorKey === colorKey && (!selectedSizeKey || variantSizeKey === selectedSizeKey);
      }) ??
      activeVariants.find((variant) => normalizeColorKey(variant.color) === colorKey) ??
      null
    );
  };

  const pickVariantForSize = (sizeKey: string): ProductVariant | null => {
    if (activeVariants.length === 0) {
      return null;
    }

    const currentSelectedColorKey = normalizeColorKey(selectedVariant?.color);

    return (
      activeVariants.find((variant) => {
        const variantColorKey = normalizeColorKey(variant.color);
        const variantSizeKey = normalizeSizeKey(variant.size);
        return variantSizeKey === sizeKey && (!currentSelectedColorKey || variantColorKey === currentSelectedColorKey);
      }) ??
      activeVariants.find((variant) => normalizeSizeKey(variant.size) === sizeKey) ??
      null
    );
  };

  const selectedStock = selectedVariant?.stock ?? product.stock;
  const availabilityStatus = getStockStatus(selectedStock);
  const availabilityLabel = getStockStatusLabel(selectedStock);
  const availabilityClassName = getStockStatusClassName(selectedStock);
  const selectedMaxQuantity = getMaxAllowedQuantity(selectedStock);
  const [selectedPurchaseQuantity, setSelectedPurchaseQuantity] = useState(1);
  const normalizedPurchaseQuantity = clampQuantityToStock(
    selectedPurchaseQuantity,
    selectedMaxQuantity,
    {
      minQuantity: 1,
      allowZeroWhenOutOfStock: false,
    },
  );
  const quantityPricing = getUnitPriceForQuantity(product, normalizedPurchaseQuantity, {
    baseUnitPrice: selectedVariant?.price ?? product.price,
    tiers: selectedVariant?.bulkPriceTiers ?? product.bulkPriceTiers,
  });
  const effectiveOfferPricing = offerPricing
    ? calculateEffectiveUnitPricing(quantityPricing.unitPrice, {
        discountType: offerPricing.discountType,
        discountValue: offerPricing.discountValue,
      })
    : null;
  const displayedPrice = effectiveOfferPricing?.discountedPrice ?? quantityPricing.unitPrice;
  const displayedPreviousPrice = effectiveOfferPricing
    ? effectiveOfferPricing.originalPrice > effectiveOfferPricing.discountedPrice
      ? effectiveOfferPricing.originalPrice
      : null
    : typeof selectedVariant?.previousPrice === "number" &&
        selectedVariant.previousPrice > displayedPrice
      ? selectedVariant.previousPrice
      : typeof product.previousPrice === "number" && product.previousPrice > displayedPrice
        ? product.previousPrice
        : null;
  const displayedLineTotal = displayedPrice * normalizedPurchaseQuantity;
  const bulkPriceTiersForDisplay = quantityPricing.tiers.filter((tier) => tier.minQty > 1);

  useEffect(() => {
    setSelectedPurchaseQuantity((current) =>
      clampQuantityToStock(current, selectedMaxQuantity, {
        minQuantity: 1,
        allowZeroWhenOutOfStock: false,
      }),
    );
  }, [selectedMaxQuantity, selectedVariant?.id]);

  const lowStockCount =
    typeof selectedStock === "number" && selectedStock > 0 && selectedStock <= 5
      ? selectedStock
      : null;
  const selectedVariantLabelParts = [
    normalizeVariantLabel(selectedVariant?.color),
    normalizeVariantLabel(selectedVariant?.size),
  ].filter((value): value is string => Boolean(value));
  const selectedVariantLabel =
    selectedVariantLabelParts.length > 0 ? selectedVariantLabelParts.join(" / ") : undefined;
  const selectedUnitLabel = selectedVariant?.unitLabel ?? product.unitLabel;
  const bulkQuoteThreshold = resolveBulkQuoteThreshold(product, selectedVariant);
  const isBulkQuoteQuantitySelected = isBulkQuoteQuantity(
    normalizedPurchaseQuantity,
    bulkQuoteThreshold,
  );
  const normalizedBulkUnitLabel = normalizeBulkQuoteUnitLabel(selectedUnitLabel);
  const productWhatsAppLink = buildProductWhatsAppLink(product.name, {
    quantity: normalizedPurchaseQuantity,
    unitPrice: displayedPrice,
    variantLabel: selectedVariantLabel,
  });
  const productWhatsAppQuoteLink = buildProductWhatsAppQuoteLink(product.name, {
    quantity: normalizedPurchaseQuantity,
    unitPrice: displayedPrice,
    variantLabel: selectedVariantLabel,
    unitLabel: selectedUnitLabel,
    estimatedTotal: displayedLineTotal,
    note: "Je souhaite un prix de gros.",
  });
  const handleProductQuoteRequestClick = async (
    event: MouseEvent<HTMLAnchorElement>,
  ) => {
    event.preventDefault();

    await captureQuoteRequestAndRedirectToWhatsApp({
      whatsappUrl: productWhatsAppQuoteLink,
      payload: {
        source: "product-page",
        items: [
          {
            productId: product.id,
            quantity: normalizedPurchaseQuantity,
            variantId: selectedVariant?.id,
            selectedColor: normalizeVariantLabel(selectedVariant?.color) ?? undefined,
            selectedSize: normalizeVariantLabel(selectedVariant?.size) ?? undefined,
          },
        ],
      },
      openInNewTab: true,
    });
  };

  const offerEndDate =
    offerPricing?.endAt && !Number.isNaN(new Date(offerPricing.endAt).getTime())
      ? new Date(offerPricing.endAt)
      : null;
  const now = Date.now();
  const offerEndsSoon =
    offerEndDate !== null &&
    offerEndDate.getTime() > now &&
    offerEndDate.getTime() - now <= 72 * 60 * 60 * 1000;
  const hasOfferCountdown =
    offerEndDate !== null && offerEndDate.getTime() > now;
  const offerCountdownTarget =
    offerEndDate !== null && offerEndDate.getTime() > now ? offerEndDate.toISOString() : null;
  const offerEndLabel =
    offerEndDate !== null
      ? new Intl.DateTimeFormat("fr-MA", {
          dateStyle: "medium",
          timeStyle: "short",
        }).format(offerEndDate)
      : null;

  const deliveryEstimate =
    availabilityStatus === "out-of-stock"
      ? "Expedition estimee sous 2 a 4 jours ouvrables."
      : "Livraison a domicile estimee en 24h a 48h a Fes.";
  const pickupEstimate =
    availabilityStatus === "out-of-stock"
      ? "Retrait magasin des reception du stock."
      : "Retrait en magasin disponible en environ 2h.";
  const availabilityTextClass =
    availabilityStatus === "out-of-stock"
      ? "text-rose-700"
      : availabilityStatus === "limited"
        ? "text-amber-700"
        : "text-emerald-700";

  return (
    <div>
      <Link
        href={`/produits?categorie=${encodeURIComponent(product.categorySlug)}`}
        className="text-[9px] font-semibold uppercase tracking-[0.08em] text-brand-orange hover:underline sm:text-sm"
      >
        {getCategoryNameBySlug(product.categorySlug)}
      </Link>
      <h1 className="mt-1 text-[1.1rem] font-extrabold leading-tight tracking-tight text-brand-blue sm:mt-2 sm:text-[2.15rem]">
        {product.name}
      </h1>

      <div className="mt-1 flex flex-wrap items-center gap-1 sm:mt-3 sm:gap-2">
        {effectiveOfferPricing ? (
          <span className="inline-flex rounded-full bg-rose-100 px-2 py-0.5 text-[9px] font-bold text-rose-700 sm:px-3 sm:py-1 sm:text-xs">
            -{effectiveOfferPricing.savingsPercent}% remise
          </span>
        ) : null}
        {availabilityStatus === "limited" ? (
          <span className="inline-flex rounded-full bg-amber-100 px-2 py-0.5 text-[9px] font-bold text-amber-700 sm:px-3 sm:py-1 sm:text-xs">
            Stock faible
          </span>
        ) : null}
        {offerEndsSoon ? (
          <span className="inline-flex rounded-full bg-orange-100 px-2 py-0.5 text-[9px] font-bold text-brand-orange sm:px-3 sm:py-1 sm:text-xs">
            Offre limitee
          </span>
        ) : null}
      </div>

      <div className="mt-2 rounded-xl border border-slate-200 bg-white p-2 shadow-[0_8px_18px_rgba(15,42,77,0.08)] sm:mt-5 sm:rounded-2xl sm:p-5 sm:shadow-[0_10px_24px_rgba(15,42,77,0.08)]">
        <div className="flex items-end justify-between gap-2 sm:gap-3">
          <div className="flex min-w-0 flex-wrap items-end gap-1.5 sm:gap-3">
            <p className="text-[1.35rem] font-extrabold tracking-tight text-brand-blue sm:text-4xl">
              {formatDh(displayedPrice)}
            </p>
            {displayedPreviousPrice !== null ? (
              <p className="pb-0.5 text-[10px] font-semibold text-slate-400 line-through sm:pb-1 sm:text-base">
                {formatDh(displayedPreviousPrice)}
              </p>
            ) : null}
          </div>
          {offerPricing && effectiveOfferPricing ? (
            <span className="inline-flex shrink-0 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-emerald-700 sm:hidden">
              -{effectiveOfferPricing.savingsPercent}%
            </span>
          ) : null}
        </div>
        <p className="mt-1 text-[10px] font-semibold text-slate-600 sm:text-xs">
          Total ({normalizedPurchaseQuantity}): {formatDh(displayedLineTotal)}
        </p>

        {bulkPriceTiersForDisplay.length > 0 ? (
          <div className="mt-2 rounded-lg border border-slate-200 bg-slate-50/80 p-1.5 sm:mt-3 sm:rounded-xl sm:p-3">
            <p className="text-[9px] font-bold uppercase tracking-wide text-slate-700 sm:text-xs">
              Prix de gros
            </p>
            <div className="mt-1 space-y-0.5 sm:mt-2">
              {bulkPriceTiersForDisplay.map((tier) => (
                <p key={tier.minQty} className="text-[10px] font-semibold text-slate-700 sm:text-sm">
                  {tier.minQty}+ {"->"} {formatDh(tier.price)}
                </p>
              ))}
            </div>
          </div>
        ) : null}

        {offerPricing && effectiveOfferPricing ? (
          <div className="mt-1.5 rounded-lg border border-emerald-200 bg-emerald-50/70 p-1.5 sm:mt-3 sm:rounded-xl sm:p-3">
            <p className="text-[9px] font-bold uppercase tracking-wide text-emerald-700 sm:text-xs">
              Offre active {offerPricing.discountLabel}
            </p>
            <p className="mt-0.5 text-[9px] font-semibold text-slate-700 sm:mt-1 sm:text-sm">
              Vous economisez {formatDh(effectiveOfferPricing.savingsAmount)} ({effectiveOfferPricing.savingsPercent}%)
            </p>
            {offerEndLabel ? (
              <p className="mt-0.5 text-[9px] text-slate-600 sm:mt-1 sm:text-xs">Valable jusqu'au {offerEndLabel}</p>
            ) : null}
          </div>
        ) : null}

        <p
          className={`mt-1.5 inline-flex items-center rounded-full border px-2 py-0.5 text-[9px] font-semibold sm:mt-3 sm:px-3 sm:py-1 sm:text-xs ${availabilityClassName}`}
        >
          {availabilityLabel}
        </p>

        {lowStockCount !== null ? (
          <p className="mt-1.5 rounded-lg border border-amber-200 bg-amber-50 px-2 py-1 text-[10px] font-semibold text-amber-700 sm:mt-3 sm:rounded-xl sm:px-3 sm:py-2 sm:text-xs">
            Plus que {lowStockCount} en stock pour cette option.
          </p>
        ) : null}

        {offerPricing && hasOfferCountdown && offerCountdownTarget ? (
          <div className="mt-2 rounded-lg border border-orange-200 bg-orange-50/80 p-1.5 sm:mt-3 sm:rounded-xl sm:p-3">
            <p className="text-[9px] font-bold uppercase tracking-wide text-brand-orange sm:text-xs">
              {offerEndsSoon ? "Offre bientot terminee" : "Temps restant sur cette offre"}
            </p>
            <CountdownTimer expiresAt={offerCountdownTarget} compact />
          </div>
        ) : null}

        <div className="mt-1.5 rounded-lg border border-slate-200 bg-slate-50 p-1.5 sm:hidden">
          <div className="grid grid-cols-3 gap-1">
            <p className="rounded-md bg-white px-1.5 py-1 text-center text-[9px] font-semibold text-brand-blue">
              Paiement livraison
            </p>
            <p className="rounded-md bg-white px-1.5 py-1 text-center text-[9px] font-semibold text-brand-blue">
              Produit garanti
            </p>
            <p className="rounded-md bg-white px-1.5 py-1 text-center text-[9px] font-semibold text-brand-blue">
              Livraison rapide
            </p>
          </div>
          <p className="mt-1.5 text-[9px] text-slate-700">
            Domicile: <span className="font-semibold">{deliveryEstimate}</span>
          </p>
          <p className="mt-0.5 text-[9px] text-slate-700">
            Retrait: <span className="font-semibold">{pickupEstimate}</span>
          </p>
        </div>

        {hasVariants && hasColorOptions ? (
          <div className="mt-2.5 sm:mt-5">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-600 sm:text-xs">Couleur</p>
            <div className="mt-1.5 flex flex-wrap gap-1 sm:mt-2 sm:gap-2">
              {colorOptions.map((color) => {
                const targetVariant = pickVariantForColor(color.key);
                const isSelected = normalizeColorKey(selectedVariant?.color) === color.key;
                const isOutOfStock = (targetVariant?.stock ?? 1) <= 0;

                return (
                  <button
                    key={color.key}
                    type="button"
                    onClick={() => setSelectedVariantId(targetVariant?.id ?? null)}
                    className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold leading-none transition sm:px-3 sm:py-1.5 sm:text-sm ${
                      isSelected
                        ? "border-brand-blue bg-brand-blue text-white"
                        : "border-slate-300 text-slate-700 hover:border-brand-orange hover:text-brand-orange"
                    } ${isOutOfStock ? "opacity-70" : ""}`}
                  >
                    {color.label}
                  </button>
                );
              })}
            </div>
          </div>
        ) : null}

        {hasVariants && hasSizeOptions ? (
          <div className="mt-2 sm:mt-4">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-600 sm:text-xs">Taille</p>
            <div className="mt-1.5 flex flex-wrap gap-1 sm:mt-2 sm:gap-2">
              {sizeOptions.map((size) => {
                const targetVariant = pickVariantForSize(size.key);
                const isSelected = normalizeSizeKey(selectedVariant?.size) === size.key;
                const isOutOfStock = (targetVariant?.stock ?? 1) <= 0;

                return (
                  <button
                    key={size.key}
                    type="button"
                    onClick={() => setSelectedVariantId(targetVariant?.id ?? null)}
                    className={`rounded-md border px-2 py-0.5 text-[10px] font-semibold leading-none transition sm:rounded-xl sm:px-3 sm:py-1.5 sm:text-sm ${
                      isSelected
                        ? "border-brand-blue bg-brand-blue text-white"
                        : "border-slate-300 text-slate-700 hover:border-brand-orange hover:text-brand-orange"
                    } ${isOutOfStock ? "opacity-70" : ""}`}
                  >
                    {size.label}
                  </button>
                );
              })}
            </div>
          </div>
        ) : null}

        <div className="mt-2.5 flex flex-wrap gap-1.5 border-t border-slate-100 pt-2 sm:mt-6 sm:gap-3 sm:border-0 sm:pt-0">
          <AddToCartButton
            productId={product.id}
            variantId={selectedVariant?.id}
            selectedColor={normalizeVariantLabel(selectedVariant?.color) ?? undefined}
            selectedSize={normalizeVariantLabel(selectedVariant?.size) ?? undefined}
            selectedPrice={displayedPrice}
            selectedPreviousPrice={displayedPreviousPrice ?? undefined}
            selectedImage={selectedVariant?.image ?? undefined}
            quantity={normalizedPurchaseQuantity}
            maxQuantity={selectedMaxQuantity ?? undefined}
            disabled={availabilityStatus === "out-of-stock"}
            showBulkButtons
            bulkStepOptions={[10, 50, 100]}
            onQuantityPreviewChange={setSelectedPurchaseQuantity}
            label={isBulkQuoteQuantitySelected ? "Ajouter au panier" : "Commander maintenant"}
            className={
              isBulkQuoteQuantitySelected
                ? "inline-flex h-9 items-center justify-center rounded-lg border border-slate-300 bg-white px-3 text-[11px] font-bold text-brand-blue transition hover:border-brand-orange hover:text-brand-orange sm:h-14 sm:rounded-xl sm:px-8 sm:text-base"
                : "inline-flex h-9 items-center justify-center rounded-lg bg-brand-orange px-3 text-[11px] font-extrabold text-white shadow-[0_8px_16px_rgba(245,122,17,0.28)] transition hover:bg-brand-orangeDark disabled:hover:bg-brand-orange sm:h-14 sm:rounded-xl sm:px-8 sm:text-base sm:shadow-[0_10px_20px_rgba(245,122,17,0.35)]"
            }
            controlsClassName="inline-flex h-9 items-center rounded-lg border border-slate-300 bg-white px-2 sm:h-14 sm:rounded-xl"
          />
          <FavoriteButton
            productId={product.id}
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-300 bg-white text-slate-500 transition hover:border-rose-300 hover:text-rose-600 disabled:cursor-not-allowed disabled:opacity-70 sm:h-14 sm:w-14 sm:rounded-xl"
          />
        </div>

        <p className="mt-0.5 text-[9px] font-medium text-slate-600 sm:mt-2 sm:text-xs">
          Aucun paiement en ligne requis. Confirmation de commande rapide par telephone.
        </p>
        <p className="mt-0.5 text-[9px] text-slate-500 sm:text-xs">
          Pour les grandes quantites ({bulkQuoteThreshold}+ {normalizedBulkUnitLabel}), demandez un devis personnalise.
        </p>

        {isBulkQuoteQuantitySelected ? (
          <>
            <a
              href={productWhatsAppQuoteLink}
              target="_blank"
              rel="noreferrer"
              onClick={(event) => {
                void handleProductQuoteRequestClick(event);
              }}
              className="mt-1 inline-flex h-[2.125rem] w-full items-center justify-center rounded-lg border border-emerald-500 bg-emerald-100 px-3 text-[10px] font-bold text-emerald-800 transition hover:bg-emerald-200 sm:mt-3 sm:h-11 sm:rounded-xl sm:text-sm"
            >
              Demander prix de gros
            </a>
            <a
              href={productWhatsAppLink}
              target="_blank"
              rel="noreferrer"
              className="mt-1 inline-flex h-[2.125rem] w-full items-center justify-center rounded-lg border border-slate-300 bg-white px-3 text-[10px] font-semibold text-slate-700 transition hover:bg-slate-50 sm:h-11 sm:rounded-xl sm:text-sm"
            >
              Commander via WhatsApp
            </a>
            <p className="mt-0.5 text-[9px] text-slate-500 sm:text-xs">
              Le devis en gros inclut la quantite, le prix estime et la variante choisie.
            </p>
          </>
        ) : (
          <>
            <a
              href={productWhatsAppLink}
              target="_blank"
              rel="noreferrer"
              className="mt-1 inline-flex h-[2.125rem] w-full items-center justify-center rounded-lg border border-emerald-300 bg-emerald-50 px-3 text-[10px] font-bold text-emerald-700 transition hover:bg-emerald-100 sm:mt-3 sm:h-11 sm:rounded-xl sm:text-sm"
            >
              Commander via WhatsApp
            </a>
            <p className="mt-0.5 text-[9px] text-slate-500 sm:text-xs">
              Message pre-rempli avec le produit pour un traitement plus rapide.
            </p>
          </>
        )}
      </div>

      <div className="mt-3 hidden gap-1.5 sm:mt-4 sm:grid sm:gap-2 sm:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white p-2.5 sm:p-3">
          <p className="text-xs font-bold uppercase tracking-wide text-brand-blue">
            Paiement a la livraison
          </p>
          <p className="mt-1 text-[11px] text-slate-600 sm:text-xs">Payez en toute serenite a la reception.</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-2.5 sm:p-3">
          <p className="text-xs font-bold uppercase tracking-wide text-brand-blue">
            Produit garanti
          </p>
          <p className="mt-1 text-[11px] text-slate-600 sm:text-xs">Controle qualite avant expedition.</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-2.5 sm:p-3">
          <p className="text-xs font-bold uppercase tracking-wide text-brand-blue">
            Livraison rapide
          </p>
          <p className="mt-1 text-[11px] text-slate-600 sm:text-xs">Traitement prioritaire des commandes locales.</p>
        </div>
      </div>

      <div className="mt-2.5 hidden rounded-xl border border-slate-200 bg-slate-50 p-3 sm:mt-3 sm:block sm:p-4">
        <p className="text-xs font-bold uppercase tracking-wide text-brand-blue">
          Livraison et retrait
        </p>
        <p className="mt-1.5 text-xs text-slate-700 sm:mt-2 sm:text-sm">
          Domicile: <span className="font-semibold">{deliveryEstimate}</span>
        </p>
        <p className="mt-1 text-xs text-slate-700 sm:text-sm">
          Retrait magasin: <span className="font-semibold">{pickupEstimate}</span>
        </p>
      </div>

      <p className="mt-2 text-[11px] leading-5 text-slate-700 line-clamp-5 sm:mt-4 sm:text-[0.95rem] sm:leading-7 sm:line-clamp-none">{product.description}</p>

      <Link
        href="/panier"
        className="mt-2.5 inline-flex text-xs font-semibold text-brand-orange hover:underline sm:mt-4 sm:text-sm"
      >
        Aller au panier
      </Link>

      <div className="h-[74px] md:hidden" aria-hidden />

      <div
        className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200/90 bg-white/95 shadow-[0_-8px_20px_rgba(15,42,77,0.08)] backdrop-blur md:hidden"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <div className="mx-auto flex max-w-7xl items-center gap-2 px-2.5 py-1.5 sm:gap-3 sm:px-5 sm:py-3">
          <div className="min-w-0 flex-1">
            {offerPricing && effectiveOfferPricing ? (
              <p className="truncate text-[10px] font-bold uppercase tracking-wide text-emerald-700">
                {offerPricing.discountLabel} - Economie {formatDh(effectiveOfferPricing.savingsAmount)}
              </p>
            ) : (
              <p className={`text-[10px] font-bold uppercase tracking-wide ${availabilityTextClass}`}>
                {availabilityLabel}
              </p>
            )}
            <div className="flex items-end gap-1">
              <p className="text-[0.98rem] font-extrabold leading-tight text-brand-blue sm:text-xl">
                {formatDh(displayedPrice)}
              </p>
              {displayedPreviousPrice !== null ? (
                <p className="pb-0.5 text-[9px] font-semibold text-slate-400 line-through">
                  {formatDh(displayedPreviousPrice)}
                </p>
              ) : null}
            </div>
          </div>

          <AddToCartButton
            productId={product.id}
            variantId={selectedVariant?.id}
            selectedColor={normalizeVariantLabel(selectedVariant?.color) ?? undefined}
            selectedSize={normalizeVariantLabel(selectedVariant?.size) ?? undefined}
            selectedPrice={displayedPrice}
            selectedPreviousPrice={displayedPreviousPrice ?? undefined}
            selectedImage={selectedVariant?.image ?? undefined}
            quantity={normalizedPurchaseQuantity}
            maxQuantity={selectedMaxQuantity ?? undefined}
            disabled={availabilityStatus === "out-of-stock"}
            allowDirectInput={false}
            showBulkButtons={false}
            bulkStepOptions={[10, 50, 100]}
            label={isBulkQuoteQuantitySelected ? "Ajouter" : "Commander"}
            className={
              isBulkQuoteQuantitySelected
                ? "inline-flex h-8 min-w-[7.6rem] items-center justify-center rounded-lg border border-slate-300 bg-white px-2.5 text-[10px] font-bold text-brand-blue transition hover:border-brand-orange hover:text-brand-orange sm:h-12 sm:min-w-[11.25rem] sm:rounded-xl sm:px-5 sm:text-sm"
                : "inline-flex h-8 min-w-[7.6rem] items-center justify-center rounded-lg bg-brand-orange px-2.5 text-[10px] font-extrabold text-white shadow-[0_7px_14px_rgba(245,122,17,0.28)] transition hover:bg-brand-orangeDark disabled:hover:bg-brand-orange sm:h-12 sm:min-w-[11.25rem] sm:rounded-xl sm:px-5 sm:text-sm"
            }
            controlsClassName="inline-flex h-8 min-w-[7.6rem] items-center rounded-lg border border-slate-300 bg-white px-2 sm:h-12 sm:min-w-[11.25rem] sm:rounded-xl"
          />
        </div>
        <p className="px-2.5 pb-1.5 text-[9px] text-slate-500 sm:px-5 sm:pb-3 sm:text-xs">
          Paiement a la livraison et confirmation avant expedition.
        </p>
      </div>
    </div>
  );
};
