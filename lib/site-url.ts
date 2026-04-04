const DEFAULT_SITE_URL = "https://3fj-droguerie.ma";

const normalizeSiteUrl = (value: string): string | null => {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  try {
    const normalized = new URL(trimmed);
    normalized.hash = "";
    normalized.search = "";
    return normalized.toString().replace(/\/$/, "");
  } catch {
    return null;
  }
};

export const getSiteUrl = (): string => {
  const configured = normalizeSiteUrl(
    process.env.NEXT_PUBLIC_SITE_URL ?? process.env.SITE_URL ?? "",
  );

  return configured ?? DEFAULT_SITE_URL;
};
