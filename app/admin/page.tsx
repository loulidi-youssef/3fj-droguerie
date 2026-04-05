import { redirect } from "next/navigation";
import { hasValidAdminSession } from "@/lib/admin-auth";

export default async function AdminIndexPage() {
  if (await hasValidAdminSession()) {
    redirect("/admin/orders");
  }

  redirect("/admin/login");
}

