import { NextRequest, NextResponse } from "next/server";
import { getUnitPriceForQuantity } from "@/lib/bulk-pricing";
import { roundDhAmount } from "@/lib/currency";
import { getActiveOfferRulesByProductIds } from "@/lib/offers";
import { calculateEffectiveUnitPricing } from "@/lib/offer-pricing";
import { getProductsByIds } from "@/lib/products";
import { getRequestFingerprintHash } from "@/lib/request-client-id";
import { createQuoteRequest, normalizeQuoteRequestAnonymousId } from "@/lib/quote-requests";
import { consumeSharedRateLimit } from "@/lib/shared-rate-limit";
import {
  RequestAuthError,
  getAuthenticatedCustomerFromRequest,
} from "@/lib/supabase/auth-user";

type IncomingQuoteItem = {
  productId?: string;
  quantity?: number;
  variantId?: string;
  selectedColor?: string;
  selectedSize?: string;
};

type IncomingQuoteRequestBody = {
  source?: string;
  anonymousId?: string;
  fulfillmentMethod?: string;
  items?: IncomingQuoteItem[];
};

type NormalizedQuoteItem = {
  productId: string;
  quantity: number;
  variantId: string | null;
  selectedColor: string | null;
  selectedSize: string | null;
};

type ParseQuoteItemsResult =
  | {
      ok: true;
      items: NormalizedQuoteItem[];
    }
  | {
      ok: false;
      error: string;
    };

const MAX_QUOTE_REQUEST_BYTES = 12_000;
const MAX_QUOTE_ITEMS = 30;
const MAX_UNITS_PER_LINE = 20_000;
const MAX_TOTAL_UNITS = 80_000;
const QUOTE_REQUEST_RATE_LIMIT_WINDOW_MS = 60_000;
const QUOTE_REQUEST_RATE_LIMIT_MAX_REQUESTS = 12;
const QUOTE_REQUEST_FINGERPRINT_RATE_LIMIT_MAX_REQUESTS = 20;

const toNullableString = (value: unknown): string | null => {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const normalizeQuoteSource = (value: unknown): string => {
  if (typeof value !== "string") {
    return "unknown";
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return "unknown";
  }

  const normalized = trimmed.toLowerCase().replace(/[^a-z0-9-]/g, "-");
  return normalized.slice(0, 64) || "unknown";
};

const normalizeFulfillmentMethod = (
  value: unknown,
): "delivery" | "pickup" | null => {
  if (value === "delivery" || value === "pickup") {
    return value;
  }
  return null;
};

const parseQuoteItems = (items: IncomingQuoteItem[]): ParseQuoteItemsResult => {
  const byCompositeKey = new Map<string, NormalizedQuoteItem>();

  for (const item of items) {
    const productId = toNullableString(item.productId);
    if (!productId) {
      continue;
    }

    const quantity = Number(item.quantity ?? 0);
    if (!Number.isInteger(quantity) || quantity <= 0) {
      return {
        ok: false,
        error: "Quantite invalide pour la demande de devis.",
      };
    }

    if (quantity > MAX_UNITS_PER_LINE) {
      return {
        ok: false,
        error: `Quantite trop elevee par ligne (max ${MAX_UNITS_PER_LINE}).`,
      };
    }

    const variantId = toNullableString(item.variantId);
    const selectedColor = toNullableString(item.selectedColor);
    const selectedSize = toNullableString(item.selectedSize);
    const compositeKey = `${productId}::${variantId ?? "base"}`;
    const existing = byCompositeKey.get(compositeKey);
    const nextQuantity = (existing?.quantity ?? 0) + quantity;

    if (nextQuantity > MAX_UNITS_PER_LINE) {
      return {
        ok: false,
        error: `Quantite trop elevee par ligne (max ${MAX_UNITS_PER_LINE}).`,
      };
    }

    byCompositeKey.set(compositeKey, {
      productId,
      quantity: nextQuantity,
      variantId,
      selectedColor,
      selectedSize,
    });

    if (byCompositeKey.size > MAX_QUOTE_ITEMS) {
      return {
        ok: false,
        error: `Maximum ${MAX_QUOTE_ITEMS} produits par demande de devis.`,
      };
    }
  }

  const normalizedItems = Array.from(byCompositeKey.values());
  if (normalizedItems.length === 0) {
    return {
      ok: false,
      error: "Aucun produit valide dans la demande de devis.",
    };
  }

  const totalUnits = normalizedItems.reduce((sum, item) => sum + item.quantity, 0);
  if (totalUnits > MAX_TOTAL_UNITS) {
    return {
      ok: false,
      error: `Quantite totale trop elevee (max ${MAX_TOTAL_UNITS}).`,
    };
  }

  return {
    ok: true,
    items: normalizedItems,
  };
};

const resolveOptionalUserId = async (request: NextRequest): Promise<string | null> => {
  try {
    const authenticatedCustomer = await getAuthenticatedCustomerFromRequest(request);
    return authenticatedCustomer?.id ?? null;
  } catch (error) {
    if (error instanceof RequestAuthError) {
      if (
        error.code === "missing_bearer_token" ||
        error.code === "invalid_bearer_token" ||
        error.code === "supabase_not_configured"
      ) {
        return null;
      }
    }

    console.warn("[api/quote-requests] Optional auth lookup failed.", {
      message: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
};

export async function POST(request: NextRequest) {
  const contentLength = Number(request.headers.get("content-length") ?? "0");
  if (Number.isFinite(contentLength) && contentLength > MAX_QUOTE_REQUEST_BYTES) {
    return NextResponse.json(
      { error: "Requete devis trop volumineuse." },
      { status: 413 },
    );
  }

  let body: IncomingQuoteRequestBody;
  try {
    body = (await request.json()) as IncomingQuoteRequestBody;
  } catch {
    return NextResponse.json(
      { error: "Format de demande devis invalide." },
      { status: 400 },
    );
  }

  const source = normalizeQuoteSource(body.source);
  const fulfillmentMethod = normalizeFulfillmentMethod(body.fulfillmentMethod);
  const requestFingerprintHash = getRequestFingerprintHash(request);
  const anonymousId =
    normalizeQuoteRequestAnonymousId(body.anonymousId) ??
    `fp_${requestFingerprintHash.slice(0, 24)}`;

  const rawItems = Array.isArray(body.items) ? body.items : [];
  const parsedItems = parseQuoteItems(rawItems);
  if (!parsedItems.ok) {
    return NextResponse.json({ error: parsedItems.error }, { status: 400 });
  }

  const optionalUserId = await resolveOptionalUserId(request);
  const rateLimitIdentity = optionalUserId
    ? `user:${optionalUserId}`
    : `anon:${anonymousId}`;

  const rateLimit = await consumeSharedRateLimit({
    scope: "quote-requests:create",
    identifier: rateLimitIdentity,
    limit: QUOTE_REQUEST_RATE_LIMIT_MAX_REQUESTS,
    windowMs: QUOTE_REQUEST_RATE_LIMIT_WINDOW_MS,
    denyOnError: true,
  });

  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: "Trop de demandes de devis. Merci de patienter." },
      {
        status: 429,
        headers: {
          "Retry-After": String(rateLimit.retryAfterSeconds),
        },
      },
    );
  }

  if (!optionalUserId) {
    const fingerprintRateLimit = await consumeSharedRateLimit({
      scope: "quote-requests:create:fingerprint",
      identifier: `fp:${requestFingerprintHash}`,
      limit: QUOTE_REQUEST_FINGERPRINT_RATE_LIMIT_MAX_REQUESTS,
      windowMs: QUOTE_REQUEST_RATE_LIMIT_WINDOW_MS,
      denyOnError: true,
    });

    if (!fingerprintRateLimit.allowed) {
      return NextResponse.json(
        { error: "Trop de demandes de devis. Merci de patienter." },
        {
          status: 429,
          headers: {
            "Retry-After": String(fingerprintRateLimit.retryAfterSeconds),
          },
        },
      );
    }
  }

  const productIds = parsedItems.items.map((item) => item.productId);
  const [products, activeOfferRulesByProductId] = await Promise.all([
    getProductsByIds(productIds),
    getActiveOfferRulesByProductIds(productIds),
  ]);

  const productsById = new Map(products.map((product) => [product.id, product]));
  const missingProduct = parsedItems.items.find((item) => !productsById.has(item.productId));
  if (missingProduct) {
    return NextResponse.json(
      { error: "Un produit n'est plus disponible pour cette demande de devis." },
      { status: 400 },
    );
  }

  try {
    const payloadItems = parsedItems.items.map((item) => {
      const product = productsById.get(item.productId)!;
      const selectedVariant = item.variantId
        ? (product.variants ?? []).find((variant) => variant.id === item.variantId)
        : null;

      if (item.variantId && !selectedVariant) {
        throw new Error("INVALID_VARIANT");
      }

      const quantityPricing = getUnitPriceForQuantity(product, item.quantity, {
        baseUnitPrice: selectedVariant?.price ?? product.price,
        tiers: selectedVariant?.bulkPriceTiers ?? product.bulkPriceTiers,
      });
      const offerRule = activeOfferRulesByProductId.get(product.id);
      const estimatedUnitPrice = roundDhAmount(
        calculateEffectiveUnitPricing(quantityPricing.unitPrice, offerRule).discountedPrice,
      );
      const estimatedTotal = roundDhAmount(estimatedUnitPrice * item.quantity);

      const color = selectedVariant?.color ?? item.selectedColor ?? null;
      const size = selectedVariant?.size ?? item.selectedSize ?? null;
      const variantLabelParts = [
        color ? `Couleur: ${color}` : null,
        size ? `Taille: ${size}` : null,
      ].filter((value): value is string => Boolean(value));

      return {
        productId: product.id,
        productName: product.name,
        variantId: selectedVariant?.id ?? item.variantId ?? null,
        variantLabel: variantLabelParts.length > 0 ? variantLabelParts.join(" | ") : null,
        quantity: item.quantity,
        unitLabel: selectedVariant?.unitLabel ?? product.unitLabel ?? null,
        estimatedUnitPrice,
        estimatedTotal,
      };
    });

    const leadPayload = {
      source,
      fulfillmentMethod,
      items: payloadItems,
      summary: {
        lineCount: payloadItems.length,
        totalQuantity: payloadItems.reduce((sum, item) => sum + item.quantity, 0),
        estimatedSubtotal: payloadItems.reduce((sum, item) => sum + item.estimatedTotal, 0),
      },
      context: {
        requestFingerprintHash,
        userAgent: request.headers.get("user-agent")?.trim().slice(0, 240) ?? null,
      },
    } as const;

    const created = await createQuoteRequest({
      userId: optionalUserId,
      anonymousId,
      payload: leadPayload,
      status: "new",
    });

    if (!created) {
      return NextResponse.json(
        { error: "Impossible d'enregistrer la demande de devis." },
        { status: 503 },
      );
    }

    return NextResponse.json({
      ok: true,
      id: created.id,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (message === "INVALID_VARIANT") {
      return NextResponse.json(
        { error: "Variante produit invalide pour la demande de devis." },
        { status: 400 },
      );
    }

    console.error("[api/quote-requests] Failed to create quote request.", {
      message,
    });

    return NextResponse.json(
      { error: "Erreur lors de l'enregistrement de la demande de devis." },
      { status: 500 },
    );
  }
}
