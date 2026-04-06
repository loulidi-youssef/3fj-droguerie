import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getRequestFingerprintHash, hashText } from "@/lib/request-client-id";
import { consumeSharedRateLimit } from "@/lib/shared-rate-limit";

type RouteRateLimitPolicy = {
  scope: string;
  identifier: string;
  limit: number;
  windowMs: number;
  errorMessage?: string;
};

type RouteRateLimitResult = {
  ok: true;
} | {
  ok: false;
  response: NextResponse;
};

const DEFAULT_ERROR_MESSAGE = "Trop de tentatives. Merci de patienter quelques secondes.";
const ADMIN_SESSION_COOKIE = "3fj-admin-session";

export const enforceRouteRateLimit = async (
  policy: RouteRateLimitPolicy,
): Promise<RouteRateLimitResult> => {
  const result = await consumeSharedRateLimit({
    scope: policy.scope,
    identifier: policy.identifier,
    limit: policy.limit,
    windowMs: policy.windowMs,
    denyOnError: true,
  });

  if (result.allowed) {
    return { ok: true };
  }

  return {
    ok: false,
    response: NextResponse.json(
      { error: policy.errorMessage ?? DEFAULT_ERROR_MESSAGE },
      {
        status: 429,
        headers: {
          "Retry-After": String(result.retryAfterSeconds),
        },
      },
    ),
  };
};

export const getAdminMutationRateLimitIdentifier = (request: NextRequest): string => {
  const sessionValue = request.cookies.get(ADMIN_SESSION_COOKIE)?.value?.trim();
  if (sessionValue) {
    return `admin-session:${hashText(sessionValue)}`;
  }

  return `admin-fp:${getRequestFingerprintHash(request)}`;
};
