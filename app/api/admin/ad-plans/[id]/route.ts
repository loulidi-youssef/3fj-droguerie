import { revalidatePath } from "next/cache";
import { NextRequest, NextResponse } from "next/server";
import { requireAdminApiSession } from "@/lib/admin-api-auth";
import { deleteAdminAdPlan, updateAdminAdPlan } from "@/lib/admin-ad-plans";
import { parseAdminAdPlanInputFromJson } from "@/lib/admin-ad-plans-validation";

type AdminAdPlanByIdRouteContext = {
  params: {
    id: string;
  };
};

const isUuid = (value: string): boolean => {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
};

export const dynamic = "force-dynamic";

export async function PUT(request: NextRequest, context: AdminAdPlanByIdRouteContext) {
  const unauthorizedResponse = await requireAdminApiSession();
  if (unauthorizedResponse) {
    return unauthorizedResponse;
  }

  const planId = context.params.id?.trim() ?? "";
  if (!planId || !isUuid(planId)) {
    return NextResponse.json({ error: "ID plan invalide." }, { status: 400 });
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

  const updated = await updateAdminAdPlan(planId, parsed.value);
  if (!updated.ok) {
    return NextResponse.json(
      { error: updated.error ?? "Impossible de modifier le plan publicitaire." },
      { status: 500 },
    );
  }

  revalidatePath("/admin/publicites");
  return NextResponse.json({ ok: true });
}

export async function DELETE(_request: NextRequest, context: AdminAdPlanByIdRouteContext) {
  const unauthorizedResponse = await requireAdminApiSession();
  if (unauthorizedResponse) {
    return unauthorizedResponse;
  }

  const planId = context.params.id?.trim() ?? "";
  if (!planId || !isUuid(planId)) {
    return NextResponse.json({ error: "ID plan invalide." }, { status: 400 });
  }

  const deleted = await deleteAdminAdPlan(planId);
  if (!deleted.ok) {
    return NextResponse.json(
      { error: deleted.error ?? "Suppression du plan impossible." },
      { status: 500 },
    );
  }

  revalidatePath("/admin/publicites");
  return NextResponse.json({ ok: true });
}

