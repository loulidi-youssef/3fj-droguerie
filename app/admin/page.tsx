import { redirect } from "next/navigation";
import { hasValidAdminSession } from "@/lib/admin-auth";

export default function AdminIndexPage() {
  if (hasValidAdminSession()) {
    redirect("/admin/orders");
  }

  redirect("/admin/login");
}
