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
  contacted_at: string | null;
  converted_at: string | null;
  closed_at: string | null;
  next_action: string | null;
  next_action_due_at: string | null;
};

type QuoteRequestFollowUpRow = Pick<
  QuoteRequestRow,
  "id" | "status" | "contacted_at" | "converted_at" | "closed_at" | "next_action_due_at"
>;

type QuoteRequestNoteRow = {
  id: number;
  quote_request_id: string;
  content: string;
  admin_identifier: string | null;
  created_at: string;
  updated_at: string;
};

export type AdminQuoteRequest = {
  id: string;
  createdAt: string;
  updatedAt: string;
  userId: string | null;
  anonymousId: string;
  status: QuoteRequestStatus;
  payload: QuoteRequestPayload;
  contactedAt: string | null;
  convertedAt: string | null;
  closedAt: string | null;
  nextAction: string | null;
  nextActionDueAt: string | null;
};

export type AdminQuoteRequestNote = {
  id: number;
  quoteRequestId: string;
  content: string;
  adminIdentifier: string | null;
  createdAt: string;
  updatedAt: string;
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

export type QuoteFollowUpRules = {
  newQuoteOverdueHours: number;
  contactedQuoteOverdueHours: number;
};

export type QuoteFollowUpFilter = "all" | "a-traiter" | "en-attente" | "en-retard";

export type QuoteFollowUpCategory = Exclude<QuoteFollowUpFilter, "all"> | "none";

export type QuoteFollowUpSignalReason =
  | "none"
  | "new"
  | "new-overdue"
  | "contacted-waiting"
  | "contacted-overdue"
  | "next-action-today"
  | "next-action-overdue";

export type QuoteFollowUpSignal = {
  category: QuoteFollowUpCategory;
  reason: QuoteFollowUpSignalReason;
  isOverdue: boolean;
  isDueToday: boolean;
};

export type QuoteFollowUpDescriptor = {
  signal: QuoteFollowUpSignal;
  label: string;
};

export const QUOTE_FOLLOW_UP_FILTERS: readonly QuoteFollowUpFilter[] = [
  "all",
  "a-traiter",
  "en-attente",
  "en-retard",
];

export const QUOTE_FOLLOW_UP_FILTER_LABEL: Record<QuoteFollowUpFilter, string> = {
  all: "Tous",
  "a-traiter": "A traiter",
  "en-attente": "En attente",
  "en-retard": "En retard",
};

const QUOTE_REQUEST_SELECT =
  "id, created_at, updated_at, user_id, anonymous_id, status, payload, contacted_at, converted_at, closed_at, next_action, next_action_due_at";
const MAX_ADMIN_QUOTES_LIMIT = 5000;
const MAX_ANALYTICS_ROWS = 5000;
const MAX_TOP_PRODUCTS = 12;
const MAX_RECENT_ANALYTICS_QUOTES = 30;
const MAX_QUOTE_NOTES_LIMIT = 200;
const MAX_NEXT_ACTION_LENGTH = 1000;
const MAX_QUOTE_NOTE_CONTENT_LENGTH = 2000;
const MIN_ADMIN_IDENTIFIER_LENGTH = 3;
const MAX_ADMIN_IDENTIFIER_LENGTH = 120;
const DEFAULT_NEW_QUOTE_OVERDUE_HOURS = 24;
const DEFAULT_CONTACTED_QUOTE_OVERDUE_HOURS = 72;

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

const toNonNegativeAmount = (value: unknown): number | null => {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
    return null;
  }

  const rounded = Math.round((value + Number.EPSILON) * 100) / 100;
  return Object.is(rounded, -0) ? 0 : rounded;
};

const toIsoDateTimeOrNull = (value: unknown): string | null => {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  const parsed = new Date(trimmed);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return parsed.toISOString();
};

const toPositiveHoursOrNull = (value: unknown): number | null => {
  const normalized = toPositiveInteger(value);
  return normalized === null ? null : normalized;
};

export const resolveQuoteFollowUpRules = (
  input?: Partial<QuoteFollowUpRules>,
): QuoteFollowUpRules => {
  const envNewQuoteOverdueHours = toPositiveHoursOrNull(
    Number.parseInt(process.env.ADMIN_QUOTES_NEW_OVERDUE_HOURS ?? "", 10),
  );
  const envContactedQuoteOverdueHours = toPositiveHoursOrNull(
    Number.parseInt(process.env.ADMIN_QUOTES_CONTACTED_OVERDUE_HOURS ?? "", 10),
  );

  return {
    newQuoteOverdueHours:
      toPositiveHoursOrNull(input?.newQuoteOverdueHours) ??
      envNewQuoteOverdueHours ??
      DEFAULT_NEW_QUOTE_OVERDUE_HOURS,
    contactedQuoteOverdueHours:
      toPositiveHoursOrNull(input?.contactedQuoteOverdueHours) ??
      envContactedQuoteOverdueHours ??
      DEFAULT_CONTACTED_QUOTE_OVERDUE_HOURS,
  };
};

const normalizeQuoteNoteContent = (value: unknown): string | null => {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  if (!trimmed || trimmed.length > MAX_QUOTE_NOTE_CONTENT_LENGTH) {
    return null;
  }

  return trimmed;
};

const normalizeAdminIdentifier = (value: unknown): string | null => {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  if (
    trimmed.length < MIN_ADMIN_IDENTIFIER_LENGTH ||
    trimmed.length > MAX_ADMIN_IDENTIFIER_LENGTH
  ) {
    return null;
  }

  return trimmed;
};

const normalizeNextAction = (value: unknown): string | null => {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  if (!trimmed || trimmed.length > MAX_NEXT_ACTION_LENGTH) {
    return null;
  }

  return trimmed;
};

const toRoundedRatePercent = (numerator: number, denominator: number): number => {
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

const HOURS_TO_MS = 60 * 60 * 1000;

const isTerminalQuoteStatus = (status: QuoteRequestStatus): boolean => {
  return status === "converted" || status === "closed";
};

export const isQuoteFollowUpFilter = (value: string): value is QuoteFollowUpFilter => {
  return QUOTE_FOLLOW_UP_FILTERS.includes(value as QuoteFollowUpFilter);
};

const toNowDate = (value: Date | string | null | undefined): Date => {
  if (!value) {
    return new Date();
  }

  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? new Date() : value;
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
};

const toTimestampOrNull = (value: string | null): number | null => {
  if (!value) {
    return null;
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return parsed.getTime();
};

const getLocalDayBounds = (value: Date): { dayStartMs: number; nextDayStartMs: number } => {
  const dayStart = new Date(value);
  dayStart.setHours(0, 0, 0, 0);
  const nextDayStart = new Date(dayStart);
  nextDayStart.setDate(nextDayStart.getDate() + 1);
  return {
    dayStartMs: dayStart.getTime(),
    nextDayStartMs: nextDayStart.getTime(),
  };
};

const getHoursSinceTimestamp = (
  timestampMs: number | null,
  nowMs: number,
): number | null => {
  if (timestampMs === null || timestampMs > nowMs) {
    return null;
  }

  return (nowMs - timestampMs) / HOURS_TO_MS;
};

const isQuoteOverdueByStatus = (
  request: AdminQuoteRequest,
  rules: QuoteFollowUpRules,
  nowMs: number,
): boolean => {
  if (request.status === "new") {
    const ageHours = getHoursSinceTimestamp(toTimestampOrNull(request.createdAt), nowMs);
    return ageHours !== null && ageHours >= rules.newQuoteOverdueHours;
  }

  if (request.status === "contacted") {
    const referenceIso = request.contactedAt ?? request.updatedAt ?? request.createdAt;
    const ageHours = getHoursSinceTimestamp(toTimestampOrNull(referenceIso), nowMs);
    return ageHours !== null && ageHours >= rules.contactedQuoteOverdueHours;
  }

  return false;
};

export const getQuoteFollowUpSignal = (
  request: AdminQuoteRequest,
  input?: {
    now?: Date | string | null;
    rules?: Partial<QuoteFollowUpRules>;
  },
): QuoteFollowUpSignal => {
  if (isTerminalQuoteStatus(request.status)) {
    return {
      category: "none",
      reason: "none",
      isOverdue: false,
      isDueToday: false,
    };
  }

  const rules = resolveQuoteFollowUpRules(input?.rules);
  const now = toNowDate(input?.now);
  const nowMs = now.getTime();

  const dueAtMs = toTimestampOrNull(request.nextActionDueAt);
  const hasDueAt = dueAtMs !== null;
  const isOverdueByNextAction = hasDueAt && dueAtMs < nowMs;
  const { dayStartMs, nextDayStartMs } = getLocalDayBounds(now);
  const isDueToday =
    hasDueAt &&
    dueAtMs >= dayStartMs &&
    dueAtMs < nextDayStartMs &&
    !isOverdueByNextAction;

  const isOverdueByStatus = isQuoteOverdueByStatus(request, rules, nowMs);
  const isOverdue = isOverdueByNextAction || isOverdueByStatus;

  if (isOverdueByNextAction) {
    return {
      category: "en-retard",
      reason: "next-action-overdue",
      isOverdue: true,
      isDueToday: false,
    };
  }

  if (isOverdueByStatus && request.status === "new") {
    return {
      category: "en-retard",
      reason: "new-overdue",
      isOverdue: true,
      isDueToday: false,
    };
  }

  if (isOverdueByStatus && request.status === "contacted") {
    return {
      category: "en-retard",
      reason: "contacted-overdue",
      isOverdue: true,
      isDueToday: false,
    };
  }

  if (isDueToday) {
    return {
      category: "a-traiter",
      reason: "next-action-today",
      isOverdue: false,
      isDueToday: true,
    };
  }

  if (request.status === "new") {
    return {
      category: "a-traiter",
      reason: "new",
      isOverdue: false,
      isDueToday: false,
    };
  }

  if (request.status === "contacted") {
    return {
      category: "en-attente",
      reason: "contacted-waiting",
      isOverdue,
      isDueToday: false,
    };
  }

  return {
    category: "none",
    reason: "none",
    isOverdue: false,
    isDueToday: false,
  };
};

export const isQuoteInFollowUpFilter = (
  request: AdminQuoteRequest,
  filter: QuoteFollowUpFilter,
  input?: {
    now?: Date | string | null;
    rules?: Partial<QuoteFollowUpRules>;
  },
): boolean => {
  if (filter === "all") {
    return true;
  }

  return getQuoteFollowUpSignal(request, input).category === filter;
};

export const describeQuoteFollowUp = (
  request: AdminQuoteRequest,
  input?: {
    now?: Date | string | null;
    rules?: Partial<QuoteFollowUpRules>;
  },
): QuoteFollowUpDescriptor => {
  const signal = getQuoteFollowUpSignal(request, input);

  if (signal.reason === "next-action-overdue") {
    return { signal, label: "En retard" };
  }

  if (signal.reason === "next-action-today") {
    return { signal, label: "A rappeler aujourd'hui" };
  }

  if (signal.reason === "new-overdue") {
    return { signal, label: "Nouveau en retard" };
  }

  if (signal.reason === "contacted-overdue") {
    return { signal, label: "Relance en retard" };
  }

  if (signal.reason === "new") {
    return { signal, label: "A traiter" };
  }

  if (signal.reason === "contacted-waiting") {
    return { signal, label: "En attente" };
  }

  return { signal, label: "Aucune relance" };
};

const toRangeBoundIso = (
  value: string | Date | null | undefined,
): string | null => {
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

const createEmptyStatusBreakdown = (): QuoteStatusBreakdown => ({
  new: 0,
  contacted: 0,
  converted: 0,
  closed: 0,
});

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
      const estimatedUnitPrice = toNonNegativeAmount(item.estimatedUnitPrice);
      const estimatedTotal = toNonNegativeAmount(item.estimatedTotal);

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

const normalizeQuoteRequest = (row: QuoteRequestRow): AdminQuoteRequest | null => {
  const normalizedStatus = isQuoteRequestStatus(row.status) ? row.status : null;
  const payload = normalizePayload(row.payload);
  if (!normalizedStatus || !payload) {
    return null;
  }

  const nextActionRaw = toNonEmptyString(row.next_action);
  const nextAction =
    nextActionRaw && nextActionRaw.length <= MAX_NEXT_ACTION_LENGTH
      ? nextActionRaw
      : null;
  const nextActionDueAt = toIsoDateTimeOrNull(row.next_action_due_at);

  return {
    id: row.id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    userId: row.user_id,
    anonymousId: row.anonymous_id,
    status: normalizedStatus,
    payload,
    contactedAt: toIsoDateTimeOrNull(row.contacted_at),
    convertedAt: toIsoDateTimeOrNull(row.converted_at),
    closedAt: toIsoDateTimeOrNull(row.closed_at),
    nextAction,
    nextActionDueAt,
  };
};

const normalizeQuoteNote = (row: QuoteRequestNoteRow): AdminQuoteRequestNote | null => {
  const content = toNonEmptyString(row.content);
  if (!content) {
    return null;
  }

  return {
    id: row.id,
    quoteRequestId: row.quote_request_id,
    content,
    adminIdentifier: normalizeAdminIdentifier(row.admin_identifier),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
};

const applyCreatedAtRange = <
  T extends { gte: (...args: string[]) => T; lt: (...args: string[]) => T },
>(
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

const countStatusesInRequests = (requests: AdminQuoteRequest[]): QuoteStatusBreakdown => {
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
    .select(QUOTE_REQUEST_SELECT)
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
    .map(normalizeQuoteRequest)
    .filter((row): row is AdminQuoteRequest => Boolean(row));
};

type QuoteFollowUpListInput = {
  quotes?: AdminQuoteRequest[];
  limit?: number;
  now?: Date | string | null;
  rules?: Partial<QuoteFollowUpRules>;
};

const getFollowUpSourceQuotes = async (
  input?: QuoteFollowUpListInput,
): Promise<AdminQuoteRequest[]> => {
  if (Array.isArray(input?.quotes)) {
    return input.quotes;
  }

  const limit =
    typeof input?.limit === "number" && Number.isFinite(input.limit) && input.limit > 0
      ? input.limit
      : 600;

  return getAdminQuoteRequests({
    status: "all",
    limit,
  });
};

export const getOverdueQuotes = async (
  input?: QuoteFollowUpListInput,
): Promise<AdminQuoteRequest[]> => {
  const source = await getFollowUpSourceQuotes(input);
  return source.filter(
    (request) =>
      getQuoteFollowUpSignal(request, {
        now: input?.now,
        rules: input?.rules,
      }).category === "en-retard",
  );
};

export const getTodayFollowUps = async (
  input?: QuoteFollowUpListInput,
): Promise<AdminQuoteRequest[]> => {
  const source = await getFollowUpSourceQuotes(input);
  return source.filter((request) =>
    getQuoteFollowUpSignal(request, {
      now: input?.now,
      rules: input?.rules,
    }).reason === "next-action-today",
  );
};

export const getQuotesNeedingFollowUp = async (
  input?: QuoteFollowUpListInput,
): Promise<AdminQuoteRequest[]> => {
  const source = await getFollowUpSourceQuotes(input);
  return source.filter((request) => {
    const signal = getQuoteFollowUpSignal(request, {
      now: input?.now,
      rules: input?.rules,
    });
    return signal.category === "a-traiter" || signal.category === "en-retard";
  });
};

export const getAdminQuoteRequestById = async (
  quoteRequestId: string,
): Promise<AdminQuoteRequest | null> => {
  const normalizedQuoteRequestId = quoteRequestId.trim();
  if (!normalizedQuoteRequestId) {
    return null;
  }

  const supabaseAdmin = getSupabaseAdminClient();
  if (!supabaseAdmin) {
    return null;
  }

  const { data, error } = await supabaseAdmin
    .from("quote_requests")
    .select(QUOTE_REQUEST_SELECT)
    .eq("id", normalizedQuoteRequestId)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return normalizeQuoteRequest(data as QuoteRequestRow);
};

export const getAdminQuoteRequestNotes = async (
  quoteRequestId: string,
  input?: { limit?: number },
): Promise<AdminQuoteRequestNote[]> => {
  const normalizedQuoteRequestId = quoteRequestId.trim();
  if (!normalizedQuoteRequestId) {
    return [];
  }

  const supabaseAdmin = getSupabaseAdminClient();
  if (!supabaseAdmin) {
    return [];
  }

  const limit =
    typeof input?.limit === "number" && Number.isFinite(input.limit) && input.limit > 0
      ? Math.min(MAX_QUOTE_NOTES_LIMIT, Math.floor(input.limit))
      : 80;

  const { data, error } = await supabaseAdmin
    .from("quote_request_notes")
    .select("id, quote_request_id, content, admin_identifier, created_at, updated_at")
    .eq("quote_request_id", normalizedQuoteRequestId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error || !data) {
    return [];
  }

  return (data as QuoteRequestNoteRow[])
    .map(normalizeQuoteNote)
    .filter((note): note is AdminQuoteRequestNote => Boolean(note));
};

export const createAdminQuoteRequestNote = async (input: {
  quoteRequestId: string;
  content: string;
  adminIdentifier?: string | null;
}): Promise<boolean> => {
  const normalizedQuoteRequestId = input.quoteRequestId.trim();
  const normalizedContent = normalizeQuoteNoteContent(input.content);
  if (!normalizedQuoteRequestId || !normalizedContent) {
    return false;
  }

  const supabaseAdmin = getSupabaseAdminClient();
  if (!supabaseAdmin) {
    return false;
  }

  const adminIdentifier = normalizeAdminIdentifier(input.adminIdentifier);

  const { error } = await supabaseAdmin.from("quote_request_notes").insert({
    quote_request_id: normalizedQuoteRequestId,
    content: normalizedContent,
    admin_identifier: adminIdentifier,
  });

  return !error;
};

export const updateAdminQuoteRequestNote = async (input: {
  quoteRequestId: string;
  noteId: number;
  content: string;
}): Promise<boolean> => {
  const normalizedQuoteRequestId = input.quoteRequestId.trim();
  const normalizedNoteId = toPositiveInteger(input.noteId);
  const normalizedContent = normalizeQuoteNoteContent(input.content);

  if (!normalizedQuoteRequestId || normalizedNoteId === null || !normalizedContent) {
    return false;
  }

  const supabaseAdmin = getSupabaseAdminClient();
  if (!supabaseAdmin) {
    return false;
  }

  const { error } = await supabaseAdmin
    .from("quote_request_notes")
    .update({ content: normalizedContent })
    .eq("quote_request_id", normalizedQuoteRequestId)
    .eq("id", normalizedNoteId);

  return !error;
};

export const updateAdminQuoteRequestNextAction = async (
  quoteRequestId: string,
  nextActionInput: string | null,
  nextActionDueAtInput: string | null,
): Promise<boolean> => {
  const normalizedQuoteRequestId = quoteRequestId.trim();
  if (!normalizedQuoteRequestId) {
    return false;
  }

  if (typeof nextActionInput === "string" && nextActionInput.trim().length > MAX_NEXT_ACTION_LENGTH) {
    return false;
  }

  const supabaseAdmin = getSupabaseAdminClient();
  if (!supabaseAdmin) {
    return false;
  }

  const nextAction = normalizeNextAction(nextActionInput);
  const nextActionDueAt = toIsoDateTimeOrNull(nextActionDueAtInput);
  const hasDueAtInput = typeof nextActionDueAtInput === "string" && nextActionDueAtInput.trim().length > 0;
  if (hasDueAtInput && !nextActionDueAt) {
    return false;
  }

  const { error } = await supabaseAdmin
    .from("quote_requests")
    .update({ next_action: nextAction, next_action_due_at: nextActionDueAt })
    .eq("id", normalizedQuoteRequestId);

  return !error;
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

    if (fromDate && toDate && fromDate.getTime() <= toDate.getTime()) {
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
  const requestsForChartsAndTopProducts = filteredRequests;
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
  const normalizedQuoteRequestId = quoteRequestId.trim();
  if (!normalizedQuoteRequestId) {
    return false;
  }

  const supabaseAdmin = getSupabaseAdminClient();
  if (!supabaseAdmin) {
    return false;
  }

  const { data, error: fetchError } = await supabaseAdmin
    .from("quote_requests")
    .select("id, status, contacted_at, converted_at, closed_at, next_action_due_at")
    .eq("id", normalizedQuoteRequestId)
    .maybeSingle();

  if (fetchError || !data) {
    return false;
  }

  const current = data as QuoteRequestFollowUpRow;
  const nowIso = new Date().toISOString();
  const updatePatch: {
    status: QuoteRequestStatus;
    contacted_at?: string;
    converted_at?: string;
    closed_at?: string;
    next_action_due_at?: string | null;
  } = {
    status: nextStatus,
  };

  if (nextStatus === "contacted" && !toIsoDateTimeOrNull(current.contacted_at)) {
    updatePatch.contacted_at = nowIso;
  }

  if (nextStatus === "converted") {
    if (!toIsoDateTimeOrNull(current.contacted_at)) {
      updatePatch.contacted_at = nowIso;
    }
    if (!toIsoDateTimeOrNull(current.converted_at)) {
      updatePatch.converted_at = nowIso;
    }
  }

  if (nextStatus === "closed" && !toIsoDateTimeOrNull(current.closed_at)) {
    updatePatch.closed_at = nowIso;
  }

  if (nextStatus === "converted" || nextStatus === "closed") {
    updatePatch.next_action_due_at = null;
  }

  const { error } = await supabaseAdmin
    .from("quote_requests")
    .update(updatePatch)
    .eq("id", normalizedQuoteRequestId);

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
