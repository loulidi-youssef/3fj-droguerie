import { AdminProductImageUploadInput } from "@/components/admin-product-image-upload-input";
import { AdminProductBulkPriceTiersInput } from "@/components/admin-product-bulk-price-tiers-input";
import { AdminProductVariantsInput } from "@/components/admin-product-variants-input";
import { FormSubmitButton } from "@/components/form-submit-button";
import type { ReactNode } from "react";
import type { AdminProduct } from "@/lib/admin-products";
import {
  AdminIconBulk,
  AdminIconCategory,
  AdminIconPrice,
  AdminIconProducts,
  AdminIconStock,
  AdminIconText,
  AdminIconVariants,
} from "@/app/admin/products/components/admin-products-icons";

type FormAction = (formData: FormData) => void | Promise<void>;

type ProductEditFormProps = {
  product: AdminProduct;
  updateProductAction: FormAction;
};

type SectionProps = {
  title: string;
  description?: string;
  icon: ReactNode;
  children: ReactNode;
};

const SectionCard = ({ title, description, icon, children }: SectionProps) => {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4">
      <div className="mb-3">
        <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-600">
          <span className="inline-flex h-6 w-6 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
            {icon}
          </span>
          {title}
        </p>
        {description ? (
          <p className="mt-1 text-xs text-slate-500">{description}</p>
        ) : null}
      </div>
      {children}
    </section>
  );
};

export const ProductEditForm = ({
  product,
  updateProductAction,
}: ProductEditFormProps) => {
  return (
    <form
      action={updateProductAction}
      encType="multipart/form-data"
      className="space-y-3"
    >
      <input type="hidden" name="productId" value={product.id} />
      <input type="hidden" name="previousSlug" value={product.slug} />

      <SectionCard
        title="Identite"
        description="Nom, slug produit et categorie."
        icon={<AdminIconProducts className="h-3.5 w-3.5" />}
      >
        <div className="grid gap-3 md:grid-cols-3">
          <label className="block">
            <span className="text-xs font-semibold text-slate-700">Nom</span>
            <input
              type="text"
              name="name"
              required
              defaultValue={product.name}
              className="mt-1 h-10 w-full rounded-xl border border-slate-300 px-3 text-sm"
            />
          </label>

          <label className="block">
            <span className="text-xs font-semibold text-slate-700">Slug</span>
            <input
              type="text"
              name="slug"
              required
              defaultValue={product.slug}
              className="mt-1 h-10 w-full rounded-xl border border-slate-300 px-3 text-sm"
            />
          </label>

          <label className="block">
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-700">
              <AdminIconCategory className="h-3.5 w-3.5" />
              Categorie
            </span>
            <input
              type="text"
              name="categorySlug"
              required
              defaultValue={product.category_slug}
              list="admin-category-options"
              className="mt-1 h-10 w-full rounded-xl border border-slate-300 px-3 text-sm"
            />
            <span className="mt-1 block text-xs text-slate-500">
              Utilisez une categorie existante ou un nouveau slug.
            </span>
          </label>
        </div>
      </SectionCard>

      <SectionCard
        title="Descriptions"
        description="Resume court et description complete."
        icon={<AdminIconText className="h-3.5 w-3.5" />}
      >
        <div className="grid gap-3">
          <label className="block">
            <span className="text-xs font-semibold text-slate-700">Description courte</span>
            <input
              type="text"
              name="shortDescription"
              required
              defaultValue={product.short_description}
              className="mt-1 h-10 w-full rounded-xl border border-slate-300 px-3 text-sm"
            />
          </label>

          <label className="block">
            <span className="text-xs font-semibold text-slate-700">Description complete</span>
            <textarea
              name="description"
              rows={4}
              required
              defaultValue={product.description}
              className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
            />
          </label>
        </div>
      </SectionCard>

      <SectionCard
        title="Commerce"
        description="Prix, stock, note et statut actif."
        icon={<AdminIconPrice className="h-3.5 w-3.5" />}
      >
        <div className="grid gap-3 md:grid-cols-4">
          <label className="block">
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-700">
              <AdminIconPrice className="h-3.5 w-3.5" />
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
              className="mt-1 h-10 w-full rounded-xl border border-slate-300 px-3 text-sm"
            />
          </label>

          <label className="block">
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-700">
              <AdminIconStock className="h-3.5 w-3.5" />
              Quantite (stock)
            </span>
            <input
              type="number"
              name="stock"
              min="0"
              step="1"
              required
              defaultValue={product.stock}
              className="mt-1 h-10 w-full rounded-xl border border-slate-300 px-3 text-sm"
            />
          </label>

          <label className="block">
            <span className="text-xs font-semibold text-slate-700">Note</span>
            <input
              type="number"
              name="rating"
              min="0"
              max="5"
              step="0.1"
              required
              defaultValue={product.rating}
              className="mt-1 h-10 w-full rounded-xl border border-slate-300 px-3 text-sm"
            />
          </label>

          <label className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
            <input type="checkbox" name="isActive" defaultChecked={product.is_active} />
            <span className="text-sm font-medium text-slate-700">Produit actif</span>
          </label>
        </div>
      </SectionCard>

      <SectionCard
        title="Prix de gros"
        description="Paliers quantite-prix pour commandes volumineuses."
        icon={<AdminIconBulk className="h-3.5 w-3.5" />}
      >
        <AdminProductBulkPriceTiersInput
          inputName="bulkPriceTiersJson"
          initialTiers={product.bulk_price_tiers.map((tier) => ({
            minQty: tier.minQty,
            price: tier.price,
          }))}
        />
      </SectionCard>

      <SectionCard
        title="Media et images"
        description="Televersement image(s) et chemins existants."
        icon={<AdminIconProducts className="h-3.5 w-3.5" />}
      >
        <AdminProductImageUploadInput
          inputName="imageFiles"
          idPrefix={`edit-product-${product.id}`}
        />
        <p className="mt-2 text-xs text-slate-500">
          Les images telechargees sont optimisees automatiquement en WebP (thumb 300, medium 800,
          large 1400).
        </p>
        <label className="mt-3 block">
          <span className="text-xs font-semibold text-slate-700">
            Chemins images existants (optionnel)
          </span>
          <textarea
            name="existingImages"
            rows={3}
            defaultValue={product.images.join("\n")}
            className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
          />
        </label>
      </SectionCard>

      <SectionCard
        title="Variantes"
        description="Declinaisons couleur / taille / prix / stock."
        icon={<AdminIconVariants className="h-3.5 w-3.5" />}
      >
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
      </SectionCard>

      <div className="flex flex-wrap items-center justify-end gap-2 pt-1">
        <FormSubmitButton
          idleLabel="Enregistrer modifications"
          pendingLabel="Enregistrement..."
          className="rounded-xl bg-brand-blue px-4 py-2 text-sm font-semibold text-white shadow-[0_8px_20px_rgba(15,42,77,0.2)]"
        />
      </div>
    </form>
  );
};
