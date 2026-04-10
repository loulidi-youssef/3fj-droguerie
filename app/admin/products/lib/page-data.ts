import { categories } from "@/data/categories";
import {
  getAdminProductsPaginated,
  getAdminProductsCategoryCounts,
  type AdminProduct,
} from "@/lib/admin-products";
import {
  formatCategoryLabel,
  parseFlashMessage,
  parseSelectedCategory,
} from "@/app/admin/products/lib/formatters";
import { devError, devWarn } from "@/lib/dev-log";

export type AdminProductsSearchParams = {
  success?: string | string[];
  error?: string | string[];
  category?: string | string[];
  q?: string | string[];
  page?: string | string[];
};

export type ProductsGroup = {
  categorySlug: string;
  products: AdminProduct[];
};

export type AdminProductsPageData = {
  productsCount: number;
  filteredProductsCount: number;
  currentPageProductsCount: number;
  filteredProducts: AdminProduct[];
  groupedProducts: ProductsGroup[];
  categoryOptions: string[];
  sortedCategoryEntries: Array<[string, number]>;
  selectedCategory: string;
  searchQuery: string;
  currentPage: number;
  totalPages: number;
  pageSize: number;
  successMessage: string;
  errorMessage: string;
};

const DEFAULT_PAGE_SIZE = 30;
const FALLBACK_CATEGORY_SLUG = "non-classe";

const createFallbackPageData = (input: {
  selectedCategory: string;
  searchQuery: string;
  successMessage: string;
  errorMessage: string;
}): AdminProductsPageData => {
  return {
    productsCount: 0,
    filteredProductsCount: 0,
    currentPageProductsCount: 0,
    filteredProducts: [],
    groupedProducts: [],
    categoryOptions: [...new Set(categories.map((category) => category.slug))],
    sortedCategoryEntries: [],
    selectedCategory: input.selectedCategory,
    searchQuery: input.searchQuery,
    currentPage: 1,
    totalPages: 1,
    pageSize: DEFAULT_PAGE_SIZE,
    successMessage: input.successMessage,
    errorMessage: input.errorMessage,
  };
};

const logLoaderFailure = (fn: string, error: unknown, extra?: Record<string, unknown>) => {
  devError("[admin-products/page-data] Data loader failure.", {
    function: fn,
    message: error instanceof Error ? error.message : String(error),
    ...(extra ?? {}),
  });
};

const logMalformedField = (productId: string, field: string, rawValue: unknown) => {
  devWarn("[admin-products/page-data] Malformed field normalized.", {
    productId,
    field,
    rawType: rawValue === null ? "null" : typeof rawValue,
  });
};

const toSafeString = (value: unknown, fallback = ""): string => {
  if (typeof value !== "string") {
    return fallback;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : fallback;
};

const toSafeNumber = (value: unknown, fallback = 0): number => {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return fallback;
  }

  return value;
};

const toSafeStringArray = (
  value: unknown,
  options: { fallback?: string[]; productId: string; field: string },
): string[] => {
  const fallback = options.fallback ?? [];
  if (!Array.isArray(value)) {
    logMalformedField(options.productId, options.field, value);
    return fallback;
  }

  return value
    .map((entry) => (typeof entry === "string" ? entry.trim() : ""))
    .filter(Boolean);
};

const normalizeProductForPage = (product: unknown, index: number): AdminProduct => {
  if (!product || typeof product !== "object" || Array.isArray(product)) {
    const fallbackId = `unknown-product-${index + 1}`;
    logMalformedField(fallbackId, "product_row", product);
    return {
      id: fallbackId,
      slug: fallbackId,
      name: "",
      short_description: "",
      description: "",
      price: 0,
      category_slug: FALLBACK_CATEGORY_SLUG,
      stock: 0,
      bulk_price_tiers: [],
      rating: 0,
      images: [],
      is_active: false,
      created_at: "",
      updated_at: "",
      variants: [],
    };
  }

  const candidate = product as Partial<AdminProduct>;
  const fallbackId = toSafeString(candidate.id, `unknown-product-${index + 1}`);
  const name = toSafeString(candidate.name, "");
  const price = toSafeNumber(candidate.price, 0);
  const stock = toSafeNumber(candidate.stock, 0);
  const categorySlug = toSafeString(candidate.category_slug, FALLBACK_CATEGORY_SLUG).toLowerCase();
  const images = toSafeStringArray(candidate.images, {
    productId: fallbackId,
    field: "images",
  });
  const bulkPriceTiers = Array.isArray(candidate.bulk_price_tiers)
    ? candidate.bulk_price_tiers
    : [];
  const variants = Array.isArray(candidate.variants) ? candidate.variants : [];

  if (typeof candidate.name !== "string") {
    logMalformedField(fallbackId, "name", candidate.name);
  }
  if (typeof candidate.price !== "number" || !Number.isFinite(candidate.price)) {
    logMalformedField(fallbackId, "price", candidate.price);
  }
  if (typeof candidate.stock !== "number" || !Number.isFinite(candidate.stock)) {
    logMalformedField(fallbackId, "stock", candidate.stock);
  }
  if (typeof candidate.category_slug !== "string" || candidate.category_slug.trim().length === 0) {
    logMalformedField(fallbackId, "category_slug", candidate.category_slug);
  }
  if (!Array.isArray(candidate.bulk_price_tiers)) {
    logMalformedField(fallbackId, "bulk_price_tiers", candidate.bulk_price_tiers);
  }
  if (!Array.isArray(candidate.variants)) {
    logMalformedField(fallbackId, "variants", candidate.variants);
  }

  return {
    id: fallbackId,
    slug: toSafeString(candidate.slug, fallbackId),
    name,
    short_description: toSafeString(candidate.short_description, ""),
    description: toSafeString(candidate.description, ""),
    price: Math.max(0, price),
    stock: Math.max(0, Math.round(stock)),
    category_slug: categorySlug || FALLBACK_CATEGORY_SLUG,
    images,
    bulk_price_tiers: bulkPriceTiers,
    variants,
    created_at: toSafeString(candidate.created_at, ""),
    updated_at: toSafeString(candidate.updated_at, ""),
    rating: Math.max(0, Math.min(5, toSafeNumber(candidate.rating, 0))),
    is_active: Boolean(candidate.is_active),
  };
};

const getCatalogCategorySlugs = (): string[] => {
  return categories
    .map((category) => (typeof category.slug === "string" ? category.slug.trim() : ""))
    .filter(Boolean);
};

const normalizeCategoryCountMap = (value: unknown): Map<string, number> => {
  if (!(value instanceof Map)) {
    logLoaderFailure("normalizeCategoryCountMap", "category count payload is not a Map");
    return new Map();
  }

  const map = new Map<string, number>();
  for (const [rawSlug, rawCount] of value.entries()) {
    const slug = toSafeString(rawSlug, FALLBACK_CATEGORY_SLUG).toLowerCase();
    const count = Math.max(0, Math.floor(toSafeNumber(rawCount, 0)));
    map.set(slug, count);
  }

  return map;
};

const parsePage = (value: string | string[] | undefined): number => {
  const rawValue =
    typeof value === "string" ? value : Array.isArray(value) ? value[0] ?? "" : "";
  const parsed = Number(rawValue.trim());

  if (!Number.isFinite(parsed) || parsed < 1) {
    return 1;
  }

  return Math.floor(parsed);
};

export const getAdminProductsPageData = async (
  searchParams: AdminProductsSearchParams,
): Promise<AdminProductsPageData> => {
  const successMessage = parseFlashMessage(searchParams.success);
  const errorMessage = parseFlashMessage(searchParams.error);
  const selectedCategory = parseSelectedCategory(searchParams.category);
  const searchQueryRaw = parseFlashMessage(searchParams.q).trim();
  const requestedPage = parsePage(searchParams.page);

  const fallbackBase = {
    selectedCategory,
    searchQuery: searchQueryRaw,
    successMessage,
    errorMessage,
  };

  const fallbackPaginatedResult: Awaited<ReturnType<typeof getAdminProductsPaginated>> = {
    products: [],
    totalCount: 0,
    totalPages: 1,
    currentPage: 1,
    pageSize: DEFAULT_PAGE_SIZE,
  };

  let paginatedResult = fallbackPaginatedResult;
  try {
    const loaded = await getAdminProductsPaginated({
      categorySlug: selectedCategory || null,
      searchQuery: searchQueryRaw || null,
      page: requestedPage,
    });

    if (!loaded || !Array.isArray(loaded.products)) {
      logLoaderFailure(
        "getAdminProductsPageData:getAdminProductsPaginated",
        "products payload is not an array",
      );
    } else {
      paginatedResult = loaded;
    }
  } catch (error) {
    logLoaderFailure("getAdminProductsPageData:getAdminProductsPaginated", error, {
      selectedCategory,
      requestedPage,
    });
  }

  let categoryCountMap = new Map<string, number>();
  try {
    categoryCountMap = normalizeCategoryCountMap(await getAdminProductsCategoryCounts());
  } catch (error) {
    logLoaderFailure("getAdminProductsPageData:getAdminProductsCategoryCounts", error);
  }

  const normalizedProducts = Array.isArray(paginatedResult.products)
    ? paginatedResult.products.map((product, index) => normalizeProductForPage(product, index))
    : [];

  const productsCount = [...categoryCountMap.values()].reduce(
    (sum, value) => sum + value,
    0,
  );

  const categoryOptions = [
    ...new Set([
      ...getCatalogCategorySlugs(),
      ...categoryCountMap.keys(),
    ]),
  ];

  const sortedCategoryEntries = [...categoryCountMap.entries()].sort((first, second) => {
    const firstLabel = formatCategoryLabel(first[0]);
    const secondLabel = formatCategoryLabel(second[0]);
    return firstLabel.localeCompare(secondLabel, "fr");
  });

  const groupedProductsMap = new Map<string, AdminProduct[]>();
  for (const product of normalizedProducts) {
    const categorySlug = toSafeString(product.category_slug, FALLBACK_CATEGORY_SLUG).toLowerCase();
    const existing = groupedProductsMap.get(categorySlug) ?? [];
    groupedProductsMap.set(categorySlug, [...existing, product]);
  }

  let groupedProducts: ProductsGroup[] = [];
  try {
    groupedProducts = [...groupedProductsMap.entries()]
      .sort((first, second) =>
        formatCategoryLabel(first[0]).localeCompare(formatCategoryLabel(second[0]), "fr"),
      )
      .map(([categorySlug, groupProducts]) => ({
        categorySlug,
        products: groupProducts,
      }));
  } catch (error) {
    logLoaderFailure("getAdminProductsPageData:groupByCategory", error);
    return createFallbackPageData({
      ...fallbackBase,
      errorMessage:
        errorMessage ||
        "Impossible d'organiser les produits par categorie. Merci de reessayer.",
    });
  }

  return {
    productsCount,
    filteredProducts: normalizedProducts,
    filteredProductsCount: Math.max(0, Math.floor(toSafeNumber(paginatedResult.totalCount, 0))),
    currentPageProductsCount: normalizedProducts.length,
    groupedProducts,
    categoryOptions,
    sortedCategoryEntries,
    selectedCategory,
    searchQuery: searchQueryRaw,
    currentPage: Math.max(1, Math.floor(toSafeNumber(paginatedResult.currentPage, 1))),
    totalPages: Math.max(1, Math.floor(toSafeNumber(paginatedResult.totalPages, 1))),
    pageSize: Math.max(1, Math.floor(toSafeNumber(paginatedResult.pageSize, DEFAULT_PAGE_SIZE))),
    successMessage,
    errorMessage,
  };
};
