import type { AdminProduct } from "@/lib/admin-products";
import type { AdminOffer } from "@/lib/admin-offers";
import { OfferItem } from "@/app/admin/offres/components/offer-item";

type FormAction = (formData: FormData) => void | Promise<void>;

type OffersListProps = {
  offers: AdminOffer[];
  products: AdminProduct[];
  productById: Map<string, AdminProduct>;
  updateOfferAction: FormAction;
  toggleOfferActiveAction: FormAction;
  deleteOfferAction: FormAction;
};

export const OffersList = ({
  offers,
  products,
  productById,
  updateOfferAction,
  toggleOfferActiveAction,
  deleteOfferAction,
}: OffersListProps) => {
  if (offers.length === 0) {
    return (
      <div className="rounded-2xl bg-white p-6 shadow-card">
        <p className="text-sm text-slate-600">Aucune offre en base pour le moment.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {offers.map((offer) => (
        <OfferItem
          key={offer.id}
          offer={offer}
          products={products}
          productById={productById}
          updateOfferAction={updateOfferAction}
          toggleOfferActiveAction={toggleOfferActiveAction}
          deleteOfferAction={deleteOfferAction}
        />
      ))}
    </div>
  );
};
