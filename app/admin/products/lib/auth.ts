import { redirect } from "next/navigation";
import { hasValidAdminSession, isAdminAuthConfigured } from "@/lib/admin-auth";

export const isAdminProductsConfigured = (): boolean => {
  return isAdminAuthConfigured();
};

export const requireAdminProductsSession = async (): Promise<void> => {
  if (!(await hasValidAdminSession())) {
    redirect("/admin/login");
  }
};

