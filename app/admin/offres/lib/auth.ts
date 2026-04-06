import { redirect } from "next/navigation";
import { hasValidAdminSession, isAdminAuthConfigured } from "@/lib/admin-auth";

export const isAdminOffresConfigured = (): boolean => {
  return isAdminAuthConfigured();
};

export const requireAdminOffresSession = async (): Promise<void> => {
  if (!(await hasValidAdminSession())) {
    redirect("/admin/login");
  }
};
