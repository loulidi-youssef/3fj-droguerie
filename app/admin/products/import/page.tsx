import Link from "next/link";
import { AdminProductImportClient } from "@/app/admin/products/import/components/admin-product-import-client";
import {
  isAdminProductsConfigured,
  requireAdminProductsSession,
} from "@/app/admin/products/lib/auth";

export default async function AdminProductsImportPage() {
  if (!isAdminProductsConfigured()) {
    return (
      <section className="bg-brand-light py-12">
        <div className="mx-auto max-w-3xl rounded-2xl bg-white p-6 shadow-card">
          <h1 className="text-2xl font-extrabold text-brand-blue">Import produits (CSV/XLSX)</h1>
          <p className="mt-3 text-sm text-slate-700">
            Configurez
            <span className="font-semibold"> ADMIN_ACCESS_PASSWORD_HASH </span>
            et
            <span className="font-semibold"> ADMIN_SESSION_SECRET </span>
            (obligatoires en production), puis redemarrez le serveur.
          </p>
        </div>
      </section>
    );
  }

  await requireAdminProductsSession();

  return (
    <section className="bg-brand-light py-12">
      <div className="mx-auto max-w-7xl px-4 sm:px-5 lg:px-6">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-3xl font-extrabold text-brand-blue">Import produits en masse</h1>
            <p className="mt-1 text-sm text-slate-600">
              Workflow: upload CSV/XLSX, apercu clair, validation humaine, puis import securise.
            </p>
          </div>
          <Link
            href="/admin/products"
            className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700"
          >
            Retour produits
          </Link>
        </div>

        <AdminProductImportClient />
      </div>
    </section>
  );
}
