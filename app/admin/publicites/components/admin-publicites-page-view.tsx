import Link from "next/link";
import type { AdminAdAnalyticsDashboard, AdminAdAnalyticsRow } from "@/lib/admin-ad-analytics";
import type { AdminAdPlan } from "@/lib/admin-ad-plans";
import type { AdminAd } from "@/lib/admin-ads";
import { AdCreateForm } from "@/app/admin/publicites/components/ad-create-form";
import { AdPlansSection } from "@/app/admin/publicites/components/ad-plans-section";
import { AdsList } from "@/app/admin/publicites/components/ads-list";
import { AnalyticsDashboard } from "@/app/admin/publicites/components/analytics-dashboard";

type FormAction = (formData: FormData) => void | Promise<void>;
type LogoutAction = () => void | Promise<void>;

type AdminPublicitesPageViewProps = {
  ads: AdminAd[];
  plans: AdminAdPlan[];
  analytics: AdminAdAnalyticsDashboard;
  analyticsByAdId: Map<string, AdminAdAnalyticsRow>;
  successMessage: string;
  errorMessage: string;
  logoutAdminAction: LogoutAction;
  createAdAction: FormAction;
  updateAdAction: FormAction;
  toggleAdActiveAction: FormAction;
  deleteAdAction: FormAction;
  createPlanAction: FormAction;
  updatePlanAction: FormAction;
  togglePlanActiveAction: FormAction;
  deletePlanAction: FormAction;
};

export const AdminPublicitesPageView = ({
  ads,
  plans,
  analytics,
  analyticsByAdId,
  successMessage,
  errorMessage,
  logoutAdminAction,
  createAdAction,
  updateAdAction,
  toggleAdActiveAction,
  deleteAdAction,
  createPlanAction,
  updatePlanAction,
  togglePlanActiveAction,
  deletePlanAction,
}: AdminPublicitesPageViewProps) => {
  return (
    <section className="bg-brand-light py-12">
      <div className="mx-auto max-w-7xl px-4 sm:px-5 lg:px-6">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-3xl font-extrabold text-brand-blue">Admin publicites</h1>
            <p className="mt-1 text-sm text-slate-600">
              Gestion des publicites payantes, plans tarifaires, performances et revenu estime.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/admin/orders"
              className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700"
            >
              Voir commandes
            </Link>
            <Link
              href="/admin/products"
              className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700"
            >
              Voir produits
            </Link>
            <Link
              href="/admin/offres"
              className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700"
            >
              Voir offres
            </Link>
            <Link
              href="/admin/blog"
              className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700"
            >
              Voir blog
            </Link>
            <Link
              href="/admin/reviews"
              className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700"
            >
              Voir avis
            </Link>
            <form action={logoutAdminAction}>
              <button
                type="submit"
                className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700"
              >
                Deconnexion
              </button>
            </form>
          </div>
        </div>

        {successMessage ? (
          <p className="mb-4 rounded-xl bg-emerald-50 p-3 text-sm font-medium text-emerald-700">
            {successMessage}
          </p>
        ) : null}
        {errorMessage ? (
          <p className="mb-4 rounded-xl bg-rose-50 p-3 text-sm font-medium text-rose-700">
            {errorMessage}
          </p>
        ) : null}

        <AnalyticsDashboard analytics={analytics} />

        <AdPlansSection
          plans={plans}
          createPlanAction={createPlanAction}
          updatePlanAction={updatePlanAction}
          togglePlanActiveAction={togglePlanActiveAction}
          deletePlanAction={deletePlanAction}
        />

        <AdCreateForm plans={plans} createAdAction={createAdAction} />

        <AdsList
          ads={ads}
          plans={plans}
          analyticsByAdId={analyticsByAdId}
          updateAdAction={updateAdAction}
          toggleAdActiveAction={toggleAdActiveAction}
          deleteAdAction={deleteAdAction}
        />
      </div>
    </section>
  );
};

