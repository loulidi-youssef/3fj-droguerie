"use client";

import { useEffect, useMemo, useState } from "react";
import {
  buildDetailedCartItems,
  fetchCartProductsLookup,
  type CartProductsLookup,
  type DetailedCartItem,
} from "@/lib/cart-display";
import { clampQuantityToStock } from "@/lib/quantity";
import type { CartItem } from "@/types";

const EMPTY_CART_LOOKUP: CartProductsLookup = {
  productsById: {},
  activeOfferRulesByProductId: {},
};

type CartQuantityUpdater = (
  productId: string,
  quantity: number,
  variantId?: string,
  maxQuantity?: number,
) => void;

type StockReconciledPayload = {
  correctedItemsCount: number;
  message: string;
};

type UseResolvedCartItemsOptions = {
  items: CartItem[];
  updateQuantity: CartQuantityUpdater;
  isActive?: boolean;
  onStockReconciled?: (payload: StockReconciledPayload) => void;
};

type UseResolvedCartItemsResult = {
  detailedItems: DetailedCartItem[];
  isLoadingProducts: boolean;
  missingProductsCount: number;
  hasMissingProducts: boolean;
};

type StockAdjustment = {
  productId: string;
  variantId?: string;
  nextQuantity: number;
  maxAvailableQuantity: number | null;
};

const resolveStockAdjustment = (item: DetailedCartItem): StockAdjustment | null => {
  const nextQuantity = clampQuantityToStock(item.quantity, item.maxAvailableQuantity, {
    minQuantity: 1,
    allowZeroWhenOutOfStock: true,
  });

  if (nextQuantity === item.quantity) {
    return null;
  }

  return {
    productId: item.productId,
    variantId: item.variantId,
    nextQuantity,
    maxAvailableQuantity: item.maxAvailableQuantity,
  };
};

const getStockAdjustments = (items: DetailedCartItem[]): StockAdjustment[] => {
  return items
    .map((item) => resolveStockAdjustment(item))
    .filter((item): item is StockAdjustment => item !== null);
};

export const getStockReconciledWarningMessage = (correctedItemsCount: number): string => {
  if (correctedItemsCount <= 1) {
    return "La quantite a ete ajustee selon le stock disponible";
  }

  return `${correctedItemsCount} quantites ont ete ajustees selon le stock disponible`;
};

export const getMissingProductsWarningMessage = (
  missingProductsCount: number,
  options?: { includeCount?: boolean },
): string | null => {
  if (missingProductsCount <= 0) {
    return null;
  }

  if (options?.includeCount) {
    return `${missingProductsCount} produit(s) indisponible(s) ont ete ignores.`;
  }

  return "Certains produits de votre panier sont indisponibles actuellement.";
};

export const useResolvedCartItems = ({
  items,
  updateQuantity,
  isActive = true,
  onStockReconciled,
}: UseResolvedCartItemsOptions): UseResolvedCartItemsResult => {
  const [cartLookup, setCartLookup] = useState<CartProductsLookup>(EMPTY_CART_LOOKUP);
  const [isLoadingProducts, setIsLoadingProducts] = useState(false);

  const uniqueProductIds = useMemo(
    () => [...new Set(items.map((item) => item.productId))],
    [items],
  );

  useEffect(() => {
    if (!isActive) {
      setIsLoadingProducts(false);
      return;
    }

    if (uniqueProductIds.length === 0) {
      setCartLookup(EMPTY_CART_LOOKUP);
      setIsLoadingProducts(false);
      return;
    }

    let isMounted = true;

    const fetchProducts = async () => {
      setIsLoadingProducts(true);

      try {
        const nextLookup = await fetchCartProductsLookup(uniqueProductIds);
        if (!isMounted) {
          return;
        }
        setCartLookup(nextLookup);
      } catch {
        if (!isMounted) {
          return;
        }
        setCartLookup(EMPTY_CART_LOOKUP);
      } finally {
        if (isMounted) {
          setIsLoadingProducts(false);
        }
      }
    };

    void fetchProducts();

    return () => {
      isMounted = false;
    };
  }, [isActive, uniqueProductIds]);

  const detailedItems = useMemo(
    () => buildDetailedCartItems(items, cartLookup),
    [items, cartLookup],
  );

  useEffect(() => {
    if (!isActive || isLoadingProducts || detailedItems.length === 0) {
      return;
    }

    const adjustments = getStockAdjustments(detailedItems);
    if (adjustments.length === 0) {
      return;
    }

    for (const adjustment of adjustments) {
      updateQuantity(
        adjustment.productId,
        adjustment.nextQuantity,
        adjustment.variantId,
        adjustment.maxAvailableQuantity ?? undefined,
      );
    }

    onStockReconciled?.({
      correctedItemsCount: adjustments.length,
      message: getStockReconciledWarningMessage(adjustments.length),
    });
  }, [detailedItems, isActive, isLoadingProducts, onStockReconciled, updateQuantity]);

  const missingProductsCount = Math.max(0, items.length - detailedItems.length);

  return {
    detailedItems,
    isLoadingProducts,
    missingProductsCount,
    hasMissingProducts: missingProductsCount > 0,
  };
};

