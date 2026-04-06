export type ProductImageVariant = "thumbnail" | "medium" | "large";

export const PRODUCT_IMAGE_FALLBACK_SRC = "/images/placeholders/product-placeholder.svg";

export const PRODUCT_IMAGE_VARIANT_SUFFIX: Record<ProductImageVariant, string> = {
  thumbnail: "thumb",
  medium: "medium",
  large: "large",
};

export const PRODUCT_IMAGE_VARIANT_PATTERN = /-(thumb|medium|large)\.webp$/i;
