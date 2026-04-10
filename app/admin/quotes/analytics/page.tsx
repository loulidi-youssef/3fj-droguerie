import Link from "next/link";
import { redirect } from "next/navigation";
import { AnalyticsSectionHeader } from "./components/analytics-section-header";
import { AnalyticsChartCard } from "./components/analytics-chart-card";
import { AnalyticsTableCard } from "./components/analytics-table-card";
import { EmptyAnalyticsState } from "./components/empty-analytics-state";
import { MetricWidget } from "./components/metric-widget";
import { PremiumStatCard } from "./components/premium-stat-card";
import { QuoteTrendChart } from "./components/quote-trend-chart";
import { StatusBadge, type AnalyticsOrderStatus } from "./components/status-badge";
import { StatusDonutCard } from "./components/status-donut-card";
import {
  getAdminOrders,
  type AdminOrder,
  type OrderStatus,
} from "@/lib/admin-orders";
import { hasValidAdminSession, isAdminAuthConfigured } from "@/lib/admin-auth";
import { resolveQuoteAnalyticsRange, type QuoteAnalyticsRangeKey } from "@/lib/admin-quotes";
import { formatDh } from "@/lib/currency";

type AdminQuoteAnalyticsPageProps = {
  searchParams?: {
    range?: string | string[];
    from?: string | string[];
    to?: string | string[];
  };
};

type StatusBreakdown = Record<AnalyticsOrderStatus, number>;
type DailyPoint = { date: string; count: number };

const RANGE_OPTIONS: Array<{ value: QuoteAnalyticsRangeKey; label: string }> = [
  { value: "today", label: "Aujourd'hui" },
  { value: "7d", label: "7 jours" },
  { value: "30d", label: "30 jours" },
];

const STATUS_COLOR: Record<AnalyticsOrderStatus, string> = {
  pending: "#f59e0b",
  confirmed: "#10b981",
  cancelled: "#ef4444",
};

const STATUS_LABEL: Record<AnalyticsOrderStatus, string> = {
  pending: "En attente",
  confirmed: "Confirmee",
  cancelled: "Annulee",
};

const MODE_LABEL: Record<string, string> = {
  delivery: "Livraison",
  pickup: "Retrait magasin",
};

const toSingleValue = (value: string | string[] | undefined): string => {
  if (typeof value === "string") {
    return value;
  }
  if (Array.isArray(value)) {
    return value[0] ?? "";
  }
  return "";
};

const toIsoDateInput = (value: Date): string => value.toISOString().slice(0, 10);

const addUtcDays = (value: Date, days: number): Date => {
  const next = new Date(value);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
};

const toUtcStartOfDay = (value: Date): Date => {
  return new Date(
    Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate()),
  );
};

const normalizeOrderStatus = (
  value: OrderStatus | string | null | undefined,
): AnalyticsOrderStatus => {
  const normalized = (value ?? "")
    .toString()
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

  if (
    normalized === "cancelled" ||
    normalized === "canceled" ||
    normalized === "annulee" ||
    normalized === "annule"
  ) {
    return "cancelled";
  }

  if (
    normalized === "confirmed" ||
    normalized === "delivered" ||
    normalized === "livree" ||
    normalized === "livre" ||
    normalized === "collected"
  ) {
    return "confirmed";
  }

  return "pending";
};

const createEmptyBreakdown = (): StatusBreakdown => ({
  pending: 0,
  confirmed: 0,
  cancelled: 0,
});

const getStatusBreakdown = (orders: AdminOrder[]): StatusBreakdown => {
  const breakdown = createEmptyBreakdown();
  for (const order of orders) {
    breakdown[normalizeOrderStatus(order.status)] += 1;
  }
  return breakdown;
};

const getDateKey = (value: string): string | null => {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }
  return parsed.toISOString().slice(0, 10);
};

const isWithinInclusiveDateRange = (
  createdAt: string,
  fromDateInput: string,
  toDateInput: string,
): boolean => {
  const dateKey = getDateKey(createdAt);
  if (!dateKey) {
    return false;
  }
  return dateKey >= fromDateInput && dateKey <= toDateInput;
};

const getDailyActivity = (
  orders: AdminOrder[],
  fromDateInput: string,
  toDateInput: string,
): DailyPoint[] => {
  const counts = new Map<string, number>();
  for (const order of orders) {
    const key = getDateKey(order.created_at);
    if (!key || key < fromDateInput || key > toDateInput) {
      continue;
    }
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  const start = new Date(`${fromDateInput}T00:00:00.000Z`);
  const end = new Date(`${toDateInput}T00:00:00.000Z`);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || start > end) {
    return [];
  }

  const points: DailyPoint[] = [];
  let cursor = new Date(start);
  while (cursor <= end) {
    const key = toIsoDateInput(cursor);
    points.push({ date: key, count: counts.get(key) ?? 0 });
    cursor = addUtcDays(cursor, 1);
  }

  return points;
};

const formatDateTime = (value: string): string => {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }
  return new Intl.DateTimeFormat("fr-MA", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(parsed);
};

const formatPercent = (value: number): string => {
  return `${Math.round(value * 10) / 10}%`;
};

const getTrendNote = (ratio: number): string => {
  if (ratio >= 75) return "Volume eleve";
  if (ratio >= 40) return "Volume stable";
  if (ratio > 0) return "Volume modere";
  return "Aucune activite";
};

const getModeLabel = (mode: string | null | undefined): string => {
  const key = (mode ?? "").trim().toLowerCase();
  if (!key) return "Inconnu";
  return MODE_LABEL[key] ?? "Inconnu";
};

const getTopMode = (orders: AdminOrder[]): string => {
  const counts = new Map<string, number>();
  for (const order of orders) {
    const key = (order.fulfillment_method ?? "").trim().toLowerCase() || "unknown";
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  let bestKey = "unknown";
  let bestCount = 0;
  for (const [key, count] of counts.entries()) {
    if (count > bestCount) {
      bestCount = count;
      bestKey = key;
    }
  }

  return getModeLabel(bestKey);
};

const TotalIcon = () => (
  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
    <path d="M4 5h16v14H4z" />
    <path d="M8 9h8M8 13h5" />
  </svg>
);

const CheckIcon = () => (
  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
    <path d="M20 6L9 17l-5-5" />
  </svg>
);

const ClockIcon = () => (
  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7v5l3 2" />
  </svg>
);

const CloseIcon = () => (
  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
    <path d="M6 6l12 12M18 6L6 18" />
  </svg>
);

const SparkIcon = () => (
  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8">
    <path d="M12 3l1.6 4.1L18 8.7l-4.4 1.6L12 14.5l-1.6-4.2L6 8.7l4.4-1.6z" />
  </svg>
);

const CalendarIcon = () => (
  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8">
    <rect x="4" y="5" width="16" height="15" rx="2" />
    <path d="M8 3v4M16 3v4M4 10h16" />
  </svg>
);

export default async function AdminQuoteAnalyticsPage({
  searchParams,
}: AdminQuoteAnalyticsPageProps) {
  if (!isAdminAuthConfigured()) {
    return (
      <section className="bg-brand-light py-12">
        <div className="mx-auto max-w-3xl rounded-2xl bg-white p-6 shadow-card">
          <h1 className="text-2xl font-extrabold text-brand-blue">Quote Analytics</h1>
          <p className="mt-3 text-sm text-slate-700">
            Configurez
            <span className="font-semibold"> ADMIN_ACCESS_PASSWORD_HASH </span>
            et
            <span className="font-semibold"> ADMIN_SESSION_SECRET </span>
            (obligatoires en production), puis redemarrez le serveur.
          </p>
        </div>
      </section>
    );
  }

  if (!(await hasValidAdminSession())) {
    redirect("/admin/login");
  }

  const selectedRange = toSingleValue(searchParams?.range).trim().toLowerCase();
  const fromInput = toSingleValue(searchParams?.from).trim();
  const toInput = toSingleValue(searchParams?.to).trim();

  const range = resolveQuoteAnalyticsRange({
    range: selectedRange,
    from: fromInput,
    to: toInput,
  });

  const allOrders = await getAdminOrders({ status: "all" });
  const filteredOrders = allOrders.filter((order) =>
    isWithinInclusiveDateRange(order.created_at, range.fromDateInput, range.toDateInput),
  );

  const now = new Date();
  const todayStart = toUtcStartOfDay(now);
  const todayInput = toIsoDateInput(todayStart);
  const weekFromInput = toIsoDateInput(addUtcDays(todayStart, -6));
  const dayAgoIso = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();

  const ordersToday = allOrders.filter((order) =>
    isWithinInclusiveDateRange(order.created_at, todayInput, todayInput),
  ).length;
  const ordersThisWeek = allOrders.filter((order) =>
    isWithinInclusiveDateRange(order.created_at, weekFromInput, todayInput),
  ).length;
  const recentActivityCount = allOrders.filter((order) => order.created_at >= dayAgoIso).length;

  const breakdown = getStatusBreakdown(filteredOrders);
  const totalOrders = filteredOrders.length;
  const confirmedOrders = breakdown.confirmed;
  const pendingOrders = breakdown.pending;
  const cancelledOrders = breakdown.cancelled;
  const totalAmount = filteredOrders.reduce((sum, order) => sum + order.total, 0);
  const averageOrderValue = totalOrders > 0 ? totalAmount / totalOrders : 0;
  const confirmationRate = totalOrders > 0 ? (confirmedOrders / totalOrders) * 100 : 0;
  const cancellationRate = totalOrders > 0 ? (cancelledOrders / totalOrders) * 100 : 0;
  const pendingShare = totalOrders > 0 ? (pendingOrders / totalOrders) * 100 : 0;
  const trendShare = totalOrders > 0 ? (totalOrders / Math.max(1, allOrders.length)) * 100 : 0;

  const dailyActivity = getDailyActivity(allOrders, range.fromDateInput, range.toDateInput);
  const recentOrders = [...filteredOrders]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 30);
  const lastActivity = recentOrders[0]?.created_at ?? allOrders[0]?.created_at ?? null;
  const topMode = getTopMode(filteredOrders);

  const donutData = [
    {
      key: "pending",
      label: STATUS_LABEL.pending,
      value: pendingOrders,
      color: STATUS_COLOR.pending,
    },
    {
      key: "confirmed",
      label: STATUS_LABEL.confirmed,
      value: confirmedOrders,
      color: STATUS_COLOR.confirmed,
    },
    {
      key: "cancelled",
      label: STATUS_LABEL.cancelled,
      value: cancelledOrders,
      color: STATUS_COLOR.cancelled,
    },
  ];

  return (
    <section className="min-h-screen bg-gradient-to-b from-brand-light via-slate-50 to-sky-50/60 py-12">
      <div className="mx-auto max-w-7xl px-4 sm:px-5 lg:px-6">
        <AnalyticsSectionHeader
          title="Analytics Commandes"
          description="Dashboard CRM moderne pour piloter les performances et la qualite operationnelle."
          actions={
            <>
              <Link
                href="/admin/orders"
                className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-brand-orange hover:text-brand-orange"
              >
                Liste commandes
              </Link>
              <Link
                href="/admin"
                className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-brand-orange hover:text-brand-orange"
              >
                Dashboard admin
              </Link>
            </>
          }
        />

        <form
          method="get"
          action="/admin/quotes/analytics"
          className="mb-6 rounded-3xl border border-slate-200/90 bg-white/95 p-4 shadow-sm"
        >
          <div className="grid gap-3 md:grid-cols-4">
            <label className="block">
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-600">
                Periode
              </span>
              <select
                name="range"
                defaultValue={range.key}
                className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700"
              >
                {RANGE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
                <option value="custom">Personnalise</option>
              </select>
            </label>
            <label className="block">
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-600">
                Du
              </span>
              <input
                type="date"
                name="from"
                defaultValue={range.fromDateInput}
                className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-700"
              />
            </label>
            <label className="block">
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-600">
                Au
              </span>
              <input
                type="date"
                name="to"
                defaultValue={range.toDateInput}
                className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-700"
              />
            </label>
            <div className="flex items-end">
              <button
                type="submit"
                className="w-full rounded-xl bg-brand-blue px-4 py-2 text-sm font-semibold text-white transition hover:opacity-95"
              >
                Appliquer
              </button>
            </div>
          </div>
        </form>

        <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <PremiumStatCard
            title="Total Orders"
            value={totalOrders}
            subtitle="Volume sur la periode"
            note={getTrendNote(trendShare)}
            tone="blue"
            icon={<TotalIcon />}
          />
          <PremiumStatCard
            title="Confirmed"
            value={confirmedOrders}
            subtitle="Confirmees / livrees"
            note={formatPercent(confirmationRate)}
            tone="green"
            icon={<CheckIcon />}
          />
          <PremiumStatCard
            title="Pending"
            value={pendingOrders}
            subtitle="A traiter rapidement"
            note={formatPercent(pendingShare)}
            tone="orange"
            icon={<ClockIcon />}
          />
          <PremiumStatCard
            title="Cancelled"
            value={cancelledOrders}
            subtitle="Annulations periode"
            note={formatPercent(cancellationRate)}
            tone="red"
            icon={<CloseIcon />}
          />
        </div>

        {totalOrders === 0 ? (
          <EmptyAnalyticsState
            title="Aucune commande sur cette periode"
            description="Le dashboard est pret. Changez la plage de dates pour visualiser les KPIs et l'evolution."
          />
        ) : (
          <>
            <div className="mb-6 grid gap-5 xl:grid-cols-5">
              <AnalyticsChartCard
                className="xl:col-span-3"
                title="Evolution"
                subtitle="Tendance des commandes par jour"
                actions={
                  <span className="rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-xs font-semibold text-sky-700">
                    {range.label}
                  </span>
                }
              >
                <QuoteTrendChart data={dailyActivity} valueLabel="commandes" />
              </AnalyticsChartCard>

              <div className="grid gap-3 xl:col-span-2">
                <MetricWidget
                  label="Taux de confirmation"
                  value={formatPercent(confirmationRate)}
                  helper="Performance commerciale"
                  tone="green"
                  icon={<CheckIcon />}
                />
                <MetricWidget
                  label="Taux d'annulation"
                  value={formatPercent(cancellationRate)}
                  helper="Qualite de parcours"
                  tone="red"
                  icon={<CloseIcon />}
                />
                <MetricWidget
                  label="Part en attente"
                  value={formatPercent(pendingShare)}
                  helper="Charge operationnelle"
                  tone="orange"
                  icon={<ClockIcon />}
                />
                <MetricWidget
                  label="Activite 24h"
                  value={`${recentActivityCount}`}
                  helper="Commandes recentes"
                  tone="violet"
                  icon={<SparkIcon />}
                />
              </div>
            </div>

            <div className="mb-6 grid gap-5 xl:grid-cols-5">
              <AnalyticsChartCard
                className="xl:col-span-3"
                title="Distribution des statuts"
                subtitle="Repartition pending, confirmed, cancelled"
              >
                <StatusDonutCard data={donutData} totalLabel="Commandes" />
              </AnalyticsChartCard>

              <div className="grid gap-3 xl:col-span-2">
                <MetricWidget
                  label="Aujourd'hui"
                  value={`${ordersToday}`}
                  helper="Nouvelles commandes"
                  tone="blue"
                  icon={<CalendarIcon />}
                />
                <MetricWidget
                  label="Cette semaine"
                  value={`${ordersThisWeek}`}
                  helper="7 derniers jours"
                  tone="violet"
                  icon={<CalendarIcon />}
                />
                <MetricWidget
                  label="Panier moyen"
                  value={formatDh(averageOrderValue)}
                  helper="Montant moyen"
                  tone="green"
                  icon={<SparkIcon />}
                />
                <MetricWidget
                  label="Mode dominant"
                  value={topMode}
                  helper={
                    lastActivity
                      ? `Derniere activite: ${formatDateTime(lastActivity)}`
                      : "Aucune activite recente"
                  }
                  tone="blue"
                  icon={<TotalIcon />}
                />
              </div>
            </div>

            <AnalyticsTableCard
              title="Commandes recentes"
              subtitle="Vue detaillee des operations recentes"
            >
              <div className="overflow-x-auto rounded-2xl border border-slate-200">
                <table className="min-w-full text-left text-sm">
                  <thead className="bg-slate-50">
                    <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
                      <th className="px-3 py-2">Client</th>
                      <th className="px-3 py-2">Telephone</th>
                      <th className="px-3 py-2">Date</th>
                      <th className="px-3 py-2">Statut</th>
                      <th className="px-3 py-2">Montant</th>
                      <th className="px-3 py-2">Mode</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentOrders.map((order) => {
                      const customerName =
                        (order.customer_name ?? "").trim() || "Client anonyme";
                      const customerPhone = (order.customer_phone ?? "").trim() || "-";
                      const normalizedStatus = normalizeOrderStatus(order.status);

                      return (
                        <tr
                          key={order.id}
                          className="border-b border-slate-100 text-slate-700 transition hover:bg-sky-50/40"
                        >
                          <td className="px-3 py-3 font-medium">{customerName}</td>
                          <td className="px-3 py-3">{customerPhone}</td>
                          <td className="px-3 py-3">{formatDateTime(order.created_at)}</td>
                          <td className="px-3 py-3">
                            <StatusBadge status={normalizedStatus} />
                          </td>
                          <td className="px-3 py-3 font-semibold text-slate-900">
                            {formatDh(order.total)}
                          </td>
                          <td className="px-3 py-3 text-slate-600">
                            {getModeLabel(order.fulfillment_method)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </AnalyticsTableCard>
          </>
        )}
      </div>
    </section>
  );
}
