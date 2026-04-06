import { redirect } from "next/navigation";
import { hasValidAdminSession, isAdminAuthConfigured } from "@/lib/admin-auth";

export const isAdminPublicitesConfigured = (): boolean => {
  return isAdminAuthConfigured();
};

export const requireAdminPublicitesSession = async (): Promise<void> => {
  if (!(await hasValidAdminSession())) {
    redirect("/admin/login");
  }
};

