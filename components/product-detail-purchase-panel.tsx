"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { AddToCartButton } from "@/components/add-to-cart-button";
import { FavoriteButton } from "@/components/favorite-button";
import { getCategoryNameBySlug } from "@/data/categories";
import { formatDh } from "@/lib/currency";
import {
  getProductAvailabilityMeta,
  getProductAvailabilityStatus,
} from "@/lib/product-availability";
import type { Product, ProductVariant } from "@/types";

type ProductDetailPurchasePanelProps = {
  product: Product;
};

const normalizeVariantLabel = (value: string | null | undefined): string | null => {
  if (!value) {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

export const ProductDetailPurchasePanel = ({ product }: ProductDetailPurchasePanelProps) => {
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
  const selectedColor = normalizeVariantLabel(selectedVariant?.color);

  const hasVariants = activeVariants.length > 0;
  const hasColorOptions = activeVariants.some((variant) => Boolean(normalizeVariantLabel(variant.color)));
  const hasSizeOptions = activeVariants.some((variant) => Boolean(normalizeVariantLabel(variant.size)));

  const colorOptions = useMemo(() => {
    const seen = new Set<string>();
    const values: string[] = [];

    for (const variant of activeVariants) {
      const color = normalizeVariantLabel(variant.color);
      if (!color || seen.has(color)) {
        continue;
      }

      seen.add(color);
      values.push(color);
    }

    return values;
  }, [activeVariants]);

  const allSizeOptions = useMemo(() => {
    const seen = new Set<string>();
    const values: string[] = [];

    for (const variant of activeVariants) {
      const size = normalizeVariantLabel(variant.size);
      if (!size || seen.has(size)) {
        continue;
      }

      seen.add(size);
      values.push(size);
    }

    return values;
  }, [activeVariants]);
  const sizeOptions = useMemo(() => {
    if (!selectedColor) {
      return allSizeOptions;
    }

    const seen = new Set<string>();
    const values: string[] = [];

    for (const variant of activeVariants) {
      const variantColor = normalizeVariantLabel(variant.color);
      const size = normalizeVariantLabel(variant.size);
      if (variantColor !== selectedColor || !size || seen.has(size)) {
        continue;
      }

      seen.add(size);
      values.push(size);
    }

    return values;
  }, [activeVariants, allSizeOptions, selectedColor]);

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

  const pickVariantForColor = (color: string): ProductVariant | null => {
    if (activeVariants.length === 0) {
      return null;
    }

    const selectedSize = normalizeVariantLabel(selectedVariant?.size);

    return (
      activeVariants.find((variant) => {
        const variantColor = normalizeVariantLabel(variant.color);
        const variantSize = normalizeVariantLabel(variant.size);
        return variantColor === color && (!selectedSize || variantSize === selectedSize);
      }) ??
      activeVariants.find((variant) => normalizeVariantLabel(variant.color) === color) ??
      null
    );
  };

  const pickVariantForSize = (size: string): ProductVariant | null => {
    if (activeVariants.length === 0) {
      return null;
    }

    const currentSelectedColor = normalizeVariantLabel(selectedVariant?.color);

    return (
      activeVariants.find((variant) => {
        const variantColor = normalizeVariantLabel(variant.color);
        const variantSize = normalizeVariantLabel(variant.size);
        return variantSize === size && (!currentSelectedColor || variantColor === currentSelectedColor);
      }) ??
      activeVariants.find((variant) => normalizeVariantLabel(variant.size) === size) ??
      null
    );
  };

  const displayedPrice = selectedVariant?.price ?? product.price;
  const displayedPreviousPrice =
    typeof selectedVariant?.previousPrice === "number" && selectedVariant.previousPrice > displayedPrice
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
              const targetVariant = pickVariantForColor(color);
              const isSelected = normalizeVariantLabel(selectedVariant?.color) === color;
              const isOutOfStock = (targetVariant?.stock ?? 1) <= 0;

              return (
                <button
                  key={color}
                  type="button"
                  onClick={() => setSelectedVariantId(targetVariant?.id ?? null)}
                  className={`rounded-full border px-3 py-1.5 text-sm font-semibold transition ${
                    isSelected
                      ? "border-brand-blue bg-brand-blue text-white"
                      : "border-slate-300 text-slate-700 hover:border-brand-orange hover:text-brand-orange"
                  } ${isOutOfStock ? "opacity-70" : ""}`}
                >
                  {color}
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
              const targetVariant = pickVariantForSize(size);
              const isSelected = normalizeVariantLabel(selectedVariant?.size) === size;
              const isOutOfStock = (targetVariant?.stock ?? 1) <= 0;

              return (
                <button
                  key={size}
                  type="button"
                  onClick={() => setSelectedVariantId(targetVariant?.id ?? null)}
                  className={`rounded-xl border px-3 py-1.5 text-sm font-semibold transition ${
                    isSelected
                      ? "border-brand-blue bg-brand-blue text-white"
                      : "border-slate-300 text-slate-700 hover:border-brand-orange hover:text-brand-orange"
                  } ${isOutOfStock ? "opacity-70" : ""}`}
                >
                  {size}
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
