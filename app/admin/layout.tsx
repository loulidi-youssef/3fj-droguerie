import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { clearAdminSession, hasValidAdminSession } from "@/lib/admin-auth";

export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
    nocache: true,
    googleBot: {
      index: false,
      follow: false,
      noimageindex: true,
    },
  },
};

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const isAuthenticated = hasValidAdminSession();

  const logoutAdminAction = async () => {
    "use server";
    clearAdminSession();
    redirect("/admin/login");
  };

  return (
    <div className="admin-ui min-h-screen bg-[#eef2f7]">
      {isAuthenticated ? (
        <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur">
          <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-2 px-4 py-3 sm:px-5 lg:px-6">
            <div className="flex items-center gap-2">
              <p className="rounded-full bg-brand-blue px-3 py-1 text-xs font-bold uppercase tracking-wide text-white">
                Admin 3FJ
              </p>
              <p className="text-sm font-semibold text-slate-600">Gestion du site</p>
            </div>
            <nav className="flex flex-wrap items-center gap-2 text-sm font-semibold text-slate-700">
              <Link href="/admin/orders" className="admin-nav-link">
                Commandes
              </Link>
              <Link href="/admin/customers" className="admin-nav-link">
                Clients
              </Link>
              <Link href="/admin/products" className="admin-nav-link">
                Produits
              </Link>
              <Link href="/admin/offres" className="admin-nav-link">
                Offres
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
            </nav>
          </div>
        </header>
      ) : null}
      {children}
    </div>
  );
}
