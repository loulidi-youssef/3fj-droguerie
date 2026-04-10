import Link from "next/link";
import { AdminProductActionNotifications } from "@/components/admin-product-action-notifications";
import { ProductCreateForm } from "@/app/admin/products/components/product-create-form";
import { ProductsBulkActions } from "@/app/admin/products/components/products-bulk-actions";
import { ProductsList } from "@/app/admin/products/components/products-list";
import { AdminProductsFiltersCard } from "@/app/admin/products/components/admin-products-filters-card";
import { AdminProductsHeader } from "@/app/admin/products/components/admin-products-header";
import { AdminProductsOverviewMetrics } from "@/app/admin/products/components/admin-products-overview-metrics";
import type { ProductsGroup } from "@/app/admin/products/lib/page-data";
import { formatCategoryLabel } from "@/app/admin/products/lib/formatters";

type FormAction = (formData: FormData) => void | Promise<void>;
type LogoutAction = () => void | Promise<void>;

type AdminProductsPageViewProps = {
  productsCount: number;
  filteredProductsCount: number;
  currentPageProductsCount: number;
  groupedProducts: ProductsGroup[];
  categoryOptions: string[];
  sortedCategoryEntries: Array<[string, number]>;
  selectedCategory: string;
  searchQuery: string;
  currentPage: number;
  totalPages: number;
  pageSize: number;
  successMessage: string;
  errorMessage: string;
  logoutAdminAction: LogoutAction;
  createProductAction: FormAction;
  bulkUpdateProductsAction: FormAction;
  updateProductAction: FormAction;
  toggleProductActiveAction: FormAction;
  deleteProductAction: FormAction;
};

export const AdminProductsPageView = ({
  productsCount,
  filteredProductsCount,
  currentPageProductsCount,
  groupedProducts,
  categoryOptions,
  sortedCategoryEntries,
  selectedCategory,
  searchQuery,
  currentPage,
  totalPages,
  pageSize,
  successMessage,
  errorMessage,
  logoutAdminAction,
  createProductAction,
  bulkUpdateProductsAction,
  updateProductAction,
  toggleProductActiveAction,
  deleteProductAction,
}: AdminProductsPageViewProps) => {
  const buildProductsHref = (options?: { category?: string; page?: number }): string => {
    const params = new URLSearchParams();
    const category = options?.category ?? selectedCategory;
    const page = options?.page ?? 1;

    if (category) {
      params.set("category", category);
    }
    if (searchQuery.trim()) {
      params.set("q", searchQuery.trim());
    }
    if (page > 1) {
      params.set("page", String(page));
    }

    const query = params.toString();
    return query ? `/admin/products?${query}` : "/admin/products";
  };

  const paginationWindow = 2;
  const visiblePageStart = Math.max(1, currentPage - paginationWindow);
  const visiblePageEnd = Math.min(totalPages, currentPage + paginationWindow);
  const visiblePages = Array.from(
    { length: visiblePageEnd - visiblePageStart + 1 },
    (_, index) => visiblePageStart + index,
  );

  const firstItemIndex =
    filteredProductsCount === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const lastItemIndex =
    filteredProductsCount === 0
      ? 0
      : Math.min(firstItemIndex + currentPageProductsCount - 1, filteredProductsCount);

  const currentPageProducts = groupedProducts.flatMap((group) => group.products);
  const activeProductsOnPage = currentPageProducts.filter((product) => product.is_active).length;
  const lowStockProductsOnPage = currentPageProducts.filter((product) => product.stock <= 5).length;
  const productsWithBulkPricingOnPage = currentPageProducts.filter(
    (product) => Array.isArray(product.bulk_price_tiers) && product.bulk_price_tiers.length > 0,
  ).length;

  return (
    <section className="min-h-screen bg-gradient-to-b from-brand-light via-slate-50 to-sky-50/60 py-12">
      <div className="mx-auto max-w-7xl space-y-5 px-4 sm:px-5 lg:px-6">
        <AdminProductActionNotifications
          successMessage={successMessage}
          errorMessage={errorMessage}
        />

        <AdminProductsHeader logoutAdminAction={logoutAdminAction} />

        {successMessage ? (
          <div
            role="status"
            aria-live="polite"
            className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-emerald-800 shadow-sm"
          >
            <p className="text-xs font-bold uppercase tracking-wide">Succes</p>
            <p className="mt-1 text-sm font-medium">{successMessage}</p>
          </div>
        ) : null}

        {errorMessage ? (
          <p className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700 shadow-sm">
            {errorMessage}
          </p>
        ) : null}

        <AdminProductsOverviewMetrics
          filteredProductsCount={filteredProductsCount}
          currentPageProductsCount={currentPageProductsCount}
          activeProductsOnPage={activeProductsOnPage}
          lowStockProductsOnPage={lowStockProductsOnPage}
          productsWithBulkPricingOnPage={productsWithBulkPricingOnPage}
        />

        <AdminProductsFiltersCard
          productsCount={productsCount}
          filteredProductsCount={filteredProductsCount}
          selectedCategory={selectedCategory}
          searchQuery={searchQuery}
          sortedCategoryEntries={sortedCategoryEntries}
          firstItemIndex={firstItemIndex}
          lastItemIndex={lastItemIndex}
          buildProductsHref={buildProductsHref}
        />

        <datalist id="admin-category-options">
          {categoryOptions.map((categorySlug) => (
            <option key={categorySlug} value={categorySlug}>
              {formatCategoryLabel(categorySlug)}
            </option>
          ))}
        </datalist>

        <ProductCreateForm createProductAction={createProductAction} />

        <ProductsBulkActions
          bulkUpdateProductsAction={bulkUpdateProductsAction}
          filteredProductsCount={filteredProductsCount}
          currentPageProductsCount={currentPageProductsCount}
          selectedCategory={selectedCategory}
          searchQuery={searchQuery}
          currentPage={currentPage}
        />

        {totalPages > 1 ? (
          <nav
            className="flex flex-wrap items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white/90 p-3 shadow-sm"
            aria-label="Pagination produits admin"
          >
            <Link
              href={buildProductsHref({ page: Math.max(1, currentPage - 1) })}
              aria-disabled={currentPage <= 1}
              className={`inline-flex h-9 items-center rounded-lg border px-3 text-sm font-semibold transition ${
                currentPage <= 1
                  ? "pointer-events-none border-slate-200 bg-slate-100 text-slate-400"
                  : "border-slate-300 bg-white text-slate-700 hover:border-brand-orange hover:text-brand-orange"
              }`}
            >
              Precedent
            </Link>

            {visiblePages.map((pageNumber) => (
              <Link
                key={pageNumber}
                href={buildProductsHref({ page: pageNumber })}
                aria-current={pageNumber === currentPage ? "page" : undefined}
                className={`inline-flex h-9 min-w-9 items-center justify-center rounded-lg border px-3 text-sm font-semibold transition ${
                  pageNumber === currentPage
                    ? "border-brand-blue bg-brand-blue text-white"
                    : "border-slate-300 bg-white text-slate-700 hover:border-brand-orange hover:text-brand-orange"
                }`}
              >
                {pageNumber}
              </Link>
            ))}

            <Link
              href={buildProductsHref({ page: Math.min(totalPages, currentPage + 1) })}
              aria-disabled={currentPage >= totalPages}
              className={`inline-flex h-9 items-center rounded-lg border px-3 text-sm font-semibold transition ${
                currentPage >= totalPages
                  ? "pointer-events-none border-slate-200 bg-slate-100 text-slate-400"
                  : "border-slate-300 bg-white text-slate-700 hover:border-brand-orange hover:text-brand-orange"
              }`}
            >
              Suivant
            </Link>
          </nav>
        ) : null}

        <ProductsList
          productsCount={productsCount}
          filteredProductsCount={filteredProductsCount}
          currentPageProductsCount={currentPageProductsCount}
          groupedProducts={groupedProducts}
          selectedCategory={selectedCategory}
          searchQuery={searchQuery}
          updateProductAction={updateProductAction}
          toggleProductActiveAction={toggleProductActiveAction}
          deleteProductAction={deleteProductAction}
        />
      </div>
    </section>
  );
};
