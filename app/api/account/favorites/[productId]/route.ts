import { NextRequest, NextResponse } from "next/server";
import {
  RequestAuthError,
  getAuthenticatedCustomerContextFromRequest,
} from "@/lib/supabase/auth-user";

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

  const productId = resolveProductId(params.productId);
  if (!productId) {
    return NextResponse.json({ error: "Produit introuvable." }, { status: 400 });
  }

  const { error } = await authenticatedContext.supabase.from("favorites").insert({
    user_id: authenticatedContext.customer.id,
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
      userId: authenticatedContext.customer.id,
    });

    return NextResponse.json(
      { error: mapFavoriteDatabaseError("add", error) },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(request: NextRequest, { params }: RouteContext) {
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

  const productId = resolveProductId(params.productId);
  if (!productId) {
    return NextResponse.json({ error: "Produit introuvable." }, { status: 400 });
  }

  const { error } = await authenticatedContext.supabase
    .from("favorites")
    .delete()
    .eq("product_id", productId);

  if (error) {
    console.error("[favorites:remove]", {
      code: error.code,
      message: error.message,
      details: error.details,
      hint: error.hint,
      productId,
      userId: authenticatedContext.customer.id,
    });

    return NextResponse.json(
      { error: mapFavoriteDatabaseError("remove", error) },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true });
}
