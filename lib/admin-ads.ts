import { getSupabaseAdminClient } from "@/lib/supabase/admin";

export type AdminAd = {
  id: string;
  image_url: string;
  title: string | null;
  description: string | null;
  link: string;
  position: "top" | "middle";
  is_active: boolean;
  start_date: string | null;
  end_date: string | null;
  plan_id: string | null;
  ad_plan: {
    id: string;
    name: string;
    position: "top" | "middle";
    duration_days: number;
    price: number;
    is_active: boolean;
  } | null;
  created_at: string;
};

export type UpsertAdminAdInput = {
  imageUrl: string;
  title: string | null;
  description: string | null;
  link: string;
  position: "top" | "middle";
  isActive: boolean;
  startDate: string | null;
  endDate: string | null;
  planId: string | null;
};

type AdminActionResult = {
  ok: boolean;
  error?: string;
};

const normalizeDatabaseError = (
  message: string | undefined,
  fallbackMessage: string,
): string => {
  if (!message) {
    return fallbackMessage;
  }

  if (message.includes("ads_position_check")) {
    return "La position doit etre top ou middle.";
  }

  if (message.includes("ads_date_range_check")) {
    return "La date de fin doit etre apres la date de debut.";
  }

  if (message.includes('relation "ads" does not exist')) {
    return "La table ads est manquante. Lancez la migration create_ads_table.";
  }

  if (message.includes("image_url") && message.includes("null value")) {
    return "L'image est obligatoire.";
  }

  if (message.includes("link") && message.includes("null value")) {
    return "Le lien cible est obligatoire.";
  }

  if (message.includes("ads_plan_id_fkey")) {
    return "Le plan selectionne est introuvable.";
  }

  return fallbackMessage;
};

type AdminAdPlanRow = {
  id: string;
  name: string;
  position: "top" | "middle";
  duration_days: number;
  price: number;
  is_active: boolean;
};

type AdminAdRow = Omit<AdminAd, "ad_plan"> & {
  ad_plans: AdminAdPlanRow | AdminAdPlanRow[] | null;
};

const getNormalizedPlan = (rawValue: AdminAdRow["ad_plans"]): AdminAd["ad_plan"] => {
  if (!rawValue) {
    return null;
  }

  if (Array.isArray(rawValue)) {
    return rawValue[0] ?? null;
  }

  return rawValue;
};

export const getAdminAds = async (): Promise<AdminAd[]> => {
  const supabaseAdmin = getSupabaseAdminClient();

  if (!supabaseAdmin) {
    return [];
  }

  const { data, error } = await supabaseAdmin
    .from("ads")
    .select(
      "id, image_url, title, description, link, position, is_active, start_date, end_date, plan_id, created_at, ad_plans(id, name, position, duration_days, price, is_active)",
    )
    .order("created_at", { ascending: false });

  if (error || !data) {
    return [];
  }

  return (data as AdminAdRow[]).map((row) => ({
    id: row.id,
    image_url: row.image_url,
    title: row.title,
    description: row.description,
    link: row.link,
    position: row.position,
    is_active: row.is_active,
    start_date: row.start_date,
    end_date: row.end_date,
    plan_id: row.plan_id,
    ad_plan: getNormalizedPlan(row.ad_plans),
    created_at: row.created_at,
  }));
};

export const createAdminAd = async (
  input: UpsertAdminAdInput,
): Promise<AdminActionResult> => {
  const supabaseAdmin = getSupabaseAdminClient();

  if (!supabaseAdmin) {
    return { ok: false, error: "Supabase admin non configure." };
  }

  const { error } = await supabaseAdmin.from("ads").insert({
    image_url: input.imageUrl.trim(),
    title: input.title,
    description: input.description,
    link: input.link.trim(),
    position: input.position,
    is_active: input.isActive,
    start_date: input.startDate,
    end_date: input.endDate,
    plan_id: input.planId,
  });

  if (error) {
    return {
      ok: false,
      error: normalizeDatabaseError(error.message, "Impossible d'ajouter la publicite."),
    };
  }

  return { ok: true };
};

export const updateAdminAd = async (
  id: string,
  input: UpsertAdminAdInput,
): Promise<AdminActionResult> => {
  const supabaseAdmin = getSupabaseAdminClient();

  if (!supabaseAdmin) {
    return { ok: false, error: "Supabase admin non configure." };
  }

  const { error } = await supabaseAdmin
    .from("ads")
    .update({
      image_url: input.imageUrl.trim(),
      title: input.title,
      description: input.description,
      link: input.link.trim(),
      position: input.position,
      is_active: input.isActive,
      start_date: input.startDate,
      end_date: input.endDate,
      plan_id: input.planId,
    })
    .eq("id", id);

  if (error) {
    return {
      ok: false,
      error: normalizeDatabaseError(error.message, "Impossible de modifier la publicite."),
    };
  }

  return { ok: true };
};

export const setAdminAdActiveState = async (
  id: string,
  isActive: boolean,
): Promise<AdminActionResult> => {
  const supabaseAdmin = getSupabaseAdminClient();

  if (!supabaseAdmin) {
    return { ok: false, error: "Supabase admin non configure." };
  }

  const { error } = await supabaseAdmin
    .from("ads")
    .update({ is_active: isActive })
    .eq("id", id);

  if (error) {
    return { ok: false, error: "Impossible de changer le statut de la publicite." };
  }

  return { ok: true };
};

export const deleteAdminAd = async (id: string): Promise<AdminActionResult> => {
  const supabaseAdmin = getSupabaseAdminClient();

  if (!supabaseAdmin) {
    return { ok: false, error: "Supabase admin non configure." };
  }

  const { error } = await supabaseAdmin.from("ads").delete().eq("id", id);

  if (error) {
    return { ok: false, error: "Suppression impossible pour le moment." };
  }

  return { ok: true };
};

