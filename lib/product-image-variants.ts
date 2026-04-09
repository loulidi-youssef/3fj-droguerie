export type ProductImageVariant = "thumbnail" | "medium" | "large";

export const PRODUCT_IMAGE_FALLBACK_SRC = "/images/placeholders/product-placeholder.svg";
export const PRODUCT_IMAGES_DEFAULT_BUCKET = "product-images";

export const PRODUCT_IMAGE_VARIANT_SUFFIX: Record<ProductImageVariant, string> = {
  thumbnail: "thumb",
  medium: "medium",
  large: "large",
};

export const PRODUCT_IMAGE_VARIANT_PATTERN = /-(thumb|medium|large)\.webp$/i;

const isAbsoluteHttpUrl = (value: string): boolean => {
  return /^https?:\/\//i.test(value);
};

const toSupabaseStorageOrigin = (): string | null => {
  const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  if (!rawUrl) {
    return null;
  }

  try {
    return new URL(rawUrl).origin;
  } catch {
    return null;
  }
};

const toProductImagesBucket = (): string => {
  const fromPublicEnv = process.env.NEXT_PUBLIC_SUPABASE_PRODUCT_IMAGES_BUCKET?.trim();
  if (fromPublicEnv) {
    return fromPublicEnv;
  }

  const fromServerEnv = process.env.SUPABASE_PRODUCT_IMAGES_BUCKET?.trim();
  if (fromServerEnv) {
    return fromServerEnv;
  }

  return PRODUCT_IMAGES_DEFAULT_BUCKET;
};

const normalizeStoragePath = (value: string): string | null => {
  const normalized = value.trim().replace(/\\/g, "/");
  if (!normalized) {
    return null;
  }

  if (
    normalized.startsWith("/") ||
    normalized.startsWith("data:") ||
    normalized.startsWith("blob:") ||
    isAbsoluteHttpUrl(normalized)
  ) {
    return null;
  }

  const withoutRelativePrefix = normalized.replace(/^\.\/+/, "");
  const withoutLeadingSlashes = withoutRelativePrefix.replace(/^\/+/, "");
  const compact = withoutLeadingSlashes.replace(/\/{2,}/g, "/");
  if (!compact) {
    return null;
  }

  const parts = compact.split("/").map((part) => part.trim()).filter(Boolean);
  if (parts.length === 0) {
    return null;
  }

  if (parts.some((part) => part === "." || part === "..")) {
    return null;
  }

  return parts.join("/");
};

const encodeStoragePath = (storagePath: string): string => {
  return storagePath
    .split("/")
    .map((part) => encodeURIComponent(part))
    .join("/");
};

export const normalizeProductImageReferenceForStorage = (
  rawValue: string | null | undefined,
): string | null => {
  const value = rawValue?.trim() ?? "";
  if (!value) {
    return null;
  }

  if (isAbsoluteHttpUrl(value) || value.startsWith("/")) {
    return value;
  }

  return normalizeStoragePath(value);
};

export const toSupabaseStoragePublicUrl = (
  storagePath: string,
  options?: { bucketName?: string },
): string | null => {
  const normalizedPath = normalizeStoragePath(storagePath);
  if (!normalizedPath) {
    return null;
  }

  const storageOrigin = toSupabaseStorageOrigin();
  if (!storageOrigin) {
    return null;
  }

  const bucketName = options?.bucketName?.trim() || toProductImagesBucket();
  const encodedPath = encodeStoragePath(normalizedPath);
  return `${storageOrigin}/storage/v1/object/public/${bucketName}/${encodedPath}`;
};

export const resolveProductImageReference = (
  rawValue: string | null | undefined,
  options?: {
    fallbackSrc?: string;
    bucketName?: string;
    useFallbackWhenInvalid?: boolean;
  },
): string => {
  const fallbackSrc = options?.fallbackSrc?.trim() || PRODUCT_IMAGE_FALLBACK_SRC;
  const useFallbackWhenInvalid = options?.useFallbackWhenInvalid ?? true;
  const normalized = rawValue?.trim() ?? "";

  if (!normalized) {
    return fallbackSrc;
  }

  if (isAbsoluteHttpUrl(normalized) || normalized.startsWith("/")) {
    return normalized;
  }

  const publicUrl = toSupabaseStoragePublicUrl(normalized, {
    bucketName: options?.bucketName,
  });
  if (publicUrl) {
    return publicUrl;
  }

  return useFallbackWhenInvalid ? fallbackSrc : "";
};

export const resolveProductImageCollection = (
  rawValues: unknown,
  options?: {
    fallbackSrc?: string;
    bucketName?: string;
  },
): string[] => {
  const fallbackSrc = options?.fallbackSrc?.trim() || PRODUCT_IMAGE_FALLBACK_SRC;
  if (!Array.isArray(rawValues)) {
    return [fallbackSrc];
  }

  const resolvedValues = rawValues
    .map((rawValue) =>
      resolveProductImageReference(
        typeof rawValue === "string" ? rawValue : null,
        {
          fallbackSrc,
          bucketName: options?.bucketName,
          useFallbackWhenInvalid: false,
        },
      ),
    )
    .map((value) => value.trim())
    .filter(Boolean);

  const uniqueValues = [...new Set(resolvedValues)];
  return uniqueValues.length > 0 ? uniqueValues : [fallbackSrc];
};

export const resolveOptionalProductImageReference = (
  rawValue: string | null | undefined,
  options?: { bucketName?: string },
): string | null => {
  const resolved = resolveProductImageReference(rawValue, {
    bucketName: options?.bucketName,
    fallbackSrc: "",
    useFallbackWhenInvalid: false,
  }).trim();

  return resolved || null;
};

export const buildProductStorageImagePath = (input: {
  categorySlug: string;
  productSlug: string;
  fileName: string;
}): string => {
  const sanitize = (value: string): string =>
    value
      .trim()
      .toLowerCase()
      .replace(/\s+/g, "-")
      .replace(/[^a-z0-9._-]/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "");

  const category = sanitize(input.categorySlug) || "autres";
  const product = sanitize(input.productSlug) || "produit";
  const file = sanitize(input.fileName) || "image.webp";

  return `${category}/${product}/${file}`;
};
