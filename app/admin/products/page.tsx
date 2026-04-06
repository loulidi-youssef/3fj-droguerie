import {
  createProductAction,
  deleteProductAction,
  logoutAdminAction,
  toggleProductActiveAction,
  updateProductAction,
} from "@/app/admin/products/actions";
import { AdminProductsPageView } from "@/app/admin/products/components/admin-products-page-view";
import {
  getAdminProductsPageData,
  type AdminProductsSearchParams,
} from "@/app/admin/products/lib/page-data";
import {
  isAdminProductsConfigured,
  requireAdminProductsSession,
} from "@/app/admin/products/lib/auth";

type AdminProductsPageProps = {
  searchParams: AdminProductsSearchParams;
};

export default async function AdminProductsPage({
  searchParams,
}: AdminProductsPageProps) {
  if (!isAdminProductsConfigured()) {
    return (
      <section className="bg-brand-light py-12">
        <div className="mx-auto max-w-3xl rounded-2xl bg-white p-6 shadow-card">
          <h1 className="text-2xl font-extrabold text-brand-blue">Admin produits</h1>
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

  await requireAdminProductsSession();

  const pageData = await getAdminProductsPageData(searchParams);

  return (
    <AdminProductsPageView
      productsCount={pageData.products.length}
      filteredProductsCount={pageData.filteredProducts.length}
      groupedProducts={pageData.groupedProducts}
      categoryOptions={pageData.categoryOptions}
      sortedCategoryEntries={pageData.sortedCategoryEntries}
      selectedCategory={pageData.selectedCategory}
      searchQuery={pageData.searchQuery}
      successMessage={pageData.successMessage}
      errorMessage={pageData.errorMessage}
      logoutAdminAction={logoutAdminAction}
      createProductAction={createProductAction}
      updateProductAction={updateProductAction}
      toggleProductActiveAction={toggleProductActiveAction}
      deleteProductAction={deleteProductAction}
    />
  );
}
