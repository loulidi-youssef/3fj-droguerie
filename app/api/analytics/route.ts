import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

type AnalyticsEventBody = {
  name?: unknown;
  payload?: unknown;
  timestamp?: unknown;
};

const ANALYTICS_TABLE = "checkout_funnel_events";

const isPlainObject = (value: unknown): value is Record<string, unknown> => {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
};

const isRelationMissingError = (message: string | undefined, relation: string): boolean => {
  const normalizedMessage = (message ?? "").toLowerCase();
  return (
    normalizedMessage.includes(`relation "${relation.toLowerCase()}" does not exist`) ||
    normalizedMessage.includes(`relation '${relation.toLowerCase()}' does not exist`) ||
    normalizedMessage.includes("42p01")
  );
};

const toSafeIsoTimestamp = (value: unknown): string => {
  if (typeof value === "string") {
    const parsed = Date.parse(value);
    if (Number.isFinite(parsed)) {
      return new Date(parsed).toISOString();
    }
  }

  return new Date().toISOString();
};

export async function POST(request: NextRequest) {
  let body: AnalyticsEventBody;
  try {
    body = (await request.json()) as AnalyticsEventBody;
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }

  const eventName = typeof body.name === "string" ? body.name.trim() : "";
  if (!eventName) {
    return NextResponse.json({ ok: false, error: "invalid_event_name" }, { status: 400 });
  }

  const timestamp = toSafeIsoTimestamp(body.timestamp);
  const payload = isPlainObject(body.payload) ? body.payload : {};

  const supabaseAdmin = getSupabaseAdminClient();
  if (!supabaseAdmin) {
    return NextResponse.json({ ok: true, stored: false }, { status: 202 });
  }

  const { error } = await supabaseAdmin.from(ANALYTICS_TABLE).insert({
    event_name: eventName,
    payload,
    timestamp,
  });

  if (error) {
    if (!isRelationMissingError(error.message, ANALYTICS_TABLE)) {
      console.warn("[api/analytics] Failed to insert analytics event.", {
        code: error.code,
        message: error.message,
      });
    }

    return NextResponse.json({ ok: true, stored: false }, { status: 202 });
  }

  return NextResponse.json({ ok: true, stored: true }, { status: 201 });
}
