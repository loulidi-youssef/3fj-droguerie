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
    | "collected"
    | "delivered"
    | "cancelled";
  fulfillment_method: "delivery" | "pickup" | null;
  customer_name: string;
  customer_phone: string;
  customer_address: string;
  customer_location: string;
  subtotal: number;
  delivery_fee: number;
  total: number;
  order_items: ApiOrderItem[];
};

type RouteContext = {
  params: {
    orderId: string;
  };
};

export const dynamic = "force-dynamic";
export const revalidate = 0;

const CANCELLATION_EXPIRED_MESSAGE = "Le délai d'annulation est dépassé.";

export async function GET(request: NextRequest, { params }: RouteContext) {
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

  const orderId = params.orderId?.trim();
  if (!orderId) {
    return NextResponse.json({ error: "Commande introuvable." }, { status: 400 });
  }

  const { data, error } = await authenticatedContext.supabase
    .from("orders")
    .select(
      "id, created_at, status, fulfillment_method, customer_name, customer_phone, customer_address, customer_location, subtotal, delivery_fee, total, order_items(id, product_name, quantity, unit_price, line_total)",
    )
    .eq("id", orderId)
    .maybeSingle();

  if (error) {
    return NextResponse.json(
      { error: "Impossible de recuperer la commande." },
      { status: 500 },
    );
  }

  if (!data) {
    return NextResponse.json({ error: "Commande introuvable." }, { status: 404 });
  }

  const order = data as ApiOrderRow;
  const canCancel = isOrderCancellable({
    status: order.status,
    createdAt: order.created_at,
  });
  const cancellationDeadline = getOrderCancellationDeadline(order.created_at);

  return NextResponse.json(
    {
      order: {
        ...order,
        fulfillmentMethod: order.fulfillment_method === "pickup" ? "pickup" : "delivery",
        paymentMethod: null,
        canCancel,
        cancellationDeadline: cancellationDeadline?.toISOString() ?? null,
        cannotCancelMessage: canCancel ? null : CANCELLATION_EXPIRED_MESSAGE,
      },
    },
    {
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
      },
    },
  );
}
