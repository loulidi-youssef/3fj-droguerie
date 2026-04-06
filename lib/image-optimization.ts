type SafeNextImageProps = {
  src: string;
  unoptimized: boolean;
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

export const getSafeNextImageProps = (rawSrc: string): SafeNextImageProps => {
  const src = normalizeSameOriginAbsoluteSrc(rawSrc?.trim() ?? "");
  return {
    src,
    unoptimized: shouldBypassOptimization(src),
  };
};

