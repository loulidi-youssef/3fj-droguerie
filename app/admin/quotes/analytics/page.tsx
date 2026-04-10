import Link from "next/link";
import { redirect } from "next/navigation";
import { AnalyticsGrid } from "./components/analytics-grid";
import { ChartCard } from "./components/chart-card";
import { StatCard } from "./components/stat-card";
import { StatusBadge, type DashboardStatus } from "./components/status-badge";
import {
  getAdminQuoteAnalytics,
  resolveQuoteAnalyticsRange,
  type QuoteAnalyticsRangeKey,
} from "@/lib/admin-quotes";
import { hasValidAdminSession, isAdminAuthConfigured } from "@/lib/admin-auth";
import { formatDh } from "@/lib/currency";
import { type QuoteRequestStatus } from "@/lib/quote-requests";

type AdminQuoteAnalyticsPageProps = {
  searchParams: {
    range?: string | string[];
    from?: string | string[];
    to?: string | string[];
  };
};

type DonutSegment = {
  label: string;
  value: number;
  color: string;
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

const asRecord = (value: unknown): Record<string, unknown> | null => {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }
  return value as Record<string, unknown>;
};

const toStringOrDefault = (value: unknown, fallback = ""): string => {
  if (typeof value !== "string") {
    return fallback;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : fallback;
};

const formatDateTime = (value: string): string => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("fr-MA", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
};

const mapStatus = (status: QuoteRequestStatus): DashboardStatus => {
  if (status === "converted") {
    return "confirmed";
  }
  if (status === "closed") {
    return "cancelled";
  }
  if (status === "contacted") {
    return "processing";
  }
  return "pending";
};

const getStatusLabel = (status: DashboardStatus): string => {
  if (status === "confirmed") {
    return "Confirmed";
  }
  if (status === "cancelled") {
    return "Cancelled";
  }
  if (status === "processing") {
    return "Processing";
  }
  return "Pending";
};

const buildDonutBackground = (segments: DonutSegment[]): string => {
  const total = segments.reduce((sum, segment) => sum + segment.value, 0);
  if (total <= 0) {
    return "conic-gradient(#e2e8f0 0deg 360deg)";
  }

  let cursor = 0;
  const slices: string[] = [];
  for (const segment of segments) {
    if (segment.value <= 0) {
      continue;
    }

    const sweep = (segment.value / total) * 360;
    const nextCursor = cursor + sweep;
    slices.push(`${segment.color} ${cursor}deg ${nextCursor}deg`);
    cursor = nextCursor;
  }

  return `conic-gradient(${slices.join(", ")})`;
};

const buildLinePath = (
  points: Array<{ date: string; count: number }>,
  width: number,
  height: number,
): string => {
  if (points.length === 0) {
    return "";
  }

  const maxCount = Math.max(1, ...points.map((point) => point.count));
  const stepX = points.length > 1 ? width / (points.length - 1) : 0;

  return points
    .map((point, index) => {
      const x = stepX * index;
      const y = height - (point.count / maxCount) * height;
      return `${index === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
};

const rangeOptions: Array<{ value: QuoteAnalyticsRangeKey; label: string }> = [
  { value: "today", label: "Today" },
  { value: "7d", label: "7 days" },
  { value: "30d", label: "30 days" },
];

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

const RejectedIcon = () => (
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

  const selectedRange = toSingleValue(searchParams.range).trim().toLowerCase();
  const fromInput = toSingleValue(searchParams.from).trim();
  const toInput = toSingleValue(searchParams.to).trim();

  const range = resolveQuoteAnalyticsRange({
    range: selectedRange,
    from: fromInput,
    to: toInput,
  });

  const analytics = await getAdminQuoteAnalytics(range);

  const pendingCount = analytics.filteredStatusBreakdown.new;
  const processingCount = analytics.filteredStatusBreakdown.contacted;
  const confirmedCount = analytics.filteredStatusBreakdown.converted;
  const cancelledCount = analytics.filteredStatusBreakdown.closed;

  const donutSegments: DonutSegment[] = [
    { label: "Pending", value: pendingCount, color: "#f59e0b" },
    { label: "Processing", value: processingCount, color: "#0ea5e9" },
    { label: "Confirmed", value: confirmedCount, color: "#10b981" },
    { label: "Cancelled", value: cancelledCount, color: "#ef4444" },
  ];

  const totalForDonut = donutSegments.reduce((sum, segment) => sum + segment.value, 0);
  const donutBackground = buildDonutBackground(donutSegments);

  const chartWidth = 920;
  const chartHeight = 220;
  const linePath = buildLinePath(analytics.dailyActivity, chartWidth, chartHeight);

  return (
    <section className="bg-brand-light py-12">
      <div className="mx-auto max-w-7xl px-4 sm:px-5 lg:px-6">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-3xl font-extrabold text-brand-blue">Quote Analytics</h1>
            <p className="mt-1 text-sm text-slate-600">
              Dashboard CRM moderne pour suivre les demandes de devis et leur evolution.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href="/admin/quotes"
              className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-brand-orange hover:text-brand-orange"
            >
              Liste devis
            </Link>
            <Link
              href="/admin"
              className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-brand-orange hover:text-brand-orange"
            >
              Dashboard
            </Link>
          </div>
        </div>

        <form method="get" action="/admin/quotes/analytics" className="mb-5 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="grid gap-3 md:grid-cols-4">
            <label className="block">
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-600">
                Time range
              </span>
              <select
                name="range"
                defaultValue={range.key}
                className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700"
              >
                {rangeOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-600">From</span>
              <input
                type="date"
                name="from"
                defaultValue={range.fromDateInput}
                className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-700"
              />
            </label>
            <label className="block">
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-600">To</span>
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
                Apply filters
              </button>
            </div>
          </div>
        </form>

        <div className="mb-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            title="Total Devis"
            value={analytics.filteredTotalQuotes}
            subtitle="Total des demandes"
            tone="blue"
            icon={<TotalIcon />}
          />
          <StatCard
            title="Confirmed Devis"
            value={confirmedCount}
            subtitle="Status: confirmed"
            tone="green"
            icon={<ConfirmedIcon />}
          />
          <StatCard
            title="Pending Devis"
            value={pendingCount}
            subtitle="Status: pending"
            tone="orange"
            icon={<PendingIcon />}
          />
          <StatCard
            title="Rejected / Cancelled"
            value={cancelledCount}
            subtitle="Status: rejected / cancelled"
            tone="red"
            icon={<RejectedIcon />}
          />
        </div>

        <AnalyticsGrid>
          <div className="xl:col-span-1">
            <ChartCard
              title="Status Distribution"
              subtitle="Pending, processing, confirmed, cancelled"
            >
              <div className="flex items-center gap-4">
                <div
                  className="relative h-40 w-40 shrink-0 rounded-full"
                  style={{ background: donutBackground }}
                  aria-label="Quote status donut chart"
                >
                  <div className="absolute inset-[22%] rounded-full bg-white" />
                </div>
                <div className="space-y-2 text-sm">
                  {donutSegments.map((segment) => {
                    const percent = totalForDonut > 0 ? Math.round((segment.value / totalForDonut) * 1000) / 10 : 0;
                    return (
                      <div key={segment.label} className="flex items-center gap-2">
                        <span
                          className="inline-block h-3 w-3 rounded-full"
                          style={{ backgroundColor: segment.color }}
                        />
                        <span className="font-medium text-slate-700">{segment.label}</span>
                        <span className="text-slate-500">
                          {segment.value} ({percent}%)
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </ChartCard>
          </div>

          <div className="xl:col-span-2">
            <ChartCard
              title="Devis over time"
              subtitle={`Quotes per day (${analytics.range.label})`}
              actions={
                <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
                  {analytics.dailyActivity.length} days
                </span>
              }
            >
              <div className="rounded-xl border border-slate-100 bg-slate-50 p-3">
                <svg
                  viewBox={`0 0 ${chartWidth} ${chartHeight + 40}`}
                  className="h-[280px] w-full"
                  role="img"
                  aria-label="Quote activity line chart"
                >
                  <defs>
                    <linearGradient id="quoteLineFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#2563eb" stopOpacity="0.25" />
                      <stop offset="100%" stopColor="#2563eb" stopOpacity="0.02" />
                    </linearGradient>
                  </defs>
                  <line x1="0" y1={chartHeight} x2={chartWidth} y2={chartHeight} stroke="#cbd5e1" strokeWidth="1.5" />
                  {linePath ? (
                    <>
                      <path
                        d={`${linePath} L ${chartWidth},${chartHeight} L 0,${chartHeight} Z`}
                        fill="url(#quoteLineFill)"
                      />
                      <path d={linePath} fill="none" stroke="#2563eb" strokeWidth="3" strokeLinecap="round" />
                    </>
                  ) : null}
                  {analytics.dailyActivity.map((point, index) => {
                    if (index % Math.max(1, Math.floor(analytics.dailyActivity.length / 8)) !== 0) {
                      return null;
                    }

                    const x =
                      analytics.dailyActivity.length > 1
                        ? (chartWidth / (analytics.dailyActivity.length - 1)) * index
                        : chartWidth / 2;
                    return (
                      <text key={point.date} x={x} y={chartHeight + 18} textAnchor="middle" className="fill-slate-500 text-[11px]">
                        {point.date.slice(5)}
                      </text>
                    );
                  })}
                </svg>
              </div>
            </ChartCard>
          </div>
        </AnalyticsGrid>

        <div className="mt-5">
          <ChartCard
            title="Quote Requests Summary"
            subtitle="Dernieres demandes avec statut et montant estime"
          >
            {analytics.recentQuoteRequests.length === 0 ? (
              <p className="rounded-xl bg-slate-50 p-4 text-sm text-slate-600">
                Aucune demande sur cette periode.
              </p>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-slate-200">
                <table className="min-w-full text-left text-sm">
                  <thead className="bg-slate-50">
                    <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
                      <th className="px-3 py-2">Nom client</th>
                      <th className="px-3 py-2">Telephone</th>
                      <th className="px-3 py-2">Date</th>
                      <th className="px-3 py-2">Statut</th>
                      <th className="px-3 py-2">Montant estime</th>
                    </tr>
                  </thead>
                  <tbody>
                    {analytics.recentQuoteRequests.map((request) => {
                      const payloadRecord = asRecord(request.payload);
                      const customerRecord = asRecord(payloadRecord?.customer);

                      const customerName =
                        toStringOrDefault(customerRecord?.name) ||
                        toStringOrDefault(payloadRecord?.customerName) ||
                        toStringOrDefault(payloadRecord?.customer_name) ||
                        "Client anonyme";
                      const customerPhone =
                        toStringOrDefault(customerRecord?.phone) ||
                        toStringOrDefault(payloadRecord?.customerPhone) ||
                        toStringOrDefault(payloadRecord?.customer_phone) ||
                        "-";

                      const dashboardStatus = mapStatus(request.status);

                      return (
                        <tr
                          key={request.id}
                          className="border-b border-slate-100 text-slate-700 transition hover:bg-slate-50/80"
                        >
                          <td className="px-3 py-3 font-medium">{customerName}</td>
                          <td className="px-3 py-3">{customerPhone}</td>
                          <td className="px-3 py-3">{formatDateTime(request.createdAt)}</td>
                          <td className="px-3 py-3">
                            <StatusBadge
                              status={dashboardStatus}
                              label={getStatusLabel(dashboardStatus)}
                            />
                          </td>
                          <td className="px-3 py-3 font-semibold text-slate-900">
                            {formatDh(request.payload.summary.estimatedSubtotal)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </ChartCard>
        </div>
      </div>
    </section>
  );
}

