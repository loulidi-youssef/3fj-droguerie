"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  clampQuantityToStock,
  getMaxAllowedQuantity,
  sanitizeQuantityInput,
} from "@/lib/quantity";

type UseQuantityControllerOptions = {
  quantity: number;
  stock: number | null | undefined;
  hardLimit?: number | null;
  disabled?: boolean;
  minQuantity?: number;
  allowZeroWhenOutOfStock?: boolean;
  onQuantityChange: (nextQuantity: number) => void;
};

type UseQuantityControllerResult = {
  inputValue: string;
  maxAllowedQuantity: number | null;
  canDecrement: boolean;
  canIncrement: boolean;
  hasReachedMax: boolean;
  isOutOfStock: boolean;
  setInputValue: (value: string) => void;
  commitInputValue: () => void;
  incrementBy: (step: number) => void;
  decrementBy: (step?: number) => void;
};

export const useQuantityController = ({
  quantity,
  stock,
  hardLimit,
  disabled = false,
  minQuantity = 1,
  allowZeroWhenOutOfStock = true,
  onQuantityChange,
}: UseQuantityControllerOptions): UseQuantityControllerResult => {
  const maxAllowedQuantity = useMemo(
    () => getMaxAllowedQuantity(stock, hardLimit),
    [hardLimit, stock],
  );

  const safeQuantity = useMemo(
    () =>
      clampQuantityToStock(quantity, stock, {
        minQuantity,
        hardLimit,
        allowZeroWhenOutOfStock,
      }),
    [allowZeroWhenOutOfStock, hardLimit, minQuantity, quantity, stock],
  );
  const [inputValue, setInputValueState] = useState(() => String(safeQuantity));

  useEffect(() => {
    setInputValueState(String(safeQuantity));
  }, [safeQuantity]);

  const isOutOfStock = maxAllowedQuantity !== null && maxAllowedQuantity <= 0;
  const hasReachedMax =
    maxAllowedQuantity !== null && safeQuantity >= maxAllowedQuantity;
  const canIncrement = !disabled && !isOutOfStock && !hasReachedMax;
  const canDecrement = !disabled && !isOutOfStock && safeQuantity > minQuantity;

  const setInputValue = useCallback((value: string) => {
    if (/^\d*$/.test(value.trim())) {
      setInputValueState(value);
    }
  }, []);

  const updateQuantity = useCallback(
    (nextQuantity: number) => {
      const clampedQuantity = clampQuantityToStock(nextQuantity, stock, {
        minQuantity,
        hardLimit,
        allowZeroWhenOutOfStock,
      });

      setInputValueState(String(clampedQuantity));
      if (clampedQuantity !== quantity) {
        onQuantityChange(clampedQuantity);
      }
    },
    [
      allowZeroWhenOutOfStock,
      hardLimit,
      minQuantity,
      onQuantityChange,
      quantity,
      stock,
    ],
  );

  const commitInputValue = useCallback(() => {
    const parsed = sanitizeQuantityInput(inputValue);
    const fallbackQuantity = safeQuantity > 0 ? safeQuantity : minQuantity;
    updateQuantity(parsed ?? fallbackQuantity);
  }, [inputValue, minQuantity, safeQuantity, updateQuantity]);

  const incrementBy = useCallback(
    (step: number) => {
      const normalizedStep = Math.max(1, Math.floor(step));
      const baseQuantity = safeQuantity > 0 ? safeQuantity : minQuantity;
      updateQuantity(baseQuantity + normalizedStep);
    },
    [minQuantity, safeQuantity, updateQuantity],
  );

  const decrementBy = useCallback(
    (step = 1) => {
      const normalizedStep = Math.max(1, Math.floor(step));
      updateQuantity(safeQuantity - normalizedStep);
    },
    [safeQuantity, updateQuantity],
  );

  return {
    inputValue,
    maxAllowedQuantity,
    canDecrement,
    canIncrement,
    hasReachedMax,
    isOutOfStock,
    setInputValue,
    commitInputValue,
    incrementBy,
    decrementBy,
  };
};
