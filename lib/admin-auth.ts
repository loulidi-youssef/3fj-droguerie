import {
  createHash,
  createHmac,
  pbkdf2Sync,
  randomBytes,
  randomUUID,
  timingSafeEqual,
} from "crypto";
import { cookies, headers } from "next/headers";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

export const ADMIN_SESSION_COOKIE = "3fj-admin-session";
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 8;
const SESSION_SIGNATURE_VERSION = "v2";
const SESSION_REFRESH_INTERVAL_SECONDS = 15 * 60;
const LOGIN_ATTEMPT_WINDOW_MS = 15 * 60 * 1000;
const LOGIN_LOCKOUT_MS = 15 * 60 * 1000;
const MAX_LOGIN_ATTEMPTS = 5;
const LOGIN_THROTTLE_SWEEP_SIZE = 2_000;

type AdminSessionRow = {
  id: string;
  expires_at: string;
  revoked_at: string | null;
  last_seen_at: string | null;
};

type AdminLoginAttemptRow = {
  key_hash: string;
  failure_count: number;
  window_started_at: string;
  locked_until: string | null;
  updated_at: string;
};

type LoginThrottleEntry = {
  failureCount: number;
  windowStartedAt: number;
  lockedUntil: number;
  updatedAt: number;
};

type AdminLoginThrottleContext = {
  keyHash: string;
};

type AdminLoginAllowance =
  | {
      allowed: true;
      context: AdminLoginThrottleContext;
    }
  | {
      allowed: false;
      retryAfterSeconds: number;
    };

type AdminLoginFailureResult = {
  retryAfterSeconds: number;
  locked: boolean;
};

const loginThrottleStore = new Map<string, LoginThrottleEntry>();

const readEnv = (value: string | undefined): string | null => {
  const normalized = value?.trim();
  return normalized ? normalized : null;
};

const getConfiguredAdminPasswordHash = (): string | null => {
  return readEnv(process.env.ADMIN_ACCESS_PASSWORD_HASH);
};

const getConfiguredAdminPassword = (): string | null => {
  const configured = readEnv(process.env.ADMIN_ACCESS_PASSWORD) ?? readEnv(process.env.ADMIN_PASSWORD);
  return configured;
};

const getSessionSecret = (): string | null => {
  const configuredSessionSecret = readEnv(process.env.ADMIN_SESSION_SECRET);
  if (configuredSessionSecret && configuredSessionSecret.length >= 16) {
    return configuredSessionSecret;
  }

  const passwordHash = getConfiguredAdminPasswordHash();
  if (passwordHash) {
    return createHash("sha256")
      .update(`3fj-admin-session|${passwordHash}`)
      .digest("hex");
  }

  const password = getConfiguredAdminPassword();
  if (!password) {
    return null;
  }

  return createHash("sha256")
    .update(`3fj-admin-session|${password}`)
    .digest("hex");
};

const safeEqual = (left: string, right: string): boolean => {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);

  if (leftBuffer.length !== rightBuffer.length) {
    return false;
  }

  return timingSafeEqual(leftBuffer, rightBuffer);
};

const toNonEmptyString = (value: string | null | undefined): string | null => {
  if (!value) {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const hashSessionToken = (token: string): string | null => {
  const sessionSecret = getSessionSecret();
  if (!sessionSecret) {
    return null;
  }

  return createHash("sha256")
    .update(`${sessionSecret}|${token}`)
    .digest("hex");
};

const toUnixSeconds = (): number => Math.floor(Date.now() / 1000);

const isSupabaseTableMissingError = (message: string | undefined, tableName: string): boolean => {
  const normalizedMessage = (message ?? "").toLowerCase();
  return (
    normalizedMessage.includes(`relation "${tableName.toLowerCase()}" does not exist`) ||
    normalizedMessage.includes(`relation '${tableName.toLowerCase()}' does not exist`) ||
    normalizedMessage.includes("42p01")
  );
};

const isSupabaseAuthOrPermissionError = (message: string | undefined): boolean => {
  const normalizedMessage = (message ?? "").toLowerCase();
  return (
    normalizedMessage.includes("invalid api key") ||
    normalizedMessage.includes("invalid jwt") ||
    normalizedMessage.includes("jwt") ||
    normalizedMessage.includes("permission denied") ||
    normalizedMessage.includes("42501") ||
    normalizedMessage.includes("401")
  );
};

const buildFallbackSignedSessionToken = (): string | null => {
  const sessionSecret = getSessionSecret();
  if (!sessionSecret) {
    return null;
  }

  const issuedAt = toUnixSeconds();
  const expiresAt = issuedAt + SESSION_MAX_AGE_SECONDS;
  const payload = {
    sid: `${randomUUID()}-${randomBytes(16).toString("hex")}`,
    iat: issuedAt,
    exp: expiresAt,
  };
  const encodedPayload = Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
  const signature = createHmac("sha256", sessionSecret)
    .update(`${SESSION_SIGNATURE_VERSION}.${encodedPayload}`)
    .digest("base64url");
  return `${SESSION_SIGNATURE_VERSION}.${encodedPayload}.${signature}`;
};

const isFallbackSignedSessionTokenValid = (token: string): boolean => {
  const sessionSecret = getSessionSecret();
  if (!sessionSecret) {
    return false;
  }

  const [version, encodedPayload, signature] = token.split(".");
  if (!version || !encodedPayload || !signature) {
    return false;
  }

  if (version !== SESSION_SIGNATURE_VERSION) {
    return false;
  }

  const expectedSignature = createHmac("sha256", sessionSecret)
    .update(`${version}.${encodedPayload}`)
    .digest("base64url");
  if (!safeEqual(signature, expectedSignature)) {
    return false;
  }

  try {
    const decodedPayload = JSON.parse(
      Buffer.from(encodedPayload, "base64url").toString("utf8"),
    ) as {
      sid?: string;
      iat?: number;
      exp?: number;
    };

    const sid = toNonEmptyString(decodedPayload.sid);
    if (!sid || sid.length < 16) {
      return false;
    }

    if (
      typeof decodedPayload.iat !== "number" ||
      !Number.isFinite(decodedPayload.iat) ||
      typeof decodedPayload.exp !== "number" ||
      !Number.isFinite(decodedPayload.exp)
    ) {
      return false;
    }

    const now = toUnixSeconds();
    if (decodedPayload.iat > now + 60 || decodedPayload.exp <= now) {
      return false;
    }

    if (decodedPayload.exp - decodedPayload.iat > SESSION_MAX_AGE_SECONDS + 60) {
      return false;
    }

    return true;
  } catch {
    return false;
  }
};

const getRequestFingerprintHash = (): string => {
  const requestHeaders = headers();
  const forwardedFor = requestHeaders.get("x-forwarded-for");
  const realIp = requestHeaders.get("x-real-ip");
  const userAgent = requestHeaders.get("user-agent");

  const ip =
    forwardedFor?.split(",")[0]?.trim() ||
    realIp?.trim() ||
    "unknown-ip";
  const normalizedUserAgent = (userAgent ?? "unknown-agent").slice(0, 160);
  const rawFingerprint = `${ip}|${normalizedUserAgent}`;
  return createHash("sha256").update(rawFingerprint).digest("hex");
};

const sweepLoginThrottleStore = (now: number): void => {
  if (loginThrottleStore.size <= LOGIN_THROTTLE_SWEEP_SIZE) {
    return;
  }

  for (const [key, entry] of loginThrottleStore.entries()) {
    const isWindowExpired = now - entry.windowStartedAt > LOGIN_ATTEMPT_WINDOW_MS;
    const isLockExpired = entry.lockedUntil <= now;

    if (isWindowExpired && isLockExpired) {
      loginThrottleStore.delete(key);
    }
  }
};

const checkMemoryLoginAllowance = (
  keyHash: string,
  now: number,
): AdminLoginAllowance => {
  sweepLoginThrottleStore(now);

  const entry = loginThrottleStore.get(keyHash);
  if (!entry) {
    return { allowed: true, context: { keyHash } };
  }

  if (entry.lockedUntil > now) {
    return {
      allowed: false,
      retryAfterSeconds: Math.max(1, Math.ceil((entry.lockedUntil - now) / 1000)),
    };
  }

  if (now - entry.windowStartedAt > LOGIN_ATTEMPT_WINDOW_MS) {
    loginThrottleStore.delete(keyHash);
    return { allowed: true, context: { keyHash } };
  }

  return { allowed: true, context: { keyHash } };
};

const recordMemoryLoginFailure = (
  keyHash: string,
  now: number,
): AdminLoginFailureResult => {
  sweepLoginThrottleStore(now);

  const currentEntry = loginThrottleStore.get(keyHash);
  const isWithinWindow =
    currentEntry && now - currentEntry.windowStartedAt <= LOGIN_ATTEMPT_WINDOW_MS;

  const nextFailureCount = isWithinWindow
    ? currentEntry.failureCount + 1
    : 1;
  const nextWindowStart = isWithinWindow ? currentEntry.windowStartedAt : now;
  const shouldLock = nextFailureCount >= MAX_LOGIN_ATTEMPTS;
  const lockedUntil = shouldLock ? now + LOGIN_LOCKOUT_MS : 0;

  loginThrottleStore.set(keyHash, {
    failureCount: nextFailureCount,
    windowStartedAt: nextWindowStart,
    lockedUntil,
    updatedAt: now,
  });

  return {
    locked: shouldLock,
    retryAfterSeconds: shouldLock
      ? Math.max(1, Math.ceil((lockedUntil - now) / 1000))
      : 0,
  };
};

const clearMemoryLoginFailures = (keyHash: string): void => {
  loginThrottleStore.delete(keyHash);
};

const getDbLoginAttemptRow = async (
  keyHash: string,
): Promise<AdminLoginAttemptRow | null | "unavailable"> => {
  const supabaseAdmin = getSupabaseAdminClient();
  if (!supabaseAdmin) {
    return "unavailable";
  }

  const { data, error } = await supabaseAdmin
    .from("admin_login_attempts")
    .select("key_hash, failure_count, window_started_at, locked_until, updated_at")
    .eq("key_hash", keyHash)
    .maybeSingle();

  if (error) {
    if (isSupabaseTableMissingError(error.message, "admin_login_attempts")) {
      return "unavailable";
    }
    console.error("[admin-auth] Unable to fetch admin login throttle row.", error.message);
    return "unavailable";
  }

  return (data as AdminLoginAttemptRow | null) ?? null;
};

const upsertDbLoginAttemptRow = async (row: {
  keyHash: string;
  failureCount: number;
  windowStartedAtIso: string;
  lockedUntilIso: string | null;
}): Promise<boolean> => {
  const supabaseAdmin = getSupabaseAdminClient();
  if (!supabaseAdmin) {
    return false;
  }

  const { error } = await supabaseAdmin.from("admin_login_attempts").upsert(
    {
      key_hash: row.keyHash,
      failure_count: row.failureCount,
      window_started_at: row.windowStartedAtIso,
      locked_until: row.lockedUntilIso,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "key_hash" },
  );

  if (error) {
    if (isSupabaseTableMissingError(error.message, "admin_login_attempts")) {
      return false;
    }
    console.error("[admin-auth] Unable to upsert admin login throttle row.", error.message);
    return false;
  }

  return true;
};

const clearDbLoginAttemptRow = async (keyHash: string): Promise<boolean> => {
  const supabaseAdmin = getSupabaseAdminClient();
  if (!supabaseAdmin) {
    return false;
  }

  const { error } = await supabaseAdmin
    .from("admin_login_attempts")
    .delete()
    .eq("key_hash", keyHash);

  if (error) {
    if (isSupabaseTableMissingError(error.message, "admin_login_attempts")) {
      return false;
    }
    console.error("[admin-auth] Unable to clear admin login throttle row.", error.message);
    return false;
  }

  return true;
};

const issueDbSessionToken = async (): Promise<string | null> => {
  const supabaseAdmin = getSupabaseAdminClient();
  if (!supabaseAdmin) {
    return null;
  }

  const rawToken = randomBytes(48).toString("base64url");
  const tokenHash = hashSessionToken(rawToken);
  if (!tokenHash) {
    return null;
  }

  const expiresAtIso = new Date(Date.now() + SESSION_MAX_AGE_SECONDS * 1000).toISOString();

  const { error } = await supabaseAdmin.from("admin_auth_sessions").insert({
    token_hash: tokenHash,
    expires_at: expiresAtIso,
  });

  if (error) {
    if (isSupabaseTableMissingError(error.message, "admin_auth_sessions")) {
      return null;
    }

    const authHint = isSupabaseAuthOrPermissionError(error.message)
      ? " Check SUPABASE_SERVICE_ROLE_KEY and restart the server."
      : "";
    console.error(
      `[admin-auth] Unable to issue DB-backed admin session.${authHint}`,
      error.message,
    );
    throw new Error("Unable to issue admin session.");
  }

  return rawToken;
};

const validateDbSessionToken = async (
  rawToken: string,
): Promise<"valid" | "invalid" | "unavailable"> => {
  const supabaseAdmin = getSupabaseAdminClient();
  if (!supabaseAdmin) {
    return "unavailable";
  }

  const tokenHash = hashSessionToken(rawToken);
  if (!tokenHash) {
    return "invalid";
  }

  const { data, error } = await supabaseAdmin
    .from("admin_auth_sessions")
    .select("id, expires_at, revoked_at, last_seen_at")
    .eq("token_hash", tokenHash)
    .maybeSingle();

  if (error) {
    if (isSupabaseTableMissingError(error.message, "admin_auth_sessions")) {
      return "unavailable";
    }

    console.error("[admin-auth] Unable to validate admin session.", error.message);
    return "invalid";
  }

  if (!data) {
    return "invalid";
  }

  const session = data as AdminSessionRow;
  if (session.revoked_at) {
    return "invalid";
  }

  const expiresAt = new Date(session.expires_at).getTime();
  if (Number.isNaN(expiresAt) || expiresAt <= Date.now()) {
    return "invalid";
  }

  const lastSeenAt = session.last_seen_at ? new Date(session.last_seen_at).getTime() : null;
  if (
    lastSeenAt === null ||
    Number.isNaN(lastSeenAt) ||
    Date.now() - lastSeenAt >= SESSION_REFRESH_INTERVAL_SECONDS * 1000
  ) {
    void supabaseAdmin
      .from("admin_auth_sessions")
      .update({ last_seen_at: new Date().toISOString() })
      .eq("id", session.id);
  }

  return "valid";
};

const revokeDbSessionToken = async (rawToken: string): Promise<void> => {
  const supabaseAdmin = getSupabaseAdminClient();
  if (!supabaseAdmin) {
    return;
  }

  const tokenHash = hashSessionToken(rawToken);
  if (!tokenHash) {
    return;
  }

  const { error } = await supabaseAdmin
    .from("admin_auth_sessions")
    .update({ revoked_at: new Date().toISOString() })
    .eq("token_hash", tokenHash)
    .is("revoked_at", null);

  if (error && !isSupabaseTableMissingError(error.message, "admin_auth_sessions")) {
    console.error("[admin-auth] Unable to revoke admin session.", error.message);
  }
};

const verifyPbkdf2PasswordHash = (candidate: string, configuredHash: string): boolean => {
  // Expected format: pbkdf2_sha256$<iterations>$<salt>$<hex_digest>
  const [scheme, iterationsValue, salt, expectedHexDigest] = configuredHash.split("$");
  if (
    scheme !== "pbkdf2_sha256" ||
    !iterationsValue ||
    !salt ||
    !expectedHexDigest
  ) {
    return false;
  }

  const iterations = Number(iterationsValue);
  if (!Number.isInteger(iterations) || iterations < 10_000 || iterations > 1_000_000) {
    return false;
  }

  const expectedDigest = expectedHexDigest.trim().toLowerCase();
  if (!/^[a-f0-9]{32,256}$/i.test(expectedDigest)) {
    return false;
  }

  const derivedDigest = pbkdf2Sync(candidate, salt, iterations, expectedDigest.length / 2, "sha256")
    .toString("hex")
    .toLowerCase();

  return safeEqual(derivedDigest, expectedDigest);
};

export const isAdminAuthConfigured = (): boolean => {
  return Boolean(getConfiguredAdminPassword() || getConfiguredAdminPasswordHash());
};

export const verifyAdminPassword = (candidatePassword: string): boolean => {
  const candidate = candidatePassword.trim();
  if (!candidate) {
    return false;
  }

  const configuredPasswordHash = getConfiguredAdminPasswordHash();
  if (configuredPasswordHash) {
    return verifyPbkdf2PasswordHash(candidate, configuredPasswordHash);
  }

  const configuredPassword = getConfiguredAdminPassword();
  if (!configuredPassword) {
    return false;
  }

  return safeEqual(candidate, configuredPassword);
};

export const getAdminLoginAllowance = async (): Promise<AdminLoginAllowance> => {
  const keyHash = getRequestFingerprintHash();
  const now = Date.now();

  const dbRow = await getDbLoginAttemptRow(keyHash);
  if (dbRow !== "unavailable") {
    if (!dbRow) {
      return { allowed: true, context: { keyHash } };
    }

    const lockedUntilTimestamp = dbRow.locked_until
      ? new Date(dbRow.locked_until).getTime()
      : 0;

    if (!Number.isNaN(lockedUntilTimestamp) && lockedUntilTimestamp > now) {
      return {
        allowed: false,
        retryAfterSeconds: Math.max(1, Math.ceil((lockedUntilTimestamp - now) / 1000)),
      };
    }

    const windowStartedAt = new Date(dbRow.window_started_at).getTime();
    if (
      Number.isFinite(windowStartedAt) &&
      now - windowStartedAt > LOGIN_ATTEMPT_WINDOW_MS
    ) {
      const resetResult = await upsertDbLoginAttemptRow({
        keyHash,
        failureCount: 0,
        windowStartedAtIso: new Date(now).toISOString(),
        lockedUntilIso: null,
      });

      if (!resetResult) {
        return checkMemoryLoginAllowance(keyHash, now);
      }
    }

    return { allowed: true, context: { keyHash } };
  }

  return checkMemoryLoginAllowance(keyHash, now);
};

export const registerAdminLoginFailure = async (
  context: AdminLoginThrottleContext,
): Promise<AdminLoginFailureResult> => {
  const now = Date.now();
  const keyHash = context.keyHash;

  const dbRow = await getDbLoginAttemptRow(keyHash);
  if (dbRow !== "unavailable") {
    const currentFailureCount = dbRow?.failure_count ?? 0;
    const windowStartedAt = dbRow?.window_started_at
      ? new Date(dbRow.window_started_at).getTime()
      : now;
    const isWithinWindow =
      Number.isFinite(windowStartedAt) && now - windowStartedAt <= LOGIN_ATTEMPT_WINDOW_MS;
    const nextFailureCount = isWithinWindow ? currentFailureCount + 1 : 1;
    const nextWindowStartedAt = isWithinWindow ? windowStartedAt : now;
    const shouldLock = nextFailureCount >= MAX_LOGIN_ATTEMPTS;
    const lockedUntilTimestamp = shouldLock ? now + LOGIN_LOCKOUT_MS : 0;

    const persisted = await upsertDbLoginAttemptRow({
      keyHash,
      failureCount: nextFailureCount,
      windowStartedAtIso: new Date(nextWindowStartedAt).toISOString(),
      lockedUntilIso: shouldLock ? new Date(lockedUntilTimestamp).toISOString() : null,
    });

    if (!persisted) {
      return recordMemoryLoginFailure(keyHash, now);
    }

    return {
      locked: shouldLock,
      retryAfterSeconds: shouldLock
        ? Math.max(1, Math.ceil((lockedUntilTimestamp - now) / 1000))
        : 0,
    };
  }

  return recordMemoryLoginFailure(keyHash, now);
};

export const clearAdminLoginFailures = async (
  context: AdminLoginThrottleContext,
): Promise<void> => {
  const clearedFromDb = await clearDbLoginAttemptRow(context.keyHash);
  if (!clearedFromDb) {
    clearMemoryLoginFailures(context.keyHash);
  }
};

export const hasValidAdminSession = async (): Promise<boolean> => {
  if (!isAdminAuthConfigured()) {
    return false;
  }

  const sessionCookie = cookies().get(ADMIN_SESSION_COOKIE)?.value;
  if (!sessionCookie) {
    return false;
  }

  const dbValidationResult = await validateDbSessionToken(sessionCookie);
  if (dbValidationResult === "valid") {
    return true;
  }

  if (dbValidationResult === "invalid") {
    return false;
  }

  return isFallbackSignedSessionTokenValid(sessionCookie);
};

export const createAdminSession = async (): Promise<void> => {
  if (!isAdminAuthConfigured()) {
    return;
  }

  const dbSessionToken = await issueDbSessionToken();
  const sessionToken = dbSessionToken ?? buildFallbackSignedSessionToken();

  if (!sessionToken) {
    throw new Error("Unable to generate admin session token.");
  }

  const expiresAt = new Date(Date.now() + SESSION_MAX_AGE_SECONDS * 1000);

  cookies().set({
    name: ADMIN_SESSION_COOKIE,
    value: sessionToken,
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
    expires: expiresAt,
  });
};

export const clearAdminSession = async (): Promise<void> => {
  const currentSessionToken = cookies().get(ADMIN_SESSION_COOKIE)?.value;

  if (currentSessionToken) {
    await revokeDbSessionToken(currentSessionToken);
  }

  cookies().set({
    name: ADMIN_SESSION_COOKIE,
    value: "",
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
    expires: new Date(0),
  });
  cookies().delete(ADMIN_SESSION_COOKIE);
};
