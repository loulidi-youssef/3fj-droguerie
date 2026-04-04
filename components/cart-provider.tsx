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

const matchesCartLine = (
  item: Pick<CartItem, "productId" | "variantId">,
  productId: string,
  variantId?: string,
): boolean => {
  return item.productId === productId && (item.variantId ?? "") === (variantId ?? "");
};

type CartContextValue = {
  items: CartItem[];
  addItem: (productId: string, quantity?: number, selection?: CartItemSelection) => void;
  updateQuantity: (productId: string, quantity: number, variantId?: string) => void;
  removeItem: (productId: string, variantId?: string) => void;
  clearCart: () => void;
  itemCount: number;
};

const STORAGE_KEY = "3fj-cart";

const CartContext = createContext<CartContextValue | undefined>(undefined);

export const CartProvider = ({ children }: { children: ReactNode }) => {
  const [items, setItems] = useState<CartItem[]>([]);

  useEffect(() => {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return;

    try {
      const parsed = JSON.parse(raw) as CartItem[];
      setItems(parsed);
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
        const parsed = JSON.parse(event.newValue) as CartItem[];
        setItems(parsed);
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
    (productId: string, quantity = 1, selection?: CartItemSelection) => {
    setItems((current) => {
      const existing = current.find((item) =>
        matchesCartLine(item, productId, selection?.variantId),
      );

      if (existing) {
        return current.map((item) =>
          matchesCartLine(item, productId, selection?.variantId)
            ? { ...item, quantity: item.quantity + quantity }
            : item,
        );
      }

      return [
        ...current,
        {
          productId,
          quantity,
          variantId: selection?.variantId,
          selectedColor: selection?.selectedColor,
          selectedSize: selection?.selectedSize,
          selectedPrice: selection?.selectedPrice,
          selectedPreviousPrice: selection?.selectedPreviousPrice,
          selectedImage: selection?.selectedImage,
        },
      ];
    });
  }, []);

  const updateQuantity = useCallback((productId: string, quantity: number, variantId?: string) => {
    if (quantity <= 0) {
      setItems((current) => current.filter((item) => !matchesCartLine(item, productId, variantId)));
      return;
    }

    setItems((current) =>
      current.map((item) =>
        matchesCartLine(item, productId, variantId) ? { ...item, quantity } : item,
      ),
    );
  }, []);

  const removeItem = useCallback((productId: string, variantId?: string) => {
    setItems((current) => current.filter((item) => !matchesCartLine(item, productId, variantId)));
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
