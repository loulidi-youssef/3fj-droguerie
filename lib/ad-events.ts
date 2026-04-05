import { createHash } from "crypto";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import type { AdEventType } from "@/types";

type RecordAdEventInput = {
  adId: string;
  eventType: AdEventType;
  sessionKey?: string | null;
  fallbackFingerprint: string;
};

type RecordAdEventResult =
  | {
      ok: true;
      counted: boolean;
    }
  | {
      ok: false;
      error: string;
    };

const hashValue = (raw: string): string => {
  return createHash("sha256").update(raw).digest("hex");
};

const normalizeSessionKey = (value: string | null | undefined): string | null => {
  if (!value) {
    return null;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  if (!/^[a-zA-Z0-9._-]{8,120}$/.test(trimmed)) {
    return null;
  }

  return trimmed;
};

const DEDUPE_WINDOW_SECONDS: Record<AdEventType, number> = {
  view: 10,
  click: 30,
};

const toEventBucket = (eventType: AdEventType, nowMs: number): string => {
  const windowSeconds = DEDUPE_WINDOW_SECONDS[eventType];
  return String(Math.floor(nowMs / (windowSeconds * 1000)));
};

const isAdTrackable = async (adId: string): Promise<boolean> => {
  const supabaseAdmin = getSupabaseAdminClient();
  if (!supabaseAdmin) {
    return false;
  }

  const { data, error } = await supabaseAdmin
    .from("ads")
    .select("id,is_active,start_date,end_date")
    .eq("id", adId)
    .maybeSingle();

  if (error) {
    return false;
  }

  if (!data?.id || !data.is_active) {
    return false;
  }

  const nowMs = Date.now();
  const startMs = data.start_date ? Date.parse(data.start_date) : null;
  const endMs = data.end_date ? Date.parse(data.end_date) : null;

  if (typeof startMs === "number" && Number.isFinite(startMs) && nowMs < startMs) {
    return false;
  }

  if (typeof endMs === "number" && Number.isFinite(endMs) && nowMs > endMs) {
    return false;
  }

  return true;
};

export const recordAdEvent = async (
  input: RecordAdEventInput,
): Promise<RecordAdEventResult> => {
  const supabaseAdmin = getSupabaseAdminClient();
  if (!supabaseAdmin) {
    return { ok: false, error: "Supabase admin non configure." };
  }

  const trackable = await isAdTrackable(input.adId);
  if (!trackable) {
    return { ok: true, counted: false };
  }

  const nowMs = Date.now();
  const normalizedSessionKey = normalizeSessionKey(input.sessionKey);
  const sessionIdentity =
    normalizedSessionKey ??
    `fp_${hashValue(input.fallbackFingerprint).slice(0, 24)}`;
  const dedupeKey = hashValue(
    `${input.adId}|${input.eventType}|${sessionIdentity}|${toEventBucket(input.eventType, nowMs)}`,
  );

  const { error } = await supabaseAdmin.from("ad_events").insert({
    ad_id: input.adId,
    event_type: input.eventType,
    session_key: sessionIdentity,
    dedupe_key: dedupeKey,
  });

  if (!error) {
    return { ok: true, counted: true };
  }

  if (error.code === "23505") {
    return { ok: true, counted: false };
  }

  if (error.code === "23503") {
    return { ok: true, counted: false };
  }

  return { ok: false, error: "Impossible d'enregistrer l'evenement publicitaire." };
};
