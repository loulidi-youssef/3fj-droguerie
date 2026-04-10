const asRecord = (value: unknown): Record<string, unknown> | null => {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }
  return value as Record<string, unknown>;
};

const toStringOrDefault = (value: unknown, fallback = ""): string => {
  if (typeof value !== "string") {
    return fallback;
  }
  return value;
};

const toNonEmptyStringOrDefault = (value: unknown, fallback = ""): string => {
  const candidate = toStringOrDefault(value, "").trim();
  return candidate.length > 0 ? candidate : fallback;
};

const toFiniteNumberOrDefault = (value: unknown, fallback = 0): number => {
  const candidate = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(candidate)) {
    return fallback;
  }
  return candidate;
};

export type ReceiptOrderStatus =
  | "new"
  | "confirmed"
  | "preparing"
  | "ready"
  | "shipped"
  | "collected"
  | "delivered"
  | "cancelled";

export type ReceiptDeliveryOption = "standard" | "express" | "pickup";
export type ReceiptFulfillmentMethod = "delivery" | "pickup";

export type NormalizedReceiptOrderItem = {
  id: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
};

export type NormalizedReceiptOrder = {
  id: string;
  createdAt: string;
  status: ReceiptOrderStatus;
  fulfillmentMethod: ReceiptFulfillmentMethod;
  deliveryOption: ReceiptDeliveryOption;
  customerName: string;
  customerPhone: string;
  customerAddress: string;
  customerLocation: string;
  customerNote: string;
  subtotal: number;
  deliveryFee: number;
  total: number;
  items: NormalizedReceiptOrderItem[];
};

export const RECEIPT_COMPANY = {
  name: "3FJ Droguerie",
  activity: "Materiaux de construction et droguerie",
  city: "Fes",
  phone: "06XXXXXXXX",
  whatsapp: "06XXXXXXXX",
} as const;

export const PAYMENT_LABEL = "Paiement a la livraison";

export const DELIVERY_OPTION_LABELS: Record<ReceiptDeliveryOption, string> = {
  standard: "Livraison Standard",
  express: "Livraison Express",
  pickup: "Retrait magasin",
};

export const STATUS_LABELS: Record<ReceiptOrderStatus, string> = {
  new: "Nouvelle",
  confirmed: "Confirmee",
  preparing: "En preparation",
  ready: "Prete",
  shipped: "Expediee",
  collected: "Recuperee",
  delivered: "Livree",
  cancelled: "Annulee",
};

const normalizeDeliveryOption = (value: unknown): ReceiptDeliveryOption => {
  const normalized = toNonEmptyStringOrDefault(value, "standard").toLowerCase();
  if (normalized === "express") {
    return "express";
  }
  if (normalized === "pickup") {
    return "pickup";
  }
  return "standard";
};

const normalizeFulfillmentMethod = (
  value: unknown,
  deliveryOption: ReceiptDeliveryOption,
): ReceiptFulfillmentMethod => {
  const normalized = toNonEmptyStringOrDefault(value, "").toLowerCase();
  if (normalized === "pickup") {
    return "pickup";
  }
  if (normalized === "delivery") {
    return "delivery";
  }
  return deliveryOption === "pickup" ? "pickup" : "delivery";
};

const normalizeStatus = (value: unknown): ReceiptOrderStatus => {
  const normalized = toNonEmptyStringOrDefault(value, "new").toLowerCase();
  if (
    normalized === "new" ||
    normalized === "confirmed" ||
    normalized === "preparing" ||
    normalized === "ready" ||
    normalized === "shipped" ||
    normalized === "collected" ||
    normalized === "delivered" ||
    normalized === "cancelled"
  ) {
    return normalized;
  }
  return "new";
};

const normalizeOrderItems = (value: unknown): NormalizedReceiptOrderItem[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.map((entry, index) => {
    const item = asRecord(entry);
    const quantity = Math.max(0, Math.floor(toFiniteNumberOrDefault(item?.quantity, 0)));
    const unitPrice = toFiniteNumberOrDefault(item?.unit_price ?? item?.unitPrice, 0);
    const lineTotalFromApi = toFiniteNumberOrDefault(
      item?.line_total ?? item?.lineTotal,
      Number.NaN,
    );
    const lineTotal = Number.isFinite(lineTotalFromApi)
      ? lineTotalFromApi
      : unitPrice * quantity;

    return {
      id: toNonEmptyStringOrDefault(item?.id, `line-${index + 1}`),
      productName: toNonEmptyStringOrDefault(item?.product_name ?? item?.productName, "Produit"),
      quantity,
      unitPrice,
      lineTotal,
    };
  });
};

export const normalizeOrderForReceipt = (
  value: unknown,
  fallbackOrderId = "",
): NormalizedReceiptOrder | null => {
  const rawOrder = asRecord(value);
  if (!rawOrder) {
    return null;
  }

  const deliveryOption = normalizeDeliveryOption(
    rawOrder.deliveryOption ?? rawOrder.delivery_option,
  );
  const normalizedId = toNonEmptyStringOrDefault(rawOrder.id, fallbackOrderId);
  if (!normalizedId) {
    return null;
  }

  return {
    id: normalizedId,
    createdAt: toNonEmptyStringOrDefault(rawOrder.createdAt ?? rawOrder.created_at, ""),
    status: normalizeStatus(rawOrder.status),
    deliveryOption,
    fulfillmentMethod: normalizeFulfillmentMethod(
      rawOrder.fulfillmentMethod ?? rawOrder.fulfillment_method,
      deliveryOption,
    ),
    customerName: toStringOrDefault(rawOrder.customerName ?? rawOrder.customer_name, "").trim(),
    customerPhone: toStringOrDefault(rawOrder.customerPhone ?? rawOrder.customer_phone, "").trim(),
    customerAddress: toStringOrDefault(
      rawOrder.customerAddress ?? rawOrder.customer_address,
      "",
    ).trim(),
    customerLocation: toStringOrDefault(
      rawOrder.customerLocation ?? rawOrder.customer_location,
      "",
    ).trim(),
    customerNote: toStringOrDefault(rawOrder.customerNote ?? rawOrder.customer_note, "").trim(),
    subtotal: toFiniteNumberOrDefault(rawOrder.subtotal, 0),
    deliveryFee: toFiniteNumberOrDefault(rawOrder.deliveryFee ?? rawOrder.delivery_fee, 0),
    total: toFiniteNumberOrDefault(rawOrder.total, 0),
    items: normalizeOrderItems(rawOrder.items ?? rawOrder.order_items),
  };
};

export const buildReceiptPdfOrderPayload = (order: NormalizedReceiptOrder) => {
  return {
    id: order.id,
    createdAt: order.createdAt,
    deliveryOptionLabel: DELIVERY_OPTION_LABELS[order.deliveryOption],
    paymentLabel: PAYMENT_LABEL,
    customerName: order.customerName,
    customerPhone: order.customerPhone,
    customerAddress: order.fulfillmentMethod === "pickup" ? "" : order.customerAddress,
    customerNote: order.customerNote,
    subtotal: order.subtotal,
    deliveryFee: order.deliveryFee,
    total: order.total,
    items: order.items.map((item) => ({
      productName: item.productName,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      lineTotal: item.lineTotal,
    })),
  };
};
