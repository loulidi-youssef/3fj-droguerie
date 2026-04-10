import Link from "next/link";
import { redirect } from "next/navigation";
import {
  Boxes,
  ChartColumn,
  CircleAlert,
  FileText,
  PackageSearch,
  ShoppingCart,
  Users,
} from "lucide-react";
import { ActionCard } from "@/app/admin/components/action-card";
import { AdminSectionCard } from "@/app/admin/components/admin-section-card";
import { MetricChip } from "@/app/admin/components/metric-chip";
import { PremiumStatCard } from "@/app/admin/components/premium-stat-card";
import { SectionHeader } from "@/app/admin/components/section-header";
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

  return (
    <section className="min-h-screen bg-gradient-to-b from-brand-light via-slate-50 to-sky-50/60 py-12">
      <div className="mx-auto max-w-7xl px-4 sm:px-5 lg:px-6">
        <SectionHeader
          badge="Admin SaaS"
          title="Dashboard admin"
          description="Vue globale commandes, produits, clients et suivi commercial."
          actions={
            <>
              <Link
                href="/admin/quotes/analytics"
                className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-brand-orange hover:text-brand-orange"
              >
                Analytics
              </Link>
              <Link
                href="/admin/products"
                className="rounded-xl bg-brand-blue px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-blue/90"
              >
                Gerer produits
              </Link>
            </>
          }
        />

        {quotesNeedingFollowUpCount > 0 ? (
          <div className="mb-5 rounded-2xl border border-amber-200 bg-amber-50 p-4">
            <p className="inline-flex items-center gap-2 text-sm font-semibold text-amber-900">
              <CircleAlert className="h-4 w-4" />
              {quotesNeedingFollowUpCount} devis a relancer
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
          </div>
        ) : null}

        <div className="mb-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          <PremiumStatCard
            title="Commandes en cours"
            value={pendingOrdersCount}
            subtitle="Pipeline de livraison"
            tone="blue"
            icon={<ShoppingCart className="h-5 w-5" />}
          />
          <PremiumStatCard
            title="Commandes terminees"
            value={deliveredOrdersCount}
            subtitle="Livrees ou recuperees"
            tone="green"
            icon={<PackageSearch className="h-5 w-5" />}
          />
          <PremiumStatCard
            title="Stock faible"
            value={lowStockProducts.length}
            subtitle="Produits a reapprovisionner"
            tone="orange"
            icon={<Boxes className="h-5 w-5" />}
          />
          <PremiumStatCard
            title="Clients actifs"
            value={customers.length}
            subtitle="Clients avec historique"
            tone="indigo"
            icon={<Users className="h-5 w-5" />}
          />
          <PremiumStatCard
            title="Nouveaux devis"
            value={pendingQuoteRequestsCount}
            subtitle="A traiter rapidement"
            tone="blue"
            icon={<FileText className="h-5 w-5" />}
          />
        </div>

        <AdminSectionCard
          title="Actions rapides"
          subtitle="Acces direct aux operations quotidiennes"
          icon={<ChartColumn className="h-4 w-4" />}
          className="mb-5"
        >
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <ActionCard
              href="/admin/orders"
              title="Commandes"
              description="Suivi des statuts, details et actions."
              icon={<ShoppingCart className="h-4 w-4" />}
              tone="blue"
            />
            <ActionCard
              href="/admin/products"
              title="Produits"
              description="Catalogue, stock, variantes et prix."
              icon={<Boxes className="h-4 w-4" />}
              tone="green"
            />
            <ActionCard
              href="/admin/customers"
              title="Clients"
              description="Profils clients et historique d'achats."
              icon={<Users className="h-4 w-4" />}
              tone="indigo"
            />
            <ActionCard
              href="/admin/quotes"
              title="Devis"
              description="Relances et suivi commercial."
              icon={<FileText className="h-4 w-4" />}
              tone="orange"
            />
          </div>
        </AdminSectionCard>

        <div className="grid gap-5 lg:grid-cols-2">
          <AdminSectionCard
            title="Commandes recentes"
            subtitle="Dernieres operations du flux commandes"
            icon={<ShoppingCart className="h-4 w-4" />}
            actions={
              <Link
                href="/admin/orders"
                className="rounded-lg border border-slate-300 px-3 py-1 text-xs font-semibold text-slate-700 transition hover:border-brand-orange hover:text-brand-orange"
              >
                Voir toutes
              </Link>
            }
          >
            {recentOrders.length === 0 ? (
              <p className="text-sm text-slate-600">Aucune commande pour le moment.</p>
            ) : (
              <ul className="space-y-2">
                {recentOrders.map((order) => (
                  <li
                    key={order.id}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2"
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
          </AdminSectionCard>

          <AdminSectionCard
            title="Clients recents"
            subtitle="Nouveaux profils et activite client"
            icon={<Users className="h-4 w-4" />}
            actions={
              <Link
                href="/admin/customers"
                className="rounded-lg border border-slate-300 px-3 py-1 text-xs font-semibold text-slate-700 transition hover:border-brand-orange hover:text-brand-orange"
              >
                Voir tous
              </Link>
            }
          >
            {recentCustomers.length === 0 ? (
              <p className="text-sm text-slate-600">Aucun client disponible.</p>
            ) : (
              <ul className="space-y-2">
                {recentCustomers.map((customer) => (
                  <li
                    key={customer.id}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2"
                  >
                    <div>
                      <p className="text-sm font-semibold text-brand-blue">{customer.displayName}</p>
                      <p className="text-xs text-slate-500">
                        {customer.email ?? customer.phone ?? "Sans contact"}
                      </p>
                    </div>
                    <MetricChip tone="slate" label={`${customer.orderCount} commande(s)`} />
                  </li>
                ))}
              </ul>
            )}
          </AdminSectionCard>
        </div>

        <AdminSectionCard
          title="Produits stock bas"
          subtitle="Surveillance proactive des references critiques"
          icon={<Boxes className="h-4 w-4" />}
          className="mt-5"
          actions={
            <Link
              href="/admin/products"
              className="rounded-lg border border-slate-300 px-3 py-1 text-xs font-semibold text-slate-700 transition hover:border-brand-orange hover:text-brand-orange"
            >
              Gerer produits
            </Link>
          }
        >
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
                      <td className="px-3 py-2">
                        <MetricChip
                          tone={product.stock <= 0 ? "red" : "orange"}
                          label={`${product.stock}`}
                        />
                      </td>
                      <td className="px-3 py-2">{formatDh(product.price)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </AdminSectionCard>
      </div>
    </section>
  );
}
