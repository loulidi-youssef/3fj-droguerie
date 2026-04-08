import { formatDh } from "@/lib/currency";
import { FormSubmitButton } from "@/components/form-submit-button";
import type { AdminProduct } from "@/lib/admin-products";
import { formatCategoryLabel } from "@/app/admin/products/lib/formatters";
import { ProductEditForm } from "@/app/admin/products/components/product-edit-form";
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
  return (
    <details className="group rounded-2xl border border-slate-200 bg-white shadow-[0_10px_24px_rgba(15,23,42,0.05)]">
      <div className="flex justify-end p-3 pb-0">
        <label className="inline-flex items-center gap-2 rounded-full border border-slate-300 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-700">
          <input
            type="checkbox"
            name="selectedProductIds"
            value={product.id}
            form="admin-products-bulk-form"
            data-admin-product-select="true"
            aria-label={`Selectionner ${product.name}`}
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
              <p className="truncate text-base font-bold text-brand-blue">{product.name}</p>
            </div>
            <p className="mt-1 truncate text-xs text-slate-500">Slug: {product.slug}</p>
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
                product.stock,
              )}`}
            >
              <AdminIconStock className="mr-1 h-3.5 w-3.5" />
              {getStockLabel(product.stock)}
            </span>
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-300 text-slate-500 transition group-hover:border-brand-blue group-hover:text-brand-blue">
              <AdminIconChevronDown className="h-4 w-4 transition group-open:rotate-180" />
            </span>
          </div>
        </div>

        <div className="mt-3 grid gap-2 md:grid-cols-2 xl:grid-cols-3">
          <p className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-700">
            <AdminIconPrice className="h-4 w-4 text-brand-blue" />
            {formatDh(product.price)}
          </p>
          <p className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-700">
            <AdminIconStock className="h-4 w-4 text-slate-500" />
            Stock: <span className="font-semibold">{product.stock}</span>
          </p>
          <p className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-700">
            <AdminIconCategory className="h-4 w-4 text-slate-500" />
            {formatCategoryLabel(product.category_slug)}
          </p>
          <p className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-700">
            <AdminIconVariants className="h-4 w-4 text-slate-500" />
            {product.variants.length} variante(s)
          </p>
          <p className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-700">
            <AdminIconBulk className="h-4 w-4 text-slate-500" />
            {product.bulk_price_tiers.length} palier(s) gros
          </p>
          <p className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
            ID: <span className="font-mono">{product.id}</span>
          </p>
        </div>
      </summary>

      <div className="border-t border-slate-200 bg-slate-50/45 px-4 pb-4 pt-4 sm:px-5">
        <ProductEditForm
          product={product}
          updateProductAction={updateProductAction}
        />

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
            <input type="hidden" name="productSlug" value={product.slug} />
            <FormSubmitButton
              idleLabel="Supprimer"
              pendingLabel="Suppression..."
              className="rounded-xl border border-rose-300 px-4 py-2 text-sm font-semibold text-rose-700 hover:bg-rose-50"
            />
          </form>
        </div>
      </div>
    </details>
  );
};

