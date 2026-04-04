import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { getAuthenticatedCustomerFromRequest } from "@/lib/supabase/auth-user";

type RouteContext = {
  params: {
    productId: string;
  };
};

const FAVORITES_TABLE_MISSING_MESSAGE =
  "La table favorites est manquante. Lancez supabase/migrations/2026-04-04-create-favorites-table.sql.";

const resolveProductId = (value: string | undefined): string => {
  return value?.trim() ?? "";
};

type DbErrorLike = {
  code?: string;
  message?: string;
  details?: string;
  hint?: string;
};

const mapFavoriteDatabaseError = (
  action: "add" | "remove",
  error: DbErrorLike,
): string => {
  if (error.code === "42P01" || error.message?.includes('relation "favorites" does not exist')) {
    return FAVORITES_TABLE_MISSING_MESSAGE;
  }

  if (error.code === "23503") {
    return "Produit introuvable dans la base de donnees.";
  }

  if (action === "add") {
    return "Impossible d'ajouter aux favoris.";
  }

  return "Impossible de retirer des favoris.";
};

export async function POST(request: NextRequest, { params }: RouteContext) {
  const authenticatedCustomer = await getAuthenticatedCustomerFromRequest(request);

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

  const productId = resolveProductId(params.productId);
  if (!productId) {
    return NextResponse.json({ error: "Produit introuvable." }, { status: 400 });
  }

  const { data: productRow, error: productError } = await supabaseAdmin
    .from("products")
    .select("id")
    .eq("id", productId)
    .maybeSingle();

  if (productError) {
    console.error("[favorites:add:product-check]", {
      code: productError.code,
      message: productError.message,
      details: productError.details,
      hint: productError.hint,
      productId,
    });

    return NextResponse.json({ error: "Verification produit impossible." }, { status: 500 });
  }

  if (!productRow) {
    return NextResponse.json({ error: "Produit introuvable." }, { status: 404 });
  }

  const { error } = await supabaseAdmin.from("favorites").insert({
    user_id: authenticatedCustomer.id,
    product_id: productId,
  });

  if (error) {
    if (error.message.includes("duplicate key value")) {
      return NextResponse.json({ ok: true });
    }

    console.error("[favorites:add]", {
      code: error.code,
      message: error.message,
      details: error.details,
      hint: error.hint,
      productId,
      userId: authenticatedCustomer.id,
    });

    return NextResponse.json(
      { error: mapFavoriteDatabaseError("add", error) },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(request: NextRequest, { params }: RouteContext) {
  const authenticatedCustomer = await getAuthenticatedCustomerFromRequest(request);

  if (!authenticatedCustomer) {
    return NextResponse.json({ error: "Non authentifie." }, { status: 401 });
  }

  const productId = resolveProductId(params.productId);
  if (!productId) {
    return NextResponse.json({ error: "Produit introuvable." }, { status: 400 });
  }

  const supabaseAdmin = getSupabaseAdminClient();
  if (!supabaseAdmin) {
    return NextResponse.json(
      { error: "Supabase admin non configure." },
      { status: 500 },
    );
  }

  const { error } = await supabaseAdmin
    .from("favorites")
    .delete()
    .eq("user_id", authenticatedCustomer.id)
    .eq("product_id", productId);

  if (error) {
    console.error("[favorites:remove]", {
      code: error.code,
      message: error.message,
      details: error.details,
      hint: error.hint,
      productId,
      userId: authenticatedCustomer.id,
    });

    return NextResponse.json(
      { error: mapFavoriteDatabaseError("remove", error) },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true });
}
