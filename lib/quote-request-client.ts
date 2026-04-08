"use client";

import { getSupabaseBrowserClient } from "@/lib/supabase/browser";

type QuoteRequestClientItem = {
  productId: string;
  quantity: number;
  variantId?: string;
  selectedColor?: string;
  selectedSize?: string;
};

type QuoteRequestClientPayload = {
  source: string;
  fulfillmentMethod?: "delivery" | "pickup";
  items: QuoteRequestClientItem[];
};

type CaptureQuoteAndRedirectInput = {
  whatsappUrl: string;
  payload: QuoteRequestClientPayload;
  accessToken?: string | null;
  openInNewTab?: boolean;
  maxWaitMs?: number;
};

const QUOTE_ANONYMOUS_ID_STORAGE_KEY = "3fj-quote-anonymous-id";
const DEFAULT_CAPTURE_WAIT_MS = 900;

const toAnonymousId = (): string => {
  const randomSuffix =
    typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
      ? crypto.randomUUID().replace(/-/g, "")
      : `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 14)}`;

  return `qr_${randomSuffix.slice(0, 36)}`;
};

export const getOrCreateQuoteAnonymousId = (): string => {
  if (typeof window === "undefined") {
    return toAnonymousId();
  }

  const existing = window.localStorage.getItem(QUOTE_ANONYMOUS_ID_STORAGE_KEY)?.trim();
  if (existing && /^[a-zA-Z0-9._:-]{6,120}$/.test(existing)) {
    return existing;
  }

  const next = toAnonymousId();
  window.localStorage.setItem(QUOTE_ANONYMOUS_ID_STORAGE_KEY, next);
  return next;
};

const resolveAccessToken = async (
  explicitAccessToken?: string | null,
): Promise<string | null> => {
  if (explicitAccessToken?.trim()) {
    return explicitAccessToken.trim();
  }

  const supabase = getSupabaseBrowserClient();
  if (!supabase) {
    return null;
  }

  try {
    const { data } = await supabase.auth.getSession();
    return data.session?.access_token ?? null;
  } catch {
    return null;
  }
};

const postQuoteRequest = async (
  payload: QuoteRequestClientPayload,
  accessToken: string | null,
  timeoutMs: number,
): Promise<boolean> => {
  const anonymousId = getOrCreateQuoteAnonymousId();
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch("/api/quote-requests", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      },
      body: JSON.stringify({
        ...payload,
        anonymousId,
      }),
      keepalive: true,
      signal: controller.signal,
    });

    return response.ok;
  } catch {
    return false;
  } finally {
    window.clearTimeout(timeout);
  }
};

const openWhatsApp = (whatsappUrl: string, openInNewTab: boolean): void => {
  if (openInNewTab) {
    const opened = window.open(whatsappUrl, "_blank", "noopener,noreferrer");
    if (!opened) {
      window.location.assign(whatsappUrl);
    }
    return;
  }

  window.location.assign(whatsappUrl);
};

export const captureQuoteRequestAndRedirectToWhatsApp = async (
  input: CaptureQuoteAndRedirectInput,
): Promise<{ recorded: boolean }> => {
  const openInNewTab = input.openInNewTab !== false;
  const maxWaitMs =
    typeof input.maxWaitMs === "number" && Number.isFinite(input.maxWaitMs)
      ? Math.max(200, Math.floor(input.maxWaitMs))
      : DEFAULT_CAPTURE_WAIT_MS;

  let preOpenedWindow: Window | null = null;
  if (openInNewTab) {
    preOpenedWindow = window.open("", "_blank");
    if (preOpenedWindow) {
      preOpenedWindow.opener = null;
    }
  }

  const accessToken = await resolveAccessToken(input.accessToken);
  const recorded = await postQuoteRequest(input.payload, accessToken, maxWaitMs);

  if (preOpenedWindow && !preOpenedWindow.closed) {
    preOpenedWindow.location.href = input.whatsappUrl;
    return { recorded };
  }

  openWhatsApp(input.whatsappUrl, openInNewTab);
  return { recorded };
};

