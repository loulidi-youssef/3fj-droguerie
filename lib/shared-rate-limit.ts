import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { hashText } from "@/lib/request-client-id";

type SharedRateLimitInput = {
  scope: string;
  identifier: string;
  limit: number;
  windowMs: number;
  denyOnError?: boolean;
};

type SharedRateLimitResult = {
  allowed: boolean;
  retryAfterSeconds: number;
};

type ConsumeRateLimitRow = {
  allowed: boolean;
  retry_after_seconds: number;
  hit_count: number;
  window_started_at: string;
};

const normalizeScope = (value: string): string => value.trim().slice(0, 120);
const normalizeIdentifier = (value: string): string => value.trim().slice(0, 240);

export const consumeSharedRateLimit = async (
  input: SharedRateLimitInput,
): Promise<SharedRateLimitResult> => {
  const denyOnError = input.denyOnError !== false;
  const scope = normalizeScope(input.scope);
  const identifier = normalizeIdentifier(input.identifier);

  if (!scope || !identifier || input.limit <= 0 || input.windowMs <= 0) {
    return {
      allowed: !denyOnError,
      retryAfterSeconds: denyOnError ? 60 : 0,
    };
  }

  const supabaseAdmin = getSupabaseAdminClient();
  if (!supabaseAdmin) {
    console.error("[rate-limit] Missing Supabase admin client.");
    return {
      allowed: !denyOnError,
      retryAfterSeconds: denyOnError ? 60 : 0,
    };
  }

  const keyHash = hashText(identifier);
  const { data, error } = await supabaseAdmin.rpc("consume_rate_limit", {
    p_scope: scope,
    p_key_hash: keyHash,
    p_limit: input.limit,
    p_window_ms: input.windowMs,
  });

  if (error) {
    console.error("[rate-limit] Failed to consume shared rate limit.", {
      scope,
      message: error.message,
    });
    return {
      allowed: !denyOnError,
      retryAfterSeconds: denyOnError ? 60 : 0,
    };
  }

  const firstRow = Array.isArray(data)
    ? ((data[0] as ConsumeRateLimitRow | undefined) ?? null)
    : ((data as ConsumeRateLimitRow | null) ?? null);

  if (!firstRow) {
    console.error("[rate-limit] Missing consume_rate_limit payload row.", { scope });
    return {
      allowed: !denyOnError,
      retryAfterSeconds: denyOnError ? 60 : 0,
    };
  }

  const retryAfterSeconds = Number(firstRow.retry_after_seconds);
  return {
    allowed: Boolean(firstRow.allowed),
    retryAfterSeconds:
      Number.isFinite(retryAfterSeconds) && retryAfterSeconds > 0
        ? Math.ceil(retryAfterSeconds)
        : 0,
  };
};
