import Link from "next/link";
import { formatCategoryLabel } from "@/app/admin/products/lib/formatters";
import {
  AdminIconCategory,
  AdminIconFilter,
  AdminIconInfo,
  AdminIconSearch,
} from "@/app/admin/products/components/admin-products-icons";

type AdminProductsFiltersCardProps = {
  productsCount: number;
  filteredProductsCount: number;
  selectedCategory: string;
  searchQuery: string;
  sortedCategoryEntries: Array<[string, number]>;
  firstItemIndex: number;
  lastItemIndex: number;
  buildProductsHref: (options?: { category?: string; page?: number }) => string;
};

export const AdminProductsFiltersCard = ({
  productsCount,
  filteredProductsCount,
  selectedCategory,
  searchQuery,
  sortedCategoryEntries,
  firstItemIndex,
  lastItemIndex,
  buildProductsHref,
}: AdminProductsFiltersCardProps) => {
  const hasSearch = searchQuery.trim().length > 0;

  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-[0_14px_30px_rgba(15,42,77,0.07)] sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
            <AdminIconFilter className="h-4 w-4" />
            Recherche et filtres
          </p>
          <p className="mt-1 text-sm text-slate-600">
            Filtrez rapidement le catalogue avant edition ou operations en lot.
          </p>
        </div>
        <p className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-600">
          {filteredProductsCount} resultat(s)
        </p>
      </div>

      <form method="get" action="/admin/products" className="mt-4">
        <label className="block">
          <span className="text-xs font-semibold uppercase tracking-wide text-slate-600">
            Recherche produit
          </span>
          <div className="mt-1.5 flex flex-wrap items-center gap-2">
            <div className="relative min-w-[260px] flex-1">
              <AdminIconSearch className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="search"
                name="q"
                defaultValue={searchQuery}
                placeholder="Nom, slug ou ID produit"
                className="h-11 w-full rounded-xl border border-slate-300 bg-white pl-9 pr-3 text-sm text-slate-700"
              />
            </div>
            {selectedCategory ? (
              <input type="hidden" name="category" value={selectedCategory} />
            ) : null}
            <button
              type="submit"
              className="inline-flex h-11 items-center gap-2 rounded-xl bg-brand-blue px-4 text-sm font-semibold text-white transition hover:bg-brand-blue/90"
            >
              <AdminIconSearch className="h-4 w-4" />
              Rechercher
            </button>
            <Link
              href="/admin/products"
              className="inline-flex h-11 items-center rounded-xl border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:border-brand-orange hover:text-brand-orange"
            >
              Reinitialiser
            </Link>
          </div>
        </label>
      </form>

      <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50/70 p-3.5">
        <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-600">
          <AdminIconCategory className="h-4 w-4" />
          Filtre categorie
        </p>

        <div className="mt-2 flex flex-wrap items-center gap-2">
          <Link
            href={buildProductsHref({ category: "", page: 1 })}
            className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
              !selectedCategory
                ? "border-brand-blue bg-brand-blue text-white"
                : "border-slate-300 bg-white text-slate-700 hover:border-brand-orange hover:text-brand-orange"
            }`}
          >
            Toutes ({productsCount})
          </Link>
          {sortedCategoryEntries.map(([categorySlug, total]) => (
            <Link
              key={categorySlug}
              href={buildProductsHref({ category: categorySlug, page: 1 })}
              className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                selectedCategory === categorySlug
                  ? "border-brand-blue bg-brand-blue text-white"
                  : "border-slate-300 bg-white text-slate-700 hover:border-brand-orange hover:text-brand-orange"
              }`}
            >
              {formatCategoryLabel(categorySlug)} ({total})
            </Link>
          ))}
        </div>

        <div className="mt-3 space-y-1 text-xs text-slate-600">
          {selectedCategory ? (
            <p>
              Categorie active:{" "}
              <span className="font-semibold">{formatCategoryLabel(selectedCategory)}</span>
            </p>
          ) : null}
          {hasSearch ? (
            <p>
              Recherche active: <span className="font-semibold">{searchQuery.trim()}</span>
            </p>
          ) : (
            <p className="inline-flex items-center gap-1.5">
              <AdminIconInfo className="h-3.5 w-3.5" />
              Astuce: combinez recherche + categorie pour gagner du temps.
            </p>
          )}
          <p>
            Resultats affiches:{" "}
            <span className="font-semibold">
              {firstItemIndex}-{lastItemIndex}
            </span>{" "}
            sur <span className="font-semibold">{filteredProductsCount}</span>.
          </p>
        </div>
      </div>
    </section>
  );
};

