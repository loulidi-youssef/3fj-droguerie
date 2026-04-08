"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { CartItem } from "@/types";

type CartItemSelection = Omit<CartItem, "productId" | "quantity">;
type RawCartItem = Partial<Record<keyof CartItem, unknown>>;

const matchesCartLine = (
  item: Pick<CartItem, "productId" | "variantId">,
  productId: string,
  variantId?: string,
): boolean => {
  return item.productId === productId && (item.variantId ?? "") === (variantId ?? "");
};

type CartContextValue = {
  items: CartItem[];
  addItem: (
    productId: string,
    quantity?: number,
    selection?: CartItemSelection,
    maxQuantity?: number,
  ) => void;
  updateQuantity: (
    productId: string,
    quantity: number,
    variantId?: string,
    maxQuantity?: number,
  ) => void;
  removeItem: (productId: string, variantId?: string) => void;
  clearCart: () => void;
  itemCount: number;
};

const STORAGE_KEY = "3fj-cart";
const MAX_CART_LINE_QUANTITY = 99;

const toNormalizedString = (value: unknown): string | undefined => {
  if (typeof value !== "string") {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
};

const toNormalizedProductId = (value: unknown): string | null => {
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  }

  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value);
  }

  return null;
};

const toNormalizedPositiveInteger = (value: unknown): number | null => {
  if (typeof value !== "number" || !Number.isInteger(value)) {
    return null;
  }

  if (value < 1) {
    return null;
  }

  return Math.min(value, MAX_CART_LINE_QUANTITY);
};

const toNormalizedPositiveNumber = (value: unknown): number | undefined => {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) {
    return undefined;
  }

  return value;
};

const normalizeQuantityCap = (value: number | undefined): number => {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return MAX_CART_LINE_QUANTITY;
  }

  return Math.min(MAX_CART_LINE_QUANTITY, Math.max(0, Math.floor(value)));
};

const toCartLineKey = (productId: string, variantId?: string): string => {
  return `${productId}::${variantId ?? ""}`;
};

const sanitizeCartItem = (value: unknown): CartItem | null => {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  const raw = value as RawCartItem;
  const productId = toNormalizedProductId(raw.productId);
  const quantity = toNormalizedPositiveInteger(raw.quantity);

  if (!productId || !quantity) {
    return null;
  }

  const variantId = toNormalizedString(raw.variantId);
  const selectedColor = toNormalizedString(raw.selectedColor);
  const selectedSize = toNormalizedString(raw.selectedSize);

  if ((selectedColor || selectedSize) && !variantId) {
    return null;
  }

  const selectedPrice = toNormalizedPositiveNumber(raw.selectedPrice);
  const selectedPreviousPrice = toNormalizedPositiveNumber(raw.selectedPreviousPrice);
  const selectedImage = toNormalizedString(raw.selectedImage);

  return {
    productId,
    quantity,
    variantId,
    selectedColor,
    selectedSize,
    selectedPrice,
    selectedPreviousPrice,
    selectedImage,
  };
};

const mergeCartItems = (items: CartItem[]): CartItem[] => {
  const byLineKey = new Map<string, CartItem>();

  for (const item of items) {
    const lineKey = toCartLineKey(item.productId, item.variantId);
    const existing = byLineKey.get(lineKey);

    if (!existing) {
      byLineKey.set(lineKey, { ...item });
      continue;
    }

    byLineKey.set(lineKey, {
      ...existing,
      quantity: Math.min(existing.quantity + item.quantity, MAX_CART_LINE_QUANTITY),
      selectedColor: existing.selectedColor ?? item.selectedColor,
      selectedSize: existing.selectedSize ?? item.selectedSize,
      selectedPrice: existing.selectedPrice ?? item.selectedPrice,
      selectedPreviousPrice: existing.selectedPreviousPrice ?? item.selectedPreviousPrice,
      selectedImage: existing.selectedImage ?? item.selectedImage,
    });
  }

  return Array.from(byLineKey.values());
};

const sanitizeCartItems = (value: unknown): CartItem[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  const sanitized = value
    .map((item) => sanitizeCartItem(item))
    .filter((item): item is CartItem => Boolean(item));

  return mergeCartItems(sanitized);
};

const CartContext = createContext<CartContextValue | undefined>(undefined);

export const CartProvider = ({ children }: { children: ReactNode }) => {
  const [items, setItems] = useState<CartItem[]>([]);

  useEffect(() => {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return;

    try {
      const parsed = JSON.parse(raw) as unknown;
      setItems(sanitizeCartItems(parsed));
    } catch {
      setItems([]);
    }
  }, []);

  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (event.key !== STORAGE_KEY) return;
      if (!event.newValue) {
        setItems([]);
        return;
      }

      try {
        const parsed = JSON.parse(event.newValue) as unknown;
        setItems(sanitizeCartItems(parsed));
      } catch {
        setItems([]);
      }
    };

    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }, [items]);

  const addItem = useCallback(
    (
      productId: string,
      quantity = 1,
      selection?: CartItemSelection,
      maxQuantity?: number,
    ) => {
      const sanitizedItem = sanitizeCartItem({
        productId,
        quantity,
        variantId: selection?.variantId,
        selectedColor: selection?.selectedColor,
        selectedSize: selection?.selectedSize,
        selectedPrice: selection?.selectedPrice,
        selectedPreviousPrice: selection?.selectedPreviousPrice,
        selectedImage: selection?.selectedImage,
      });

      if (!sanitizedItem) {
        return;
      }

      const quantityCap = normalizeQuantityCap(maxQuantity);
      if (quantityCap <= 0) {
        return;
      }

      setItems((current) => {
        const existing = current.find((item) =>
          matchesCartLine(item, sanitizedItem.productId, sanitizedItem.variantId),
        );

        if (existing) {
          return current.map((item) =>
            matchesCartLine(item, sanitizedItem.productId, sanitizedItem.variantId)
              ? {
                  ...item,
                  quantity: Math.min(item.quantity + sanitizedItem.quantity, quantityCap),
                }
              : item,
          );
        }

        return [
          ...current,
          {
            ...sanitizedItem,
            quantity: Math.min(sanitizedItem.quantity, quantityCap),
          },
        ];
      });
    },
    [],
  );

  const updateQuantity = useCallback(
    (productId: string, quantity: number, variantId?: string, maxQuantity?: number) => {
      const normalizedProductId = toNormalizedProductId(productId);
      if (!normalizedProductId) {
        return;
      }

      if (!Number.isInteger(quantity) || quantity <= 0) {
        setItems((current) =>
          current.filter((item) => !matchesCartLine(item, normalizedProductId, variantId)),
        );
        return;
      }

      const quantityCap = normalizeQuantityCap(maxQuantity);
      const safeQuantity = Math.min(quantity, quantityCap);

      if (safeQuantity <= 0) {
        setItems((current) =>
          current.filter((item) => !matchesCartLine(item, normalizedProductId, variantId)),
        );
        return;
      }

      setItems((current) =>
        current.map((item) =>
          matchesCartLine(item, normalizedProductId, variantId)
            ? { ...item, quantity: safeQuantity }
            : item,
        ),
      );
    },
    [],
  );

  const removeItem = useCallback((productId: string, variantId?: string) => {
    const normalizedProductId = toNormalizedProductId(productId);
    if (!normalizedProductId) {
      return;
    }

    setItems((current) =>
      current.filter((item) => !matchesCartLine(item, normalizedProductId, variantId)),
    );
  }, []);

  const clearCart = useCallback(() => {
    setItems([]);
  }, []);

  const itemCount = useMemo(
    () => items.reduce((sum, item) => sum + item.quantity, 0),
    [items],
  );

  const value = useMemo(
    () => ({ items, addItem, updateQuantity, removeItem, clearCart, itemCount }),
    [items, addItem, updateQuantity, removeItem, clearCart, itemCount],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error("useCart must be used within CartProvider");
  }
  return context;
};
