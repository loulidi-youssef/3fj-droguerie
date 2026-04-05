import { NextRequest, NextResponse } from "next/server";
import {
  getOrderCancellationDeadline,
  isOrderCancellable,
} from "@/lib/order-cancellation";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  RequestAuthError,
  getAuthenticatedCustomerFromRequest,
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
  subtotal: number;
  delivery_fee: number;
  total: number;
  order_items: ApiOrderItem[];
};

export const dynamic = "force-dynamic";
export const revalidate = 0;

const CANCELLATION_EXPIRED_MESSAGE = "Le délai d'annulation est dépassé.";

export async function GET(request: NextRequest) {
  let authenticatedCustomer: { id: string; email: string | null } | null;
  try {
    authenticatedCustomer = await getAuthenticatedCustomerFromRequest(request);
  } catch (error) {
    if (error instanceof RequestAuthError) {
      return NextResponse.json(
        { error: "Session invalide. Merci de vous reconnecter." },
        { status: 401 },
      );
    }
    throw error;
  }

  if (!authenticatedCustomer) {
    return NextResponse.json({ error: "Non authentifie." }, { status: 401 });
  }

  const supabaseAdmin = getSupabaseAdminClient();
  if (!supabaseAdmin) {
    return NextResponse.json(
      { error: "Supabase admin non configure." },
      { status: 500 },
    );
  }

  const { data, error } = await supabaseAdmin
    .from("orders")
    .select(
      "id, created_at, status, fulfillment_method, subtotal, delivery_fee, total, order_items(id, product_name, quantity, unit_price, line_total)",
    )
    .eq("user_id", authenticatedCustomer.id)
    .order("created_at", { ascending: false });

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
