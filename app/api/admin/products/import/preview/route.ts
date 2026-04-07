import { NextRequest, NextResponse } from "next/server";
import {
  enforceRouteRateLimit,
  getAdminMutationRateLimitIdentifier,
} from "@/lib/api-rate-limit";
import { requireAdminApiSession } from "@/lib/admin-api-auth";
import {
  PRODUCT_IMPORT_SUPPORTED_FORMATS,
  buildProductImportPreview,
  type ProductImportFormat,
} from "@/lib/admin-product-import";

export const dynamic = "force-dynamic";

const isSupportedProductImportFormat = (
  value: string | undefined,
): value is ProductImportFormat => {
  if (!value) {
    return false;
  }
  return PRODUCT_IMPORT_SUPPORTED_FORMATS.includes(value as ProductImportFormat);
};

export async function POST(request: NextRequest) {
  const unauthorizedResponse = await requireAdminApiSession();
  if (unauthorizedResponse) {
    return unauthorizedResponse;
  }

  const rateLimit = await enforceRouteRateLimit({
    scope: "admin:products:import:preview",
    identifier: getAdminMutationRateLimitIdentifier(request),
    limit: 20,
    windowMs: 60_000,
  });
  if (!rateLimit.ok) {
    return rateLimit.response;
  }

  let payload: Record<string, unknown>;
  try {
    payload = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json(
      { ok: false, error: "Corps de requete JSON invalide." },
      { status: 400 },
    );
  }

  const rawFormat = typeof payload.format === "string" ? payload.format.trim() : "csv";
  if (!isSupportedProductImportFormat(rawFormat)) {
    return NextResponse.json(
      { ok: false, error: "Format d'import non supporte." },
      { status: 400 },
    );
  }

  const rawPayload = typeof payload.payload === "string" ? payload.payload : "";
  const preview = await buildProductImportPreview(rawFormat, rawPayload);

  return NextResponse.json(preview);
}
