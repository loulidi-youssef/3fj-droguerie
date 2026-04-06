import type { AdminAdPlan } from "@/lib/admin-ad-plans";
import { formatMad } from "@/app/admin/publicites/lib/formatters";

type FormAction = (formData: FormData) => void | Promise<void>;

type AdCreateFormProps = {
  plans: AdminAdPlan[];
  createAdAction: FormAction;
};

export const AdCreateForm = ({ plans, createAdAction }: AdCreateFormProps) => {
  return (
    <details className="mb-6 rounded-2xl bg-white p-5 shadow-card" open>
      <summary className="cursor-pointer list-none text-lg font-bold text-brand-blue">
        Ajouter une publicite
      </summary>
      <form action={createAdAction} className="mt-4 grid gap-3 md:grid-cols-2">
        <input
          type="text"
          name="imageUrl"
          required
          placeholder="URL image"
          className="md:col-span-2 rounded-xl border border-slate-300 px-3 py-2 text-sm"
        />
        <input
          type="text"
          name="title"
          placeholder="Titre (optionnel)"
          className="rounded-xl border border-slate-300 px-3 py-2 text-sm"
        />
        <select
          name="position"
          required
          defaultValue="top"
          className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm"
        >
          <option value="top">Top</option>
          <option value="middle">Middle</option>
        </select>
        <textarea
          name="description"
          rows={3}
          placeholder="Description"
          className="md:col-span-2 rounded-xl border border-slate-300 px-3 py-2 text-sm"
        />
        <input
          type="url"
          name="link"
          required
          placeholder="Lien cible"
          className="md:col-span-2 rounded-xl border border-slate-300 px-3 py-2 text-sm"
        />
        <select
          name="planId"
          defaultValue=""
          className="md:col-span-2 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm"
        >
          <option value="">Aucun plan</option>
          {plans.map((plan) => (
            <option key={plan.id} value={plan.id}>
              {plan.name} - {plan.position} - {formatMad(plan.price)}
            </option>
          ))}
        </select>
        <input
          type="datetime-local"
          name="startDate"
          className="rounded-xl border border-slate-300 px-3 py-2 text-sm"
        />
        <input
          type="datetime-local"
          name="endDate"
          className="rounded-xl border border-slate-300 px-3 py-2 text-sm"
        />
        <label className="inline-flex items-center gap-2 md:col-span-2">
          <input type="checkbox" name="isActive" />
          <span className="text-sm text-slate-700">Publicite active</span>
        </label>
        <div className="md:col-span-2">
          <button
            type="submit"
            className="rounded-xl bg-brand-blue px-4 py-2 text-sm font-semibold text-white"
          >
            Ajouter publicite
          </button>
        </div>
      </form>
    </details>
  );
};

