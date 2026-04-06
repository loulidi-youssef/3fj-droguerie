import { revalidatePath } from "next/cache";
import { NextRequest, NextResponse } from "next/server";
import {
  enforceRouteRateLimit,
  getAdminMutationRateLimitIdentifier,
} from "@/lib/api-rate-limit";
import { requireAdminApiSession } from "@/lib/admin-api-auth";
import { createAdminAd } from "@/lib/admin-ads";
import { parseAdminAdInputFromJson } from "@/lib/admin-ads-validation";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const unauthorizedResponse = await requireAdminApiSession();
  if (unauthorizedResponse) {
    return unauthorizedResponse;
  }

  const rateLimit = await enforceRouteRateLimit({
    scope: "admin:ads:create",
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
    return NextResponse.json({ error: "Corps de requete JSON invalide." }, { status: 400 });
  }

  const parsed = parseAdminAdInputFromJson(payload);
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  const created = await createAdminAd(parsed.value);
  if (!created.ok) {
    return NextResponse.json(
      { error: created.error ?? "Impossible d'ajouter la publicite." },
      { status: 500 },
    );
  }

  revalidatePath("/");
  revalidatePath("/admin/publicites");

  return NextResponse.json({ ok: true }, { status: 201 });
}


