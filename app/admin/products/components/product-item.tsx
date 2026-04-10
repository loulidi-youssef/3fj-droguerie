import { formatDh } from "@/lib/currency";
import { FormSubmitButton } from "@/components/form-submit-button";
import type { AdminProduct } from "@/lib/admin-products";
import { formatCategoryLabel } from "@/app/admin/products/lib/formatters";
import { ProductEditForm } from "@/app/admin/products/components/product-edit-form";
import { ProductDetailsShell } from "@/app/admin/products/components/product-details-shell";
import { ProductEditPanelBoundary } from "@/app/admin/products/components/product-edit-panel-boundary";
import {
  AdminIconBulk,
  AdminIconCategory,
  AdminIconChevronDown,
  AdminIconPrice,
  AdminIconProducts,
  AdminIconStatus,
  AdminIconStock,
  AdminIconVariants,
} from "@/app/admin/products/components/admin-products-icons";

type FormAction = (formData: FormData) => void | Promise<void>;

type ProductItemProps = {
  product: AdminProduct;
  updateProductAction: FormAction;
  toggleProductActiveAction: FormAction;
  deleteProductAction: FormAction;
};

const getStockBadgeClassName = (stock: number): string => {
  if (stock <= 0) {
    return "border-rose-200 bg-rose-50 text-rose-700";
  }

  if (stock <= 5) {
    return "border-amber-200 bg-amber-50 text-amber-700";
  }

  return "border-emerald-200 bg-emerald-50 text-emerald-700";
};

const getStockLabel = (stock: number): string => {
  if (stock <= 0) {
    return "Rupture";
  }

  if (stock <= 5) {
    return "Stock faible";
  }

  return "Stock bon";
};

export const ProductItem = ({
  product,
  updateProductAction,
  toggleProductActiveAction,
  deleteProductAction,
}: ProductItemProps) => {
  const safeProductName =
    typeof product.name === "string" && product.name.trim().length > 0
      ? product.name
      : "Produit sans nom";
  const safeSlug =
    typeof product.slug === "string" && product.slug.trim().length > 0
      ? product.slug
      : "slug-invalide";
  const safeCategorySlug =
    typeof product.category_slug === "string" && product.category_slug.trim().length > 0
      ? product.category_slug
      : "non-classe";
  const safeStock =
    typeof product.stock === "number" && Number.isFinite(product.stock)
      ? Math.max(0, Math.round(product.stock))
      : 0;
  const safePrice =
    typeof product.price === "number" && Number.isFinite(product.price)
      ? product.price
      : 0;
  const safeVariants = Array.isArray(product.variants) ? product.variants : [];
  const safeBulkPriceTiers = Array.isArray(product.bulk_price_tiers)
    ? product.bulk_price_tiers
    : [];
  const safeImages = Array.isArray(product.images) ? product.images : [];

  return (
    <ProductDetailsShell
      className="group rounded-2xl border border-slate-200 bg-white shadow-[0_10px_24px_rgba(15,23,42,0.05)]"
      productSnapshot={{
        id: product.id,
        slug: safeSlug,
        name: safeProductName,
        categorySlug: safeCategorySlug,
        stock: safeStock,
        price: safePrice,
        variantsCount: safeVariants.length,
        imagesCount: safeImages.length,
        bulkTiersCount: safeBulkPriceTiers.length,
      }}
    >
      <div className="flex justify-end p-3 pb-0">
        <label className="inline-flex items-center gap-2 rounded-full border border-slate-300 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-700">
          <input
            type="checkbox"
            name="selectedProductIds"
            value={product.id}
            form="admin-products-bulk-form"
            data-admin-product-select="true"
            aria-label={`Selectionner ${safeProductName}`}
          />
          Selectionner
        </label>
      </div>

      <summary className="list-none cursor-pointer px-4 pb-4 pt-2 sm:px-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-brand-blue/10 text-brand-blue">
                <AdminIconProducts className="h-4 w-4" />
              </span>
              <p className="truncate text-base font-bold text-brand-blue">{safeProductName}</p>
            </div>
            <p className="mt-1 truncate text-xs text-slate-500">Slug: {safeSlug}</p>
          </div>

          <div className="flex items-center gap-2">
            <span
              className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold ${
                product.is_active
                  ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                  : "border-slate-300 bg-slate-100 text-slate-700"
              }`}
            >
              <AdminIconStatus className="mr-1 h-3.5 w-3.5" />
              {product.is_active ? "Actif" : "Inactif"}
            </span>
            <span
              className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold ${getStockBadgeClassName(
                safeStock,
              )}`}
            >
              <AdminIconStock className="mr-1 h-3.5 w-3.5" />
              {getStockLabel(safeStock)}
            </span>
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-300 text-slate-500 transition group-hover:border-brand-blue group-hover:text-brand-blue">
              <AdminIconChevronDown className="h-4 w-4 transition group-open:rotate-180" />
            </span>
          </div>
        </div>

        <div className="mt-3 grid gap-2 md:grid-cols-2 xl:grid-cols-3">
          <p className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-700">
            <AdminIconPrice className="h-4 w-4 text-brand-blue" />
            {formatDh(safePrice)}
          </p>
          <p className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-700">
            <AdminIconStock className="h-4 w-4 text-slate-500" />
            Stock: <span className="font-semibold">{safeStock}</span>
          </p>
          <p className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-700">
            <AdminIconCategory className="h-4 w-4 text-slate-500" />
            {formatCategoryLabel(safeCategorySlug)}
          </p>
          <p className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-700">
            <AdminIconVariants className="h-4 w-4 text-slate-500" />
            {safeVariants.length} variante(s)
          </p>
          <p className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-700">
            <AdminIconBulk className="h-4 w-4 text-slate-500" />
            {safeBulkPriceTiers.length} palier(s) gros
          </p>
          <p className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
            ID: <span className="font-mono">{product.id}</span>
          </p>
        </div>
      </summary>

      <div className="border-t border-slate-200 bg-slate-50/45 px-4 pb-4 pt-4 sm:px-5">
        <ProductEditPanelBoundary productId={product.id} productSlug={safeSlug}>
          <ProductEditForm
            product={product}
            updateProductAction={updateProductAction}
          />
        </ProductEditPanelBoundary>

        <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-slate-200 pt-3">
          <form action={toggleProductActiveAction}>
            <input type="hidden" name="productId" value={product.id} />
            <input type="hidden" name="nextActive" value={product.is_active ? "false" : "true"} />
            <FormSubmitButton
              idleLabel={product.is_active ? "Desactiver" : "Activer"}
              pendingLabel="Mise a jour..."
              className={`rounded-xl border px-4 py-2 text-sm font-semibold ${
                product.is_active
                  ? "border-amber-300 text-amber-700 hover:bg-amber-50"
                  : "border-emerald-300 text-emerald-700 hover:bg-emerald-50"
              }`}
            />
          </form>

          <form action={deleteProductAction}>
            <input type="hidden" name="productId" value={product.id} />
            <input type="hidden" name="productSlug" value={safeSlug} />
            <FormSubmitButton
              idleLabel="Supprimer"
              pendingLabel="Suppression..."
              className="rounded-xl border border-rose-300 px-4 py-2 text-sm font-semibold text-rose-700 hover:bg-rose-50"
            />
          </form>
        </div>
      </div>
    </ProductDetailsShell>
  );
};
