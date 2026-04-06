import { formatDh } from "@/lib/currency";
import type { AdminProduct } from "@/lib/admin-products";

type FormAction = (formData: FormData) => void | Promise<void>;

type OfferCreateFormProps = {
  products: AdminProduct[];
  createOfferAction: FormAction;
};

export const OfferCreateForm = ({
  products,
  createOfferAction,
}: OfferCreateFormProps) => {
  return (
    <details className="mb-6 rounded-2xl bg-white p-5 shadow-card" open>
      <summary className="cursor-pointer list-none text-lg font-bold text-brand-blue">
        Ajouter une offre
      </summary>

      <form action={createOfferAction} className="mt-4 grid gap-3 md:grid-cols-2">
        <label className="block">
          <span className="text-xs font-semibold uppercase tracking-wide text-slate-600">
            Titre
          </span>
          <input
            type="text"
            name="title"
            required
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
            defaultValue="percent"
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
            placeholder="20"
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
            placeholder="/images/offres/mon-offre.jpg"
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
            placeholder="Offre limitee"
            className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
          />
        </label>

        <label className="inline-flex items-center gap-2">
          <input type="checkbox" name="isActive" defaultChecked />
          <span className="text-sm text-slate-700">Offre active</span>
        </label>

        <label className="inline-flex items-center gap-2">
          <input type="checkbox" name="isFeatured" defaultChecked />
          <span className="text-sm text-slate-700">Offre principale (homepage)</span>
        </label>

        <div className="md:col-span-2">
          <button
            type="submit"
            className="rounded-xl bg-brand-blue px-4 py-2 text-sm font-semibold text-white"
          >
            Ajouter offre
          </button>
        </div>
      </form>
    </details>
  );
};
