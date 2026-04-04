import Link from "next/link";
import { redirect } from "next/navigation";
import { formatDh } from "@/lib/currency";
import {
  clearAdminSession,
  hasValidAdminSession,
  isAdminAuthConfigured,
} from "@/lib/admin-auth";
import { getAdminCustomers } from "@/lib/admin-customers";

type AdminCustomersPageProps = {
  searchParams: {
    q?: string | string[];
  };
};

const toSingleValue = (value: string | string[] | undefined): string => {
  if (typeof value === "string") {
    return value;
  }
  if (Array.isArray(value)) {
    return value[0] ?? "";
  }
  return "";
};

const formatDateTime = (value: string | null): string => {
  if (!value) {
    return "Non disponible";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "Non disponible";
  }

  return new Intl.DateTimeFormat("fr-MA", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
};

const logoutAdminAction = async () => {
  "use server";
  clearAdminSession();
  redirect("/admin/login");
};

export default async function AdminCustomersPage({
  searchParams,
}: AdminCustomersPageProps) {
  if (!isAdminAuthConfigured()) {
    return (
      <section className="bg-brand-light py-12">
        <div className="mx-auto max-w-3xl rounded-2xl bg-white p-6 shadow-card">
          <h1 className="text-2xl font-extrabold text-brand-blue">Admin clients</h1>
          <p className="mt-3 text-sm text-slate-700">
            Configurez la variable
            <span className="font-semibold"> ADMIN_ACCESS_PASSWORD </span>
            dans
            <span className="font-semibold"> .env.local</span>, puis redemarrez le serveur.
          </p>
        </div>
      </section>
    );
  }

  if (!hasValidAdminSession()) {
    redirect("/admin/login");
  }

  const customers = await getAdminCustomers();
  const query = toSingleValue(searchParams.q).trim();
  const normalizedQuery = query.toLowerCase();

  const filteredCustomers = normalizedQuery
    ? customers.filter((customer) => {
        return (
          customer.displayName.toLowerCase().includes(normalizedQuery) ||
          (customer.email ?? "").toLowerCase().includes(normalizedQuery) ||
          (customer.phone ?? "").toLowerCase().includes(normalizedQuery)
        );
      })
    : customers;

  return (
    <section className="bg-brand-light py-12">
      <div className="mx-auto max-w-7xl px-4 sm:px-5 lg:px-6">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-3xl font-extrabold text-brand-blue">Admin clients</h1>
            <p className="mt-1 text-sm text-slate-600">
              Vue synthese des clients et comptes relies aux commandes.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/admin/orders"
              className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700"
            >
              Commandes
            </Link>
            <Link
              href="/admin/products"
              className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700"
            >
              Produits
            </Link>
            <Link
              href="/admin/offres"
              className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700"
            >
              Offres
            </Link>
            <Link
              href="/admin/blog"
              className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700"
            >
              Blog
            </Link>
            <Link
              href="/admin/reviews"
              className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700"
            >
              Avis
            </Link>
            <form action={logoutAdminAction}>
              <button
                type="submit"
                className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700"
              >
                Deconnexion
              </button>
            </form>
          </div>
        </div>

        <form method="get" action="/admin/customers" className="mb-4 rounded-2xl bg-white p-4 shadow-card">
          <label className="block">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-600">
              Rechercher un client
            </span>
            <div className="mt-1 flex flex-wrap gap-2">
              <input
                type="search"
                name="q"
                defaultValue={query}
                placeholder="Nom, email ou telephone"
                className="min-w-[220px] flex-1 rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-700"
              />
              <button
                type="submit"
                className="rounded-xl bg-brand-blue px-4 py-2 text-sm font-semibold text-white"
              >
                Rechercher
              </button>
              <Link
                href="/admin/customers"
                className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700"
              >
                Reinitialiser
              </Link>
            </div>
          </label>
        </form>

        <div className="rounded-2xl bg-white p-4 shadow-card">
          <p className="mb-3 text-sm font-semibold text-slate-600">
            {filteredCustomers.length} client(s) trouve(s)
          </p>

          {filteredCustomers.length === 0 ? (
            <p className="rounded-xl bg-slate-50 p-4 text-sm text-slate-600">
              Aucun client ne correspond a la recherche.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
                    <th className="px-3 py-2">Client</th>
                    <th className="px-3 py-2">Email</th>
                    <th className="px-3 py-2">Telephone</th>
                    <th className="px-3 py-2">Creation compte</th>
                    <th className="px-3 py-2">Commandes</th>
                    <th className="px-3 py-2">Derniere commande</th>
                    <th className="px-3 py-2">Total</th>
                    <th className="px-3 py-2">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredCustomers.map((customer) => (
                    <tr key={customer.id} className="border-b border-slate-100 text-slate-700">
                      <td className="px-3 py-2 font-semibold text-brand-blue">{customer.displayName}</td>
                      <td className="px-3 py-2">{customer.email ?? "-"}</td>
                      <td className="px-3 py-2">{customer.phone ?? "-"}</td>
                      <td className="px-3 py-2">{formatDateTime(customer.accountCreatedAt)}</td>
                      <td className="px-3 py-2">{customer.orderCount}</td>
                      <td className="px-3 py-2">{formatDateTime(customer.lastOrderAt)}</td>
                      <td className="px-3 py-2 font-semibold">{formatDh(customer.totalSpent)}</td>
                      <td className="px-3 py-2">
                        {customer.userId ? (
                          <Link
                            href={`/admin/customers/${customer.userId}`}
                            className="rounded-lg border border-slate-300 px-2.5 py-1 text-xs font-semibold text-slate-700 transition hover:border-brand-orange hover:text-brand-orange"
                          >
                            Voir details
                          </Link>
                        ) : (
                          <span className="text-xs text-slate-400">Invité</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
