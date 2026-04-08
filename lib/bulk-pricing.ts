import { roundDhAmount } from "@/lib/currency";
import type { BulkPriceTier, Product } from "@/types";

type BulkPriceTierSource = {
  minQty?: unknown;
  price?: unknown;
};

type ProductPricingInput = Pick<Product, "price" | "bulkPriceTiers">;

type UnitPriceForQuantityOptions = {
  baseUnitPrice?: number;
  tiers?: BulkPriceTier[] | null;
};

export type UnitPriceForQuantityResult = {
  unitPrice: number;
  appliedTier: BulkPriceTier | null;
  quantity: number;
  tiers: BulkPriceTier[];
};

const toPositiveInteger = (value: unknown): number | null => {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return null;
  }

  const normalized = Math.floor(value);
  if (!Number.isSafeInteger(normalized) || normalized < 1) {
    return null;
  }

  return normalized;
};

const toPositivePrice = (value: unknown): number | null => {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return null;
  }

  const normalized = roundDhAmount(value);
  if (normalized <= 0) {
    return null;
  }

  return normalized;
};

const normalizeQuantity = (quantity: number): number => {
  const parsed = toPositiveInteger(quantity);
  return parsed ?? 1;
};

export const normalizeBulkPriceTiers = (value: unknown): BulkPriceTier[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  const byMinQty = new Map<number, BulkPriceTier>();

  for (const tierValue of value) {
    if (!tierValue || typeof tierValue !== "object" || Array.isArray(tierValue)) {
      continue;
    }

    const source = tierValue as BulkPriceTierSource;
    const minQty = toPositiveInteger(source.minQty);
    const price = toPositivePrice(source.price);
    if (minQty === null || price === null) {
      continue;
    }

    const existing = byMinQty.get(minQty);
    if (!existing || price < existing.price) {
      byMinQty.set(minQty, { minQty, price });
    }
  }

  return Array.from(byMinQty.values()).sort((first, second) => first.minQty - second.minQty);
};

const getApplicableBulkPriceTier = (
  tiers: BulkPriceTier[],
  quantity: number,
): BulkPriceTier | null => {
  let bestTier: BulkPriceTier | null = null;

  for (const tier of tiers) {
    if (tier.minQty <= quantity) {
      bestTier = tier;
      continue;
    }

    break;
  }

  return bestTier;
};

export const getUnitPriceForQuantity = (
  product: ProductPricingInput,
  quantity: number,
  options?: UnitPriceForQuantityOptions,
): UnitPriceForQuantityResult => {
  const normalizedQuantity = normalizeQuantity(quantity);
  const normalizedBasePrice = toPositivePrice(options?.baseUnitPrice ?? product.price) ?? 0;
  const tiers = normalizeBulkPriceTiers(options?.tiers ?? product.bulkPriceTiers ?? []);
  const appliedTier = getApplicableBulkPriceTier(tiers, normalizedQuantity);
  const unitPrice = appliedTier ? roundDhAmount(appliedTier.price) : normalizedBasePrice;

  return {
    unitPrice,
    appliedTier,
    quantity: normalizedQuantity,
    tiers,
  };
};
