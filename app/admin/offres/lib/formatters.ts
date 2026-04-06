import {
  isOfferDiscountType,
  normalizeOfferDiscountValue,
} from "@/lib/offer-pricing";
import type { OfferDiscountType } from "@/types";

const toSingleValue = (value: string | string[] | undefined): string => {
  if (typeof value === "string") {
    return value;
  }

  if (Array.isArray(value)) {
    return value[0] ?? "";
  }

  return "";
};

export const parseFlashMessage = (value: string | string[] | undefined): string => {
  const rawValue = toSingleValue(value);
  if (!rawValue) {
    return "";
  }

  try {
    return decodeURIComponent(rawValue);
  } catch {
    return rawValue;
  }
};

export const toNullableString = (value: FormDataEntryValue | null): string | null => {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed ? trimmed : null;
};

export const parseDateTimeInput = (value: string | null): string | null => {
  if (!value) {
    return null;
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return parsed.toISOString();
};

export const toDateTimeLocalInputValue = (value: string | null): string => {
  if (!value) {
    return "";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${year}-${month}-${day}T${hours}:${minutes}`;
};

export const formatDateTime = (value: string | null): string => {
  if (!value) {
    return "Non defini";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "Non defini";
  }

  return new Intl.DateTimeFormat("fr-MA", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
};

export type ResolvedOfferDiscountRule = {
  discountType: OfferDiscountType;
  discountValue: number;
};

export const resolveDiscountRule = (
  discountType: string | null,
  discountValue: number | null,
  legacyDiscountedPrice: number | null,
  productPrice: number | null,
): ResolvedOfferDiscountRule | null => {
  const normalizedType = discountType ?? "";
  if (
    isOfferDiscountType(normalizedType) &&
    typeof discountValue === "number" &&
    Number.isFinite(discountValue)
  ) {
    return {
      discountType: normalizedType,
      discountValue: normalizeOfferDiscountValue(normalizedType, discountValue),
    };
  }

  if (typeof legacyDiscountedPrice === "number" && typeof productPrice === "number") {
    return {
      discountType: "fixed",
      discountValue: Math.max(0, productPrice - legacyDiscountedPrice),
    };
  }

  return null;
};
