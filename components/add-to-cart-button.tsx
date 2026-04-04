"use client";

import { useState } from "react";
import { useCart } from "@/components/cart-provider";
import { useToast } from "@/components/toast-provider";

type AddToCartButtonProps = {
  productId: string;
  quantity?: number;
  className?: string;
  disabled?: boolean;
  disabledLabel?: string;
};

export const AddToCartButton = ({
  productId,
  quantity = 1,
  className,
  disabled = false,
  disabledLabel = "Rupture de stock",
}: AddToCartButtonProps) => {
  const { addItem } = useCart();
  const { showToast } = useToast();
  const [isActive, setIsActive] = useState(false);

  const handleAddToCart = () => {
    if (disabled) {
      return;
    }

    addItem(productId, quantity);
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

  return (
    <button
      type="button"
      onClick={handleAddToCart}
      disabled={disabled}
      className={`${className ?? "btn-primary"} ${
        isActive ? "scale-[0.98]" : ""
      } ${disabled ? "cursor-not-allowed opacity-60" : ""}`}
    >
      {disabled ? disabledLabel : "Ajouter au panier"}
    </button>
  );
};
