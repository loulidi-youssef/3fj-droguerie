import { offers as fallbackOffers } from "@/data/offers";
import {
  calculateOfferPricing,
  formatOfferDiscountLabel,
  isOfferDiscountType,
} from "@/lib/offer-pricing";
import { getProductsByIds } from "@/lib/products";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import type { Offer, OfferDiscountType, Product } from "@/types";

type OfferRow = {
  id: string;
  title: string;
  short_description: string;
  discount_label: string;
  product_id: string | null;
  discount_type?: string | null;
  discount_value?: number | null;
  discounted_price: number | null;
  start_at: string | null;
  end_at: string | null;
  image_path: string | null;
  banner_text: string | null;
  is_active: boolean;
  is_featured: boolean;
  created_at: string;
};

export type FeaturedOfferWithProduct = {
  offer: Offer;
  product: Product;
  originalPrice: number;
  discountedPrice: number;
  savingsAmount: number;
  savingsPercent: number;
};

export type OfferWithProductPricing = FeaturedOfferWithProduct;

const OFFER_SELECT_WITH_RULES =
  "id, title, short_description, discount_label, product_id, discount_type, discount_value, discounted_price, start_at, end_at, image_path, banner_text, is_active, is_featured, created_at";
const OFFER_SELECT_LEGACY =
  "id, title, short_description, discount_label, product_id, discounted_price, start_at, end_at, image_path, banner_text, is_active, is_featured, created_at";

const normalizeDiscountType = (
  value: string | null | undefined,
): OfferDiscountType | null => {
  if (!value) {
    return null;
  }

  return isOfferDiscountType(value) ? value : null;
};

const mapOfferRow = (row: OfferRow): Offer | null => {
  if (!row.product_id) {
    return null;
  }

  const discountType = normalizeDiscountType(row.discount_type);
  const discountValue =
    typeof row.discount_value === "number" && Number.isFinite(row.discount_value)
      ? row.discount_value
      : null;
  const legacyDiscountedPrice =
    typeof row.discounted_price === "number" && Number.isFinite(row.discounted_price)
      ? row.discounted_price
      : null;

  if (!discountType && legacyDiscountedPrice === null) {
    return null;
  }

  return {
    id: row.id,
    title: row.title,
    shortDescription: row.short_description,
    discountLabel: row.discount_label,
    productId: row.product_id,
    discountType: discountType ?? "fixed",
    discountValue: discountValue ?? 0,
    legacyDiscountedPrice,
    startAt: row.start_at,
    endAt: row.end_at,
    imagePath: row.image_path,
    bannerText: row.banner_text,
    isActive: row.is_active,
    isFeatured: row.is_featured,
    createdAt: row.created_at,
  };
};

const isDatePassed = (value: string): boolean => {
  const time = new Date(value).getTime();
  if (Number.isNaN(time)) {
    return false;
  }
  return time <= Date.now();
};

const isDateInFuture = (value: string): boolean => {
  const time = new Date(value).getTime();
  if (Number.isNaN(time)) {
    return false;
  }
  return time > Date.now();
};

export const isOfferActiveNow = (offer: Offer): boolean => {
  if (!offer.isActive) {
    return false;
  }

  if (offer.startAt && isDateInFuture(offer.startAt)) {
    return false;
  }

  if (offer.endAt && isDatePassed(offer.endAt)) {
    return false;
  }

  return true;
};

const sortOffersForStorefront = (source: Offer[]): Offer[] => {
  return [...source].sort((first, second) => {
    const featuredWeight = Number(Boolean(second.isFeatured)) - Number(Boolean(first.isFeatured));
    if (featuredWeight !== 0) {
      return featuredWeight;
    }

    const firstCreated = first.createdAt ? new Date(first.createdAt).getTime() : 0;
    const secondCreated = second.createdAt ? new Date(second.createdAt).getTime() : 0;
    return secondCreated - firstCreated;
  });
};

const getFallbackActiveOffers = (): Offer[] => {
  return sortOffersForStorefront(fallbackOffers).filter(isOfferActiveNow);
};

const toOfferWithProductPricing = (
  offer: Offer,
  product: Product,
): OfferWithProductPricing => {
  const discountType: OfferDiscountType =
    offer.legacyDiscountedPrice === null || offer.legacyDiscountedPrice === undefined
      ? offer.discountType
      : "fixed";
  const discountValue =
    offer.legacyDiscountedPrice === null || offer.legacyDiscountedPrice === undefined
      ? offer.discountValue
      : Math.max(0, product.price - offer.legacyDiscountedPrice);
  const pricing = calculateOfferPricing(product.price, discountType, discountValue);
  const normalizedOffer: Offer = {
    ...offer,
    discountType,
    discountValue,
    discountLabel: offer.discountLabel || formatOfferDiscountLabel(discountType, discountValue),
    legacyDiscountedPrice: null,
  };

  return {
    offer: normalizedOffer,
    product,
    ...pricing,
  };
};

const buildOffersWithProducts = async (
  offers: Offer[],
): Promise<OfferWithProductPricing[]> => {
  if (offers.length === 0) {
    return [];
  }

  const sortedOffers = sortOffersForStorefront(offers);
  const products = await getProductsByIds(sortedOffers.map((offer) => offer.productId));
  const productById = new Map(products.map((product) => [product.id, product]));
  const offersWithProducts: OfferWithProductPricing[] = [];

  for (const offer of sortedOffers) {
    const product = productById.get(offer.productId);
    if (!product) {
      continue;
    }

    offersWithProducts.push(toOfferWithProductPricing(offer, product));
  }

  return offersWithProducts;
};

export const getActiveOffers = async (): Promise<Offer[]> => {
  const supabase = getSupabaseServerClient();

  if (!supabase) {
    return getFallbackActiveOffers();
  }

  const fetchOfferRows = async (selectClause: string) => {
    return supabase
      .from("offers")
      .select(selectClause)
      .eq("is_active", true)
      .not("product_id", "is", null)
      .order("is_featured", { ascending: false })
      .order("created_at", { ascending: false })
      .returns<OfferRow[]>();
  };
  const { data, error } = await fetchOfferRows(OFFER_SELECT_WITH_RULES);

  let rows: OfferRow[] | null = data ?? null;

  if (
    error &&
    (error.message.includes("discount_type") || error.message.includes("discount_value"))
  ) {
    const { data: legacyData, error: legacyError } = await fetchOfferRows(OFFER_SELECT_LEGACY);

    if (legacyError || !legacyData) {
      return getFallbackActiveOffers();
    }

    rows = legacyData;
  }

  if ((error && !rows) || !rows) {
    return getFallbackActiveOffers();
  }

  const mapped = rows.map(mapOfferRow).filter((offer): offer is Offer => Boolean(offer));
  return sortOffersForStorefront(mapped.filter(isOfferActiveNow));
};

export const getFeaturedActiveOffer = async (): Promise<Offer | undefined> => {
  const activeOffers = await getActiveOffers();
  if (activeOffers.length === 0) {
    return undefined;
  }

  return sortOffersForStorefront(activeOffers)[0];
};

export const getActiveOffersWithProducts = async (): Promise<OfferWithProductPricing[]> => {
  const activeOffers = await getActiveOffers();
  return buildOffersWithProducts(activeOffers);
};

export const getFeaturedActiveOfferWithProduct = async (): Promise<
  FeaturedOfferWithProduct | undefined
> => {
  const offersWithProducts = await getActiveOffersWithProducts();

  if (offersWithProducts.length === 0) {
    return undefined;
  }

  return (
    offersWithProducts.find((offerWithProduct) => offerWithProduct.offer.isFeatured) ??
    offersWithProducts[0]
  );
};
