import { NextRequest, NextResponse } from "next/server";
import { getActiveOfferRulesByProductIds } from "@/lib/offers";
import {
  getAllProductSearchSuggestions,
  getAllProducts,
  getProductsByIds,
} from "@/lib/products";

export const dynamic = "force-dynamic";

const isFalseFlag = (value: string | null): boolean => {
  if (!value) {
    return false;
  }

  const normalized = value.trim().toLowerCase();
  return normalized === "0" || normalized === "false" || normalized === "no";
};

export async function GET(request: NextRequest) {
  const minimalParam = request.nextUrl.searchParams.get("minimal");
  const shouldReturnMinimalProducts = Boolean(
    minimalParam && !isFalseFlag(minimalParam),
  );
  const shouldIncludeOfferRules = !isFalseFlag(
    request.nextUrl.searchParams.get("includeOffers"),
  );
  const rawIds = request.nextUrl.searchParams.get("ids");
  const ids = rawIds
    ? rawIds
        .split(",")
        .map((id) => id.trim())
        .filter(Boolean)
    : [];

  if (ids.length === 0 && shouldReturnMinimalProducts) {
    const products = await getAllProductSearchSuggestions();
    return NextResponse.json({
      products,
      activeOfferRulesByProductId: {},
    });
  }

  const products = ids.length > 0 ? await getProductsByIds(ids) : await getAllProducts();
  const activeOfferRulesByProductId = shouldIncludeOfferRules
    ? Object.fromEntries(
        Array.from(
          (
            await getActiveOfferRulesByProductIds(
              products.map((product) => product.id),
            )
          ).entries(),
        ).map(([productId, rule]) => [
          productId,
          {
            discountType: rule.discountType,
            discountValue: rule.discountValue,
            legacyDiscountedPrice: rule.legacyDiscountedPrice ?? null,
            discountLabel: rule.discountLabel,
          },
        ]),
      )
    : {};

  return NextResponse.json({ products, activeOfferRulesByProductId });
}
