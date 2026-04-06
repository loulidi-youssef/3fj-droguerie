import { AdminProductImageUploadInput } from "@/components/admin-product-image-upload-input";
import { AdminProductVariantsInput } from "@/components/admin-product-variants-input";

type FormAction = (formData: FormData) => void | Promise<void>;

type ProductCreateFormProps = {
  createProductAction: FormAction;
};

export const ProductCreateForm = ({ createProductAction }: ProductCreateFormProps) => {
  return (
    <details className="mb-6 rounded-2xl bg-white p-5 shadow-card" open>
      <summary className="cursor-pointer list-none text-lg font-bold text-brand-blue">
        Ajouter un produit
      </summary>

      <form
        action={createProductAction}
        encType="multipart/form-data"
        className="mt-4 grid gap-3 md:grid-cols-2"
      >
        <label className="block">
          <span className="text-xs font-semibold uppercase tracking-wide text-slate-600">Nom</span>
          <input
            type="text"
            name="name"
            required
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
            placeholder="ex: peinture-atlas-20kg"
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
            min="1"
            step="1"
            required
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
            placeholder="ex: outillage"
            list="admin-category-options"
            className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
          />
          <span className="mt-1 block text-xs text-slate-500">
            Choisissez une categorie existante ou saisissez un nouveau slug.
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
            defaultValue={0}
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
            defaultValue={4.5}
            className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
          />
        </label>
        <AdminProductImageUploadInput inputName="imageFiles" idPrefix="create-product" />
        <label className="block md:col-span-2">
          <span className="text-xs font-semibold uppercase tracking-wide text-slate-600">
            Chemins images existants (optionnel)
          </span>
          <textarea
            name="existingImages"
            rows={3}
            placeholder="/images/products/mon-produit.jpg"
            className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
          />
        </label>
        <AdminProductVariantsInput
          inputName="variantsJson"
          productIdForValidation="__new__"
        />
        <label className="inline-flex items-center gap-2 md:col-span-2">
          <input type="checkbox" name="isActive" defaultChecked />
          <span className="text-sm text-slate-700">Produit actif</span>
        </label>
        <div className="md:col-span-2">
          <button
            type="submit"
            className="rounded-xl bg-brand-blue px-4 py-2 text-sm font-semibold text-white"
          >
            Ajouter produit
          </button>
        </div>
      </form>
    </details>
  );
};

