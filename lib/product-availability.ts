import type { Product } from "@/types";

export type ProductAvailabilityStatus = "in-stock" | "limited" | "on-order";

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

    return "on-order";
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

  if (status === "limited") {
    return {
      label: "Stock limit\u00E9",
      className: "border-amber-200 bg-amber-50 text-amber-700",
    };
  }

  if (status === "on-order") {
    return {
      label: "Sur commande",
      className: "border-slate-200 bg-slate-100 text-slate-700",
    };
  }

  return {
    label: "En stock",
    className: "border-emerald-200 bg-emerald-50 text-emerald-700",
  };
};
