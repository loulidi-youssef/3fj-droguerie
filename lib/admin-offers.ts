import { getSupabaseAdminClient } from "@/lib/supabase/admin";

export type AdminOffer = {
  id: string;
  title: string;
  short_description: string;
  discount_label: string;
  product_id: string | null;
  discounted_price: number | null;
  start_at: string | null;
  end_at: string | null;
  image_path: string | null;
  banner_text: string | null;
  is_active: boolean;
  is_featured: boolean;
  created_at: string;
  updated_at: string;
};

export type UpsertAdminOfferInput = {
  id?: string;
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

type AdminActionResult = {
  ok: boolean;
  error?: string;
};

const toOfferId = (title: string): string => {
  const base = title
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

  return `${base || "offre"}-${Date.now()}`;
};

const normalizeDatabaseError = (
  message: string | undefined,
  fallbackMessage: string,
): string => {
  if (!message) {
    return fallbackMessage;
  }

  if (message.includes("offers_date_range_check")) {
    return "La date de fin doit etre apres la date de debut.";
  }

  if (message.includes("duplicate key value")) {
    return "Cette offre existe deja. Modifiez le titre ou reessayez.";
  }

  if (message.includes("relation \"offers\" does not exist")) {
    return "La table offers est manquante. Lancez supabase/migrations/2026-04-04-create-offers-table.sql.";
  }

  if (message.includes("column \"product_id\" does not exist")) {
    return "La colonne product_id est manquante. Lancez supabase/migrations/2026-04-04-link-offers-to-products.sql.";
  }

  if (message.includes("column \"discounted_price\" does not exist")) {
    return "La colonne discounted_price est manquante. Lancez supabase/migrations/2026-04-04-link-offers-to-products.sql.";
  }

  if (message.includes("offers_discounted_price_check")) {
    return "Le prix promotionnel doit etre superieur a 0.";
  }

  if (message.includes("product_id") && message.includes("null value")) {
    return "Selectionnez un produit pour cette offre.";
  }

  if (message.includes("discounted_price") && message.includes("null value")) {
    return "Le prix promotionnel est obligatoire.";
  }

  return fallbackMessage;
};

const clearOtherFeaturedOffers = async (idToKeep: string): Promise<void> => {
  const supabaseAdmin = getSupabaseAdminClient();
  if (!supabaseAdmin) {
    return;
  }

  await supabaseAdmin
    .from("offers")
    .update({ is_featured: false })
    .neq("id", idToKeep)
    .eq("is_featured", true);
};

export const getAdminOffers = async (): Promise<AdminOffer[]> => {
  const supabaseAdmin = getSupabaseAdminClient();

  if (!supabaseAdmin) {
    return [];
  }

  const { data, error } = await supabaseAdmin
    .from("offers")
    .select("*")
    .order("updated_at", { ascending: false });

  if (error || !data) {
    return [];
  }

  return data as AdminOffer[];
};

export const createAdminOffer = async (
  input: UpsertAdminOfferInput,
): Promise<AdminActionResult> => {
  const supabaseAdmin = getSupabaseAdminClient();

  if (!supabaseAdmin) {
    return { ok: false, error: "Supabase admin non configure." };
  }

  const id = input.id?.trim() || toOfferId(input.title);

  const { error } = await supabaseAdmin.from("offers").insert({
    id,
    title: input.title.trim(),
    short_description: input.shortDescription.trim(),
    discount_label: input.discountLabel.trim(),
    product_id: input.productId,
    discounted_price: input.discountedPrice,
    start_at: input.startAt,
    end_at: input.endAt,
    image_path: input.imagePath,
    banner_text: input.bannerText,
    is_active: input.isActive,
    is_featured: input.isFeatured,
  });

  if (error) {
    return {
      ok: false,
      error: normalizeDatabaseError(error.message, "Impossible d'ajouter l'offre."),
    };
  }

  if (input.isFeatured) {
    await clearOtherFeaturedOffers(id);
  }

  return { ok: true };
};

export const updateAdminOffer = async (
  id: string,
  input: UpsertAdminOfferInput,
): Promise<AdminActionResult> => {
  const supabaseAdmin = getSupabaseAdminClient();

  if (!supabaseAdmin) {
    return { ok: false, error: "Supabase admin non configure." };
  }

  const { error } = await supabaseAdmin
    .from("offers")
    .update({
      title: input.title.trim(),
      short_description: input.shortDescription.trim(),
      discount_label: input.discountLabel.trim(),
      product_id: input.productId,
      discounted_price: input.discountedPrice,
      start_at: input.startAt,
      end_at: input.endAt,
      image_path: input.imagePath,
      banner_text: input.bannerText,
      is_active: input.isActive,
      is_featured: input.isFeatured,
    })
    .eq("id", id);

  if (error) {
    return {
      ok: false,
      error: normalizeDatabaseError(error.message, "Impossible de modifier l'offre."),
    };
  }

  if (input.isFeatured) {
    await clearOtherFeaturedOffers(id);
  }

  return { ok: true };
};

export const setAdminOfferActiveState = async (
  id: string,
  isActive: boolean,
): Promise<AdminActionResult> => {
  const supabaseAdmin = getSupabaseAdminClient();

  if (!supabaseAdmin) {
    return { ok: false, error: "Supabase admin non configure." };
  }

  const { error } = await supabaseAdmin
    .from("offers")
    .update({ is_active: isActive })
    .eq("id", id);

  if (error) {
    return { ok: false, error: "Impossible de changer le statut de l'offre." };
  }

  return { ok: true };
};

export const deleteAdminOffer = async (id: string): Promise<AdminActionResult> => {
  const supabaseAdmin = getSupabaseAdminClient();

  if (!supabaseAdmin) {
    return { ok: false, error: "Supabase admin non configure." };
  }

  const { error } = await supabaseAdmin.from("offers").delete().eq("id", id);

  if (error) {
    return { ok: false, error: "Suppression impossible pour le moment." };
  }

  return { ok: true };
};
