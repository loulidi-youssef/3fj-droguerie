import { NextRequest, NextResponse } from "next/server";
import { isOrderCancellable } from "@/lib/order-cancellation";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  RequestAuthError,
  getAuthenticatedCustomerFromRequest,
} from "@/lib/supabase/auth-user";

type OrderRow = {
  id: string;
  status: "new" | "confirmed" | "delivered" | "cancelled";
  created_at: string;
};

type RouteContext = {
  params: {
    orderId: string;
  };
};

export async function POST(request: NextRequest, { params }: RouteContext) {
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

  const { data: orderData, error: orderError } = await supabaseAdmin
    .from("orders")
    .select("id, status, created_at")
    .eq("id", orderId)
    .eq("user_id", authenticatedCustomer.id)
    .maybeSingle();

  if (orderError) {
    return NextResponse.json(
      { error: "Impossible de verifier la commande." },
      { status: 500 },
    );
  }

  if (!orderData) {
    return NextResponse.json({ error: "Commande introuvable." }, { status: 404 });
  }

  const order = orderData as OrderRow;
  const canCancel = isOrderCancellable({
    status: order.status,
    createdAt: order.created_at,
  });

  if (!canCancel) {
    return NextResponse.json(
      { error: "Vous ne pouvez plus annuler cette commande" },
      { status: 400 },
    );
  }

  const { error: cancelError } = await supabaseAdmin
    .from("orders")
    .update({ status: "cancelled" })
    .eq("id", orderId)
    .eq("user_id", authenticatedCustomer.id)
    .eq("status", "new");

  if (cancelError) {
    return NextResponse.json(
      { error: "Annulation impossible pour le moment." },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true });
}
