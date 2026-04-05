import { getSupabaseAdminClient } from "@/lib/supabase/admin";

export const DELIVERY_ORDER_STATUSES = [
  "new",
  "confirmed",
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
  "collected",
  "delivered",
  "cancelled",
] as const;

export type OrderStatus = (typeof ORDER_STATUSES)[number];
export type FulfillmentMethod = "delivery" | "pickup";

export type AdminOrderItem = {
  id: number;
  product_name: string;
  quantity: number;
  unit_price: number;
  line_total: number;
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
  created_at: string;
  order_items: AdminOrderItem[];
};

export const isOrderStatus = (value: string): value is OrderStatus => {
  return ORDER_STATUSES.includes(value as OrderStatus);
};

export const normalizeFulfillmentMethod = (
  value: unknown,
): FulfillmentMethod => {
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

export const getAdminOrders = async (): Promise<AdminOrder[]> => {
  const supabaseAdmin = getSupabaseAdminClient();

  if (!supabaseAdmin) {
    return [];
  }

  const { data, error } = await supabaseAdmin
    .from("orders")
    .select(
      "id, fulfillment_method, customer_name, customer_phone, customer_address, customer_location, subtotal, delivery_fee, total, status, created_at, order_items(id, product_name, quantity, unit_price, line_total)",
    )
    .order("created_at", { ascending: false });

  if (error || !data) {
    return [];
  }

  return data as AdminOrder[];
};

export const updateAdminOrderStatus = async (
  orderId: string,
  status: OrderStatus,
): Promise<boolean> => {
  const supabaseAdmin = getSupabaseAdminClient();

  if (!supabaseAdmin) {
    return false;
  }

  const { error } = await supabaseAdmin
    .from("orders")
    .update({ status })
    .eq("id", orderId);

  return !error;
};
