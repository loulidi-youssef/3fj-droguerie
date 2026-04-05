import Link from "next/link";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { parseAdminAdInputFromFormData } from "@/lib/admin-ads-validation";
import {
  createAdminAd,
  deleteAdminAd,
  getAdminAds,
  setAdminAdActiveState,
  updateAdminAd,
} from "@/lib/admin-ads";
import {
  createAdminAdPlan,
  deleteAdminAdPlan,
  getAdminAdPlans,
  setAdminAdPlanActiveState,
  updateAdminAdPlan,
} from "@/lib/admin-ad-plans";
import { parseAdminAdPlanInputFromFormData } from "@/lib/admin-ad-plans-validation";
import { getAdminAdAnalyticsDashboard } from "@/lib/admin-ad-analytics";
import {
  clearAdminSession,
  hasValidAdminSession,
  isAdminAuthConfigured,
} from "@/lib/admin-auth";

type AdminAdsPageProps = {
  searchParams: {
    success?: string | string[];
    error?: string | string[];
  };
};

const toSingleValue = (value: string | string[] | undefined): string => {
  if (typeof value === "string") {
    return value;
  }
  if (Array.isArray(value)) {
    return value[0] ?? "";
  }
  return "";
};

const formatDateTime = (value: string | null): string => {
  if (!value) {
    return "Non defini";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "Non defini";
  }

  return new Intl.DateTimeFormat("fr-MA", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
};

const formatMad = (value: number): string => {
  return new Intl.NumberFormat("fr-MA", {
    style: "currency",
    currency: "MAD",
    maximumFractionDigits: 0,
  }).format(value);
};

const formatCtr = (value: number): string => `${value.toFixed(2)}%`;

const toDateTimeLocalInputValue = (value: string | null): string => {
  if (!value) {
    return "";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");

  return `${year}-${month}-${day}T${hours}:${minutes}`;
};

const redirectWithSuccess = (message: string): never => {
  redirect(`/admin/publicites?success=${encodeURIComponent(message)}`);
};

const redirectWithError = (message: string): never => {
  redirect(`/admin/publicites?error=${encodeURIComponent(message)}`);
};

const revalidateAdsPages = () => {
  revalidatePath("/");
  revalidatePath("/admin/publicites");
};

const ensureAdPlanMatchesPosition = async (
  planId: string | null,
  adPosition: "top" | "middle",
): Promise<string | null> => {
  if (!planId) {
    return null;
  }

  const plans = await getAdminAdPlans();
  const linkedPlan = plans.find((plan) => plan.id === planId);
  if (!linkedPlan) {
    return "Le plan publicitaire selectionne est introuvable.";
  }

  if (linkedPlan.position !== adPosition) {
    return "Le plan publicitaire doit avoir la meme position que la banniere.";
  }

  return null;
};

const logoutAdminAction = async () => {
  "use server";
  await clearAdminSession();
  redirect("/admin/login");
};

const createAdAction = async (formData: FormData) => {
  "use server";

  if (!(await hasValidAdminSession())) {
    redirect("/admin/login");
  }

  const parsed = parseAdminAdInputFromFormData(formData);
  if (!parsed.ok) {
    return redirectWithError(parsed.error);
  }

  const planError = await ensureAdPlanMatchesPosition(parsed.value.planId, parsed.value.position);
  if (planError) {
    return redirectWithError(planError);
  }

  const created = await createAdminAd(parsed.value);
  if (!created.ok) {
    return redirectWithError(created.error ?? "Impossible d'ajouter la publicite.");
  }

  revalidateAdsPages();
  redirectWithSuccess("Publicite ajoutee avec succes.");
};

const updateAdAction = async (formData: FormData) => {
  "use server";

  if (!(await hasValidAdminSession())) {
    redirect("/admin/login");
  }

  const adIdRaw = formData.get("adId");
  const adId = typeof adIdRaw === "string" ? adIdRaw.trim() : "";
  if (!adId) {
    return redirectWithError("Publicite introuvable.");
  }

  const parsed = parseAdminAdInputFromFormData(formData);
  if (!parsed.ok) {
    return redirectWithError(parsed.error);
  }

  const planError = await ensureAdPlanMatchesPosition(parsed.value.planId, parsed.value.position);
  if (planError) {
    return redirectWithError(planError);
  }

  const updated = await updateAdminAd(adId, parsed.value);
  if (!updated.ok) {
    return redirectWithError(updated.error ?? "Impossible de modifier la publicite.");
  }

  revalidateAdsPages();
  redirectWithSuccess("Publicite mise a jour.");
};

const toggleAdActiveAction = async (formData: FormData) => {
  "use server";

  if (!(await hasValidAdminSession())) {
    redirect("/admin/login");
  }

  const adIdRaw = formData.get("adId");
  const nextActiveRaw = formData.get("nextActive");
  const adId = typeof adIdRaw === "string" ? adIdRaw.trim() : "";
  const nextActive = nextActiveRaw === "true";

  if (!adId) {
    return redirectWithError("Publicite introuvable.");
  }

  const updated = await setAdminAdActiveState(adId, nextActive);
  if (!updated.ok) {
    return redirectWithError(updated.error ?? "Impossible de changer le statut de la publicite.");
  }

  revalidateAdsPages();
  redirectWithSuccess(nextActive ? "Publicite activee." : "Publicite desactivee.");
};

const deleteAdAction = async (formData: FormData) => {
  "use server";

  if (!(await hasValidAdminSession())) {
    redirect("/admin/login");
  }

  const adIdRaw = formData.get("adId");
  const adId = typeof adIdRaw === "string" ? adIdRaw.trim() : "";
  if (!adId) {
    return redirectWithError("Publicite introuvable.");
  }

  const deleted = await deleteAdminAd(adId);
  if (!deleted.ok) {
    return redirectWithError(deleted.error ?? "Suppression impossible.");
  }

  revalidateAdsPages();
  redirectWithSuccess("Publicite supprimee.");
};

const createPlanAction = async (formData: FormData) => {
  "use server";

  if (!(await hasValidAdminSession())) {
    redirect("/admin/login");
  }

  const parsed = parseAdminAdPlanInputFromFormData(formData);
  if (!parsed.ok) {
    return redirectWithError(parsed.error);
  }

  const created = await createAdminAdPlan(parsed.value);
  if (!created.ok) {
    return redirectWithError(created.error ?? "Impossible d'ajouter le plan publicitaire.");
  }

  revalidatePath("/admin/publicites");
  redirectWithSuccess("Plan publicitaire ajoute.");
};

const updatePlanAction = async (formData: FormData) => {
  "use server";

  if (!(await hasValidAdminSession())) {
    redirect("/admin/login");
  }

  const planIdRaw = formData.get("planId");
  const planId = typeof planIdRaw === "string" ? planIdRaw.trim() : "";
  if (!planId) {
    return redirectWithError("Plan introuvable.");
  }

  const parsed = parseAdminAdPlanInputFromFormData(formData);
  if (!parsed.ok) {
    return redirectWithError(parsed.error);
  }

  const updated = await updateAdminAdPlan(planId, parsed.value);
  if (!updated.ok) {
    return redirectWithError(updated.error ?? "Impossible de modifier le plan publicitaire.");
  }

  revalidatePath("/admin/publicites");
  redirectWithSuccess("Plan publicitaire mis a jour.");
};

const togglePlanActiveAction = async (formData: FormData) => {
  "use server";

  if (!(await hasValidAdminSession())) {
    redirect("/admin/login");
  }

  const planIdRaw = formData.get("planId");
  const nextActiveRaw = formData.get("nextActive");
  const planId = typeof planIdRaw === "string" ? planIdRaw.trim() : "";
  const nextActive = nextActiveRaw === "true";

  if (!planId) {
    return redirectWithError("Plan introuvable.");
  }

  const updated = await setAdminAdPlanActiveState(planId, nextActive);
  if (!updated.ok) {
    return redirectWithError(updated.error ?? "Impossible de changer le statut du plan.");
  }

  revalidatePath("/admin/publicites");
  redirectWithSuccess(nextActive ? "Plan active." : "Plan desactive.");
};

const deletePlanAction = async (formData: FormData) => {
  "use server";

  if (!(await hasValidAdminSession())) {
    redirect("/admin/login");
  }

  const planIdRaw = formData.get("planId");
  const planId = typeof planIdRaw === "string" ? planIdRaw.trim() : "";
  if (!planId) {
    return redirectWithError("Plan introuvable.");
  }

  const deleted = await deleteAdminAdPlan(planId);
  if (!deleted.ok) {
    return redirectWithError(deleted.error ?? "Suppression du plan impossible.");
  }

  revalidatePath("/admin/publicites");
  redirectWithSuccess("Plan publicitaire supprime.");
};

export default async function AdminPublicitesPage({ searchParams }: AdminAdsPageProps) {
  if (!isAdminAuthConfigured()) {
    return (
      <section className="bg-brand-light py-12">
        <div className="mx-auto max-w-3xl rounded-2xl bg-white p-6 shadow-card">
          <h1 className="text-2xl font-extrabold text-brand-blue">Admin publicites</h1>
          <p className="mt-3 text-sm text-slate-700">
            Configurez la variable
            <span className="font-semibold"> ADMIN_ACCESS_PASSWORD </span>
            dans
            <span className="font-semibold"> .env.local</span>, puis redemarrez le serveur.
          </p>
        </div>
      </section>
    );
  }

  if (!(await hasValidAdminSession())) {
    redirect("/admin/login");
  }

  const [ads, plans, analytics] = await Promise.all([
    getAdminAds(),
    getAdminAdPlans(),
    getAdminAdAnalyticsDashboard(),
  ]);

  const analyticsByAdId = new Map(analytics.rows.map((row) => [row.adId, row]));
  const successMessage = decodeURIComponent(toSingleValue(searchParams.success) || "");
  const errorMessage = decodeURIComponent(toSingleValue(searchParams.error) || "");

  return (
    <section className="bg-brand-light py-12">
      <div className="mx-auto max-w-7xl px-4 sm:px-5 lg:px-6">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-3xl font-extrabold text-brand-blue">Admin publicites</h1>
            <p className="mt-1 text-sm text-slate-600">
              Gestion des publicites payantes, plans tarifaires, performances et revenu estime.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Link href="/admin/orders" className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700">Voir commandes</Link>
            <Link href="/admin/products" className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700">Voir produits</Link>
            <Link href="/admin/offres" className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700">Voir offres</Link>
            <Link href="/admin/blog" className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700">Voir blog</Link>
            <Link href="/admin/reviews" className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700">Voir avis</Link>
            <form action={logoutAdminAction}>
              <button type="submit" className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700">Deconnexion</button>
            </form>
          </div>
        </div>

        {successMessage ? <p className="mb-4 rounded-xl bg-emerald-50 p-3 text-sm font-medium text-emerald-700">{successMessage}</p> : null}
        {errorMessage ? <p className="mb-4 rounded-xl bg-rose-50 p-3 text-sm font-medium text-rose-700">{errorMessage}</p> : null}

        <section className="mb-6 rounded-2xl bg-white p-5 shadow-card">
          <h2 className="text-lg font-bold text-brand-blue">Synthese monetisation</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4"><p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Publicites actives</p><p className="mt-1 text-2xl font-extrabold text-brand-blue">{analytics.summary.totalActiveAds}</p></div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4"><p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Publicites programmees</p><p className="mt-1 text-2xl font-extrabold text-brand-blue">{analytics.summary.totalScheduledAds}</p></div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4"><p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Revenu estime</p><p className="mt-1 text-2xl font-extrabold text-brand-blue">{formatMad(analytics.summary.totalEstimatedRevenue)}</p></div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4"><p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Total vues</p><p className="mt-1 text-2xl font-extrabold text-brand-blue">{analytics.summary.totalViews}</p></div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4"><p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Total clics</p><p className="mt-1 text-2xl font-extrabold text-brand-blue">{analytics.summary.totalClicks}</p></div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4"><p className="text-xs font-semibold uppercase tracking-wide text-slate-500">CTR moyen</p><p className="mt-1 text-2xl font-extrabold text-brand-blue">{formatCtr(analytics.summary.averageCtr)}</p></div>
          </div>
        </section>

        <section className="mb-6 rounded-2xl bg-white p-5 shadow-card">
          <h2 className="text-lg font-bold text-brand-blue">Performance par publicite</h2>
          {analytics.rows.length === 0 ? (
            <p className="mt-3 text-sm text-slate-600">Aucune publicite analysee pour le moment.</p>
          ) : (
            <div className="mt-4 overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
                <thead>
                  <tr className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    <th className="px-3 py-2">Titre</th><th className="px-3 py-2">Position</th><th className="px-3 py-2">Plan</th><th className="px-3 py-2">Prix</th><th className="px-3 py-2">Vues</th><th className="px-3 py-2">Clics</th><th className="px-3 py-2">CTR</th><th className="px-3 py-2">Revenu</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {analytics.rows.map((row) => (
                    <tr key={row.adId}>
                      <td className="px-3 py-3"><p className="font-semibold text-slate-800">{row.title}</p><p className="text-xs text-slate-500">{row.adId}</p></td>
                      <td className="px-3 py-3">{row.position === "top" ? "Top" : "Middle"}</td>
                      <td className="px-3 py-3">{row.plan?.name ?? "Aucun"}</td>
                      <td className="px-3 py-3">{row.plan ? formatMad(row.plan.price) : "-"}</td>
                      <td className="px-3 py-3">{row.views}</td>
                      <td className="px-3 py-3">{row.clicks}</td>
                      <td className="px-3 py-3">{formatCtr(row.ctr)}</td>
                      <td className="px-3 py-3">{formatMad(row.estimatedRevenue)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <details className="mb-6 rounded-2xl bg-white p-5 shadow-card" open>
          <summary className="cursor-pointer list-none text-lg font-bold text-brand-blue">Plans publicitaires</summary>
          <form action={createPlanAction} className="mt-4 grid gap-3 md:grid-cols-2">
            <input type="text" name="name" required placeholder="Top Banner - 7 jours" className="rounded-xl border border-slate-300 px-3 py-2 text-sm" />
            <select name="position" required defaultValue="top" className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm"><option value="top">Top</option><option value="middle">Middle</option></select>
            <textarea name="description" rows={2} placeholder="Description" className="md:col-span-2 rounded-xl border border-slate-300 px-3 py-2 text-sm" />
            <input type="number" name="durationDays" min="1" step="1" required placeholder="Duree (jours)" className="rounded-xl border border-slate-300 px-3 py-2 text-sm" />
            <input type="number" name="price" min="0" step="1" required placeholder="Prix MAD" className="rounded-xl border border-slate-300 px-3 py-2 text-sm" />
            <label className="inline-flex items-center gap-2 md:col-span-2"><input type="checkbox" name="isActive" defaultChecked /><span className="text-sm text-slate-700">Plan actif</span></label>
            <div className="md:col-span-2"><button type="submit" className="rounded-xl bg-brand-blue px-4 py-2 text-sm font-semibold text-white">Ajouter plan</button></div>
          </form>

          {plans.length === 0 ? <p className="mt-4 text-sm text-slate-600">Aucun plan configure.</p> : (
            <div className="mt-6 space-y-3">
              {plans.map((plan) => (
                <details key={plan.id} className="rounded-xl border border-slate-200 p-4">
                  <summary className="cursor-pointer list-none text-sm font-semibold text-brand-blue">{plan.name} - {formatMad(plan.price)} ({plan.duration_days} jours)</summary>
                  <form action={updatePlanAction} className="mt-3 grid gap-3 md:grid-cols-2">
                    <input type="hidden" name="planId" value={plan.id} />
                    <input type="text" name="name" required defaultValue={plan.name} className="rounded-xl border border-slate-300 px-3 py-2 text-sm" />
                    <select name="position" required defaultValue={plan.position} className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm"><option value="top">Top</option><option value="middle">Middle</option></select>
                    <textarea name="description" rows={2} defaultValue={plan.description ?? ""} className="md:col-span-2 rounded-xl border border-slate-300 px-3 py-2 text-sm" />
                    <input type="number" name="durationDays" min="1" step="1" required defaultValue={plan.duration_days} className="rounded-xl border border-slate-300 px-3 py-2 text-sm" />
                    <input type="number" name="price" min="0" step="1" required defaultValue={plan.price} className="rounded-xl border border-slate-300 px-3 py-2 text-sm" />
                    <label className="inline-flex items-center gap-2 md:col-span-2"><input type="checkbox" name="isActive" defaultChecked={plan.is_active} /><span className="text-sm text-slate-700">Plan actif</span></label>
                    <div className="md:col-span-2"><button type="submit" className="rounded-xl bg-brand-blue px-4 py-2 text-sm font-semibold text-white">Enregistrer plan</button></div>
                  </form>
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <form action={togglePlanActiveAction}><input type="hidden" name="planId" value={plan.id} /><input type="hidden" name="nextActive" value={plan.is_active ? "false" : "true"} /><button type="submit" className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700">{plan.is_active ? "Desactiver" : "Activer"}</button></form>
                    <form action={deletePlanAction}><input type="hidden" name="planId" value={plan.id} /><button type="submit" className="rounded-xl border border-rose-300 px-4 py-2 text-sm font-semibold text-rose-700">Supprimer</button></form>
                  </div>
                </details>
              ))}
            </div>
          )}
        </details>

        <details className="mb-6 rounded-2xl bg-white p-5 shadow-card" open>
          <summary className="cursor-pointer list-none text-lg font-bold text-brand-blue">Ajouter une publicite</summary>
          <form action={createAdAction} className="mt-4 grid gap-3 md:grid-cols-2">
            <input type="text" name="imageUrl" required placeholder="URL image" className="md:col-span-2 rounded-xl border border-slate-300 px-3 py-2 text-sm" />
            <input type="text" name="title" placeholder="Titre (optionnel)" className="rounded-xl border border-slate-300 px-3 py-2 text-sm" />
            <select name="position" required defaultValue="top" className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm"><option value="top">Top</option><option value="middle">Middle</option></select>
            <textarea name="description" rows={3} placeholder="Description" className="md:col-span-2 rounded-xl border border-slate-300 px-3 py-2 text-sm" />
            <input type="url" name="link" required placeholder="Lien cible" className="md:col-span-2 rounded-xl border border-slate-300 px-3 py-2 text-sm" />
            <select name="planId" defaultValue="" className="md:col-span-2 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm"><option value="">Aucun plan</option>{plans.map((plan) => <option key={plan.id} value={plan.id}>{plan.name} - {plan.position} - {formatMad(plan.price)}</option>)}</select>
            <input type="datetime-local" name="startDate" className="rounded-xl border border-slate-300 px-3 py-2 text-sm" />
            <input type="datetime-local" name="endDate" className="rounded-xl border border-slate-300 px-3 py-2 text-sm" />
            <label className="inline-flex items-center gap-2 md:col-span-2"><input type="checkbox" name="isActive" /><span className="text-sm text-slate-700">Publicite active</span></label>
            <div className="md:col-span-2"><button type="submit" className="rounded-xl bg-brand-blue px-4 py-2 text-sm font-semibold text-white">Ajouter publicite</button></div>
          </form>
        </details>
        {ads.length === 0 ? (
          <div className="rounded-2xl bg-white p-6 shadow-card">
            <p className="text-sm text-slate-600">Aucune publicite en base pour le moment.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {ads.map((ad) => {
              const adAnalytics = analyticsByAdId.get(ad.id);

              return (
                <details key={ad.id} className="rounded-2xl bg-white p-5 shadow-card">
                  <summary className="cursor-pointer list-none">
                    <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-5">
                      <div><p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Titre</p><p className="text-sm font-bold text-brand-blue">{ad.title?.trim() || "Sans titre"}</p></div>
                      <div><p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Position</p><span className="inline-flex rounded-full bg-orange-100 px-2.5 py-1 text-xs font-semibold text-orange-700">{ad.position === "top" ? "Top" : "Middle"}</span></div>
                      <div><p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Plan</p><p className="text-xs text-slate-700">{ad.ad_plan?.name ?? "Aucun"}</p><p className="text-xs font-semibold text-slate-800">{ad.ad_plan ? formatMad(ad.ad_plan.price) : "-"}</p></div>
                      <div><p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Periode</p><p className="text-xs text-slate-700">Debut: {formatDateTime(ad.start_date)}</p><p className="text-xs text-slate-700">Fin: {formatDateTime(ad.end_date)}</p></div>
                      <div><p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Stats</p><p className="text-xs text-slate-700">Vues: {adAnalytics?.views ?? 0}</p><p className="text-xs text-slate-700">Clics: {adAnalytics?.clicks ?? 0}</p><p className="text-xs font-semibold text-slate-800">CTR: {formatCtr(adAnalytics?.ctr ?? 0)}</p></div>
                    </div>
                  </summary>

                  <form action={updateAdAction} className="mt-4 grid gap-3 border-t border-slate-200 pt-4 md:grid-cols-2">
                    <input type="hidden" name="adId" value={ad.id} />
                    <input type="text" name="imageUrl" required defaultValue={ad.image_url} className="md:col-span-2 rounded-xl border border-slate-300 px-3 py-2 text-sm" />
                    <input type="text" name="title" defaultValue={ad.title ?? ""} className="rounded-xl border border-slate-300 px-3 py-2 text-sm" />
                    <select name="position" required defaultValue={ad.position} className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm"><option value="top">Top</option><option value="middle">Middle</option></select>
                    <textarea name="description" rows={3} defaultValue={ad.description ?? ""} className="md:col-span-2 rounded-xl border border-slate-300 px-3 py-2 text-sm" />
                    <input type="url" name="link" required defaultValue={ad.link} className="md:col-span-2 rounded-xl border border-slate-300 px-3 py-2 text-sm" />
                    <select name="planId" defaultValue={ad.plan_id ?? ""} className="md:col-span-2 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm"><option value="">Aucun plan</option>{plans.map((plan) => <option key={plan.id} value={plan.id}>{plan.name} - {plan.position} - {formatMad(plan.price)}</option>)}</select>
                    <input type="datetime-local" name="startDate" defaultValue={toDateTimeLocalInputValue(ad.start_date)} className="rounded-xl border border-slate-300 px-3 py-2 text-sm" />
                    <input type="datetime-local" name="endDate" defaultValue={toDateTimeLocalInputValue(ad.end_date)} className="rounded-xl border border-slate-300 px-3 py-2 text-sm" />
                    <label className="inline-flex items-center gap-2 md:col-span-2"><input type="checkbox" name="isActive" defaultChecked={ad.is_active} /><span className="text-sm text-slate-700">Publicite active</span></label>
                    <div className="md:col-span-2"><button type="submit" className="rounded-xl bg-brand-blue px-4 py-2 text-sm font-semibold text-white">Enregistrer modifications</button></div>
                  </form>

                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <form action={toggleAdActiveAction}><input type="hidden" name="adId" value={ad.id} /><input type="hidden" name="nextActive" value={ad.is_active ? "false" : "true"} /><button type="submit" className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700">{ad.is_active ? "Desactiver" : "Activer"}</button></form>
                    <form action={deleteAdAction}><input type="hidden" name="adId" value={ad.id} /><button type="submit" className="rounded-xl border border-rose-300 px-4 py-2 text-sm font-semibold text-rose-700">Supprimer</button></form>
                  </div>
                </details>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}

