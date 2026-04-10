import Link from "next/link";
import { LayoutDashboard } from "lucide-react";
import { SectionHeader } from "@/app/admin/components/section-header";
import {
  AdminIconPlus,
  AdminIconProducts,
  AdminIconUpload,
} from "@/app/admin/products/components/admin-products-icons";

type LogoutAction = () => void | Promise<void>;

type AdminProductsHeaderProps = {
  logoutAdminAction: LogoutAction;
};

export const AdminProductsHeader = ({
  logoutAdminAction,
}: AdminProductsHeaderProps) => {
  return (
    <header className="rounded-3xl border border-slate-200/80 bg-gradient-to-br from-white to-slate-50/60 p-5 shadow-md sm:p-6">
      <SectionHeader
        badge="Catalogue premium"
        title="Admin produits"
        description="Gerez votre catalogue avec une vue claire des statuts, stocks, variantes et prix."
        actions={
          <>
            <a
              href="#admin-products-create"
              className="inline-flex items-center gap-2 rounded-xl bg-brand-blue px-4 py-2 text-sm font-semibold text-white shadow-[0_10px_22px_rgba(15,42,77,0.22)] transition hover:bg-brand-blue/90"
            >
              <AdminIconPlus className="h-4 w-4" />
              Ajouter un produit
            </a>
            <Link
              href="/admin/products/import"
              className="inline-flex items-center gap-2 rounded-xl border border-emerald-300 bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-700 transition hover:border-emerald-400 hover:bg-emerald-100"
            >
              <AdminIconUpload className="h-4 w-4" />
              Import CSV
            </Link>
            <Link
              href="/admin/offres"
              className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-brand-orange hover:text-brand-orange"
            >
              Voir offres
            </Link>
          </>
        }
      />

      <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-slate-200 pt-4">
        <Link href="/admin" className="admin-nav-link">
          <span className="inline-flex items-center gap-1.5">
            <LayoutDashboard className="h-3.5 w-3.5" />
            Dashboard
          </span>
        </Link>
        <Link href="/admin/orders" className="admin-nav-link">
          Commandes
        </Link>
        <Link href="/admin/customers" className="admin-nav-link">
          Clients
        </Link>
        <Link href="/admin/blog" className="admin-nav-link">
          Blog
        </Link>
        <Link href="/admin/reviews" className="admin-nav-link">
          Avis
        </Link>
        <form action={logoutAdminAction}>
          <button type="submit" className="admin-nav-link admin-nav-danger">
            Deconnexion
          </button>
        </form>
      </div>
    </header>
  );
};
