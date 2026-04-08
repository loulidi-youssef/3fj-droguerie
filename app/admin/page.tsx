import Link from "next/link";
import { redirect } from "next/navigation";
import { formatDh } from "@/lib/currency";
import {
  hasValidAdminSession,
  isAdminAuthConfigured,
} from "@/lib/admin-auth";
import { getAdminCustomers } from "@/lib/admin-customers";
import {
  getAdminQuoteRequests,
  getOverdueQuotes,
  getQuotesNeedingFollowUp,
  getTodayFollowUps,
} from "@/lib/admin-quotes";
import { getAdminOrders, type OrderStatus } from "@/lib/admin-orders";
import { getAdminProducts } from "@/lib/admin-products";

const formatDateTime = (value: string): string => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("fr-MA", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
};

const isPendingStatus = (status: OrderStatus): boolean => {
  return ["new", "confirmed", "preparing", "ready", "shipped"].includes(status);
};

export default async function AdminIndexPage() {
  if (!isAdminAuthConfigured()) {
    return (
      <section className="bg-brand-light py-12">
        <div className="mx-auto max-w-3xl rounded-2xl bg-white p-6 shadow-card">
          <h1 className="text-2xl font-extrabold text-brand-blue">Admin dashboard</h1>
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

  if (!(await hasValidAdminSession())) {
    redirect("/admin/login");
  }

  const [orders, customers, products, quoteRequests] = await Promise.all([
    getAdminOrders(),
    getAdminCustomers(),
    getAdminProducts(),
    getAdminQuoteRequests({ status: "all", limit: 800 }),
  ]);
  const [quotesNeedingFollowUp, overdueQuotes, todayFollowUps] = await Promise.all([
    getQuotesNeedingFollowUp({ quotes: quoteRequests }),
    getOverdueQuotes({ quotes: quoteRequests }),
    getTodayFollowUps({ quotes: quoteRequests }),
  ]);

  const pendingOrdersCount = orders.filter((order) => isPendingStatus(order.status)).length;
  const deliveredOrdersCount = orders.filter((order) =>
    ["delivered", "collected"].includes(order.status),
  ).length;
  const lowStockProducts = products.filter((product) => product.is_active && product.stock <= 5);
  const pendingQuoteRequestsCount = quoteRequests.filter((quote) => quote.status === "new").length;
  const quotesNeedingFollowUpCount = quotesNeedingFollowUp.length;
  const overdueQuotesCount = overdueQuotes.length;
  const todayFollowUpsCount = todayFollowUps.length;
  const recentOrders = orders.slice(0, 6);
  const recentCustomers = customers.slice(0, 6);

  if (process.env.ADMIN_QUOTES_REMINDER_LOG === "1" && quotesNeedingFollowUpCount > 0) {
    console.info(
      `[admin][quotes] follow-up=${quotesNeedingFollowUpCount} overdue=${overdueQuotesCount} today=${todayFollowUpsCount}`,
    );
  }

  return (
    <section className="bg-brand-light py-12">
      <div className="mx-auto max-w-7xl px-4 sm:px-5 lg:px-6">
        <div className="mb-5">
          <h1 className="text-3xl font-extrabold text-brand-blue">Dashboard admin</h1>
          <p className="mt-1 text-sm text-slate-600">
            Vue rapide pour le pilotage quotidien des commandes, produits et clients.
          </p>
        </div>

        {quotesNeedingFollowUpCount > 0 ? (
          <article className="mb-4 rounded-2xl border border-amber-200 bg-amber-50 p-4">
            <p className="text-sm font-semibold text-amber-900">
              Vous avez {quotesNeedingFollowUpCount} devis a relancer.
            </p>
            <p className="mt-1 text-xs text-amber-800">
              {todayFollowUpsCount} a rappeler aujourd'hui, {overdueQuotesCount} en retard.
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              <Link
                href="/admin/quotes?followUp=a-traiter"
                className="rounded-lg border border-amber-300 bg-white px-3 py-1 text-xs font-semibold text-amber-900"
              >
                Ouvrir a traiter
              </Link>
              <Link
                href="/admin/quotes?followUp=en-retard"
                className="rounded-lg border border-rose-300 bg-white px-3 py-1 text-xs font-semibold text-rose-700"
              >
                Ouvrir en retard
              </Link>
            </div>
          </article>
        ) : null}

        <div className="grid gap-3 md:grid-cols-5">
          <article className="rounded-2xl bg-white p-4 shadow-card">
            <p className="text-xs uppercase tracking-wide text-slate-500">Commandes en cours</p>
            <p className="mt-1 text-2xl font-extrabold text-brand-blue">{pendingOrdersCount}</p>
          </article>
          <article className="rounded-2xl bg-white p-4 shadow-card">
            <p className="text-xs uppercase tracking-wide text-slate-500">Commandes terminees</p>
            <p className="mt-1 text-2xl font-extrabold text-emerald-700">{deliveredOrdersCount}</p>
          </article>
          <article className="rounded-2xl bg-white p-4 shadow-card">
            <p className="text-xs uppercase tracking-wide text-slate-500">Produits stock bas</p>
            <p className="mt-1 text-2xl font-extrabold text-amber-700">{lowStockProducts.length}</p>
          </article>
          <article className="rounded-2xl bg-white p-4 shadow-card">
            <p className="text-xs uppercase tracking-wide text-slate-500">Clients actifs</p>
            <p className="mt-1 text-2xl font-extrabold text-brand-blue">{customers.length}</p>
          </article>
          <article className="rounded-2xl bg-white p-4 shadow-card">
            <p className="text-xs uppercase tracking-wide text-slate-500">Nouveaux devis</p>
            <p className="mt-1 text-2xl font-extrabold text-sky-700">{pendingQuoteRequestsCount}</p>
          </article>
        </div>

        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <article className="rounded-2xl bg-white p-4 shadow-card">
            <div className="mb-3 flex items-center justify-between gap-2">
              <h2 className="text-lg font-bold text-brand-blue">Commandes recentes</h2>
              <Link
                href="/admin/orders"
                className="rounded-lg border border-slate-300 px-3 py-1 text-xs font-semibold text-slate-700"
              >
                Voir toutes
              </Link>
            </div>
            {recentOrders.length === 0 ? (
              <p className="text-sm text-slate-600">Aucune commande pour le moment.</p>
            ) : (
              <ul className="space-y-2">
                {recentOrders.map((order) => (
                  <li
                    key={order.id}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200 px-3 py-2"
                  >
                    <div>
                      <p className="text-sm font-semibold text-brand-blue">{order.customer_name}</p>
                      <p className="text-xs text-slate-500">{formatDateTime(order.created_at)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-slate-800">{formatDh(order.total)}</p>
                      <Link
                        href={`/admin/orders/${order.id}`}
                        className="text-xs font-semibold text-brand-blue"
                      >
                        Ouvrir
                      </Link>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </article>

          <article className="rounded-2xl bg-white p-4 shadow-card">
            <div className="mb-3 flex items-center justify-between gap-2">
              <h2 className="text-lg font-bold text-brand-blue">Clients recents</h2>
              <Link
                href="/admin/customers"
                className="rounded-lg border border-slate-300 px-3 py-1 text-xs font-semibold text-slate-700"
              >
                Voir tous
              </Link>
            </div>
            {recentCustomers.length === 0 ? (
              <p className="text-sm text-slate-600">Aucun client disponible.</p>
            ) : (
              <ul className="space-y-2">
                {recentCustomers.map((customer) => (
                  <li
                    key={customer.id}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200 px-3 py-2"
                  >
                    <div>
                      <p className="text-sm font-semibold text-brand-blue">{customer.displayName}</p>
                      <p className="text-xs text-slate-500">
                        {customer.email ?? customer.phone ?? "Sans contact"}
                      </p>
                    </div>
                    <p className="text-xs text-slate-600">{customer.orderCount} commande(s)</p>
                  </li>
                ))}
              </ul>
            )}
          </article>
        </div>

        <article className="mt-4 rounded-2xl bg-white p-4 shadow-card">
          <div className="mb-3 flex items-center justify-between gap-2">
            <h2 className="text-lg font-bold text-brand-blue">Produits stock bas</h2>
            <Link
              href="/admin/products"
              className="rounded-lg border border-slate-300 px-3 py-1 text-xs font-semibold text-slate-700"
            >
              Gerer produits
            </Link>
          </div>
          {lowStockProducts.length === 0 ? (
            <p className="text-sm text-slate-600">Aucun produit critique en stock actuellement.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
                    <th className="px-3 py-2">Produit</th>
                    <th className="px-3 py-2">Stock</th>
                    <th className="px-3 py-2">Prix</th>
                  </tr>
                </thead>
                <tbody>
                  {lowStockProducts.map((product) => (
                    <tr key={product.id} className="border-b border-slate-100 text-slate-700">
                      <td className="px-3 py-2 font-semibold">{product.name}</td>
                      <td className="px-3 py-2">{product.stock}</td>
                      <td className="px-3 py-2">{formatDh(product.price)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </article>
      </div>
    </section>
  );
}
