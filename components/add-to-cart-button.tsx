"use client";

import { useEffect, useState } from "react";
import { useCart } from "@/components/cart-provider";
import { useToast } from "@/components/toast-provider";

type AddToCartButtonProps = {
  productId: string;
  variantId?: string;
  selectedColor?: string;
  selectedSize?: string;
  selectedPrice?: number;
  selectedPreviousPrice?: number;
  selectedImage?: string;
  label?: string;
  quantity?: number;
  className?: string;
  controlsClassName?: string;
  disabled?: boolean;
  disabledLabel?: string;
  compact?: boolean;
  maxQuantity?: number;
  maxReachedLabel?: string;
};

export const AddToCartButton = ({
  productId,
  variantId,
  selectedColor,
  selectedSize,
  selectedPrice,
  selectedPreviousPrice,
  selectedImage,
  label = "Ajouter au panier",
  quantity = 1,
  className,
  controlsClassName,
  disabled = false,
  disabledLabel = "Rupture de stock",
  compact = false,
  maxQuantity,
  maxReachedLabel = "Quantite maximale disponible atteinte",
}: AddToCartButtonProps) => {
  const { items, addItem, updateQuantity } = useCart();
  const { showToast } = useToast();
  const [isActive, setIsActive] = useState(false);
  const currentQuantity =
    items.find(
      (item) =>
        item.productId === productId && (item.variantId ?? "") === (variantId ?? ""),
    )?.quantity ?? 0;
  const normalizedMaxQuantity =
    typeof maxQuantity === "number" && Number.isFinite(maxQuantity)
      ? Math.max(0, Math.floor(maxQuantity))
      : null;
  const isDisabled =
    disabled || (normalizedMaxQuantity !== null && normalizedMaxQuantity <= 0);
  const hasReachedMax =
    normalizedMaxQuantity !== null && currentQuantity >= normalizedMaxQuantity;
  const canIncrement = !isDisabled && !hasReachedMax;

  useEffect(() => {
    if (normalizedMaxQuantity === null || currentQuantity <= normalizedMaxQuantity) {
      return;
    }

    updateQuantity(productId, normalizedMaxQuantity, variantId, normalizedMaxQuantity);
  }, [
    currentQuantity,
    normalizedMaxQuantity,
    productId,
    updateQuantity,
    variantId,
  ]);

  const handleAddToCart = () => {
    if (isDisabled) {
      return;
    }

    const requestedQuantity = Math.max(1, Math.floor(quantity));
    const quantityToAdd =
      normalizedMaxQuantity === null
        ? requestedQuantity
        : Math.min(requestedQuantity, Math.max(0, normalizedMaxQuantity - currentQuantity));

    if (quantityToAdd <= 0) {
      return;
    }

    addItem(productId, quantityToAdd, {
      variantId,
      selectedColor,
      selectedSize,
      selectedPrice,
      selectedPreviousPrice,
      selectedImage,
    }, normalizedMaxQuantity ?? undefined);

    if (quantityToAdd < requestedQuantity) {
      showToast(maxReachedLabel, { variant: "info" });
    }

    showToast("Produit ajout\u00E9 au panier", {
      primaryAction: {
        label: "Voir panier",
        href: "/panier",
      },
      secondaryAction: {
        label: "Continuer les achats",
      },
      durationMs: 5200,
    });
    setIsActive(true);
    window.setTimeout(() => setIsActive(false), 240);
  };

  const handleDecrease = () => {
    updateQuantity(productId, currentQuantity - 1, variantId);
  };

  const handleIncrease = () => {
    if (!canIncrement) {
      return;
    }
    updateQuantity(
      productId,
      currentQuantity + 1,
      variantId,
      normalizedMaxQuantity ?? undefined,
    );
  };

  if (currentQuantity > 0) {
    return (
      <div className="inline-flex flex-col items-start gap-1">
        <div
          className={
            controlsClassName ??
            "inline-flex h-11 items-center rounded-xl border border-slate-300 bg-white px-2"
          }
        >
          <button
            type="button"
            onClick={handleDecrease}
            className={`inline-flex items-center justify-center rounded-md border border-slate-300 text-slate-700 transition hover:border-brand-orange hover:text-brand-orange ${
              compact ? "h-7 w-7 text-sm sm:h-8 sm:w-8 sm:text-base" : "h-9 w-9 text-lg"
            }`}
            aria-label="Diminuer la quantite"
          >
            -
          </button>
          <span
            className={`min-w-[3.25rem] text-center font-semibold text-slate-800 ${compact ? "text-xs sm:text-sm" : "text-base"}`}
          >
            {currentQuantity}
          </span>
          <button
            type="button"
            onClick={handleIncrease}
            disabled={!canIncrement}
            className={`inline-flex items-center justify-center rounded-md border border-slate-300 text-slate-700 transition hover:border-brand-orange hover:text-brand-orange disabled:cursor-not-allowed disabled:opacity-60 ${
              compact ? "h-7 w-7 text-sm sm:h-8 sm:w-8 sm:text-base" : "h-9 w-9 text-lg"
            }`}
            aria-label="Augmenter la quantite"
          >
            +
          </button>
        </div>

        {hasReachedMax && normalizedMaxQuantity !== null && normalizedMaxQuantity > 0 ? (
          <p className="text-[10px] font-medium text-amber-700">{maxReachedLabel}</p>
        ) : null}
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={handleAddToCart}
      disabled={isDisabled}
      className={`${className ?? "btn-primary"} ${
        isActive ? "scale-[0.98]" : ""
      } ${isDisabled ? "cursor-not-allowed opacity-60" : ""}`}
    >
      {isDisabled ? disabledLabel : label}
    </button>
  );
};
