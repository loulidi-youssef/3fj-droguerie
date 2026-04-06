import type { AdminAdAnalyticsDashboard } from "@/lib/admin-ad-analytics";
import { formatCtr, formatMad } from "@/app/admin/publicites/lib/formatters";

type AnalyticsDashboardProps = {
  analytics: AdminAdAnalyticsDashboard;
};

export const AnalyticsDashboard = ({ analytics }: AnalyticsDashboardProps) => {
  return (
    <>
      <section className="mb-6 rounded-2xl bg-white p-5 shadow-card">
        <h2 className="text-lg font-bold text-brand-blue">Synthese monetisation</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Publicites actives
            </p>
            <p className="mt-1 text-2xl font-extrabold text-brand-blue">
              {analytics.summary.totalActiveAds}
            </p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Publicites programmees
            </p>
            <p className="mt-1 text-2xl font-extrabold text-brand-blue">
              {analytics.summary.totalScheduledAds}
            </p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Revenu estime
            </p>
            <p className="mt-1 text-2xl font-extrabold text-brand-blue">
              {formatMad(analytics.summary.totalEstimatedRevenue)}
            </p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Total vues
            </p>
            <p className="mt-1 text-2xl font-extrabold text-brand-blue">
              {analytics.summary.totalViews}
            </p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Total clics
            </p>
            <p className="mt-1 text-2xl font-extrabold text-brand-blue">
              {analytics.summary.totalClicks}
            </p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              CTR moyen
            </p>
            <p className="mt-1 text-2xl font-extrabold text-brand-blue">
              {formatCtr(analytics.summary.averageCtr)}
            </p>
          </div>
        </div>
      </section>

      <section className="mb-6 rounded-2xl bg-white p-5 shadow-card">
        <h2 className="text-lg font-bold text-brand-blue">Performance par publicite</h2>
        {analytics.rows.length === 0 ? (
          <p className="mt-3 text-sm text-slate-600">
            Aucune publicite analysee pour le moment.
          </p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
              <thead>
                <tr className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  <th className="px-3 py-2">Titre</th>
                  <th className="px-3 py-2">Position</th>
                  <th className="px-3 py-2">Plan</th>
                  <th className="px-3 py-2">Prix</th>
                  <th className="px-3 py-2">Vues</th>
                  <th className="px-3 py-2">Clics</th>
                  <th className="px-3 py-2">CTR</th>
                  <th className="px-3 py-2">Revenu</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {analytics.rows.map((row) => (
                  <tr key={row.adId}>
                    <td className="px-3 py-3">
                      <p className="font-semibold text-slate-800">{row.title}</p>
                      <p className="text-xs text-slate-500">{row.adId}</p>
                    </td>
                    <td className="px-3 py-3">{row.position === "top" ? "Top" : "Middle"}</td>
                    <td className="px-3 py-3">{row.plan?.name ?? "Aucun"}</td>
                    <td className="px-3 py-3">{row.plan ? formatMad(row.plan.price) : "-"}</td>
                    <td className="px-3 py-3">{row.views}</td>
                    <td className="px-3 py-3">{row.clicks}</td>
                    <td className="px-3 py-3">{formatCtr(row.ctr)}</td>
                    <td className="px-3 py-3">{formatMad(row.estimatedRevenue)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
};

