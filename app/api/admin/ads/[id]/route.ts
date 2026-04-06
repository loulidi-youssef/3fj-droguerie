import { revalidatePath } from "next/cache";
import { NextRequest, NextResponse } from "next/server";
import {
  enforceRouteRateLimit,
  getAdminMutationRateLimitIdentifier,
} from "@/lib/api-rate-limit";
import { requireAdminApiSession } from "@/lib/admin-api-auth";
import { deleteAdminAd, updateAdminAd } from "@/lib/admin-ads";
import { parseAdminAdInputFromJson } from "@/lib/admin-ads-validation";

export const dynamic = "force-dynamic";

type AdminAdByIdRouteContext = {
  params: {
    id: string;
  };
};

const getSafeId = (params: AdminAdByIdRouteContext["params"]): string => {
  const id = params.id?.trim();
  return id || "";
};

export async function PUT(request: NextRequest, context: AdminAdByIdRouteContext) {
  const unauthorizedResponse = await requireAdminApiSession();
  if (unauthorizedResponse) {
    return unauthorizedResponse;
  }

  const rateLimit = await enforceRouteRateLimit({
    scope: "admin:ads:update",
    identifier: getAdminMutationRateLimitIdentifier(request),
    limit: 40,
    windowMs: 60_000,
  });
  if (!rateLimit.ok) {
    return rateLimit.response;
  }

  const adId = getSafeId(context.params);
  if (!adId) {
    return NextResponse.json({ error: "ID publicite manquant." }, { status: 400 });
  }

  let payload: Record<string, unknown>;
  try {
    payload = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Corps de requete JSON invalide." }, { status: 400 });
  }

  const parsed = parseAdminAdInputFromJson(payload);
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  const updated = await updateAdminAd(adId, parsed.value);
  if (!updated.ok) {
    return NextResponse.json(
      { error: updated.error ?? "Impossible de modifier la publicite." },
      { status: 500 },
    );
  }

  revalidatePath("/");
  revalidatePath("/admin/publicites");

  return NextResponse.json({ ok: true });
}

export async function DELETE(request: NextRequest, context: AdminAdByIdRouteContext) {
  const unauthorizedResponse = await requireAdminApiSession();
  if (unauthorizedResponse) {
    return unauthorizedResponse;
  }

  const rateLimit = await enforceRouteRateLimit({
    scope: "admin:ads:delete",
    identifier: getAdminMutationRateLimitIdentifier(request),
    limit: 20,
    windowMs: 60_000,
  });
  if (!rateLimit.ok) {
    return rateLimit.response;
  }

  const adId = getSafeId(context.params);
  if (!adId) {
    return NextResponse.json({ error: "ID publicite manquant." }, { status: 400 });
  }

  const deleted = await deleteAdminAd(adId);
  if (!deleted.ok) {
    return NextResponse.json(
      { error: deleted.error ?? "Suppression impossible." },
      { status: 500 },
    );
  }

  revalidatePath("/");
  revalidatePath("/admin/publicites");

  return NextResponse.json({ ok: true });
}


