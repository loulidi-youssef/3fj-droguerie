import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { getAuthenticatedCustomerFromRequest } from "@/lib/supabase/auth-user";

type FavoriteRow = {
  product_id: string;
};

const FAVORITES_TABLE_MISSING_MESSAGE =
  "La table favorites est manquante. Lancez supabase/migrations/2026-04-04-create-favorites-table.sql.";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
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

  const { data, error } = await supabaseAdmin
    .from("favorites")
    .select("product_id")
    .eq("user_id", authenticatedCustomer.id)
    .order("created_at", { ascending: false });

  if (error) {
    if (error.message.includes('relation "favorites" does not exist')) {
      return NextResponse.json({ error: FAVORITES_TABLE_MISSING_MESSAGE }, { status: 500 });
    }

    return NextResponse.json(
      { error: "Impossible de recuperer vos favoris." },
      { status: 500 },
    );
  }

  const favoriteProductIds = (data as FavoriteRow[]).map((row) => row.product_id);
  return NextResponse.json({ favoriteProductIds });
}
