import { ProductItem } from "@/app/admin/products/components/product-item";
import { MetricChip } from "@/app/admin/components/metric-chip";
import {
  AdminIconCategory,
  AdminIconProducts,
} from "@/app/admin/products/components/admin-products-icons";
import type { ProductsGroup } from "@/app/admin/products/lib/page-data";
import { formatCategoryLabel } from "@/app/admin/products/lib/formatters";

type FormAction = (formData: FormData) => void | Promise<void>;

type ProductsListProps = {
  productsCount: number;
  filteredProductsCount: number;
  currentPageProductsCount: number;
  groupedProducts: ProductsGroup[];
  selectedCategory: string;
  searchQuery: string;
  updateProductAction: FormAction;
  toggleProductActiveAction: FormAction;
  deleteProductAction: FormAction;
};

export const ProductsList = ({
  productsCount,
  filteredProductsCount,
  currentPageProductsCount,
  groupedProducts,
  selectedCategory,
  searchQuery,
  updateProductAction,
  toggleProductActiveAction,
  deleteProductAction,
}: ProductsListProps) => {
  if (productsCount === 0) {
    return (
      <div className="rounded-3xl border border-slate-200 bg-gradient-to-br from-white to-slate-50 p-6 shadow-md">
        <p className="inline-flex items-center gap-2 text-sm font-semibold text-slate-700">
          <AdminIconProducts className="h-4 w-4 text-slate-500" />
          Aucun produit dans Supabase.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {filteredProductsCount === 0 || currentPageProductsCount === 0 ? (
        <div className="rounded-3xl border border-slate-200 bg-gradient-to-br from-white to-slate-50 p-6 shadow-md">
          <p className="text-sm text-slate-600">
            {selectedCategory
              ? `Aucun produit dans la categorie ${formatCategoryLabel(selectedCategory)}.`
              : "Aucun produit ne correspond a vos filtres."}
            {searchQuery.trim() ? ` Recherche: "${searchQuery.trim()}".` : ""}
          </p>
        </div>
      ) : null}

      {groupedProducts.map((group) => (
        <section
          key={group.categorySlug}
          className="rounded-3xl border border-slate-200/80 bg-gradient-to-br from-white to-slate-50/70 p-4 shadow-md sm:p-5"
        >
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-3">
            <h2 className="inline-flex items-center gap-2 text-base font-bold text-brand-blue">
              <AdminIconCategory className="h-4 w-4" />
              {formatCategoryLabel(group.categorySlug)}
            </h2>
            <MetricChip tone="slate" label={`${group.products.length} produit(s)`} />
          </div>

          <div className="space-y-4">
            {group.products.map((product) => (
              <ProductItem
                key={product.id}
                product={product}
                updateProductAction={updateProductAction}
                toggleProductActiveAction={toggleProductActiveAction}
                deleteProductAction={deleteProductAction}
              />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
};
