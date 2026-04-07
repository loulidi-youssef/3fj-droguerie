import {
  createHash,
  createHmac,
  pbkdf2Sync,
  randomBytes,
  randomUUID,
  timingSafeEqual,
} from "crypto";
import { cookies, headers } from "next/headers";
import { getRequestFingerprintHashFromHeaders } from "@/lib/request-client-id";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

export const ADMIN_SESSION_COOKIE = "3fj-admin-session";
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 8;
const SESSION_SIGNATURE_VERSION = "v2";
const SESSION_REFRESH_INTERVAL_SECONDS = 15 * 60;
const LOGIN_ATTEMPT_WINDOW_MS = 15 * 60 * 1000;
const LOGIN_LOCKOUT_MS = 15 * 60 * 1000;
const MAX_LOGIN_ATTEMPTS = 5;
const MIN_SESSION_SECRET_LENGTH = 16;
const MIN_PRODUCTION_SESSION_SECRET_LENGTH = 32;
const MIN_PBKDF2_ITERATIONS = 100_000;
const MAX_PBKDF2_ITERATIONS = 1_000_000;
const PBKDF2_DIGEST_HEX_LENGTH = 64;
const PBKDF2_MIN_SALT_LENGTH = 8;

const loggedAdminAuthConfigMessages = new Set<string>();

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

type ParsedPbkdf2PasswordHash = {
  iterations: number;
  salt: string;
  expectedDigest: string;
};

type Pbkdf2PasswordHashParseResult =
  | {
      ok: true;
      value: ParsedPbkdf2PasswordHash;
    }
  | {
      ok: false;
      reason: string;
    };

type AdminAuthConfigStatus =
  | "ok"
  | "missing-password"
  | "missing-password-hash"
  | "unsupported-password-hash-algorithm"
  | "invalid-password-hash"
  | "plaintext-password-disallowed"
  | "missing-session-secret"
  | "weak-session-secret";

type ResolvedAdminAuthConfig = {
  status: AdminAuthConfigStatus;
  isProduction: boolean;
  passwordHash: string | null;
  parsedPasswordHash: ParsedPbkdf2PasswordHash | null;
  invalidPasswordHashReason: string | null;
  plaintextPassword: string | null;
  sessionSecret: string | null;
};

const stripOptionalWrappingQuotes = (value: string): string => {
  if (value.length < 2) {
    return value;
  }

  const startsWithDoubleQuote = value.startsWith("\"") && value.endsWith("\"");
  const startsWithSingleQuote = value.startsWith("'") && value.endsWith("'");
  if (!startsWithDoubleQuote && !startsWithSingleQuote) {
    return value;
  }

  return value.slice(1, -1).trim();
};

const readEnv = (value: string | undefined): string | null => {
  const normalized = value?.trim();
  if (!normalized) {
    return null;
  }

  const unwrapped = stripOptionalWrappingQuotes(normalized);
  if (!unwrapped) {
    return null;
  }

  const sanitized = unwrapped.trim();
  if (!sanitized) {
    return null;
  }

  return sanitized;
};

const getConfiguredAdminPasswordHash = (): string | null => {
  return readEnv(process.env.ADMIN_ACCESS_PASSWORD_HASH);
};

const getConfiguredAdminPassword = (): string | null => {
  const configured = readEnv(process.env.ADMIN_ACCESS_PASSWORD) ?? readEnv(process.env.ADMIN_PASSWORD);
  return configured;
};

const isProductionEnvironment = (): boolean => process.env.NODE_ENV === "production";

const logAdminAuthConfigMessageOnce = (
  level: "warn" | "error",
  code: string,
  message: string,
): void => {
  if (loggedAdminAuthConfigMessages.has(code)) {
    return;
  }
  loggedAdminAuthConfigMessages.add(code);
  if (level === "error") {
    console.error(`[admin-auth] ${message}`);
    return;
  }
  console.warn(`[admin-auth] ${message}`);
};

const parsePbkdf2PasswordHash = (
  configuredHash: string,
): Pbkdf2PasswordHashParseResult => {
  // Expected format: pbkdf2_sha256$<iterations>$<salt>$<hex_digest>
  const splitParts = configuredHash.split("$");
  if (splitParts.length !== 4) {
    const missingSeparatorHint =
      configuredHash.startsWith("pbkdf2_sha256") && !configuredHash.includes("$")
        ? " The value appears truncated; ensure '$' separators are preserved when setting the env var."
        : "";
    return {
      ok: false,
      reason:
        "Expected exactly four '$'-separated segments: pbkdf2_sha256$<iterations>$<salt>$<hex_digest>." +
        missingSeparatorHint,
    };
  }

  const [scheme, iterationsValue, saltValue, expectedHexDigestValue] = splitParts;
  if (scheme !== "pbkdf2_sha256") {
    return {
      ok: false,
      reason: "Unsupported scheme. Expected pbkdf2_sha256.",
    };
  }

  const iterations = Number(iterationsValue);
  if (
    !Number.isInteger(iterations) ||
    iterations < MIN_PBKDF2_ITERATIONS ||
    iterations > MAX_PBKDF2_ITERATIONS
  ) {
    return {
      ok: false,
      reason: `Iterations must be an integer between ${MIN_PBKDF2_ITERATIONS} and ${MAX_PBKDF2_ITERATIONS}.`,
    };
  }

  const salt = saltValue.trim();
  if (!salt || salt.length < PBKDF2_MIN_SALT_LENGTH) {
    return {
      ok: false,
      reason: `Salt is too short. Use at least ${PBKDF2_MIN_SALT_LENGTH} characters.`,
    };
  }

  const expectedDigest = expectedHexDigestValue.trim().toLowerCase();
  if (!/^[a-f0-9]+$/i.test(expectedDigest)) {
    return {
      ok: false,
      reason: "Digest must be lowercase/uppercase hex.",
    };
  }

  if (expectedDigest.length !== PBKDF2_DIGEST_HEX_LENGTH) {
    return {
      ok: false,
      reason: `Digest must be ${PBKDF2_DIGEST_HEX_LENGTH} hex characters (sha256).`,
    };
  }

  return {
    ok: true,
    value: {
      iterations,
      salt,
      expectedDigest,
    },
  };
};

const looksLikeBcryptHash = (value: string): boolean => {
  return /^\$2[aby]\$\d{2}\$/.test(value.trim());
};

const deriveSessionSecret = (input: string): string => {
  return createHash("sha256")
    .update(`3fj-admin-session|${input}`)
    .digest("hex");
};

const formatInvalidPasswordHashMessage = (
  baseMessage: string,
  reason: string | null,
): string => {
  if (!reason) {
    return baseMessage;
  }
  return `${baseMessage} Reason: ${reason}`;
};

const logAdminAuthConfigStatus = (config: ResolvedAdminAuthConfig): void => {
  if (config.status === "ok") {
    if (!config.isProduction && config.passwordHash && config.plaintextPassword) {
      logAdminAuthConfigMessageOnce(
        "warn",
        "dev-both-hash-and-plaintext-password",
        "Both ADMIN_ACCESS_PASSWORD_HASH and plaintext admin password are set. The hash will be used.",
      );
    }
    return;
  }

  if (config.isProduction) {
    if (config.status === "missing-password-hash") {
      logAdminAuthConfigMessageOnce(
        "error",
        "prod-missing-password-hash",
        "Production admin auth requires ADMIN_ACCESS_PASSWORD_HASH.",
      );
      return;
    }
    if (config.status === "invalid-password-hash") {
      logAdminAuthConfigMessageOnce(
        "error",
        "prod-invalid-password-hash",
        formatInvalidPasswordHashMessage(
          "ADMIN_ACCESS_PASSWORD_HASH is present but invalid. Expected pbkdf2_sha256$<iterations>$<salt>$<hex_digest>.",
          config.invalidPasswordHashReason,
        ),
      );
      return;
    }
    if (config.status === "unsupported-password-hash-algorithm") {
      logAdminAuthConfigMessageOnce(
        "error",
        "prod-unsupported-password-hash-algorithm",
        "ADMIN_ACCESS_PASSWORD_HASH must use pbkdf2_sha256. bcrypt hashes are not supported.",
      );
      return;
    }
    if (config.status === "plaintext-password-disallowed") {
      logAdminAuthConfigMessageOnce(
        "error",
        "prod-plaintext-password-disallowed",
        "Plaintext admin password env vars are not allowed in production. Remove ADMIN_ACCESS_PASSWORD and ADMIN_PASSWORD.",
      );
      return;
    }
    if (config.status === "missing-session-secret") {
      logAdminAuthConfigMessageOnce(
        "error",
        "prod-missing-session-secret",
        "Production admin auth requires ADMIN_SESSION_SECRET (at least 32 characters).",
      );
      return;
    }
    if (config.status === "weak-session-secret") {
      logAdminAuthConfigMessageOnce(
        "error",
        "prod-weak-session-secret",
        "ADMIN_SESSION_SECRET is too short for production. Use at least 32 characters.",
      );
      return;
    }
    return;
  }

  if (config.status === "missing-password") {
    logAdminAuthConfigMessageOnce(
      "warn",
      "dev-missing-password",
      "Admin auth is not configured in development. Set ADMIN_ACCESS_PASSWORD_HASH or ADMIN_ACCESS_PASSWORD.",
    );
    return;
  }
  if (config.status === "invalid-password-hash") {
    logAdminAuthConfigMessageOnce(
      "warn",
      "dev-invalid-password-hash",
      formatInvalidPasswordHashMessage(
        "ADMIN_ACCESS_PASSWORD_HASH is present but invalid. Expected pbkdf2_sha256$<iterations>$<salt>$<hex_digest>.",
        config.invalidPasswordHashReason,
      ),
    );
    return;
  }
  if (config.status === "unsupported-password-hash-algorithm") {
    logAdminAuthConfigMessageOnce(
      "warn",
      "dev-unsupported-password-hash-algorithm",
      "ADMIN_ACCESS_PASSWORD_HASH must use pbkdf2_sha256. bcrypt hashes are not supported.",
    );
    return;
  }
  if (config.status === "weak-session-secret") {
    logAdminAuthConfigMessageOnce(
      "warn",
      "dev-weak-session-secret",
      `ADMIN_SESSION_SECRET is shorter than ${MIN_SESSION_SECRET_LENGTH} characters and will be ignored in development.`,
    );
    return;
  }
  if (config.status === "missing-session-secret") {
    logAdminAuthConfigMessageOnce(
      "warn",
      "dev-derived-session-secret",
      "ADMIN_SESSION_SECRET is not set in development. A derived fallback secret is being used.",
    );
  }
};

const resolveAdminAuthConfig = (): ResolvedAdminAuthConfig => {
  const isProduction = isProductionEnvironment();
  const passwordHash = getConfiguredAdminPasswordHash();
  const parsedPasswordHashResult = passwordHash
    ? parsePbkdf2PasswordHash(passwordHash)
    : null;
  const parsedPasswordHash =
    parsedPasswordHashResult?.ok ? parsedPasswordHashResult.value : null;
  const invalidPasswordHashReason =
    parsedPasswordHashResult && !parsedPasswordHashResult.ok
      ? parsedPasswordHashResult.reason
      : null;
  const plaintextPassword = getConfiguredAdminPassword();
  const explicitSessionSecret = readEnv(process.env.ADMIN_SESSION_SECRET);

  if (passwordHash && !parsedPasswordHash) {
    const status: AdminAuthConfigStatus = looksLikeBcryptHash(passwordHash)
      ? "unsupported-password-hash-algorithm"
      : "invalid-password-hash";
    const config: ResolvedAdminAuthConfig = {
      status,
      isProduction,
      passwordHash,
      parsedPasswordHash: null,
      invalidPasswordHashReason,
      plaintextPassword,
      sessionSecret: null,
    };
    logAdminAuthConfigStatus(config);
    return config;
  }

  if (isProduction) {
    if (!passwordHash || !parsedPasswordHash) {
      const config: ResolvedAdminAuthConfig = {
        status: "missing-password-hash",
        isProduction,
        passwordHash,
        parsedPasswordHash,
        invalidPasswordHashReason,
        plaintextPassword,
        sessionSecret: null,
      };
      logAdminAuthConfigStatus(config);
      return config;
    }

    if (plaintextPassword) {
      const config: ResolvedAdminAuthConfig = {
        status: "plaintext-password-disallowed",
        isProduction,
        passwordHash,
        parsedPasswordHash,
        invalidPasswordHashReason,
        plaintextPassword,
        sessionSecret: null,
      };
      logAdminAuthConfigStatus(config);
      return config;
    }

    if (!explicitSessionSecret) {
      const config: ResolvedAdminAuthConfig = {
        status: "missing-session-secret",
        isProduction,
        passwordHash,
        parsedPasswordHash,
        invalidPasswordHashReason,
        plaintextPassword: null,
        sessionSecret: null,
      };
      logAdminAuthConfigStatus(config);
      return config;
    }

    if (explicitSessionSecret.length < MIN_PRODUCTION_SESSION_SECRET_LENGTH) {
      const config: ResolvedAdminAuthConfig = {
        status: "weak-session-secret",
        isProduction,
        passwordHash,
        parsedPasswordHash,
        invalidPasswordHashReason,
        plaintextPassword: null,
        sessionSecret: null,
      };
      logAdminAuthConfigStatus(config);
      return config;
    }

    const config: ResolvedAdminAuthConfig = {
      status: "ok",
      isProduction,
      passwordHash,
      parsedPasswordHash,
      invalidPasswordHashReason,
      plaintextPassword: null,
      sessionSecret: explicitSessionSecret,
    };
    logAdminAuthConfigStatus(config);
    return config;
  }

  if (!parsedPasswordHash && !plaintextPassword) {
    const config: ResolvedAdminAuthConfig = {
      status: "missing-password",
      isProduction,
      passwordHash,
      parsedPasswordHash,
      invalidPasswordHashReason,
      plaintextPassword,
      sessionSecret: null,
    };
    logAdminAuthConfigStatus(config);
    return config;
  }

  if (explicitSessionSecret && explicitSessionSecret.length >= MIN_SESSION_SECRET_LENGTH) {
    const config: ResolvedAdminAuthConfig = {
      status: "ok",
      isProduction,
      passwordHash,
      parsedPasswordHash,
      invalidPasswordHashReason,
      plaintextPassword,
      sessionSecret: explicitSessionSecret,
    };
    logAdminAuthConfigStatus(config);
    return config;
  }

  if (explicitSessionSecret && explicitSessionSecret.length < MIN_SESSION_SECRET_LENGTH) {
    const warningConfig: ResolvedAdminAuthConfig = {
      status: "weak-session-secret",
      isProduction,
      passwordHash,
      parsedPasswordHash,
      invalidPasswordHashReason,
      plaintextPassword,
      sessionSecret: null,
    };
    logAdminAuthConfigStatus(warningConfig);
  }

  const secretSeed = passwordHash ?? plaintextPassword;
  if (!secretSeed) {
    const config: ResolvedAdminAuthConfig = {
      status: "missing-session-secret",
      isProduction,
      passwordHash,
      parsedPasswordHash,
      invalidPasswordHashReason,
      plaintextPassword,
      sessionSecret: null,
    };
    logAdminAuthConfigStatus(config);
    return config;
  }

  const derivedConfig: ResolvedAdminAuthConfig = {
    status: "missing-session-secret",
    isProduction,
    passwordHash,
    parsedPasswordHash,
    invalidPasswordHashReason,
    plaintextPassword,
    sessionSecret: null,
  };
  logAdminAuthConfigStatus(derivedConfig);

  const config: ResolvedAdminAuthConfig = {
    status: "ok",
    isProduction,
    passwordHash,
    parsedPasswordHash,
    invalidPasswordHashReason,
    plaintextPassword,
    sessionSecret: deriveSessionSecret(secretSeed),
  };
  logAdminAuthConfigStatus(config);
  return config;
};

const getSessionSecret = (): string | null => {
  const config = resolveAdminAuthConfig();
  if (config.status !== "ok") {
    return null;
  }
  return config.sessionSecret;
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
  return getRequestFingerprintHashFromHeaders(requestHeaders);
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

const verifyPbkdf2PasswordHash = (
  candidate: string,
  configuredHash: ParsedPbkdf2PasswordHash,
): boolean => {
  const derivedDigest = pbkdf2Sync(
    candidate,
    configuredHash.salt,
    configuredHash.iterations,
    configuredHash.expectedDigest.length / 2,
    "sha256",
  )
    .toString("hex")
    .toLowerCase();

  return safeEqual(derivedDigest, configuredHash.expectedDigest);
};

export const isAdminAuthConfigured = (): boolean => {
  return resolveAdminAuthConfig().status === "ok";
};

export const verifyAdminPassword = (candidatePassword: string): boolean => {
  const candidate = candidatePassword.trim();
  if (!candidate) {
    return false;
  }

  const config = resolveAdminAuthConfig();
  if (config.status !== "ok") {
    return false;
  }

  if (config.parsedPasswordHash) {
    return verifyPbkdf2PasswordHash(candidate, config.parsedPasswordHash);
  }

  if (!config.plaintextPassword || config.isProduction) {
    return false;
  }

  return safeEqual(candidate, config.plaintextPassword);
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
        console.error("[admin-auth] Unable to reset expired admin login throttle window.");
        return {
          allowed: false,
          retryAfterSeconds: 60,
        };
      }
    }

    return { allowed: true, context: { keyHash } };
  }

  console.error("[admin-auth] Login throttling unavailable: admin_login_attempts storage not accessible.");
  return {
    allowed: false,
    retryAfterSeconds: 60,
  };
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
      console.error("[admin-auth] Unable to persist admin login failure increment.");
      return {
        locked: true,
        retryAfterSeconds: 60,
      };
    }

    return {
      locked: shouldLock,
      retryAfterSeconds: shouldLock
        ? Math.max(1, Math.ceil((lockedUntilTimestamp - now) / 1000))
        : 0,
    };
  }

  console.error("[admin-auth] Unable to persist admin login failure: DB throttling unavailable.");
  return {
    locked: true,
    retryAfterSeconds: 60,
  };
};

export const clearAdminLoginFailures = async (
  context: AdminLoginThrottleContext,
): Promise<void> => {
  const clearedFromDb = await clearDbLoginAttemptRow(context.keyHash);
  if (!clearedFromDb) {
    console.error("[admin-auth] Unable to clear admin login failures from DB.");
  }
};

export const hasValidAdminSession = async (): Promise<boolean> => {
  if (resolveAdminAuthConfig().status !== "ok") {
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
  if (resolveAdminAuthConfig().status !== "ok") {
    throw new Error("Admin authentication is not securely configured.");
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
