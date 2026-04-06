import Link from "next/link";
import { revalidatePath } from "next/cache";
import { notFound, redirect } from "next/navigation";
import { formatDh } from "@/lib/currency";
import {
  clearAdminSession,
  hasValidAdminSession,
  isAdminAuthConfigured,
} from "@/lib/admin-auth";
import {
  ORDER_STATUS_BADGE_CLASSNAME,
  ORDER_STATUS_LABEL,
  getAdminOrderById,
  getAllowedStatusesForFulfillment,
  getOrderQuickActions,
  isOrderStatus,
  isStatusAllowedForFulfillment,
  normalizeFulfillmentMethod,
  updateAdminOrderNote,
  updateAdminOrderStatus,
} from "@/lib/admin-orders";

type AdminOrderDetailPageProps = {
  params: {
    orderId: string;
  };
  searchParams: {
    updated?: string | string[];
    noteSaved?: string | string[];
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

const buildOrderDetailHref = (
  orderId: string,
  params: { updated?: string; noteSaved?: string; error?: string },
): string => {
  const searchParams = new URLSearchParams();
  if (params.updated?.trim()) {
    searchParams.set("updated", params.updated.trim());
  }
  if (params.noteSaved?.trim()) {
    searchParams.set("noteSaved", params.noteSaved.trim());
  }
  if (params.error?.trim()) {
    searchParams.set("error", params.error.trim());
  }

  const query = searchParams.toString();
  return query ? `/admin/orders/${orderId}?${query}` : `/admin/orders/${orderId}`;
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
  const fulfillmentMethod = normalizeFulfillmentMethod(
    typeof fulfillmentMethodRaw === "string" ? fulfillmentMethodRaw.trim() : "",
  );

  if (
    !orderId ||
    !isOrderStatus(nextStatus) ||
    !isStatusAllowedForFulfillment(nextStatus, fulfillmentMethod)
  ) {
    redirect(buildOrderDetailHref(orderId, { error: "invalid-status" }));
  }

  const updated = await updateAdminOrderStatus(orderId, nextStatus);
  revalidatePath("/admin/orders");
  revalidatePath(`/admin/orders/${orderId}`);
  revalidatePath("/admin/customers");

  if (!updated) {
    redirect(buildOrderDetailHref(orderId, { error: "update-failed" }));
  }

  redirect(buildOrderDetailHref(orderId, { updated: "1" }));
};

const saveOrderNoteAction = async (formData: FormData) => {
  "use server";

  if (!(await hasValidAdminSession())) {
    redirect("/admin/login");
  }

  const orderIdRaw = formData.get("orderId");
  const noteRaw = formData.get("adminNote");

  const orderId = typeof orderIdRaw === "string" ? orderIdRaw.trim() : "";
  const adminNote = typeof noteRaw === "string" ? noteRaw : "";

  if (!orderId) {
    redirect("/admin/orders?error=invalid-order");
  }

  const saved = await updateAdminOrderNote(orderId, adminNote);
  revalidatePath("/admin/orders");
  revalidatePath(`/admin/orders/${orderId}`);

  if (!saved) {
    redirect(buildOrderDetailHref(orderId, { error: "note-failed" }));
  }

  redirect(buildOrderDetailHref(orderId, { noteSaved: "1" }));
};

export default async function AdminOrderDetailPage({
  params,
  searchParams,
}: AdminOrderDetailPageProps) {
  if (!isAdminAuthConfigured()) {
    return (
      <section className="bg-brand-light py-12">
        <div className="mx-auto max-w-3xl rounded-2xl bg-white p-6 shadow-card">
          <h1 className="text-2xl font-extrabold text-brand-blue">Admin detail commande</h1>
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

  const order = await getAdminOrderById(params.orderId);
  if (!order) {
    notFound();
  }

  const fulfillmentMethod = normalizeFulfillmentMethod(order.fulfillment_method);
  const statusOptions = getAllowedStatusesForFulfillment(fulfillmentMethod);
  const whatsappUrl = toWhatsappUrl(order.customer_phone);
  const quickActions = getOrderQuickActions(order.status, fulfillmentMethod);
  const updated = toSingleValue(searchParams.updated);
  const noteSaved = toSingleValue(searchParams.noteSaved);
  const error = toSingleValue(searchParams.error);

  return (
    <section className="bg-brand-light py-12">
      <div className="mx-auto max-w-7xl px-4 sm:px-5 lg:px-6">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-3xl font-extrabold text-brand-blue">Detail commande</h1>
            <p className="mt-1 text-sm text-slate-600">
              Commande {order.id} - suivi complet et notes internes.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/admin/orders"
              className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700"
            >
              Retour commandes
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

        {updated === "1" ? (
          <p className="mb-4 rounded-xl bg-emerald-50 p-3 text-sm font-medium text-emerald-700">
            Statut commande mis a jour.
          </p>
        ) : null}
        {noteSaved === "1" ? (
          <p className="mb-4 rounded-xl bg-emerald-50 p-3 text-sm font-medium text-emerald-700">
            Note interne enregistree.
          </p>
        ) : null}
        {error ? (
          <p className="mb-4 rounded-xl bg-rose-50 p-3 text-sm font-medium text-rose-700">
            Action impossible. Merci de verifier les informations de la commande.
          </p>
        ) : null}

        <div className="grid gap-4 lg:grid-cols-3">
          <article className="rounded-2xl bg-white p-5 shadow-card lg:col-span-2">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-3">
              <div>
                <p className="text-xs uppercase tracking-wide text-slate-500">Statut commande</p>
                <span
                  className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${ORDER_STATUS_BADGE_CLASSNAME[order.status]}`}
                >
                  {ORDER_STATUS_LABEL[order.status]}
                </span>
              </div>
              <div className="text-right">
                <p className="text-xs uppercase tracking-wide text-slate-500">Date creation</p>
                <p className="text-sm font-semibold text-slate-700">{formatOrderDate(order.created_at)}</p>
              </div>
            </div>

            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Client</p>
                <p className="text-base font-bold text-brand-blue">{order.customer_name}</p>
                <p className="text-sm text-slate-700">{order.customer_phone}</p>
                <p className="mt-1 text-xs text-slate-500">ID commande: {order.id}</p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Fulfillment</p>
                <p className="text-sm font-semibold text-slate-700">
                  {fulfillmentMethod === "pickup" ? "Retrait magasin" : "Livraison"}
                </p>
                <p className="text-sm text-slate-700">{order.customer_address}</p>
                <p className="text-sm text-slate-700">{order.customer_location}</p>
              </div>
            </div>

            <div className="mt-4 overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
                    <th className="px-2 py-2">Produit</th>
                    <th className="px-2 py-2">Variante</th>
                    <th className="px-2 py-2">Quantite</th>
                    <th className="px-2 py-2">Prix unite</th>
                    <th className="px-2 py-2">Total ligne</th>
                  </tr>
                </thead>
                <tbody>
                  {order.order_items.map((item) => {
                    const variantBits = [item.selected_color, item.selected_size].filter(Boolean);
                    return (
                      <tr key={item.id} className="border-b border-slate-100 text-slate-700">
                        <td className="px-2 py-2 font-semibold">{item.product_name}</td>
                        <td className="px-2 py-2 text-xs text-slate-600">
                          {variantBits.length > 0 ? variantBits.join(" / ") : "-"}
                        </td>
                        <td className="px-2 py-2">{item.quantity}</td>
                        <td className="px-2 py-2">{formatDh(item.unit_price)}</td>
                        <td className="px-2 py-2 font-semibold text-brand-blue">{formatDh(item.line_total)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="mt-4 grid gap-2 rounded-xl bg-slate-50 p-3 text-sm text-slate-700 sm:grid-cols-3">
              <p>
                <span className="font-semibold">Sous-total:</span> {formatDh(order.subtotal)}
              </p>
              <p>
                <span className="font-semibold">Livraison:</span> {formatDh(order.delivery_fee)}
              </p>
              <p className="font-bold text-brand-blue">
                <span className="font-semibold">Total:</span> {formatDh(order.total)}
              </p>
            </div>
          </article>

          <aside className="rounded-2xl bg-white p-5 shadow-card">
            <h2 className="text-base font-bold text-brand-blue">Actions rapides</h2>

            <div className="mt-3 flex flex-wrap gap-2">
              {whatsappUrl ? (
                <Link
                  href={whatsappUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-lg border border-emerald-300 px-3 py-1.5 text-xs font-semibold text-emerald-700"
                >
                  WhatsApp client
                </Link>
              ) : null}
              <a
                href={`tel:${order.customer_phone}`}
                className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700"
              >
                Appeler client
              </a>
            </div>

            <div className="mt-4 space-y-2 border-t border-slate-200 pt-4">
              {quickActions.map((action) => (
                <form key={action.status} action={updateOrderStatusAction}>
                  <input type="hidden" name="orderId" value={order.id} />
                  <input type="hidden" name="status" value={action.status} />
                  <input type="hidden" name="fulfillmentMethod" value={fulfillmentMethod} />
                  <button
                    type="submit"
                    className={`w-full rounded-xl px-3 py-2 text-sm font-semibold ${
                      action.intent === "primary"
                        ? "bg-brand-blue text-white"
                        : action.intent === "danger"
                          ? "bg-rose-600 text-white"
                          : "border border-slate-300 bg-white text-slate-700"
                    }`}
                  >
                    {action.label}
                  </button>
                </form>
              ))}
            </div>

            <form action={updateOrderStatusAction} className="mt-4 border-t border-slate-200 pt-4">
              <input type="hidden" name="orderId" value={order.id} />
              <input type="hidden" name="fulfillmentMethod" value={fulfillmentMethod} />
              <label className="block">
                <span className="text-xs font-semibold uppercase tracking-wide text-slate-600">
                  Changer statut
                </span>
                <select
                  name="status"
                  defaultValue={order.status}
                  className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700"
                >
                  {statusOptions.map((status) => (
                    <option key={status} value={status}>
                      {ORDER_STATUS_LABEL[status]}
                    </option>
                  ))}
                </select>
              </label>
              <button
                type="submit"
                className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700"
              >
                Mettre a jour
              </button>
            </form>

            <form action={saveOrderNoteAction} className="mt-4 border-t border-slate-200 pt-4">
              <input type="hidden" name="orderId" value={order.id} />
              <label className="block">
                <span className="text-xs font-semibold uppercase tracking-wide text-slate-600">
                  Note interne admin
                </span>
                <textarea
                  name="adminNote"
                  rows={5}
                  defaultValue={order.admin_note ?? ""}
                  placeholder="Ex: Client prefere appel avant livraison."
                  className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-700"
                />
              </label>
              <button
                type="submit"
                className="mt-2 w-full rounded-xl bg-brand-blue px-3 py-2 text-sm font-semibold text-white"
              >
                Enregistrer note
              </button>
            </form>
          </aside>
        </div>
      </div>
    </section>
  );
}
