import { revalidatePath } from "next/cache";
import Link from "next/link";
import { redirect } from "next/navigation";
import { formatDh } from "@/lib/currency";
import { FormSubmitButton } from "@/components/form-submit-button";
import {
  clearAdminSession,
  hasValidAdminSession,
  isAdminAuthConfigured,
} from "@/lib/admin-auth";
import {
  ORDER_STATUSES,
  ORDER_STATUS_BADGE_CLASSNAME,
  ORDER_STATUS_LABEL,
  getAdminOrders,
  getOrderQuickActions,
  isOrderStatus,
  isStatusAllowedForFulfillment,
  normalizeFulfillmentMethod,
  type OrderStatus,
} from "@/lib/admin-orders";

type AdminOrdersPageProps = {
  searchParams: {
    q?: string | string[];
    status?: string | string[];
    dateFrom?: string | string[];
    dateTo?: string | string[];
    updated?: string | string[];
    error?: string | string[];
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

const toWhatsappUrl = (rawPhone: string): string | null => {
  const digits = rawPhone.replace(/[^\d]/g, "");
  if (!digits) {
    return null;
  }
  return `https://wa.me/${digits}`;
};

const buildOrdersHref = (params: {
  q?: string;
  status?: string;
  dateFrom?: string;
  dateTo?: string;
  updated?: string;
  error?: string;
}): string => {
  const searchParams = new URLSearchParams();
  if (params.q?.trim()) {
    searchParams.set("q", params.q.trim());
  }
  if (params.status?.trim() && params.status !== "all") {
    searchParams.set("status", params.status.trim());
  }
  if (params.dateFrom?.trim()) {
    searchParams.set("dateFrom", params.dateFrom.trim());
  }
  if (params.dateTo?.trim()) {
    searchParams.set("dateTo", params.dateTo.trim());
  }
  if (params.updated?.trim()) {
    searchParams.set("updated", params.updated.trim());
  }
  if (params.error?.trim()) {
    searchParams.set("error", params.error.trim());
  }

  const query = searchParams.toString();
  return query ? `/admin/orders?${query}` : "/admin/orders";
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
  const qRaw = formData.get("q");
  const statusFilterRaw = formData.get("statusFilter");
  const dateFromRaw = formData.get("dateFrom");
  const dateToRaw = formData.get("dateTo");

  const orderId = typeof orderIdRaw === "string" ? orderIdRaw.trim() : "";
  const nextStatus = typeof statusRaw === "string" ? statusRaw.trim() : "";
  const fulfillmentMethod = normalizeFulfillmentMethod(
    typeof fulfillmentMethodRaw === "string" ? fulfillmentMethodRaw.trim() : "",
  );
  const q = typeof qRaw === "string" ? qRaw : "";
  const statusFilter = typeof statusFilterRaw === "string" ? statusFilterRaw : "";
  const dateFrom = typeof dateFromRaw === "string" ? dateFromRaw : "";
  const dateTo = typeof dateToRaw === "string" ? dateToRaw : "";

  const redirectBaseParams = {
    q,
    status: statusFilter,
    dateFrom,
    dateTo,
  };

  if (
    !orderId ||
    !isOrderStatus(nextStatus) ||
    !isStatusAllowedForFulfillment(nextStatus, fulfillmentMethod)
  ) {
    redirect(buildOrdersHref({ ...redirectBaseParams, error: "invalid-status" }));
  }

  const { updateAdminOrderStatus } = await import("@/lib/admin-orders");
  const updated = await updateAdminOrderStatus(orderId, nextStatus);

  revalidatePath("/admin/orders");
  revalidatePath(`/admin/orders/${orderId}`);
  revalidatePath("/admin/customers");

  if (!updated) {
    redirect(buildOrdersHref({ ...redirectBaseParams, error: "update-failed" }));
  }

  redirect(buildOrdersHref({ ...redirectBaseParams, updated: "1" }));
};

const getStatusCount = (
  statuses: readonly OrderStatus[],
  orders: Array<{ status: OrderStatus }>,
): number => {
  return orders.reduce((count, order) => (statuses.includes(order.status) ? count + 1 : count), 0);
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

  const query = toSingleValue(searchParams.q).trim();
  const normalizedQuery = query.toLowerCase();
  const statusFilterRaw = toSingleValue(searchParams.status).trim().toLowerCase();
  const selectedStatus: OrderStatus | "all" =
    statusFilterRaw && statusFilterRaw !== "all" && isOrderStatus(statusFilterRaw)
      ? statusFilterRaw
      : "all";
  const dateFrom = toSingleValue(searchParams.dateFrom).trim();
  const dateTo = toSingleValue(searchParams.dateTo).trim();

  const orders = await getAdminOrders({
    status: selectedStatus,
    dateFrom: dateFrom || null,
    dateTo: dateTo || null,
  });

  const filteredOrders = normalizedQuery
    ? orders.filter((order) => {
        const rawId = order.id.toLowerCase();
        const customerName = order.customer_name.toLowerCase();
        const phone = order.customer_phone.toLowerCase();
        return (
          rawId.includes(normalizedQuery) ||
          customerName.includes(normalizedQuery) ||
          phone.includes(normalizedQuery)
        );
      })
    : orders;

  const updatedParam = toSingleValue(searchParams.updated);
  const errorParam = toSingleValue(searchParams.error);

  const pendingCount = getStatusCount(
    ["new", "confirmed", "preparing", "ready", "shipped"],
    filteredOrders,
  );
  const deliveredCount = getStatusCount(["delivered", "collected"], filteredOrders);
  const cancelledCount = getStatusCount(["cancelled"], filteredOrders);

  return (
    <section className="bg-brand-light py-12">
      <div className="mx-auto max-w-7xl px-4 sm:px-5 lg:px-6">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-3xl font-extrabold text-brand-blue">Admin commandes</h1>
            <p className="mt-1 text-sm text-slate-600">
              Recherche, filtres, suivi de statut et actions rapides de traitement.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/admin/products"
              className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700"
            >
              Produits
            </Link>
            <Link
              href="/admin/customers"
              className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700"
            >
              Clients
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

        <div className="mb-4 grid gap-3 md:grid-cols-3">
          <article className="rounded-2xl bg-white p-4 shadow-card">
            <p className="text-xs uppercase tracking-wide text-slate-500">En cours</p>
            <p className="mt-1 text-2xl font-extrabold text-brand-blue">{pendingCount}</p>
          </article>
          <article className="rounded-2xl bg-white p-4 shadow-card">
            <p className="text-xs uppercase tracking-wide text-slate-500">Terminees</p>
            <p className="mt-1 text-2xl font-extrabold text-emerald-700">{deliveredCount}</p>
          </article>
          <article className="rounded-2xl bg-white p-4 shadow-card">
            <p className="text-xs uppercase tracking-wide text-slate-500">Annulees</p>
            <p className="mt-1 text-2xl font-extrabold text-rose-700">{cancelledCount}</p>
          </article>
        </div>

        <form method="get" action="/admin/orders" className="mb-4 rounded-2xl bg-white p-4 shadow-card">
          <div className="grid gap-3 lg:grid-cols-4">
            <label className="block">
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-600">
                Recherche
              </span>
              <input
                type="search"
                name="q"
                defaultValue={query}
                placeholder="Nom, telephone ou ID commande"
                className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-700"
              />
            </label>
            <label className="block">
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-600">
                Statut
              </span>
              <select
                name="status"
                defaultValue={selectedStatus}
                className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700"
              >
                <option value="all">Tous</option>
                {ORDER_STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {ORDER_STATUS_LABEL[status]}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-600">
                Date debut
              </span>
              <input
                type="date"
                name="dateFrom"
                defaultValue={dateFrom}
                className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-700"
              />
            </label>
            <label className="block">
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-600">
                Date fin
              </span>
              <input
                type="date"
                name="dateTo"
                defaultValue={dateTo}
                className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-700"
              />
            </label>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <button
              type="submit"
              className="rounded-xl bg-brand-blue px-4 py-2 text-sm font-semibold text-white"
            >
              Filtrer
            </button>
            <Link
              href="/admin/orders"
              className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700"
            >
              Reinitialiser
            </Link>
          </div>
        </form>

        {updatedParam === "1" ? (
          <p className="mb-4 rounded-xl bg-emerald-50 p-3 text-sm font-medium text-emerald-700">
            Statut commande mis a jour.
          </p>
        ) : null}

        {errorParam ? (
          <p className="mb-4 rounded-xl bg-rose-50 p-3 text-sm font-medium text-rose-700">
            Action impossible. Merci de verifier le statut cible et reessayer.
          </p>
        ) : null}

        <div className="rounded-2xl bg-white p-4 shadow-card">
          <p className="mb-3 text-sm font-semibold text-slate-600">
            {filteredOrders.length} commande(s)
          </p>

          {filteredOrders.length === 0 ? (
            <p className="rounded-xl bg-slate-50 p-4 text-sm text-slate-600">
              Aucune commande ne correspond aux filtres.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
                    <th className="px-3 py-2">Commande</th>
                    <th className="px-3 py-2">Client</th>
                    <th className="px-3 py-2">Contact</th>
                    <th className="px-3 py-2">Mode</th>
                    <th className="px-3 py-2">Statut</th>
                    <th className="px-3 py-2">Total</th>
                    <th className="px-3 py-2">Date</th>
                    <th className="px-3 py-2">Actions rapides</th>
                    <th className="px-3 py-2">Detail</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredOrders.map((order) => {
                    const fulfillmentMethod = normalizeFulfillmentMethod(order.fulfillment_method);
                    const whatsappUrl = toWhatsappUrl(order.customer_phone);
                    const quickActions = getOrderQuickActions(order.status, fulfillmentMethod);

                    return (
                      <tr key={order.id} className="border-b border-slate-100 text-slate-700">
                        <td className="px-3 py-2 font-semibold text-brand-blue">{order.id.slice(0, 8)}</td>
                        <td className="px-3 py-2">{order.customer_name}</td>
                        <td className="px-3 py-2">
                          <div className="flex flex-col gap-1">
                            <span>{order.customer_phone}</span>
                            <div className="flex flex-wrap gap-1">
                              {whatsappUrl ? (
                                <Link
                                  href={whatsappUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="rounded-md border border-emerald-300 px-2 py-0.5 text-[11px] font-semibold text-emerald-700"
                                >
                                  WhatsApp
                                </Link>
                              ) : null}
                              <a
                                href={`tel:${order.customer_phone}`}
                                className="rounded-md border border-slate-300 px-2 py-0.5 text-[11px] font-semibold text-slate-700"
                              >
                                Appeler
                              </a>
                            </div>
                          </div>
                        </td>
                        <td className="px-3 py-2">
                          {fulfillmentMethod === "pickup" ? "Retrait" : "Livraison"}
                        </td>
                        <td className="px-3 py-2">
                          <span
                            className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${ORDER_STATUS_BADGE_CLASSNAME[order.status]}`}
                          >
                            {ORDER_STATUS_LABEL[order.status]}
                          </span>
                        </td>
                        <td className="px-3 py-2 font-semibold">{formatDh(order.total)}</td>
                        <td className="px-3 py-2">{formatOrderDate(order.created_at)}</td>
                        <td className="px-3 py-2">
                          <div className="flex flex-wrap gap-1">
                            {quickActions.length === 0 ? (
                              <span className="text-xs text-slate-500">Aucune</span>
                            ) : (
                              quickActions.map((action) => (
                                <form key={action.status} action={updateOrderStatusAction}>
                                  <input type="hidden" name="orderId" value={order.id} />
                                  <input type="hidden" name="status" value={action.status} />
                                  <input
                                    type="hidden"
                                    name="fulfillmentMethod"
                                    value={fulfillmentMethod}
                                  />
                                  <input type="hidden" name="q" value={query} />
                                  <input type="hidden" name="statusFilter" value={selectedStatus} />
                                  <input type="hidden" name="dateFrom" value={dateFrom} />
                                  <input type="hidden" name="dateTo" value={dateTo} />
                                  <FormSubmitButton
                                    idleLabel={action.label}
                                    pendingLabel="Mise a jour..."
                                    className={`rounded-md px-2 py-1 text-[11px] font-semibold ${
                                      action.intent === "primary"
                                        ? "bg-brand-blue text-white"
                                        : action.intent === "danger"
                                          ? "bg-rose-600 text-white"
                                          : "border border-slate-300 bg-white text-slate-700"
                                    }`}
                                  />
                                </form>
                              ))
                            )}
                          </div>
                        </td>
                        <td className="px-3 py-2">
                          <Link
                            href={`/admin/orders/${order.id}`}
                            className="rounded-lg border border-slate-300 px-2.5 py-1 text-xs font-semibold text-slate-700 transition hover:border-brand-orange hover:text-brand-orange"
                          >
                            Ouvrir
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
