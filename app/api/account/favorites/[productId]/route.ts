import { NextRequest, NextResponse } from "next/server";
import { getProductsByIds } from "@/lib/products";
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

const validateFavoriteRequest = async (productId: string): Promise<boolean> => {
  if (!productId) {
    return false;
  }

  const products = await getProductsByIds([productId]);
  return products.length === 1;
};

export async function POST(request: NextRequest, { params }: RouteContext) {
  const authenticatedCustomer = await getAuthenticatedCustomerFromRequest(request);

  if (!authenticatedCustomer) {
    return NextResponse.json({ error: "Non authentifie." }, { status: 401 });
  }

  const productId = resolveProductId(params.productId);
  const isValidProduct = await validateFavoriteRequest(productId);
  if (!isValidProduct) {
    return NextResponse.json({ error: "Produit introuvable." }, { status: 404 });
  }

  const supabaseAdmin = getSupabaseAdminClient();
  if (!supabaseAdmin) {
    return NextResponse.json(
      { error: "Supabase admin non configure." },
      { status: 500 },
    );
  }

  const { error } = await supabaseAdmin.from("favorites").insert({
    user_id: authenticatedCustomer.id,
    product_id: productId,
  });

  if (error) {
    if (error.message.includes('relation "favorites" does not exist')) {
      return NextResponse.json({ error: FAVORITES_TABLE_MISSING_MESSAGE }, { status: 500 });
    }

    if (error.message.includes("duplicate key value")) {
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json(
      { error: "Impossible d'ajouter aux favoris." },
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
    if (error.message.includes('relation "favorites" does not exist')) {
      return NextResponse.json({ error: FAVORITES_TABLE_MISSING_MESSAGE }, { status: 500 });
    }

    return NextResponse.json(
      { error: "Impossible de retirer des favoris." },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true });
}
