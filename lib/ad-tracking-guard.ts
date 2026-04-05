import type { NextRequest } from "next/server";
import type { AdEventType } from "@/types";

type TrackingRateLimitConfig = {
  maxPerMinutePerIp: number;
  maxPerMinutePerSession: number;
  minIntervalMs: number;
};

type TrackingCounterEntry = {
  count: number;
  windowStartedAt: number;
};

type AdTrackingGuardInput = {
  adId: string;
  eventType: AdEventType;
  ip: string;
  userAgent: string;
  sessionKey?: string | null;
};

export type AdTrackingGuardResult =
  | {
      allowed: true;
      normalizedSessionKey: string | null;
    }
  | {
      allowed: false;
      normalizedSessionKey: string | null;
      reason:
        | "invalid_user_agent"
        | "rate_limited_ip"
        | "rate_limited_session"
        | "rapid_hits";
    };

const RATE_WINDOW_MS = 60_000;
const RATE_SWEEP_SIZE = 8_000;
const RAPID_SWEEP_SIZE = 8_000;
const RAPID_TTL_MS = 5 * 60 * 1000;

const TRACKING_RATE_LIMIT_CONFIG: Record<AdEventType, TrackingRateLimitConfig> = {
  view: {
    maxPerMinutePerIp: 20,
    maxPerMinutePerSession: 20,
    minIntervalMs: 10_000,
  },
  click: {
    maxPerMinutePerIp: 10,
    maxPerMinutePerSession: 10,
    minIntervalMs: 30_000,
  },
};

const rateCounterStore = new Map<string, TrackingCounterEntry>();
const rapidHitStore = new Map<string, number>();

const normalizeUserAgent = (value: string | null | undefined): string => {
  if (!value) {
    return "";
  }

  const normalized = value.trim().replace(/\s+/g, " ");
  return normalized.slice(0, 200);
};

const isBasicUserAgentValid = (userAgent: string): boolean => {
  const normalized = normalizeUserAgent(userAgent);
  if (normalized.length < 8) {
    return false;
  }

  // Reject obviously synthetic/blank placeholders while keeping compatibility.
  if (normalized.toLowerCase() === "unknown-agent") {
    return false;
  }

  return /[a-zA-Z]/.test(normalized);
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

const sweepTrackingStores = (now: number): void => {
  if (rateCounterStore.size > RATE_SWEEP_SIZE) {
    for (const [key, entry] of rateCounterStore.entries()) {
      if (now - entry.windowStartedAt > RATE_WINDOW_MS) {
        rateCounterStore.delete(key);
      }
    }
  }

  if (rapidHitStore.size > RAPID_SWEEP_SIZE) {
    for (const [key, lastHitAt] of rapidHitStore.entries()) {
      if (now - lastHitAt > RAPID_TTL_MS) {
        rapidHitStore.delete(key);
      }
    }
  }
};

const consumeRateLimitCounter = (
  key: string,
  limit: number,
  now: number,
): boolean => {
  const current = rateCounterStore.get(key);
  if (!current || now - current.windowStartedAt >= RATE_WINDOW_MS) {
    rateCounterStore.set(key, { count: 1, windowStartedAt: now });
    return true;
  }

  current.count += 1;
  if (current.count > limit) {
    return false;
  }

  return true;
};

const isRapidHitBlocked = (
  eventType: AdEventType,
  adId: string,
  identity: string,
  minIntervalMs: number,
  now: number,
): boolean => {
  const rapidKey = `${eventType}|${adId}|${identity}`;
  const lastHitAt = rapidHitStore.get(rapidKey);

  if (typeof lastHitAt === "number" && now - lastHitAt < minIntervalMs) {
    return true;
  }

  rapidHitStore.set(rapidKey, now);
  return false;
};

export const getTrackingRequestIp = (request: NextRequest): string => {
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) {
    const firstIp = forwardedFor.split(",")[0]?.trim();
    if (firstIp) {
      return firstIp.slice(0, 120);
    }
  }

  const realIp = request.headers.get("x-real-ip")?.trim();
  if (realIp) {
    return realIp.slice(0, 120);
  }

  const forwarded = request.headers.get("forwarded");
  if (forwarded) {
    const match = forwarded.match(/for="?([^;,"]+)"?/i);
    if (match?.[1]) {
      return match[1].slice(0, 120);
    }
  }

  return "unknown-ip";
};

export const getTrackingRequestUserAgent = (request: NextRequest): string => {
  return normalizeUserAgent(request.headers.get("user-agent"));
};

export const buildTrackingFallbackFingerprint = (
  request: NextRequest,
  ip: string,
  userAgent: string,
): string => {
  const acceptLanguage = request.headers.get("accept-language")?.trim() || "unknown-language";
  const normalizedUserAgent = userAgent || "unknown-agent";
  return `${ip}|${normalizedUserAgent.slice(0, 120)}|${acceptLanguage.slice(0, 40)}`;
};

export const guardAdTrackingRequest = (
  input: AdTrackingGuardInput,
): AdTrackingGuardResult => {
  const now = Date.now();
  sweepTrackingStores(now);

  if (!isBasicUserAgentValid(input.userAgent)) {
    return {
      allowed: false,
      normalizedSessionKey: normalizeSessionKey(input.sessionKey),
      reason: "invalid_user_agent",
    };
  }

  const normalizedSessionKey = normalizeSessionKey(input.sessionKey);
  const config = TRACKING_RATE_LIMIT_CONFIG[input.eventType];

  const ipRateKey = `${input.eventType}|ip|${input.ip}`;
  const ipAllowed = consumeRateLimitCounter(ipRateKey, config.maxPerMinutePerIp, now);
  if (!ipAllowed) {
    return {
      allowed: false,
      normalizedSessionKey,
      reason: "rate_limited_ip",
    };
  }

  if (normalizedSessionKey) {
    const sessionRateKey = `${input.eventType}|session|${normalizedSessionKey}`;
    const sessionAllowed = consumeRateLimitCounter(
      sessionRateKey,
      config.maxPerMinutePerSession,
      now,
    );

    if (!sessionAllowed) {
      return {
        allowed: false,
        normalizedSessionKey,
        reason: "rate_limited_session",
      };
    }
  }

  const identity = normalizedSessionKey ?? `ip:${input.ip}`;
  const rapidBlocked = isRapidHitBlocked(
    input.eventType,
    input.adId,
    identity,
    config.minIntervalMs,
    now,
  );

  if (rapidBlocked) {
    return {
      allowed: false,
      normalizedSessionKey,
      reason: "rapid_hits",
    };
  }

  return {
    allowed: true,
    normalizedSessionKey,
  };
};
