import { NextRequest, NextResponse } from "next/server";
import { getAllProducts, getProductsByIds } from "@/lib/products";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const rawIds = request.nextUrl.searchParams.get("ids");
  const ids = rawIds
    ? rawIds
        .split(",")
        .map((id) => id.trim())
        .filter(Boolean)
    : [];

  const products = ids.length > 0 ? await getProductsByIds(ids) : await getAllProducts();

  return NextResponse.json({ products });
}
