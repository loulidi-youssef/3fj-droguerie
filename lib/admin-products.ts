import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { roundDhAmount } from "@/lib/currency";

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

export type AdminProductsQueryInput = {
  categorySlug?: string | null;
  searchQuery?: string | null;
};

export type AdminProductsPaginatedQueryInput = AdminProductsQueryInput & {
  page?: number;
  pageSize?: number;
};

export type AdminProductsPaginatedResult = {
  products: AdminProduct[];
  totalCount: number;
  totalPages: number;
  currentPage: number;
  pageSize: number;
};

export type AdminProductsBulkActionType =
  | "status:active"
  | "status:inactive"
  | "stock:set"
  | "price:set";

export type AdminProductsBulkUpdateInput = {
  productIds: string[];
  actionType: AdminProductsBulkActionType;
  numericValue?: number | null;
};

export type AdminProductsBulkUpdateResult = {
  ok: boolean;
  updatedCount: number;
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

const normalizeAdminProductsQueryInput = (input?: AdminProductsQueryInput) => {
  const categorySlug = input?.categorySlug?.trim().toLowerCase() ?? "";
  const searchQuery = (input?.searchQuery?.trim() ?? "")
    .replace(/[,%()]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  return {
    categorySlug,
    searchQuery,
  };
};

const DEFAULT_ADMIN_PRODUCTS_PAGE_SIZE = 30;
const MAX_ADMIN_PRODUCTS_PAGE_SIZE = 50;

const normalizePaginationPage = (page: number | undefined): number => {
  if (!Number.isFinite(page) || !page || page < 1) {
    return 1;
  }

  return Math.floor(page);
};

const normalizePaginationPageSize = (pageSize: number | undefined): number => {
  if (!Number.isFinite(pageSize) || !pageSize || pageSize < 1) {
    return DEFAULT_ADMIN_PRODUCTS_PAGE_SIZE;
  }

  return Math.min(MAX_ADMIN_PRODUCTS_PAGE_SIZE, Math.floor(pageSize));
};

const applyAdminProductsFilters = (
  query: any,
  input?: AdminProductsQueryInput,
) => {
  const normalizedInput = normalizeAdminProductsQueryInput(input);
  let filtered = query;

  if (normalizedInput.categorySlug) {
    filtered = filtered.eq("category_slug", normalizedInput.categorySlug);
  }

  if (normalizedInput.searchQuery) {
    filtered = filtered.or(
      `name.ilike.%${normalizedInput.searchQuery}%,slug.ilike.%${normalizedInput.searchQuery}%,id.ilike.%${normalizedInput.searchQuery}%`,
    );
  }

  return filtered;
};

const attachVariantsToAdminProducts = async (
  supabaseAdmin: SupabaseAdminClient,
  products: AdminProduct[],
): Promise<AdminProduct[]> => {
  const productIds = products.map((product) => String(product.id));
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

  return products.map((product) => ({
    ...product,
    stock:
      typeof (product as { stock?: unknown }).stock === "number"
        ? ((product as { stock: number }).stock ?? 0)
        : 0,
    variants: variantsByProductId.get(product.id) ?? [],
  }));
};

const replaceAdminProductVariants = async (
  supabaseAdmin: SupabaseAdminClient,
  productId: string,
  variants: UpsertAdminProductVariantInput[],
): Promise<AdminActionResult> => {
  const { data: existingVariants, error: existingVariantsError } = await supabaseAdmin
    .from("product_variants")
    .select("id")
    .eq("product_id", productId);

  if (existingVariantsError) {
    return {
      ok: false,
      error: normalizeDatabaseError(
        existingVariantsError.message,
        "Impossible de mettre a jour les variantes.",
      ),
    };
  }

  const existingVariantIds = new Set(
    (existingVariants ?? []).map((variant) => String((variant as { id: string }).id)),
  );
  const usedVariantIds = new Set<string>();

  const payload = variants.map((variant) => {
    const requestedId = toNullableTrimmed(variant.id);
    const safeVariantId =
      requestedId && existingVariantIds.has(requestedId) && !usedVariantIds.has(requestedId)
        ? requestedId
        : crypto.randomUUID();

    usedVariantIds.add(safeVariantId);

    const normalizedPrice = roundDhAmount(variant.price);
    const requestedPreviousPrice =
      typeof variant.previousPrice === "number" ? roundDhAmount(variant.previousPrice) : null;
    const normalizedPreviousPrice =
      requestedPreviousPrice !== null && requestedPreviousPrice > normalizedPrice
        ? requestedPreviousPrice
        : null;

    return {
      id: safeVariantId,
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

  if (payload.length > 0) {
    const { error: upsertError } = await supabaseAdmin
      .from("product_variants")
      .upsert(payload, { onConflict: "id" });

    if (upsertError) {
      return {
        ok: false,
        error: normalizeDatabaseError(
          upsertError.message,
          "Impossible d'enregistrer les variantes du produit.",
        ),
      };
    }
  }

  const submittedIds = new Set(payload.map((variant) => variant.id));
  const staleVariantIds = [...existingVariantIds].filter((variantId) => !submittedIds.has(variantId));

  if (staleVariantIds.length > 0) {
    const { error: deleteStaleError } = await supabaseAdmin
      .from("product_variants")
      .delete()
      .eq("product_id", productId)
      .in("id", staleVariantIds);

    if (deleteStaleError) {
      return {
        ok: false,
        error: normalizeDatabaseError(
          deleteStaleError.message,
          "Impossible de finaliser la mise a jour des variantes.",
        ),
      };
    }
  }

  return { ok: true };
};

export const getAdminProducts = async (
  queryInput?: AdminProductsQueryInput,
): Promise<AdminProduct[]> => {
  const supabaseAdmin = getSupabaseAdminClient();

  if (!supabaseAdmin) {
    return [];
  }

  const query = applyAdminProductsFilters(
    supabaseAdmin
      .from("products")
      .select("*")
      .order("updated_at", { ascending: false }),
    queryInput,
  );

  const { data, error } = await query;

  if (error || !data) {
    return [];
  }

  return attachVariantsToAdminProducts(supabaseAdmin, data as AdminProduct[]);
};

export const getAdminProductsPaginated = async (
  queryInput?: AdminProductsPaginatedQueryInput,
): Promise<AdminProductsPaginatedResult> => {
  const supabaseAdmin = getSupabaseAdminClient();
  const requestedPage = normalizePaginationPage(queryInput?.page);
  const pageSize = normalizePaginationPageSize(queryInput?.pageSize);

  if (!supabaseAdmin) {
    return {
      products: [],
      totalCount: 0,
      totalPages: 1,
      currentPage: 1,
      pageSize,
    };
  }

  const runPageQuery = async (page: number) => {
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    return applyAdminProductsFilters(
      supabaseAdmin
        .from("products")
        .select("*", { count: "exact" })
        .order("updated_at", { ascending: false })
        .range(from, to),
      queryInput,
    );
  };

  const firstResult = await runPageQuery(requestedPage);
  if (firstResult.error || !firstResult.data) {
    return {
      products: [],
      totalCount: 0,
      totalPages: 1,
      currentPage: 1,
      pageSize,
    };
  }

  const totalCount = Math.max(0, firstResult.count ?? 0);
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const currentPage = Math.min(requestedPage, totalPages);

  let pageRows = firstResult.data as AdminProduct[];
  if (currentPage !== requestedPage) {
    const fallbackResult = await runPageQuery(currentPage);
    if (fallbackResult.error || !fallbackResult.data) {
      return {
        products: [],
        totalCount: 0,
        totalPages: 1,
        currentPage: 1,
        pageSize,
      };
    }
    pageRows = fallbackResult.data as AdminProduct[];
  }

  const products = await attachVariantsToAdminProducts(supabaseAdmin, pageRows);

  return {
    products,
    totalCount,
    totalPages,
    currentPage,
    pageSize,
  };
};

export const getAdminProductsCategoryCounts = async (): Promise<Map<string, number>> => {
  const supabaseAdmin = getSupabaseAdminClient();

  if (!supabaseAdmin) {
    return new Map();
  }

  const { data, error } = await supabaseAdmin
    .from("products")
    .select("category_slug")
    .order("updated_at", { ascending: false });

  if (error || !data) {
    return new Map();
  }

  const counts = new Map<string, number>();
  for (const row of data as Array<{ category_slug: string }>) {
    const slug = row.category_slug?.trim().toLowerCase();
    if (!slug) {
      continue;
    }
    counts.set(slug, (counts.get(slug) ?? 0) + 1);
  }

  return counts;
};

const parseUniqueProductIds = (productIds: string[]): string[] => {
  return [...new Set(productIds.map((value) => value.trim()).filter(Boolean))];
};

export const bulkUpdateAdminProducts = async (
  input: AdminProductsBulkUpdateInput,
): Promise<AdminProductsBulkUpdateResult> => {
  const supabaseAdmin = getSupabaseAdminClient();
  if (!supabaseAdmin) {
    return {
      ok: false,
      updatedCount: 0,
      error: "Supabase admin non configure.",
    };
  }

  const productIds = parseUniqueProductIds(input.productIds);
  if (productIds.length === 0) {
    return {
      ok: false,
      updatedCount: 0,
      error: "Selection vide. Choisissez au moins un produit.",
    };
  }

  const actionType = input.actionType;
  if (
    actionType !== "status:active" &&
    actionType !== "status:inactive" &&
    actionType !== "stock:set" &&
    actionType !== "price:set"
  ) {
    return {
      ok: false,
      updatedCount: 0,
      error: "Action bulk invalide.",
    };
  }

  if (actionType === "status:active" || actionType === "status:inactive") {
    const { data, error } = await supabaseAdmin
      .from("products")
      .update({ is_active: actionType === "status:active" })
      .in("id", productIds)
      .select("id");

    if (error) {
      return {
        ok: false,
        updatedCount: 0,
        error: normalizeDatabaseError(
          error.message,
          "Mise a jour bulk du statut impossible.",
        ),
      };
    }

    const updatedCount = data?.length ?? 0;
    if (updatedCount !== productIds.length) {
      return {
        ok: false,
        updatedCount,
        error:
          "Mise a jour partielle detectee. Rafraichissez la page et reessayez.",
      };
    }

    return { ok: true, updatedCount };
  }

  if (!Number.isFinite(input.numericValue)) {
    return {
      ok: false,
      updatedCount: 0,
      error: "Valeur numerique manquante pour l'action bulk.",
    };
  }

  if (actionType === "stock:set") {
    const normalizedStock = Math.floor(input.numericValue!);
    if (normalizedStock < 0) {
      return {
        ok: false,
        updatedCount: 0,
        error: "Le stock doit etre superieur ou egal a 0.",
      };
    }

    const { data, error } = await supabaseAdmin
      .from("products")
      .update({ stock: normalizedStock })
      .in("id", productIds)
      .select("id");

    if (error) {
      return {
        ok: false,
        updatedCount: 0,
        error: normalizeDatabaseError(
          error.message,
          "Mise a jour bulk du stock impossible.",
        ),
      };
    }

    const updatedCount = data?.length ?? 0;
    if (updatedCount !== productIds.length) {
      return {
        ok: false,
        updatedCount,
        error:
          "Mise a jour partielle detectee. Rafraichissez la page et reessayez.",
      };
    }

    return { ok: true, updatedCount };
  }

  const normalizedPrice = roundDhAmount(input.numericValue!);
  if (!Number.isFinite(normalizedPrice) || normalizedPrice <= 0) {
    return {
      ok: false,
      updatedCount: 0,
      error: "Le prix doit etre superieur a 0.",
    };
  }

  const { data, error } = await supabaseAdmin
    .from("products")
    .update({ price: normalizedPrice })
    .in("id", productIds)
    .select("id");

  if (error) {
    return {
      ok: false,
      updatedCount: 0,
      error: normalizeDatabaseError(
        error.message,
        "Mise a jour bulk du prix impossible.",
      ),
    };
  }

  const updatedCount = data?.length ?? 0;
  if (updatedCount !== productIds.length) {
    return {
      ok: false,
      updatedCount,
      error: "Mise a jour partielle detectee. Rafraichissez la page et reessayez.",
    };
  }

  return { ok: true, updatedCount };
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
    price: roundDhAmount(input.price),
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
      price: roundDhAmount(input.price),
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
