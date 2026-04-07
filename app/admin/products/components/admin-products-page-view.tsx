import Link from "next/link";
import { AdminProductActionNotifications } from "@/components/admin-product-action-notifications";
import { ProductCreateForm } from "@/app/admin/products/components/product-create-form";
import { ProductsBulkActions } from "@/app/admin/products/components/products-bulk-actions";
import { ProductsList } from "@/app/admin/products/components/products-list";
import { formatCategoryLabel } from "@/app/admin/products/lib/formatters";
import type { ProductsGroup } from "@/app/admin/products/lib/page-data";

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
    filteredProductsCount === 0
      ? 0
      : (currentPage - 1) * pageSize + 1;
  const lastItemIndex =
    filteredProductsCount === 0
      ? 0
      : Math.min(firstItemIndex + currentPageProductsCount - 1, filteredProductsCount);

  return (
    <section className="bg-brand-light py-12">
      <div className="mx-auto max-w-7xl px-4 sm:px-5 lg:px-6">
        <AdminProductActionNotifications
          successMessage={successMessage}
          errorMessage={errorMessage}
        />
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-3xl font-extrabold text-brand-blue">Admin produits</h1>
            <p className="mt-1 text-sm text-slate-600">
              Ajoutez, modifiez, desactivez ou supprimez les produits.
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
              href="/admin/products/import"
              className="rounded-xl border border-emerald-300 bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-700"
            >
              Import CSV
            </Link>
            <Link
              href="/admin/offres"
              className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700"
            >
              Voir offres
            </Link>
            <Link
              href="/admin/customers"
              className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700"
            >
              Voir clients
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
          <div
            role="status"
            aria-live="polite"
            className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-800"
          >
            <p className="text-sm font-bold">Succes</p>
            <p className="mt-1 text-sm font-medium">{successMessage}</p>
          </div>
        ) : null}

        {errorMessage ? (
          <p className="mb-4 rounded-xl bg-rose-50 p-3 text-sm font-medium text-rose-700">
            {errorMessage}
          </p>
        ) : null}

        <div className="mb-6 rounded-2xl bg-white p-4 shadow-card">
          <form method="get" action="/admin/products" className="mb-3">
            <label className="block">
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Recherche produit
              </span>
              <div className="mt-1 flex flex-wrap items-center gap-2">
                <input
                  type="search"
                  name="q"
                  defaultValue={searchQuery}
                  placeholder="Nom, slug ou ID produit"
                  className="min-w-[220px] flex-1 rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-700"
                />
                {selectedCategory ? (
                  <input type="hidden" name="category" value={selectedCategory} />
                ) : null}
                <button
                  type="submit"
                  className="rounded-xl bg-brand-blue px-4 py-2 text-sm font-semibold text-white"
                >
                  Rechercher
                </button>
                <Link
                  href="/admin/products"
                  className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700"
                >
                  Reinitialiser
                </Link>
              </div>
            </label>
          </form>

          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Organisation par categorie
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <Link
              href={buildProductsHref({ category: "", page: 1 })}
              className={`rounded-full border px-3 py-1 text-xs font-semibold transition ${
                !selectedCategory
                  ? "border-brand-blue bg-brand-blue text-white"
                  : "border-slate-300 text-slate-700 hover:border-brand-orange hover:text-brand-orange"
              }`}
            >
              Toutes ({productsCount})
            </Link>
            {sortedCategoryEntries.map(([categorySlug, total]) => (
              <Link
                key={categorySlug}
                href={buildProductsHref({ category: categorySlug, page: 1 })}
                className={`rounded-full border px-3 py-1 text-xs font-semibold transition ${
                  selectedCategory === categorySlug
                    ? "border-brand-blue bg-brand-blue text-white"
                    : "border-slate-300 text-slate-700 hover:border-brand-orange hover:text-brand-orange"
                }`}
              >
                {formatCategoryLabel(categorySlug)} ({total})
              </Link>
            ))}
          </div>
          {selectedCategory ? (
            <p className="mt-2 text-xs text-slate-600">
              Filtre actif:{" "}
              <span className="font-semibold">{formatCategoryLabel(selectedCategory)}</span>
            </p>
          ) : null}
          {searchQuery.trim() ? (
            <p className="mt-2 text-xs text-slate-600">
              Recherche active: <span className="font-semibold">{searchQuery.trim()}</span>
            </p>
          ) : (
            <p className="mt-2 text-xs text-slate-600">
              Astuce: choisissez une categorie pour modifier les produits plus vite.
            </p>
          )}
          <p className="mt-2 text-xs text-slate-600">
            Resultats:{" "}
            <span className="font-semibold">
              {firstItemIndex}-{lastItemIndex}
            </span>{" "}
            sur <span className="font-semibold">{filteredProductsCount}</span>.
          </p>
        </div>

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
            className="mb-4 flex flex-wrap items-center justify-center gap-2"
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
