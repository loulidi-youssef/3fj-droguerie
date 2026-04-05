import { NextResponse } from "next/server";
import { hasValidAdminSession, isAdminAuthConfigured } from "@/lib/admin-auth";

export const requireAdminApiSession = async (): Promise<NextResponse | null> => {
  if (!isAdminAuthConfigured()) {
    return NextResponse.json(
      { error: "Admin non configure." },
      { status: 503 },
    );
  }

  if (!(await hasValidAdminSession())) {
    return NextResponse.json(
      { error: "Acces admin non autorise." },
      { status: 401 },
    );
  }

  return null;
};
