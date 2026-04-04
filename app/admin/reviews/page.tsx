import Link from "next/link";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  clearAdminSession,
  hasValidAdminSession,
  isAdminAuthConfigured,
} from "@/lib/admin-auth";
import {
  createAdminReview,
  deleteAdminReview,
  getAdminReviews,
  setAdminReviewActiveState,
  updateAdminReview,
} from "@/lib/admin-reviews";

type AdminReviewsPageProps = {
  searchParams: {
    success?: string | string[];
    error?: string | string[];
  };
};

type ReviewFormValue = {
  customerName: string;
  rating: number;
  testimonialText: string;
  role: string | null;
  avatarImagePath: string | null;
  isActive: boolean;
};

type ParsedReviewForm =
  | {
      ok: true;
      value: ReviewFormValue;
    }
  | {
      ok: false;
      error: string;
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

const toNumber = (rawValue: FormDataEntryValue | null): number => {
  if (typeof rawValue !== "string") {
    return Number.NaN;
  }
  return Number(rawValue.trim());
};

const toNullableString = (value: FormDataEntryValue | null): string | null => {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed ? trimmed : null;
};

const parseReviewForm = (formData: FormData): ParsedReviewForm => {
  const customerNameRaw = formData.get("customerName");
  const testimonialTextRaw = formData.get("testimonialText");

  const customerName =
    typeof customerNameRaw === "string" ? customerNameRaw.trim() : "";
  const testimonialText =
    typeof testimonialTextRaw === "string" ? testimonialTextRaw.trim() : "";
  const rating = toNumber(formData.get("rating"));
  const role = toNullableString(formData.get("role"));
  const avatarImagePath = toNullableString(formData.get("avatarImagePath"));
  const isActive = formData.get("isActive") === "on";

  if (!customerName) {
    return { ok: false, error: "Le nom client est obligatoire." };
  }

  if (!Number.isFinite(rating) || rating < 1 || rating > 5) {
    return { ok: false, error: "La note doit etre un nombre entre 1 et 5." };
  }

  if (!testimonialText) {
    return { ok: false, error: "Le temoignage est obligatoire." };
  }

  return {
    ok: true,
    value: {
      customerName,
      rating: Math.round(rating),
      testimonialText,
      role,
      avatarImagePath,
      isActive,
    },
  };
};

const redirectWithSuccess = (message: string): never => {
  redirect(`/admin/reviews?success=${encodeURIComponent(message)}`);
};

const redirectWithError = (message: string): never => {
  redirect(`/admin/reviews?error=${encodeURIComponent(message)}`);
};

const getValidatedReviewInput = (formData: FormData): ReviewFormValue => {
  const parsed = parseReviewForm(formData);
  if (parsed.ok) {
    return parsed.value;
  }

  return redirectWithError(parsed.error);
};

const logoutAdminAction = async () => {
  "use server";
  clearAdminSession();
  redirect("/admin/login");
};

const createReviewAction = async (formData: FormData) => {
  "use server";

  if (!hasValidAdminSession()) {
    redirect("/admin/login");
  }

  const validInput = getValidatedReviewInput(formData);
  const created = await createAdminReview(validInput);
  if (!created.ok) {
    redirectWithError(created.error ?? "Impossible d'ajouter l'avis.");
  }

  revalidatePath("/admin/reviews");
  revalidatePath("/");
  redirectWithSuccess("Avis ajoute avec succes.");
};

const updateReviewAction = async (formData: FormData) => {
  "use server";

  if (!hasValidAdminSession()) {
    redirect("/admin/login");
  }

  const reviewIdRaw = formData.get("reviewId");
  const reviewId = typeof reviewIdRaw === "string" ? reviewIdRaw.trim() : "";
  if (!reviewId) {
    redirectWithError("Avis introuvable.");
  }

  const validInput = getValidatedReviewInput(formData);
  const updated = await updateAdminReview(reviewId, validInput);
  if (!updated.ok) {
    redirectWithError(updated.error ?? "Impossible de modifier l'avis.");
  }

  revalidatePath("/admin/reviews");
  revalidatePath("/");
  redirectWithSuccess("Avis modifie avec succes.");
};

const toggleReviewActiveAction = async (formData: FormData) => {
  "use server";

  if (!hasValidAdminSession()) {
    redirect("/admin/login");
  }

  const reviewIdRaw = formData.get("reviewId");
  const nextActiveRaw = formData.get("nextActive");

  const reviewId = typeof reviewIdRaw === "string" ? reviewIdRaw.trim() : "";
  const nextActive = nextActiveRaw === "true";

  if (!reviewId) {
    redirectWithError("Avis introuvable.");
  }

  const updated = await setAdminReviewActiveState(reviewId, nextActive);
  if (!updated.ok) {
    redirectWithError(updated.error ?? "Impossible de changer le statut de l'avis.");
  }

  revalidatePath("/admin/reviews");
  revalidatePath("/");
  redirectWithSuccess(nextActive ? "Avis active." : "Avis desactive.");
};

const deleteReviewAction = async (formData: FormData) => {
  "use server";

  if (!hasValidAdminSession()) {
    redirect("/admin/login");
  }

  const reviewIdRaw = formData.get("reviewId");
  const reviewId = typeof reviewIdRaw === "string" ? reviewIdRaw.trim() : "";
  if (!reviewId) {
    redirectWithError("Avis introuvable.");
  }

  const deleted = await deleteAdminReview(reviewId);
  if (!deleted.ok) {
    redirectWithError(deleted.error ?? "Suppression impossible.");
  }

  revalidatePath("/admin/reviews");
  revalidatePath("/");
  redirectWithSuccess("Avis supprime.");
};

export default async function AdminReviewsPage({ searchParams }: AdminReviewsPageProps) {
  if (!isAdminAuthConfigured()) {
    return (
      <section className="bg-brand-light py-12">
        <div className="mx-auto max-w-3xl rounded-2xl bg-white p-6 shadow-card">
          <h1 className="text-2xl font-extrabold text-brand-blue">Admin avis</h1>
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

  const reviews = await getAdminReviews();
  const successMessage = decodeURIComponent(toSingleValue(searchParams.success) || "");
  const errorMessage = decodeURIComponent(toSingleValue(searchParams.error) || "");

  return (
    <section className="bg-brand-light py-12">
      <div className="mx-auto max-w-7xl px-4 sm:px-5 lg:px-6">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-3xl font-extrabold text-brand-blue">Admin avis</h1>
            <p className="mt-1 text-sm text-slate-600">
              Ajoutez, modifiez, activez/desactivez et supprimez les avis clients.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/admin/orders"
              className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700"
            >
              Commandes
            </Link>
            <Link
              href="/admin/products"
              className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700"
            >
              Produits
            </Link>
            <Link
              href="/admin/customers"
              className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700"
            >
              Clients
            </Link>
            <Link
              href="/admin/offres"
              className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700"
            >
              Offres
            </Link>
            <Link
              href="/admin/blog"
              className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700"
            >
              Blog
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
            Ajouter un avis
          </summary>

          <form action={createReviewAction} className="mt-4 grid gap-3 md:grid-cols-2">
            <label className="block">
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-600">
                Nom client
              </span>
              <input
                type="text"
                name="customerName"
                required
                className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
              />
            </label>
            <label className="block">
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-600">
                Note (1 a 5)
              </span>
              <input
                type="number"
                name="rating"
                min="1"
                max="5"
                step="1"
                required
                defaultValue={5}
                className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
              />
            </label>
            <label className="block md:col-span-2">
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-600">
                Temoignage
              </span>
              <textarea
                name="testimonialText"
                rows={3}
                required
                className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
              />
            </label>
            <label className="block">
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-600">
                Role (optionnel)
              </span>
              <input
                type="text"
                name="role"
                placeholder="Ex: Entrepreneur a Fes"
                className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
              />
            </label>
            <label className="block">
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-600">
                Avatar/image (optionnel)
              </span>
              <input
                type="text"
                name="avatarImagePath"
                placeholder="/images/avatars/client-1.jpg"
                className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
              />
            </label>
            <label className="inline-flex items-center gap-2 md:col-span-2">
              <input type="checkbox" name="isActive" defaultChecked />
              <span className="text-sm text-slate-700">Avis actif</span>
            </label>
            <div className="md:col-span-2">
              <button
                type="submit"
                className="rounded-xl bg-brand-blue px-4 py-2 text-sm font-semibold text-white"
              >
                Ajouter avis
              </button>
            </div>
          </form>
        </details>

        {reviews.length === 0 ? (
          <div className="rounded-2xl bg-white p-6 shadow-card">
            <p className="text-sm text-slate-600">Aucun avis dans Supabase.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {reviews.map((review) => (
              <details key={review.id} className="rounded-2xl bg-white p-5 shadow-card">
                <summary className="cursor-pointer list-none">
                  <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Client
                      </p>
                      <p className="text-sm font-bold text-brand-blue">{review.customer_name}</p>
                      {review.role ? (
                        <p className="text-xs text-slate-600">{review.role}</p>
                      ) : null}
                    </div>
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Note
                      </p>
                      <p className="text-sm font-semibold text-slate-700">{review.rating} / 5</p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Statut
                      </p>
                      <span
                        className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
                          review.is_active
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-slate-200 text-slate-700"
                        }`}
                      >
                        {review.is_active ? "Actif" : "Inactif"}
                      </span>
                    </div>
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Temoignage
                      </p>
                      <p className="line-clamp-2 text-xs text-slate-700">{review.testimonial_text}</p>
                    </div>
                  </div>
                </summary>

                <div className="mt-4 border-t border-slate-200 pt-4">
                  <p className="text-xs text-slate-500">ID: {review.id}</p>

                  <form action={updateReviewAction} className="mt-3 grid gap-3 md:grid-cols-2">
                    <input type="hidden" name="reviewId" value={review.id} />

                    <label className="block">
                      <span className="text-xs font-semibold uppercase tracking-wide text-slate-600">
                        Nom client
                      </span>
                      <input
                        type="text"
                        name="customerName"
                        required
                        defaultValue={review.customer_name}
                        className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                      />
                    </label>
                    <label className="block">
                      <span className="text-xs font-semibold uppercase tracking-wide text-slate-600">
                        Note (1 a 5)
                      </span>
                      <input
                        type="number"
                        name="rating"
                        min="1"
                        max="5"
                        step="1"
                        required
                        defaultValue={review.rating}
                        className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                      />
                    </label>
                    <label className="block md:col-span-2">
                      <span className="text-xs font-semibold uppercase tracking-wide text-slate-600">
                        Temoignage
                      </span>
                      <textarea
                        name="testimonialText"
                        rows={3}
                        required
                        defaultValue={review.testimonial_text}
                        className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                      />
                    </label>
                    <label className="block">
                      <span className="text-xs font-semibold uppercase tracking-wide text-slate-600">
                        Role (optionnel)
                      </span>
                      <input
                        type="text"
                        name="role"
                        defaultValue={review.role ?? ""}
                        className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                      />
                    </label>
                    <label className="block">
                      <span className="text-xs font-semibold uppercase tracking-wide text-slate-600">
                        Avatar/image (optionnel)
                      </span>
                      <input
                        type="text"
                        name="avatarImagePath"
                        defaultValue={review.avatar_image_path ?? ""}
                        className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                      />
                    </label>
                    <label className="inline-flex items-center gap-2 md:col-span-2">
                      <input type="checkbox" name="isActive" defaultChecked={review.is_active} />
                      <span className="text-sm text-slate-700">Avis actif</span>
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
                    <form action={toggleReviewActiveAction}>
                      <input type="hidden" name="reviewId" value={review.id} />
                      <input
                        type="hidden"
                        name="nextActive"
                        value={review.is_active ? "false" : "true"}
                      />
                      <button
                        type="submit"
                        className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700"
                      >
                        {review.is_active ? "Desactiver" : "Activer"}
                      </button>
                    </form>

                    <form action={deleteReviewAction}>
                      <input type="hidden" name="reviewId" value={review.id} />
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
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
