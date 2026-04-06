import { getCategoryNameBySlug } from "@/data/categories";

const toSingleValue = (value: string | string[] | undefined): string => {
  if (typeof value === "string") {
    return value;
  }

  if (Array.isArray(value)) {
    return value[0] ?? "";
  }

  return "";
};

export const parseFlashMessage = (value: string | string[] | undefined): string => {
  const rawValue = toSingleValue(value);
  if (!rawValue) {
    return "";
  }

  try {
    return decodeURIComponent(rawValue);
  } catch {
    return rawValue;
  }
};

export const parseSelectedCategory = (
  value: string | string[] | undefined,
): string => {
  return toSingleValue(value).trim().toLowerCase();
};

export const formatCategoryLabel = (categorySlug: string): string => {
  const fromCatalog = getCategoryNameBySlug(categorySlug);
  if (fromCatalog !== "Categorie") {
    return fromCatalog;
  }

  return categorySlug
    .split("-")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
};

export const normalizeSlug = (rawSlug: string): string => {
  return rawSlug
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-");
};

export const parseImages = (rawImages: string): string[] => {
  return rawImages
    .split(/\r?\n|,/g)
    .map((value) => value.trim())
    .filter(Boolean);
};

