import "server-only";

import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  QUOTE_REQUEST_STATUSES,
  isQuoteRequestStatus,
  type QuoteRequestPayload,
  type QuoteRequestStatus,
} from "@/lib/quote-requests";

type QuoteRequestRow = {
  id: string;
  created_at: string;
  updated_at: string;
  user_id: string | null;
  anonymous_id: string;
  status: string;
  payload: unknown;
};

export type AdminQuoteRequest = {
  id: string;
  createdAt: string;
  updatedAt: string;
  userId: string | null;
  anonymousId: string;
  status: QuoteRequestStatus;
  payload: QuoteRequestPayload;
};

export const QUOTE_STATUS_LABEL: Record<QuoteRequestStatus, string> = {
  new: "Nouveau",
  contacted: "Contacte",
  converted: "Converti",
  closed: "Clos",
};

export const QUOTE_STATUS_BADGE_CLASSNAME: Record<QuoteRequestStatus, string> = {
  new: "bg-sky-100 text-sky-700",
  contacted: "bg-amber-100 text-amber-700",
  converted: "bg-emerald-100 text-emerald-700",
  closed: "bg-slate-200 text-slate-700",
};

export const NEXT_QUOTE_STATUSES: Record<QuoteRequestStatus, QuoteRequestStatus[]> = {
  new: ["contacted"],
  contacted: ["converted"],
  converted: ["closed"],
  closed: [],
};

const isObjectRecord = (value: unknown): value is Record<string, unknown> => {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
};

const toNonEmptyString = (value: unknown): string | null => {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const toPositiveInteger = (value: unknown): number | null => {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return null;
  }

  const normalized = Math.floor(value);
  if (!Number.isSafeInteger(normalized) || normalized <= 0) {
    return null;
  }

  return normalized;
};

const toNonNegativeInteger = (value: unknown): number | null => {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return null;
  }

  const normalized = Math.round(value);
  if (!Number.isSafeInteger(normalized) || normalized < 0) {
    return null;
  }

  return normalized;
};

const normalizePayload = (value: unknown): QuoteRequestPayload | null => {
  if (!isObjectRecord(value)) {
    return null;
  }

  const source = toNonEmptyString(value.source) ?? "unknown";
  const fulfillmentMethod =
    value.fulfillmentMethod === "delivery" || value.fulfillmentMethod === "pickup"
      ? value.fulfillmentMethod
      : null;

  const rawItems = Array.isArray(value.items) ? value.items : [];
  const items = rawItems
    .map((item) => {
      if (!isObjectRecord(item)) {
        return null;
      }

      const productId = toNonEmptyString(item.productId);
      const productName = toNonEmptyString(item.productName);
      const quantity = toPositiveInteger(item.quantity);
      const estimatedUnitPrice = toNonNegativeInteger(item.estimatedUnitPrice);
      const estimatedTotal = toNonNegativeInteger(item.estimatedTotal);

      if (
        !productId ||
        !productName ||
        quantity === null ||
        estimatedUnitPrice === null ||
        estimatedTotal === null
      ) {
        return null;
      }

      return {
        productId,
        productName,
        variantId: toNonEmptyString(item.variantId),
        variantLabel: toNonEmptyString(item.variantLabel),
        quantity,
        unitLabel: toNonEmptyString(item.unitLabel),
        estimatedUnitPrice,
        estimatedTotal,
      };
    })
    .filter(
      (
        item,
      ): item is QuoteRequestPayload["items"][number] => Boolean(item),
    );

  if (items.length === 0) {
    return null;
  }

  const totalQuantity = items.reduce((sum, item) => sum + item.quantity, 0);
  const estimatedSubtotal = items.reduce((sum, item) => sum + item.estimatedTotal, 0);

  const context = isObjectRecord(value.context) ? value.context : {};
  const requestFingerprintHash = toNonEmptyString(context.requestFingerprintHash) ?? "";
  const userAgent = toNonEmptyString(context.userAgent);

  return {
    source,
    fulfillmentMethod,
    items,
    summary: {
      lineCount: items.length,
      totalQuantity,
      estimatedSubtotal,
    },
    context: {
      requestFingerprintHash,
      userAgent,
    },
  };
};

export const getAdminQuoteRequests = async (input?: {
  status?: QuoteRequestStatus | "all" | null;
  limit?: number;
}): Promise<AdminQuoteRequest[]> => {
  const supabaseAdmin = getSupabaseAdminClient();
  if (!supabaseAdmin) {
    return [];
  }

  const status = input?.status;
  const limit =
    typeof input?.limit === "number" && Number.isFinite(input.limit) && input.limit > 0
      ? Math.min(500, Math.floor(input.limit))
      : 300;

  let query = supabaseAdmin
    .from("quote_requests")
    .select("id, created_at, updated_at, user_id, anonymous_id, status, payload")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (status && status !== "all") {
    query = query.eq("status", status);
  }

  const { data, error } = await query;
  if (error || !data) {
    return [];
  }

  return (data as QuoteRequestRow[])
    .map((row) => {
      const normalizedStatus = isQuoteRequestStatus(row.status) ? row.status : null;
      const payload = normalizePayload(row.payload);

      if (!normalizedStatus || !payload) {
        return null;
      }

      return {
        id: row.id,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        userId: row.user_id,
        anonymousId: row.anonymous_id,
        status: normalizedStatus,
        payload,
      };
    })
    .filter((row): row is AdminQuoteRequest => Boolean(row));
};

export const isNextQuoteStatusAllowed = (
  currentStatus: QuoteRequestStatus,
  nextStatus: QuoteRequestStatus,
): boolean => {
  return NEXT_QUOTE_STATUSES[currentStatus].includes(nextStatus);
};

export const updateAdminQuoteRequestStatus = async (
  quoteRequestId: string,
  nextStatus: QuoteRequestStatus,
): Promise<boolean> => {
  const supabaseAdmin = getSupabaseAdminClient();
  if (!supabaseAdmin) {
    return false;
  }

  const { error } = await supabaseAdmin
    .from("quote_requests")
    .update({ status: nextStatus })
    .eq("id", quoteRequestId);

  return !error;
};

export const getQuoteStatusCount = (
  status: QuoteRequestStatus,
  requests: AdminQuoteRequest[],
): number => {
  return requests.reduce(
    (count, request) => (request.status === status ? count + 1 : count),
    0,
  );
};

export { QUOTE_REQUEST_STATUSES };
