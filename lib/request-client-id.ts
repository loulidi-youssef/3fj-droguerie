import { createHash } from "node:crypto";
import { isIP } from "node:net";
import type { NextRequest } from "next/server";

type HeaderReader = {
  get(name: string): string | null;
};

const KNOWN_TRUSTABLE_IP_HEADERS = new Set([
  "cf-connecting-ip",
  "fly-client-ip",
  "fastly-client-ip",
  "true-client-ip",
  "x-vercel-forwarded-for",
]);

const hasTruthyEnv = (value: string | undefined): boolean => {
  if (!value) {
    return false;
  }

  const normalized = value.trim().toLowerCase();
  return normalized !== "" && normalized !== "0" && normalized !== "false";
};

const pushHeaderIfKnown = (list: string[], header: string): void => {
  if (!KNOWN_TRUSTABLE_IP_HEADERS.has(header)) {
    return;
  }

  if (!list.includes(header)) {
    list.push(header);
  }
};

const getTrustedIpHeaderOrder = (): string[] => {
  const trustedHeaders: string[] = [];

  if (hasTruthyEnv(process.env.VERCEL)) {
    pushHeaderIfKnown(trustedHeaders, "x-vercel-forwarded-for");
  }

  if (hasTruthyEnv(process.env.CF_PAGES) || hasTruthyEnv(process.env.CLOUDFLARE)) {
    pushHeaderIfKnown(trustedHeaders, "cf-connecting-ip");
  }

  if (hasTruthyEnv(process.env.FLY_APP_NAME)) {
    pushHeaderIfKnown(trustedHeaders, "fly-client-ip");
  }

  if (hasTruthyEnv(process.env.FASTLY_SERVICE_ID)) {
    pushHeaderIfKnown(trustedHeaders, "fastly-client-ip");
    pushHeaderIfKnown(trustedHeaders, "true-client-ip");
  }

  const configuredHeaders = (process.env.TRUSTED_CLIENT_IP_HEADERS ?? "")
    .split(",")
    .map((header) => header.trim().toLowerCase())
    .filter((header) => header.length > 0);

  for (const configuredHeader of configuredHeaders) {
    pushHeaderIfKnown(trustedHeaders, configuredHeader);
  }

  return trustedHeaders;
};

const normalizeIpCandidate = (value: string): string | null => {
  const firstToken = value.split(",")[0]?.trim() ?? "";
  if (!firstToken) {
    return null;
  }

  let candidate = firstToken.replace(/^for="?/i, "").replace(/"$/, "").trim();
  candidate = candidate.replace(/^\[|\]$/g, "");

  if (candidate.startsWith("::ffff:")) {
    candidate = candidate.slice(7);
  }

  if (isIP(candidate) === 0) {
    const maybeHostWithPort = /^([0-9.]+):([0-9]+)$/.exec(candidate);
    if (maybeHostWithPort?.[1] && isIP(maybeHostWithPort[1]) !== 0) {
      candidate = maybeHostWithPort[1];
    }
  }

  return isIP(candidate) !== 0 ? candidate : null;
};

export const normalizeUserAgent = (value: string | null | undefined): string => {
  if (!value) {
    return "";
  }

  return value.trim().replace(/\s+/g, " ").slice(0, 240);
};

export const getTrustedClientIpFromHeaders = (headers: HeaderReader): string | null => {
  for (const headerName of getTrustedIpHeaderOrder()) {
    const raw = headers.get(headerName);
    if (!raw) {
      continue;
    }

    const normalized = normalizeIpCandidate(raw);
    if (normalized) {
      return normalized;
    }
  }

  return null;
};

const buildRequestFingerprint = (headers: HeaderReader): string => {
  const ip = getTrustedClientIpFromHeaders(headers) ?? "ip-unavailable";
  const userAgent = normalizeUserAgent(headers.get("user-agent")) || "ua-unavailable";
  const acceptLanguage =
    headers.get("accept-language")?.trim().replace(/\s+/g, " ").slice(0, 120) ||
    "lang-unavailable";

  return `${ip}|${userAgent}|${acceptLanguage}`;
};

export const hashText = (value: string): string => {
  return createHash("sha256").update(value).digest("hex");
};

export const getRequestFingerprintHashFromHeaders = (headers: HeaderReader): string => {
  return hashText(buildRequestFingerprint(headers));
};

export const getTrustedClientIp = (request: NextRequest): string | null => {
  return getTrustedClientIpFromHeaders(request.headers);
};

export const getRequestFingerprintHash = (request: NextRequest): string => {
  return getRequestFingerprintHashFromHeaders(request.headers);
};
