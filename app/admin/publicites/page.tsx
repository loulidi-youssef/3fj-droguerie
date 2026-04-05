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

const redirectWithSuccess = (message: string): never => {
  redirect(`/admin/publicites?success=${encodeURIComponent(message)}`);
};

const redirectWithError = (message: string): never => {
  redirect(`/admin/publicites?error=${encodeURIComponent(message)}`);
};

const logoutAdminAction = async () => {
  "use server";
  clearAdminSession();
  redirect("/admin/login");
};

const createAdAction = async (formData: FormData) => {
  "use server";

  if (!hasValidAdminSession()) {
    redirect("/admin/login");
  }

  const parsed = parseAdminAdInputFromFormData(formData);
  if (!parsed.ok) {
    return redirectWithError(parsed.error);
  }

  const created = await createAdminAd(parsed.value);
  if (!created.ok) {
    redirectWithError(created.error ?? "Impossible d'ajouter la publicite.");
  }

  revalidatePath("/");
  revalidatePath("/admin/publicites");
  redirectWithSuccess("Publicite ajoutee avec succes.");
};

const updateAdAction = async (formData: FormData) => {
  "use server";

  if (!hasValidAdminSession()) {
    redirect("/admin/login");
  }

  const adIdRaw = formData.get("adId");
  const adId = typeof adIdRaw === "string" ? adIdRaw.trim() : "";

  if (!adId) {
    redirectWithError("Publicite introuvable.");
  }

  const parsed = parseAdminAdInputFromFormData(formData);
  if (!parsed.ok) {
    return redirectWithError(parsed.error);
  }

  const updated = await updateAdminAd(adId, parsed.value);
  if (!updated.ok) {
    redirectWithError(updated.error ?? "Impossible de modifier la publicite.");
  }

  revalidatePath("/");
  revalidatePath("/admin/publicites");
  redirectWithSuccess("Publicite mise a jour.");
};

const toggleAdActiveAction = async (formData: FormData) => {
  "use server";

  if (!hasValidAdminSession()) {
    redirect("/admin/login");
  }

  const adIdRaw = formData.get("adId");
  const nextActiveRaw = formData.get("nextActive");

  const adId = typeof adIdRaw === "string" ? adIdRaw.trim() : "";
  const nextActive = nextActiveRaw === "true";

  if (!adId) {
    redirectWithError("Publicite introuvable.");
  }

  const updated = await setAdminAdActiveState(adId, nextActive);
  if (!updated.ok) {
    redirectWithError(updated.error ?? "Impossible de changer le statut de la publicite.");
  }

  revalidatePath("/");
  revalidatePath("/admin/publicites");
  redirectWithSuccess(nextActive ? "Publicite activee." : "Publicite desactivee.");
};

const deleteAdAction = async (formData: FormData) => {
  "use server";

  if (!hasValidAdminSession()) {
    redirect("/admin/login");
  }

  const adIdRaw = formData.get("adId");
  const adId = typeof adIdRaw === "string" ? adIdRaw.trim() : "";

  if (!adId) {
    redirectWithError("Publicite introuvable.");
  }

  const deleted = await deleteAdminAd(adId);
  if (!deleted.ok) {
    redirectWithError(deleted.error ?? "Suppression impossible.");
  }

  revalidatePath("/");
  revalidatePath("/admin/publicites");
  redirectWithSuccess("Publicite supprimee.");
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

  if (!hasValidAdminSession()) {
    redirect("/admin/login");
  }

  const ads = await getAdminAds();

  const successMessage = decodeURIComponent(toSingleValue(searchParams.success) || "");
  const errorMessage = decodeURIComponent(toSingleValue(searchParams.error) || "");

  return (
    <section className="bg-brand-light py-12">
      <div className="mx-auto max-w-7xl px-4 sm:px-5 lg:px-6">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-3xl font-extrabold text-brand-blue">Admin publicites</h1>
            <p className="mt-1 text-sm text-slate-600">
              Gere les bannières publicitaires payantes de la page d'accueil.
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
              href="/admin/offres"
              className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700"
            >
              Voir offres
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

        <details className="mb-6 rounded-2xl bg-white p-5 shadow-card" open>
          <summary className="cursor-pointer list-none text-lg font-bold text-brand-blue">
            Ajouter une publicite
          </summary>

          <form action={createAdAction} className="mt-4 grid gap-3 md:grid-cols-2">
            <label className="block md:col-span-2">
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-600">
                URL image
              </span>
              <input
                type="text"
                name="imageUrl"
                required
                placeholder="https://.../banner.jpg"
                className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
              />
            </label>

            <label className="block">
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-600">
                Titre (optionnel)
              </span>
              <input
                type="text"
                name="title"
                className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
              />
            </label>

            <label className="block">
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-600">
                Position
              </span>
              <select
                name="position"
                required
                defaultValue="top"
                className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm"
              >
                <option value="top">Top banner</option>
                <option value="middle">Middle banner</option>
              </select>
            </label>

            <label className="block md:col-span-2">
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-600">
                Description (optionnel)
              </span>
              <textarea
                name="description"
                rows={3}
                className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
              />
            </label>

            <label className="block md:col-span-2">
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-600">
                Lien cible
              </span>
              <input
                type="url"
                name="link"
                required
                placeholder="https://exemple.com"
                className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
              />
            </label>

            <label className="block">
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-600">
                Date debut (optionnel)
              </span>
              <input
                type="datetime-local"
                name="startDate"
                className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
              />
            </label>

            <label className="block">
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-600">
                Date fin (optionnel)
              </span>
              <input
                type="datetime-local"
                name="endDate"
                className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
              />
            </label>

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

        {ads.length === 0 ? (
          <div className="rounded-2xl bg-white p-6 shadow-card">
            <p className="text-sm text-slate-600">Aucune publicite en base pour le moment.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {ads.map((ad) => {
              const title = ad.title?.trim() || "Sans titre";

              return (
                <details key={ad.id} className="rounded-2xl bg-white p-5 shadow-card">
                  <summary className="cursor-pointer list-none">
                    <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Titre</p>
                        <p className="text-sm font-bold text-brand-blue">{title}</p>
                      </div>

                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Position</p>
                        <span className="inline-flex rounded-full bg-orange-100 px-2.5 py-1 text-xs font-semibold text-orange-700">
                          {ad.position === "top" ? "Top banner" : "Middle banner"}
                        </span>
                      </div>

                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Statut</p>
                        <span
                          className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
                            ad.is_active ? "bg-emerald-100 text-emerald-700" : "bg-slate-200 text-slate-700"
                          }`}
                        >
                          {ad.is_active ? "Active" : "Inactive"}
                        </span>
                      </div>

                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Periode</p>
                        <p className="text-xs text-slate-700">Debut: {formatDateTime(ad.start_date)}</p>
                        <p className="text-xs text-slate-700">Fin: {formatDateTime(ad.end_date)}</p>
                      </div>
                    </div>
                  </summary>

                  <div className="mt-4 border-t border-slate-200 pt-4">
                    <p className="text-xs text-slate-500">ID: {ad.id}</p>

                    <form action={updateAdAction} className="mt-3 grid gap-3 md:grid-cols-2">
                      <input type="hidden" name="adId" value={ad.id} />

                      <label className="block md:col-span-2">
                        <span className="text-xs font-semibold uppercase tracking-wide text-slate-600">
                          URL image
                        </span>
                        <input
                          type="text"
                          name="imageUrl"
                          required
                          defaultValue={ad.image_url}
                          className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                        />
                      </label>

                      <label className="block">
                        <span className="text-xs font-semibold uppercase tracking-wide text-slate-600">
                          Titre (optionnel)
                        </span>
                        <input
                          type="text"
                          name="title"
                          defaultValue={ad.title ?? ""}
                          className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                        />
                      </label>

                      <label className="block">
                        <span className="text-xs font-semibold uppercase tracking-wide text-slate-600">
                          Position
                        </span>
                        <select
                          name="position"
                          required
                          defaultValue={ad.position}
                          className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm"
                        >
                          <option value="top">Top banner</option>
                          <option value="middle">Middle banner</option>
                        </select>
                      </label>

                      <label className="block md:col-span-2">
                        <span className="text-xs font-semibold uppercase tracking-wide text-slate-600">
                          Description (optionnel)
                        </span>
                        <textarea
                          name="description"
                          rows={3}
                          defaultValue={ad.description ?? ""}
                          className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                        />
                      </label>

                      <label className="block md:col-span-2">
                        <span className="text-xs font-semibold uppercase tracking-wide text-slate-600">
                          Lien cible
                        </span>
                        <input
                          type="url"
                          name="link"
                          required
                          defaultValue={ad.link}
                          className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                        />
                      </label>

                      <label className="block">
                        <span className="text-xs font-semibold uppercase tracking-wide text-slate-600">
                          Date debut (optionnel)
                        </span>
                        <input
                          type="datetime-local"
                          name="startDate"
                          defaultValue={toDateTimeLocalInputValue(ad.start_date)}
                          className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                        />
                      </label>

                      <label className="block">
                        <span className="text-xs font-semibold uppercase tracking-wide text-slate-600">
                          Date fin (optionnel)
                        </span>
                        <input
                          type="datetime-local"
                          name="endDate"
                          defaultValue={toDateTimeLocalInputValue(ad.end_date)}
                          className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                        />
                      </label>

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
                        <input
                          type="hidden"
                          name="nextActive"
                          value={ad.is_active ? "false" : "true"}
                        />
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

