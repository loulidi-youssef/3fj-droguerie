import { ProductItem } from "@/app/admin/products/components/product-item";
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
      <div className="rounded-2xl bg-white p-6 shadow-card">
        <p className="text-sm text-slate-600">Aucun produit dans Supabase.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {filteredProductsCount === 0 || currentPageProductsCount === 0 ? (
        <div className="rounded-2xl bg-white p-6 shadow-card">
          <p className="text-sm text-slate-600">
            {selectedCategory
              ? `Aucun produit dans la categorie ${formatCategoryLabel(selectedCategory)}.`
              : "Aucun produit ne correspond a vos filtres."}
            {searchQuery.trim()
              ? ` Recherche: "${searchQuery.trim()}".`
              : ""}
          </p>
        </div>
      ) : null}

      {groupedProducts.map((group) => (
        <section
          key={group.categorySlug}
          className="rounded-2xl border border-slate-200 bg-white p-4 shadow-card"
        >
          <div className="mb-4 flex items-center justify-between gap-2 border-b border-slate-200 pb-3">
            <h2 className="text-base font-bold text-brand-blue">
              {formatCategoryLabel(group.categorySlug)}
            </h2>
            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">
              {group.products.length} produit(s)
            </span>
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
