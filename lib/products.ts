import { products as fallbackProducts } from "@/data/products";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import type { Product, ProductVariant } from "@/types";

type ProductRow = {
  id: string;
  slug: string;
  name: string;
  price: number;
  previous_price?: number | null;
  stock?: number | null;
  short_description: string;
  description: string;
  category_slug: string;
  rating: number;
  images: string[];
  created_at?: string | null;
};

type ProductVariantRow = {
  id: string;
  product_id: string;
  color?: string | null;
  size?: string | null;
  price: number;
  previous_price?: number | null;
  stock?: number | null;
  sku?: string | null;
  image?: string | null;
  is_active: boolean;
  created_at?: string | null;
  updated_at?: string | null;
};

const PRODUCT_SELECT = "*";

const mapProductRow = (row: ProductRow): Product => ({
  id: row.id,
  slug: row.slug,
  name: row.name,
  price: row.price,
  previousPrice:
    typeof row.previous_price === "number" && row.previous_price > row.price
      ? row.previous_price
      : undefined,
  stock: typeof row.stock === "number" ? row.stock : undefined,
  shortDescription: row.short_description,
  description: row.description,
  categorySlug: row.category_slug,
  rating: row.rating,
  images: row.images,
  createdAt: row.created_at ?? undefined,
});

const mapProductVariantRow = (row: ProductVariantRow): ProductVariant => ({
  id: row.id,
  productId: row.product_id,
  color: row.color ?? null,
  size: row.size ?? null,
  price: row.price,
  previousPrice:
    typeof row.previous_price === "number" && row.previous_price > row.price
      ? row.previous_price
      : undefined,
  stock: typeof row.stock === "number" ? row.stock : undefined,
  sku: row.sku ?? null,
  image: row.image ?? null,
  isActive: row.is_active,
  createdAt: row.created_at ?? undefined,
  updatedAt: row.updated_at ?? undefined,
});

const withVariants = async (
  products: Product[],
): Promise<Product[]> => {
  if (products.length === 0) {
    return products;
  }

  const supabase = getSupabaseServerClient();
  if (!supabase) {
    return products;
  }

  const productIds = products.map((product) => product.id);
  const { data, error } = await supabase
    .from("product_variants")
    .select("*")
    .in("product_id", productIds)
    .eq("is_active", true)
    .order("created_at", { ascending: true });

  if (error || !data) {
    return products;
  }

  const variantsByProductId = new Map<string, ProductVariant[]>();

  for (const row of data as ProductVariantRow[]) {
    const mapped = mapProductVariantRow(row);
    const existing = variantsByProductId.get(mapped.productId) ?? [];
    variantsByProductId.set(mapped.productId, [...existing, mapped]);
  }

  return products.map((product) => ({
    ...product,
    variants: variantsByProductId.get(product.id) ?? [],
  }));
};

const getFallbackProducts = (): Product[] => {
  return [...fallbackProducts].sort((first, second) =>
    first.name.localeCompare(second.name),
  );
};

export const getAllProducts = async (): Promise<Product[]> => {
  const supabase = getSupabaseServerClient();

  if (!supabase) {
    return getFallbackProducts();
  }

  const { data, error } = await supabase
    .from("products")
    .select(PRODUCT_SELECT)
    .eq("is_active", true)
    .order("name", { ascending: true });

  if (error || !data || data.length === 0) {
    return getFallbackProducts();
  }

  const mapped = data.map((row) => mapProductRow(row as ProductRow));
  return withVariants(mapped);
};

export const getProductBySlug = async (slug: string): Promise<Product | undefined> => {
  const trimmedSlug = slug.trim();
  if (!trimmedSlug) {
    return undefined;
  }

  const supabase = getSupabaseServerClient();

  if (supabase) {
    const { data, error } = await supabase
      .from("products")
      .select(PRODUCT_SELECT)
      .eq("slug", trimmedSlug)
      .eq("is_active", true)
      .maybeSingle();

    if (!error && data) {
      const [productWithVariants] = await withVariants([mapProductRow(data as ProductRow)]);
      return productWithVariants;
    }
  }

  return getFallbackProducts().find((product) => product.slug === trimmedSlug);
};

export const getProductsByIds = async (ids: string[]): Promise<Product[]> => {
  const uniqueIds = [...new Set(ids.map((id) => id.trim()).filter(Boolean))];

  if (uniqueIds.length === 0) {
    return [];
  }

  const supabase = getSupabaseServerClient();

  if (supabase) {
    const { data, error } = await supabase
      .from("products")
      .select(PRODUCT_SELECT)
      .in("id", uniqueIds)
      .eq("is_active", true);

    if (!error && data) {
      const mappedWithVariants = await withVariants(
        data.map((row) => mapProductRow(row as ProductRow)),
      );
      const byId = new Map(mappedWithVariants.map((product) => [product.id, product]));
      return uniqueIds
        .map((id) => byId.get(id))
        .filter((product): product is Product => Boolean(product));
    }
  }

  const fallbackById = new Map(getFallbackProducts().map((product) => [product.id, product]));
  return uniqueIds
    .map((id) => fallbackById.get(id))
    .filter((product): product is Product => Boolean(product));
};
