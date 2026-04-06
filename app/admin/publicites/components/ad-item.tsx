import type { AdminAdAnalyticsRow } from "@/lib/admin-ad-analytics";
import type { AdminAdPlan } from "@/lib/admin-ad-plans";
import type { AdminAd } from "@/lib/admin-ads";
import {
  formatCtr,
  formatDateTime,
  formatMad,
  toDateTimeLocalInputValue,
} from "@/app/admin/publicites/lib/formatters";

type FormAction = (formData: FormData) => void | Promise<void>;

type AdItemProps = {
  ad: AdminAd;
  plans: AdminAdPlan[];
  adAnalytics: AdminAdAnalyticsRow | undefined;
  updateAdAction: FormAction;
  toggleAdActiveAction: FormAction;
  deleteAdAction: FormAction;
};

export const AdItem = ({
  ad,
  plans,
  adAnalytics,
  updateAdAction,
  toggleAdActiveAction,
  deleteAdAction,
}: AdItemProps) => {
  return (
    <details className="rounded-2xl bg-white p-5 shadow-card">
      <summary className="cursor-pointer list-none">
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Titre</p>
            <p className="text-sm font-bold text-brand-blue">{ad.title?.trim() || "Sans titre"}</p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Position
            </p>
            <span className="inline-flex rounded-full bg-orange-100 px-2.5 py-1 text-xs font-semibold text-orange-700">
              {ad.position === "top" ? "Top" : "Middle"}
            </span>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Plan</p>
            <p className="text-xs text-slate-700">{ad.ad_plan?.name ?? "Aucun"}</p>
            <p className="text-xs font-semibold text-slate-800">
              {ad.ad_plan ? formatMad(ad.ad_plan.price) : "-"}
            </p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Periode</p>
            <p className="text-xs text-slate-700">Debut: {formatDateTime(ad.start_date)}</p>
            <p className="text-xs text-slate-700">Fin: {formatDateTime(ad.end_date)}</p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Stats</p>
            <p className="text-xs text-slate-700">Vues: {adAnalytics?.views ?? 0}</p>
            <p className="text-xs text-slate-700">Clics: {adAnalytics?.clicks ?? 0}</p>
            <p className="text-xs font-semibold text-slate-800">
              CTR: {formatCtr(adAnalytics?.ctr ?? 0)}
            </p>
          </div>
        </div>
      </summary>

      <form
        action={updateAdAction}
        className="mt-4 grid gap-3 border-t border-slate-200 pt-4 md:grid-cols-2"
      >
        <input type="hidden" name="adId" value={ad.id} />
        <input
          type="text"
          name="imageUrl"
          required
          defaultValue={ad.image_url}
          className="md:col-span-2 rounded-xl border border-slate-300 px-3 py-2 text-sm"
        />
        <input
          type="text"
          name="title"
          defaultValue={ad.title ?? ""}
          className="rounded-xl border border-slate-300 px-3 py-2 text-sm"
        />
        <select
          name="position"
          required
          defaultValue={ad.position}
          className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm"
        >
          <option value="top">Top</option>
          <option value="middle">Middle</option>
        </select>
        <textarea
          name="description"
          rows={3}
          defaultValue={ad.description ?? ""}
          className="md:col-span-2 rounded-xl border border-slate-300 px-3 py-2 text-sm"
        />
        <input
          type="url"
          name="link"
          required
          defaultValue={ad.link}
          className="md:col-span-2 rounded-xl border border-slate-300 px-3 py-2 text-sm"
        />
        <select
          name="planId"
          defaultValue={ad.plan_id ?? ""}
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
          defaultValue={toDateTimeLocalInputValue(ad.start_date)}
          className="rounded-xl border border-slate-300 px-3 py-2 text-sm"
        />
        <input
          type="datetime-local"
          name="endDate"
          defaultValue={toDateTimeLocalInputValue(ad.end_date)}
          className="rounded-xl border border-slate-300 px-3 py-2 text-sm"
        />
        <label className="inline-flex items-center gap-2 md:col-span-2">
          <input type="checkbox" name="isActive" defaultChecked={ad.is_active} />
          <span className="text-sm text-slate-700">Publicite active</span>
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

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <form action={toggleAdActiveAction}>
          <input type="hidden" name="adId" value={ad.id} />
          <input type="hidden" name="nextActive" value={ad.is_active ? "false" : "true"} />
          <button
            type="submit"
            className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700"
          >
            {ad.is_active ? "Desactiver" : "Activer"}
          </button>
        </form>
        <form action={deleteAdAction}>
          <input type="hidden" name="adId" value={ad.id} />
          <button
            type="submit"
            className="rounded-xl border border-rose-300 px-4 py-2 text-sm font-semibold text-rose-700"
          >
            Supprimer
          </button>
        </form>
      </div>
    </details>
  );
};

