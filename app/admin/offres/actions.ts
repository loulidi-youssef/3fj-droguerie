import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { clearAdminSession } from "@/lib/admin-auth";
import { getAdminProducts } from "@/lib/admin-products";
import {
  calculateOfferPricing,
  isOfferDiscountType,
  normalizeOfferDiscountValue,
} from "@/lib/offer-pricing";
import {
  createAdminOffer,
  deleteAdminOffer,
  setAdminOfferActiveState,
  updateAdminOffer,
} from "@/lib/admin-offers";
import { requireAdminOffresSession } from "@/app/admin/offres/lib/auth";
import {
  parseDateTimeInput,
  toNullableString,
} from "@/app/admin/offres/lib/formatters";
import type { OfferDiscountType } from "@/types";

type OfferFormValue = {
  title: string;
  shortDescription: string;
  productId: string;
  discountType: OfferDiscountType;
  discountValue: number;
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

const toNumber = (rawValue: FormDataEntryValue | null): number => {
  if (typeof rawValue !== "string") {
    return Number.NaN;
  }

  return Number(rawValue.trim());
};

const parseOfferForm = (formData: FormData): ParsedOfferForm => {
  const titleRaw = formData.get("title");
  const shortDescriptionRaw = formData.get("shortDescription");
  const discountTypeRaw = formData.get("discountType");
  const productIdRaw = formData.get("productId");

  const title = typeof titleRaw === "string" ? titleRaw.trim() : "";
  const shortDescription =
    typeof shortDescriptionRaw === "string" ? shortDescriptionRaw.trim() : "";
  const discountTypeRawValue =
    typeof discountTypeRaw === "string" ? discountTypeRaw.trim() : "";
  const productId = typeof productIdRaw === "string" ? productIdRaw.trim() : "";
  const discountValue = toNumber(formData.get("discountValue"));

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

  if (!isOfferDiscountType(discountTypeRawValue)) {
    return { ok: false, error: "Le type de remise doit etre percent ou fixed." };
  }

  if (!productId) {
    return { ok: false, error: "Selectionnez un produit pour cette offre." };
  }

  if (!Number.isFinite(discountValue) || discountValue < 0) {
    return { ok: false, error: "La valeur de remise doit etre superieure ou egale a 0." };
  }

  if (discountTypeRawValue === "percent" && discountValue > 100) {
    return { ok: false, error: "Le pourcentage de remise doit etre entre 0 et 100." };
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
      productId,
      discountType: discountTypeRawValue,
      discountValue: normalizeOfferDiscountValue(discountTypeRawValue, discountValue),
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

const revalidateOfferStorefrontPaths = (): void => {
  revalidatePath("/admin/offres");
  revalidatePath("/offres");
  revalidatePath("/");
  revalidatePath("/produits");
  revalidatePath("/produits/[slug]", "page");
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

  const previewPricing = calculateOfferPricing(
    linkedProduct.price,
    input.discountType,
    input.discountValue,
  );

  if (previewPricing.discountedPrice < 0) {
    return "Le prix promotionnel calcule est invalide.";
  }

  return null;
};

export const logoutAdminAction = async (): Promise<void> => {
  "use server";
  await clearAdminSession();
  redirect("/admin/login");
};

export const createOfferAction = async (formData: FormData): Promise<void> => {
  "use server";

  await requireAdminOffresSession();

  const validInput = getValidatedOfferInput(formData);
  const pricingError = await validateOfferProductPricing(validInput);
  if (pricingError) {
    return redirectWithError(pricingError);
  }

  const created = await createAdminOffer(validInput);
  if (!created.ok) {
    return redirectWithError(created.error ?? "Impossible d'ajouter l'offre.");
  }

  revalidateOfferStorefrontPaths();
  redirectWithSuccess("Offre ajoutee avec succes.");
};

export const updateOfferAction = async (formData: FormData): Promise<void> => {
  "use server";

  await requireAdminOffresSession();

  const offerIdRaw = formData.get("offerId");
  const offerId = typeof offerIdRaw === "string" ? offerIdRaw.trim() : "";

  if (!offerId) {
    return redirectWithError("Offre introuvable.");
  }

  const validInput = getValidatedOfferInput(formData);
  const pricingError = await validateOfferProductPricing(validInput);
  if (pricingError) {
    return redirectWithError(pricingError);
  }

  const updated = await updateAdminOffer(offerId, validInput);
  if (!updated.ok) {
    return redirectWithError(updated.error ?? "Impossible de modifier l'offre.");
  }

  revalidateOfferStorefrontPaths();
  redirectWithSuccess("Offre modifiee avec succes.");
};

export const toggleOfferActiveAction = async (formData: FormData): Promise<void> => {
  "use server";

  await requireAdminOffresSession();

  const offerIdRaw = formData.get("offerId");
  const nextActiveRaw = formData.get("nextActive");

  const offerId = typeof offerIdRaw === "string" ? offerIdRaw.trim() : "";
  const nextActive = nextActiveRaw === "true";

  if (!offerId) {
    return redirectWithError("Offre introuvable.");
  }

  const updated = await setAdminOfferActiveState(offerId, nextActive);
  if (!updated.ok) {
    return redirectWithError(updated.error ?? "Impossible de changer le statut de l'offre.");
  }

  revalidateOfferStorefrontPaths();
  redirectWithSuccess(nextActive ? "Offre activee." : "Offre desactivee.");
};

export const deleteOfferAction = async (formData: FormData): Promise<void> => {
  "use server";

  await requireAdminOffresSession();

  const offerIdRaw = formData.get("offerId");
  const offerId = typeof offerIdRaw === "string" ? offerIdRaw.trim() : "";

  if (!offerId) {
    return redirectWithError("Offre introuvable.");
  }

  const deleted = await deleteAdminOffer(offerId);
  if (!deleted.ok) {
    return redirectWithError(deleted.error ?? "Suppression impossible.");
  }

  revalidateOfferStorefrontPaths();
  redirectWithSuccess("Offre supprimee.");
};
