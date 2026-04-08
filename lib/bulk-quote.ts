import type { BulkPriceTier, Product, ProductVariant } from "@/types";

const DEFAULT_BULK_QUOTE_THRESHOLD = 50;
const DEFAULT_UNIT_LABEL = "unites";

type BulkThresholdSource = Pick<Product, "id" | "slug" | "bulkQuoteThreshold" | "bulkPriceTiers">;
type BulkThresholdVariantSource = Pick<ProductVariant, "bulkQuoteThreshold" | "bulkPriceTiers">;

const toPositiveInteger = (value: unknown): number | null => {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return null;
  }

  const normalized = Math.floor(value);
  if (!Number.isSafeInteger(normalized) || normalized < 1) {
    return null;
  }

  return normalized;
};

const toNonEmptyString = (value: unknown): string | null => {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const getGlobalBulkQuoteThreshold = (): number => {
  const fromEnv = process.env.NEXT_PUBLIC_BULK_QUOTE_THRESHOLD;
  if (!fromEnv) {
    return DEFAULT_BULK_QUOTE_THRESHOLD;
  }

  const parsed = Number(fromEnv);
  return toPositiveInteger(parsed) ?? DEFAULT_BULK_QUOTE_THRESHOLD;
};

const parseBulkThresholdOverridesFromEnv = (): Record<string, number> => {
  const raw = process.env.NEXT_PUBLIC_BULK_QUOTE_THRESHOLDS;
  if (!raw) {
    return {};
  }

  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return {};
    }

    const next: Record<string, number> = {};
    for (const [key, value] of Object.entries(parsed as Record<string, unknown>)) {
      const normalizedKey = toNonEmptyString(key);
      const normalizedValue =
        typeof value === "number" ? toPositiveInteger(value) : toPositiveInteger(Number(value));
      if (!normalizedKey || normalizedValue === null) {
        continue;
      }

      next[normalizedKey.toLowerCase()] = normalizedValue;
    }

    return next;
  } catch {
    return {};
  }
};

const BULK_THRESHOLD_OVERRIDES = parseBulkThresholdOverridesFromEnv();

const getTierDerivedThreshold = (tiers: BulkPriceTier[] | null | undefined): number | null => {
  if (!Array.isArray(tiers) || tiers.length === 0) {
    return null;
  }

  for (const tier of tiers) {
    const parsedMinQty = toPositiveInteger(tier.minQty);
    if (parsedMinQty !== null && parsedMinQty > 1) {
      return parsedMinQty;
    }
  }

  return null;
};

const getOverrideThresholdForProduct = (product: BulkThresholdSource): number | null => {
  const keys = [product.id, product.slug]
    .map((value) => toNonEmptyString(value))
    .filter((value): value is string => Boolean(value))
    .map((value) => value.toLowerCase());

  for (const key of keys) {
    const override = BULK_THRESHOLD_OVERRIDES[key];
    if (override) {
      return override;
    }
  }

  return null;
};

export const resolveBulkQuoteThreshold = (
  product: BulkThresholdSource,
  variant?: BulkThresholdVariantSource | null,
): number => {
  const variantThreshold = toPositiveInteger(variant?.bulkQuoteThreshold);
  if (variantThreshold !== null) {
    return variantThreshold;
  }

  const productThreshold = toPositiveInteger(product.bulkQuoteThreshold);
  if (productThreshold !== null) {
    return productThreshold;
  }

  const envOverrideThreshold = getOverrideThresholdForProduct(product);
  if (envOverrideThreshold !== null) {
    return envOverrideThreshold;
  }

  const tierDerivedThreshold =
    getTierDerivedThreshold(variant?.bulkPriceTiers) ??
    getTierDerivedThreshold(product.bulkPriceTiers);
  if (tierDerivedThreshold !== null) {
    return tierDerivedThreshold;
  }

  return getGlobalBulkQuoteThreshold();
};

export const isBulkQuoteQuantity = (
  quantity: number,
  threshold: number,
): boolean => {
  const normalizedQuantity = toPositiveInteger(quantity) ?? 1;
  const normalizedThreshold = toPositiveInteger(threshold) ?? getGlobalBulkQuoteThreshold();
  return normalizedQuantity >= normalizedThreshold;
};

export const normalizeBulkQuoteUnitLabel = (
  unitLabel: string | null | undefined,
): string => {
  return toNonEmptyString(unitLabel) ?? DEFAULT_UNIT_LABEL;
};

export const formatBulkQuoteQuantity = (
  quantity: number,
  unitLabel: string | null | undefined,
): string => {
  const normalizedQuantity = toPositiveInteger(quantity) ?? 1;
  const normalizedUnitLabel = normalizeBulkQuoteUnitLabel(unitLabel);

  if (normalizedQuantity <= 1 || /[sx]$/i.test(normalizedUnitLabel)) {
    return `${normalizedQuantity} ${normalizedUnitLabel}`;
  }

  return `${normalizedQuantity} ${normalizedUnitLabel}s`;
};

