import {
  AdminIconBulk,
  AdminIconProducts,
  AdminIconStatus,
  AdminIconStock,
} from "@/app/admin/products/components/admin-products-icons";

type AdminProductsOverviewMetricsProps = {
  filteredProductsCount: number;
  currentPageProductsCount: number;
  activeProductsOnPage: number;
  lowStockProductsOnPage: number;
  productsWithBulkPricingOnPage: number;
};

export const AdminProductsOverviewMetrics = ({
  filteredProductsCount,
  currentPageProductsCount,
  activeProductsOnPage,
  lowStockProductsOnPage,
  productsWithBulkPricingOnPage,
}: AdminProductsOverviewMetricsProps) => {
  return (
    <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4" aria-label="Synthese produits">
      <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_10px_24px_rgba(15,23,42,0.06)]">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
          <AdminIconProducts className="h-4 w-4" />
          Total filtres
        </div>
        <p className="mt-2 text-2xl font-extrabold text-brand-blue">{filteredProductsCount}</p>
        <p className="mt-1 text-xs text-slate-500">Resultats correspondant aux filtres actifs.</p>
      </article>

      <article className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-4 shadow-[0_10px_24px_rgba(16,185,129,0.08)]">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-emerald-700">
          <AdminIconStatus className="h-4 w-4" />
          Produits actifs
        </div>
        <p className="mt-2 text-2xl font-extrabold text-emerald-700">{activeProductsOnPage}</p>
        <p className="mt-1 text-xs text-emerald-700/80">
          Sur {currentPageProductsCount} produit(s) de la page.
        </p>
      </article>

      <article className="rounded-2xl border border-amber-200 bg-amber-50/70 p-4 shadow-[0_10px_24px_rgba(245,158,11,0.08)]">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-amber-700">
          <AdminIconStock className="h-4 w-4" />
          Stock faible
        </div>
        <p className="mt-2 text-2xl font-extrabold text-amber-700">{lowStockProductsOnPage}</p>
        <p className="mt-1 text-xs text-amber-700/80">
          Produits a surveiller (stock {"<="} 5).
        </p>
      </article>

      <article className="rounded-2xl border border-brand-blue/20 bg-brand-blue/5 p-4 shadow-[0_10px_24px_rgba(15,42,77,0.08)]">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-brand-blue">
          <AdminIconBulk className="h-4 w-4" />
          Prix de gros
        </div>
        <p className="mt-2 text-2xl font-extrabold text-brand-blue">
          {productsWithBulkPricingOnPage}
        </p>
        <p className="mt-1 text-xs text-brand-blue/80">
          Produits avec paliers de prix sur cette page.
        </p>
      </article>
    </section>
  );
};
