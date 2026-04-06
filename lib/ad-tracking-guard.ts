import type { NextRequest } from "next/server";
import {
  getRequestFingerprintHash,
  getTrustedClientIp,
  normalizeUserAgent,
} from "@/lib/request-client-id";
import { consumeSharedRateLimit } from "@/lib/shared-rate-limit";
import type { AdEventType } from "@/types";

type TrackingRateLimitConfig = {
  maxPerMinutePerIp: number;
  maxPerMinutePerSession: number;
  minIntervalMs: number;
};

type AdTrackingGuardInput = {
  request: NextRequest;
  adId: string;
  eventType: AdEventType;
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

const isBasicUserAgentValid = (userAgent: string): boolean => {
  const normalized = normalizeUserAgent(userAgent);
  if (normalized.length < 8) {
    return false;
  }

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

export const getTrackingRequestIp = (request: NextRequest): string => {
  return getTrustedClientIp(request) ?? "unknown-ip";
};

export const getTrackingRequestUserAgent = (request: NextRequest): string => {
  return normalizeUserAgent(request.headers.get("user-agent"));
};

export const buildTrackingFallbackFingerprint = (
  request: NextRequest,
  ip: string,
  userAgent: string,
): string => {
  const fingerprintHash = getRequestFingerprintHash(request).slice(0, 24);
  const normalizedUserAgent = userAgent || "unknown-agent";
  return `${ip}|${normalizedUserAgent.slice(0, 120)}|fp:${fingerprintHash}`;
};

export const guardAdTrackingRequest = async (
  input: AdTrackingGuardInput,
): Promise<AdTrackingGuardResult> => {
  const normalizedSessionKey = normalizeSessionKey(input.sessionKey);
  const ip = getTrackingRequestIp(input.request);
  const userAgent = getTrackingRequestUserAgent(input.request);

  if (!isBasicUserAgentValid(userAgent)) {
    return {
      allowed: false,
      normalizedSessionKey,
      reason: "invalid_user_agent",
    };
  }

  const config = TRACKING_RATE_LIMIT_CONFIG[input.eventType];
  const ipRate = await consumeSharedRateLimit({
    scope: `ads:${input.eventType}:ip`,
    identifier: `ip:${ip}`,
    limit: config.maxPerMinutePerIp,
    windowMs: RATE_WINDOW_MS,
    denyOnError: true,
  });
  if (!ipRate.allowed) {
    return {
      allowed: false,
      normalizedSessionKey,
      reason: "rate_limited_ip",
    };
  }

  if (normalizedSessionKey) {
    const sessionRate = await consumeSharedRateLimit({
      scope: `ads:${input.eventType}:session`,
      identifier: `session:${normalizedSessionKey}`,
      limit: config.maxPerMinutePerSession,
      windowMs: RATE_WINDOW_MS,
      denyOnError: true,
    });

    if (!sessionRate.allowed) {
      return {
        allowed: false,
        normalizedSessionKey,
        reason: "rate_limited_session",
      };
    }
  }

  const rapidIdentity =
    normalizedSessionKey ?? `fp:${getRequestFingerprintHash(input.request).slice(0, 48)}`;
  const rapidRate = await consumeSharedRateLimit({
    scope: `ads:${input.eventType}:rapid:${input.adId}`,
    identifier: rapidIdentity,
    limit: 1,
    windowMs: config.minIntervalMs,
    denyOnError: true,
  });
  if (!rapidRate.allowed) {
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
