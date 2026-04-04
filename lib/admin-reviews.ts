import { getSupabaseAdminClient } from "@/lib/supabase/admin";

export type AdminReview = {
  id: string;
  customer_name: string;
  rating: number;
  testimonial_text: string;
  role: string | null;
  avatar_image_path: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type UpsertAdminReviewInput = {
  id?: string;
  customerName: string;
  rating: number;
  testimonialText: string;
  role: string | null;
  avatarImagePath: string | null;
  isActive: boolean;
};

type AdminActionResult = {
  ok: boolean;
  error?: string;
};

const toReviewId = (customerName: string): string => {
  const normalized = customerName
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

  return `${normalized || "review"}-${Date.now()}`;
};

const normalizeDatabaseError = (
  message: string | undefined,
  fallbackMessage: string,
): string => {
  if (!message) {
    return fallbackMessage;
  }

  if (message.includes("reviews_rating_check")) {
    return "La note doit etre comprise entre 1 et 5.";
  }

  if (message.includes("relation \"reviews\" does not exist")) {
    return "La table reviews est manquante. Lancez supabase/migrations/2026-04-04-create-blog-and-reviews-tables.sql.";
  }

  return fallbackMessage;
};

export const getAdminReviews = async (): Promise<AdminReview[]> => {
  const supabaseAdmin = getSupabaseAdminClient();

  if (!supabaseAdmin) {
    return [];
  }

  const { data, error } = await supabaseAdmin
    .from("reviews")
    .select("*")
    .order("updated_at", { ascending: false });

  if (error || !data) {
    return [];
  }

  return data as AdminReview[];
};

export const createAdminReview = async (
  input: UpsertAdminReviewInput,
): Promise<AdminActionResult> => {
  const supabaseAdmin = getSupabaseAdminClient();

  if (!supabaseAdmin) {
    return { ok: false, error: "Supabase admin non configure." };
  }

  const id = input.id?.trim() || toReviewId(input.customerName);
  const { error } = await supabaseAdmin.from("reviews").insert({
    id,
    customer_name: input.customerName.trim(),
    rating: input.rating,
    testimonial_text: input.testimonialText.trim(),
    role: input.role,
    avatar_image_path: input.avatarImagePath,
    is_active: input.isActive,
  });

  if (error) {
    return {
      ok: false,
      error: normalizeDatabaseError(error.message, "Impossible d'ajouter l'avis."),
    };
  }

  return { ok: true };
};

export const updateAdminReview = async (
  id: string,
  input: UpsertAdminReviewInput,
): Promise<AdminActionResult> => {
  const supabaseAdmin = getSupabaseAdminClient();

  if (!supabaseAdmin) {
    return { ok: false, error: "Supabase admin non configure." };
  }

  const { error } = await supabaseAdmin
    .from("reviews")
    .update({
      customer_name: input.customerName.trim(),
      rating: input.rating,
      testimonial_text: input.testimonialText.trim(),
      role: input.role,
      avatar_image_path: input.avatarImagePath,
      is_active: input.isActive,
    })
    .eq("id", id);

  if (error) {
    return {
      ok: false,
      error: normalizeDatabaseError(error.message, "Impossible de modifier l'avis."),
    };
  }

  return { ok: true };
};

export const setAdminReviewActiveState = async (
  id: string,
  isActive: boolean,
): Promise<AdminActionResult> => {
  const supabaseAdmin = getSupabaseAdminClient();

  if (!supabaseAdmin) {
    return { ok: false, error: "Supabase admin non configure." };
  }

  const { error } = await supabaseAdmin
    .from("reviews")
    .update({ is_active: isActive })
    .eq("id", id);

  if (error) {
    return { ok: false, error: "Impossible de changer le statut de l'avis." };
  }

  return { ok: true };
};

export const deleteAdminReview = async (id: string): Promise<AdminActionResult> => {
  const supabaseAdmin = getSupabaseAdminClient();

  if (!supabaseAdmin) {
    return { ok: false, error: "Supabase admin non configure." };
  }

  const { error } = await supabaseAdmin.from("reviews").delete().eq("id", id);

  if (error) {
    return { ok: false, error: "Suppression impossible pour le moment." };
  }

  return { ok: true };
};
