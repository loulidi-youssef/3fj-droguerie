import Link from "next/link";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { notFound, redirect } from "next/navigation";
import { FormSubmitButton } from "@/components/form-submit-button";
import {
  hasValidAdminSession,
  isAdminAuthConfigured,
} from "@/lib/admin-auth";
import {
  QUOTE_STATUS_BADGE_CLASSNAME,
  QUOTE_STATUS_LABEL,
  QUOTE_REQUEST_STATUSES,
  createAdminQuoteRequestNote,
  describeQuoteFollowUp,
  getAdminQuoteRequestById,
  getAdminQuoteRequestNotes,
  isNextQuoteStatusAllowed,
  resolveQuoteFollowUpRules,
  updateAdminQuoteRequestNextAction,
  updateAdminQuoteRequestNote,
  updateAdminQuoteRequestStatus,
} from "@/lib/admin-quotes";
import { formatDh } from "@/lib/currency";
import { isQuoteRequestStatus } from "@/lib/quote-requests";
import { getRequestFingerprintHashFromHeaders } from "@/lib/request-client-id";

type AdminQuoteDetailPageProps = {
  params: {
    id: string;
  };
  searchParams: {
    updated?: string | string[];
    noteAdded?: string | string[];
    noteUpdated?: string | string[];
    followUpSaved?: string | string[];
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
    return "-";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("fr-MA", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
};

const parseDateTimeInput = (value: string | null): string | null => {
  if (!value) {
    return null;
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return parsed.toISOString();
};

const toDateTimeLocalInputValue = (value: string | null): string => {
  if (!value) {
    return "";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${year}-${month}-${day}T${hours}:${minutes}`;
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

const formatSource = (value: string): string => {
  const source = value.trim();
  if (!source) {
    return "unknown";
  }
  return source.replace(/[-_]+/g, " ");
};

const toAdminIdentifier = (): string | null => {
  const requestHeaders = headers();
  const fingerprint = getRequestFingerprintHashFromHeaders(requestHeaders);
  if (!fingerprint) {
    return null;
  }
  return `adm_${fingerprint.slice(0, 12)}`;
};

const buildQuoteDetailHref = (
  quoteRequestId: string,
  params: {
    updated?: string;
    noteAdded?: string;
    noteUpdated?: string;
    followUpSaved?: string;
    error?: string;
  },
): string => {
  const searchParams = new URLSearchParams();
  if (params.updated?.trim()) {
    searchParams.set("updated", params.updated.trim());
  }
  if (params.noteAdded?.trim()) {
    searchParams.set("noteAdded", params.noteAdded.trim());
  }
  if (params.noteUpdated?.trim()) {
    searchParams.set("noteUpdated", params.noteUpdated.trim());
  }
  if (params.followUpSaved?.trim()) {
    searchParams.set("followUpSaved", params.followUpSaved.trim());
  }
  if (params.error?.trim()) {
    searchParams.set("error", params.error.trim());
  }

  const query = searchParams.toString();
  return query ? `/admin/quotes/${quoteRequestId}?${query}` : `/admin/quotes/${quoteRequestId}`;
};

const updateQuoteStatusAction = async (formData: FormData) => {
  "use server";

  if (!(await hasValidAdminSession())) {
    redirect("/admin/login");
  }

  const quoteRequestIdRaw = formData.get("quoteRequestId");
  const currentStatusRaw = formData.get("currentStatus");
  const nextStatusRaw = formData.get("nextStatus");

  const quoteRequestId =
    typeof quoteRequestIdRaw === "string" ? quoteRequestIdRaw.trim() : "";
  const currentStatus =
    typeof currentStatusRaw === "string" ? currentStatusRaw.trim() : "";
  const nextStatus = typeof nextStatusRaw === "string" ? nextStatusRaw.trim() : "";

  if (
    !quoteRequestId ||
    !isQuoteRequestStatus(currentStatus) ||
    !isQuoteRequestStatus(nextStatus) ||
    !isNextQuoteStatusAllowed(currentStatus, nextStatus)
  ) {
    redirect(buildQuoteDetailHref(quoteRequestId, { error: "invalid-status" }));
  }

  const updated = await updateAdminQuoteRequestStatus(quoteRequestId, nextStatus);
  revalidatePath("/admin");
  revalidatePath("/admin/quotes");
  revalidatePath(`/admin/quotes/${quoteRequestId}`);
  revalidatePath("/admin/quotes/analytics");

  if (!updated) {
    redirect(buildQuoteDetailHref(quoteRequestId, { error: "update-failed" }));
  }

  redirect(buildQuoteDetailHref(quoteRequestId, { updated: "1" }));
};

const saveNextActionAction = async (formData: FormData) => {
  "use server";

  if (!(await hasValidAdminSession())) {
    redirect("/admin/login");
  }

  const quoteRequestIdRaw = formData.get("quoteRequestId");
  const nextActionRaw = formData.get("nextAction");
  const nextActionDueAtRaw = formData.get("nextActionDueAt");

  const quoteRequestId =
    typeof quoteRequestIdRaw === "string" ? quoteRequestIdRaw.trim() : "";
  const nextAction = typeof nextActionRaw === "string" ? nextActionRaw : null;
  const nextActionDueAtInput =
    typeof nextActionDueAtRaw === "string" ? nextActionDueAtRaw.trim() : "";
  const nextActionDueAt = parseDateTimeInput(nextActionDueAtInput || null);

  if (!quoteRequestId) {
    redirect("/admin/quotes?error=invalid-quote");
  }

  if (nextActionDueAtInput && !nextActionDueAt) {
    redirect(buildQuoteDetailHref(quoteRequestId, { error: "follow-up-invalid-date" }));
  }

  const updated = await updateAdminQuoteRequestNextAction(
    quoteRequestId,
    nextAction,
    nextActionDueAt,
  );
  revalidatePath("/admin");
  revalidatePath("/admin/quotes");
  revalidatePath(`/admin/quotes/${quoteRequestId}`);

  if (!updated) {
    redirect(buildQuoteDetailHref(quoteRequestId, { error: "follow-up-failed" }));
  }

  redirect(buildQuoteDetailHref(quoteRequestId, { followUpSaved: "1" }));
};

const addQuoteNoteAction = async (formData: FormData) => {
  "use server";

  if (!(await hasValidAdminSession())) {
    redirect("/admin/login");
  }

  const quoteRequestIdRaw = formData.get("quoteRequestId");
  const noteContentRaw = formData.get("noteContent");

  const quoteRequestId =
    typeof quoteRequestIdRaw === "string" ? quoteRequestIdRaw.trim() : "";
  const noteContent = typeof noteContentRaw === "string" ? noteContentRaw : "";

  if (!quoteRequestId) {
    redirect("/admin/quotes?error=invalid-quote");
  }

  const created = await createAdminQuoteRequestNote({
    quoteRequestId,
    content: noteContent,
    adminIdentifier: toAdminIdentifier(),
  });

  revalidatePath("/admin/quotes");
  revalidatePath(`/admin/quotes/${quoteRequestId}`);

  if (!created) {
    redirect(buildQuoteDetailHref(quoteRequestId, { error: "note-failed" }));
  }

  redirect(buildQuoteDetailHref(quoteRequestId, { noteAdded: "1" }));
};

const updateQuoteNoteAction = async (formData: FormData) => {
  "use server";

  if (!(await hasValidAdminSession())) {
    redirect("/admin/login");
  }

  const quoteRequestIdRaw = formData.get("quoteRequestId");
  const noteIdRaw = formData.get("noteId");
  const noteContentRaw = formData.get("noteContent");

  const quoteRequestId =
    typeof quoteRequestIdRaw === "string" ? quoteRequestIdRaw.trim() : "";
  const noteId =
    typeof noteIdRaw === "string" ? Number.parseInt(noteIdRaw, 10) : Number.NaN;
  const noteContent = typeof noteContentRaw === "string" ? noteContentRaw : "";

  if (!quoteRequestId || !Number.isInteger(noteId) || noteId < 1) {
    redirect(buildQuoteDetailHref(quoteRequestId, { error: "note-update-invalid" }));
  }

  const updated = await updateAdminQuoteRequestNote({
    quoteRequestId,
    noteId,
    content: noteContent,
  });

  revalidatePath("/admin/quotes");
  revalidatePath(`/admin/quotes/${quoteRequestId}`);

  if (!updated) {
    redirect(buildQuoteDetailHref(quoteRequestId, { error: "note-update-failed" }));
  }

  redirect(buildQuoteDetailHref(quoteRequestId, { noteUpdated: "1" }));
};

export default async function AdminQuoteDetailPage({
  params,
  searchParams,
}: AdminQuoteDetailPageProps) {
  if (!isAdminAuthConfigured()) {
    return (
      <section className="bg-brand-light py-12">
        <div className="mx-auto max-w-3xl rounded-2xl bg-white p-6 shadow-card">
          <h1 className="text-2xl font-extrabold text-brand-blue">Admin detail devis</h1>
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

  const [quoteRequest, quoteNotes] = await Promise.all([
    getAdminQuoteRequestById(params.id),
    getAdminQuoteRequestNotes(params.id),
  ]);

  if (!quoteRequest) {
    notFound();
  }

  const reminderRules = resolveQuoteFollowUpRules();
  const followUpDescriptor = describeQuoteFollowUp(quoteRequest, {
    rules: reminderRules,
  });
  const nextStatuses = QUOTE_REQUEST_STATUSES.filter((status) =>
    isNextQuoteStatusAllowed(quoteRequest.status, status),
  );

  const updated = toSingleValue(searchParams.updated);
  const noteAdded = toSingleValue(searchParams.noteAdded);
  const noteUpdated = toSingleValue(searchParams.noteUpdated);
  const followUpSaved = toSingleValue(searchParams.followUpSaved);
  const error = toSingleValue(searchParams.error);

  return (
    <section className="bg-brand-light py-12">
      <div className="mx-auto max-w-7xl px-4 sm:px-5 lg:px-6">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h1 className="text-3xl font-extrabold text-brand-blue">Detail devis</h1>
            <p className="mt-1 text-sm text-slate-600">
              Suivi CRM d'une demande de devis avec notes internes et relance.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href="/admin/quotes"
              className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700"
            >
              Retour devis
            </Link>
            <Link
              href="/admin/quotes/analytics"
              className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700"
            >
              Analytics
            </Link>
          </div>
        </div>

        {updated === "1" ? (
          <p className="mb-4 rounded-xl bg-emerald-50 p-3 text-sm font-medium text-emerald-700">
            Statut devis mis a jour.
          </p>
        ) : null}
        {followUpSaved === "1" ? (
          <p className="mb-4 rounded-xl bg-emerald-50 p-3 text-sm font-medium text-emerald-700">
            Prochaine action enregistree.
          </p>
        ) : null}
        {noteAdded === "1" ? (
          <p className="mb-4 rounded-xl bg-emerald-50 p-3 text-sm font-medium text-emerald-700">
            Note interne ajoutee.
          </p>
        ) : null}
        {noteUpdated === "1" ? (
          <p className="mb-4 rounded-xl bg-emerald-50 p-3 text-sm font-medium text-emerald-700">
            Note interne mise a jour.
          </p>
        ) : null}
        {error ? (
          <p className="mb-4 rounded-xl bg-rose-50 p-3 text-sm font-medium text-rose-700">
            {error === "follow-up-invalid-date"
              ? "Date de relance invalide. Merci de verifier le format."
              : "Action impossible. Merci de verifier les informations envoyees."}
          </p>
        ) : null}

        <div className="grid gap-4 lg:grid-cols-3">
          <article className="rounded-2xl bg-white p-5 shadow-card lg:col-span-2">
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-xl bg-slate-50 p-3">
                <p className="text-xs uppercase tracking-wide text-slate-500">Demande</p>
                <p className="mt-1 text-sm font-bold text-brand-blue">{quoteRequest.id}</p>
              </div>
              <div className="rounded-xl bg-slate-50 p-3">
                <p className="text-xs uppercase tracking-wide text-slate-500">Cree le</p>
                <p className="mt-1 text-sm font-semibold text-slate-700">
                  {formatDateTime(quoteRequest.createdAt)}
                </p>
              </div>
              <div className="rounded-xl bg-slate-50 p-3">
                <p className="text-xs uppercase tracking-wide text-slate-500">Statut</p>
                <span
                  className={`mt-1 inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${QUOTE_STATUS_BADGE_CLASSNAME[quoteRequest.status]}`}
                >
                  {QUOTE_STATUS_LABEL[quoteRequest.status]}
                </span>
              </div>
              <div className="rounded-xl bg-slate-50 p-3">
                <p className="text-xs uppercase tracking-wide text-slate-500">Maj le</p>
                <p className="mt-1 text-sm font-semibold text-slate-700">
                  {formatDateTime(quoteRequest.updatedAt)}
                </p>
              </div>
            </div>

            <div className="mt-4 grid gap-4 rounded-xl border border-slate-200 p-4 md:grid-cols-2">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Identifiants lead
                </p>
                <p className="mt-2 text-sm text-slate-700">
                  <span className="font-semibold">User ID:</span> {quoteRequest.userId ?? "-"}
                </p>
                <p className="mt-1 text-sm text-slate-700">
                  <span className="font-semibold">Anonymous ID:</span> {quoteRequest.anonymousId}
                </p>
                <p className="mt-1 text-sm text-slate-700">
                  <span className="font-semibold">Fingerprint:</span>{" "}
                  {quoteRequest.payload.context.requestFingerprintHash || "-"}
                </p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Contexte demande
                </p>
                <p className="mt-2 text-sm text-slate-700">
                  <span className="font-semibold">Source:</span>{" "}
                  {formatSource(quoteRequest.payload.source)}
                </p>
                <p className="mt-1 text-sm text-slate-700">
                  <span className="font-semibold">Fulfillment:</span>{" "}
                  {quoteRequest.payload.fulfillmentMethod === "pickup"
                    ? "Retrait magasin"
                    : quoteRequest.payload.fulfillmentMethod === "delivery"
                      ? "Livraison"
                      : "-"}
                </p>
                <p className="mt-1 text-sm text-slate-700">
                  <span className="font-semibold">User agent:</span>{" "}
                  {quoteRequest.payload.context.userAgent ?? "-"}
                </p>
              </div>
            </div>

            <div className="mt-4 overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
                    <th className="px-2 py-2">Produit</th>
                    <th className="px-2 py-2">Variante</th>
                    <th className="px-2 py-2">Quantite</th>
                    <th className="px-2 py-2">Prix unitaire estime</th>
                    <th className="px-2 py-2">Total estime</th>
                  </tr>
                </thead>
                <tbody>
                  {quoteRequest.payload.items.map((item) => (
                    <tr
                      key={`${item.productId}::${item.variantId ?? "base"}`}
                      className="border-b border-slate-100 text-slate-700"
                    >
                      <td className="px-2 py-2 font-semibold">{item.productName}</td>
                      <td className="px-2 py-2 text-xs text-slate-600">
                        {item.variantLabel ?? item.variantId ?? "-"}
                      </td>
                      <td className="px-2 py-2">
                        {item.quantity} {item.unitLabel ?? ""}
                      </td>
                      <td className="px-2 py-2">{formatDh(item.estimatedUnitPrice)}</td>
                      <td className="px-2 py-2 font-semibold text-brand-blue">
                        {formatDh(item.estimatedTotal)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-4 grid gap-2 rounded-xl bg-slate-50 p-3 text-sm text-slate-700 sm:grid-cols-3">
              <p>
                <span className="font-semibold">Lignes:</span>{" "}
                {quoteRequest.payload.summary.lineCount}
              </p>
              <p>
                <span className="font-semibold">Quantite totale:</span>{" "}
                {quoteRequest.payload.summary.totalQuantity}
              </p>
              <p className="font-bold text-brand-blue">
                <span className="font-semibold">Sous-total estime:</span>{" "}
                {formatDh(quoteRequest.payload.summary.estimatedSubtotal)}
              </p>
            </div>
          </article>

          <aside className="rounded-2xl bg-white p-5 shadow-card">
            <h2 className="text-base font-bold text-brand-blue">Pilotage devis</h2>
            <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Rappel
              </p>
              <span
                className={`mt-2 inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${getFollowUpBadgeClassName(followUpDescriptor.signal.category)}`}
              >
                {followUpDescriptor.label}
              </span>
              {quoteRequest.nextActionDueAt ? (
                <p className="mt-2 text-xs text-slate-600">
                  Echeance: {formatDateTime(quoteRequest.nextActionDueAt)}
                </p>
              ) : null}
            </div>

            <div className="mt-3 border-t border-slate-200 pt-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Statut et progression
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                {nextStatuses.length === 0 ? (
                  <p className="text-sm text-slate-600">Aucune transition disponible.</p>
                ) : (
                  nextStatuses.map((nextStatus) => (
                    <form key={nextStatus} action={updateQuoteStatusAction}>
                      <input type="hidden" name="quoteRequestId" value={quoteRequest.id} />
                      <input type="hidden" name="currentStatus" value={quoteRequest.status} />
                      <input type="hidden" name="nextStatus" value={nextStatus} />
                      <FormSubmitButton
                        idleLabel={`Passer en ${QUOTE_STATUS_LABEL[nextStatus]}`}
                        pendingLabel="Mise a jour..."
                        className={`rounded-xl px-3 py-2 text-xs font-semibold ${
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
            </div>

            <div className="mt-4 border-t border-slate-200 pt-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Suivi dates
              </p>
              <p className="mt-2 text-sm text-slate-700">
                <span className="font-semibold">Contacte le:</span>{" "}
                {formatDateTime(quoteRequest.contactedAt)}
              </p>
              <p className="mt-1 text-sm text-slate-700">
                <span className="font-semibold">Converti le:</span>{" "}
                {formatDateTime(quoteRequest.convertedAt)}
              </p>
              <p className="mt-1 text-sm text-slate-700">
                <span className="font-semibold">Clos le:</span>{" "}
                {formatDateTime(quoteRequest.closedAt)}
              </p>
              <p className="mt-1 text-sm text-slate-700">
                <span className="font-semibold">Prochaine relance:</span>{" "}
                {formatDateTime(quoteRequest.nextActionDueAt)}
              </p>
            </div>

            <form action={saveNextActionAction} className="mt-4 border-t border-slate-200 pt-3">
              <input type="hidden" name="quoteRequestId" value={quoteRequest.id} />
              <label className="block">
                <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Prochaine action
                </span>
                <textarea
                  name="nextAction"
                  rows={4}
                  defaultValue={quoteRequest.nextAction ?? ""}
                  placeholder="Ex: Relancer jeudi matin avec prix final livraison."
                  className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-700"
                />
              </label>
              <label className="mt-3 block">
                <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Date de relance
                </span>
                <input
                  type="datetime-local"
                  name="nextActionDueAt"
                  defaultValue={toDateTimeLocalInputValue(quoteRequest.nextActionDueAt)}
                  className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700"
                />
              </label>
              <p className="mt-2 text-xs text-slate-500">
                Relance en retard apres {reminderRules.newQuoteOverdueHours}h (nouveau) et{" "}
                {reminderRules.contactedQuoteOverdueHours}h (contacte).
              </p>
              <FormSubmitButton
                idleLabel="Enregistrer action"
                pendingLabel="Enregistrement..."
                className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700"
              />
            </form>
          </aside>
        </div>

        <article className="mt-4 rounded-2xl bg-white p-5 shadow-card">
          <h2 className="text-lg font-bold text-brand-blue">Notes internes</h2>
          <p className="mt-1 text-sm text-slate-600">
            Ces notes sont visibles uniquement dans l'admin.
          </p>

          <form action={addQuoteNoteAction} className="mt-4 rounded-xl border border-slate-200 p-3">
            <input type="hidden" name="quoteRequestId" value={quoteRequest.id} />
            <label className="block">
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Nouvelle note
              </span>
              <textarea
                name="noteContent"
                rows={4}
                placeholder="Ex: Client demande remise si commande >= 300 unites."
                className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-700"
              />
            </label>
            <FormSubmitButton
              idleLabel="Ajouter note"
              pendingLabel="Ajout..."
              className="mt-2 rounded-xl bg-brand-blue px-4 py-2 text-sm font-semibold text-white"
            />
          </form>

          {quoteNotes.length === 0 ? (
            <p className="mt-4 rounded-xl bg-slate-50 p-4 text-sm text-slate-600">
              Aucune note interne pour cette demande.
            </p>
          ) : (
            <div className="mt-4 space-y-3">
              {quoteNotes.map((note) => (
                <form
                  key={note.id}
                  action={updateQuoteNoteAction}
                  className="rounded-xl border border-slate-200 p-3"
                >
                  <input type="hidden" name="quoteRequestId" value={quoteRequest.id} />
                  <input type="hidden" name="noteId" value={note.id} />

                  <div className="mb-2 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
                    <p>
                      Creee le {formatDateTime(note.createdAt)}
                      {note.adminIdentifier ? ` - ${note.adminIdentifier}` : ""}
                    </p>
                    <p>Maj {formatDateTime(note.updatedAt)}</p>
                  </div>

                  <textarea
                    name="noteContent"
                    rows={3}
                    defaultValue={note.content}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-700"
                  />

                  <FormSubmitButton
                    idleLabel="Mettre a jour note"
                    pendingLabel="Enregistrement..."
                    className="mt-2 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700"
                  />
                </form>
              ))}
            </div>
          )}
        </article>
      </div>
    </section>
  );
}
