import Link from "next/link";
import { redirect } from "next/navigation";
import {
  QUOTE_STATUS_BADGE_CLASSNAME,
  QUOTE_STATUS_LABEL,
  getAdminQuoteAnalytics,
  resolveQuoteAnalyticsRange,
  type QuoteAnalyticsRangeKey,
  type QuoteStatusBreakdown,
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

const STATUS_ORDER: QuoteRequestStatus[] = ["new", "contacted", "converted", "closed"];

const STATUS_CHART_COLORS: Record<QuoteRequestStatus, string> = {
  new: "#0284c7",
  contacted: "#d97706",
  converted: "#16a34a",
  closed: "#64748b",
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

const formatDay = (value: string): string => {
  const date = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("fr-MA", {
    day: "2-digit",
    month: "2-digit",
  }).format(date);
};

const getItemsSummaryLabel = (
  items: Array<{
    productName: string;
    quantity: number;
  }>,
): string => {
  if (items.length === 0) {
    return "Aucun article";
  }

  if (items.length === 1) {
    const item = items[0];
    return `${item.productName} x${item.quantity}`;
  }

  const first = items[0];
  return `${first.productName} +${items.length - 1} autre(s)`;
};

const buildStatusPieBackground = (statusBreakdown: QuoteStatusBreakdown): string => {
  const total = STATUS_ORDER.reduce((sum, status) => sum + statusBreakdown[status], 0);
  if (total <= 0) {
    return "conic-gradient(#cbd5e1 0deg 360deg)";
  }

  let cursor = 0;
  const segments: string[] = [];
  for (const status of STATUS_ORDER) {
    const count = statusBreakdown[status];
    if (count <= 0) {
      continue;
    }

    const sweep = (count / total) * 360;
    const nextCursor = cursor + sweep;
    segments.push(`${STATUS_CHART_COLORS[status]} ${cursor}deg ${nextCursor}deg`);
    cursor = nextCursor;
  }

  return `conic-gradient(${segments.join(", ")})`;
};

const getStatusPercent = (
  status: QuoteRequestStatus,
  statusBreakdown: QuoteStatusBreakdown,
): number => {
  const total = STATUS_ORDER.reduce((sum, key) => sum + statusBreakdown[key], 0);
  if (total <= 0) {
    return 0;
  }

  return Math.round((statusBreakdown[status] / total) * 1000) / 10;
};

const rangeOptions: Array<{ value: QuoteAnalyticsRangeKey; label: string }> = [
  { value: "today", label: "Aujourd'hui" },
  { value: "7d", label: "7 derniers jours" },
  { value: "30d", label: "30 derniers jours" },
  { value: "custom", label: "Personnalise" },
];

export default async function AdminQuoteAnalyticsPage({
  searchParams,
}: AdminQuoteAnalyticsPageProps) {
  if (!isAdminAuthConfigured()) {
    return (
      <section className="bg-brand-light py-12">
        <div className="mx-auto max-w-3xl rounded-2xl bg-white p-6 shadow-card">
          <h1 className="text-2xl font-extrabold text-brand-blue">Analytics devis</h1>
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
  const maxDailyCount = Math.max(1, ...analytics.dailyActivity.map((point) => point.count));
  const pieBackground = buildStatusPieBackground(analytics.filteredStatusBreakdown);

  return (
    <section className="bg-brand-light py-12">
      <div className="mx-auto max-w-7xl px-4 sm:px-5 lg:px-6">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h1 className="text-3xl font-extrabold text-brand-blue">Analytics devis</h1>
            <p className="mt-1 text-sm text-slate-600">
              Suivi des volumes, conversions et tendances produits pour les demandes de devis.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href="/admin/quotes"
              className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700"
            >
              Liste devis
            </Link>
            <Link
              href="/admin"
              className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700"
            >
              Dashboard
            </Link>
          </div>
        </div>

        <form
          method="get"
          action="/admin/quotes/analytics"
          className="mb-4 rounded-2xl bg-white p-4 shadow-card"
        >
          <div className="grid gap-3 lg:grid-cols-4">
            <label className="block">
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-600">
                Periode
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
            <div className="flex items-end gap-2">
              <button
                type="submit"
                className="w-full rounded-xl bg-brand-blue px-4 py-2 text-sm font-semibold text-white"
              >
                Appliquer
              </button>
            </div>
          </div>
        </form>

        <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          <article className="rounded-2xl bg-white p-4 shadow-card">
            <p className="text-xs uppercase tracking-wide text-slate-500">Total devis</p>
            <p className="mt-1 text-2xl font-extrabold text-brand-blue">
              {analytics.metrics.totalQuotesAllTime}
            </p>
          </article>
          <article className="rounded-2xl bg-white p-4 shadow-card">
            <p className="text-xs uppercase tracking-wide text-slate-500">Aujourd'hui</p>
            <p className="mt-1 text-2xl font-extrabold text-slate-900">
              {analytics.metrics.quotesToday}
            </p>
          </article>
          <article className="rounded-2xl bg-white p-4 shadow-card">
            <p className="text-xs uppercase tracking-wide text-slate-500">Cette semaine</p>
            <p className="mt-1 text-2xl font-extrabold text-slate-900">
              {analytics.metrics.quotesThisWeek}
            </p>
          </article>
          <article className="rounded-2xl bg-white p-4 shadow-card">
            <p className="text-xs uppercase tracking-wide text-slate-500">Ce mois</p>
            <p className="mt-1 text-2xl font-extrabold text-slate-900">
              {analytics.metrics.quotesThisMonth}
            </p>
          </article>
          <article className="rounded-2xl bg-white p-4 shadow-card">
            <p className="text-xs uppercase tracking-wide text-slate-500">Conversion globale</p>
            <p className="mt-1 text-2xl font-extrabold text-emerald-700">
              {analytics.metrics.conversionRateAllTime}%
            </p>
          </article>
          <article className="rounded-2xl bg-white p-4 shadow-card">
            <p className="text-xs uppercase tracking-wide text-slate-500">
              Conversion ({analytics.range.label})
            </p>
            <p className="mt-1 text-2xl font-extrabold text-emerald-700">
              {analytics.filteredConversionRate}%
            </p>
          </article>
        </div>

        <div className="mb-4 grid gap-3 md:grid-cols-4">
          {STATUS_ORDER.map((status) => (
            <article key={status} className="rounded-2xl bg-white p-4 shadow-card">
              <p className="text-xs uppercase tracking-wide text-slate-500">
                {QUOTE_STATUS_LABEL[status]}
              </p>
              <p className="mt-1 text-2xl font-extrabold text-slate-900">
                {analytics.metrics.statusBreakdownAllTime[status]}
              </p>
            </article>
          ))}
        </div>

        {analytics.isRangeDatasetTruncated ? (
          <p className="mb-4 rounded-xl bg-amber-50 p-3 text-sm font-medium text-amber-700">
            La periode contient un volume tres important. Les graphiques et top produits sont
            bases sur un echantillon recent (max 5000 demandes), mais les compteurs globaux restent exacts.
          </p>
        ) : null}

        <div className="mb-4 grid gap-4 xl:grid-cols-3">
          <article className="rounded-2xl bg-white p-4 shadow-card xl:col-span-2">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-lg font-bold text-brand-blue">Devis par jour ({analytics.range.label})</h2>
              <p className="text-xs text-slate-500">{analytics.filteredTotalQuotes} devis</p>
            </div>
            <div className="overflow-x-auto">
              <div className="flex min-w-[680px] items-end gap-2 rounded-xl bg-slate-50 p-3">
                {analytics.dailyActivity.map((point) => {
                  const barHeight = Math.max(
                    6,
                    Math.round((point.count / maxDailyCount) * 140),
                  );

                  return (
                    <div key={point.date} className="flex w-6 flex-col items-center gap-1">
                      <div
                        title={`${point.date}: ${point.count}`}
                        className="w-full rounded-t bg-brand-blue/80"
                        style={{ height: `${barHeight}px` }}
                      />
                      <p className="text-[10px] text-slate-500">{formatDay(point.date)}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          </article>

          <article className="rounded-2xl bg-white p-4 shadow-card">
            <h2 className="text-lg font-bold text-brand-blue">
              Repartition statuts ({analytics.range.label})
            </h2>
            <div className="mt-3 flex items-center gap-4">
              <div
                className="relative h-28 w-28 shrink-0 rounded-full"
                style={{ background: pieBackground }}
                aria-label="Graphique statuts devis"
              >
                <div className="absolute inset-[18%] rounded-full bg-white" />
              </div>
              <div className="space-y-2 text-sm">
                {STATUS_ORDER.map((status) => (
                  <div key={status} className="flex items-center gap-2">
                    <span
                      className="inline-block h-3 w-3 rounded-full"
                      style={{ backgroundColor: STATUS_CHART_COLORS[status] }}
                    />
                    <span className="font-medium text-slate-700">{QUOTE_STATUS_LABEL[status]}</span>
                    <span className="text-slate-500">
                      {analytics.filteredStatusBreakdown[status]} ({getStatusPercent(status, analytics.filteredStatusBreakdown)}%)
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </article>
        </div>

        <div className="mb-4 grid gap-4 xl:grid-cols-2">
          <article className="rounded-2xl bg-white p-4 shadow-card">
            <h2 className="text-lg font-bold text-brand-blue">Top produits demandes</h2>
            {analytics.topProducts.length === 0 ? (
              <p className="mt-3 text-sm text-slate-600">
                Aucun produit demande sur cette periode.
              </p>
            ) : (
              <div className="mt-3 overflow-x-auto">
                <table className="min-w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
                      <th className="px-2 py-2">Produit</th>
                      <th className="px-2 py-2">Nb devis</th>
                      <th className="px-2 py-2">Quantite</th>
                    </tr>
                  </thead>
                  <tbody>
                    {analytics.topProducts.map((product) => (
                      <tr key={`${product.productId}::${product.productName}`} className="border-b border-slate-100 text-slate-700">
                        <td className="px-2 py-2 font-medium">{product.productName}</td>
                        <td className="px-2 py-2">{product.quoteRequestCount}</td>
                        <td className="px-2 py-2">{product.totalRequestedQuantity}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </article>

          <article className="rounded-2xl bg-white p-4 shadow-card">
            <h2 className="text-lg font-bold text-brand-blue">
              Activite recente ({analytics.range.label})
            </h2>
            {analytics.recentQuoteRequests.length === 0 ? (
              <p className="mt-3 text-sm text-slate-600">Aucune demande recente sur cette periode.</p>
            ) : (
              <div className="mt-3 overflow-x-auto">
                <table className="min-w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
                      <th className="px-2 py-2">Date</th>
                      <th className="px-2 py-2">Produits</th>
                      <th className="px-2 py-2">Quantite</th>
                      <th className="px-2 py-2">Statut</th>
                    </tr>
                  </thead>
                  <tbody>
                    {analytics.recentQuoteRequests.map((request) => (
                      <tr key={request.id} className="border-b border-slate-100 text-slate-700">
                        <td className="px-2 py-2">{formatDateTime(request.createdAt)}</td>
                        <td className="px-2 py-2">
                          {getItemsSummaryLabel(
                            request.payload.items.map((item) => ({
                              productName: item.productName,
                              quantity: item.quantity,
                            })),
                          )}
                        </td>
                        <td className="px-2 py-2 font-semibold">
                          {request.payload.summary.totalQuantity}
                        </td>
                        <td className="px-2 py-2">
                          <span
                            className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${QUOTE_STATUS_BADGE_CLASSNAME[request.status]}`}
                          >
                            {QUOTE_STATUS_LABEL[request.status]}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </article>
        </div>

        <article className="rounded-2xl bg-white p-4 shadow-card">
          <h2 className="text-sm font-bold uppercase tracking-wide text-brand-blue">Valeur estimee ({analytics.range.label})</h2>
          <p className="mt-2 text-xl font-extrabold text-slate-900">
            {formatDh(
              analytics.recentQuoteRequests.reduce(
                (sum, request) => sum + request.payload.summary.estimatedSubtotal,
                0,
              ),
            )}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Somme des montants estimes des demandes recentes affichees dans le tableau.
          </p>
        </article>
      </div>
    </section>
  );
}

