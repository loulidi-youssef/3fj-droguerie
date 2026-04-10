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

  const [paginatedResult, categoryCountMap] = await Promise.all([
    getAdminProductsPaginated({
      categorySlug: selectedCategory || null,
      searchQuery: searchQueryRaw || null,
      page: requestedPage,
    }),
    getAdminProductsCategoryCounts(),
  ]);

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

  const groupedProducts = [...groupedProductsMap.entries()]
    .sort((first, second) =>
      formatCategoryLabel(first[0]).localeCompare(formatCategoryLabel(second[0]), "fr"),
    )
    .map(([categorySlug, groupProducts]) => ({
      categorySlug,
      products: groupProducts,
    }));

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
