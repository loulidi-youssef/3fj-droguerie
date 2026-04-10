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
import { StatusBadge } from "./components/status-badge";
import {
  getAdminQuoteAnalytics,
  resolveQuoteAnalyticsRange,
  type QuoteAnalyticsRangeKey,
} from "@/lib/admin-quotes";
import { hasValidAdminSession, isAdminAuthConfigured } from "@/lib/admin-auth";
import { formatDh } from "@/lib/currency";
import { type QuoteRequestStatus } from "@/lib/quote-requests";

type AdminQuoteAnalyticsPageProps = {
  searchParams?: {
    range?: string | string[];
    from?: string | string[];
    to?: string | string[];
  };
};

const RANGE_OPTIONS: Array<{ value: QuoteAnalyticsRangeKey; label: string }> = [
  { value: "today", label: "Aujourd'hui" },
  { value: "7d", label: "7 jours" },
  { value: "30d", label: "30 jours" },
];

const STATUS_COLOR: Record<QuoteRequestStatus, string> = {
  new: "#f59e0b",
  contacted: "#2563eb",
  converted: "#10b981",
  closed: "#ef4444",
};

const STATUS_LABEL: Record<QuoteRequestStatus, string> = {
  new: "Nouveau",
  contacted: "Contacte",
  converted: "Converti",
  closed: "Cloture",
};

const SOURCE_LABEL: Record<string, string> = {
  cart: "Panier",
  product: "Produit",
  checkout: "Checkout",
  quote: "Devis",
  unknown: "Inconnu",
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

const toStringOrDefault = (value: unknown, fallback = ""): string => {
  if (typeof value !== "string") {
    return fallback;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : fallback;
};

const toSourceLabel = (source: unknown): string => {
  const normalized = toStringOrDefault(source, "unknown").toLowerCase();
  return SOURCE_LABEL[normalized] ?? normalized;
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

  const analytics = await getAdminQuoteAnalytics(range);

  const totalQuotes = analytics.filteredTotalQuotes;
  const confirmedCount = analytics.filteredStatusBreakdown.converted;
  const pendingCount =
    analytics.filteredStatusBreakdown.new + analytics.filteredStatusBreakdown.contacted;
  const closedCount = analytics.filteredStatusBreakdown.closed;
  const conversionRate = analytics.filteredConversionRate;
  const trendShare = totalQuotes > 0 ? Math.round((totalQuotes / Math.max(1, analytics.metrics.totalQuotesAllTime)) * 100) : 0;

  const statusData: StatusDistributionDatum[] = [
    {
      key: "new",
      label: STATUS_LABEL.new,
      value: analytics.filteredStatusBreakdown.new,
      color: STATUS_COLOR.new,
    },
    {
      key: "contacted",
      label: STATUS_LABEL.contacted,
      value: analytics.filteredStatusBreakdown.contacted,
      color: STATUS_COLOR.contacted,
    },
    {
      key: "converted",
      label: STATUS_LABEL.converted,
      value: analytics.filteredStatusBreakdown.converted,
      color: STATUS_COLOR.converted,
    },
    {
      key: "closed",
      label: STATUS_LABEL.closed,
      value: analytics.filteredStatusBreakdown.closed,
      color: STATUS_COLOR.closed,
    },
  ];

  return (
    <section className="min-h-screen bg-gradient-to-b from-brand-light via-sky-50/40 to-brand-light py-12">
      <div className="mx-auto max-w-7xl px-4 sm:px-5 lg:px-6">
        <AnalyticsSectionHeader
          title="Devis / Quote Analytics"
          description="Vue CRM moderne pour suivre les demandes, la conversion et les tendances commerciales."
          actions={
            <>
              <Link
                href="/admin/quotes"
                className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-brand-orange hover:text-brand-orange"
              >
                Liste des devis
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
            title="Total Devis"
            value={totalQuotes}
            subtitle="Total des demandes"
            note={getTrendNote(trendShare)}
            tone="blue"
            icon={<TotalIcon />}
          />
          <StatCard
            title="Devis Confirmes"
            value={confirmedCount}
            subtitle="Opportunites validees"
            note={`${conversionRate}% de conversion`}
            tone="green"
            icon={<ConfirmedIcon />}
          />
          <StatCard
            title="Devis En attente"
            value={pendingCount}
            subtitle="A traiter"
            note={`${analytics.filteredStatusBreakdown.new} nouveaux + ${analytics.filteredStatusBreakdown.contacted} contactes`}
            tone="orange"
            icon={<PendingIcon />}
          />
          <StatCard
            title="Devis Clotures"
            value={closedCount}
            subtitle="Non retenus"
            note="Annules / fermes"
            tone="red"
            icon={<ClosedIcon />}
          />
        </div>

        {analytics.isRangeDatasetTruncated ? (
          <div className="mb-5 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            Le volume de la periode est eleve. Les graphiques utilisent un echantillon limite pour rester rapides.
          </div>
        ) : null}

        {totalQuotes === 0 ? (
          <EmptyAnalyticsState
            title="Aucune demande de devis sur cette periode"
            description="Essayez une autre plage de dates ou revenez plus tard. Les cartes et graphiques se rempliront automatiquement des que des demandes arrivent."
          />
        ) : (
          <>
            <AnalyticsGrid className="mb-5 xl:grid-cols-5">
              <ChartCard
                className="xl:col-span-2"
                title="Repartition des statuts"
                subtitle="Nouveau, Contacte, Converti, Cloture"
              >
                <StatusDistributionChart data={statusData} />
              </ChartCard>

              <ChartCard
                className="xl:col-span-3"
                title="Evolution des devis"
                subtitle={`Activite journaliere (${analytics.range.label})`}
                actions={
                  <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
                    {analytics.dailyActivity.length} jours
                  </span>
                }
              >
                <QuoteTrendChart data={analytics.dailyActivity} />
              </ChartCard>
            </AnalyticsGrid>

            <div className="grid gap-5 xl:grid-cols-5">
              <ChartCard
                className="xl:col-span-4"
                title="Devis recents"
                subtitle="Suivi client, statut et estimation"
              >
                <div className="overflow-x-auto rounded-2xl border border-slate-200">
                  <table className="min-w-full text-left text-sm">
                    <thead className="bg-slate-50">
                      <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
                        <th className="px-3 py-2">Client</th>
                        <th className="px-3 py-2">Telephone</th>
                        <th className="px-3 py-2">Date</th>
                        <th className="px-3 py-2">Statut</th>
                        <th className="px-3 py-2">Montant estime</th>
                        <th className="px-3 py-2">Source</th>
                      </tr>
                    </thead>
                    <tbody>
                      {analytics.recentQuoteRequests.map((request) => {
                        const customerName = "Client anonyme";
                        const customerPhone = "-";
                        const estimatedSubtotal = request.payload.summary.estimatedSubtotal ?? 0;
                        const sourceLabel = toSourceLabel(request.payload.source);

                        return (
                          <tr
                            key={request.id}
                            className="border-b border-slate-100 text-slate-700 transition hover:bg-sky-50/40"
                          >
                            <td className="px-3 py-3 font-medium">{customerName}</td>
                            <td className="px-3 py-3">{customerPhone}</td>
                            <td className="px-3 py-3">{formatDateTime(request.createdAt)}</td>
                            <td className="px-3 py-3">
                              <StatusBadge status={request.status} />
                            </td>
                            <td className="px-3 py-3 font-semibold text-slate-900">
                              {formatDh(estimatedSubtotal)}
                            </td>
                            <td className="px-3 py-3 text-slate-600">{sourceLabel}</td>
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
                subtitle="Synthese operationnelle"
              >
                <div className="space-y-3">
                  <div className="rounded-2xl border border-sky-100 bg-sky-50 p-3">
                    <p className="text-xs uppercase tracking-wide text-sky-700">Taux conversion</p>
                    <p className="mt-1 text-2xl font-extrabold text-sky-900">{conversionRate}%</p>
                  </div>
                  <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-3">
                    <p className="text-xs uppercase tracking-wide text-emerald-700">Semaine</p>
                    <p className="mt-1 text-2xl font-extrabold text-emerald-900">{analytics.metrics.quotesThisWeek}</p>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                    <p className="text-xs uppercase tracking-wide text-slate-600">Top produits demandes</p>
                    {analytics.topProducts.length === 0 ? (
                      <p className="mt-2 text-xs text-slate-500">Aucun produit dominant.</p>
                    ) : (
                      <ul className="mt-2 space-y-1.5">
                        {analytics.topProducts.slice(0, 3).map((item) => (
                          <li key={`${item.productId}-${item.productName}`} className="text-xs text-slate-700">
                            <span className="font-semibold">{item.productName}</span>
                            <span className="text-slate-500"> ({item.quoteRequestCount} devis)</span>
                          </li>
                        ))}
                      </ul>
                    )}
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
