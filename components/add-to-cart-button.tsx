"use client";

import { useState } from "react";
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
}: AddToCartButtonProps) => {
  const { items, addItem, updateQuantity } = useCart();
  const { showToast } = useToast();
  const [isActive, setIsActive] = useState(false);
  const currentQuantity =
    items.find(
      (item) =>
        item.productId === productId && (item.variantId ?? "") === (variantId ?? ""),
    )?.quantity ?? 0;
  const canIncrement = !disabled;

  const handleAddToCart = () => {
    if (disabled) {
      return;
    }

    addItem(productId, quantity, {
      variantId,
      selectedColor,
      selectedSize,
      selectedPrice,
      selectedPreviousPrice,
      selectedImage,
    });
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
    updateQuantity(productId, currentQuantity + 1, variantId);
  };

  if (currentQuantity > 0) {
    return (
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
            compact ? "h-8 w-8 text-base" : "h-9 w-9 text-lg"
          }`}
          aria-label="Diminuer la quantite"
        >
          -
        </button>
        <span className={`min-w-[3.25rem] text-center font-semibold text-slate-800 ${compact ? "text-sm" : "text-base"}`}>
          {currentQuantity}
        </span>
        <button
          type="button"
          onClick={handleIncrease}
          disabled={!canIncrement}
          className={`inline-flex items-center justify-center rounded-md border border-slate-300 text-slate-700 transition hover:border-brand-orange hover:text-brand-orange disabled:cursor-not-allowed disabled:opacity-60 ${
            compact ? "h-8 w-8 text-base" : "h-9 w-9 text-lg"
          }`}
          aria-label="Augmenter la quantite"
        >
          +
        </button>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={handleAddToCart}
      disabled={disabled}
      className={`${className ?? "btn-primary"} ${
        isActive ? "scale-[0.98]" : ""
      } ${disabled ? "cursor-not-allowed opacity-60" : ""}`}
    >
      {disabled ? disabledLabel : label}
    </button>
  );
};
