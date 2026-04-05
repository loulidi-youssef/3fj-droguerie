import { NextResponse } from "next/server";
import { requireAdminApiSession } from "@/lib/admin-api-auth";
import { getAdminAdAnalyticsDashboard } from "@/lib/admin-ad-analytics";

export const dynamic = "force-dynamic";

export async function GET() {
  const unauthorizedResponse = await requireAdminApiSession();
  if (unauthorizedResponse) {
    return unauthorizedResponse;
  }

  const analytics = await getAdminAdAnalyticsDashboard();
  return NextResponse.json(analytics);
}

