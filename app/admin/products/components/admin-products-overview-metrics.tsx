import { PremiumStatCard } from "@/app/admin/components/premium-stat-card";
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
      <PremiumStatCard
        title="Total filtres"
        value={filteredProductsCount}
        subtitle="Resultats correspondant aux filtres actifs."
        tone="blue"
        icon={<AdminIconProducts className="h-4 w-4" />}
      />
      <PremiumStatCard
        title="Produits actifs"
        value={activeProductsOnPage}
        subtitle={`Sur ${currentPageProductsCount} produit(s) de la page.`}
        tone="green"
        icon={<AdminIconStatus className="h-4 w-4" />}
      />
      <PremiumStatCard
        title="Stock faible"
        value={lowStockProductsOnPage}
        subtitle="Produits a surveiller (stock <= 5)."
        tone="orange"
        icon={<AdminIconStock className="h-4 w-4" />}
      />
      <PremiumStatCard
        title="Prix de gros"
        value={productsWithBulkPricingOnPage}
        subtitle="Produits avec paliers de prix sur cette page."
        tone="indigo"
        icon={<AdminIconBulk className="h-4 w-4" />}
      />
    </section>
  );
};
