"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { AddToCartButton } from "@/components/add-to-cart-button";
import { FavoriteButton } from "@/components/favorite-button";
import { getCategoryNameBySlug } from "@/data/categories";
import { formatDh } from "@/lib/currency";
import { calculateEffectiveUnitPricing } from "@/lib/offer-pricing";
import {
  getProductAvailabilityMeta,
  getProductAvailabilityStatus,
} from "@/lib/product-availability";
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

    return (
      activeVariants.find((variant) => (variant.stock ?? 1) > 0) ?? activeVariants[0]
    );
  }, [activeVariants]);

  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(
    defaultVariant?.id ?? null,
  );

  const selectedVariant = useMemo(() => {
    if (!selectedVariantId) {
      return defaultVariant;
    }

    return (
      activeVariants.find((variant) => variant.id === selectedVariantId) ?? defaultVariant
    );
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
      selectedVariantId !== null &&
      activeVariants.some((variant) => variant.id === selectedVariantId);

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
        return (
          variantColorKey === colorKey &&
          (!selectedSizeKey || variantSizeKey === selectedSizeKey)
        );
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
        return (
          variantSizeKey === sizeKey &&
          (!currentSelectedColorKey || variantColorKey === currentSelectedColorKey)
        );
      }) ??
      activeVariants.find((variant) => normalizeSizeKey(variant.size) === sizeKey) ??
      null
    );
  };

  const baseDisplayedPrice = selectedVariant?.price ?? product.price;
  const effectiveOfferPricing = offerPricing
    ? calculateEffectiveUnitPricing(baseDisplayedPrice, {
        discountType: offerPricing.discountType,
        discountValue: offerPricing.discountValue,
      })
    : null;
  const displayedPrice = effectiveOfferPricing?.discountedPrice ?? baseDisplayedPrice;
  const displayedPreviousPrice =
    effectiveOfferPricing
      ? effectiveOfferPricing.originalPrice > effectiveOfferPricing.discountedPrice
        ? effectiveOfferPricing.originalPrice
        : null
      : typeof selectedVariant?.previousPrice === "number" && selectedVariant.previousPrice > displayedPrice
      ? selectedVariant.previousPrice
      : typeof product.previousPrice === "number" && product.previousPrice > displayedPrice
        ? product.previousPrice
        : null;

  const availabilityInput = {
    stock: selectedVariant?.stock ?? product.stock,
    isPromo: product.isPromo,
    isNew: product.isNew,
  };
  const availabilityStatus = getProductAvailabilityStatus(availabilityInput);
  const availability = getProductAvailabilityMeta(availabilityInput);

  return (
    <div>
      <p className="text-sm font-semibold uppercase tracking-wide text-brand-orange">
        {getCategoryNameBySlug(product.categorySlug)}
      </p>
      <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-brand-blue sm:text-[2.15rem]">
        {product.name}
      </h1>
      <p className="mt-4 text-sm leading-7 text-slate-700 sm:text-[0.95rem]">{product.description}</p>

      <div className="mt-5">
        <p className="text-3xl font-extrabold tracking-tight text-brand-blue">
          {formatDh(displayedPrice)}
        </p>
        {displayedPreviousPrice !== null ? (
          <p className="mt-1 text-sm font-semibold text-slate-400 line-through">
            {formatDh(displayedPreviousPrice)}
          </p>
        ) : null}
      </div>
      {offerPricing && effectiveOfferPricing ? (
        <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
          <p className="text-xs font-bold uppercase tracking-wide text-emerald-700">
            Offre active {offerPricing.discountLabel}
          </p>
          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            <p className="text-sm font-semibold text-slate-700">
              Prix normal:{" "}
              <span className="line-through">{formatDh(effectiveOfferPricing.originalPrice)}</span>
            </p>
            <p className="text-sm font-extrabold text-brand-orange">
              Prix promo: {formatDh(effectiveOfferPricing.discountedPrice)}
            </p>
            <p className="text-sm font-semibold text-emerald-700">
              Economie: {formatDh(effectiveOfferPricing.savingsAmount)}
            </p>
            <p className="text-sm font-semibold text-emerald-700">
              Remise: {effectiveOfferPricing.savingsPercent}%
            </p>
          </div>
        </div>
      ) : null}
      <p
        className={`mt-2 inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold ${availability.className}`}
      >
        {availability.label}
      </p>

      {hasVariants && hasColorOptions ? (
        <div className="mt-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-600">Couleur</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {colorOptions.map((color) => {
              const targetVariant = pickVariantForColor(color.key);
              const isSelected = normalizeColorKey(selectedVariant?.color) === color.key;
              const isOutOfStock = (targetVariant?.stock ?? 1) <= 0;

              return (
                <button
                  key={color.key}
                  type="button"
                  onClick={() => setSelectedVariantId(targetVariant?.id ?? null)}
                  className={`rounded-full border px-3 py-1.5 text-sm font-semibold transition ${
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
        <div className="mt-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-600">Taille</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {sizeOptions.map((size) => {
              const targetVariant = pickVariantForSize(size.key);
              const isSelected = normalizeSizeKey(selectedVariant?.size) === size.key;
              const isOutOfStock = (targetVariant?.stock ?? 1) <= 0;

              return (
                <button
                  key={size.key}
                  type="button"
                  onClick={() => setSelectedVariantId(targetVariant?.id ?? null)}
                  className={`rounded-xl border px-3 py-1.5 text-sm font-semibold transition ${
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

      <div className="mt-6 flex flex-wrap gap-3">
        <AddToCartButton
          productId={product.id}
          variantId={selectedVariant?.id}
          selectedColor={normalizeVariantLabel(selectedVariant?.color) ?? undefined}
          selectedSize={normalizeVariantLabel(selectedVariant?.size) ?? undefined}
          selectedPrice={displayedPrice}
          selectedPreviousPrice={displayedPreviousPrice ?? undefined}
          selectedImage={selectedVariant?.image ?? undefined}
          disabled={availabilityStatus === "out-of-stock"}
          className="btn-primary h-11 px-5"
          controlsClassName="inline-flex h-11 items-center rounded-xl border border-slate-300 bg-white px-2"
        />
        <FavoriteButton
          productId={product.id}
          className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-slate-300 bg-white text-slate-500 transition hover:border-rose-300 hover:text-rose-600 disabled:cursor-not-allowed disabled:opacity-70"
        />
      </div>

      <Link href="/panier" className="mt-4 inline-flex text-sm font-semibold text-brand-orange hover:underline">
        Aller au panier
      </Link>
    </div>
  );
};
