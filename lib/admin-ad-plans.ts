import { getSupabaseAdminClient } from "@/lib/supabase/admin";

export type AdminAdPlan = {
  id: string;
  name: string;
  description: string | null;
  position: "top" | "middle";
  duration_days: number;
  price: number;
  is_active: boolean;
  created_at: string;
};

export type UpsertAdminAdPlanInput = {
  name: string;
  description: string | null;
  position: "top" | "middle";
  durationDays: number;
  price: number;
  isActive: boolean;
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

  if (message.includes("ad_plans_position_check")) {
    return "La position du plan doit etre top ou middle.";
  }

  if (message.includes("ad_plans_duration_days_check")) {
    return "La duree du plan doit etre superieure a 0 jour.";
  }

  if (message.includes("ad_plans_price_check")) {
    return "Le prix du plan doit etre superieur ou egal a 0.";
  }

  if (message.includes('relation "ad_plans" does not exist')) {
    return "La table ad_plans est manquante. Lancez la migration monetisation ads.";
  }

  return fallbackMessage;
};

export const getAdminAdPlans = async (): Promise<AdminAdPlan[]> => {
  const supabaseAdmin = getSupabaseAdminClient();
  if (!supabaseAdmin) {
    return [];
  }

  const { data, error } = await supabaseAdmin
    .from("ad_plans")
    .select("id, name, description, position, duration_days, price, is_active, created_at")
    .order("created_at", { ascending: false });

  if (error || !data) {
    return [];
  }

  return data as AdminAdPlan[];
};

export const createAdminAdPlan = async (
  input: UpsertAdminAdPlanInput,
): Promise<AdminActionResult> => {
  const supabaseAdmin = getSupabaseAdminClient();
  if (!supabaseAdmin) {
    return { ok: false, error: "Supabase admin non configure." };
  }

  const { error } = await supabaseAdmin.from("ad_plans").insert({
    name: input.name.trim(),
    description: input.description,
    position: input.position,
    duration_days: input.durationDays,
    price: input.price,
    is_active: input.isActive,
  });

  if (error) {
    return {
      ok: false,
      error: normalizeDatabaseError(error.message, "Impossible d'ajouter le plan publicitaire."),
    };
  }

  return { ok: true };
};

export const updateAdminAdPlan = async (
  id: string,
  input: UpsertAdminAdPlanInput,
): Promise<AdminActionResult> => {
  const supabaseAdmin = getSupabaseAdminClient();
  if (!supabaseAdmin) {
    return { ok: false, error: "Supabase admin non configure." };
  }

  const { error } = await supabaseAdmin
    .from("ad_plans")
    .update({
      name: input.name.trim(),
      description: input.description,
      position: input.position,
      duration_days: input.durationDays,
      price: input.price,
      is_active: input.isActive,
    })
    .eq("id", id);

  if (error) {
    return {
      ok: false,
      error: normalizeDatabaseError(error.message, "Impossible de modifier le plan publicitaire."),
    };
  }

  return { ok: true };
};

export const deleteAdminAdPlan = async (id: string): Promise<AdminActionResult> => {
  const supabaseAdmin = getSupabaseAdminClient();
  if (!supabaseAdmin) {
    return { ok: false, error: "Supabase admin non configure." };
  }

  const { error } = await supabaseAdmin.from("ad_plans").delete().eq("id", id);

  if (error) {
    return {
      ok: false,
      error: normalizeDatabaseError(error.message, "Suppression du plan impossible pour le moment."),
    };
  }

  return { ok: true };
};

export const setAdminAdPlanActiveState = async (
  id: string,
  isActive: boolean,
): Promise<AdminActionResult> => {
  const supabaseAdmin = getSupabaseAdminClient();
  if (!supabaseAdmin) {
    return { ok: false, error: "Supabase admin non configure." };
  }

  const { error } = await supabaseAdmin
    .from("ad_plans")
    .update({ is_active: isActive })
    .eq("id", id);

  if (error) {
    return {
      ok: false,
      error: normalizeDatabaseError(error.message, "Impossible de changer le statut du plan."),
    };
  }

  return { ok: true };
};
