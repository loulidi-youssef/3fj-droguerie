import { getSupabaseAdminClient } from "@/lib/supabase/admin";

type SupabaseAdminClient = NonNullable<ReturnType<typeof getSupabaseAdminClient>>;

export type AdminProductVariant = {
  id: string;
  product_id: string;
  color: string | null;
  size: string | null;
  price: number;
  previous_price: number | null;
  stock: number;
  sku: string | null;
  image: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

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
  variants: AdminProductVariant[];
};

export type UpsertAdminProductVariantInput = {
  id?: string;
  color?: string | null;
  size?: string | null;
  price: number;
  previousPrice?: number | null;
  stock: number;
  sku?: string | null;
  image?: string | null;
  isActive: boolean;
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
  variants?: UpsertAdminProductVariantInput[];
};

type AdminActionResult = {
  ok: boolean;
  error?: string;
};

const toNullableTrimmed = (value: string | null | undefined): string | null => {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const normalizeDatabaseError = (
  message: string | undefined,
  fallbackMessage: string,
): string => {
  if (!message) {
    return fallbackMessage;
  }

  if (message.includes("products_stock_check") || message.includes("product_variants_stock_check")) {
    return "Le stock doit etre superieur ou egal a 0.";
  }

  if (message.includes("products_price_check") || message.includes("product_variants_price_check")) {
    return "Le prix doit etre superieur a 0.";
  }

  if (message.includes("product_variants_previous_price_check")) {
    return "Le prix precedent d'une variante doit etre superieur a son prix.";
  }

  if (message.includes("product_variants_color_or_size_check")) {
    return "Chaque variante doit avoir au moins une couleur ou une taille.";
  }

  if (message.includes("duplicate key value")) {
    return "Ce slug existe deja. Choisissez un slug unique.";
  }

  if (message.includes("stock") && message.includes("does not exist")) {
    return "La colonne stock est manquante. Lancez supabase/migrations/2026-04-04-add-stock-to-products.sql.";
  }

  if (message.includes("product_variants") && message.includes("does not exist")) {
    return "La table product_variants est manquante. Lancez la migration de variantes.";
  }

  return fallbackMessage;
};

const replaceAdminProductVariants = async (
  supabaseAdmin: SupabaseAdminClient,
  productId: string,
  variants: UpsertAdminProductVariantInput[],
): Promise<AdminActionResult> => {
  const { error: deleteError } = await supabaseAdmin
    .from("product_variants")
    .delete()
    .eq("product_id", productId);

  if (deleteError) {
    return {
      ok: false,
      error: normalizeDatabaseError(
        deleteError.message,
        "Impossible de mettre a jour les variantes.",
      ),
    };
  }

  if (variants.length === 0) {
    return { ok: true };
  }

  const payload = variants.map((variant) => {
    const normalizedPrice = Math.round(variant.price);
    const normalizedPreviousPrice =
      typeof variant.previousPrice === "number" && variant.previousPrice > normalizedPrice
        ? Math.round(variant.previousPrice)
        : null;

    return {
      id: toNullableTrimmed(variant.id) ?? crypto.randomUUID(),
      product_id: productId,
      color: toNullableTrimmed(variant.color ?? null),
      size: toNullableTrimmed(variant.size ?? null),
      price: normalizedPrice,
      previous_price: normalizedPreviousPrice,
      stock: Math.max(0, Math.round(variant.stock)),
      sku: toNullableTrimmed(variant.sku ?? null),
      image: toNullableTrimmed(variant.image ?? null),
      is_active: variant.isActive,
    };
  });

  const { error: insertError } = await supabaseAdmin.from("product_variants").insert(payload);

  if (insertError) {
    return {
      ok: false,
      error: normalizeDatabaseError(
        insertError.message,
        "Impossible d'enregistrer les variantes du produit.",
      ),
    };
  }

  return { ok: true };
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

  const productIds = data.map((product) => String((product as { id: string }).id));
  const variantsByProductId = new Map<string, AdminProductVariant[]>();

  if (productIds.length > 0) {
    const { data: variantsData, error: variantsError } = await supabaseAdmin
      .from("product_variants")
      .select("*")
      .in("product_id", productIds)
      .order("created_at", { ascending: true });

    if (!variantsError && variantsData) {
      for (const variant of variantsData as AdminProductVariant[]) {
        const existing = variantsByProductId.get(variant.product_id) ?? [];
        variantsByProductId.set(variant.product_id, [...existing, variant]);
      }
    }
  }

  return data.map((product) => {
    const normalizedProduct = product as AdminProduct;

    return {
      ...normalizedProduct,
      stock:
        typeof (product as { stock?: unknown }).stock === "number"
          ? ((product as { stock: number }).stock ?? 0)
          : 0,
      variants: variantsByProductId.get(normalizedProduct.id) ?? [],
    };
  });
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

  const variantsResult = await replaceAdminProductVariants(
    supabaseAdmin,
    id,
    input.variants ?? [],
  );

  if (!variantsResult.ok) {
    await supabaseAdmin.from("products").delete().eq("id", id);
    return variantsResult;
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

  const variantsResult = await replaceAdminProductVariants(
    supabaseAdmin,
    id,
    input.variants ?? [],
  );

  if (!variantsResult.ok) {
    return variantsResult;
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
