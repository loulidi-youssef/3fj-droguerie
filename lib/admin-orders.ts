import { getSupabaseAdminClient } from "@/lib/supabase/admin";

export const DELIVERY_ORDER_STATUSES = [
  "new",
  "confirmed",
  "shipped",
  "delivered",
  "cancelled",
] as const;

export const PICKUP_ORDER_STATUSES = [
  "new",
  "confirmed",
  "preparing",
  "ready",
  "collected",
  "cancelled",
] as const;

export const ORDER_STATUSES = [
  "new",
  "confirmed",
  "preparing",
  "ready",
  "shipped",
  "collected",
  "delivered",
  "cancelled",
] as const;

export type OrderStatus = (typeof ORDER_STATUSES)[number];
export type FulfillmentMethod = "delivery" | "pickup";

export type AdminOrderItem = {
  id: number;
  product_id: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  line_total: number;
  selected_color: string | null;
  selected_size: string | null;
};

export type AdminOrder = {
  id: string;
  fulfillment_method: FulfillmentMethod | null;
  customer_name: string;
  customer_phone: string;
  customer_address: string;
  customer_location: string;
  subtotal: number;
  delivery_fee: number;
  total: number;
  status: OrderStatus;
  admin_note: string | null;
  created_at: string;
  updated_at: string | null;
  order_items: AdminOrderItem[];
};

export type AdminOrdersFilters = {
  status?: OrderStatus | "all" | null;
  dateFrom?: string | null;
  dateTo?: string | null;
};

export type AdminOrderQuickAction = {
  label: string;
  status: OrderStatus;
  intent: "primary" | "neutral" | "danger";
};

const ORDER_SELECT_WITH_NOTE =
  "id, fulfillment_method, customer_name, customer_phone, customer_address, customer_location, subtotal, delivery_fee, total, status, admin_note, created_at, updated_at, order_items(id, product_id, product_name, quantity, unit_price, line_total, selected_color, selected_size)";

const ORDER_SELECT_FALLBACK =
  "id, fulfillment_method, customer_name, customer_phone, customer_address, customer_location, subtotal, delivery_fee, total, status, created_at, updated_at, order_items(id, product_id, product_name, quantity, unit_price, line_total, selected_color, selected_size)";

export const ORDER_STATUS_LABEL: Record<OrderStatus, string> = {
  new: "Nouveau",
  confirmed: "Confirmee",
  preparing: "En preparation",
  ready: "Prete",
  shipped: "Expediee",
  collected: "Recuperee",
  delivered: "Livree",
  cancelled: "Annulee",
};

export const ORDER_STATUS_BADGE_CLASSNAME: Record<OrderStatus, string> = {
  new: "bg-sky-100 text-sky-700",
  confirmed: "bg-amber-100 text-amber-700",
  preparing: "bg-orange-100 text-orange-700",
  ready: "bg-indigo-100 text-indigo-700",
  shipped: "bg-cyan-100 text-cyan-700",
  collected: "bg-emerald-100 text-emerald-700",
  delivered: "bg-emerald-100 text-emerald-700",
  cancelled: "bg-rose-100 text-rose-700",
};

export const isOrderStatus = (value: string): value is OrderStatus => {
  return ORDER_STATUSES.includes(value as OrderStatus);
};

export const normalizeFulfillmentMethod = (value: unknown): FulfillmentMethod => {
  return value === "pickup" ? "pickup" : "delivery";
};

export const getAllowedStatusesForFulfillment = (
  fulfillmentMethod: FulfillmentMethod,
): OrderStatus[] => {
  return fulfillmentMethod === "pickup"
    ? [...PICKUP_ORDER_STATUSES]
    : [...DELIVERY_ORDER_STATUSES];
};

export const isStatusAllowedForFulfillment = (
  status: OrderStatus,
  fulfillmentMethod: FulfillmentMethod,
): boolean => {
  return getAllowedStatusesForFulfillment(fulfillmentMethod).includes(status);
};

const hasMissingAdminNoteColumn = (errorMessage: string | undefined): boolean => {
  const normalized = (errorMessage ?? "").toLowerCase();
  return normalized.includes("admin_note") && normalized.includes("column");
};

const applyDateFilters = <T extends { gte: (...args: string[]) => T; lt: (...args: string[]) => T }>(
  query: T,
  filters: AdminOrdersFilters,
): T => {
  const fromRaw = filters.dateFrom?.trim();
  if (fromRaw) {
    query.gte("created_at", `${fromRaw}T00:00:00.000Z`);
  }

  const toRaw = filters.dateTo?.trim();
  if (toRaw) {
    const date = new Date(`${toRaw}T00:00:00.000Z`);
    if (!Number.isNaN(date.getTime())) {
      date.setUTCDate(date.getUTCDate() + 1);
      query.lt("created_at", date.toISOString());
    }
  }

  return query;
};

const normalizeOrder = (order: Omit<AdminOrder, "admin_note"> & { admin_note?: string | null }): AdminOrder => {
  return {
    ...order,
    admin_note: typeof order.admin_note === "string" ? order.admin_note : null,
  };
};

const runOrdersQuery = async (
  filters: AdminOrdersFilters,
  useFallbackWithoutNote = false,
): Promise<AdminOrder[] | "retry-without-note"> => {
  const supabaseAdmin = getSupabaseAdminClient();
  if (!supabaseAdmin) {
    return [];
  }

  const selectedStatus = filters.status;
  const selectStatement = useFallbackWithoutNote ? ORDER_SELECT_FALLBACK : ORDER_SELECT_WITH_NOTE;

  let query = (supabaseAdmin.from("orders") as any)
    .select(selectStatement)
    .order("created_at", { ascending: false });

  if (selectedStatus && selectedStatus !== "all") {
    query = query.eq("status", selectedStatus);
  }

  query = applyDateFilters(query, filters);

  const { data, error } = await query;
  if (error) {
    if (!useFallbackWithoutNote && hasMissingAdminNoteColumn(error.message)) {
      return "retry-without-note";
    }
    return [];
  }

  if (!data) {
    return [];
  }

  return (data as Array<Omit<AdminOrder, "admin_note"> & { admin_note?: string | null }>).map(
    normalizeOrder,
  );
};

export const getAdminOrders = async (
  filters: AdminOrdersFilters = {},
): Promise<AdminOrder[]> => {
  const firstAttempt = await runOrdersQuery(filters);
  if (firstAttempt !== "retry-without-note") {
    return firstAttempt;
  }

  const fallback = await runOrdersQuery(filters, true);
  return fallback === "retry-without-note" ? [] : fallback;
};

export const getAdminOrderById = async (orderId: string): Promise<AdminOrder | null> => {
  const normalizedOrderId = orderId.trim();
  if (!normalizedOrderId) {
    return null;
  }

  const supabaseAdmin = getSupabaseAdminClient();
  if (!supabaseAdmin) {
    return null;
  }

  const { data, error } = await (supabaseAdmin
    .from("orders") as any)
    .select(ORDER_SELECT_WITH_NOTE)
    .eq("id", normalizedOrderId)
    .maybeSingle();

  if (error) {
    if (!hasMissingAdminNoteColumn(error.message)) {
      return null;
    }

    const fallback = await (supabaseAdmin
      .from("orders") as any)
      .select(ORDER_SELECT_FALLBACK)
      .eq("id", normalizedOrderId)
      .maybeSingle();

    if (fallback.error || !fallback.data) {
      return null;
    }

    return normalizeOrder(fallback.data as Omit<AdminOrder, "admin_note">);
  }

  if (!data) {
    return null;
  }

  return normalizeOrder(data as Omit<AdminOrder, "admin_note"> & { admin_note?: string | null });
};

export const updateAdminOrderStatus = async (
  orderId: string,
  status: OrderStatus,
): Promise<boolean> => {
  const supabaseAdmin = getSupabaseAdminClient();

  if (!supabaseAdmin) {
    return false;
  }

  const { error } = await supabaseAdmin.from("orders").update({ status }).eq("id", orderId);

  return !error;
};

export const updateAdminOrderNote = async (
  orderId: string,
  adminNote: string | null,
): Promise<boolean> => {
  const supabaseAdmin = getSupabaseAdminClient();

  if (!supabaseAdmin) {
    return false;
  }

  const normalizedNote = adminNote?.trim();
  const nextNote = normalizedNote ? normalizedNote : null;

  const { error } = await supabaseAdmin
    .from("orders")
    .update({ admin_note: nextNote })
    .eq("id", orderId);

  if (!error) {
    return true;
  }

  if (hasMissingAdminNoteColumn(error.message)) {
    return false;
  }

  return false;
};

export const getOrderQuickActions = (
  status: OrderStatus,
  fulfillmentMethod: FulfillmentMethod,
): AdminOrderQuickAction[] => {
  if (status === "cancelled" || status === "delivered" || status === "collected") {
    return [];
  }

  if (fulfillmentMethod === "delivery") {
    if (status === "new") {
      return [
        { label: "Confirmer", status: "confirmed", intent: "primary" },
        { label: "Annuler", status: "cancelled", intent: "danger" },
      ];
    }

    if (status === "confirmed") {
      return [
        { label: "Marquer expediee", status: "shipped", intent: "primary" },
        { label: "Annuler", status: "cancelled", intent: "danger" },
      ];
    }

    if (status === "shipped") {
      return [
        { label: "Marquer livree", status: "delivered", intent: "primary" },
      ];
    }

    return [];
  }

  if (status === "new") {
    return [
      { label: "Confirmer", status: "confirmed", intent: "primary" },
      { label: "Annuler", status: "cancelled", intent: "danger" },
    ];
  }

  if (status === "confirmed") {
    return [
      { label: "En preparation", status: "preparing", intent: "primary" },
      { label: "Annuler", status: "cancelled", intent: "danger" },
    ];
  }

  if (status === "preparing") {
    return [
      { label: "Marquer prete", status: "ready", intent: "primary" },
      { label: "Annuler", status: "cancelled", intent: "danger" },
    ];
  }

  if (status === "ready") {
    return [{ label: "Marquer recuperee", status: "collected", intent: "primary" }];
  }

  return [];
};
