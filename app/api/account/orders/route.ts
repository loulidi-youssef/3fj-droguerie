import { NextRequest, NextResponse } from "next/server";
import {
  getOrderCancellationDeadline,
  isOrderCancellable,
} from "@/lib/order-cancellation";
import {
  RequestAuthError,
  getAuthenticatedCustomerContextFromRequest,
} from "@/lib/supabase/auth-user";

type ApiOrderItem = {
  id: number;
  product_name: string;
  quantity: number;
  unit_price: number;
  line_total: number;
};

type ApiOrderRow = {
  id: string;
  created_at: string;
  status:
    | "new"
    | "confirmed"
    | "preparing"
    | "ready"
    | "shipped"
    | "collected"
    | "delivered"
    | "cancelled";
  fulfillment_method: "delivery" | "pickup" | null;
  delivery_option?: "standard" | "express" | "pickup" | null;
  subtotal: number;
  delivery_fee: number;
  total: number;
  order_items: ApiOrderItem[];
};

export const dynamic = "force-dynamic";
export const revalidate = 0;

const ORDER_SELECT_WITH_DELIVERY_OPTION =
  "id, created_at, status, fulfillment_method, delivery_option, subtotal, delivery_fee, total, order_items(id, product_name, quantity, unit_price, line_total)";
const ORDER_SELECT_FALLBACK =
  "id, created_at, status, fulfillment_method, subtotal, delivery_fee, total, order_items(id, product_name, quantity, unit_price, line_total)";

const hasMissingDeliveryOptionColumn = (message: string | undefined): boolean => {
  const normalized = (message ?? "").toLowerCase();
  return normalized.includes("delivery_option") && normalized.includes("column");
};

const CANCELLATION_EXPIRED_MESSAGE = "Le délai d'annulation est dépassé.";

export async function GET(request: NextRequest) {
  let authenticatedContext: Awaited<
    ReturnType<typeof getAuthenticatedCustomerContextFromRequest>
  >;
  try {
    authenticatedContext = await getAuthenticatedCustomerContextFromRequest(request);
  } catch (error) {
    if (error instanceof RequestAuthError) {
      return NextResponse.json(
        { error: "Session invalide. Merci de vous reconnecter." },
        { status: 401 },
      );
    }
    throw error;
  }

  if (!authenticatedContext) {
    return NextResponse.json({ error: "Non authentifie." }, { status: 401 });
  }

  const primaryResult = await authenticatedContext.supabase
    .from("orders")
    .select(ORDER_SELECT_WITH_DELIVERY_OPTION)
    .order("created_at", { ascending: false });

  let data: unknown = primaryResult.data;
  let error = primaryResult.error;

  if (error && hasMissingDeliveryOptionColumn(error.message)) {
    const fallback = await authenticatedContext.supabase
      .from("orders")
      .select(ORDER_SELECT_FALLBACK)
      .order("created_at", { ascending: false });

    data = fallback.data as unknown;
    error = fallback.error;
  }

  if (error || !data) {
    return NextResponse.json(
      { error: "Impossible de recuperer vos commandes." },
      { status: 500 },
    );
  }

  const orders = (data as ApiOrderRow[]).map((order) => {
    const canCancel = isOrderCancellable({
      status: order.status,
      createdAt: order.created_at,
    });
    const cancellationDeadline = getOrderCancellationDeadline(order.created_at);

    return {
      ...order,
      fulfillmentMethod: order.fulfillment_method === "pickup" ? "pickup" : "delivery",
      deliveryOption:
        order.delivery_option === "express" || order.delivery_option === "pickup"
          ? order.delivery_option
          : "standard",
      canCancel,
      cancellationDeadline: cancellationDeadline?.toISOString() ?? null,
      cannotCancelMessage: canCancel ? null : CANCELLATION_EXPIRED_MESSAGE,
    };
  });

  return NextResponse.json(
    { orders },
    {
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
      },
    },
  );
}
