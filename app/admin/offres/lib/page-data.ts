import type { AdminProduct } from "@/lib/admin-products";
import { getAdminProducts } from "@/lib/admin-products";
import type { AdminOffer } from "@/lib/admin-offers";
import { getAdminOffers } from "@/lib/admin-offers";
import { parseFlashMessage } from "@/app/admin/offres/lib/formatters";

export type AdminOffresSearchParams = {
  success?: string | string[];
  error?: string | string[];
};

export type AdminOffresPageData = {
  offers: AdminOffer[];
  products: AdminProduct[];
  productById: Map<string, AdminProduct>;
  successMessage: string;
  errorMessage: string;
};

export const getAdminOffresPageData = async (
  searchParams: AdminOffresSearchParams,
): Promise<AdminOffresPageData> => {
  const [offers, products] = await Promise.all([getAdminOffers(), getAdminProducts()]);

  return {
    offers,
    products,
    productById: new Map(products.map((product) => [product.id, product])),
    successMessage: parseFlashMessage(searchParams.success),
    errorMessage: parseFlashMessage(searchParams.error),
  };
};
