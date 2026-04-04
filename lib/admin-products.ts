import { getSupabaseAdminClient } from "@/lib/supabase/admin";

export type AdminProduct = {
  id: string;
  slug: string;
  name: string;
  short_description: string;
  description: string;
  price: number;
  category_slug: string;
  stock: number;
  rating: number;
  images: string[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type UpsertAdminProductInput = {
  id?: string;
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

  if (message.includes("products_stock_check")) {
    return "Le stock doit etre superieur ou egal a 0.";
  }

  if (message.includes("products_price_check")) {
    return "Le prix doit etre superieur a 0.";
  }

  if (message.includes("duplicate key value")) {
    return "Ce slug existe deja. Choisissez un slug unique.";
  }

  if (message.includes("stock") && message.includes("does not exist")) {
    return "La colonne stock est manquante. Lancez supabase/migrations/2026-04-04-add-stock-to-products.sql.";
  }

  return fallbackMessage;
};

export const getAdminProducts = async (): Promise<AdminProduct[]> => {
  const supabaseAdmin = getSupabaseAdminClient();

  if (!supabaseAdmin) {
    return [];
  }

  const { data, error } = await supabaseAdmin
    .from("products")
    .select("*")
    .order("updated_at", { ascending: false });

  if (error || !data) {
    return [];
  }

  return data.map((product) => ({
    ...product,
    stock:
      typeof (product as { stock?: unknown }).stock === "number"
        ? ((product as { stock: number }).stock ?? 0)
        : 0,
  })) as AdminProduct[];
};

export const createAdminProduct = async (
  input: UpsertAdminProductInput,
): Promise<AdminActionResult> => {
  const supabaseAdmin = getSupabaseAdminClient();

  if (!supabaseAdmin) {
    return { ok: false, error: "Supabase admin non configure." };
  }

  const id = input.id?.trim() || input.slug.trim();

  const { error } = await supabaseAdmin.from("products").insert({
    id,
    slug: input.slug.trim(),
    name: input.name.trim(),
    short_description: input.shortDescription.trim(),
    description: input.description.trim(),
    price: input.price,
    category_slug: input.categorySlug.trim(),
    stock: input.stock,
    rating: input.rating,
    images: input.images,
    is_active: input.isActive,
  });

  if (error) {
    return {
      ok: false,
      error: normalizeDatabaseError(error.message, "Impossible d'ajouter le produit."),
    };
  }

  return { ok: true };
};

export const updateAdminProduct = async (
  id: string,
  input: UpsertAdminProductInput,
): Promise<AdminActionResult> => {
  const supabaseAdmin = getSupabaseAdminClient();

  if (!supabaseAdmin) {
    return { ok: false, error: "Supabase admin non configure." };
  }

  const { error } = await supabaseAdmin
    .from("products")
    .update({
      slug: input.slug.trim(),
      name: input.name.trim(),
      short_description: input.shortDescription.trim(),
      description: input.description.trim(),
      price: input.price,
      category_slug: input.categorySlug.trim(),
      stock: input.stock,
      rating: input.rating,
      images: input.images,
      is_active: input.isActive,
    })
    .eq("id", id);

  if (error) {
    return {
      ok: false,
      error: normalizeDatabaseError(error.message, "Impossible de modifier le produit."),
    };
  }

  return { ok: true };
};

export const setAdminProductActiveState = async (
  id: string,
  isActive: boolean,
): Promise<AdminActionResult> => {
  const supabaseAdmin = getSupabaseAdminClient();

  if (!supabaseAdmin) {
    return { ok: false, error: "Supabase admin non configure." };
  }

  const { error } = await supabaseAdmin
    .from("products")
    .update({ is_active: isActive })
    .eq("id", id);

  if (error) {
    return { ok: false, error: "Impossible de changer le statut du produit." };
  }

  return { ok: true };
};

export const deleteAdminProduct = async (id: string): Promise<AdminActionResult> => {
  const supabaseAdmin = getSupabaseAdminClient();

  if (!supabaseAdmin) {
    return { ok: false, error: "Supabase admin non configure." };
  }

  const { error } = await supabaseAdmin.from("products").delete().eq("id", id);

  if (error) {
    return {
      ok: false,
      error:
        "Suppression impossible. Ce produit est peut-etre utilise dans des commandes. Vous pouvez le desactiver.",
    };
  }

  return { ok: true };
};
