import Link from "next/link";
import { redirect } from "next/navigation";
import {
  Activity,
  BarChart3,
  CalendarDays,
  CheckCircle2,
  Clock3,
  PieChart as PieChartIcon,
  Wallet,
  XCircle,
} from "lucide-react";
import { AnalyticsSectionHeader } from "./components/analytics-section-header";
import { ChartCard } from "./components/chart-card";
import { EmptyAnalyticsState } from "./components/empty-analytics-state";
import { MetricWidget } from "./components/metric-widget";
import { OrdersTable } from "./components/orders-table";
import { QuoteTrendChart } from "./components/quote-trend-chart";
import { StatCard } from "./components/stat-card";
import {
  StatusDistributionChart,
  type StatusDistributionDatum,
} from "./components/status-distribution-chart";
import { type AnalyticsOrderStatus } from "./components/status-badge";
import {
  getAdminOrders,
  type AdminOrder,
  type OrderStatus,
} from "@/lib/admin-orders";
import { hasValidAdminSession, isAdminAuthConfigured } from "@/lib/admin-auth";
import { resolveQuoteAnalyticsRange, type QuoteAnalyticsRangeKey } from "@/lib/admin-quotes";
import { formatDh } from "@/lib/currency";

type AdminOrdersAnalyticsPageProps = {
  searchParams?: {
    range?: string | string[];
    from?: string | string[];
    to?: string | string[];
  };
};

type StatusBreakdown = Record<AnalyticsOrderStatus, number>;
type DailyPoint = { date: string; count: number };

const RANGE_OPTIONS: Array<{ value: QuoteAnalyticsRangeKey; label: string }> = [
  { value: "today", label: "Today" },
  { value: "7d", label: "7 days" },
  { value: "30d", label: "30 days" },
];

const STATUS_COLOR: Record<AnalyticsOrderStatus, string> = {
  pending: "#f59e0b",
  confirmed: "#10b981",
  delivered: "#2563eb",
  cancelled: "#ef4444",
};

const STATUS_LABEL: Record<AnalyticsOrderStatus, string> = {
  pending: "En attente",
  confirmed: "Confirmee",
  delivered: "Livree",
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

  if (normalized === "cancelled" || normalized === "canceled") {
    return "cancelled";
  }
  if (normalized === "delivered" || normalized === "livree" || normalized === "livre") {
    return "delivered";
  }
  if (normalized === "confirmed") {
    return "confirmed";
  }
  if (normalized === "new") {
    return "pending";
  }

  return "pending";
};

const createEmptyBreakdown = (): StatusBreakdown => ({
  pending: 0,
  confirmed: 0,
  delivered: 0,
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

const toOrderTotal = (order: AdminOrder): number => {
  if (typeof order.total === "number" && Number.isFinite(order.total)) {
    return order.total;
  }
  const maybeTotalPrice = Number((order as unknown as { total_price?: unknown }).total_price ?? 0);
  return Number.isFinite(maybeTotalPrice) ? maybeTotalPrice : 0;
};

const toOrderPhone = (order: AdminOrder): string => {
  const customerPhone = (order.customer_phone ?? "").trim();
  if (customerPhone) {
    return customerPhone;
  }
  const fallbackPhone = (order as unknown as { phone?: string }).phone;
  return typeof fallbackPhone === "string" && fallbackPhone.trim() ? fallbackPhone.trim() : "-";
};

const toOrderName = (order: AdminOrder): string => {
  const customerName = (order.customer_name ?? "").trim();
  if (customerName) {
    return customerName;
  }
  return "Client anonyme";
};

const toPercent = (value: number): string => `${Math.round(value * 10) / 10}%`;

export default async function AdminOrdersAnalyticsPage({
  searchParams,
}: AdminOrdersAnalyticsPageProps) {
  if (!isAdminAuthConfigured()) {
    return (
      <section className="bg-brand-light py-12">
        <div className="mx-auto max-w-3xl rounded-2xl bg-white p-6 shadow-card">
          <h1 className="text-2xl font-extrabold text-brand-blue">Commandes Analytics</h1>
          <p className="mt-3 text-sm text-slate-700">
            Configurez
            <span className="font-semibold"> ADMIN_ACCESS_PASSWORD_HASH </span>
            et
            <span className="font-semibold"> ADMIN_SESSION_SECRET </span>
            puis redemarrez le serveur.
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
  const ordersToday = allOrders.filter((order) =>
    isWithinInclusiveDateRange(order.created_at, todayInput, todayInput),
  ).length;

  const breakdown = getStatusBreakdown(filteredOrders);
  const totalOrders = filteredOrders.length;
  const totalCa = filteredOrders.reduce((sum, order) => sum + toOrderTotal(order), 0);
  const confirmationRate = totalOrders > 0 ? (breakdown.confirmed / totalOrders) * 100 : 0;
  const cancellationRate = totalOrders > 0 ? (breakdown.cancelled / totalOrders) * 100 : 0;
  const dailySeries = getDailyActivity(allOrders, range.fromDateInput, range.toDateInput);

  const recentOrders = [...filteredOrders]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 25)
    .map((order) => ({
      id: order.id,
      customerName: toOrderName(order),
      customerPhone: toOrderPhone(order),
      createdAt: order.created_at,
      status: normalizeOrderStatus(order.status),
      total: toOrderTotal(order),
    }));

  const distributionData: StatusDistributionDatum[] = [
    {
      key: "pending",
      label: STATUS_LABEL.pending,
      value: breakdown.pending,
      color: STATUS_COLOR.pending,
    },
    {
      key: "confirmed",
      label: STATUS_LABEL.confirmed,
      value: breakdown.confirmed,
      color: STATUS_COLOR.confirmed,
    },
    {
      key: "delivered",
      label: STATUS_LABEL.delivered,
      value: breakdown.delivered,
      color: STATUS_COLOR.delivered,
    },
    {
      key: "cancelled",
      label: STATUS_LABEL.cancelled,
      value: breakdown.cancelled,
      color: STATUS_COLOR.cancelled,
    },
  ];

  return (
    <section className="min-h-screen bg-gradient-to-b from-brand-light via-slate-50 to-sky-50/60 py-12">
      <div className="mx-auto max-w-7xl px-4 sm:px-5 lg:px-6">
        <AnalyticsSectionHeader
          title="Commandes Analytics"
          description="Dashboard CRM premium base sur les vraies commandes (orders)."
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
                Range
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
                <option value="custom">Custom</option>
              </select>
            </label>
            <label className="block">
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-600">
                From
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
                To
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
                Apply
              </button>
            </div>
          </div>
        </form>

        <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            title="Total Commandes"
            value={totalOrders}
            subtitle="Total orders"
            note={`Periode: ${range.label}`}
            tone="blue"
            icon={<BarChart3 className="h-5 w-5 text-sky-700" />}
          />
          <StatCard
            title="Confirmees"
            value={breakdown.confirmed}
            subtitle="Status confirmed"
            note={toPercent(confirmationRate)}
            tone="green"
            icon={<CheckCircle2 className="h-5 w-5 text-emerald-700" />}
          />
          <StatCard
            title="En attente"
            value={breakdown.pending}
            subtitle="Status pending"
            note="Suivi requis"
            tone="orange"
            icon={<Clock3 className="h-5 w-5 text-amber-700" />}
          />
          <StatCard
            title="Annulees"
            value={breakdown.cancelled}
            subtitle="Status cancelled"
            note={toPercent(cancellationRate)}
            tone="red"
            icon={<XCircle className="h-5 w-5 text-rose-700" />}
          />
        </div>

        {totalOrders === 0 ? (
          <EmptyAnalyticsState
            title="Aucune commande sur cette periode"
            description="Le layout est pret. Ajustez la plage de dates pour afficher les KPI, charts et tableau."
          />
        ) : (
          <>
            <div className="mb-6 grid gap-5 xl:grid-cols-5">
              <ChartCard
                className="xl:col-span-3"
                title="Evolution des commandes"
                subtitle="Volume journalier base sur created_at"
                actions={
                  <span className="rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-xs font-semibold text-sky-700">
                    {range.label}
                  </span>
                }
              >
                <QuoteTrendChart data={dailySeries} valueLabel="commandes" />
              </ChartCard>

              <div className="grid gap-3 xl:col-span-2">
                <MetricWidget
                  label="Taux de confirmation"
                  value={toPercent(confirmationRate)}
                  helper="confirmed / total"
                  tone="green"
                  icon={<CheckCircle2 className="h-4 w-4" />}
                />
                <MetricWidget
                  label="Taux d'annulation"
                  value={toPercent(cancellationRate)}
                  helper="cancelled / total"
                  tone="red"
                  icon={<XCircle className="h-4 w-4" />}
                />
                <MetricWidget
                  label="Commandes aujourd'hui"
                  value={`${ordersToday}`}
                  helper="Date locale"
                  tone="orange"
                  icon={<CalendarDays className="h-4 w-4" />}
                />
                <MetricWidget
                  label="Total CA"
                  value={formatDh(totalCa)}
                  helper="Somme total_price/total"
                  tone="blue"
                  icon={<Wallet className="h-4 w-4" />}
                />
              </div>
            </div>

            <div className="mb-6 grid gap-5 xl:grid-cols-5">
              <ChartCard
                className="xl:col-span-3"
                title="Distribution des statuts"
                subtitle="pending / confirmed / delivered / cancelled"
                actions={
                  <span className="inline-flex items-center gap-1 rounded-full border border-violet-200 bg-violet-50 px-3 py-1 text-xs font-semibold text-violet-700">
                    <PieChartIcon className="h-3.5 w-3.5" />
                    Donut
                  </span>
                }
              >
                <StatusDistributionChart data={distributionData} />
              </ChartCard>

              <ChartCard
                className="xl:col-span-2"
                title="Insights"
                subtitle="Indicateurs rapides"
              >
                <div className="grid gap-3">
                  <MetricWidget
                    label="Livrees"
                    value={`${breakdown.delivered}`}
                    helper="Commandes terminees"
                    tone="blue"
                    icon={<Activity className="h-4 w-4" />}
                  />
                  <MetricWidget
                    label="Confirmees + Livrees"
                    value={`${breakdown.confirmed + breakdown.delivered}`}
                    helper="Succes global"
                    tone="green"
                    icon={<CheckCircle2 className="h-4 w-4" />}
                  />
                </div>
              </ChartCard>
            </div>

            <ChartCard
              title="Recent Orders"
              subtitle="Commandes recentes avec statuts normalises"
            >
              <OrdersTable rows={recentOrders} formatDate={formatDateTime} />
            </ChartCard>
          </>
        )}
      </div>
    </section>
  );
}
