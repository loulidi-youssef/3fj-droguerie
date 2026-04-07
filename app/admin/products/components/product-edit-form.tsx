import { AdminProductImageUploadInput } from "@/components/admin-product-image-upload-input";
import { AdminProductVariantsInput } from "@/components/admin-product-variants-input";
import { FormSubmitButton } from "@/components/form-submit-button";
import type { AdminProduct } from "@/lib/admin-products";

type FormAction = (formData: FormData) => void | Promise<void>;

type ProductEditFormProps = {
  product: AdminProduct;
  updateProductAction: FormAction;
};

export const ProductEditForm = ({
  product,
  updateProductAction,
}: ProductEditFormProps) => {
  return (
    <form
      action={updateProductAction}
      encType="multipart/form-data"
      className="mt-3 grid gap-3 md:grid-cols-2"
    >
      <input type="hidden" name="productId" value={product.id} />
      <input type="hidden" name="previousSlug" value={product.slug} />

      <label className="block">
        <span className="text-xs font-semibold uppercase tracking-wide text-slate-600">Nom</span>
        <input
          type="text"
          name="name"
          required
          defaultValue={product.name}
          className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
        />
      </label>
      <label className="block">
        <span className="text-xs font-semibold uppercase tracking-wide text-slate-600">
          Slug
        </span>
        <input
          type="text"
          name="slug"
          required
          defaultValue={product.slug}
          className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
        />
      </label>
      <label className="block md:col-span-2">
        <span className="text-xs font-semibold uppercase tracking-wide text-slate-600">
          Description courte
        </span>
        <input
          type="text"
          name="shortDescription"
          required
          defaultValue={product.short_description}
          className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
        />
      </label>
      <label className="block md:col-span-2">
        <span className="text-xs font-semibold uppercase tracking-wide text-slate-600">
          Description complete
        </span>
        <textarea
          name="description"
          rows={3}
          required
          defaultValue={product.description}
          className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
        />
      </label>
      <label className="block">
        <span className="text-xs font-semibold uppercase tracking-wide text-slate-600">
          Prix (DH)
        </span>
        <input
          type="number"
          name="price"
          min="0.01"
          step="0.01"
          inputMode="decimal"
          required
          defaultValue={product.price}
          className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
        />
      </label>
      <label className="block">
        <span className="text-xs font-semibold uppercase tracking-wide text-slate-600">
          Categorie
        </span>
        <input
          type="text"
          name="categorySlug"
          required
          defaultValue={product.category_slug}
          list="admin-category-options"
          className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
        />
        <span className="mt-1 block text-xs text-slate-500">
          Utilisez une categorie existante ou un nouveau slug.
        </span>
      </label>
      <label className="block">
        <span className="text-xs font-semibold uppercase tracking-wide text-slate-600">
          Quantite (stock)
        </span>
        <input
          type="number"
          name="stock"
          min="0"
          step="1"
          required
          defaultValue={product.stock}
          className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
        />
      </label>
      <label className="block">
        <span className="text-xs font-semibold uppercase tracking-wide text-slate-600">
          Note
        </span>
        <input
          type="number"
          name="rating"
          min="0"
          max="5"
          step="0.1"
          required
          defaultValue={product.rating}
          className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
        />
      </label>
      <AdminProductImageUploadInput
        inputName="imageFiles"
        idPrefix={`edit-product-${product.id}`}
      />
      <p className="-mt-1 text-xs text-slate-500 md:col-span-2">
        Les images telechargees sont optimisees automatiquement en WebP (thumb 300, medium 800,
        large 1400).
      </p>
      <label className="block md:col-span-2">
        <span className="text-xs font-semibold uppercase tracking-wide text-slate-600">
          Chemins images existants (optionnel)
        </span>
        <textarea
          name="existingImages"
          rows={3}
          defaultValue={product.images.join("\n")}
          className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
        />
      </label>
      <AdminProductVariantsInput
        inputName="variantsJson"
        productIdForValidation={product.id}
        initialVariants={product.variants.map((variant) => ({
          id: variant.id,
          color: variant.color,
          size: variant.size,
          price: variant.price,
          previousPrice: variant.previous_price,
          stock: variant.stock,
          sku: variant.sku,
          image: variant.image,
          isActive: variant.is_active,
        }))}
      />
      <label className="inline-flex items-center gap-2 md:col-span-2">
        <input type="checkbox" name="isActive" defaultChecked={product.is_active} />
        <span className="text-sm text-slate-700">Produit actif</span>
      </label>

      <div className="flex flex-wrap items-center gap-2 md:col-span-2">
        <FormSubmitButton
          idleLabel="Enregistrer modifications"
          pendingLabel="Enregistrement..."
          className="rounded-xl bg-brand-blue px-4 py-2 text-sm font-semibold text-white"
        />
      </div>
    </form>
  );
};
