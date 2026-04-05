import type { OfferDiscountType } from "@/types";

export type OfferPricing = {
  originalPrice: number;
  discountedPrice: number;
  savingsAmount: number;
  savingsPercent: number;
};

const roundCurrency = (value: number): number => {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Math.max(0, Math.round(value));
};

export const isOfferDiscountType = (value: string): value is OfferDiscountType => {
  return value === "percent" || value === "fixed";
};

export const normalizeOfferDiscountValue = (
  discountType: OfferDiscountType,
  discountValue: number,
): number => {
  if (!Number.isFinite(discountValue)) {
    return 0;
  }

  if (discountType === "percent") {
    return Math.min(100, Math.max(0, discountValue));
  }

  return Math.max(0, discountValue);
};

export const formatOfferDiscountLabel = (
  discountType: OfferDiscountType,
  discountValue: number,
): string => {
  const normalizedValue = normalizeOfferDiscountValue(discountType, discountValue);

  if (discountType === "percent") {
    const value = Number.isInteger(normalizedValue)
      ? `${normalizedValue}`
      : normalizedValue.toFixed(2).replace(/\.?0+$/, "");
    return `-${value}%`;
  }

  return `-${roundCurrency(normalizedValue)} DH`;
};

export const calculateOfferPricing = (
  originalPrice: number,
  discountType: OfferDiscountType,
  discountValue: number,
): OfferPricing => {
  const basePrice = roundCurrency(originalPrice);
  const normalizedDiscountValue = normalizeOfferDiscountValue(discountType, discountValue);

  const rawSavings =
    discountType === "percent"
      ? (basePrice * normalizedDiscountValue) / 100
      : normalizedDiscountValue;
  const savingsAmount = Math.min(basePrice, roundCurrency(rawSavings));
  const discountedPrice = Math.max(0, basePrice - savingsAmount);
  const savingsPercent =
    basePrice > 0 ? Math.round((savingsAmount / basePrice) * 100) : 0;

  return {
    originalPrice: basePrice,
    discountedPrice,
    savingsAmount,
    savingsPercent,
  };
};
