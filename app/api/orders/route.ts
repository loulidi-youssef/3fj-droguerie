import { NextRequest, NextResponse } from "next/server";
import { validateCheckoutCustomer } from "@/lib/checkout-validation";
import { getDeliveryCost } from "@/lib/delivery";
import { getProductsByIds } from "@/lib/products";
import { getAuthenticatedCustomerFromRequest } from "@/lib/supabase/auth-user";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

type IncomingOrderItem = {
  productId?: string;
  quantity?: number;
  variantId?: string;
  selectedColor?: string;
  selectedSize?: string;
};

type IncomingOrderBody = {
  customer?: {
    name?: string;
    phone?: string;
    address?: string;
    location?: string;
  };
  items?: IncomingOrderItem[];
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
  selectedColor: string | null;
  selectedSize: string | null;
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

const MAX_ORDER_REQUEST_BYTES = 20_000;
const MAX_DISTINCT_ITEMS_PER_ORDER = 30;
const MAX_QUANTITY_PER_PRODUCT = 20;
const MAX_TOTAL_UNITS_PER_ORDER = 200;
const ORDER_RATE_LIMIT_WINDOW_MS = 60_000;
const ORDER_RATE_LIMIT_MAX_REQUESTS = 12;
const RATE_LIMIT_SWEEP_SIZE = 2_000;

const orderRateLimitStore = new Map<string, { count: number; expiresAt: number }>();

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
    const selectedColor = toNullableString(item.selectedColor);
    const selectedSize = toNullableString(item.selectedSize);

    const quantity = Number(item.quantity ?? 0);
    if (!Number.isInteger(quantity) || quantity <= 0) {
      return { ok: false, error: "Quantite invalide. Merci de corriger votre panier." };
    }

    const compositeKey = [
      productId,
      variantId ?? "base",
      selectedColor ?? "",
      selectedSize ?? "",
    ].join("::");

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
      selectedColor,
      selectedSize,
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

  let body: IncomingOrderBody;

  try {
    body = (await request.json()) as IncomingOrderBody;
  } catch {
    return NextResponse.json<OrderErrorResponse>(
      { error: "Donnees invalides. Merci de reessayer." },
      { status: 400 },
    );
  }

  const customerValidation = validateCheckoutCustomer({
    name: body.customer?.name ?? "",
    phone: body.customer?.phone ?? "",
    address: body.customer?.address ?? "",
    location: body.customer?.location ?? "",
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

    const color = selectedVariant?.color ?? item.selectedColor;
    const size = selectedVariant?.size ?? item.selectedSize;
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
      productName,
      quantity: item.quantity,
      unitPrice,
      lineTotal: unitPrice * item.quantity,
    });
  }

  const subtotal = lineItems.reduce((sum, item) => sum + item.lineTotal, 0);
  const deliveryFee = getDeliveryCost(subtotal);
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

  const authenticatedCustomer = await getAuthenticatedCustomerFromRequest(request);

  const baseOrderPayload = {
    customer_name: name,
    customer_phone: phone,
    customer_address: address,
    customer_location: location,
    subtotal,
    delivery_fee: deliveryFee,
    total,
  };

  const payloadWithUser = authenticatedCustomer
    ? { ...baseOrderPayload, user_id: authenticatedCustomer.id }
    : baseOrderPayload;

  let insertedOrder: { id: string } | null = null;
  let orderError: { message?: string } | null = null;

  const firstInsertAttempt = await supabaseAdmin
    .from("orders")
    .insert(payloadWithUser)
    .select("id")
    .single();

  insertedOrder = firstInsertAttempt.data as { id: string } | null;
  orderError = firstInsertAttempt.error;

  const shouldRetryWithoutUser =
    Boolean(authenticatedCustomer) &&
    Boolean(orderError?.message?.includes("column \"user_id\" of relation \"orders\" does not exist"));

  if (shouldRetryWithoutUser) {
    const fallbackInsert = await supabaseAdmin
      .from("orders")
      .insert(baseOrderPayload)
      .select("id")
      .single();

    insertedOrder = fallbackInsert.data as { id: string } | null;
    orderError = fallbackInsert.error;
  }

  if (orderError || !insertedOrder) {
    return NextResponse.json<OrderErrorResponse>(
      { error: "Impossible d'enregistrer la commande pour le moment." },
      { status: 500 },
    );
  }

  const orderItemsPayload = lineItems.map((item) => ({
    order_id: insertedOrder.id,
    product_id: item.productId,
    product_name: item.productName,
    quantity: item.quantity,
    unit_price: item.unitPrice,
    line_total: item.lineTotal,
  }));

  const { error: orderItemsError } = await supabaseAdmin
    .from("order_items")
    .insert(orderItemsPayload);

  if (orderItemsError) {
    await supabaseAdmin.from("orders").delete().eq("id", insertedOrder.id);

    return NextResponse.json<OrderErrorResponse>(
      { error: "La commande n'a pas pu etre finalisee. Merci de reessayer." },
      { status: 500 },
    );
  }

  return NextResponse.json({
    orderId: insertedOrder.id,
    subtotal,
    deliveryFee,
    total,
  });
}
