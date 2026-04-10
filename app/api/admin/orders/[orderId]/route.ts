import { NextResponse } from "next/server";
import { requireAdminApiSession } from "@/lib/admin-api-auth";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

type AdminOrderByIdRouteContext = {
  params: {
    orderId: string;
  };
};

const ORDER_SELECT_WITH_EXTENDED_DETAILS =
  "id, created_at, status, fulfillment_method, delivery_option, customer_name, customer_phone, customer_address, customer_location, customer_note, subtotal, delivery_fee, total, order_items(id, product_name, quantity, unit_price, line_total)";
const ORDER_SELECT_FALLBACK =
  "id, created_at, status, fulfillment_method, customer_name, customer_phone, customer_address, customer_location, subtotal, delivery_fee, total, order_items(id, product_name, quantity, unit_price, line_total)";

const hasMissingExtendedColumns = (message: string | undefined): boolean => {
  const normalized = (message ?? "").toLowerCase();
  return (
    (normalized.includes("delivery_option") && normalized.includes("column")) ||
    (normalized.includes("customer_note") && normalized.includes("column"))
  );
};

const getSafeOrderId = (params: AdminOrderByIdRouteContext["params"]): string => {
  const orderId = params.orderId?.trim();
  return orderId || "";
};

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(_request: Request, context: AdminOrderByIdRouteContext) {
  const unauthorizedResponse = await requireAdminApiSession();
  if (unauthorizedResponse) {
    return unauthorizedResponse;
  }

  const orderId = getSafeOrderId(context.params);
  if (!orderId) {
    return NextResponse.json({ error: "Commande introuvable." }, { status: 400 });
  }

  const supabaseAdmin = getSupabaseAdminClient();
  if (!supabaseAdmin) {
    return NextResponse.json({ error: "Service indisponible." }, { status: 503 });
  }

  const primaryResult = await supabaseAdmin
    .from("orders")
    .select(ORDER_SELECT_WITH_EXTENDED_DETAILS)
    .eq("id", orderId)
    .maybeSingle();

  let data: unknown = primaryResult.data;
  let error = primaryResult.error;

  if (error && hasMissingExtendedColumns(error.message)) {
    const fallback = await supabaseAdmin
      .from("orders")
      .select(ORDER_SELECT_FALLBACK)
      .eq("id", orderId)
      .maybeSingle();

    data = fallback.data as unknown;
    error = fallback.error;
  }

  if (error) {
    return NextResponse.json({ error: "Impossible de recuperer la commande." }, { status: 500 });
  }

  if (!data) {
    return NextResponse.json({ error: "Commande introuvable." }, { status: 404 });
  }

  return NextResponse.json(
    { order: data },
    {
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
      },
    },
  );
}
