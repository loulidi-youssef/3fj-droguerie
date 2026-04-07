import type { SupabaseClient } from "@supabase/supabase-js";
import { products as fallbackProducts } from "@/data/products";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { TransactionDataUnavailableError } from "@/lib/transaction-data";
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
const PRODUCT_SEARCH_SELECT = "id, slug, name";

export type ProductSearchSuggestion = {
  id: string;
  slug: string;
  name: string;
};

export type ProductListingSortOption =
  | "defaut"
  | "prix-asc"
  | "prix-desc"
  | "nouveaux";

export type ProductListingQueryInput = {
  categorySlug?: string | null;
  searchQuery?: string | null;
  sort?: ProductListingSortOption;
  page?: number;
  pageSize?: number;
};

export type ProductListingResult = {
  products: Product[];
  totalCount: number;
  totalPages: number;
  currentPage: number;
};

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

const mapVariantsByProductId = (rows: ProductVariantRow[]): Map<string, ProductVariant[]> => {
  const variantsByProductId = new Map<string, ProductVariant[]>();

  for (const row of rows) {
    const mapped = mapProductVariantRow(row);
    const existing = variantsByProductId.get(mapped.productId) ?? [];
    variantsByProductId.set(mapped.productId, [...existing, mapped]);
  }

  return variantsByProductId;
};

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

  const variantsByProductId = mapVariantsByProductId(data as ProductVariantRow[]);

  return products.map((product) => ({
    ...product,
    variants: variantsByProductId.get(product.id) ?? [],
  }));
};

const withVariantsStrict = async (
  products: Product[],
  supabase: SupabaseClient,
): Promise<Product[]> => {
  if (products.length === 0) {
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
    throw new TransactionDataUnavailableError(
      "PRODUCT_VARIANTS_DB_READ_FAILED",
      "Impossible de charger les variantes produits depuis la base de donnees.",
    );
  }

  const variantsByProductId = mapVariantsByProductId(data as ProductVariantRow[]);

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

const getFallbackProductSearchSuggestions = (): ProductSearchSuggestion[] => {
  return getFallbackProducts().map((product) => ({
    id: product.id,
    slug: product.slug,
    name: product.name,
  }));
};

const DEFAULT_PRODUCTS_PAGE_SIZE = 24;
const MAX_PRODUCTS_PAGE_SIZE = 60;

const normalizeListingSort = (
  sort: ProductListingSortOption | undefined,
): ProductListingSortOption => {
  if (
    sort === "prix-asc" ||
    sort === "prix-desc" ||
    sort === "nouveaux"
  ) {
    return sort;
  }

  return "defaut";
};

const normalizeListingPage = (page: number | undefined): number => {
  if (!Number.isFinite(page) || !page || page < 1) {
    return 1;
  }

  return Math.floor(page);
};

const normalizeListingPageSize = (pageSize: number | undefined): number => {
  if (!Number.isFinite(pageSize) || !pageSize || pageSize < 1) {
    return DEFAULT_PRODUCTS_PAGE_SIZE;
  }

  return Math.min(MAX_PRODUCTS_PAGE_SIZE, Math.floor(pageSize));
};

const sortProductsForListing = (
  products: Product[],
  sort: ProductListingSortOption,
): Product[] => {
  const sortable = [...products];

  if (sort === "prix-asc") {
    sortable.sort((first, second) => first.price - second.price);
    return sortable;
  }

  if (sort === "prix-desc") {
    sortable.sort((first, second) => second.price - first.price);
    return sortable;
  }

  if (sort === "nouveaux") {
    sortable.sort((first, second) => {
      const firstTime = first.createdAt ? new Date(first.createdAt).getTime() : 0;
      const secondTime = second.createdAt ? new Date(second.createdAt).getTime() : 0;
      return secondTime - firstTime;
    });
    return sortable;
  }

  sortable.sort((first, second) => first.name.localeCompare(second.name, "fr"));
  return sortable;
};

const getFallbackProductsListingResult = (
  input: ProductListingQueryInput,
): ProductListingResult => {
  const normalizedCategory = input.categorySlug?.trim().toLowerCase() ?? "";
  const normalizedQuery = input.searchQuery?.trim().toLowerCase() ?? "";
  const normalizedSort = normalizeListingSort(input.sort);
  const requestedPage = normalizeListingPage(input.page);
  const pageSize = normalizeListingPageSize(input.pageSize);

  const filtered = getFallbackProducts().filter((product) => {
    const matchesCategory = normalizedCategory
      ? product.categorySlug.trim().toLowerCase() === normalizedCategory
      : true;
    const matchesSearch = normalizedQuery
      ? product.name.toLowerCase().includes(normalizedQuery)
      : true;
    return matchesCategory && matchesSearch;
  });

  const sorted = sortProductsForListing(filtered, normalizedSort);
  const totalCount = sorted.length;
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const currentPage = Math.min(requestedPage, totalPages);
  const pageStart = (currentPage - 1) * pageSize;
  const products = sorted.slice(pageStart, pageStart + pageSize);

  return {
    products,
    totalCount,
    totalPages,
    currentPage,
  };
};

const runSupabaseProductsListingQuery = async (
  supabase: SupabaseClient,
  input: {
    categorySlug: string;
    searchQuery: string;
    sort: ProductListingSortOption;
    page: number;
    pageSize: number;
  },
) => {
  let query = supabase
    .from("products")
    .select(PRODUCT_SELECT, { count: "exact" })
    .eq("is_active", true);

  if (input.categorySlug) {
    query = query.eq("category_slug", input.categorySlug);
  }

  if (input.searchQuery) {
    query = query.ilike("name", `%${input.searchQuery}%`);
  }

  if (input.sort === "prix-asc") {
    query = query.order("price", { ascending: true }).order("name", { ascending: true });
  } else if (input.sort === "prix-desc") {
    query = query.order("price", { ascending: false }).order("name", { ascending: true });
  } else if (input.sort === "nouveaux") {
    query = query
      .order("created_at", { ascending: false, nullsFirst: false })
      .order("name", { ascending: true });
  } else {
    query = query.order("name", { ascending: true });
  }

  const from = (input.page - 1) * input.pageSize;
  const to = from + input.pageSize - 1;
  return query.range(from, to);
};

export const getAllProductSearchSuggestions = async (): Promise<
  ProductSearchSuggestion[]
> => {
  const supabase = getSupabaseServerClient();

  if (!supabase) {
    return getFallbackProductSearchSuggestions();
  }

  const { data, error } = await supabase
    .from("products")
    .select(PRODUCT_SEARCH_SELECT)
    .eq("is_active", true)
    .order("name", { ascending: true });

  if (error || !data || data.length === 0) {
    return getFallbackProductSearchSuggestions();
  }

  return (data as Array<{ id: string; slug: string; name: string }>).map((row) => ({
    id: row.id,
    slug: row.slug,
    name: row.name,
  }));
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

export const getProductsListing = async (
  input: ProductListingQueryInput,
): Promise<ProductListingResult> => {
  const normalizedCategorySlug = input.categorySlug?.trim().toLowerCase() ?? "";
  const normalizedSearchQuery = input.searchQuery?.trim() ?? "";
  const normalizedSort = normalizeListingSort(input.sort);
  const requestedPage = normalizeListingPage(input.page);
  const pageSize = normalizeListingPageSize(input.pageSize);
  const supabase = getSupabaseServerClient();

  if (!supabase) {
    return getFallbackProductsListingResult({
      categorySlug: normalizedCategorySlug,
      searchQuery: normalizedSearchQuery,
      sort: normalizedSort,
      page: requestedPage,
      pageSize,
    });
  }

  const firstAttempt = await runSupabaseProductsListingQuery(supabase, {
    categorySlug: normalizedCategorySlug,
    searchQuery: normalizedSearchQuery,
    sort: normalizedSort,
    page: requestedPage,
    pageSize,
  });

  if (firstAttempt.error || !firstAttempt.data) {
    return getFallbackProductsListingResult({
      categorySlug: normalizedCategorySlug,
      searchQuery: normalizedSearchQuery,
      sort: normalizedSort,
      page: requestedPage,
      pageSize,
    });
  }

  const totalCount = Math.max(0, firstAttempt.count ?? 0);
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const currentPage = Math.min(requestedPage, totalPages);
  let listingRows: ProductRow[] = firstAttempt.data as ProductRow[];

  if (currentPage !== requestedPage) {
    const fallbackPageQuery = await runSupabaseProductsListingQuery(supabase, {
      categorySlug: normalizedCategorySlug,
      searchQuery: normalizedSearchQuery,
      sort: normalizedSort,
      page: currentPage,
      pageSize,
    });

    if (fallbackPageQuery.error || !fallbackPageQuery.data) {
      return getFallbackProductsListingResult({
        categorySlug: normalizedCategorySlug,
        searchQuery: normalizedSearchQuery,
        sort: normalizedSort,
        page: requestedPage,
        pageSize,
      });
    }

    listingRows = fallbackPageQuery.data as ProductRow[];
  }

  const mappedProducts = listingRows.map((row) => mapProductRow(row));
  const products = await withVariants(mappedProducts);

  return {
    products,
    totalCount,
    totalPages,
    currentPage,
  };
};

export const getAllProductsStrict = async (): Promise<Product[]> => {
  const supabase = getSupabaseServerClient();

  if (!supabase) {
    throw new TransactionDataUnavailableError(
      "PRODUCTS_DB_UNAVAILABLE",
      "Lecture produits indisponible: client base de donnees non configure.",
    );
  }

  const { data, error } = await supabase
    .from("products")
    .select(PRODUCT_SELECT)
    .eq("is_active", true)
    .order("name", { ascending: true });

  if (error || !data) {
    throw new TransactionDataUnavailableError(
      "PRODUCTS_DB_READ_FAILED",
      "Impossible de charger les produits actifs depuis la base de donnees.",
    );
  }

  const mapped = data.map((row) => mapProductRow(row as ProductRow));
  return withVariantsStrict(mapped, supabase);
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

export const getProductsByIdsStrict = async (ids: string[]): Promise<Product[]> => {
  const uniqueIds = [...new Set(ids.map((id) => id.trim()).filter(Boolean))];

  if (uniqueIds.length === 0) {
    return [];
  }

  const supabase = getSupabaseServerClient();

  if (!supabase) {
    throw new TransactionDataUnavailableError(
      "PRODUCTS_DB_UNAVAILABLE",
      "Lecture produits indisponible: client base de donnees non configure.",
    );
  }

  const { data, error } = await supabase
    .from("products")
    .select(PRODUCT_SELECT)
    .in("id", uniqueIds)
    .eq("is_active", true);

  if (error || !data) {
    throw new TransactionDataUnavailableError(
      "PRODUCTS_DB_READ_FAILED",
      "Impossible de charger les produits demandes depuis la base de donnees.",
    );
  }

  const mappedWithVariants = await withVariantsStrict(
    data.map((row) => mapProductRow(row as ProductRow)),
    supabase,
  );
  const byId = new Map(mappedWithVariants.map((product) => [product.id, product]));

  return uniqueIds
    .map((id) => byId.get(id))
    .filter((product): product is Product => Boolean(product));
};
