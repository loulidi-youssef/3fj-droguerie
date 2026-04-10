import { formatDh } from "@/lib/currency";
import { FormSubmitButton } from "@/components/form-submit-button";
import { MetricChip } from "@/app/admin/components/metric-chip";
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

const getStockBadgeClassName = (stock: number): "red" | "orange" | "green" => {
  if (stock <= 0) {
    return "red";
  }

  if (stock <= 5) {
    return "orange";
  }

  return "green";
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
      className="group rounded-3xl border border-slate-200/80 bg-gradient-to-br from-white to-slate-50/70 shadow-md"
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
            <MetricChip tone={product.is_active ? "green" : "slate"} label={product.is_active ? "Actif" : "Inactif"} />
            <MetricChip tone={getStockBadgeClassName(safeStock)} label={getStockLabel(safeStock)} />
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-300 text-slate-500 transition group-hover:border-brand-blue group-hover:text-brand-blue">
              <AdminIconChevronDown className="h-4 w-4 transition group-open:rotate-180" />
            </span>
          </div>
        </div>

        <div className="mt-3 grid gap-2 md:grid-cols-2 xl:grid-cols-3">
          <p className="inline-flex items-center gap-2 rounded-xl border border-sky-200 bg-sky-50 px-3 py-2 text-sm font-semibold text-sky-800">
            <AdminIconPrice className="h-4 w-4 text-brand-blue" />
            {formatDh(safePrice)}
          </p>
          <p className="inline-flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-800">
            <AdminIconStock className="h-4 w-4 text-slate-500" />
            Stock: <span className="font-semibold">{safeStock}</span>
          </p>
          <p className="inline-flex items-center gap-2 rounded-xl border border-indigo-200 bg-indigo-50 px-3 py-2 text-sm font-medium text-indigo-800">
            <AdminIconCategory className="h-4 w-4 text-slate-500" />
            {formatCategoryLabel(safeCategorySlug)}
          </p>
          <p className="inline-flex items-center gap-2 rounded-xl border border-violet-200 bg-violet-50 px-3 py-2 text-sm font-medium text-violet-800">
            <AdminIconVariants className="h-4 w-4 text-slate-500" />
            {safeVariants.length} variante(s)
          </p>
          <p className="inline-flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-medium text-amber-800">
            <AdminIconBulk className="h-4 w-4 text-slate-500" />
            {safeBulkPriceTiers.length} palier(s) gros
          </p>
          <p className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
            ID: <span className="font-mono">{product.id}</span>
          </p>
        </div>
      </summary>

      <div className="border-t border-slate-200 bg-slate-50/60 px-4 pb-4 pt-4 sm:px-5">
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
