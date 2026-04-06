import { formatDh } from "@/lib/currency";
import type { AdminProduct } from "@/lib/admin-products";
import type { AdminOffer } from "@/lib/admin-offers";
import {
  calculateOfferPricing,
  formatOfferDiscountLabel,
} from "@/lib/offer-pricing";
import {
  formatDateTime,
  resolveDiscountRule,
} from "@/app/admin/offres/lib/formatters";
import { OfferEditForm } from "@/app/admin/offres/components/offer-edit-form";

type FormAction = (formData: FormData) => void | Promise<void>;

type OfferItemProps = {
  offer: AdminOffer;
  products: AdminProduct[];
  productById: Map<string, AdminProduct>;
  updateOfferAction: FormAction;
  toggleOfferActiveAction: FormAction;
  deleteOfferAction: FormAction;
};

export const OfferItem = ({
  offer,
  products,
  productById,
  updateOfferAction,
  toggleOfferActiveAction,
  deleteOfferAction,
}: OfferItemProps) => {
  const linkedProduct = productById.get(offer.product_id ?? "");
  const resolvedDiscount = resolveDiscountRule(
    offer.discount_type,
    offer.discount_value,
    offer.discounted_price,
    linkedProduct?.price ?? null,
  );
  const pricingPreview =
    linkedProduct && resolvedDiscount
      ? calculateOfferPricing(
          linkedProduct.price,
          resolvedDiscount.discountType,
          resolvedDiscount.discountValue,
        )
      : null;
  const discountLabel = resolvedDiscount
    ? formatOfferDiscountLabel(
        resolvedDiscount.discountType,
        resolvedDiscount.discountValue,
      )
    : offer.discount_label;

  return (
    <details className="rounded-2xl bg-white p-5 shadow-card">
      <summary className="cursor-pointer list-none">
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Titre
            </p>
            <p className="text-sm font-bold text-brand-blue">{offer.title}</p>
            <p className="text-xs text-slate-600">{discountLabel}</p>
            <p className="text-xs text-slate-600">
              Produit: {linkedProduct?.name ?? "Non defini"}
            </p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Periode
            </p>
            <p className="text-xs text-slate-700">Debut: {formatDateTime(offer.start_at)}</p>
            <p className="text-xs text-slate-700">Fin: {formatDateTime(offer.end_at)}</p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Prix</p>
            <p className="text-xs text-slate-700">
              Avant: {linkedProduct ? formatDh(linkedProduct.price) : "Non defini"}
            </p>
            <p className="text-xs font-semibold text-brand-blue">
              Maintenant:{" "}
              {pricingPreview ? formatDh(pricingPreview.discountedPrice) : "Non defini"}
            </p>
            <p className="text-xs text-emerald-700">
              Economie: {pricingPreview ? formatDh(pricingPreview.savingsAmount) : "Non definie"}
            </p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Statut
            </p>
            <span
              className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
                offer.is_active
                  ? "bg-emerald-100 text-emerald-700"
                  : "bg-slate-200 text-slate-700"
              }`}
            >
              {offer.is_active ? "Active" : "Inactive"}
            </span>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Homepage
            </p>
            <span
              className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
                offer.is_featured
                  ? "bg-amber-100 text-amber-700"
                  : "bg-slate-200 text-slate-700"
              }`}
            >
              {offer.is_featured ? "Principale" : "Secondaire"}
            </span>
          </div>
        </div>
      </summary>

      <div className="mt-4 border-t border-slate-200 pt-4">
        <p className="text-xs text-slate-500">ID: {offer.id}</p>

        <OfferEditForm
          offer={offer}
          products={products}
          resolvedDiscount={resolvedDiscount}
          updateOfferAction={updateOfferAction}
        />

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <form action={toggleOfferActiveAction}>
            <input type="hidden" name="offerId" value={offer.id} />
            <input type="hidden" name="nextActive" value={offer.is_active ? "false" : "true"} />
            <button
              type="submit"
              className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700"
            >
              {offer.is_active ? "Desactiver" : "Activer"}
            </button>
          </form>

          <form action={deleteOfferAction}>
            <input type="hidden" name="offerId" value={offer.id} />
            <button
              type="submit"
              className="rounded-xl border border-rose-300 px-4 py-2 text-sm font-semibold text-rose-700"
            >
              Supprimer
            </button>
          </form>
        </div>
      </div>
    </details>
  );
};
