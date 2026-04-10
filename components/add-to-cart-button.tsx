"use client";

import { useEffect, useMemo, useState } from "react";
import { useCart } from "@/components/cart-provider";
import { useToast } from "@/components/toast-provider";
import { trackEvent } from "@/lib/analytics";
import { clampQuantityToStock, getMaxAllowedQuantity } from "@/lib/quantity";
import { useQuantityController } from "@/lib/use-quantity-controller";

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
  allowDirectInput?: boolean;
  showBulkButtons?: boolean;
  bulkStepOptions?: number[];
  onQuantityPreviewChange?: (quantity: number) => void;
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
  allowDirectInput = !compact,
  showBulkButtons = !compact,
  bulkStepOptions,
  onQuantityPreviewChange,
}: AddToCartButtonProps) => {
  const { items, addItem, updateQuantity } = useCart();
  const { showToast } = useToast();
  const [isActive, setIsActive] = useState(false);
  const [draftQuantity, setDraftQuantity] = useState(() =>
    clampQuantityToStock(quantity, maxQuantity, { minQuantity: 1 }),
  );
  const currentQuantity =
    items.find(
      (item) =>
        item.productId === productId && (item.variantId ?? "") === (variantId ?? ""),
    )?.quantity ?? 0;
  const normalizedMaxQuantity = getMaxAllowedQuantity(maxQuantity);
  const normalizedBulkSteps = useMemo(() => {
    const source = bulkStepOptions ?? [10, 50, 100];
    const dedupedSteps = [...new Set(source.map((step) => Math.max(1, Math.floor(step))))];
    return dedupedSteps.slice(0, 3);
  }, [bulkStepOptions]);
  const isDisabled =
    disabled || (normalizedMaxQuantity !== null && normalizedMaxQuantity <= 0);

  const cartQuantityController = useQuantityController({
    quantity: currentQuantity,
    stock: normalizedMaxQuantity,
    disabled: isDisabled,
    minQuantity: 1,
    onQuantityChange: (nextQuantity) => {
      updateQuantity(
        productId,
        nextQuantity,
        variantId,
        normalizedMaxQuantity ?? undefined,
      );
    },
  });

  const draftQuantityController = useQuantityController({
    quantity: draftQuantity,
    stock: normalizedMaxQuantity,
    disabled: isDisabled,
    minQuantity: 1,
    allowZeroWhenOutOfStock: false,
    onQuantityChange: setDraftQuantity,
  });

  useEffect(() => {
    const clampedCurrentQuantity = clampQuantityToStock(
      currentQuantity,
      normalizedMaxQuantity,
      {
        minQuantity: 1,
        allowZeroWhenOutOfStock: true,
      },
    );

    if (clampedCurrentQuantity === currentQuantity) {
      return;
    }

    updateQuantity(
      productId,
      clampedCurrentQuantity,
      variantId,
      normalizedMaxQuantity ?? undefined,
    );
  }, [
    currentQuantity,
    normalizedMaxQuantity,
    productId,
    updateQuantity,
    variantId,
  ]);

  useEffect(() => {
    setDraftQuantity((current) =>
      clampQuantityToStock(current, normalizedMaxQuantity, { minQuantity: 1 }),
    );
  }, [normalizedMaxQuantity]);

  useEffect(() => {
    setDraftQuantity(clampQuantityToStock(quantity, normalizedMaxQuantity, { minQuantity: 1 }));
  }, [quantity, normalizedMaxQuantity]);

  useEffect(() => {
    if (!onQuantityPreviewChange) {
      return;
    }

    const quantityForPreview = currentQuantity > 0
      ? clampQuantityToStock(currentQuantity, normalizedMaxQuantity, {
          minQuantity: 1,
          allowZeroWhenOutOfStock: false,
        })
      : clampQuantityToStock(draftQuantity, normalizedMaxQuantity, {
          minQuantity: 1,
          allowZeroWhenOutOfStock: false,
        });

    onQuantityPreviewChange(quantityForPreview);
  }, [
    currentQuantity,
    draftQuantity,
    normalizedMaxQuantity,
    onQuantityPreviewChange,
  ]);

  const handleAddToCart = () => {
    if (isDisabled) {
      return;
    }

    const requestedQuantity = clampQuantityToStock(draftQuantity, normalizedMaxQuantity, {
      minQuantity: 1,
    });
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
    const nextCartSize = items.reduce((sum, item) => sum + item.quantity, 0) + quantityToAdd;
    const currentTrackedTotal = items.reduce(
      (sum, item) => sum + (item.selectedPrice ?? 0) * item.quantity,
      0,
    );
    const nextTrackedTotal = Number(
      (currentTrackedTotal + (selectedPrice ?? 0) * quantityToAdd).toFixed(2),
    );
    trackEvent("add_to_cart", {
      source: "add-to-cart-button",
      productId,
      variantId: variantId ?? null,
      quantityAdded: quantityToAdd,
      cartSize: nextCartSize,
      totalPrice: nextTrackedTotal,
      deliveryOption: null,
    });

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

  if (currentQuantity > 0) {
    return (
      <div className="inline-flex flex-col items-start gap-1.5">
        <div
          className={
            controlsClassName ??
            "inline-flex h-11 items-center rounded-xl border border-slate-300 bg-white px-2"
          }
        >
          <button
            type="button"
            onClick={() => cartQuantityController.decrementBy(1)}
            disabled={!cartQuantityController.canDecrement}
            className={`inline-flex items-center justify-center rounded-md border border-slate-300 text-slate-700 transition hover:border-brand-orange hover:text-brand-orange disabled:cursor-not-allowed disabled:opacity-60 ${
              compact ? "h-8 w-8 text-base sm:h-8 sm:w-8 sm:text-base" : "h-9 w-9 text-lg"
            }`}
            aria-label="Diminuer la quantite"
          >
            -
          </button>
          {allowDirectInput ? (
            <input
              inputMode="numeric"
              pattern="[0-9]*"
              value={cartQuantityController.inputValue}
              onChange={(event) => cartQuantityController.setInputValue(event.target.value)}
              onBlur={cartQuantityController.commitInputValue}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  cartQuantityController.commitInputValue();
                }
              }}
              className={`w-12 bg-transparent text-center font-semibold text-slate-800 outline-none ${
                compact ? "text-sm sm:text-base" : "text-base"
              }`}
              aria-label="Saisir la quantite"
              disabled={isDisabled}
            />
          ) : (
            <span
              className={`min-w-[3.25rem] text-center font-semibold text-slate-800 ${compact ? "text-sm sm:text-base" : "text-base"}`}
            >
              {currentQuantity}
            </span>
          )}
          <button
            type="button"
            onClick={() => cartQuantityController.incrementBy(1)}
            disabled={!cartQuantityController.canIncrement}
            className={`inline-flex items-center justify-center rounded-md border border-slate-300 text-slate-700 transition hover:border-brand-orange hover:text-brand-orange disabled:cursor-not-allowed disabled:opacity-60 ${
              compact ? "h-8 w-8 text-base sm:h-8 sm:w-8 sm:text-base" : "h-9 w-9 text-lg"
            }`}
            aria-label="Augmenter la quantite"
          >
            +
          </button>
        </div>

        {showBulkButtons && !compact ? (
          <div className="flex flex-wrap gap-1">
            {normalizedBulkSteps.map((step) => (
              <button
                key={step}
                type="button"
                onClick={() => cartQuantityController.incrementBy(step)}
                disabled={!cartQuantityController.canIncrement}
                className="inline-flex h-8 items-center justify-center rounded-md border border-slate-300 bg-white px-2.5 text-sm font-semibold text-slate-700 transition hover:border-brand-orange hover:text-brand-orange disabled:cursor-not-allowed disabled:opacity-60"
              >
                +{step}
              </button>
            ))}
          </div>
        ) : null}

        {cartQuantityController.hasReachedMax &&
        normalizedMaxQuantity !== null &&
        normalizedMaxQuantity > 0 ? (
          <p className="text-sm font-medium text-amber-700">{maxReachedLabel}</p>
        ) : null}
      </div>
    );
  }

  if (allowDirectInput && !compact) {
    return (
      <div className="inline-flex flex-col items-start gap-1.5">
        <div className="inline-flex h-11 items-center rounded-xl border border-slate-300 bg-white px-2">
          <button
            type="button"
            onClick={() => draftQuantityController.decrementBy(1)}
            disabled={!draftQuantityController.canDecrement}
            className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-slate-300 text-lg text-slate-700 transition hover:border-brand-orange hover:text-brand-orange disabled:cursor-not-allowed disabled:opacity-60"
            aria-label="Diminuer la quantite"
          >
            -
          </button>
          <input
            inputMode="numeric"
            pattern="[0-9]*"
            value={draftQuantityController.inputValue}
            onChange={(event) => draftQuantityController.setInputValue(event.target.value)}
            onBlur={draftQuantityController.commitInputValue}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                draftQuantityController.commitInputValue();
              }
            }}
            className="w-12 bg-transparent text-center text-base font-semibold text-slate-800 outline-none"
            aria-label="Saisir la quantite"
            disabled={isDisabled}
          />
          <button
            type="button"
            onClick={() => draftQuantityController.incrementBy(1)}
            disabled={!draftQuantityController.canIncrement}
            className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-slate-300 text-lg text-slate-700 transition hover:border-brand-orange hover:text-brand-orange disabled:cursor-not-allowed disabled:opacity-60"
            aria-label="Augmenter la quantite"
          >
            +
          </button>
        </div>

        {showBulkButtons ? (
          <div className="flex flex-wrap gap-1">
            {normalizedBulkSteps.map((step) => (
              <button
                key={step}
                type="button"
                onClick={() => draftQuantityController.incrementBy(step)}
                disabled={!draftQuantityController.canIncrement}
                className="inline-flex h-8 items-center justify-center rounded-md border border-slate-300 bg-white px-2.5 text-sm font-semibold text-slate-700 transition hover:border-brand-orange hover:text-brand-orange disabled:cursor-not-allowed disabled:opacity-60"
              >
                +{step}
              </button>
            ))}
          </div>
        ) : null}

        {draftQuantityController.hasReachedMax &&
        normalizedMaxQuantity !== null &&
        normalizedMaxQuantity > 0 ? (
          <p className="text-sm font-medium text-amber-700">{maxReachedLabel}</p>
        ) : null}

        <button
          type="button"
          onClick={handleAddToCart}
          disabled={isDisabled}
          className={`${className ?? "btn-primary px-4 py-3 text-base"} ${
            isActive ? "scale-[0.98]" : ""
          } ${isDisabled ? "cursor-not-allowed opacity-60" : ""}`}
        >
          {isDisabled ? disabledLabel : label}
        </button>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={handleAddToCart}
      disabled={isDisabled}
      className={`${className ?? "btn-primary px-4 py-3 text-base"} ${
        isActive ? "scale-[0.98]" : ""
      } ${isDisabled ? "cursor-not-allowed opacity-60" : ""}`}
    >
      {isDisabled ? disabledLabel : label}
    </button>
  );
};
