import Link from "next/link";
import type { AdminProduct } from "@/lib/admin-products";
import type { AdminOffer } from "@/lib/admin-offers";
import { OfferCreateForm } from "@/app/admin/offres/components/offer-create-form";
import { OffersList } from "@/app/admin/offres/components/offers-list";

type FormAction = (formData: FormData) => void | Promise<void>;
type LogoutAction = () => void | Promise<void>;

type AdminOffresPageViewProps = {
  offers: AdminOffer[];
  products: AdminProduct[];
  productById: Map<string, AdminProduct>;
  successMessage: string;
  errorMessage: string;
  logoutAdminAction: LogoutAction;
  createOfferAction: FormAction;
  updateOfferAction: FormAction;
  toggleOfferActiveAction: FormAction;
  deleteOfferAction: FormAction;
};

export const AdminOffresPageView = ({
  offers,
  products,
  productById,
  successMessage,
  errorMessage,
  logoutAdminAction,
  createOfferAction,
  updateOfferAction,
  toggleOfferActiveAction,
  deleteOfferAction,
}: AdminOffresPageViewProps) => {
  return (
    <section className="bg-brand-light py-12">
      <div className="mx-auto max-w-7xl px-4 sm:px-5 lg:px-6">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-3xl font-extrabold text-brand-blue">Admin offres</h1>
            <p className="mt-1 text-sm text-slate-600">
              Ajoutez, modifiez, activez/desactivez et supprimez les offres.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/admin/orders"
              className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700"
            >
              Voir commandes
            </Link>
            <Link
              href="/admin/products"
              className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700"
            >
              Voir produits
            </Link>
            <Link
              href="/admin/customers"
              className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700"
            >
              Voir clients
            </Link>
            <Link
              href="/admin/blog"
              className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700"
            >
              Voir blog
            </Link>
            <Link
              href="/admin/reviews"
              className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700"
            >
              Voir avis
            </Link>
            <form action={logoutAdminAction}>
              <button
                type="submit"
                className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700"
              >
                Deconnexion
              </button>
            </form>
          </div>
        </div>

        {successMessage ? (
          <p className="mb-4 rounded-xl bg-emerald-50 p-3 text-sm font-medium text-emerald-700">
            {successMessage}
          </p>
        ) : null}

        {errorMessage ? (
          <p className="mb-4 rounded-xl bg-rose-50 p-3 text-sm font-medium text-rose-700">
            {errorMessage}
          </p>
        ) : null}

        <OfferCreateForm products={products} createOfferAction={createOfferAction} />

        <OffersList
          offers={offers}
          products={products}
          productById={productById}
          updateOfferAction={updateOfferAction}
          toggleOfferActiveAction={toggleOfferActiveAction}
          deleteOfferAction={deleteOfferAction}
        />
      </div>
    </section>
  );
};
