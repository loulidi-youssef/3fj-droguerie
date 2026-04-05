import Link from "next/link";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { AdminProductImageUploadInput } from "@/components/admin-product-image-upload-input";
import { AdminProductActionNotifications } from "@/components/admin-product-action-notifications";
import { AdminProductVariantsInput } from "@/components/admin-product-variants-input";
import { categories, getCategoryNameBySlug } from "@/data/categories";
import { uploadAdminProductImages } from "@/lib/admin-product-images";
import { formatDh } from "@/lib/currency";
import {
  clearAdminSession,
  hasValidAdminSession,
  isAdminAuthConfigured,
} from "@/lib/admin-auth";
import {
  type UpsertAdminProductVariantInput,
  createAdminProduct,
  deleteAdminProduct,
  getAdminProducts,
  setAdminProductActiveState,
  updateAdminProduct,
} from "@/lib/admin-products";

type AdminProductsPageProps = {
  searchParams: {
    success?: string | string[];
    error?: string | string[];
    category?: string | string[];
  };
};

type ProductFormValue = {
  slug: string;
  name: string;
  shortDescription: string;
  description: string;
  price: number;
  categorySlug: string;
  stock: number;
  rating: number;
  images: string[];
  isActive: boolean;
  variants: UpsertAdminProductVariantInput[];
};

type ParsedProductForm =
  | {
      ok: true;
      value: ProductFormValue;
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

const normalizeSlug = (rawSlug: string): string => {
  return rawSlug
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-");
};

const parseImages = (rawImages: string): string[] => {
  return rawImages
    .split(/\r?\n|,/g)
    .map((value) => value.trim())
    .filter(Boolean);
};

const formatCategoryLabel = (categorySlug: string): string => {
  const fromCatalog = getCategoryNameBySlug(categorySlug);
  if (fromCatalog !== "Categorie") {
    return fromCatalog;
  }

  return categorySlug
    .split("-")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
};

type ParsedVariantsJson =
  | {
      ok: true;
      variants: UpsertAdminProductVariantInput[];
    }
  | {
      ok: false;
      error: string;
    };

const toNullableString = (value: unknown): string | null => {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const toBoolean = (value: unknown, defaultValue: boolean): boolean => {
  if (typeof value === "boolean") {
    return value;
  }

  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (["false", "0", "non", "no", "off"].includes(normalized)) {
      return false;
    }
    if (["true", "1", "oui", "yes", "on"].includes(normalized)) {
      return true;
    }
  }

  return defaultValue;
};

const parseProductVariantsJson = (rawVariants: string): ParsedVariantsJson => {
  const trimmed = rawVariants.trim();
  if (!trimmed) {
    return { ok: true, variants: [] };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(trimmed);
  } catch {
    return {
      ok: false,
      error: "Variantes invalides: format incorrect.",
    };
  }

  if (!Array.isArray(parsed)) {
    return {
      ok: false,
      error: "Variantes invalides: format de liste attendu.",
    };
  }

  const variants: UpsertAdminProductVariantInput[] = [];

  for (const [index, entry] of parsed.entries()) {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
      return {
        ok: false,
        error: `Variante #${index + 1} invalide: objet attendu.`,
      };
    }

    const record = entry as Record<string, unknown>;
    const color = toNullableString(record.color);
    const size = toNullableString(record.size);

    if (!color && !size) {
      return {
        ok: false,
        error: `Variante #${index + 1}: ajoutez au moins une couleur ou une taille.`,
      };
    }

    const price = Number(record.price);
    if (!Number.isFinite(price) || price <= 0) {
      return {
        ok: false,
        error: `Variante #${index + 1}: prix invalide.`,
      };
    }

    const stock = Number(record.stock);
    if (!Number.isFinite(stock) || stock < 0) {
      return {
        ok: false,
        error: `Variante #${index + 1}: stock invalide.`,
      };
    }

    const previousPriceRaw = record.previousPrice ?? record.previous_price;
    const previousPrice =
      previousPriceRaw === null || previousPriceRaw === undefined || previousPriceRaw === ""
        ? null
        : Number(previousPriceRaw);

    if (
      typeof previousPrice === "number" &&
      (!Number.isFinite(previousPrice) || previousPrice <= price)
    ) {
      return {
        ok: false,
        error: `Variante #${index + 1}: previousPrice doit etre superieur au prix.`,
      };
    }

    variants.push({
      id: toNullableString(record.id) ?? undefined,
      color,
      size,
      price: Math.round(price),
      previousPrice: typeof previousPrice === "number" ? Math.round(previousPrice) : null,
      stock: Math.round(stock),
      sku: toNullableString(record.sku),
      image: toNullableString(record.image),
      isActive: toBoolean(record.isActive ?? record.is_active, true),
    });
  }

  return { ok: true, variants };
};

const parseProductForm = (formData: FormData): ParsedProductForm => {
  const rawSlug = formData.get("slug");
  const rawName = formData.get("name");
  const rawShortDescription = formData.get("shortDescription");
  const rawDescription = formData.get("description");
  const rawCategorySlug = formData.get("categorySlug");
  const rawExistingImages = formData.get("existingImages");
  const rawVariantsJson = formData.get("variantsJson");

  const slug = typeof rawSlug === "string" ? normalizeSlug(rawSlug) : "";
  const name = typeof rawName === "string" ? rawName.trim() : "";
  const shortDescription =
    typeof rawShortDescription === "string" ? rawShortDescription.trim() : "";
  const description =
    typeof rawDescription === "string" ? rawDescription.trim() : "";
  const categorySlug =
    typeof rawCategorySlug === "string" ? rawCategorySlug.trim() : "";
  const images = typeof rawExistingImages === "string" ? parseImages(rawExistingImages) : [];
  const variantsJson = typeof rawVariantsJson === "string" ? rawVariantsJson : "";

  const price = toNumber(formData.get("price"));
  const stock = toNumber(formData.get("stock"));
  const rating = toNumber(formData.get("rating"));
  const isActive = formData.get("isActive") === "on";

  const parsedVariants = parseProductVariantsJson(variantsJson);
  if (!parsedVariants.ok) {
    return {
      ok: false,
      error: parsedVariants.error,
    };
  }

  if (!slug || !/^[a-z0-9-]+$/.test(slug)) {
    return {
      ok: false,
      error: "Slug invalide. Utilisez lettres minuscules, chiffres et tirets.",
    };
  }

  if (!name || !shortDescription || !description || !categorySlug) {
    return {
      ok: false,
      error: "Nom, description courte, description et category slug sont obligatoires.",
    };
  }

  if (!Number.isFinite(price) || price <= 0) {
    return { ok: false, error: "Le prix doit etre un nombre superieur a 0." };
  }

  if (!Number.isFinite(stock) || stock < 0) {
    return { ok: false, error: "Le stock doit etre un nombre superieur ou egal a 0." };
  }

  if (!Number.isFinite(rating) || rating < 0 || rating > 5) {
    return { ok: false, error: "La note doit etre entre 0 et 5." };
  }

  return {
    ok: true,
    value: {
      slug,
      name,
      shortDescription,
      description,
      price: Math.round(price),
      categorySlug,
      stock: Math.round(stock),
      rating,
      images,
      isActive,
      variants: parsedVariants.variants,
    },
  };
};

const redirectWithSuccess = (message: string): never => {
  redirect(`/admin/products?success=${encodeURIComponent(message)}`);
};

const redirectWithError = (message: string): never => {
  redirect(`/admin/products?error=${encodeURIComponent(message)}`);
};

const getUploadedImageFiles = (formData: FormData): File[] => {
  return formData
    .getAll("imageFiles")
    .filter((value): value is File => value instanceof File && value.size > 0);
};

const mergeImagePaths = (uploadedPaths: string[], existingPaths: string[]): string[] => {
  return [...new Set([...uploadedPaths, ...existingPaths])];
};

const getValidatedProductInput = async (formData: FormData): Promise<ProductFormValue> => {
  const parsed = parseProductForm(formData);
  if (!parsed.ok) {
    return redirectWithError(parsed.error);
  }

  const uploadedFiles = getUploadedImageFiles(formData);
  const uploaded = await uploadAdminProductImages(parsed.value.slug, uploadedFiles);
  if (!uploaded.ok) {
    return redirectWithError(uploaded.error);
  }

  const images = mergeImagePaths(uploaded.paths, parsed.value.images);
  if (images.length === 0) {
    return redirectWithError(
      "Ajoutez au moins une image via telechargement ou chemin existant.",
    );
  }

  return {
    ...parsed.value,
    images,
  };
};

const logoutAdminAction = async () => {
  "use server";
  clearAdminSession();
  redirect("/admin/login");
};

const createProductAction = async (formData: FormData) => {
  "use server";

  if (!hasValidAdminSession()) {
    redirect("/admin/login");
  }

  const validInput = await getValidatedProductInput(formData);
  const created = await createAdminProduct(validInput);
  if (!created.ok) {
    redirectWithError(created.error ?? "Impossible d'ajouter le produit.");
  }

  revalidatePath("/admin/products");
  revalidatePath("/produits");
  revalidatePath(`/produits/${validInput.slug}`);
  revalidatePath("/offres");
  revalidatePath("/");
  redirectWithSuccess("Produit ajouté avec succès.");
};

const updateProductAction = async (formData: FormData) => {
  "use server";

  if (!hasValidAdminSession()) {
    redirect("/admin/login");
  }

  const productIdRaw = formData.get("productId");
  const previousSlugRaw = formData.get("previousSlug");
  const productId = typeof productIdRaw === "string" ? productIdRaw.trim() : "";
  const previousSlug =
    typeof previousSlugRaw === "string" ? previousSlugRaw.trim() : "";

  if (!productId) {
    redirectWithError("Produit introuvable.");
  }

  const validInput = await getValidatedProductInput(formData);
  const updated = await updateAdminProduct(productId, validInput);
  if (!updated.ok) {
    redirectWithError(updated.error ?? "Impossible de modifier le produit.");
  }

  revalidatePath("/admin/products");
  revalidatePath("/produits");
  if (previousSlug) {
    revalidatePath(`/produits/${previousSlug}`);
  }
  revalidatePath(`/produits/${validInput.slug}`);
  revalidatePath("/offres");
  revalidatePath("/");
  redirectWithSuccess("Produit mis à jour avec succès.");
};

const toggleProductActiveAction = async (formData: FormData) => {
  "use server";

  if (!hasValidAdminSession()) {
    redirect("/admin/login");
  }

  const productIdRaw = formData.get("productId");
  const nextActiveRaw = formData.get("nextActive");

  const productId = typeof productIdRaw === "string" ? productIdRaw.trim() : "";
  const nextActive = nextActiveRaw === "true";

  if (!productId) {
    redirectWithError("Produit introuvable.");
  }

  const updated = await setAdminProductActiveState(productId, nextActive);
  if (!updated.ok) {
    redirectWithError(updated.error ?? "Impossible de changer le statut du produit.");
  }

  revalidatePath("/admin/products");
  revalidatePath("/produits");
  revalidatePath("/offres");
  revalidatePath("/");
  redirectWithSuccess(nextActive ? "Produit active." : "Produit desactive.");
};

const deleteProductAction = async (formData: FormData) => {
  "use server";

  if (!hasValidAdminSession()) {
    redirect("/admin/login");
  }

  const productIdRaw = formData.get("productId");
  const productSlugRaw = formData.get("productSlug");
  const productId = typeof productIdRaw === "string" ? productIdRaw.trim() : "";
  const productSlug = typeof productSlugRaw === "string" ? productSlugRaw.trim() : "";

  if (!productId) {
    redirectWithError("Produit introuvable.");
  }

  const deleted = await deleteAdminProduct(productId);
  if (!deleted.ok) {
    redirectWithError(
      deleted.error ??
        "Suppression impossible. Vous pouvez desactiver le produit a la place.",
    );
  }

  revalidatePath("/admin/products");
  revalidatePath("/produits");
  if (productSlug) {
    revalidatePath(`/produits/${productSlug}`);
  }
  revalidatePath("/offres");
  revalidatePath("/");
  redirectWithSuccess("Produit supprime.");
};

export default async function AdminProductsPage({ searchParams }: AdminProductsPageProps) {
  if (!isAdminAuthConfigured()) {
    return (
      <section className="bg-brand-light py-12">
        <div className="mx-auto max-w-3xl rounded-2xl bg-white p-6 shadow-card">
          <h1 className="text-2xl font-extrabold text-brand-blue">Admin produits</h1>
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

  const products = await getAdminProducts();

  const successMessage = decodeURIComponent(toSingleValue(searchParams.success) || "");
  const errorMessage = decodeURIComponent(toSingleValue(searchParams.error) || "");
  const selectedCategory = toSingleValue(searchParams.category).trim().toLowerCase();

  const categoryCountMap = new Map<string, number>();
  for (const product of products) {
    const slug = product.category_slug.trim().toLowerCase();
    categoryCountMap.set(slug, (categoryCountMap.get(slug) ?? 0) + 1);
  }

  const categoryOptions = [...new Set([...categories.map((category) => category.slug), ...categoryCountMap.keys()])];

  const sortedCategoryEntries = [...categoryCountMap.entries()].sort((first, second) => {
    const firstLabel = formatCategoryLabel(first[0]);
    const secondLabel = formatCategoryLabel(second[0]);
    return firstLabel.localeCompare(secondLabel, "fr");
  });

  const filteredProducts = selectedCategory
    ? products.filter((product) => product.category_slug.trim().toLowerCase() === selectedCategory)
    : products;

  const groupedProductsMap = new Map<string, typeof filteredProducts>();
  for (const product of filteredProducts) {
    const categorySlug = product.category_slug.trim().toLowerCase();
    const existing = groupedProductsMap.get(categorySlug) ?? [];
    groupedProductsMap.set(categorySlug, [...existing, product]);
  }

  const groupedProducts = [...groupedProductsMap.entries()]
    .sort((first, second) => formatCategoryLabel(first[0]).localeCompare(formatCategoryLabel(second[0]), "fr"))
    .map(([categorySlug, categoryProducts]) => ({ categorySlug, products: categoryProducts }));

  return (
    <section className="bg-brand-light py-12">
      <div className="mx-auto max-w-7xl px-4 sm:px-5 lg:px-6">
        <AdminProductActionNotifications
          successMessage={successMessage}
          errorMessage={errorMessage}
        />
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-3xl font-extrabold text-brand-blue">Admin produits</h1>
            <p className="mt-1 text-sm text-slate-600">
              Ajoutez, modifiez, desactivez ou supprimez les produits.
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
              href="/admin/offres"
              className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700"
            >
              Voir offres
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
          <div
            role="status"
            aria-live="polite"
            className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-800"
          >
            <p className="text-sm font-bold">Succès</p>
            <p className="mt-1 text-sm font-medium">{successMessage}</p>
          </div>
        ) : null}

        {errorMessage ? (
          <p className="mb-4 rounded-xl bg-rose-50 p-3 text-sm font-medium text-rose-700">
            {errorMessage}
          </p>
        ) : null}

        <div className="mb-6 rounded-2xl bg-white p-4 shadow-card">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Organisation par categorie
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <Link
              href="/admin/products"
              className={`rounded-full border px-3 py-1 text-xs font-semibold transition ${
                !selectedCategory
                  ? "border-brand-blue bg-brand-blue text-white"
                  : "border-slate-300 text-slate-700 hover:border-brand-orange hover:text-brand-orange"
              }`}
            >
              Toutes ({products.length})
            </Link>
            {sortedCategoryEntries.map(([categorySlug, total]) => (
              <Link
                key={categorySlug}
                href={`/admin/products?category=${encodeURIComponent(categorySlug)}`}
                className={`rounded-full border px-3 py-1 text-xs font-semibold transition ${
                  selectedCategory === categorySlug
                    ? "border-brand-blue bg-brand-blue text-white"
                    : "border-slate-300 text-slate-700 hover:border-brand-orange hover:text-brand-orange"
                }`}
              >
                {formatCategoryLabel(categorySlug)} ({total})
              </Link>
            ))}
          </div>
          {selectedCategory ? (
            <p className="mt-2 text-xs text-slate-600">
              Filtre actif: <span className="font-semibold">{formatCategoryLabel(selectedCategory)}</span>
            </p>
          ) : (
            <p className="mt-2 text-xs text-slate-600">
              Astuce: choisissez une categorie pour modifier les produits plus vite.
            </p>
          )}
        </div>

        <datalist id="admin-category-options">
          {categoryOptions.map((categorySlug) => (
            <option key={categorySlug} value={categorySlug}>
              {formatCategoryLabel(categorySlug)}
            </option>
          ))}
        </datalist>

        <details className="mb-6 rounded-2xl bg-white p-5 shadow-card" open>
          <summary className="cursor-pointer list-none text-lg font-bold text-brand-blue">
            Ajouter un produit
          </summary>

          <form
            action={createProductAction}
            encType="multipart/form-data"
            className="mt-4 grid gap-3 md:grid-cols-2"
          >
            <label className="block">
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-600">Nom</span>
              <input
                type="text"
                name="name"
                required
                className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
              />
            </label>
            <label className="block">
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-600">Slug</span>
              <input
                type="text"
                name="slug"
                required
                placeholder="ex: peinture-atlas-20kg"
                className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
              />
            </label>
            <label className="block md:col-span-2">
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-600">
                Description courte
              </span>
              <input
                type="text"
                name="shortDescription"
                required
                className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
              />
            </label>
            <label className="block md:col-span-2">
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-600">
                Description complete
              </span>
              <textarea
                name="description"
                rows={3}
                required
                className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
              />
            </label>
            <label className="block">
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-600">Prix (DH)</span>
              <input
                type="number"
                name="price"
                min="1"
                step="1"
                required
                className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
              />
            </label>
            <label className="block">
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-600">Categorie</span>
              <input
                type="text"
                name="categorySlug"
                required
                placeholder="ex: outillage"
                list="admin-category-options"
                className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
              />
              <span className="mt-1 block text-xs text-slate-500">
                Choisissez une categorie existante ou saisissez un nouveau slug.
              </span>
            </label>
            <label className="block">
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-600">
                Quantite (stock)
              </span>
              <input
                type="number"
                name="stock"
                min="0"
                step="1"
                required
                defaultValue={0}
                className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
              />
            </label>
            <label className="block">
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-600">Note</span>
              <input
                type="number"
                name="rating"
                min="0"
                max="5"
                step="0.1"
                required
                defaultValue={4.5}
                className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
              />
            </label>
            <AdminProductImageUploadInput inputName="imageFiles" idPrefix="create-product" />
            <label className="block md:col-span-2">
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-600">
                Chemins images existants (optionnel)
              </span>
              <textarea
                name="existingImages"
                rows={3}
                placeholder="/images/products/mon-produit.jpg"
                className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
              />
            </label>
            <AdminProductVariantsInput
              inputName="variantsJson"
              productIdForValidation="__new__"
            />
            <label className="inline-flex items-center gap-2 md:col-span-2">
              <input type="checkbox" name="isActive" defaultChecked />
              <span className="text-sm text-slate-700">Produit actif</span>
            </label>
            <div className="md:col-span-2">
              <button
                type="submit"
                className="rounded-xl bg-brand-blue px-4 py-2 text-sm font-semibold text-white"
              >
                Ajouter produit
              </button>
            </div>
          </form>
        </details>

        {products.length === 0 ? (
          <div className="rounded-2xl bg-white p-6 shadow-card">
            <p className="text-sm text-slate-600">Aucun produit dans Supabase.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {filteredProducts.length === 0 ? (
              <div className="rounded-2xl bg-white p-6 shadow-card">
                <p className="text-sm text-slate-600">
                  Aucun produit dans la categorie {formatCategoryLabel(selectedCategory)}.
                </p>
              </div>
            ) : null}

            {groupedProducts.map((group) => (
              <section key={group.categorySlug} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-card">
                <div className="mb-4 flex items-center justify-between gap-2 border-b border-slate-200 pb-3">
                  <h2 className="text-base font-bold text-brand-blue">
                    {formatCategoryLabel(group.categorySlug)}
                  </h2>
                  <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">
                    {group.products.length} produit(s)
                  </span>
                </div>

                <div className="space-y-4">
                  {group.products.map((product) => (
                    <details key={product.id} className="rounded-2xl bg-white p-5 shadow-card">
                <summary className="cursor-pointer list-none">
                  <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Nom</p>
                      <p className="text-sm font-bold text-brand-blue">{product.name}</p>
                      <p className="text-xs text-slate-600">Slug: {product.slug}</p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Prix / Stock</p>
                      <p className="text-sm font-bold text-brand-blue">{formatDh(product.price)}</p>
                      <p className="text-xs text-slate-600">Quantite: {product.stock}</p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Categorie</p>
                      <p className="text-sm text-slate-700">{formatCategoryLabel(product.category_slug)}</p>
                      <p className="text-xs text-slate-500">Slug: {product.category_slug}</p>
                      <p className="text-xs text-slate-600">Note: {product.rating}</p>
                      <p className="text-xs text-slate-600">Variantes: {product.variants.length}</p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Statut</p>
                      <span
                        className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
                          product.is_active
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-slate-200 text-slate-700"
                        }`}
                      >
                        {product.is_active ? "Actif" : "Inactif"}
                      </span>
                    </div>
                  </div>
                </summary>

                <div className="mt-4 border-t border-slate-200 pt-4">
                  <p className="text-xs text-slate-500">ID: {product.id}</p>

                  <form
                    action={updateProductAction}
                    encType="multipart/form-data"
                    className="mt-3 grid gap-3 md:grid-cols-2"
                  >
                    <input type="hidden" name="productId" value={product.id} />
                    <input type="hidden" name="previousSlug" value={product.slug} />

                    <label className="block">
                      <span className="text-xs font-semibold uppercase tracking-wide text-slate-600">Nom</span>
                      <input
                        type="text"
                        name="name"
                        required
                        defaultValue={product.name}
                        className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                      />
                    </label>
                    <label className="block">
                      <span className="text-xs font-semibold uppercase tracking-wide text-slate-600">Slug</span>
                      <input
                        type="text"
                        name="slug"
                        required
                        defaultValue={product.slug}
                        className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                      />
                    </label>
                    <label className="block md:col-span-2">
                      <span className="text-xs font-semibold uppercase tracking-wide text-slate-600">
                        Description courte
                      </span>
                      <input
                        type="text"
                        name="shortDescription"
                        required
                        defaultValue={product.short_description}
                        className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                      />
                    </label>
                    <label className="block md:col-span-2">
                      <span className="text-xs font-semibold uppercase tracking-wide text-slate-600">
                        Description complete
                      </span>
                      <textarea
                        name="description"
                        rows={3}
                        required
                        defaultValue={product.description}
                        className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                      />
                    </label>
                    <label className="block">
                      <span className="text-xs font-semibold uppercase tracking-wide text-slate-600">Prix (DH)</span>
                      <input
                        type="number"
                        name="price"
                        min="1"
                        step="1"
                        required
                        defaultValue={product.price}
                        className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                      />
                    </label>
                    <label className="block">
                      <span className="text-xs font-semibold uppercase tracking-wide text-slate-600">Categorie</span>
                      <input
                        type="text"
                        name="categorySlug"
                        required
                        defaultValue={product.category_slug}
                        list="admin-category-options"
                        className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                      />
                      <span className="mt-1 block text-xs text-slate-500">
                        Utilisez une categorie existante ou un nouveau slug.
                      </span>
                    </label>
                    <label className="block">
                      <span className="text-xs font-semibold uppercase tracking-wide text-slate-600">
                        Quantite (stock)
                      </span>
                      <input
                        type="number"
                        name="stock"
                        min="0"
                        step="1"
                        required
                        defaultValue={product.stock}
                        className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                      />
                    </label>
                    <label className="block">
                      <span className="text-xs font-semibold uppercase tracking-wide text-slate-600">Note</span>
                      <input
                        type="number"
                        name="rating"
                        min="0"
                        max="5"
                        step="0.1"
                        required
                        defaultValue={product.rating}
                        className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                      />
                    </label>
                    <AdminProductImageUploadInput
                      inputName="imageFiles"
                      idPrefix={`edit-product-${product.id}`}
                    />
                    <label className="block md:col-span-2">
                      <span className="text-xs font-semibold uppercase tracking-wide text-slate-600">
                        Chemins images existants (optionnel)
                      </span>
                      <textarea
                        name="existingImages"
                        rows={3}
                        defaultValue={product.images.join("\n")}
                        className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                      />
                    </label>
                    <AdminProductVariantsInput
                      inputName="variantsJson"
                      productIdForValidation={product.id}
                      initialVariants={product.variants.map((variant) => ({
                        id: variant.id,
                        color: variant.color,
                        size: variant.size,
                        price: variant.price,
                        previousPrice: variant.previous_price,
                        stock: variant.stock,
                        sku: variant.sku,
                        image: variant.image,
                        isActive: variant.is_active,
                      }))}
                    />
                    <label className="inline-flex items-center gap-2 md:col-span-2">
                      <input
                        type="checkbox"
                        name="isActive"
                        defaultChecked={product.is_active}
                      />
                      <span className="text-sm text-slate-700">Produit actif</span>
                    </label>

                    <div className="flex flex-wrap items-center gap-2 md:col-span-2">
                      <button
                        type="submit"
                        className="rounded-xl bg-brand-blue px-4 py-2 text-sm font-semibold text-white"
                      >
                        Enregistrer modifications
                      </button>
                    </div>
                  </form>

                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <form action={toggleProductActiveAction}>
                      <input type="hidden" name="productId" value={product.id} />
                      <input
                        type="hidden"
                        name="nextActive"
                        value={product.is_active ? "false" : "true"}
                      />
                      <button
                        type="submit"
                        className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700"
                      >
                        {product.is_active ? "Desactiver" : "Activer"}
                      </button>
                    </form>

                    <form action={deleteProductAction}>
                      <input type="hidden" name="productId" value={product.id} />
                      <input type="hidden" name="productSlug" value={product.slug} />
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
              </section>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
