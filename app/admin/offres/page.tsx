import {
  createOfferAction,
  deleteOfferAction,
  logoutAdminAction,
  toggleOfferActiveAction,
  updateOfferAction,
} from "@/app/admin/offres/actions";
import { AdminOffresPageView } from "@/app/admin/offres/components/admin-offres-page-view";
import {
  isAdminOffresConfigured,
  requireAdminOffresSession,
} from "@/app/admin/offres/lib/auth";
import {
  getAdminOffresPageData,
  type AdminOffresSearchParams,
} from "@/app/admin/offres/lib/page-data";

type AdminOffresPageProps = {
  searchParams: AdminOffresSearchParams;
};

export default async function AdminOffresPage({ searchParams }: AdminOffresPageProps) {
  if (!isAdminOffresConfigured()) {
    return (
      <section className="bg-brand-light py-12">
        <div className="mx-auto max-w-3xl rounded-2xl bg-white p-6 shadow-card">
          <h1 className="text-2xl font-extrabold text-brand-blue">Admin offres</h1>
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

  await requireAdminOffresSession();

  const pageData = await getAdminOffresPageData(searchParams);

  return (
    <AdminOffresPageView
      offers={pageData.offers}
      products={pageData.products}
      productById={pageData.productById}
      successMessage={pageData.successMessage}
      errorMessage={pageData.errorMessage}
      logoutAdminAction={logoutAdminAction}
      createOfferAction={createOfferAction}
      updateOfferAction={updateOfferAction}
      toggleOfferActiveAction={toggleOfferActiveAction}
      deleteOfferAction={deleteOfferAction}
    />
  );
}
