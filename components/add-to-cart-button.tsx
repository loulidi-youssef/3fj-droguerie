"use client";

import { useState } from "react";
import { useCart } from "@/components/cart-provider";
import { useToast } from "@/components/toast-provider";

type AddToCartButtonProps = {
  productId: string;
  quantity?: number;
  className?: string;
};

export const AddToCartButton = ({
  productId,
  quantity = 1,
  className,
}: AddToCartButtonProps) => {
  const { addItem } = useCart();
  const { showToast } = useToast();
  const [isActive, setIsActive] = useState(false);

  const handleAddToCart = () => {
    addItem(productId, quantity);
    showToast("Produit ajout\u00E9 au panier");
    setIsActive(true);
    window.setTimeout(() => setIsActive(false), 240);
  };

  return (
    <button
      type="button"
      onClick={handleAddToCart}
      className={`${className ?? "btn-primary"} ${
        isActive ? "scale-[0.98]" : ""
      }`}
    >
      Ajouter au panier
    </button>
  );
};
