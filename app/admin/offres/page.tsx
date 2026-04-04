import Link from "next/link";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { formatDh } from "@/lib/currency";
import {
  clearAdminSession,
  hasValidAdminSession,
  isAdminAuthConfigured,
} from "@/lib/admin-auth";
import { getAdminProducts } from "@/lib/admin-products";
import {
  createAdminOffer,
  deleteAdminOffer,
  getAdminOffers,
  setAdminOfferActiveState,
  updateAdminOffer,
} from "@/lib/admin-offers";

type AdminOffersPageProps = {
  searchParams: {
    success?: string | string[];
    error?: string | string[];
  };
};

type OfferFormValue = {
  title: string;
  shortDescription: string;
  discountLabel: string;
  productId: string;
  discountedPrice: number;
  startAt: string | null;
  endAt: string | null;
  imagePath: string | null;
  bannerText: string | null;
  isActive: boolean;
  isFeatured: boolean;
};

type ParsedOfferForm =
  | {
      ok: true;
      value: OfferFormValue;
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

const parseDateTimeInput = (value: string | null): string | null => {
  if (!value) {
    return null;
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return parsed.toISOString();
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

const parseOfferForm = (formData: FormData): ParsedOfferForm => {
  const titleRaw = formData.get("title");
  const shortDescriptionRaw = formData.get("shortDescription");
  const discountLabelRaw = formData.get("discountLabel");
  const productIdRaw = formData.get("productId");

  const title = typeof titleRaw === "string" ? titleRaw.trim() : "";
  const shortDescription =
    typeof shortDescriptionRaw === "string" ? shortDescriptionRaw.trim() : "";
  const discountLabel =
    typeof discountLabelRaw === "string" ? discountLabelRaw.trim() : "";
  const productId = typeof productIdRaw === "string" ? productIdRaw.trim() : "";
  const discountedPrice = toNumber(formData.get("discountedPrice"));

  const startInput = toNullableString(formData.get("startAt"));
  const endInput = toNullableString(formData.get("endAt"));

  const startAt = parseDateTimeInput(startInput);
  const endAt = parseDateTimeInput(endInput);

  const imagePath = toNullableString(formData.get("imagePath"));
  const bannerText = toNullableString(formData.get("bannerText"));
  const isActive = formData.get("isActive") === "on";
  const isFeatured = formData.get("isFeatured") === "on";

  if (!title) {
    return { ok: false, error: "Le titre de l'offre est obligatoire." };
  }

  if (!shortDescription) {
    return { ok: false, error: "La description courte est obligatoire." };
  }

  if (!discountLabel) {
    return { ok: false, error: "Le label de remise est obligatoire (ex: -20%)." };
  }

  if (!productId) {
    return { ok: false, error: "Selectionnez un produit pour cette offre." };
  }

  if (!Number.isFinite(discountedPrice) || discountedPrice <= 0) {
    return { ok: false, error: "Le prix promotionnel doit etre superieur a 0." };
  }

  if (startInput && !startAt) {
    return { ok: false, error: "Date de debut invalide." };
  }

  if (endInput && !endAt) {
    return { ok: false, error: "Date de fin invalide." };
  }

  if (startAt && endAt && new Date(endAt).getTime() <= new Date(startAt).getTime()) {
    return { ok: false, error: "La date de fin doit etre apres la date de debut." };
  }

  return {
    ok: true,
    value: {
      title,
      shortDescription,
      discountLabel,
      productId,
      discountedPrice: Math.round(discountedPrice),
      startAt,
      endAt,
      imagePath,
      bannerText,
      isActive,
      isFeatured,
    },
  };
};

const redirectWithSuccess = (message: string): never => {
  redirect(`/admin/offres?success=${encodeURIComponent(message)}`);
};

const redirectWithError = (message: string): never => {
  redirect(`/admin/offres?error=${encodeURIComponent(message)}`);
};

const getValidatedOfferInput = (formData: FormData): OfferFormValue => {
  const parsed = parseOfferForm(formData);
  if (parsed.ok) {
    return parsed.value;
  }

  return redirectWithError(parsed.error);
};

const validateOfferProductPricing = async (
  input: OfferFormValue,
): Promise<string | null> => {
  const products = await getAdminProducts();
  const linkedProduct = products.find((product) => product.id === input.productId);

  if (!linkedProduct) {
    return "Le produit selectionne n'existe pas ou n'est plus disponible.";
  }

  if (input.discountedPrice >= linkedProduct.price) {
    return "Le prix promotionnel doit etre inferieur au prix normal du produit.";
  }

  return null;
};

const logoutAdminAction = async () => {
  "use server";
  clearAdminSession();
  redirect("/admin/login");
};

const createOfferAction = async (formData: FormData) => {
  "use server";

  if (!hasValidAdminSession()) {
    redirect("/admin/login");
  }

  const validInput = getValidatedOfferInput(formData);
  const pricingError = await validateOfferProductPricing(validInput);
  if (pricingError) {
    redirectWithError(pricingError);
  }

  const created = await createAdminOffer(validInput);
  if (!created.ok) {
    redirectWithError(created.error ?? "Impossible d'ajouter l'offre.");
  }

  revalidatePath("/admin/offres");
  revalidatePath("/offres");
  revalidatePath("/");
  redirectWithSuccess("Offre ajoutee avec succes.");
};

const updateOfferAction = async (formData: FormData) => {
  "use server";

  if (!hasValidAdminSession()) {
    redirect("/admin/login");
  }

  const offerIdRaw = formData.get("offerId");
  const offerId = typeof offerIdRaw === "string" ? offerIdRaw.trim() : "";

  if (!offerId) {
    redirectWithError("Offre introuvable.");
  }

  const validInput = getValidatedOfferInput(formData);
  const pricingError = await validateOfferProductPricing(validInput);
  if (pricingError) {
    redirectWithError(pricingError);
  }

  const updated = await updateAdminOffer(offerId, validInput);
  if (!updated.ok) {
    redirectWithError(updated.error ?? "Impossible de modifier l'offre.");
  }

  revalidatePath("/admin/offres");
  revalidatePath("/offres");
  revalidatePath("/");
  redirectWithSuccess("Offre modifiee avec succes.");
};

const toggleOfferActiveAction = async (formData: FormData) => {
  "use server";

  if (!hasValidAdminSession()) {
    redirect("/admin/login");
  }

  const offerIdRaw = formData.get("offerId");
  const nextActiveRaw = formData.get("nextActive");

  const offerId = typeof offerIdRaw === "string" ? offerIdRaw.trim() : "";
  const nextActive = nextActiveRaw === "true";

  if (!offerId) {
    redirectWithError("Offre introuvable.");
  }

  const updated = await setAdminOfferActiveState(offerId, nextActive);
  if (!updated.ok) {
    redirectWithError(updated.error ?? "Impossible de changer le statut de l'offre.");
  }

  revalidatePath("/admin/offres");
  revalidatePath("/offres");
  revalidatePath("/");
  redirectWithSuccess(nextActive ? "Offre activee." : "Offre desactivee.");
};

const deleteOfferAction = async (formData: FormData) => {
  "use server";

  if (!hasValidAdminSession()) {
    redirect("/admin/login");
  }

  const offerIdRaw = formData.get("offerId");
  const offerId = typeof offerIdRaw === "string" ? offerIdRaw.trim() : "";

  if (!offerId) {
    redirectWithError("Offre introuvable.");
  }

  const deleted = await deleteAdminOffer(offerId);
  if (!deleted.ok) {
    redirectWithError(deleted.error ?? "Suppression impossible.");
  }

  revalidatePath("/admin/offres");
  revalidatePath("/offres");
  revalidatePath("/");
  redirectWithSuccess("Offre supprimee.");
};

export default async function AdminOffresPage({ searchParams }: AdminOffersPageProps) {
  if (!isAdminAuthConfigured()) {
    return (
      <section className="bg-brand-light py-12">
        <div className="mx-auto max-w-3xl rounded-2xl bg-white p-6 shadow-card">
          <h1 className="text-2xl font-extrabold text-brand-blue">Admin offres</h1>
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

  const [offers, products] = await Promise.all([getAdminOffers(), getAdminProducts()]);
  const productById = new Map(products.map((product) => [product.id, product]));

  const successMessage = decodeURIComponent(toSingleValue(searchParams.success) || "");
  const errorMessage = decodeURIComponent(toSingleValue(searchParams.error) || "");

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

        <details className="mb-6 rounded-2xl bg-white p-5 shadow-card" open>
          <summary className="cursor-pointer list-none text-lg font-bold text-brand-blue">
            Ajouter une offre
          </summary>

          <form action={createOfferAction} className="mt-4 grid gap-3 md:grid-cols-2">
            <label className="block">
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-600">Titre</span>
              <input
                type="text"
                name="title"
                required
                className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
              />
            </label>
            <label className="block">
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-600">
                Label remise
              </span>
              <input
                type="text"
                name="discountLabel"
                required
                placeholder="-20%"
                className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
              />
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
                Prix promotionnel (DH)
              </span>
              <input
                type="number"
                name="discountedPrice"
                min="1"
                step="1"
                required
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

        {offers.length === 0 ? (
          <div className="rounded-2xl bg-white p-6 shadow-card">
            <p className="text-sm text-slate-600">Aucune offre en base pour le moment.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {offers.map((offer) => (
              <details key={offer.id} className="rounded-2xl bg-white p-5 shadow-card">
                <summary className="cursor-pointer list-none">
                  <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-5">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Titre</p>
                      <p className="text-sm font-bold text-brand-blue">{offer.title}</p>
                      <p className="text-xs text-slate-600">{offer.discount_label}</p>
                      <p className="text-xs text-slate-600">
                        Produit: {productById.get(offer.product_id ?? "")?.name ?? "Non defini"}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Periode</p>
                      <p className="text-xs text-slate-700">Debut: {formatDateTime(offer.start_at)}</p>
                      <p className="text-xs text-slate-700">Fin: {formatDateTime(offer.end_at)}</p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Prix</p>
                      <p className="text-xs text-slate-700">
                        Avant:{" "}
                        {offer.product_id
                          ? formatDh(productById.get(offer.product_id)?.price ?? 0)
                          : "Non defini"}
                      </p>
                      <p className="text-xs font-semibold text-brand-blue">
                        Maintenant:{" "}
                        {typeof offer.discounted_price === "number"
                          ? formatDh(offer.discounted_price)
                          : "Non defini"}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Statut</p>
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
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Homepage</p>
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

                  <form action={updateOfferAction} className="mt-3 grid gap-3 md:grid-cols-2">
                    <input type="hidden" name="offerId" value={offer.id} />

                    <label className="block">
                      <span className="text-xs font-semibold uppercase tracking-wide text-slate-600">Titre</span>
                      <input
                        type="text"
                        name="title"
                        required
                        defaultValue={offer.title}
                        className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                      />
                    </label>

                    <label className="block">
                      <span className="text-xs font-semibold uppercase tracking-wide text-slate-600">
                        Label remise
                      </span>
                      <input
                        type="text"
                        name="discountLabel"
                        required
                        defaultValue={offer.discount_label}
                        className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                      />
                    </label>

                    <label className="block md:col-span-2">
                      <span className="text-xs font-semibold uppercase tracking-wide text-slate-600">
                        Description courte
                      </span>
                      <textarea
                        name="shortDescription"
                        rows={3}
                        required
                        defaultValue={offer.short_description}
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
                        defaultValue={offer.product_id ?? ""}
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
                        Prix promotionnel (DH)
                      </span>
                      <input
                        type="number"
                        name="discountedPrice"
                        min="1"
                        step="1"
                        required
                        defaultValue={offer.discounted_price ?? ""}
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
                        defaultValue={toDateTimeLocalInputValue(offer.start_at)}
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
                        defaultValue={toDateTimeLocalInputValue(offer.end_at)}
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
                        defaultValue={offer.image_path ?? ""}
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
                        defaultValue={offer.banner_text ?? ""}
                        className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                      />
                    </label>

                    <label className="inline-flex items-center gap-2">
                      <input type="checkbox" name="isActive" defaultChecked={offer.is_active} />
                      <span className="text-sm text-slate-700">Offre active</span>
                    </label>

                    <label className="inline-flex items-center gap-2">
                      <input type="checkbox" name="isFeatured" defaultChecked={offer.is_featured} />
                      <span className="text-sm text-slate-700">Offre principale</span>
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
                    <form action={toggleOfferActiveAction}>
                      <input type="hidden" name="offerId" value={offer.id} />
                      <input
                        type="hidden"
                        name="nextActive"
                        value={offer.is_active ? "false" : "true"}
                      />
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
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
