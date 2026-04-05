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
  deleteAdminCustomerAccount,
  getAdminCustomerDetail,
  setAdminCustomerSuspended,
  type AdminCustomerAccountStatus,
} from "@/lib/admin-customers";

type AdminCustomerDetailPageProps = {
  params: {
    customerId: string;
  };
  searchParams: {
    success?: string | string[];
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

const statusBadgeClassName = (status: string): string => {
  if (status === "delivered") {
    return "bg-emerald-100 text-emerald-700";
  }
  if (status === "confirmed") {
    return "bg-amber-100 text-amber-700";
  }
  if (status === "cancelled") {
    return "bg-rose-100 text-rose-700";
  }
  return "bg-sky-100 text-sky-700";
};

const statusLabel = (status: string): string => {
  if (status === "delivered") {
    return "Livree";
  }
  if (status === "confirmed") {
    return "Confirmee";
  }
  if (status === "cancelled") {
    return "Annulee";
  }
  return "Nouvelle";
};

const accountStatusBadgeClassName = (status: AdminCustomerAccountStatus): string => {
  if (status === "active") {
    return "bg-emerald-100 text-emerald-700";
  }
  if (status === "suspended") {
    return "bg-amber-100 text-amber-700";
  }
  return "bg-slate-200 text-slate-700";
};

const accountStatusLabel = (status: AdminCustomerAccountStatus): string => {
  if (status === "active") {
    return "Actif";
  }
  if (status === "suspended") {
    return "Suspendu";
  }
  return "Invite";
};

const toWhatsappUrl = (rawPhone: string | null): string | null => {
  if (!rawPhone) {
    return null;
  }

  const digits = rawPhone.replace(/[^\d]/g, "");
  if (!digits) {
    return null;
  }

  return `https://wa.me/${digits}`;
};

const redirectWithSuccess = (customerId: string, message: string): never => {
  redirect(`/admin/customers/${customerId}?success=${encodeURIComponent(message)}`);
};

const redirectWithError = (customerId: string, message: string): never => {
  redirect(`/admin/customers/${customerId}?error=${encodeURIComponent(message)}`);
};

const logoutAdminAction = async () => {
  "use server";
  await clearAdminSession();
  redirect("/admin/login");
};

const toggleCustomerSuspendedAction = async (formData: FormData) => {
  "use server";

  if (!(await hasValidAdminSession())) {
    redirect("/admin/login");
  }

  const userIdRaw = formData.get("userId");
  const nextSuspendedRaw = formData.get("nextSuspended");
  const userId = typeof userIdRaw === "string" ? userIdRaw.trim() : "";
  const nextSuspended = nextSuspendedRaw === "true";

  if (!userId) {
    redirect("/admin/customers?error=Client%20introuvable.");
  }

  const result = await setAdminCustomerSuspended(userId, nextSuspended);
  if (!result.ok) {
    redirectWithError(userId, result.error ?? "Impossible de mettre a jour le compte.");
  }

  revalidatePath("/admin/customers");
  revalidatePath(`/admin/customers/${userId}`);
  redirectWithSuccess(userId, nextSuspended ? "Compte suspendu." : "Compte reactive.");
};

const deleteCustomerAccountAction = async (formData: FormData) => {
  "use server";

  if (!(await hasValidAdminSession())) {
    redirect("/admin/login");
  }

  const userIdRaw = formData.get("userId");
  const userId = typeof userIdRaw === "string" ? userIdRaw.trim() : "";

  if (!userId) {
    redirect("/admin/customers?error=Client%20introuvable.");
  }

  const result = await deleteAdminCustomerAccount(userId);
  if (!result.ok) {
    redirectWithError(userId, result.error ?? "Suppression impossible.");
  }

  revalidatePath("/admin/customers");
  revalidatePath("/admin/orders");
  redirect(`/admin/customers?success=${encodeURIComponent("Compte client supprime.")}`);
};

export default async function AdminCustomerDetailPage({
  params,
  searchParams,
}: AdminCustomerDetailPageProps) {
  if (!isAdminAuthConfigured()) {
    return (
      <section className="bg-brand-light py-12">
        <div className="mx-auto max-w-3xl rounded-2xl bg-white p-6 shadow-card">
          <h1 className="text-2xl font-extrabold text-brand-blue">Admin client</h1>
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

  if (!(await hasValidAdminSession())) {
    redirect("/admin/login");
  }

  const customer = await getAdminCustomerDetail(params.customerId);
  if (!customer) {
    notFound();
  }

  const successMessage = decodeURIComponent(toSingleValue(searchParams.success) || "");
  const errorMessage = decodeURIComponent(toSingleValue(searchParams.error) || "");
  const whatsappLink = toWhatsappUrl(customer.phone);

  return (
    <section className="bg-brand-light py-12">
      <div className="mx-auto max-w-7xl px-4 sm:px-5 lg:px-6">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-3xl font-extrabold text-brand-blue">Detail client</h1>
            <p className="mt-1 text-sm text-slate-600">Profil client et resume de ses commandes.</p>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/admin/customers"
              className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700"
            >
              Retour clients
            </Link>
            <Link
              href="/admin/orders"
              className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700"
            >
              Voir commandes
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

        {successMessage ? (
          <p className="mb-4 rounded-xl bg-emerald-50 p-3 text-sm font-medium text-emerald-700">
            {successMessage}
          </p>
        ) : null}

        {errorMessage ? (
          <p className="mb-4 rounded-xl bg-rose-50 p-3 text-sm font-medium text-rose-700">
            {errorMessage}
          </p>
        ) : null}

        <div className="grid gap-4 lg:grid-cols-3">
          <article className="rounded-2xl bg-white p-5 shadow-card lg:col-span-1">
            <h2 className="text-lg font-bold text-brand-blue">{customer.displayName}</h2>

            <div className="mt-3 flex items-center gap-2">
              <span
                className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${accountStatusBadgeClassName(customer.accountStatus)}`}
              >
                Compte {accountStatusLabel(customer.accountStatus)}
              </span>
              <span
                className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${statusBadgeClassName(customer.latestOrderStatus ?? "new")}`}
              >
                Dernier statut: {statusLabel(customer.latestOrderStatus ?? "new")}
              </span>
            </div>

            <dl className="mt-3 space-y-2 text-sm text-slate-700">
              <div>
                <dt className="text-xs uppercase tracking-wide text-slate-500">Email</dt>
                <dd>{customer.email ?? "Non disponible"}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wide text-slate-500">Telephone</dt>
                <dd>{customer.phone ?? "Non disponible"}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wide text-slate-500">Creation compte</dt>
                <dd>{formatDateTime(customer.accountCreatedAt)}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wide text-slate-500">Nombre de commandes</dt>
                <dd>{customer.orderCount}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wide text-slate-500">Total cumule</dt>
                <dd className="font-semibold text-brand-blue">{formatDh(customer.totalSpent)}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wide text-slate-500">Derniere commande</dt>
                <dd>{formatDateTime(customer.lastOrderAt)}</dd>
              </div>
            </dl>

            <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-slate-200 pt-4">
              {whatsappLink ? (
                <Link
                  href={whatsappLink}
                  className="rounded-lg border border-emerald-300 px-3 py-1.5 text-xs font-semibold text-emerald-700 transition hover:border-emerald-400"
                  target="_blank"
                  rel="noreferrer"
                >
                  Contacter WhatsApp
                </Link>
              ) : null}

              {customer.email ? (
                <Link
                  href={`/mot-de-passe-oublie?email=${encodeURIComponent(customer.email)}`}
                  className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:border-brand-orange hover:text-brand-orange"
                  target="_blank"
                  rel="noreferrer"
                >
                  Aide reset mdp
                </Link>
              ) : null}

              <form action={toggleCustomerSuspendedAction}>
                <input type="hidden" name="userId" value={customer.userId} />
                <input
                  type="hidden"
                  name="nextSuspended"
                  value={customer.accountStatus === "suspended" ? "false" : "true"}
                />
                <button
                  type="submit"
                  className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:border-brand-orange hover:text-brand-orange"
                >
                  {customer.accountStatus === "suspended" ? "Reactiver compte" : "Suspendre compte"}
                </button>
              </form>

              <form action={deleteCustomerAccountAction}>
                <input type="hidden" name="userId" value={customer.userId} />
                <button
                  type="submit"
                  className="rounded-lg border border-rose-300 px-3 py-1.5 text-xs font-semibold text-rose-700 transition hover:border-rose-400"
                >
                  Supprimer compte
                </button>
              </form>
            </div>
          </article>

          <article className="rounded-2xl bg-white p-5 shadow-card lg:col-span-2">
            <h2 className="text-lg font-bold text-brand-blue">Commandes du client</h2>
            {customer.orders.length === 0 ? (
              <p className="mt-3 text-sm text-slate-600">Aucune commande.</p>
            ) : (
              <div className="mt-3 overflow-x-auto">
                <table className="min-w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
                      <th className="px-3 py-2">Commande</th>
                      <th className="px-3 py-2">Date</th>
                      <th className="px-3 py-2">Statut</th>
                      <th className="px-3 py-2">Total</th>
                      <th className="px-3 py-2">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {customer.orders.map((order) => (
                      <tr key={order.id} className="border-b border-slate-100 text-slate-700">
                        <td className="px-3 py-2 font-semibold">{order.id}</td>
                        <td className="px-3 py-2">{formatDateTime(order.createdAt)}</td>
                        <td className="px-3 py-2">
                          <span
                            className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${statusBadgeClassName(order.status)}`}
                          >
                            {statusLabel(order.status)}
                          </span>
                        </td>
                        <td className="px-3 py-2 font-semibold">{formatDh(order.total)}</td>
                        <td className="px-3 py-2">
                          <Link
                            href="/admin/orders"
                            className="rounded-lg border border-slate-300 px-2.5 py-1 text-xs font-semibold text-slate-700 transition hover:border-brand-orange hover:text-brand-orange"
                          >
                            Ouvrir commandes
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </article>
        </div>
      </div>
    </section>
  );
}

