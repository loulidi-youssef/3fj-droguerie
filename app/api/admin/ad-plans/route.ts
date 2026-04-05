import { revalidatePath } from "next/cache";
import { NextRequest, NextResponse } from "next/server";
import { requireAdminApiSession } from "@/lib/admin-api-auth";
import { createAdminAdPlan, getAdminAdPlans } from "@/lib/admin-ad-plans";
import { parseAdminAdPlanInputFromJson } from "@/lib/admin-ad-plans-validation";

export const dynamic = "force-dynamic";

export async function GET() {
  const unauthorizedResponse = requireAdminApiSession();
  if (unauthorizedResponse) {
    return unauthorizedResponse;
  }

  const plans = await getAdminAdPlans();
  return NextResponse.json({ plans });
}

export async function POST(request: NextRequest) {
  const unauthorizedResponse = requireAdminApiSession();
  if (unauthorizedResponse) {
    return unauthorizedResponse;
  }

  let payload: Record<string, unknown>;
  try {
    payload = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Corps de requete JSON invalide." }, { status: 400 });
  }

  const parsed = parseAdminAdPlanInputFromJson(payload);
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  const created = await createAdminAdPlan(parsed.value);
  if (!created.ok) {
    return NextResponse.json(
      { error: created.error ?? "Impossible d'ajouter le plan publicitaire." },
      { status: 500 },
    );
  }

  revalidatePath("/admin/publicites");
  return NextResponse.json({ ok: true }, { status: 201 });
}
