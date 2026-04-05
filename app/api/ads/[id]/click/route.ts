import { NextRequest, NextResponse } from "next/server";
import { recordAdEvent } from "@/lib/ad-events";

type TrackAdRouteContext = {
  params: {
    id: string;
  };
};

const isUuid = (value: string): boolean => {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
};

const getFallbackFingerprint = (request: NextRequest): string => {
  const forwardedFor = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown-ip";
  const userAgent = request.headers.get("user-agent")?.trim() || "unknown-agent";
  const acceptLanguage = request.headers.get("accept-language")?.trim() || "unknown-language";
  return `${forwardedFor}|${userAgent.slice(0, 120)}|${acceptLanguage.slice(0, 40)}`;
};

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest, context: TrackAdRouteContext) {
  const adId = context.params.id?.trim() ?? "";
  if (!adId || !isUuid(adId)) {
    return NextResponse.json({ error: "Publicite invalide." }, { status: 400 });
  }

  let payload: Record<string, unknown> = {};
  try {
    payload = (await request.json()) as Record<string, unknown>;
  } catch {
    payload = {};
  }

  const sessionKey = typeof payload.session_key === "string" ? payload.session_key : null;
  const recorded = await recordAdEvent({
    adId,
    eventType: "click",
    sessionKey,
    fallbackFingerprint: getFallbackFingerprint(request),
  });

  if (!recorded.ok) {
    return NextResponse.json({ error: recorded.error }, { status: 500 });
  }

  return NextResponse.json({ ok: true, counted: recorded.counted });
}
