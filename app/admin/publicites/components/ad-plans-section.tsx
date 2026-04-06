import type { AdminAdPlan } from "@/lib/admin-ad-plans";
import { formatMad } from "@/app/admin/publicites/lib/formatters";

type FormAction = (formData: FormData) => void | Promise<void>;

type AdPlansSectionProps = {
  plans: AdminAdPlan[];
  createPlanAction: FormAction;
  updatePlanAction: FormAction;
  togglePlanActiveAction: FormAction;
  deletePlanAction: FormAction;
};

export const AdPlansSection = ({
  plans,
  createPlanAction,
  updatePlanAction,
  togglePlanActiveAction,
  deletePlanAction,
}: AdPlansSectionProps) => {
  return (
    <details className="mb-6 rounded-2xl bg-white p-5 shadow-card" open>
      <summary className="cursor-pointer list-none text-lg font-bold text-brand-blue">
        Plans publicitaires
      </summary>

      <form action={createPlanAction} className="mt-4 grid gap-3 md:grid-cols-2">
        <input
          type="text"
          name="name"
          required
          placeholder="Top Banner - 7 jours"
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
          rows={2}
          placeholder="Description"
          className="md:col-span-2 rounded-xl border border-slate-300 px-3 py-2 text-sm"
        />
        <input
          type="number"
          name="durationDays"
          min="1"
          step="1"
          required
          placeholder="Duree (jours)"
          className="rounded-xl border border-slate-300 px-3 py-2 text-sm"
        />
        <input
          type="number"
          name="price"
          min="0"
          step="1"
          required
          placeholder="Prix MAD"
          className="rounded-xl border border-slate-300 px-3 py-2 text-sm"
        />
        <label className="inline-flex items-center gap-2 md:col-span-2">
          <input type="checkbox" name="isActive" defaultChecked />
          <span className="text-sm text-slate-700">Plan actif</span>
        </label>
        <div className="md:col-span-2">
          <button
            type="submit"
            className="rounded-xl bg-brand-blue px-4 py-2 text-sm font-semibold text-white"
          >
            Ajouter plan
          </button>
        </div>
      </form>

      {plans.length === 0 ? (
        <p className="mt-4 text-sm text-slate-600">Aucun plan configure.</p>
      ) : (
        <div className="mt-6 space-y-3">
          {plans.map((plan) => (
            <details key={plan.id} className="rounded-xl border border-slate-200 p-4">
              <summary className="cursor-pointer list-none text-sm font-semibold text-brand-blue">
                {plan.name} - {formatMad(plan.price)} ({plan.duration_days} jours)
              </summary>
              <form action={updatePlanAction} className="mt-3 grid gap-3 md:grid-cols-2">
                <input type="hidden" name="planId" value={plan.id} />
                <input
                  type="text"
                  name="name"
                  required
                  defaultValue={plan.name}
                  className="rounded-xl border border-slate-300 px-3 py-2 text-sm"
                />
                <select
                  name="position"
                  required
                  defaultValue={plan.position}
                  className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm"
                >
                  <option value="top">Top</option>
                  <option value="middle">Middle</option>
                </select>
                <textarea
                  name="description"
                  rows={2}
                  defaultValue={plan.description ?? ""}
                  className="md:col-span-2 rounded-xl border border-slate-300 px-3 py-2 text-sm"
                />
                <input
                  type="number"
                  name="durationDays"
                  min="1"
                  step="1"
                  required
                  defaultValue={plan.duration_days}
                  className="rounded-xl border border-slate-300 px-3 py-2 text-sm"
                />
                <input
                  type="number"
                  name="price"
                  min="0"
                  step="1"
                  required
                  defaultValue={plan.price}
                  className="rounded-xl border border-slate-300 px-3 py-2 text-sm"
                />
                <label className="inline-flex items-center gap-2 md:col-span-2">
                  <input type="checkbox" name="isActive" defaultChecked={plan.is_active} />
                  <span className="text-sm text-slate-700">Plan actif</span>
                </label>
                <div className="md:col-span-2">
                  <button
                    type="submit"
                    className="rounded-xl bg-brand-blue px-4 py-2 text-sm font-semibold text-white"
                  >
                    Enregistrer plan
                  </button>
                </div>
              </form>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <form action={togglePlanActiveAction}>
                  <input type="hidden" name="planId" value={plan.id} />
                  <input
                    type="hidden"
                    name="nextActive"
                    value={plan.is_active ? "false" : "true"}
                  />
                  <button
                    type="submit"
                    className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700"
                  >
                    {plan.is_active ? "Desactiver" : "Activer"}
                  </button>
                </form>
                <form action={deletePlanAction}>
                  <input type="hidden" name="planId" value={plan.id} />
                  <button
                    type="submit"
                    className="rounded-xl border border-rose-300 px-4 py-2 text-sm font-semibold text-rose-700"
                  >
                    Supprimer
                  </button>
                </form>
              </div>
            </details>
          ))}
        </div>
      )}
    </details>
  );
};

