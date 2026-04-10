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
import { devError } from "@/lib/dev-log";

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
    pageSize: 30,
    successMessage: input.successMessage,
    errorMessage: input.errorMessage,
  };
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

  let paginatedResult: Awaited<ReturnType<typeof getAdminProductsPaginated>>;
  let categoryCountMap: Awaited<ReturnType<typeof getAdminProductsCategoryCounts>>;
  try {
    [paginatedResult, categoryCountMap] = await Promise.all([
      getAdminProductsPaginated({
        categorySlug: selectedCategory || null,
        searchQuery: searchQueryRaw || null,
        page: requestedPage,
      }),
      getAdminProductsCategoryCounts(),
    ]);
  } catch (error) {
    console.error("[admin-products/page-data] Failed to load admin products page data.", {
      message: error instanceof Error ? error.message : String(error),
    });
    return createFallbackPageData({
      ...fallbackBase,
      errorMessage:
        errorMessage ||
        "Impossible de charger les produits pour le moment. Merci de reessayer.",
    });
  }

  if (!paginatedResult || !Array.isArray(paginatedResult.products)) {
    devError("[admin-products/page-data] Unexpected paginated payload shape.", {
      hasPaginatedResult: Boolean(paginatedResult),
      productsType: paginatedResult
        ? typeof (paginatedResult as { products?: unknown }).products
        : "undefined",
    });
    return createFallbackPageData({
      ...fallbackBase,
      errorMessage:
        errorMessage ||
        "Les donnees produits sont invalides. Merci de reessayer apres rafraichissement.",
    });
  }

  const productsCount = [...categoryCountMap.values()].reduce(
    (sum, value) => sum + value,
    0,
  );

  const categoryOptions = [
    ...new Set([
      ...categories.map((category) => category.slug),
      ...categoryCountMap.keys(),
    ]),
  ];

  const sortedCategoryEntries = [...categoryCountMap.entries()].sort((first, second) => {
    const firstLabel = formatCategoryLabel(first[0]);
    const secondLabel = formatCategoryLabel(second[0]);
    return firstLabel.localeCompare(secondLabel, "fr");
  });

  const groupedProductsMap = new Map<string, AdminProduct[]>();
  for (const product of paginatedResult.products) {
    const categorySlug =
      typeof product.category_slug === "string" && product.category_slug.trim().length > 0
        ? product.category_slug.trim().toLowerCase()
        : "non-classe";
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
    console.error("[admin-products/page-data] Failed to group products by category.", {
      message: error instanceof Error ? error.message : String(error),
    });
    return createFallbackPageData({
      ...fallbackBase,
      errorMessage:
        errorMessage ||
        "Impossible d'organiser les produits par categorie. Merci de reessayer.",
    });
  }

  return {
    productsCount,
    filteredProducts: paginatedResult.products,
    filteredProductsCount: paginatedResult.totalCount,
    currentPageProductsCount: paginatedResult.products.length,
    groupedProducts,
    categoryOptions,
    sortedCategoryEntries,
    selectedCategory,
    searchQuery: searchQueryRaw,
    currentPage: paginatedResult.currentPage,
    totalPages: paginatedResult.totalPages,
    pageSize: paginatedResult.pageSize,
    successMessage,
    errorMessage,
  };
};
