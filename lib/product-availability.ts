import type { Product } from "@/types";

export type ProductAvailabilityStatus = "in-stock" | "limited" | "out-of-stock";

type ProductAvailabilityMeta = {
  label: string;
  className: string;
};

export const getProductAvailabilityStatus = (
  product: Pick<Product, "stock" | "isPromo" | "isNew">,
): ProductAvailabilityStatus => {
  if (typeof product.stock === "number") {
    if (product.stock > 12) {
      return "in-stock";
    }

    if (product.stock > 0) {
      return "limited";
    }

    return "out-of-stock";
  }

  if (product.isPromo || product.isNew) {
    return "limited";
  }

  return "in-stock";
};

export const getProductAvailabilityMeta = (
  product: Pick<Product, "stock" | "isPromo" | "isNew">,
): ProductAvailabilityMeta => {
  const status = getProductAvailabilityStatus(product);
  const normalizedStock =
    typeof product.stock === "number" && Number.isFinite(product.stock)
      ? Math.max(0, Math.floor(product.stock))
      : null;

  if (status === "limited") {
    return {
      label:
        normalizedStock !== null
          ? `Stock limité (${normalizedStock} restants)`
          : "Stock limité",
      className: "border-amber-200 bg-amber-50 text-amber-700",
    };
  }

  if (status === "out-of-stock") {
    return {
      label: "Rupture de stock",
      className: "border-rose-200 bg-rose-50 text-rose-700",
    };
  }

  return {
    label: "En stock",
    className: "border-emerald-200 bg-emerald-50 text-emerald-700",
  };
};
