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
  status: "new" | "confirmed" | "delivered" | "cancelled";
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

export async function GET(request: NextRequest, { params }: RouteContext) {
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

  const orderId = params.orderId?.trim();
  if (!orderId) {
    return NextResponse.json({ error: "Commande introuvable." }, { status: 400 });
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
      "id, created_at, status, customer_name, customer_phone, customer_address, customer_location, subtotal, delivery_fee, total, order_items(id, product_name, quantity, unit_price, line_total)",
    )
    .eq("id", orderId)
    .eq("user_id", authenticatedCustomer.id)
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

  return NextResponse.json({
    order: {
      ...order,
      paymentMethod: null,
      canCancel,
      cancellationDeadline: cancellationDeadline?.toISOString() ?? null,
      cannotCancelMessage: canCancel
        ? null
        : "Annulation possible uniquement pendant les 2 premieres heures et pour une commande nouvelle.",
    },
  });
}
