import { NextRequest, NextResponse } from "next/server";
import {
  RequestAuthError,
  getAuthenticatedCustomerContextFromRequest,
} from "@/lib/supabase/auth-user";

type FavoriteRow = {
  product_id: string;
};

type DbErrorLike = {
  code?: string;
  message?: string;
  details?: string;
  hint?: string;
};

const FAVORITES_TABLE_MISSING_MESSAGE =
  "La table favorites est manquante. Lancez supabase/migrations/2026-04-04-create-favorites-table.sql.";

const mapFavoritesQueryError = (error: DbErrorLike): string => {
  if (error.code === "42P01" || error.message?.includes('relation "favorites" does not exist')) {
    return FAVORITES_TABLE_MISSING_MESSAGE;
  }

  return "Impossible de recuperer vos favoris.";
};

export const dynamic = "force-dynamic";

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

  const { data, error } = await authenticatedContext.supabase
    .from("favorites")
    .select("product_id")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[favorites:list]", {
      code: error.code,
      message: error.message,
      details: error.details,
      hint: error.hint,
      userId: authenticatedContext.customer.id,
    });

    return NextResponse.json(
      { error: mapFavoritesQueryError(error) },
      { status: 500 },
    );
  }

  const favoriteProductIds = (data as FavoriteRow[]).map((row) => row.product_id);
  return NextResponse.json({ favoriteProductIds });
}
