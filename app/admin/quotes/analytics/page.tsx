import Link from "next/link";
import { redirect } from "next/navigation";
import { AnalyticsGrid } from "./components/analytics-grid";
import { AnalyticsSectionHeader } from "./components/analytics-section-header";
import { ChartCard } from "./components/chart-card";
import { EmptyAnalyticsState } from "./components/empty-analytics-state";
import { QuoteTrendChart } from "./components/quote-trend-chart";
import { StatCard } from "./components/stat-card";
import {
  StatusDistributionChart,
  type StatusDistributionDatum,
} from "./components/status-distribution-chart";
import { StatusBadge, type AnalyticsOrderStatus } from "./components/status-badge";
import {
  getAdminOrders,
  type AdminOrder,
  type OrderStatus,
} from "@/lib/admin-orders";
import { hasValidAdminSession, isAdminAuthConfigured } from "@/lib/admin-auth";
import { formatDh } from "@/lib/currency";
import {
  resolveQuoteAnalyticsRange,
  type QuoteAnalyticsRangeKey,
} from "@/lib/admin-quotes";

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

const toSingleValue = (value: string | string[] | undefined): string => {
  if (typeof value === "string") {
    return value;
  }
  if (Array.isArray(value)) {
    return value[0] ?? "";
  }
  return "";
};

const toIsoDateInput = (value: Date): string => {
  return value.toISOString().slice(0, 10);
};

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

const normalizeOrderStatus = (value: OrderStatus | string | null | undefined): AnalyticsOrderStatus => {
  const normalized = (value ?? "")
    .toString()
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

  if (normalized === "cancelled" || normalized === "canceled" || normalized === "annulee" || normalized === "annule") {
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

const getDailyActivity = (orders: AdminOrder[], fromDateInput: string, toDateInput: string): DailyPoint[] => {
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
    points.push({
      date: key,
      count: counts.get(key) ?? 0,
    });
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

const getTrendNote = (part: number): string => {
  if (part >= 75) {
    return "Volume eleve sur la periode";
  }
  if (part >= 40) {
    return "Volume stable";
  }
  if (part > 0) {
    return "Volume faible";
  }
  return "Aucune activite";
};

const TotalIcon = () => (
  <svg viewBox="0 0 24 24" className="h-5 w-5 text-sky-700" fill="none" stroke="currentColor" strokeWidth="1.8">
    <path d="M4 5h16v14H4z" />
    <path d="M8 9h8M8 13h5" />
  </svg>
);

const ConfirmedIcon = () => (
  <svg viewBox="0 0 24 24" className="h-5 w-5 text-emerald-700" fill="none" stroke="currentColor" strokeWidth="1.8">
    <path d="M20 6L9 17l-5-5" />
  </svg>
);

const PendingIcon = () => (
  <svg viewBox="0 0 24 24" className="h-5 w-5 text-amber-700" fill="none" stroke="currentColor" strokeWidth="1.8">
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7v5l3 2" />
  </svg>
);

const ClosedIcon = () => (
  <svg viewBox="0 0 24 24" className="h-5 w-5 text-rose-700" fill="none" stroke="currentColor" strokeWidth="1.8">
    <path d="M6 6l12 12M18 6L6 18" />
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
  const monthFromInput = toIsoDateInput(addUtcDays(todayStart, -29));

  const ordersThisWeek = allOrders.filter((order) =>
    isWithinInclusiveDateRange(order.created_at, weekFromInput, todayInput),
  ).length;
  const ordersThisMonth = allOrders.filter((order) =>
    isWithinInclusiveDateRange(order.created_at, monthFromInput, todayInput),
  ).length;

  const filteredBreakdown = getStatusBreakdown(filteredOrders);
  const totalOrders = filteredOrders.length;
  const confirmedOrders = filteredBreakdown.confirmed;
  const pendingOrders = filteredBreakdown.pending;
  const cancelledOrders = filteredBreakdown.cancelled;
  const conversionRate = totalOrders > 0 ? Math.round((confirmedOrders / totalOrders) * 1000) / 10 : 0;
  const trendShare = totalOrders > 0 ? Math.round((totalOrders / Math.max(1, allOrders.length)) * 100) : 0;

  const statusData: StatusDistributionDatum[] = [
    { key: "pending", label: STATUS_LABEL.pending, value: pendingOrders, color: STATUS_COLOR.pending },
    { key: "confirmed", label: STATUS_LABEL.confirmed, value: confirmedOrders, color: STATUS_COLOR.confirmed },
    { key: "cancelled", label: STATUS_LABEL.cancelled, value: cancelledOrders, color: STATUS_COLOR.cancelled },
  ];

  const dailyActivity = getDailyActivity(allOrders, range.fromDateInput, range.toDateInput);
  const recentOrders = [...filteredOrders]
    .sort((a, b) => {
      const first = new Date(a.created_at).getTime();
      const second = new Date(b.created_at).getTime();
      return second - first;
    })
    .slice(0, 30);

  return (
    <section className="min-h-screen bg-gradient-to-b from-brand-light via-sky-50/40 to-brand-light py-12">
      <div className="mx-auto max-w-7xl px-4 sm:px-5 lg:px-6">
        <AnalyticsSectionHeader
          title="Devis / Quote Analytics"
          description="Dashboard analytics base sur les commandes reelles (orders)."
          actions={
            <>
              <Link
                href="/admin/orders"
                className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-brand-orange hover:text-brand-orange"
              >
                Liste des commandes
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
          className="mb-5 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm"
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
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-600">Du</span>
              <input
                type="date"
                name="from"
                defaultValue={range.fromDateInput}
                className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-700"
              />
            </label>
            <label className="block">
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-600">Au</span>
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

        <div className="mb-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            title="Total Commandes"
            value={totalOrders}
            subtitle="Total sur la periode"
            note={getTrendNote(trendShare)}
            tone="blue"
            icon={<TotalIcon />}
          />
          <StatCard
            title="Commandes Confirmees"
            value={confirmedOrders}
            subtitle="Confirmees / livrees"
            note={`${conversionRate}% du total`}
            tone="green"
            icon={<ConfirmedIcon />}
          />
          <StatCard
            title="Commandes En attente"
            value={pendingOrders}
            subtitle="Nouvelles / en cours"
            note="A traiter"
            tone="orange"
            icon={<PendingIcon />}
          />
          <StatCard
            title="Commandes Annulees"
            value={cancelledOrders}
            subtitle="Annulees"
            note="Statut final negatif"
            tone="red"
            icon={<ClosedIcon />}
          />
        </div>

        {totalOrders === 0 ? (
          <EmptyAnalyticsState
            title="Aucune commande sur cette periode"
            description="Essayez une autre plage de dates. Les KPI et graphiques se mettront a jour automatiquement."
          />
        ) : (
          <>
            <AnalyticsGrid className="mb-5 xl:grid-cols-5">
              <ChartCard
                className="xl:col-span-2"
                title="Repartition des statuts"
                subtitle="Pending / Confirmed / Cancelled"
              >
                <StatusDistributionChart data={statusData} />
              </ChartCard>

              <ChartCard
                className="xl:col-span-3"
                title="Evolution des commandes"
                subtitle={`Activite journaliere (${range.label})`}
                actions={
                  <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
                    {dailyActivity.length} jours
                  </span>
                }
              >
                <QuoteTrendChart data={dailyActivity} />
              </ChartCard>
            </AnalyticsGrid>

            <div className="grid gap-5 xl:grid-cols-5">
              <ChartCard
                className="xl:col-span-4"
                title="Commandes recentes"
                subtitle="Donnees reelles depuis la table orders"
              >
                <div className="overflow-x-auto rounded-2xl border border-slate-200">
                  <table className="min-w-full text-left text-sm">
                    <thead className="bg-slate-50">
                      <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
                        <th className="px-3 py-2">Client</th>
                        <th className="px-3 py-2">Telephone</th>
                        <th className="px-3 py-2">Date</th>
                        <th className="px-3 py-2">Statut</th>
                        <th className="px-3 py-2">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {recentOrders.map((order) => {
                        const customerName = (order.customer_name ?? "").trim() || "Client anonyme";
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
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </ChartCard>

              <ChartCard
                className="xl:col-span-1"
                title="Insights rapides"
                subtitle="Synthese commandes"
              >
                <div className="space-y-3">
                  <div className="rounded-2xl border border-sky-100 bg-sky-50 p-3">
                    <p className="text-xs uppercase tracking-wide text-sky-700">Total historique</p>
                    <p className="mt-1 text-2xl font-extrabold text-sky-900">{allOrders.length}</p>
                  </div>
                  <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-3">
                    <p className="text-xs uppercase tracking-wide text-emerald-700">7 derniers jours</p>
                    <p className="mt-1 text-2xl font-extrabold text-emerald-900">{ordersThisWeek}</p>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                    <p className="text-xs uppercase tracking-wide text-slate-600">30 derniers jours</p>
                    <p className="mt-1 text-2xl font-extrabold text-slate-900">{ordersThisMonth}</p>
                  </div>
                </div>
              </ChartCard>
            </div>
          </>
        )}
      </div>
    </section>
  );
}
