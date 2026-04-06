import { categories } from "@/data/categories";
import { getAdminProducts, type AdminProduct } from "@/lib/admin-products";
import {
  formatCategoryLabel,
  parseFlashMessage,
  parseSelectedCategory,
} from "@/app/admin/products/lib/formatters";

export type AdminProductsSearchParams = {
  success?: string | string[];
  error?: string | string[];
  category?: string | string[];
};

export type ProductsGroup = {
  categorySlug: string;
  products: AdminProduct[];
};

export type AdminProductsPageData = {
  products: AdminProduct[];
  filteredProducts: AdminProduct[];
  groupedProducts: ProductsGroup[];
  categoryOptions: string[];
  sortedCategoryEntries: Array<[string, number]>;
  selectedCategory: string;
  successMessage: string;
  errorMessage: string;
};

export const getAdminProductsPageData = async (
  searchParams: AdminProductsSearchParams,
): Promise<AdminProductsPageData> => {
  const products = await getAdminProducts();
  const successMessage = parseFlashMessage(searchParams.success);
  const errorMessage = parseFlashMessage(searchParams.error);
  const selectedCategory = parseSelectedCategory(searchParams.category);

  const categoryCountMap = new Map<string, number>();
  for (const product of products) {
    const slug = product.category_slug.trim().toLowerCase();
    categoryCountMap.set(slug, (categoryCountMap.get(slug) ?? 0) + 1);
  }

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

  const filteredProducts = selectedCategory
    ? products.filter(
        (product) => product.category_slug.trim().toLowerCase() === selectedCategory,
      )
    : products;

  const groupedProductsMap = new Map<string, AdminProduct[]>();
  for (const product of filteredProducts) {
    const categorySlug = product.category_slug.trim().toLowerCase();
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
    products,
    filteredProducts,
    groupedProducts,
    categoryOptions,
    sortedCategoryEntries,
    selectedCategory,
    successMessage,
    errorMessage,
  };
};

