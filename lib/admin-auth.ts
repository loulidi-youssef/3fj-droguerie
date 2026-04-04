import { createHash, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";

export const ADMIN_SESSION_COOKIE = "3fj-admin-session";
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 8;

const getConfiguredAdminPassword = (): string | null => {
  const configured =
    process.env.ADMIN_ACCESS_PASSWORD?.trim() ?? process.env.ADMIN_PASSWORD?.trim();
  return configured ? configured : null;
};

const createSessionValue = (password: string): string => {
  return createHash("sha256")
    .update(`3fj-admin|${password}`)
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

export const isAdminAuthConfigured = (): boolean => {
  return Boolean(getConfiguredAdminPassword());
};

export const verifyAdminPassword = (candidatePassword: string): boolean => {
  const configuredPassword = getConfiguredAdminPassword();

  if (!configuredPassword) {
    return false;
  }

  const candidate = candidatePassword.trim();
  if (!candidate) {
    return false;
  }

  return safeEqual(candidate, configuredPassword);
};

export const hasValidAdminSession = (): boolean => {
  const configuredPassword = getConfiguredAdminPassword();
  if (!configuredPassword) {
    return false;
  }

  const sessionCookie = cookies().get(ADMIN_SESSION_COOKIE)?.value;
  if (!sessionCookie) {
    return false;
  }

  return safeEqual(sessionCookie, createSessionValue(configuredPassword));
};

export const createAdminSession = (): void => {
  const configuredPassword = getConfiguredAdminPassword();
  if (!configuredPassword) {
    return;
  }

  cookies().set({
    name: ADMIN_SESSION_COOKIE,
    value: createSessionValue(configuredPassword),
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
  });
};

export const clearAdminSession = (): void => {
  cookies().delete(ADMIN_SESSION_COOKIE);
};
