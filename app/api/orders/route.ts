import { NextRequest, NextResponse } from "next/server";
import { validateCheckoutCustomer } from "@/lib/checkout-validation";
import { getDeliveryCost } from "@/lib/delivery";
import { getProductsByIds } from "@/lib/products";
import {
  RequestAuthError,
  getAuthenticatedCustomerFromRequestStrict,
} from "@/lib/supabase/auth-user";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

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
  };
  items?: IncomingOrderItem[];
  fulfillmentMethod?: string;
};

type OrderErrorResponse = {
  error: string;
  fieldErrors?: {
    name?: string;
    phone?: string;
    address?: string;
    location?: string;
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

type RateLimitResult = {
  allowed: boolean;
  retryAfterSeconds: number;
};

type FulfillmentMethod = "delivery" | "pickup";

const MAX_ORDER_REQUEST_BYTES = 20_000;
const MAX_DISTINCT_ITEMS_PER_ORDER = 30;
const MAX_QUANTITY_PER_PRODUCT = 20;
const MAX_TOTAL_UNITS_PER_ORDER = 200;
const ORDER_RATE_LIMIT_WINDOW_MS = 60_000;
const ORDER_RATE_LIMIT_MAX_REQUESTS = 12;
const RATE_LIMIT_SWEEP_SIZE = 2_000;

const orderRateLimitStore = new Map<string, { count: number; expiresAt: number }>();

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

    if (nextQuantity > MAX_QUANTITY_PER_PRODUCT) {
      return {
        ok: false,
        error: `La quantite maximale par produit est ${MAX_QUANTITY_PER_PRODUCT}.`,
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

const getRateLimitKey = (request: NextRequest): string => {
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) {
    const firstIp = forwardedFor.split(",")[0]?.trim();
    if (firstIp) {
      return firstIp;
    }
  }

  const realIp = request.headers.get("x-real-ip")?.trim();
  if (realIp) {
    return realIp;
  }

  const forwarded = request.headers.get("forwarded");
  if (forwarded) {
    const match = forwarded.match(/for="?([^;,"]+)"?/i);
    if (match?.[1]) {
      return match[1];
    }
  }

  const userAgent = request.headers.get("user-agent")?.trim() || "unknown-agent";
  return `ua:${userAgent.slice(0, 120)}`;
};

const consumeRateLimit = (key: string): RateLimitResult => {
  const now = Date.now();

  if (orderRateLimitStore.size > RATE_LIMIT_SWEEP_SIZE) {
    for (const [candidateKey, value] of orderRateLimitStore.entries()) {
      if (value.expiresAt <= now) {
        orderRateLimitStore.delete(candidateKey);
      }
    }
  }

  const currentEntry = orderRateLimitStore.get(key);

  if (!currentEntry || currentEntry.expiresAt <= now) {
    orderRateLimitStore.set(key, {
      count: 1,
      expiresAt: now + ORDER_RATE_LIMIT_WINDOW_MS,
    });
    return { allowed: true, retryAfterSeconds: 0 };
  }

  currentEntry.count += 1;

  if (currentEntry.count > ORDER_RATE_LIMIT_MAX_REQUESTS) {
    return {
      allowed: false,
      retryAfterSeconds: Math.max(1, Math.ceil((currentEntry.expiresAt - now) / 1000)),
    };
  }

  return { allowed: true, retryAfterSeconds: 0 };
};

export async function POST(request: NextRequest) {
  const contentLength = Number(request.headers.get("content-length") ?? "0");
  if (Number.isFinite(contentLength) && contentLength > MAX_ORDER_REQUEST_BYTES) {
    return NextResponse.json<OrderErrorResponse>(
      { error: "Requete trop volumineuse. Merci de reessayer avec un panier plus simple." },
      { status: 413 },
    );
  }

  const rateLimitResult = consumeRateLimit(getRateLimitKey(request));
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

  let authenticatedCustomer: { id: string; email: string | null };
  try {
    authenticatedCustomer = await getAuthenticatedCustomerFromRequestStrict(request);
  } catch (error) {
    const errorCode =
      error instanceof RequestAuthError ? error.code : "unknown_auth_error";
    const errorMessage = error instanceof Error ? error.message : String(error);

    console.warn("[api/orders] Auth validation failed.", {
      code: errorCode,
      message: errorMessage,
    });

    return NextResponse.json<OrderErrorResponse>(
      { error: "Connexion requise ou session invalide. Merci de vous reconnecter." },
      { status: 401 },
    );
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

  const fulfillmentMethod = normalizeFulfillmentMethod(body.fulfillmentMethod);
  if (!fulfillmentMethod) {
    return NextResponse.json<OrderErrorResponse>(
      { error: "Choisissez un mode de reception valide (livraison ou retrait)." },
      { status: 400 },
    );
  }

  const customerValidation = validateCheckoutCustomer({
    name: body.customer?.name ?? "",
    phone: body.customer?.phone ?? "",
    address: body.customer?.address ?? "",
    location: body.customer?.location ?? "",
  }, {
    requireAddress: fulfillmentMethod === "delivery",
  });

  if (!customerValidation.isValid) {
    const firstError =
      customerValidation.errors.name ||
      customerValidation.errors.phone ||
      customerValidation.errors.address ||
      customerValidation.errors.location ||
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
  const orderAddress =
    fulfillmentMethod === "pickup" ? "Retrait en magasin" : address;

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
  const products = await getProductsByIds(productIds);
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

    const unitPrice = selectedVariant ? selectedVariant.price : product.price;
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
      lineTotal: unitPrice * item.quantity,
    });
  }

  const subtotal = lineItems.reduce((sum, item) => sum + item.lineTotal, 0);
  const deliveryFee = fulfillmentMethod === "pickup" ? 0 : getDeliveryCost(subtotal);
  const total = subtotal + deliveryFee;

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

  const orderUserId = authenticatedCustomer.id?.trim();
  if (!orderUserId) {
    console.error("[api/orders] Missing authenticated user id before order creation.");
    return NextResponse.json<OrderErrorResponse>(
      { error: "Impossible de lier la commande a votre compte. Merci de vous reconnecter." },
      { status: 401 },
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

  const { data: createdOrderId, error: createOrderError } = await supabaseAdmin.rpc(
    "create_order_with_items_atomic",
    {
      p_customer_name: name,
      p_customer_phone: phone,
      p_customer_address: orderAddress,
      p_customer_location: location,
      p_subtotal: subtotal,
      p_delivery_fee: deliveryFee,
      p_total: total,
      p_user_id: orderUserId,
      p_fulfillment_method: fulfillmentMethod,
      p_items: orderItemsPayload,
    },
  );

  if (createOrderError || !createdOrderId) {
    const normalizedMessage = (createOrderError?.message ?? "").toUpperCase();
    if (normalizedMessage.includes("AUTH_REQUIRED")) {
      console.error("[api/orders] Database rejected order without linked user_id.");
      return NextResponse.json<OrderErrorResponse>(
        { error: "Connexion requise pour confirmer votre commande." },
        { status: 401 },
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
  });
}
