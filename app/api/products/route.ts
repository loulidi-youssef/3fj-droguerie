import { NextRequest, NextResponse } from "next/server";
import { getActiveOfferRulesByProductIds } from "@/lib/offers";
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
  const activeOfferRulesByProductIdMap = await getActiveOfferRulesByProductIds(
    products.map((product) => product.id),
  );
  const activeOfferRulesByProductId = Object.fromEntries(
    Array.from(activeOfferRulesByProductIdMap.entries()).map(([productId, rule]) => [
      productId,
      {
        discountType: rule.discountType,
        discountValue: rule.discountValue,
        legacyDiscountedPrice: rule.legacyDiscountedPrice ?? null,
        discountLabel: rule.discountLabel,
      },
    ]),
  );

  return NextResponse.json({ products, activeOfferRulesByProductId });
}
