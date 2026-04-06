import {
  createAdAction,
  createPlanAction,
  deleteAdAction,
  deletePlanAction,
  logoutAdminAction,
  toggleAdActiveAction,
  togglePlanActiveAction,
  updateAdAction,
  updatePlanAction,
} from "@/app/admin/publicites/actions";
import { AdminPublicitesPageView } from "@/app/admin/publicites/components/admin-publicites-page-view";
import {
  isAdminPublicitesConfigured,
  requireAdminPublicitesSession,
} from "@/app/admin/publicites/lib/auth";
import {
  getAdminPublicitesPageData,
  type AdminPublicitesSearchParams,
} from "@/app/admin/publicites/lib/page-data";

type AdminPublicitesPageProps = {
  searchParams: AdminPublicitesSearchParams;
};

export default async function AdminPublicitesPage({
  searchParams,
}: AdminPublicitesPageProps) {
  if (!isAdminPublicitesConfigured()) {
    return (
      <section className="bg-brand-light py-12">
        <div className="mx-auto max-w-3xl rounded-2xl bg-white p-6 shadow-card">
          <h1 className="text-2xl font-extrabold text-brand-blue">Admin publicites</h1>
          <p className="mt-3 text-sm text-slate-700">
            Configurez la variable
            <span className="font-semibold"> ADMIN_ACCESS_PASSWORD </span>
            dans
            <span className="font-semibold"> .env.local</span>, puis redemarrez le serveur.
          </p>
        </div>
      </section>
    );
  }

  await requireAdminPublicitesSession();

  const pageData = await getAdminPublicitesPageData(searchParams);

  return (
    <AdminPublicitesPageView
      ads={pageData.ads}
      plans={pageData.plans}
      analytics={pageData.analytics}
      analyticsByAdId={pageData.analyticsByAdId}
      successMessage={pageData.successMessage}
      errorMessage={pageData.errorMessage}
      logoutAdminAction={logoutAdminAction}
      createAdAction={createAdAction}
      updateAdAction={updateAdAction}
      toggleAdActiveAction={toggleAdActiveAction}
      deleteAdAction={deleteAdAction}
      createPlanAction={createPlanAction}
      updatePlanAction={updatePlanAction}
      togglePlanActiveAction={togglePlanActiveAction}
      deletePlanAction={deletePlanAction}
    />
  );
}

