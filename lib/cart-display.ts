import { calculateEffectiveUnitPricing, type OfferUnitPricingRule } from "@/lib/offer-pricing";
import { roundDhAmount } from "@/lib/currency";
import { getMaxAllowedQuantity } from "@/lib/quantity";
import type { CartItem, Product } from "@/types";

type ProductsApiResponse = {
  products?: Product[];
  activeOfferRulesByProductId?: Record<string, OfferUnitPricingRule>;
};

export type CartProductsLookup = {
  productsById: Record<string, Product>;
  activeOfferRulesByProductId: Record<string, OfferUnitPricingRule>;
};

export type DetailedCartItem = CartItem & {
  product: Product;
  originalUnitPrice: number | null;
  unitPrice: number;
  lineTotal: number;
  variantLabel: string;
  lineKey: string;
  maxAvailableQuantity: number | null;
};

const LOOKUP_CACHE_TTL_MS = 20_000;
const emptyLookup: CartProductsLookup = {
  productsById: {},
  activeOfferRulesByProductId: {},
};

const lookupCache = new Map<string, { expiresAt: number; value: CartProductsLookup }>();
const inFlightLookupRequests = new Map<string, Promise<CartProductsLookup>>();

const normalizeProductIds = (productIds: string[]): string[] => {
  return [...new Set(productIds.map((id) => id.trim()).filter(Boolean))].sort();
};

const toLookupCacheKey = (productIds: string[]): string => {
  return normalizeProductIds(productIds).join(",");
};

const toProductsById = (products: Product[]): Record<string, Product> => {
  return products.reduce<Record<string, Product>>((accumulator, product) => {
    accumulator[product.id] = product;
    return accumulator;
  }, {});
};

const toLookupPayload = (payload: ProductsApiResponse): CartProductsLookup => {
  return {
    productsById: toProductsById(payload.products ?? []),
    activeOfferRulesByProductId: payload.activeOfferRulesByProductId ?? {},
  };
};

export const getCartLineMaxAvailableQuantity = (
  item: Pick<CartItem, "productId" | "variantId">,
  lookup: CartProductsLookup,
): number | null => {
  const product = lookup.productsById[item.productId];
  if (!product) {
    return null;
  }

  if (item.variantId) {
    if (Array.isArray(product.variants) && product.variants.length > 0) {
      const matchedVariant = product.variants.find((variant) => variant.id === item.variantId);
      if (!matchedVariant) {
        return 0;
      }

      return getMaxAllowedQuantity(matchedVariant.stock);
    }

    return 0;
  }

  if ((product.variants?.length ?? 0) > 0) {
    return 0;
  }

  return getMaxAllowedQuantity(product.stock);
};

export const fetchCartProductsLookup = async (
  productIds: string[],
): Promise<CartProductsLookup> => {
  const normalizedIds = normalizeProductIds(productIds);
  if (normalizedIds.length === 0) {
    return emptyLookup;
  }

  const lookupKey = toLookupCacheKey(normalizedIds);
  const now = Date.now();
  const cached = lookupCache.get(lookupKey);
  if (cached && cached.expiresAt > now) {
    return cached.value;
  }

  const existingRequest = inFlightLookupRequests.get(lookupKey);
  if (existingRequest) {
    return existingRequest;
  }

  const lookupRequest = (async (): Promise<CartProductsLookup> => {
    try {
      const searchParams = new URLSearchParams({
        ids: normalizedIds.join(","),
      });
      const response = await fetch(`/api/products?${searchParams.toString()}`, {
        cache: "no-store",
      });

      if (!response.ok) {
        throw new Error("Erreur API produits");
      }

      const payload = (await response.json()) as ProductsApiResponse;
      const nextLookup = toLookupPayload(payload);

      lookupCache.set(lookupKey, {
        expiresAt: Date.now() + LOOKUP_CACHE_TTL_MS,
        value: nextLookup,
      });

      return nextLookup;
    } catch {
      return emptyLookup;
    } finally {
      inFlightLookupRequests.delete(lookupKey);
    }
  })();

  inFlightLookupRequests.set(lookupKey, lookupRequest);
  return lookupRequest;
};

export const buildDetailedCartItems = (
  items: CartItem[],
  lookup: CartProductsLookup,
): DetailedCartItem[] => {
  return items
    .map((item) => {
      const product = lookup.productsById[item.productId];
      if (!product) {
        return null;
      }

      const selectedVariant =
        item.variantId && Array.isArray(product.variants)
          ? product.variants.find((variant) => variant.id === item.variantId)
          : undefined;
      const maxAvailableQuantity = getCartLineMaxAvailableQuantity(item, lookup);
      const baseUnitPrice = selectedVariant?.price ?? product.price;
      const offerRule = lookup.activeOfferRulesByProductId[item.productId];
      const effectivePricing = calculateEffectiveUnitPricing(baseUnitPrice, offerRule);
      const variantLabelParts = [
        item.selectedColor ? `Couleur: ${item.selectedColor}` : null,
        item.selectedSize ? `Taille: ${item.selectedSize}` : null,
      ].filter((value): value is string => Boolean(value));

      return {
        ...item,
        product,
        originalUnitPrice:
          effectivePricing.originalPrice > effectivePricing.discountedPrice
            ? effectivePricing.originalPrice
            : null,
        unitPrice: roundDhAmount(effectivePricing.discountedPrice),
        lineTotal: roundDhAmount(effectivePricing.discountedPrice * item.quantity),
        variantLabel: variantLabelParts.join(" | "),
        lineKey: `${item.productId}::${item.variantId ?? "base"}`,
        maxAvailableQuantity,
      };
    })
    .filter((item): item is DetailedCartItem => item !== null);
};
