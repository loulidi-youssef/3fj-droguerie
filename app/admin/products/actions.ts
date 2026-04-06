import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { uploadAdminProductImages } from "@/lib/admin-product-images";
import {
  type UpsertAdminProductVariantInput,
  createAdminProduct,
  deleteAdminProduct,
  setAdminProductActiveState,
  updateAdminProduct,
} from "@/lib/admin-products";
import { clearAdminSession } from "@/lib/admin-auth";
import {
  normalizeSlug,
  parseImages,
} from "@/app/admin/products/lib/formatters";
import { requireAdminProductsSession } from "@/app/admin/products/lib/auth";

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

type ParsedVariantsJson =
  | {
      ok: true;
      variants: UpsertAdminProductVariantInput[];
    }
  | {
      ok: false;
      error: string;
    };

const toNumber = (rawValue: FormDataEntryValue | null): number => {
  if (typeof rawValue !== "string") {
    return Number.NaN;
  }
  return Number(rawValue.trim());
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

const toNormalizedVariantDimension = (value: string): string | null => {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  return trimmed.toLowerCase();
};

const parseProductVariantsJson = (
  rawVariants: string,
  productIdForValidation: string,
): ParsedVariantsJson => {
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
  const duplicateBuckets = new Map<string, number>();

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

    const duplicateKey = [
      productIdForValidation,
      toNormalizedVariantDimension(color ?? "") ?? "__none__",
      toNormalizedVariantDimension(size ?? "") ?? "__none__",
    ].join("::");
    duplicateBuckets.set(duplicateKey, (duplicateBuckets.get(duplicateKey) ?? 0) + 1);

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

  const hasDuplicate = [...duplicateBuckets.values()].some((count) => count > 1);
  if (hasDuplicate) {
    return {
      ok: false,
      error: "Variantes invalides: combinaison couleur/taille dupliquee pour ce produit.",
    };
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
  const rawProductId = formData.get("productId");

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
  const productIdForValidation =
    (typeof rawProductId === "string" ? rawProductId.trim() : "") || "__new__";

  const price = toNumber(formData.get("price"));
  const stock = toNumber(formData.get("stock"));
  const rating = toNumber(formData.get("rating"));
  const isActive = formData.get("isActive") === "on";

  const parsedVariants = parseProductVariantsJson(variantsJson, productIdForValidation);
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

const revalidateProductPages = (slug: string, previousSlug?: string): void => {
  revalidatePath("/admin/products");
  revalidatePath("/produits");
  if (previousSlug) {
    revalidatePath(`/produits/${previousSlug}`);
  }
  revalidatePath(`/produits/${slug}`);
  revalidatePath("/offres");
  revalidatePath("/");
};

export const logoutAdminAction = async (): Promise<void> => {
  "use server";
  await clearAdminSession();
  redirect("/admin/login");
};

export const createProductAction = async (formData: FormData): Promise<void> => {
  "use server";

  await requireAdminProductsSession();

  const validInput = await getValidatedProductInput(formData);
  const created = await createAdminProduct(validInput);
  if (!created.ok) {
    return redirectWithError(created.error ?? "Impossible d'ajouter le produit.");
  }

  revalidateProductPages(validInput.slug);
  redirectWithSuccess("Produit ajoute avec succes.");
};

export const updateProductAction = async (formData: FormData): Promise<void> => {
  "use server";

  await requireAdminProductsSession();

  const productIdRaw = formData.get("productId");
  const previousSlugRaw = formData.get("previousSlug");
  const productId = typeof productIdRaw === "string" ? productIdRaw.trim() : "";
  const previousSlug =
    typeof previousSlugRaw === "string" ? previousSlugRaw.trim() : "";

  if (!productId) {
    return redirectWithError("Produit introuvable.");
  }

  const validInput = await getValidatedProductInput(formData);
  const updated = await updateAdminProduct(productId, validInput);
  if (!updated.ok) {
    return redirectWithError(updated.error ?? "Impossible de modifier le produit.");
  }

  revalidateProductPages(validInput.slug, previousSlug);
  redirectWithSuccess("Produit mis a jour avec succes.");
};

export const toggleProductActiveAction = async (formData: FormData): Promise<void> => {
  "use server";

  await requireAdminProductsSession();

  const productIdRaw = formData.get("productId");
  const nextActiveRaw = formData.get("nextActive");

  const productId = typeof productIdRaw === "string" ? productIdRaw.trim() : "";
  const nextActive = nextActiveRaw === "true";

  if (!productId) {
    return redirectWithError("Produit introuvable.");
  }

  const updated = await setAdminProductActiveState(productId, nextActive);
  if (!updated.ok) {
    return redirectWithError(updated.error ?? "Impossible de changer le statut du produit.");
  }

  revalidatePath("/admin/products");
  revalidatePath("/produits");
  revalidatePath("/offres");
  revalidatePath("/");
  redirectWithSuccess(nextActive ? "Produit active." : "Produit desactive.");
};

export const deleteProductAction = async (formData: FormData): Promise<void> => {
  "use server";

  await requireAdminProductsSession();

  const productIdRaw = formData.get("productId");
  const productSlugRaw = formData.get("productSlug");
  const productId = typeof productIdRaw === "string" ? productIdRaw.trim() : "";
  const productSlug = typeof productSlugRaw === "string" ? productSlugRaw.trim() : "";

  if (!productId) {
    return redirectWithError("Produit introuvable.");
  }

  const deleted = await deleteAdminProduct(productId);
  if (!deleted.ok) {
    return redirectWithError(
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

