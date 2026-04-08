import { formatDh } from "@/lib/currency";
import { FormSubmitButton } from "@/components/form-submit-button";
import type { AdminProduct } from "@/lib/admin-products";
import { formatCategoryLabel } from "@/app/admin/products/lib/formatters";
import { ProductEditForm } from "@/app/admin/products/components/product-edit-form";

type FormAction = (formData: FormData) => void | Promise<void>;

type ProductItemProps = {
  product: AdminProduct;
  updateProductAction: FormAction;
  toggleProductActiveAction: FormAction;
  deleteProductAction: FormAction;
};

export const ProductItem = ({
  product,
  updateProductAction,
  toggleProductActiveAction,
  deleteProductAction,
}: ProductItemProps) => {
  return (
    <details className="rounded-2xl bg-white p-5 shadow-card">
      <div className="mb-3 flex justify-end">
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

      <summary className="cursor-pointer list-none">
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Nom</p>
            <p className="text-sm font-bold text-brand-blue">{product.name}</p>
            <p className="text-xs text-slate-600">Slug: {product.slug}</p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Prix / Stock
            </p>
            <p className="text-sm font-bold text-brand-blue">{formatDh(product.price)}</p>
            <p className="text-xs text-slate-600">Quantite: {product.stock}</p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Categorie
            </p>
            <p className="text-sm text-slate-700">{formatCategoryLabel(product.category_slug)}</p>
            <p className="text-xs text-slate-500">Slug: {product.category_slug}</p>
            <p className="text-xs text-slate-600">Note: {product.rating}</p>
            <p className="text-xs text-slate-600">Variantes: {product.variants.length}</p>
            <p className="text-xs text-slate-600">Paliers gros: {product.bulk_price_tiers.length}</p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Statut
            </p>
            <span
              className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
                product.is_active
                  ? "bg-emerald-100 text-emerald-700"
                  : "bg-slate-200 text-slate-700"
              }`}
            >
              {product.is_active ? "Actif" : "Inactif"}
            </span>
          </div>
        </div>
      </summary>

      <div className="mt-4 border-t border-slate-200 pt-4">
        <p className="text-xs text-slate-500">ID: {product.id}</p>

        <ProductEditForm
          product={product}
          updateProductAction={updateProductAction}
        />

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <form action={toggleProductActiveAction}>
            <input type="hidden" name="productId" value={product.id} />
            <input type="hidden" name="nextActive" value={product.is_active ? "false" : "true"} />
            <FormSubmitButton
              idleLabel={product.is_active ? "Desactiver" : "Activer"}
              pendingLabel="Mise a jour..."
              className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700"
            />
          </form>

          <form action={deleteProductAction}>
            <input type="hidden" name="productId" value={product.id} />
            <input type="hidden" name="productSlug" value={product.slug} />
            <FormSubmitButton
              idleLabel="Supprimer"
              pendingLabel="Suppression..."
              className="rounded-xl border border-rose-300 px-4 py-2 text-sm font-semibold text-rose-700"
            />
          </form>
        </div>
      </div>
    </details>
  );
};
