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

export type QuoteStatusBreakdown = Record<QuoteRequestStatus, number>;

export type QuoteAnalyticsRangeKey = "today" | "7d" | "30d" | "custom";

export type QuoteAnalyticsRange = {
  key: QuoteAnalyticsRangeKey;
  label: string;
  createdFrom: string;
  createdToExclusive: string;
  fromDateInput: string;
  toDateInput: string;
};

export type QuoteTopProductInsight = {
  productId: string;
  productName: string;
  quoteRequestCount: number;
  totalRequestedQuantity: number;
};

export type QuoteDailyActivityPoint = {
  date: string;
  count: number;
};

export type QuoteAnalyticsMetrics = {
  totalQuotesAllTime: number;
  quotesToday: number;
  quotesThisWeek: number;
  quotesThisMonth: number;
  statusBreakdownAllTime: QuoteStatusBreakdown;
  conversionRateAllTime: number;
};

export type QuoteAnalyticsSnapshot = {
  range: QuoteAnalyticsRange;
  filteredTotalQuotes: number;
  filteredStatusBreakdown: QuoteStatusBreakdown;
  filteredConversionRate: number;
  metrics: QuoteAnalyticsMetrics;
  topProducts: QuoteTopProductInsight[];
  dailyActivity: QuoteDailyActivityPoint[];
  recentQuoteRequests: AdminQuoteRequest[];
  isRangeDatasetTruncated: boolean;
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

const MAX_ADMIN_QUOTES_LIMIT = 5000;
const MAX_ANALYTICS_ROWS = 5000;
const MAX_TOP_PRODUCTS = 12;
const MAX_RECENT_ANALYTICS_QUOTES = 30;

const createEmptyStatusBreakdown = (): QuoteStatusBreakdown => ({
  new: 0,
  contacted: 0,
  converted: 0,
  closed: 0,
});

const toRoundedRatePercent = (
  numerator: number,
  denominator: number,
): number => {
  if (denominator <= 0) {
    return 0;
  }

  return Math.round((numerator / denominator) * 1000) / 10;
};

const isDateOnlyInput = (value: string): boolean => {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
};

const toUtcStartOfDay = (value: Date): Date => {
  return new Date(
    Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate()),
  );
};

const addUtcDays = (value: Date, days: number): Date => {
  const next = new Date(value);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
};

const toIsoDate = (value: Date): string => {
  return value.toISOString().slice(0, 10);
};

const toRangeBoundIso = (value: string | Date | null | undefined): string | null => {
  if (!value) {
    return null;
  }

  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) {
      return null;
    }
    return value.toISOString();
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  if (isDateOnlyInput(trimmed)) {
    return `${trimmed}T00:00:00.000Z`;
  }

  const parsed = new Date(trimmed);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return parsed.toISOString();
};

const parseDateOnlyToUtcStart = (value: string): Date | null => {
  if (!isDateOnlyInput(value)) {
    return null;
  }

  const parsed = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return parsed;
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

const applyCreatedAtRange = <T extends { gte: (...args: string[]) => T; lt: (...args: string[]) => T }>(
  query: T,
  createdFrom: string | Date | null | undefined,
  createdToExclusive: string | Date | null | undefined,
): T => {
  const fromIso = toRangeBoundIso(createdFrom);
  if (fromIso) {
    query.gte("created_at", fromIso);
  }

  const toIso = toRangeBoundIso(createdToExclusive);
  if (toIso) {
    query.lt("created_at", toIso);
  }

  return query;
};

const countQuoteRequests = async (input?: {
  status?: QuoteRequestStatus | null;
  createdFrom?: string | Date | null;
  createdToExclusive?: string | Date | null;
}): Promise<number> => {
  const supabaseAdmin = getSupabaseAdminClient();
  if (!supabaseAdmin) {
    return 0;
  }

  let query = supabaseAdmin
    .from("quote_requests")
    .select("id", { count: "exact", head: true });

  if (input?.status) {
    query = query.eq("status", input.status);
  }

  query = applyCreatedAtRange(query, input?.createdFrom, input?.createdToExclusive);
  const { count, error } = await query;

  if (error) {
    return 0;
  }

  return Math.max(0, count ?? 0);
};

const getQuoteStatusBreakdownFromCounts = async (input?: {
  createdFrom?: string | Date | null;
  createdToExclusive?: string | Date | null;
}): Promise<QuoteStatusBreakdown> => {
  const entries = await Promise.all(
    QUOTE_REQUEST_STATUSES.map(async (status) => {
      const count = await countQuoteRequests({
        status,
        createdFrom: input?.createdFrom,
        createdToExclusive: input?.createdToExclusive,
      });
      return [status, count] as const;
    }),
  );

  const breakdown = createEmptyStatusBreakdown();
  for (const [status, count] of entries) {
    breakdown[status] = count;
  }

  return breakdown;
};

const countStatusesInRequests = (
  requests: AdminQuoteRequest[],
): QuoteStatusBreakdown => {
  const breakdown = createEmptyStatusBreakdown();

  for (const request of requests) {
    breakdown[request.status] += 1;
  }

  return breakdown;
};

export const getAdminQuoteRequests = async (input?: {
  status?: QuoteRequestStatus | "all" | null;
  limit?: number;
  createdFrom?: string | Date | null;
  createdToExclusive?: string | Date | null;
}): Promise<AdminQuoteRequest[]> => {
  const supabaseAdmin = getSupabaseAdminClient();
  if (!supabaseAdmin) {
    return [];
  }

  const status = input?.status;
  const limit =
    typeof input?.limit === "number" && Number.isFinite(input.limit) && input.limit > 0
      ? Math.min(MAX_ADMIN_QUOTES_LIMIT, Math.floor(input.limit))
      : 300;

  let query = supabaseAdmin
    .from("quote_requests")
    .select("id, created_at, updated_at, user_id, anonymous_id, status, payload")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (status && status !== "all") {
    query = query.eq("status", status);
  }

  query = applyCreatedAtRange(query, input?.createdFrom, input?.createdToExclusive);

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

export const resolveQuoteAnalyticsRange = (input: {
  range?: string | null;
  from?: string | null;
  to?: string | null;
}): QuoteAnalyticsRange => {
  const now = new Date();
  const todayStart = toUtcStartOfDay(now);
  const tomorrowStart = addUtcDays(todayStart, 1);
  const rangeKey = input.range?.trim().toLowerCase();

  if (rangeKey === "today") {
    return {
      key: "today",
      label: "Aujourd'hui",
      createdFrom: todayStart.toISOString(),
      createdToExclusive: tomorrowStart.toISOString(),
      fromDateInput: toIsoDate(todayStart),
      toDateInput: toIsoDate(todayStart),
    };
  }

  if (rangeKey === "7d") {
    const from = addUtcDays(todayStart, -6);
    return {
      key: "7d",
      label: "7 derniers jours",
      createdFrom: from.toISOString(),
      createdToExclusive: tomorrowStart.toISOString(),
      fromDateInput: toIsoDate(from),
      toDateInput: toIsoDate(todayStart),
    };
  }

  if (rangeKey === "custom") {
    const fromRaw = input.from?.trim() ?? "";
    const toRaw = input.to?.trim() ?? "";
    const fromDate = parseDateOnlyToUtcStart(fromRaw);
    const toDate = parseDateOnlyToUtcStart(toRaw);

    if (
      fromDate &&
      toDate &&
      fromDate.getTime() <= toDate.getTime()
    ) {
      const clampedTo = addUtcDays(toDate, 1);
      return {
        key: "custom",
        label: "Periode personnalisee",
        createdFrom: fromDate.toISOString(),
        createdToExclusive: clampedTo.toISOString(),
        fromDateInput: toIsoDate(fromDate),
        toDateInput: toIsoDate(toDate),
      };
    }
  }

  const from30d = addUtcDays(todayStart, -29);
  return {
    key: "30d",
    label: "30 derniers jours",
    createdFrom: from30d.toISOString(),
    createdToExclusive: tomorrowStart.toISOString(),
    fromDateInput: toIsoDate(from30d),
    toDateInput: toIsoDate(todayStart),
  };
};

const getDailyActivity = (
  requests: AdminQuoteRequest[],
  range: QuoteAnalyticsRange,
): QuoteDailyActivityPoint[] => {
  const countsByDay = new Map<string, number>();
  for (const request of requests) {
    const dayKey = request.createdAt.slice(0, 10);
    countsByDay.set(dayKey, (countsByDay.get(dayKey) ?? 0) + 1);
  }

  const points: QuoteDailyActivityPoint[] = [];
  let cursor = new Date(range.createdFrom);
  const end = new Date(range.createdToExclusive);

  while (cursor < end) {
    const dayKey = toIsoDate(cursor);
    points.push({
      date: dayKey,
      count: countsByDay.get(dayKey) ?? 0,
    });
    cursor = addUtcDays(cursor, 1);
  }

  return points;
};

const getTopProductsFromRequests = (
  requests: AdminQuoteRequest[],
): QuoteTopProductInsight[] => {
  const byProductKey = new Map<
    string,
    {
      productId: string;
      productName: string;
      quoteRequestCount: number;
      totalRequestedQuantity: number;
    }
  >();

  for (const request of requests) {
    const countedInRequest = new Set<string>();

    for (const item of request.payload.items) {
      const key = `${item.productId}::${item.productName}`;
      const existing = byProductKey.get(key) ?? {
        productId: item.productId,
        productName: item.productName,
        quoteRequestCount: 0,
        totalRequestedQuantity: 0,
      };

      existing.totalRequestedQuantity += item.quantity;
      if (!countedInRequest.has(key)) {
        existing.quoteRequestCount += 1;
        countedInRequest.add(key);
      }

      byProductKey.set(key, existing);
    }
  }

  return Array.from(byProductKey.values())
    .sort((first, second) => {
      if (second.quoteRequestCount !== first.quoteRequestCount) {
        return second.quoteRequestCount - first.quoteRequestCount;
      }
      return second.totalRequestedQuantity - first.totalRequestedQuantity;
    })
    .slice(0, MAX_TOP_PRODUCTS);
};

export const getAdminQuoteAnalytics = async (
  range: QuoteAnalyticsRange,
): Promise<QuoteAnalyticsSnapshot> => {
  const now = new Date();
  const todayStart = toUtcStartOfDay(now);
  const tomorrowStart = addUtcDays(todayStart, 1);
  const weekStart = addUtcDays(todayStart, -6);
  const monthStart = addUtcDays(todayStart, -29);

  const [
    totalQuotesAllTime,
    quotesToday,
    quotesThisWeek,
    quotesThisMonth,
    statusBreakdownAllTime,
    filteredTotalQuotes,
    filteredStatusBreakdown,
    filteredRequests,
  ] = await Promise.all([
    countQuoteRequests(),
    countQuoteRequests({
      createdFrom: todayStart,
      createdToExclusive: tomorrowStart,
    }),
    countQuoteRequests({
      createdFrom: weekStart,
      createdToExclusive: tomorrowStart,
    }),
    countQuoteRequests({
      createdFrom: monthStart,
      createdToExclusive: tomorrowStart,
    }),
    getQuoteStatusBreakdownFromCounts(),
    countQuoteRequests({
      createdFrom: range.createdFrom,
      createdToExclusive: range.createdToExclusive,
    }),
    getQuoteStatusBreakdownFromCounts({
      createdFrom: range.createdFrom,
      createdToExclusive: range.createdToExclusive,
    }),
    getAdminQuoteRequests({
      status: "all",
      createdFrom: range.createdFrom,
      createdToExclusive: range.createdToExclusive,
      limit: MAX_ANALYTICS_ROWS,
    }),
  ]);

  const isRangeDatasetTruncated = filteredTotalQuotes > filteredRequests.length;
  const recentQuoteRequests = filteredRequests.slice(0, MAX_RECENT_ANALYTICS_QUOTES);
  const requestsForChartsAndTopProducts = isRangeDatasetTruncated
    ? filteredRequests
    : filteredRequests;

  const derivedFilteredBreakdown = countStatusesInRequests(requestsForChartsAndTopProducts);
  const dailyActivity = getDailyActivity(requestsForChartsAndTopProducts, range);
  const topProducts = getTopProductsFromRequests(requestsForChartsAndTopProducts);

  return {
    range,
    filteredTotalQuotes,
    filteredStatusBreakdown: isRangeDatasetTruncated
      ? filteredStatusBreakdown
      : derivedFilteredBreakdown,
    filteredConversionRate: toRoundedRatePercent(
      filteredStatusBreakdown.converted,
      filteredTotalQuotes,
    ),
    metrics: {
      totalQuotesAllTime,
      quotesToday,
      quotesThisWeek,
      quotesThisMonth,
      statusBreakdownAllTime,
      conversionRateAllTime: toRoundedRatePercent(
        statusBreakdownAllTime.converted,
        totalQuotesAllTime,
      ),
    },
    topProducts,
    dailyActivity,
    recentQuoteRequests,
    isRangeDatasetTruncated,
  };
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
