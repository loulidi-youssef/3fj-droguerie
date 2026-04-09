import {
  PRODUCT_IMAGE_FALLBACK_SRC,
  PRODUCT_IMAGE_VARIANT_PATTERN,
  PRODUCT_IMAGE_VARIANT_SUFFIX,
  resolveProductImageReference,
  type ProductImageVariant,
} from "@/lib/product-image-variants";

type SafeNextImageProps = {
  src: string;
  unoptimized: boolean;
};

type SafeNextImageOptions = {
  variant?: ProductImageVariant;
  fallbackSrc?: string;
};

const toNormalizedEnvOrigin = (value: string | undefined): string | null => {
  const trimmed = value?.trim();
  if (!trimmed) {
    return null;
  }

  try {
    return new URL(trimmed).origin;
  } catch {
    return null;
  }
};

const getSupabaseStorageOrigin = (): string | null => {
  const trimmed = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  if (!trimmed) {
    return null;
  }

  try {
    return new URL(trimmed).origin;
  } catch {
    return null;
  }
};

const siteOrigin = toNormalizedEnvOrigin(process.env.NEXT_PUBLIC_SITE_URL);
const supabaseStorageOrigin = getSupabaseStorageOrigin();

const normalizeSameOriginAbsoluteSrc = (rawSrc: string): string => {
  if (!rawSrc || rawSrc.startsWith("/") || !siteOrigin) {
    return rawSrc;
  }

  try {
    const parsed = new URL(rawSrc);
    if (parsed.origin !== siteOrigin) {
      return rawSrc;
    }
    const normalized = `${parsed.pathname}${parsed.search}${parsed.hash}`;
    return normalized || "/";
  } catch {
    return rawSrc;
  }
};

const isSupabaseStorageObjectUrl = (src: string): boolean => {
  if (!supabaseStorageOrigin) {
    return false;
  }

  try {
    const parsed = new URL(src);
    return (
      parsed.origin === supabaseStorageOrigin &&
      parsed.pathname.startsWith("/storage/v1/object/")
    );
  } catch {
    return false;
  }
};

const shouldBypassOptimization = (src: string): boolean => {
  if (!src || src.startsWith("/")) {
    return false;
  }

  if (src.startsWith("data:") || src.startsWith("blob:")) {
    return true;
  }

  return !isSupabaseStorageObjectUrl(src);
};

const replaceVariantSuffix = (
  sourceValue: string,
  variant: ProductImageVariant,
): string => {
  const suffix = PRODUCT_IMAGE_VARIANT_SUFFIX[variant];

  if (!PRODUCT_IMAGE_VARIANT_PATTERN.test(sourceValue)) {
    return sourceValue;
  }

  return sourceValue.replace(PRODUCT_IMAGE_VARIANT_PATTERN, `-${suffix}.webp`);
};

const toVariantSrc = (sourceSrc: string, variant: ProductImageVariant): string => {
  if (!sourceSrc) {
    return sourceSrc;
  }

  const isAbsoluteUrl = /^https?:\/\//i.test(sourceSrc);

  try {
    const parsed = isAbsoluteUrl
      ? new URL(sourceSrc)
      : new URL(sourceSrc, "https://images.local");
    const replacedPathname = replaceVariantSuffix(parsed.pathname, variant);

    if (replacedPathname === parsed.pathname) {
      return sourceSrc;
    }

    parsed.pathname = replacedPathname;
    if (isAbsoluteUrl) {
      return parsed.toString();
    }

    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return replaceVariantSuffix(sourceSrc, variant);
  }
};

const toSafeFallbackSrc = (rawFallbackSrc: string | undefined): string => {
  return normalizeSameOriginAbsoluteSrc(rawFallbackSrc?.trim() || PRODUCT_IMAGE_FALLBACK_SRC);
};

export const getSafeNextImageProps = (
  rawSrc: string | null | undefined,
  options?: SafeNextImageOptions,
): SafeNextImageProps => {
  const fallbackSrc = toSafeFallbackSrc(options?.fallbackSrc);
  const resolvedSrc = resolveProductImageReference(rawSrc, {
    fallbackSrc: "",
    useFallbackWhenInvalid: false,
  });
  const normalizedSrc = normalizeSameOriginAbsoluteSrc(resolvedSrc.trim());
  const withVariantSrc =
    options?.variant && normalizedSrc ? toVariantSrc(normalizedSrc, options.variant) : normalizedSrc;
  const src = withVariantSrc || fallbackSrc;

  return {
    src,
    unoptimized: shouldBypassOptimization(src),
  };
};
