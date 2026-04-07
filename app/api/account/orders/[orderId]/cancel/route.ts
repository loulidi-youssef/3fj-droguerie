import { NextRequest, NextResponse } from "next/server";
import { enforceRouteRateLimit } from "@/lib/api-rate-limit";
import {
  ORDER_CANCELLATION_WINDOW_MS,
  isOrderCancellable,
} from "@/lib/order-cancellation";
import {
  RequestAuthError,
  getAuthenticatedCustomerContextFromRequest,
} from "@/lib/supabase/auth-user";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

type OrderRow = {
  id: string;
  status:
    | "new"
    | "confirmed"
    | "preparing"
    | "ready"
    | "shipped"
    | "collected"
    | "delivered"
    | "cancelled";
  created_at: string;
};

type RouteContext = {
  params: {
    orderId: string;
  };
};

const CANCELLATION_EXPIRED_MESSAGE = "Le délai d'annulation est dépassé.";

export async function POST(request: NextRequest, { params }: RouteContext) {
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

  const rateLimit = await enforceRouteRateLimit({
    scope: "account:orders:cancel",
    identifier: `user:${authenticatedContext.customer.id}`,
    limit: 8,
    windowMs: 60_000,
  });
  if (!rateLimit.ok) {
    return rateLimit.response;
  }

  const orderId = params.orderId?.trim();
  if (!orderId) {
    return NextResponse.json({ error: "Commande introuvable." }, { status: 400 });
  }

  const { data: orderData, error: orderError } = await authenticatedContext.supabase
    .from("orders")
    .select("id, status, created_at")
    .eq("id", orderId)
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
      { error: CANCELLATION_EXPIRED_MESSAGE },
      { status: 400 },
    );
  }

  const cancellationBoundaryIso = new Date(
    Date.now() - ORDER_CANCELLATION_WINDOW_MS,
  ).toISOString();

  const supabaseAdmin = getSupabaseAdminClient();
  if (!supabaseAdmin) {
    return NextResponse.json(
      { error: "Annulation impossible pour le moment." },
      { status: 500 },
    );
  }

  const { data: cancelledOrder, error: cancelError } = await supabaseAdmin.rpc(
    "cancel_order_and_restore_stock_atomic",
    {
      p_order_id: orderId,
      p_user_id: authenticatedContext.customer.id,
      p_cancellation_boundary: cancellationBoundaryIso,
      p_allowed_statuses: ["new"],
    },
  );

  if (cancelError) {
    return NextResponse.json(
      { error: "Annulation impossible pour le moment." },
      { status: 500 },
    );
  }

  if (!cancelledOrder) {
    return NextResponse.json(
      { error: CANCELLATION_EXPIRED_MESSAGE },
      { status: 400 },
    );
  }

  return NextResponse.json({ ok: true });
}
