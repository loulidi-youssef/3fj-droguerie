export const DEFAULT_LOW_STOCK_THRESHOLD = 5;
export const DEFAULT_MAX_CART_LINE_QUANTITY = 10_000;

type ClampQuantityOptions = {
  minQuantity?: number;
  hardLimit?: number | null;
  allowZeroWhenOutOfStock?: boolean;
};

const toSafeInteger = (value: number | null | undefined): number | null => {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return null;
  }

  return Math.max(0, Math.floor(value));
};

export const sanitizeQuantityInput = (
  value: string | number | null | undefined,
): number | null => {
  if (typeof value === "number") {
    if (!Number.isInteger(value) || value < 0) {
      return null;
    }

    return value;
  }

  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  if (!/^\d+$/.test(trimmed)) {
    return null;
  }

  const parsed = Number.parseInt(trimmed, 10);
  if (!Number.isSafeInteger(parsed) || parsed < 0) {
    return null;
  }

  return parsed;
};

export const getMaxAllowedQuantity = (
  stock: number | null | undefined,
  hardLimit?: number | null,
): number | null => {
  const normalizedStock = toSafeInteger(stock);
  const normalizedHardLimit = toSafeInteger(hardLimit);

  if (normalizedStock === null && normalizedHardLimit === null) {
    return null;
  }

  if (normalizedStock === null) {
    return normalizedHardLimit;
  }

  if (normalizedHardLimit === null) {
    return normalizedStock;
  }

  return Math.min(normalizedStock, normalizedHardLimit);
};

export const clampQuantityToStock = (
  quantity: number | null | undefined,
  stock: number | null | undefined,
  options?: ClampQuantityOptions,
): number => {
  const minQuantity = Math.max(1, Math.floor(options?.minQuantity ?? 1));
  const maxAllowedQuantity = getMaxAllowedQuantity(stock, options?.hardLimit);
  const normalizedQuantity = sanitizeQuantityInput(quantity ?? null);
  const fallbackQuantity = normalizedQuantity ?? minQuantity;

  if (maxAllowedQuantity !== null && maxAllowedQuantity <= 0) {
    return options?.allowZeroWhenOutOfStock ? 0 : minQuantity;
  }

  if (maxAllowedQuantity === null) {
    return Math.max(minQuantity, fallbackQuantity);
  }

  return Math.min(maxAllowedQuantity, Math.max(minQuantity, fallbackQuantity));
};

export type StockStatus = "in-stock" | "limited" | "out-of-stock";

export const getStockStatus = (
  stock: number | null | undefined,
  lowStockThreshold = DEFAULT_LOW_STOCK_THRESHOLD,
): StockStatus => {
  const normalizedStock = toSafeInteger(stock);
  if (normalizedStock === null) {
    return "in-stock";
  }

  if (normalizedStock <= 0) {
    return "out-of-stock";
  }

  if (normalizedStock <= Math.max(1, Math.floor(lowStockThreshold))) {
    return "limited";
  }

  return "in-stock";
};

export const getStockStatusLabel = (
  stock: number | null | undefined,
  lowStockThreshold = DEFAULT_LOW_STOCK_THRESHOLD,
): string => {
  const normalizedStock = toSafeInteger(stock);
  const status = getStockStatus(stock, lowStockThreshold);

  if (status === "out-of-stock") {
    return "Rupture de stock";
  }

  if (status === "limited" && normalizedStock !== null) {
    return `Stock limité (${normalizedStock} restants)`;
  }

  return "En stock";
};

export const getStockStatusClassName = (
  stock: number | null | undefined,
  lowStockThreshold = DEFAULT_LOW_STOCK_THRESHOLD,
): string => {
  const status = getStockStatus(stock, lowStockThreshold);

  if (status === "out-of-stock") {
    return "border-rose-200 bg-rose-50 text-rose-700";
  }

  if (status === "limited") {
    return "border-amber-200 bg-amber-50 text-amber-700";
  }

  return "border-emerald-200 bg-emerald-50 text-emerald-700";
};
