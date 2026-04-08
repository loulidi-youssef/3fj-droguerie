import { AdminProductImageUploadInput } from "@/components/admin-product-image-upload-input";
import { AdminProductBulkPriceTiersInput } from "@/components/admin-product-bulk-price-tiers-input";
import { AdminProductVariantsInput } from "@/components/admin-product-variants-input";
import { FormSubmitButton } from "@/components/form-submit-button";
import type { ReactNode } from "react";
import {
  AdminIconBulk,
  AdminIconCategory,
  AdminIconPlus,
  AdminIconPrice,
  AdminIconProducts,
  AdminIconStock,
  AdminIconText,
  AdminIconVariants,
} from "@/app/admin/products/components/admin-products-icons";

type FormAction = (formData: FormData) => void | Promise<void>;

type ProductCreateFormProps = {
  createProductAction: FormAction;
};

type SectionProps = {
  title: string;
  icon: ReactNode;
  description?: string;
  children: ReactNode;
};

const SectionCard = ({ title, icon, description, children }: SectionProps) => {
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

export const ProductCreateForm = ({ createProductAction }: ProductCreateFormProps) => {
  return (
    <details id="admin-products-create" className="rounded-3xl border border-slate-200 bg-white p-5 shadow-[0_14px_32px_rgba(15,42,77,0.07)]" open>
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3">
        <div>
          <p className="inline-flex items-center gap-2 rounded-full border border-brand-blue/20 bg-brand-blue/5 px-3 py-1 text-xs font-semibold text-brand-blue">
            <AdminIconPlus className="h-3.5 w-3.5" />
            Nouveau produit
          </p>
          <h2 className="mt-2 text-xl font-bold text-brand-blue">Ajouter un produit</h2>
        </div>
      </summary>

      <form
        action={createProductAction}
        encType="multipart/form-data"
        className="mt-4 space-y-3"
      >
        <SectionCard
          title="Identite"
          description="Nom, slug et categorie du produit."
          icon={<AdminIconProducts className="h-3.5 w-3.5" />}
        >
          <div className="grid gap-3 md:grid-cols-3">
            <label className="block">
              <span className="text-xs font-semibold text-slate-700">Nom</span>
              <input
                type="text"
                name="name"
                required
                className="mt-1 h-10 w-full rounded-xl border border-slate-300 px-3 text-sm"
              />
            </label>
            <label className="block">
              <span className="text-xs font-semibold text-slate-700">Slug</span>
              <input
                type="text"
                name="slug"
                required
                placeholder="ex: peinture-atlas-20kg"
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
                placeholder="ex: outillage"
                list="admin-category-options"
                className="mt-1 h-10 w-full rounded-xl border border-slate-300 px-3 text-sm"
              />
              <span className="mt-1 block text-xs text-slate-500">
                Choisissez une categorie existante ou saisissez un nouveau slug.
              </span>
            </label>
          </div>
        </SectionCard>

        <SectionCard
          title="Descriptions"
          description="Resume court et description detaillee."
          icon={<AdminIconText className="h-3.5 w-3.5" />}
        >
          <div className="grid gap-3">
            <label className="block">
              <span className="text-xs font-semibold text-slate-700">Description courte</span>
              <input
                type="text"
                name="shortDescription"
                required
                className="mt-1 h-10 w-full rounded-xl border border-slate-300 px-3 text-sm"
              />
            </label>
            <label className="block">
              <span className="text-xs font-semibold text-slate-700">Description complete</span>
              <textarea
                name="description"
                rows={4}
                required
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
                defaultValue={0}
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
                defaultValue={4.5}
                className="mt-1 h-10 w-full rounded-xl border border-slate-300 px-3 text-sm"
              />
            </label>
            <label className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
              <input type="checkbox" name="isActive" defaultChecked />
              <span className="text-sm font-medium text-slate-700">Produit actif</span>
            </label>
          </div>
        </SectionCard>

        <SectionCard
          title="Prix de gros"
          description="Configurez les paliers quantite-prix."
          icon={<AdminIconBulk className="h-3.5 w-3.5" />}
        >
          <AdminProductBulkPriceTiersInput inputName="bulkPriceTiersJson" />
        </SectionCard>

        <SectionCard
          title="Media et images"
          description="Televersement et chemins existants."
          icon={<AdminIconProducts className="h-3.5 w-3.5" />}
        >
          <AdminProductImageUploadInput inputName="imageFiles" idPrefix="create-product" />
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
              placeholder="/images/products/mon-produit.jpg"
              className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
            />
          </label>
        </SectionCard>

        <SectionCard
          title="Variantes"
          description="Declinaisons couleur/taille/prix pour le produit."
          icon={<AdminIconVariants className="h-3.5 w-3.5" />}
        >
          <AdminProductVariantsInput
            inputName="variantsJson"
            productIdForValidation="__new__"
          />
        </SectionCard>

        <div className="flex justify-end">
          <FormSubmitButton
            idleLabel="Ajouter produit"
            pendingLabel="Ajout en cours..."
            className="rounded-xl bg-brand-blue px-4 py-2 text-sm font-semibold text-white shadow-[0_8px_20px_rgba(15,42,77,0.2)]"
          />
        </div>
      </form>
    </details>
  );
};
