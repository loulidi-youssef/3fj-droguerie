import { createHash } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { getUnitPriceForQuantity } from "@/lib/bulk-pricing";
import { validateCheckoutCustomer } from "@/lib/checkout-validation";
import {
  getDeliveryCostByOption,
  getDeliveryOptionForFulfillmentMethod,
  getFulfillmentMethodForDeliveryOption,
  normalizeDeliveryOption,
  requiresAddressForDeliveryOption,
  type DeliveryOption,
  type FulfillmentMethod,
} from "@/lib/delivery";
import { getActiveOfferRulesByProductIdsStrict } from "@/lib/offers";
import { calculateEffectiveUnitPricing } from "@/lib/offer-pricing";
import { roundDhAmount } from "@/lib/currency";
import { getProductsByIdsStrict } from "@/lib/products";
import { getRequestFingerprintHash } from "@/lib/request-client-id";
import { consumeSharedRateLimit } from "@/lib/shared-rate-limit";
import {
  RequestAuthError,
  getAuthenticatedCustomerFromRequest,
} from "@/lib/supabase/auth-user";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { TransactionDataUnavailableError } from "@/lib/transaction-data";

type IncomingOrderItem = {
  productId?: string;
  quantity?: number;
  variantId?: string;
};

type IncomingOrderBody = {
  customer?: {
    name?: string;
    phone?: string;
    address?: string;
    location?: string;
    note?: string;
  };
  items?: IncomingOrderItem[];
  fulfillmentMethod?: string;
  deliveryOption?: string;
};

type OrderErrorResponse = {
  error: string;
  fieldErrors?: {
    name?: string;
    phone?: string;
    address?: string;
    location?: string;
    note?: string;
  };
};

type NormalizedOrderItem = {
  productId: string;
  quantity: number;
  variantId: string | null;
};

type ParseOrderItemsResult =
  | {
      ok: true;
      items: NormalizedOrderItem[];
    }
  | {
      ok: false;
      error: string;
    };

const MAX_ORDER_REQUEST_BYTES = 20_000;
const DEFAULT_MAX_DISTINCT_ITEMS_PER_ORDER = 30;
const DEFAULT_ANTI_ABUSE_MAX_TOTAL_UNITS_PER_ORDER = 5_000;
const DEFAULT_ANTI_ABUSE_MAX_UNITS_PER_LINE = 10_000;
const ORDER_RATE_LIMIT_WINDOW_MS = 60_000;
const ORDER_RATE_LIMIT_MAX_REQUESTS = 10;
const IDEMPOTENCY_DERIVED_WINDOW_MS = 10 * 60 * 1000;
const MAX_IDEMPOTENCY_KEY_HEADER_LENGTH = 200;

type RpcErrorLike = {
  message?: string;
  details?: string;
  hint?: string;
  code?: string;
};

const toRpcErrorLike = (value: unknown): RpcErrorLike => {
  if (!value || typeof value !== "object") {
    return {};
  }

  const record = value as Record<string, unknown>;
  return {
    message: typeof record.message === "string" ? record.message : undefined,
    details: typeof record.details === "string" ? record.details : undefined,
    hint: typeof record.hint === "string" ? record.hint : undefined,
    code: typeof record.code === "string" ? record.code : undefined,
  };
};

const isCreateOrderRpcSignatureMismatch = (error: unknown): boolean => {
  const rpcError = toRpcErrorLike(error);
  const normalizedMessage = [
    rpcError.message,
    rpcError.details,
    rpcError.hint,
  ]
    .filter((value): value is string => Boolean(value))
    .join(" ")
    .toLowerCase();

  if (!normalizedMessage.includes("create_order_with_items_atomic")) {
    return false;
  }

  return (
    normalizedMessage.includes("could not find the function") ||
    (normalizedMessage.includes("function") && normalizedMessage.includes("does not exist")) ||
    normalizedMessage.includes("no function matches") ||
    normalizedMessage.includes("p_customer_note") ||
    normalizedMessage.includes("p_delivery_option")
  );
};

const toPositiveInteger = (value: string | undefined): number | null => {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  if (!/^\d+$/.test(trimmed)) {
    return null;
  }

  const parsed = Number.parseInt(trimmed, 10);
  if (!Number.isSafeInteger(parsed) || parsed <= 0) {
    return null;
  }

  return parsed;
};

const parseProductMaxUnitsPerLineByProductId = (
  rawValue: string | undefined,
): Map<string, number> => {
  if (typeof rawValue !== "string" || rawValue.trim().length === 0) {
    return new Map();
  }

  try {
    const parsed = JSON.parse(rawValue) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return new Map();
    }

    const byProductId = new Map<string, number>();
    for (const [rawProductId, rawLimit] of Object.entries(parsed)) {
      const productId = rawProductId.trim();
      const limit =
        typeof rawLimit === "number" && Number.isInteger(rawLimit) && rawLimit > 0
          ? rawLimit
          : null;

      if (!productId || limit === null) {
        continue;
      }

      byProductId.set(productId, limit);
    }

    return byProductId;
  } catch {
    console.warn(
      "[api/orders] ORDER_MAX_UNITS_PER_LINE_BY_PRODUCT ignored due to invalid JSON.",
    );
    return new Map();
  }
};

const MAX_DISTINCT_ITEMS_PER_ORDER =
  toPositiveInteger(process.env.ORDER_ANTI_ABUSE_MAX_DISTINCT_ITEMS_PER_ORDER) ??
  DEFAULT_MAX_DISTINCT_ITEMS_PER_ORDER;
const MAX_TOTAL_UNITS_PER_ORDER =
  toPositiveInteger(process.env.ORDER_ANTI_ABUSE_MAX_TOTAL_UNITS_PER_ORDER) ??
  DEFAULT_ANTI_ABUSE_MAX_TOTAL_UNITS_PER_ORDER;
const MAX_UNITS_PER_LINE_ANTI_ABUSE =
  toPositiveInteger(process.env.ORDER_ANTI_ABUSE_MAX_UNITS_PER_LINE) ??
  DEFAULT_ANTI_ABUSE_MAX_UNITS_PER_LINE;
const MAX_UNITS_PER_LINE_BUSINESS = toPositiveInteger(process.env.ORDER_MAX_UNITS_PER_LINE);
const PRODUCT_MAX_UNITS_PER_LINE_BY_PRODUCT_ID = parseProductMaxUnitsPerLineByProductId(
  process.env.ORDER_MAX_UNITS_PER_LINE_BY_PRODUCT,
);

const normalizeFulfillmentMethod = (value: unknown): FulfillmentMethod | null => {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim().toLowerCase();
  if (normalized === "delivery" || normalized === "pickup") {
    return normalized;
  }

  return null;
};

const parseOrderItems = (items: IncomingOrderItem[]): ParseOrderItemsResult => {
  const quantityByCompositeKey = new Map<string, NormalizedOrderItem>();

  const toNullableString = (value: unknown): string | null => {
    if (typeof value !== "string") {
      return null;
    }

    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  };

  for (const item of items) {
    const productId = item.productId?.trim() ?? "";
    if (!productId) {
      continue;
    }

    const variantId = toNullableString(item.variantId);

    const quantity = Number(item.quantity ?? 0);
    if (!Number.isInteger(quantity) || quantity <= 0) {
      return { ok: false, error: "Quantite invalide. Merci de corriger votre panier." };
    }

    const compositeKey = [productId, variantId ?? "base"].join("::");

    const existing = quantityByCompositeKey.get(compositeKey);
    const nextQuantity = (existing?.quantity ?? 0) + quantity;

    if (nextQuantity > MAX_UNITS_PER_LINE_ANTI_ABUSE) {
      return {
        ok: false,
        error:
          "Quantite demandee trop elevee pour une seule ligne de panier. Merci de fractionner la commande ou de contacter le support.",
      };
    }

    if (
      MAX_UNITS_PER_LINE_BUSINESS !== null &&
      nextQuantity > MAX_UNITS_PER_LINE_BUSINESS
    ) {
      return {
        ok: false,
        error: `La quantite maximale autorisee par ligne est ${MAX_UNITS_PER_LINE_BUSINESS}.`,
      };
    }

    const productSpecificLineLimit = PRODUCT_MAX_UNITS_PER_LINE_BY_PRODUCT_ID.get(productId);
    if (
      typeof productSpecificLineLimit === "number" &&
      nextQuantity > productSpecificLineLimit
    ) {
      return {
        ok: false,
        error: `La quantite maximale autorisee pour ce produit est ${productSpecificLineLimit}.`,
      };
    }

    quantityByCompositeKey.set(compositeKey, {
      productId,
      variantId,
      quantity: nextQuantity,
    });

    if (quantityByCompositeKey.size > MAX_DISTINCT_ITEMS_PER_ORDER) {
      return {
        ok: false,
        error: `Maximum ${MAX_DISTINCT_ITEMS_PER_ORDER} produits differents par commande.`,
      };
    }
  }

  if (quantityByCompositeKey.size === 0) {
    return { ok: false, error: "Votre panier est vide. Ajoutez au moins un produit." };
  }

  const normalizedItems = Array.from(quantityByCompositeKey.values());

  const totalUnits = normalizedItems.reduce((sum, item) => sum + item.quantity, 0);
  if (totalUnits > MAX_TOTAL_UNITS_PER_ORDER) {
    return {
      ok: false,
      error: `Quantite totale trop elevee (maximum ${MAX_TOTAL_UNITS_PER_ORDER} unites).`,
    };
  }

  return { ok: true, items: normalizedItems };
};

const toCompactText = (value: string): string => {
  return value.trim().replace(/\s+/g, " ");
};

const sha256 = (value: string): string => {
  return createHash("sha256").update(value).digest("hex");
};

const sortByProductAndVariant = <T extends { productId: string; variantId: string | null }>(
  items: T[],
): T[] => {
  return [...items].sort((first, second) => {
    if (first.productId !== second.productId) {
      return first.productId.localeCompare(second.productId);
    }

    return (first.variantId ?? "").localeCompare(second.variantId ?? "");
  });
};

export async function POST(request: NextRequest) {
  const contentLength = Number(request.headers.get("content-length") ?? "0");
  if (Number.isFinite(contentLength) && contentLength > MAX_ORDER_REQUEST_BYTES) {
    return NextResponse.json<OrderErrorResponse>(
      { error: "Requete trop volumineuse. Merci de reessayer avec un panier plus simple." },
      { status: 413 },
    );
  }

  let authenticatedCustomer: { id: string; email: string | null } | null = null;
  try {
    authenticatedCustomer = await getAuthenticatedCustomerFromRequest(request);
  } catch (error) {
    if (error instanceof RequestAuthError && error.code === "invalid_bearer_token") {
      return NextResponse.json<OrderErrorResponse>(
        { error: "Session invalide. Merci de vous reconnecter ou de continuer en mode invite." },
        { status: 401 },
      );
    }

    const errorCode = error instanceof RequestAuthError ? error.code : "unknown_auth_error";
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.warn("[api/orders] Optional auth lookup failed; continuing as guest.", {
      code: errorCode,
      message: errorMessage,
    });
  }

  let body: IncomingOrderBody;

  try {
    body = (await request.json()) as IncomingOrderBody;
  } catch {
    return NextResponse.json<OrderErrorResponse>(
      { error: "Donnees invalides. Merci de reessayer." },
      { status: 400 },
    );
  }

  const parsedDeliveryOption = normalizeDeliveryOption(body.deliveryOption);
  const parsedFulfillmentMethod = normalizeFulfillmentMethod(body.fulfillmentMethod);
  const deliveryOption: DeliveryOption | null =
    parsedDeliveryOption ??
    (parsedFulfillmentMethod
      ? getDeliveryOptionForFulfillmentMethod(parsedFulfillmentMethod)
      : null);

  if (!deliveryOption) {
    return NextResponse.json<OrderErrorResponse>(
      {
        error:
          "Choisissez un mode de livraison valide (standard, express ou retrait).",
      },
      { status: 400 },
    );
  }

  const fulfillmentMethod = getFulfillmentMethodForDeliveryOption(deliveryOption);
  const customerValidation = validateCheckoutCustomer({
    name: body.customer?.name ?? "",
    phone: body.customer?.phone ?? "",
    address: body.customer?.address ?? "",
    location: body.customer?.location ?? "",
    note: body.customer?.note ?? "",
  }, {
    requireAddress: requiresAddressForDeliveryOption(deliveryOption),
    requireName: Boolean(authenticatedCustomer),
    requireLocation: true,
  });

  if (!customerValidation.isValid) {
    const firstError =
      customerValidation.errors.name ||
      customerValidation.errors.phone ||
      customerValidation.errors.address ||
      customerValidation.errors.location ||
      customerValidation.errors.note ||
      "Merci de corriger les champs du formulaire.";

    return NextResponse.json<OrderErrorResponse>(
      {
        error: firstError,
        fieldErrors: customerValidation.errors,
      },
      { status: 400 },
    );
  }

  const { name, phone, address, location } = customerValidation.customer;
  const customerNote = customerValidation.customer.note;
  const orderAddress =
    fulfillmentMethod === "pickup" ? "Retrait en magasin" : address;
  const orderUserId = authenticatedCustomer?.id?.trim() || null;
  const requestFingerprintHash = getRequestFingerprintHash(request);
  const orderActorKey = orderUserId ? `user:${orderUserId}` : `anon:${requestFingerprintHash}`;
  const orderActorLogSuffix = orderUserId
    ? `user:${orderUserId.slice(-6)}`
    : `guest:${requestFingerprintHash.slice(0, 8)}`;

  const rateLimitResult = await consumeSharedRateLimit({
    scope: "orders:create:actor",
    identifier: orderActorKey,
    limit: ORDER_RATE_LIMIT_MAX_REQUESTS,
    windowMs: ORDER_RATE_LIMIT_WINDOW_MS,
    denyOnError: true,
  });
  if (!rateLimitResult.allowed) {
    return NextResponse.json<OrderErrorResponse>(
      { error: "Trop de tentatives. Merci de patienter quelques secondes." },
      {
        status: 429,
        headers: {
          "Retry-After": String(rateLimitResult.retryAfterSeconds),
        },
      },
    );
  }

  const items = Array.isArray(body.items) ? body.items : [];
  const parsedItems = parseOrderItems(items);
  if (!parsedItems.ok) {
    return NextResponse.json<OrderErrorResponse>(
      { error: parsedItems.error },
      { status: 400 },
    );
  }

  const normalizedItems = parsedItems.items;

  const productIds = normalizedItems.map((item) => item.productId);
  let products: Awaited<ReturnType<typeof getProductsByIdsStrict>>;
  let activeOfferRulesByProductId: Awaited<
    ReturnType<typeof getActiveOfferRulesByProductIdsStrict>
  >;
  try {
    [products, activeOfferRulesByProductId] = await Promise.all([
      getProductsByIdsStrict(productIds),
      getActiveOfferRulesByProductIdsStrict(productIds),
    ]);
  } catch (error) {
    const errorCode =
      error instanceof TransactionDataUnavailableError
        ? error.code
        : "TRANSACTION_DATA_UNKNOWN_ERROR";
    const errorMessage = error instanceof Error ? error.message : String(error);

    console.error("[api/orders] Transactional catalog read failed.", {
      code: errorCode,
      message: errorMessage,
    });

    return NextResponse.json<OrderErrorResponse>(
      {
        error:
          "Service temporairement indisponible. Merci de reessayer dans quelques instants.",
      },
      { status: 503 },
    );
  }

  const productById = new Map(products.map((product) => [product.id, product]));

  const missingProductIds = productIds.filter((productId) => !productById.has(productId));
  if (missingProductIds.length > 0) {
    return NextResponse.json<OrderErrorResponse>(
      {
        error:
          "Certains produits du panier ne sont plus disponibles. Merci d'actualiser le panier.",
      },
      { status: 400 },
    );
  }

  const lineItems: Array<{
    productId: string;
    variantId: string | null;
    selectedColor: string | null;
    selectedSize: string | null;
    productName: string;
    quantity: number;
    unitPrice: number;
    lineTotal: number;
  }> = [];

  for (const item of normalizedItems) {
    const product = productById.get(item.productId)!;
    const productVariants = Array.isArray(product.variants) ? product.variants : [];

    if (productVariants.length > 0 && !item.variantId) {
      return NextResponse.json<OrderErrorResponse>(
        {
          error: `Le produit "${product.name}" exige le choix d'une variante (couleur/taille).`,
        },
        { status: 400 },
      );
    }

    const selectedVariant =
      item.variantId && productVariants.length > 0
        ? productVariants.find((variant) => variant.id === item.variantId)
        : null;

    if (item.variantId && !selectedVariant) {
      return NextResponse.json<OrderErrorResponse>(
        {
          error:
            "La variante selectionnee est invalide ou indisponible. Merci d'actualiser votre panier.",
        },
        { status: 400 },
      );
    }

    // Policy: product-level active offers apply to the selected unit base price,
    // including variant prices when a variant is chosen.
    const quantityPricing = getUnitPriceForQuantity(product, item.quantity, {
      baseUnitPrice: selectedVariant ? selectedVariant.price : product.price,
      tiers: selectedVariant?.bulkPriceTiers ?? product.bulkPriceTiers,
    });
    const offerRule = activeOfferRulesByProductId.get(product.id);
    const unitPrice = roundDhAmount(
      calculateEffectiveUnitPricing(quantityPricing.unitPrice, offerRule).discountedPrice,
    );
    const stock = selectedVariant?.stock ?? product.stock;

    if (typeof stock === "number" && item.quantity > stock) {
      return NextResponse.json<OrderErrorResponse>(
        { error: `Stock insuffisant pour ${product.name}. Quantite disponible: ${stock}.` },
        { status: 400 },
      );
    }

    const color = selectedVariant?.color ?? null;
    const size = selectedVariant?.size ?? null;
    const variantLabelParts = [
      color ? `Couleur: ${color}` : null,
      size ? `Taille: ${size}` : null,
    ].filter((value): value is string => Boolean(value));
    const productName =
      variantLabelParts.length > 0
        ? `${product.name} (${variantLabelParts.join(", ")})`
        : product.name;

    lineItems.push({
      productId: product.id,
      variantId: selectedVariant?.id ?? null,
      selectedColor: color,
      selectedSize: size,
      productName,
      quantity: item.quantity,
      unitPrice,
      lineTotal: roundDhAmount(unitPrice * item.quantity),
    });
  }

  const subtotal = roundDhAmount(lineItems.reduce((sum, item) => sum + item.lineTotal, 0));
  const deliveryFee = roundDhAmount(getDeliveryCostByOption(deliveryOption, subtotal));
  const total = roundDhAmount(subtotal + deliveryFee);
  const normalizedHeaderIdempotencyKey = request.headers.get("idempotency-key")?.trim() ?? "";
  if (normalizedHeaderIdempotencyKey.length > MAX_IDEMPOTENCY_KEY_HEADER_LENGTH) {
    return NextResponse.json<OrderErrorResponse>(
      {
        error:
          `L'en-tete Idempotency-Key est trop long (maximum ${MAX_IDEMPOTENCY_KEY_HEADER_LENGTH} caracteres).`,
      },
      { status: 400 },
    );
  }

  const pricedItemsSnapshot = sortByProductAndVariant(
    lineItems.map((item) => ({
      productId: item.productId,
      variantId: item.variantId,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      lineTotal: item.lineTotal,
    })),
  );
  const requestFingerprintPayload = {
    actorKey: orderActorKey,
    userId: orderUserId,
    fulfillmentMethod,
    deliveryOption,
    customer: {
      name: toCompactText(name),
      phone: toCompactText(phone),
      address: toCompactText(orderAddress),
      location: toCompactText(location),
      note: toCompactText(customerNote),
    },
    items: pricedItemsSnapshot,
    totals: {
      subtotal,
      deliveryFee,
      total,
    },
  };
  const requestFingerprint = sha256(JSON.stringify(requestFingerprintPayload));
  const idempotencyActorHash = sha256(orderActorKey);
  const requestTimeBucket = Math.floor(Date.now() / IDEMPOTENCY_DERIVED_WINDOW_MS);
  const idempotencyKey =
    normalizedHeaderIdempotencyKey.length > 0
      ? `hdr:${idempotencyActorHash}:${sha256(normalizedHeaderIdempotencyKey)}`
      : `drv:${idempotencyActorHash}:${requestTimeBucket}:${sha256(requestFingerprint)}`;

  const supabaseAdmin = getSupabaseAdminClient();
  if (!supabaseAdmin) {
    return NextResponse.json<OrderErrorResponse>(
      {
        error:
          "Supabase n'est pas configure pour l'ecriture. Ajoutez SUPABASE_SERVICE_ROLE_KEY.",
      },
      { status: 500 },
    );
  }

  const orderItemsPayload = lineItems.map((item) => ({
    product_id: item.productId,
    variant_id: item.variantId,
    selected_color: item.selectedColor,
    selected_size: item.selectedSize,
    product_name: item.productName,
    quantity: item.quantity,
    unit_price: item.unitPrice,
    line_total: item.lineTotal,
  }));
  const totalUnits = lineItems.reduce((sum, item) => sum + item.quantity, 0);
  console.info("[api/orders] Attempting direct order creation.", {
    actor: orderActorLogSuffix,
    itemCount: lineItems.length,
    totalUnits,
    fulfillmentMethod,
    deliveryOption,
    requiresAddress: requiresAddressForDeliveryOption(deliveryOption),
    hasCustomerNote: customerNote.length > 0,
    customerNoteLength: customerNote.length,
    subtotal,
    deliveryFee,
    total,
  });

  const rpcPayloadBase = {
    p_customer_name: name,
    p_customer_phone: phone,
    p_customer_address: orderAddress,
    p_customer_location: location,
    p_subtotal: subtotal,
    p_delivery_fee: deliveryFee,
    p_total: total,
    p_user_id: orderUserId,
    p_fulfillment_method: fulfillmentMethod,
    p_idempotency_key: idempotencyKey,
    p_request_fingerprint: requestFingerprint,
    p_items: orderItemsPayload,
  };

  let usedLegacyRpcSignature = false;
  let createOrderRpcResult = await supabaseAdmin.rpc("create_order_with_items_atomic", {
    ...rpcPayloadBase,
    p_customer_note: customerNote || null,
    p_delivery_option: deliveryOption,
  });

  if (createOrderRpcResult.error && isCreateOrderRpcSignatureMismatch(createOrderRpcResult.error)) {
    usedLegacyRpcSignature = true;
    console.warn("[api/orders] Retrying order RPC with legacy signature.", {
      actor: orderActorLogSuffix,
      reason: toRpcErrorLike(createOrderRpcResult.error).message ?? "signature_mismatch",
    });
    createOrderRpcResult = await supabaseAdmin.rpc(
      "create_order_with_items_atomic",
      rpcPayloadBase,
    );
  }

  const { data: createdOrderId, error: createOrderError } = createOrderRpcResult;

  if (createOrderError || !createdOrderId) {
    const rpcErrorInfo = toRpcErrorLike(createOrderError);
    console.error("[api/orders] Direct order creation failed.", {
      actor: orderActorLogSuffix,
      usedLegacyRpcSignature,
      code: rpcErrorInfo.code ?? null,
      message: rpcErrorInfo.message ?? null,
      details: rpcErrorInfo.details ?? null,
      hint: rpcErrorInfo.hint ?? null,
    });

    const normalizedMessage = (createOrderError?.message ?? "").toUpperCase();
    if (isCreateOrderRpcSignatureMismatch(createOrderError)) {
      return NextResponse.json<OrderErrorResponse>(
        {
          error:
            "Configuration commande en cours de synchronisation. Merci de reessayer dans quelques instants.",
        },
        { status: 503 },
      );
    }

    if (normalizedMessage.includes("AUTH_REQUIRED")) {
      if (!orderUserId) {
        return NextResponse.json<OrderErrorResponse>(
          {
            error:
              "Le mode invite est en cours d'activation cote serveur. Merci de reessayer dans quelques instants.",
          },
          { status: 503 },
        );
      }

      return NextResponse.json<OrderErrorResponse>(
        { error: "Connexion requise pour confirmer votre commande." },
        { status: 401 },
      );
    }

    if (normalizedMessage.includes("IDEMPOTENCY_KEY_REUSED_WITH_DIFFERENT_PAYLOAD")) {
      console.warn("[api/orders] Idempotency key payload mismatch.", {
        keyPrefix: idempotencyKey.slice(0, 28),
      });
      return NextResponse.json<OrderErrorResponse>(
        {
          error:
            "Cette tentative de commande utilise une cle d'idempotence deja liee a une autre demande.",
        },
        { status: 409 },
      );
    }

    if (normalizedMessage.includes("IDEMPOTENCY_KEY_IN_PROGRESS")) {
      return NextResponse.json<OrderErrorResponse>(
        {
          error:
            "Une commande identique est deja en cours de traitement. Merci de patienter quelques secondes.",
        },
        { status: 409 },
      );
    }

    if (normalizedMessage.includes("IDEMPOTENCY_KEY_")) {
      console.error("[api/orders] Idempotency guard failed in database.", {
        message: createOrderError?.message ?? "unknown",
      });
      return NextResponse.json<OrderErrorResponse>(
        {
          error:
            "La commande n'a pas pu etre finalisee de facon securisee. Merci de reessayer.",
        },
        { status: 503 },
      );
    }

    if (
      normalizedMessage.includes("INSUFFICIENT_STOCK") ||
      normalizedMessage.includes("INSUFFICIENT_VARIANT_STOCK")
    ) {
      return NextResponse.json<OrderErrorResponse>(
        {
          error:
            "Stock insuffisant pour finaliser la commande. Merci d'actualiser votre panier.",
        },
        { status: 400 },
      );
    }

    if (normalizedMessage.includes("INVALID_DELIVERY_OPTION")) {
      return NextResponse.json<OrderErrorResponse>(
        {
          error: "Option de livraison invalide. Merci de selectionner une option valide.",
        },
        { status: 400 },
      );
    }

    if (normalizedMessage.includes("INVALID_CUSTOMER_NOTE")) {
      return NextResponse.json<OrderErrorResponse>(
        {
          error: "La note de commande est invalide.",
          fieldErrors: {
            note: "La note de commande est invalide.",
          },
        },
        { status: 400 },
      );
    }

    return NextResponse.json<OrderErrorResponse>(
      { error: "La commande n'a pas pu etre finalisee. Merci de reessayer." },
      { status: 500 },
    );
  }

  return NextResponse.json({
    orderId: createdOrderId,
    subtotal,
    deliveryFee,
    total,
    fulfillmentMethod,
    deliveryOption,
  });
}
