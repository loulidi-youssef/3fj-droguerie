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
  type AdminProductsPageData,
  type AdminProductsSearchParams,
} from "@/app/admin/products/lib/page-data";
import { categories } from "@/data/categories";
import {
  isAdminProductsConfigured,
  requireAdminProductsSession,
} from "@/app/admin/products/lib/auth";
import { devError } from "@/lib/dev-log";

type AdminProductsPageProps = {
  searchParams: AdminProductsSearchParams;
};

const createEmptyAdminProductsPageData = (): AdminProductsPageData => ({
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
});

const toSafeString = (value: unknown, fallback = ""): string => {
  if (typeof value !== "string") {
    return fallback;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : fallback;
};

const toSafeNumber = (value: unknown, fallback = 0): number => {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return fallback;
  }

  return value;
};

const normalizePageDataForView = (value: AdminProductsPageData): AdminProductsPageData => {
  return {
    ...value,
    productsCount: Math.max(0, Math.floor(toSafeNumber(value.productsCount, 0))),
    filteredProductsCount: Math.max(0, Math.floor(toSafeNumber(value.filteredProductsCount, 0))),
    currentPageProductsCount: Math.max(
      0,
      Math.floor(toSafeNumber(value.currentPageProductsCount, 0)),
    ),
    groupedProducts: Array.isArray(value.groupedProducts) ? value.groupedProducts : [],
    categoryOptions: Array.isArray(value.categoryOptions) ? value.categoryOptions : [],
    sortedCategoryEntries: Array.isArray(value.sortedCategoryEntries)
      ? value.sortedCategoryEntries
      : [],
    selectedCategory: toSafeString(value.selectedCategory, ""),
    searchQuery: toSafeString(value.searchQuery, ""),
    currentPage: Math.max(1, Math.floor(toSafeNumber(value.currentPage, 1))),
    totalPages: Math.max(1, Math.floor(toSafeNumber(value.totalPages, 1))),
    pageSize: Math.max(1, Math.floor(toSafeNumber(value.pageSize, 30))),
    successMessage: toSafeString(value.successMessage, ""),
    errorMessage: typeof value.errorMessage === "string" ? value.errorMessage : "",
  };
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
    devError("[admin-products/page] Failed while loading page data.", {
      function: "AdminProductsPage:getAdminProductsPageData",
      message: error instanceof Error ? error.message : String(error),
    });
    pageData = createEmptyAdminProductsPageData();
  }

  const safePageData = normalizePageDataForView(pageData ?? createEmptyAdminProductsPageData());

  return (
    <AdminProductsPageView
      productsCount={safePageData.productsCount}
      filteredProductsCount={safePageData.filteredProductsCount}
      currentPageProductsCount={safePageData.currentPageProductsCount}
      groupedProducts={safePageData.groupedProducts}
      categoryOptions={safePageData.categoryOptions}
      sortedCategoryEntries={safePageData.sortedCategoryEntries}
      selectedCategory={safePageData.selectedCategory}
      searchQuery={safePageData.searchQuery}
      currentPage={safePageData.currentPage}
      totalPages={safePageData.totalPages}
      pageSize={safePageData.pageSize}
      successMessage={safePageData.successMessage}
      errorMessage={safePageData.errorMessage}
      logoutAdminAction={logoutAdminAction}
      createProductAction={createProductAction}
      bulkUpdateProductsAction={bulkUpdateProductsAction}
      updateProductAction={updateProductAction}
      toggleProductActiveAction={toggleProductActiveAction}
      deleteProductAction={deleteProductAction}
    />
  );
}
