import { NextRequest, NextResponse } from "next/server";
import { recordAdEvent } from "@/lib/ad-events";
import {
  buildTrackingFallbackFingerprint,
  getTrackingRequestIp,
  getTrackingRequestUserAgent,
  guardAdTrackingRequest,
} from "@/lib/ad-tracking-guard";

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
  const ip = getTrackingRequestIp(request);
  const userAgent = getTrackingRequestUserAgent(request);
  const guarded = await guardAdTrackingRequest({
    request,
    adId,
    eventType: "click",
    sessionKey,
  });

  if (!guarded.allowed) {
    if (guarded.reason === "rate_limited_ip" || guarded.reason === "rate_limited_session") {
      return NextResponse.json(
        { ok: false, counted: false, error: "Trop de tentatives de tracking." },
        { status: 429 },
      );
    }
    return NextResponse.json({ ok: true, counted: false });
  }

  const recorded = await recordAdEvent({
    adId,
    eventType: "click",
    sessionKey: guarded.normalizedSessionKey,
    fallbackFingerprint: buildTrackingFallbackFingerprint(request, ip, userAgent),
  });

  if (!recorded.ok) {
    return NextResponse.json({ error: recorded.error }, { status: 500 });
  }

  return NextResponse.json({ ok: true, counted: recorded.counted });
}
