import { formatDh } from "@/lib/currency";
import type { AdminProduct } from "@/lib/admin-products";
import type { AdminOffer } from "@/lib/admin-offers";
import {
  type ResolvedOfferDiscountRule,
  toDateTimeLocalInputValue,
} from "@/app/admin/offres/lib/formatters";

type FormAction = (formData: FormData) => void | Promise<void>;

type OfferEditFormProps = {
  offer: AdminOffer;
  products: AdminProduct[];
  resolvedDiscount: ResolvedOfferDiscountRule | null;
  updateOfferAction: FormAction;
};

export const OfferEditForm = ({
  offer,
  products,
  resolvedDiscount,
  updateOfferAction,
}: OfferEditFormProps) => {
  return (
    <form action={updateOfferAction} className="mt-3 grid gap-3 md:grid-cols-2">
      <input type="hidden" name="offerId" value={offer.id} />

      <label className="block">
        <span className="text-xs font-semibold uppercase tracking-wide text-slate-600">
          Titre
        </span>
        <input
          type="text"
          name="title"
          required
          defaultValue={offer.title}
          className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
        />
      </label>

      <label className="block">
        <span className="text-xs font-semibold uppercase tracking-wide text-slate-600">
          Type remise
        </span>
        <select
          name="discountType"
          required
          defaultValue={resolvedDiscount?.discountType ?? "percent"}
          className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm"
        >
          <option value="percent">Pourcentage (%)</option>
          <option value="fixed">Montant fixe (DH)</option>
        </select>
      </label>

      <label className="block md:col-span-2">
        <span className="text-xs font-semibold uppercase tracking-wide text-slate-600">
          Description courte
        </span>
        <textarea
          name="shortDescription"
          rows={3}
          required
          defaultValue={offer.short_description}
          className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
        />
      </label>

      <label className="block">
        <span className="text-xs font-semibold uppercase tracking-wide text-slate-600">
          Produit lie
        </span>
        <select
          name="productId"
          required
          defaultValue={offer.product_id ?? ""}
          className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm"
        >
          <option value="">Selectionner un produit</option>
          {products.map((product) => (
            <option key={product.id} value={product.id}>
              {product.name} ({formatDh(product.price)})
            </option>
          ))}
        </select>
      </label>

      <label className="block">
        <span className="text-xs font-semibold uppercase tracking-wide text-slate-600">
          Valeur remise
        </span>
        <input
          type="number"
          name="discountValue"
          min="0"
          step="0.01"
          required
          defaultValue={resolvedDiscount?.discountValue ?? 0}
          className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
        />
      </label>

      <label className="block">
        <span className="text-xs font-semibold uppercase tracking-wide text-slate-600">
          Date debut
        </span>
        <input
          type="datetime-local"
          name="startAt"
          defaultValue={toDateTimeLocalInputValue(offer.start_at)}
          className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
        />
      </label>
      <label className="block">
        <span className="text-xs font-semibold uppercase tracking-wide text-slate-600">
          Date fin
        </span>
        <input
          type="datetime-local"
          name="endAt"
          defaultValue={toDateTimeLocalInputValue(offer.end_at)}
          className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
        />
      </label>

      <label className="block">
        <span className="text-xs font-semibold uppercase tracking-wide text-slate-600">
          Image (optionnel)
        </span>
        <input
          type="text"
          name="imagePath"
          defaultValue={offer.image_path ?? ""}
          className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
        />
      </label>

      <label className="block">
        <span className="text-xs font-semibold uppercase tracking-wide text-slate-600">
          Texte banniere (optionnel)
        </span>
        <input
          type="text"
          name="bannerText"
          defaultValue={offer.banner_text ?? ""}
          className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
        />
      </label>

      <label className="inline-flex items-center gap-2">
        <input type="checkbox" name="isActive" defaultChecked={offer.is_active} />
        <span className="text-sm text-slate-700">Offre active</span>
      </label>

      <label className="inline-flex items-center gap-2">
        <input type="checkbox" name="isFeatured" defaultChecked={offer.is_featured} />
        <span className="text-sm text-slate-700">Offre principale</span>
      </label>

      <div className="md:col-span-2">
        <button
          type="submit"
          className="rounded-xl bg-brand-blue px-4 py-2 text-sm font-semibold text-white"
        >
          Enregistrer modifications
        </button>
      </div>
    </form>
  );
};
