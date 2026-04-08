import "server-only";

import { getSupabaseAdminClient } from "@/lib/supabase/admin";

export const QUOTE_REQUEST_STATUSES = [
  "new",
  "contacted",
  "converted",
  "closed",
] as const;

export type QuoteRequestStatus = (typeof QUOTE_REQUEST_STATUSES)[number];
export type QuoteRequestFulfillmentMethod = "delivery" | "pickup" | null;

export type QuoteRequestPayloadItem = {
  productId: string;
  productName: string;
  variantId: string | null;
  variantLabel: string | null;
  quantity: number;
  unitLabel: string | null;
  estimatedUnitPrice: number;
  estimatedTotal: number;
};

export type QuoteRequestPayload = {
  source: string;
  fulfillmentMethod: QuoteRequestFulfillmentMethod;
  items: QuoteRequestPayloadItem[];
  summary: {
    lineCount: number;
    totalQuantity: number;
    estimatedSubtotal: number;
  };
  context: {
    requestFingerprintHash: string;
    userAgent: string | null;
  };
};

export type QuoteRequestRecord = {
  id: string;
  created_at: string;
  updated_at: string;
  user_id: string | null;
  anonymous_id: string;
  status: QuoteRequestStatus;
  payload: QuoteRequestPayload;
};

type CreateQuoteRequestInput = {
  userId: string | null;
  anonymousId: string;
  payload: QuoteRequestPayload;
  status?: QuoteRequestStatus;
};

const ANONYMOUS_ID_PATTERN = /^[a-zA-Z0-9._:-]{6,120}$/;

export const isQuoteRequestStatus = (value: string): value is QuoteRequestStatus => {
  return QUOTE_REQUEST_STATUSES.includes(value as QuoteRequestStatus);
};

export const normalizeQuoteRequestStatus = (
  value: unknown,
): QuoteRequestStatus | null => {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim().toLowerCase();
  return isQuoteRequestStatus(trimmed) ? trimmed : null;
};

export const normalizeQuoteRequestAnonymousId = (
  value: unknown,
): string | null => {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  if (!ANONYMOUS_ID_PATTERN.test(trimmed)) {
    return null;
  }

  return trimmed;
};

const normalizePayload = (payload: QuoteRequestPayload): QuoteRequestPayload => {
  const normalizedItems = payload.items.map((item) => ({
    productId: item.productId.trim(),
    productName: item.productName.trim(),
    variantId: item.variantId?.trim() || null,
    variantLabel: item.variantLabel?.trim() || null,
    quantity: item.quantity,
    unitLabel: item.unitLabel?.trim() || null,
    estimatedUnitPrice: item.estimatedUnitPrice,
    estimatedTotal: item.estimatedTotal,
  }));

  const totalQuantity = normalizedItems.reduce((sum, item) => sum + item.quantity, 0);
  const estimatedSubtotal = normalizedItems.reduce(
    (sum, item) => sum + item.estimatedTotal,
    0,
  );

  return {
    source: payload.source.trim().slice(0, 64) || "unknown",
    fulfillmentMethod: payload.fulfillmentMethod,
    items: normalizedItems,
    summary: {
      lineCount: normalizedItems.length,
      totalQuantity,
      estimatedSubtotal,
    },
    context: {
      requestFingerprintHash: payload.context.requestFingerprintHash,
      userAgent: payload.context.userAgent,
    },
  };
};

export const createQuoteRequest = async (
  input: CreateQuoteRequestInput,
): Promise<{ id: string } | null> => {
  const supabaseAdmin = getSupabaseAdminClient();
  if (!supabaseAdmin) {
    return null;
  }

  const normalizedAnonymousId = normalizeQuoteRequestAnonymousId(input.anonymousId);
  if (!normalizedAnonymousId) {
    return null;
  }

  const normalizedStatus = input.status ?? "new";
  if (!isQuoteRequestStatus(normalizedStatus)) {
    return null;
  }

  const normalizedPayload = normalizePayload(input.payload);
  if (normalizedPayload.items.length === 0) {
    return null;
  }

  const { data, error } = await supabaseAdmin
    .from("quote_requests")
    .insert({
      user_id: input.userId,
      anonymous_id: normalizedAnonymousId,
      payload: normalizedPayload,
      status: normalizedStatus,
    })
    .select("id")
    .maybeSingle();

  if (error || !data?.id) {
    return null;
  }

  return {
    id: data.id as string,
  };
};
