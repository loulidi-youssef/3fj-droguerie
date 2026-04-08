import { revalidatePath } from "next/cache";
import Link from "next/link";
import { redirect } from "next/navigation";
import { FormSubmitButton } from "@/components/form-submit-button";
import {
  hasValidAdminSession,
  isAdminAuthConfigured,
} from "@/lib/admin-auth";
import {
  QUOTE_FOLLOW_UP_FILTER_LABEL,
  QUOTE_REQUEST_STATUSES,
  QUOTE_STATUS_BADGE_CLASSNAME,
  QUOTE_STATUS_LABEL,
  describeQuoteFollowUp,
  getAdminQuoteRequests,
  isQuoteFollowUpFilter,
  isQuoteInFollowUpFilter,
  getQuoteStatusCount,
  isNextQuoteStatusAllowed,
  resolveQuoteFollowUpRules,
  updateAdminQuoteRequestStatus,
  type QuoteFollowUpFilter,
} from "@/lib/admin-quotes";
import { isQuoteRequestStatus, type QuoteRequestStatus } from "@/lib/quote-requests";

type AdminQuotesPageProps = {
  searchParams: {
    q?: string | string[];
    status?: string | string[];
    followUp?: string | string[];
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

const formatNullableDateTime = (value: string | null): string => {
  if (!value) {
    return "-";
  }
  return formatDateTime(value);
};

const getFollowUpBadgeClassName = (
  followUpCategory: "a-traiter" | "en-attente" | "en-retard" | "none",
): string => {
  if (followUpCategory === "en-retard") {
    return "bg-rose-100 text-rose-700";
  }
  if (followUpCategory === "a-traiter") {
    return "bg-amber-100 text-amber-700";
  }
  if (followUpCategory === "en-attente") {
    return "bg-slate-100 text-slate-700";
  }
  return "bg-slate-100 text-slate-600";
};

const buildQuotesHref = (params: {
  q?: string;
  status?: string;
  followUp?: string;
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
  if (params.followUp?.trim() && params.followUp !== "all") {
    searchParams.set("followUp", params.followUp.trim());
  }
  if (params.updated?.trim()) {
    searchParams.set("updated", params.updated.trim());
  }
  if (params.error?.trim()) {
    searchParams.set("error", params.error.trim());
  }

  const query = searchParams.toString();
  return query ? `/admin/quotes?${query}` : "/admin/quotes";
};

const getItemsSummaryLabel = (
  items: Array<{
    productName: string;
    quantity: number;
  }>,
): string => {
  if (items.length === 0) {
    return "Aucun article";
  }

  if (items.length === 1) {
    const item = items[0];
    return `${item.productName} x${item.quantity}`;
  }

  const first = items[0];
  return `${first.productName} +${items.length - 1} autre(s)`;
};

const updateQuoteStatusAction = async (formData: FormData) => {
  "use server";

  if (!(await hasValidAdminSession())) {
    redirect("/admin/login");
  }

  const quoteRequestIdRaw = formData.get("quoteRequestId");
  const currentStatusRaw = formData.get("currentStatus");
  const nextStatusRaw = formData.get("nextStatus");
  const qRaw = formData.get("q");
  const statusFilterRaw = formData.get("statusFilter");
  const followUpFilterRaw = formData.get("followUpFilter");

  const quoteRequestId =
    typeof quoteRequestIdRaw === "string" ? quoteRequestIdRaw.trim() : "";
  const currentStatus =
    typeof currentStatusRaw === "string" ? currentStatusRaw.trim() : "";
  const nextStatus = typeof nextStatusRaw === "string" ? nextStatusRaw.trim() : "";
  const q = typeof qRaw === "string" ? qRaw : "";
  const statusFilter = typeof statusFilterRaw === "string" ? statusFilterRaw : "";
  const followUpFilter = typeof followUpFilterRaw === "string" ? followUpFilterRaw : "";

  if (
    !quoteRequestId ||
    !isQuoteRequestStatus(currentStatus) ||
    !isQuoteRequestStatus(nextStatus) ||
    !isNextQuoteStatusAllowed(currentStatus, nextStatus)
  ) {
    redirect(
      buildQuotesHref({
        q,
        status: statusFilter,
        followUp: followUpFilter,
        error: "invalid-status",
      }),
    );
  }

  const updated = await updateAdminQuoteRequestStatus(quoteRequestId, nextStatus);
  revalidatePath("/admin/quotes");
  revalidatePath(`/admin/quotes/${quoteRequestId}`);
  revalidatePath("/admin/quotes/analytics");
  revalidatePath("/admin");

  if (!updated) {
    redirect(
      buildQuotesHref({
        q,
        status: statusFilter,
        followUp: followUpFilter,
        error: "update-failed",
      }),
    );
  }

  redirect(
    buildQuotesHref({
      q,
      status: statusFilter,
      followUp: followUpFilter,
      updated: "1",
    }),
  );
};

export default async function AdminQuotesPage({ searchParams }: AdminQuotesPageProps) {
  if (!isAdminAuthConfigured()) {
    return (
      <section className="bg-brand-light py-12">
        <div className="mx-auto max-w-3xl rounded-2xl bg-white p-6 shadow-card">
          <h1 className="text-2xl font-extrabold text-brand-blue">Admin devis</h1>
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
  const followUpFilterRaw = toSingleValue(searchParams.followUp).trim().toLowerCase();
  const selectedStatus: QuoteRequestStatus | "all" =
    statusFilterRaw && statusFilterRaw !== "all" && isQuoteRequestStatus(statusFilterRaw)
      ? statusFilterRaw
      : "all";
  const selectedFollowUpFilter: QuoteFollowUpFilter = isQuoteFollowUpFilter(followUpFilterRaw)
    ? followUpFilterRaw
    : "all";
  const reminderRules = resolveQuoteFollowUpRules();

  const quoteRequests = await getAdminQuoteRequests({
    status: "all",
    limit: 1000,
  });

  const statusFilteredQuoteRequests =
    selectedStatus === "all"
      ? quoteRequests
      : quoteRequests.filter((request) => request.status === selectedStatus);
  const followUpFilteredQuoteRequests = statusFilteredQuoteRequests.filter((request) =>
    isQuoteInFollowUpFilter(request, selectedFollowUpFilter, {
      rules: reminderRules,
    }),
  );

  const filteredQuoteRequests = normalizedQuery
    ? followUpFilteredQuoteRequests.filter((request) => {
        const searchText = [
          request.id,
          request.anonymousId,
          request.userId ?? "",
          ...request.payload.items.map((item) => item.productName),
        ]
          .join(" ")
          .toLowerCase();

        return searchText.includes(normalizedQuery);
      })
    : followUpFilteredQuoteRequests;

  const followUpToProcessCount = statusFilteredQuoteRequests.filter((request) =>
    isQuoteInFollowUpFilter(request, "a-traiter", {
      rules: reminderRules,
    }),
  ).length;
  const followUpWaitingCount = statusFilteredQuoteRequests.filter((request) =>
    isQuoteInFollowUpFilter(request, "en-attente", {
      rules: reminderRules,
    }),
  ).length;
  const followUpOverdueCount = statusFilteredQuoteRequests.filter((request) =>
    isQuoteInFollowUpFilter(request, "en-retard", {
      rules: reminderRules,
    }),
  ).length;
  const followUpDescriptorById = new Map(
    filteredQuoteRequests.map((request) => [
      request.id,
      describeQuoteFollowUp(request, {
        rules: reminderRules,
      }),
    ]),
  );

  const updatedParam = toSingleValue(searchParams.updated);
  const errorParam = toSingleValue(searchParams.error);

  const newCount = getQuoteStatusCount("new", filteredQuoteRequests);
  const contactedCount = getQuoteStatusCount("contacted", filteredQuoteRequests);
  const convertedCount = getQuoteStatusCount("converted", filteredQuoteRequests);
  const closedCount = getQuoteStatusCount("closed", filteredQuoteRequests);

  return (
    <section className="bg-brand-light py-12">
      <div className="mx-auto max-w-7xl px-4 sm:px-5 lg:px-6">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h1 className="text-3xl font-extrabold text-brand-blue">Admin devis</h1>
            <p className="mt-1 text-sm text-slate-600">
              Gestion rapide des demandes de prix de gros capturees avant WhatsApp.
            </p>
          </div>
          <Link
            href="/admin"
            className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700"
          >
            Retour dashboard
          </Link>
          <Link
            href="/admin/quotes/analytics"
            className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700"
          >
            Voir analytics
          </Link>
        </div>

        {followUpToProcessCount > 0 || followUpOverdueCount > 0 ? (
          <article className="mb-4 rounded-2xl border border-amber-200 bg-amber-50 p-4">
            <p className="text-sm font-semibold text-amber-900">
              Vous avez {followUpToProcessCount + followUpOverdueCount} devis a suivre
              ({followUpOverdueCount} en retard).
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              <Link
                href={buildQuotesHref({
                  q: query,
                  status: selectedStatus,
                  followUp: "a-traiter",
                })}
                className="rounded-lg border border-amber-300 bg-white px-3 py-1 text-xs font-semibold text-amber-900"
              >
                Voir a traiter
              </Link>
              <Link
                href={buildQuotesHref({
                  q: query,
                  status: selectedStatus,
                  followUp: "en-retard",
                })}
                className="rounded-lg border border-rose-300 bg-white px-3 py-1 text-xs font-semibold text-rose-700"
              >
                Voir en retard
              </Link>
            </div>
          </article>
        ) : null}

        <div className="mb-4 grid gap-3 md:grid-cols-4">
          <article className="rounded-2xl bg-white p-4 shadow-card">
            <p className="text-xs uppercase tracking-wide text-slate-500">Nouveaux</p>
            <p className="mt-1 text-2xl font-extrabold text-sky-700">{newCount}</p>
          </article>
          <article className="rounded-2xl bg-white p-4 shadow-card">
            <p className="text-xs uppercase tracking-wide text-slate-500">Contactes</p>
            <p className="mt-1 text-2xl font-extrabold text-amber-700">{contactedCount}</p>
          </article>
          <article className="rounded-2xl bg-white p-4 shadow-card">
            <p className="text-xs uppercase tracking-wide text-slate-500">Convertis</p>
            <p className="mt-1 text-2xl font-extrabold text-emerald-700">{convertedCount}</p>
          </article>
          <article className="rounded-2xl bg-white p-4 shadow-card">
            <p className="text-xs uppercase tracking-wide text-slate-500">Clos</p>
            <p className="mt-1 text-2xl font-extrabold text-slate-700">{closedCount}</p>
          </article>
        </div>

        <article className="mb-4 rounded-2xl bg-white p-4 shadow-card">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-600">
            Filtres relance
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            <Link
              href={buildQuotesHref({ q: query, status: selectedStatus, followUp: "a-traiter" })}
              className={`rounded-xl px-3 py-2 text-sm font-semibold ${
                selectedFollowUpFilter === "a-traiter"
                  ? "bg-amber-100 text-amber-800"
                  : "border border-slate-300 bg-white text-slate-700"
              }`}
            >
              {QUOTE_FOLLOW_UP_FILTER_LABEL["a-traiter"]} ({followUpToProcessCount})
            </Link>
            <Link
              href={buildQuotesHref({ q: query, status: selectedStatus, followUp: "en-attente" })}
              className={`rounded-xl px-3 py-2 text-sm font-semibold ${
                selectedFollowUpFilter === "en-attente"
                  ? "bg-slate-200 text-slate-800"
                  : "border border-slate-300 bg-white text-slate-700"
              }`}
            >
              {QUOTE_FOLLOW_UP_FILTER_LABEL["en-attente"]} ({followUpWaitingCount})
            </Link>
            <Link
              href={buildQuotesHref({ q: query, status: selectedStatus, followUp: "en-retard" })}
              className={`rounded-xl px-3 py-2 text-sm font-semibold ${
                selectedFollowUpFilter === "en-retard"
                  ? "bg-rose-100 text-rose-700"
                  : "border border-slate-300 bg-white text-slate-700"
              }`}
            >
              {QUOTE_FOLLOW_UP_FILTER_LABEL["en-retard"]} ({followUpOverdueCount})
            </Link>
            <Link
              href={buildQuotesHref({ q: query, status: selectedStatus, followUp: "all" })}
              className={`rounded-xl px-3 py-2 text-sm font-semibold ${
                selectedFollowUpFilter === "all"
                  ? "bg-brand-blue text-white"
                  : "border border-slate-300 bg-white text-slate-700"
              }`}
            >
              {QUOTE_FOLLOW_UP_FILTER_LABEL.all}
            </Link>
          </div>
        </article>

        <form method="get" action="/admin/quotes" className="mb-4 rounded-2xl bg-white p-4 shadow-card">
          <input type="hidden" name="followUp" value={selectedFollowUpFilter} />
          <div className="grid gap-3 lg:grid-cols-3">
            <label className="block lg:col-span-2">
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-600">
                Recherche
              </span>
              <input
                type="search"
                name="q"
                defaultValue={query}
                placeholder="Produit, id demande, identifiant anonyme"
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
                {QUOTE_REQUEST_STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {QUOTE_STATUS_LABEL[status]}
                  </option>
                ))}
              </select>
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
              href="/admin/quotes"
              className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700"
            >
              Reinitialiser
            </Link>
          </div>
          <p className="mt-2 text-xs text-slate-500">
            Regles relance: nouveau en retard apres {reminderRules.newQuoteOverdueHours}h,
            contacte en retard apres {reminderRules.contactedQuoteOverdueHours}h.
          </p>
        </form>

        {updatedParam === "1" ? (
          <p className="mb-4 rounded-xl bg-emerald-50 p-3 text-sm font-medium text-emerald-700">
            Statut devis mis a jour.
          </p>
        ) : null}

        {errorParam ? (
          <p className="mb-4 rounded-xl bg-rose-50 p-3 text-sm font-medium text-rose-700">
            Action impossible. Merci de verifier le statut cible.
          </p>
        ) : null}

        <div className="rounded-2xl bg-white p-4 shadow-card">
          <p className="mb-3 text-sm font-semibold text-slate-600">
            {filteredQuoteRequests.length} demande(s) de devis
          </p>

          {filteredQuoteRequests.length === 0 ? (
            <p className="rounded-xl bg-slate-50 p-4 text-sm text-slate-600">
              Aucune demande de devis ne correspond aux filtres.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
                    <th className="px-3 py-2">Demande</th>
                    <th className="px-3 py-2">Produits</th>
                    <th className="px-3 py-2">Quantite</th>
                    <th className="px-3 py-2">Source</th>
                    <th className="px-3 py-2">Statut</th>
                    <th className="px-3 py-2">Relance</th>
                    <th className="px-3 py-2">Date</th>
                    <th className="px-3 py-2">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredQuoteRequests.map((request) => {
                    const nextStatuses = QUOTE_REQUEST_STATUSES.filter((status) =>
                      isNextQuoteStatusAllowed(request.status, status),
                    );
                    const followUpDescriptor = followUpDescriptorById.get(request.id) ?? {
                      signal: { category: "none", reason: "none", isOverdue: false, isDueToday: false },
                      label: "Aucune relance",
                    };

                    return (
                      <tr key={request.id} className="border-b border-slate-100 text-slate-700">
                        <td className="px-3 py-2">
                          <p className="font-semibold text-brand-blue">
                            {request.id.slice(0, 8)}
                          </p>
                          <p className="text-xs text-slate-500">
                            {request.userId ? "Client connecte" : "Client anonyme"} -{" "}
                            {request.anonymousId.slice(0, 18)}
                          </p>
                        </td>
                        <td className="px-3 py-2">
                          <p className="font-medium">
                            {getItemsSummaryLabel(
                              request.payload.items.map((item) => ({
                                productName: item.productName,
                                quantity: item.quantity,
                              })),
                            )}
                          </p>
                          <p className="text-xs text-slate-500">
                            {request.payload.summary.lineCount} ligne(s)
                          </p>
                        </td>
                        <td className="px-3 py-2 font-semibold">
                          {request.payload.summary.totalQuantity}
                        </td>
                        <td className="px-3 py-2">{request.payload.source}</td>
                        <td className="px-3 py-2">
                          <span
                            className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${QUOTE_STATUS_BADGE_CLASSNAME[request.status]}`}
                          >
                            {QUOTE_STATUS_LABEL[request.status]}
                          </span>
                        </td>
                        <td className="px-3 py-2">
                          <span
                            className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${getFollowUpBadgeClassName(followUpDescriptor.signal.category)}`}
                          >
                            {followUpDescriptor.label}
                          </span>
                          <p className="mt-1 text-[11px] text-slate-500">
                            Echeance: {formatNullableDateTime(request.nextActionDueAt)}
                          </p>
                        </td>
                        <td className="px-3 py-2">{formatDateTime(request.createdAt)}</td>
                        <td className="px-3 py-2">
                          <div className="flex flex-wrap gap-1">
                            <Link
                              href={`/admin/quotes/${request.id}`}
                              className="rounded-md border border-slate-300 bg-white px-2 py-1 text-[11px] font-semibold text-slate-700"
                            >
                              Detail
                            </Link>
                            {nextStatuses.length === 0 ? (
                              <span className="text-xs text-slate-500">Aucune</span>
                            ) : (
                              nextStatuses.map((nextStatus) => (
                                <form key={nextStatus} action={updateQuoteStatusAction}>
                                  <input type="hidden" name="quoteRequestId" value={request.id} />
                                  <input type="hidden" name="currentStatus" value={request.status} />
                                  <input type="hidden" name="nextStatus" value={nextStatus} />
                                  <input type="hidden" name="q" value={query} />
                                  <input type="hidden" name="statusFilter" value={selectedStatus} />
                                  <input
                                    type="hidden"
                                    name="followUpFilter"
                                    value={selectedFollowUpFilter}
                                  />
                                  <FormSubmitButton
                                    idleLabel={QUOTE_STATUS_LABEL[nextStatus]}
                                    pendingLabel="Maj..."
                                    className={`rounded-md px-2 py-1 text-[11px] font-semibold ${
                                      nextStatus === "closed"
                                        ? "border border-slate-300 bg-white text-slate-700"
                                        : nextStatus === "converted"
                                          ? "bg-emerald-600 text-white"
                                          : "bg-brand-blue text-white"
                                    }`}
                                  />
                                </form>
                              ))
                            )}
                          </div>
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
