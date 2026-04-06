import { revalidatePath } from "next/cache";
import Link from "next/link";
import { redirect } from "next/navigation";
import { formatDh } from "@/lib/currency";
import {
  clearAdminSession,
  hasValidAdminSession,
  isAdminAuthConfigured,
} from "@/lib/admin-auth";
import {
  getAllowedStatusesForFulfillment,
  normalizeFulfillmentMethod,
  isStatusAllowedForFulfillment,
  type OrderStatus,
  type FulfillmentMethod,
  getAdminOrders,
  isOrderStatus,
  updateAdminOrderStatus,
} from "@/lib/admin-orders";

type AdminOrdersPageProps = {
  searchParams: {
    updated?: string | string[];
    error?: string | string[];
  };
};

const statusLabel: Record<OrderStatus, string> = {
  new: "Nouveau",
  confirmed: "Confirmee",
  preparing: "En preparation",
  ready: "Prete",
  collected: "Recuperee",
  delivered: "Livree",
  cancelled: "Annulee",
};

const statusClassName: Record<OrderStatus, string> = {
  new: "bg-sky-100 text-sky-700",
  confirmed: "bg-amber-100 text-amber-700",
  preparing: "bg-orange-100 text-orange-700",
  ready: "bg-indigo-100 text-indigo-700",
  collected: "bg-emerald-100 text-emerald-700",
  delivered: "bg-emerald-100 text-emerald-700",
  cancelled: "bg-rose-100 text-rose-700",
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

const formatOrderDate = (value: string): string => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("fr-MA", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
};

const logoutAdminAction = async () => {
  "use server";
  await clearAdminSession();
  redirect("/admin/login");
};

const updateOrderStatusAction = async (formData: FormData) => {
  "use server";

  if (!(await hasValidAdminSession())) {
    redirect("/admin/login");
  }

  const orderIdRaw = formData.get("orderId");
  const statusRaw = formData.get("status");
  const fulfillmentMethodRaw = formData.get("fulfillmentMethod");

  const orderId = typeof orderIdRaw === "string" ? orderIdRaw.trim() : "";
  const nextStatus = typeof statusRaw === "string" ? statusRaw.trim() : "";
  const fulfillmentMethod: FulfillmentMethod = normalizeFulfillmentMethod(
    typeof fulfillmentMethodRaw === "string" ? fulfillmentMethodRaw.trim() : "",
  );

  if (
    !orderId ||
    !isOrderStatus(nextStatus) ||
    !isStatusAllowedForFulfillment(nextStatus, fulfillmentMethod)
  ) {
    redirect("/admin/orders?error=invalid-status");
  }

  const updated = await updateAdminOrderStatus(orderId, nextStatus);
  revalidatePath("/admin/orders");

  if (!updated) {
    redirect("/admin/orders?error=update-failed");
  }

  redirect("/admin/orders?updated=1");
};

export default async function AdminOrdersPage({ searchParams }: AdminOrdersPageProps) {
  if (!isAdminAuthConfigured()) {
    return (
      <section className="bg-brand-light py-12">
        <div className="mx-auto max-w-3xl rounded-2xl bg-white p-6 shadow-card">
          <h1 className="text-2xl font-extrabold text-brand-blue">Admin commandes</h1>
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

  const orders = await getAdminOrders();

  const updatedParam = toSingleValue(searchParams.updated);
  const errorParam = toSingleValue(searchParams.error);

  return (
    <section className="bg-brand-light py-12">
      <div className="mx-auto max-w-7xl px-4 sm:px-5 lg:px-6">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-3xl font-extrabold text-brand-blue">Admin commandes</h1>
            <p className="mt-1 text-sm text-slate-600">
              Visualisez les commandes entrantes et mettez a jour leur statut.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/admin/products"
              className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700"
            >
              Voir produits
            </Link>
            <Link
              href="/admin/customers"
              className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700"
            >
              Voir clients
            </Link>
            <Link
              href="/admin/offres"
              className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700"
            >
              Voir offres
            </Link>
            <Link
              href="/admin/blog"
              className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700"
            >
              Voir blog
            </Link>
            <Link
              href="/admin/reviews"
              className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700"
            >
              Voir avis
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

        {updatedParam === "1" ? (
          <p className="mb-4 rounded-xl bg-emerald-50 p-3 text-sm font-medium text-emerald-700">
            Statut mis a jour avec succes.
          </p>
        ) : null}

        {errorParam ? (
          <p className="mb-4 rounded-xl bg-rose-50 p-3 text-sm font-medium text-rose-700">
            Mise a jour impossible. Merci de reessayer.
          </p>
        ) : null}

        {orders.length === 0 ? (
          <div className="rounded-2xl bg-white p-6 shadow-card">
            <p className="text-sm text-slate-600">Aucune commande pour le moment.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {orders.map((order) => {
              const fulfillmentMethod = normalizeFulfillmentMethod(order.fulfillment_method);
              const statusOptions = getAllowedStatusesForFulfillment(fulfillmentMethod);

              return (
                <details key={order.id} className="rounded-2xl bg-white p-5 shadow-card">
                  <summary className="cursor-pointer list-none">
                    <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                          Client
                        </p>
                        <p className="text-sm font-bold text-brand-blue">{order.customer_name}</p>
                        <p className="text-xs text-slate-600">{order.customer_phone}</p>
                      </div>

                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                          Adresse
                        </p>
                        <p className="text-sm text-slate-700">
                          {fulfillmentMethod === "pickup"
                            ? "Retrait en magasin"
                            : order.customer_address}
                        </p>
                        <p className="text-xs text-slate-600">{order.customer_location}</p>
                        <p className="text-xs text-slate-600">
                          Mode: {fulfillmentMethod === "pickup" ? "Retrait magasin" : "Livraison"}
                        </p>
                      </div>

                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                          Total / Livraison
                        </p>
                        <p className="text-sm font-bold text-brand-blue">{formatDh(order.total)}</p>
                        <p className="text-xs text-slate-600">
                          Livraison: {formatDh(order.delivery_fee)}
                        </p>
                      </div>

                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                          Statut / Date
                        </p>
                        <span
                          className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${statusClassName[order.status]}`}
                        >
                          {statusLabel[order.status]}
                        </span>
                        <p className="mt-1 text-xs text-slate-600">
                          {formatOrderDate(order.created_at)}
                        </p>
                      </div>
                    </div>
                  </summary>

                  <div className="mt-4 border-t border-slate-200 pt-4">
                    <p className="text-sm font-semibold text-brand-blue">Produits commandes</p>
                    {order.order_items.length === 0 ? (
                      <p className="mt-2 text-sm text-slate-600">
                        Aucun produit trouve pour cette commande.
                      </p>
                    ) : (
                      <div className="mt-2 overflow-x-auto">
                        <table className="min-w-full text-left text-sm">
                          <thead>
                            <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
                              <th className="px-2 py-2">Produit</th>
                              <th className="px-2 py-2">Quantite</th>
                              <th className="px-2 py-2">Prix unite</th>
                              <th className="px-2 py-2">Total ligne</th>
                            </tr>
                          </thead>
                          <tbody>
                            {order.order_items.map((item) => (
                              <tr key={item.id} className="border-b border-slate-100 text-slate-700">
                                <td className="px-2 py-2">{item.product_name}</td>
                                <td className="px-2 py-2">{item.quantity}</td>
                                <td className="px-2 py-2">{formatDh(item.unit_price)}</td>
                                <td className="px-2 py-2 font-semibold text-brand-blue">
                                  {formatDh(item.line_total)}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}

                    <form
                      action={updateOrderStatusAction}
                      className="mt-4 flex flex-wrap items-center gap-2"
                    >
                      <input type="hidden" name="orderId" value={order.id} />
                      <input
                        type="hidden"
                        name="fulfillmentMethod"
                        value={fulfillmentMethod}
                      />
                      <label className="text-xs font-semibold uppercase tracking-wide text-slate-600">
                        Changer statut
                      </label>
                      <select
                        name="status"
                        defaultValue={order.status}
                        className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700"
                      >
                        {statusOptions.map((status) => (
                          <option key={status} value={status}>
                            {statusLabel[status]}
                          </option>
                        ))}
                      </select>
                      <button
                        type="submit"
                        className="rounded-xl bg-brand-blue px-4 py-2 text-sm font-semibold text-white"
                      >
                        Mettre a jour
                      </button>
                    </form>
                  </div>
                </details>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}

