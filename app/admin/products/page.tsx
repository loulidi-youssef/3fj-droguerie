import {
  bulkUpdateProductsAction,
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
import { categories } from "@/data/categories";
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

  let pageData: Awaited<ReturnType<typeof getAdminProductsPageData>>;
  try {
    pageData = await getAdminProductsPageData(searchParams);
  } catch (error) {
    console.error("[admin-products/page] Unhandled admin products page load failure.", {
      message: error instanceof Error ? error.message : String(error),
    });
    pageData = {
      productsCount: 0,
      filteredProductsCount: 0,
      currentPageProductsCount: 0,
      filteredProducts: [],
      groupedProducts: [],
      categoryOptions: [...new Set(categories.map((category) => category.slug))],
      sortedCategoryEntries: [],
      selectedCategory: "",
      searchQuery: "",
      currentPage: 1,
      totalPages: 1,
      pageSize: 30,
      successMessage: "",
      errorMessage:
        "Impossible de charger la page produits admin pour le moment. Merci de reessayer.",
    };
  }

  return (
    <AdminProductsPageView
      productsCount={pageData.productsCount}
      filteredProductsCount={pageData.filteredProductsCount}
      currentPageProductsCount={pageData.currentPageProductsCount}
      groupedProducts={pageData.groupedProducts}
      categoryOptions={pageData.categoryOptions}
      sortedCategoryEntries={pageData.sortedCategoryEntries}
      selectedCategory={pageData.selectedCategory}
      searchQuery={pageData.searchQuery}
      currentPage={pageData.currentPage}
      totalPages={pageData.totalPages}
      pageSize={pageData.pageSize}
      successMessage={pageData.successMessage}
      errorMessage={pageData.errorMessage}
      logoutAdminAction={logoutAdminAction}
      createProductAction={createProductAction}
      bulkUpdateProductsAction={bulkUpdateProductsAction}
      updateProductAction={updateProductAction}
      toggleProductActiveAction={toggleProductActiveAction}
      deleteProductAction={deleteProductAction}
    />
  );
}
