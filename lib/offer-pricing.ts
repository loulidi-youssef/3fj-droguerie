import type { OfferDiscountType } from "@/types";
import { formatDh, roundDhAmount } from "@/lib/currency";

export type OfferPricing = {
  originalPrice: number;
  discountedPrice: number;
  savingsAmount: number;
  savingsPercent: number;
};

export type OfferUnitPricingRule = {
  discountType: OfferDiscountType;
  discountValue: number;
  legacyDiscountedPrice?: number | null;
};

const roundCurrency = (value: number): number => {
  return Math.max(0, roundDhAmount(value));
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

  return `-${formatDh(normalizedValue)}`;
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
  const discountedPrice = roundCurrency(basePrice - savingsAmount);
  const savingsPercent =
    basePrice > 0 ? Math.round((savingsAmount / basePrice) * 100) : 0;

  return {
    originalPrice: basePrice,
    discountedPrice,
    savingsAmount,
    savingsPercent,
  };
};

export const calculateEffectiveUnitPricing = (
  baseUnitPrice: number,
  offerRule?: OfferUnitPricingRule | null,
): OfferPricing => {
  const normalizedBaseUnitPrice = roundCurrency(baseUnitPrice);

  if (!offerRule) {
    return calculateOfferPricing(normalizedBaseUnitPrice, "fixed", 0);
  }

  if (
    typeof offerRule.legacyDiscountedPrice === "number" &&
    Number.isFinite(offerRule.legacyDiscountedPrice)
  ) {
    const inferredFixedDiscount = Math.max(
      0,
      normalizedBaseUnitPrice - roundCurrency(offerRule.legacyDiscountedPrice),
    );
    return calculateOfferPricing(normalizedBaseUnitPrice, "fixed", inferredFixedDiscount);
  }

  return calculateOfferPricing(
    normalizedBaseUnitPrice,
    offerRule.discountType,
    offerRule.discountValue,
  );
};
