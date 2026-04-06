"use client";

import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { businessInfo } from "@/data/business";
import { formatDh } from "@/lib/currency";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";

type CustomerOrderItem = {
  id: number;
  product_name: string;
  quantity: number;
  unit_price: number;
  line_total: number;
};

type CustomerOrder = {
  id: string;
  created_at: string;
  status:
    | "new"
    | "confirmed"
    | "preparing"
    | "ready"
    | "shipped"
    | "collected"
    | "delivered"
    | "cancelled";
  fulfillmentMethod: "delivery" | "pickup";
  customer_name: string;
  customer_phone: string;
  customer_address: string;
  customer_location: string;
  subtotal: number;
  delivery_fee: number;
  total: number;
  order_items: CustomerOrderItem[];
  paymentMethod: string | null;
  canCancel: boolean;
  cancellationDeadline: string | null;
  cannotCancelMessage: string | null;
};

type OrderDetailsApiResponse = {
  order?: CustomerOrder;
  error?: string;
};

const statusLabel: Record<CustomerOrder["status"], string> = {
  new: "Nouvelle",
  confirmed: "Acceptee / Confirmee",
  preparing: "En preparation",
  ready: "Prete",
  shipped: "Expediee",
  collected: "Recuperee",
  delivered: "Livree",
  cancelled: "Annulee",
};

const statusClassName: Record<CustomerOrder["status"], string> = {
  new: "bg-sky-100 text-sky-700",
  confirmed: "bg-amber-100 text-amber-700",
  preparing: "bg-orange-100 text-orange-700",
  ready: "bg-indigo-100 text-indigo-700",
  shipped: "bg-cyan-100 text-cyan-700",
  collected: "bg-emerald-100 text-emerald-700",
  delivered: "bg-emerald-100 text-emerald-700",
  cancelled: "bg-rose-100 text-rose-700",
};

const deliveryTrackingSteps = [
  { id: "new", label: "Nouvelle" },
  { id: "confirmed", label: "Acceptee / Confirmee" },
  { id: "preparing", label: "En preparation" },
  { id: "shipped", label: "En livraison / Expediee" },
  { id: "delivered", label: "Livree" },
] as const;

const pickupTrackingSteps = [
  { id: "new", label: "Nouvelle" },
  { id: "confirmed", label: "Acceptee / Confirmee" },
  { id: "preparing", label: "En preparation" },
  { id: "ready", label: "Prete" },
  { id: "collected", label: "Recuperee" },
] as const;

const getDeliveryTrackingIndex = (status: CustomerOrder["status"]): number => {
  if (status === "new") {
    return 0;
  }
  if (status === "confirmed") {
    return 1;
  }
  if (status === "preparing") {
    return 2;
  }
  if (status === "shipped") {
    return 3;
  }
  if (status === "delivered") {
    return 4;
  }
  return -1;
};

const getPickupTrackingIndex = (status: CustomerOrder["status"]): number => {
  if (status === "new") {
    return 0;
  }
  if (status === "confirmed") {
    return 1;
  }
  if (status === "preparing") {
    return 2;
  }
  if (status === "ready") {
    return 3;
  }
  if (status === "collected") {
    return 4;
  }
  return -1;
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

const formatCancellationDeadline = (value: string | null): string => {
  if (!value) {
    return "";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return new Intl.DateTimeFormat("fr-MA", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(date);
};

const isOrderStillCancellable = (
  order: CustomerOrder,
  nowMs: number,
): boolean => {
  if (!order.canCancel || order.status !== "new" || !order.cancellationDeadline) {
    return false;
  }

  const deadlineMs = new Date(order.cancellationDeadline).getTime();
  if (Number.isNaN(deadlineMs)) {
    return false;
  }

  return nowMs <= deadlineMs;
};

export default function CompteCommandeDetailsPage() {
  const router = useRouter();
  const params = useParams<{ orderId: string }>();
  const searchParams = useSearchParams();
  const supabase = useMemo(() => getSupabaseBrowserClient(), []);
  const [order, setOrder] = useState<CustomerOrder | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [isCancelling, setIsCancelling] = useState(false);
  const [nowMs, setNowMs] = useState(() => Date.now());

  const orderId = typeof params.orderId === "string" ? params.orderId : "";

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setNowMs(Date.now());
    }, 30_000);

    return () => window.clearInterval(intervalId);
  }, []);

  const fetchOrder = async (accessToken: string) => {
    const response = await fetch(`/api/account/orders/${encodeURIComponent(orderId)}`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      cache: "no-store",
    });

    const payload = (await response.json()) as OrderDetailsApiResponse;
    if (!response.ok || !payload.order) {
      throw new Error(payload.error ?? "Impossible de recuperer la commande.");
    }

    setOrder(payload.order);
  };

  useEffect(() => {
    if (!orderId) {
      setErrorMessage("Commande introuvable.");
      setIsLoading(false);
      return;
    }

    if (!supabase) {
      router.replace(`/login?next=/compte/commandes/${encodeURIComponent(orderId)}`);
      return;
    }

    let isMounted = true;

    const loadOrder = async () => {
      setIsLoading(true);
      setErrorMessage(null);

      const { data } = await supabase.auth.getSession();
      if (!isMounted) {
        return;
      }

      const session = data.session;
      if (!session) {
        router.replace(`/login?next=/compte/commandes/${encodeURIComponent(orderId)}`);
        return;
      }

      try {
        await fetchOrder(session.access_token);
      } catch (error) {
        if (!isMounted) {
          return;
        }
        setErrorMessage(
          error instanceof Error
            ? error.message
            : "Impossible de recuperer la commande.",
        );
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    void loadOrder();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!session) {
        router.replace(`/login?next=/compte/commandes/${encodeURIComponent(orderId)}`);
        return;
      }

      try {
        await fetchOrder(session.access_token);
      } catch (error) {
        setErrorMessage(
          error instanceof Error
            ? error.message
            : "Impossible de recuperer la commande.",
        );
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [orderId, router, supabase]);

  const handleCancelOrder = async () => {
    if (!supabase || !order) {
      return;
    }

    setActionMessage(null);
    setErrorMessage(null);
    setIsCancelling(true);

    try {
      const { data } = await supabase.auth.getSession();
      if (!data.session) {
        router.replace(`/login?next=/compte/commandes/${encodeURIComponent(orderId)}`);
        return;
      }

      const response = await fetch(
        `/api/account/orders/${encodeURIComponent(order.id)}/cancel`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${data.session.access_token}`,
          },
        },
      );

      const payload = (await response.json()) as { ok?: boolean; error?: string };
      if (!response.ok) {
        throw new Error(payload.error ?? "Annulation impossible.");
      }

      await fetchOrder(data.session.access_token);
      setActionMessage("Commande annulee avec succes.");
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Annulation impossible pour le moment.",
      );
    } finally {
      setIsCancelling(false);
    }
  };

  if (isLoading) {
    return (
      <section className="section-padding bg-brand-light">
        <div className="mx-auto max-w-5xl px-4 sm:px-5 lg:px-6">
          <p className="rounded-xl bg-white p-4 text-sm text-slate-600 shadow-card">
            Chargement des details de la commande...
          </p>
        </div>
      </section>
    );
  }

  if (!order) {
    return (
      <section className="section-padding bg-brand-light">
        <div className="mx-auto max-w-5xl px-4 sm:px-5 lg:px-6">
          <div className="rounded-2xl bg-white p-6 shadow-card">
            <p className="text-sm font-medium text-rose-700">
              {errorMessage ?? "Commande introuvable."}
            </p>
            <Link
              href="/compte/commandes"
              className="mt-4 inline-flex rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700"
            >
              Retour a mes commandes
            </Link>
          </div>
        </div>
      </section>
    );
  }

  const isPickupOrder = order.fulfillmentMethod === "pickup";
  const trackingIndex = isPickupOrder
    ? getPickupTrackingIndex(order.status)
    : getDeliveryTrackingIndex(order.status);
  const trackingSteps = isPickupOrder ? pickupTrackingSteps : deliveryTrackingSteps;
  const isCancelled = order.status === "cancelled";
  const showSuccessBanner = searchParams.get("success") === "1";
  const canCancelNow = isOrderStillCancellable(order, nowMs);

  return (
    <section className="section-padding bg-brand-light">
      <div className="mx-auto max-w-5xl px-4 sm:px-5 lg:px-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-brand-blue sm:text-4xl">
              Suivre votre commande
            </h1>
            <p className="mt-2 text-sm text-slate-600">
              Reference: <span className="font-semibold text-brand-blue">{order.id}</span>
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Link href="/compte/commandes" className="btn-outline-brand">
              Retour a mes commandes
            </Link>
            <Link
              href="/produits"
              className="rounded-xl bg-brand-blue px-4 py-2 text-sm font-semibold text-white"
            >
              Continuer mes achats
            </Link>
          </div>
        </div>

        {showSuccessBanner ? (
          <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4">
            <p className="text-sm font-semibold text-emerald-800">
              Votre commande a bien ete enregistree.
            </p>
            <p className="mt-1 text-sm text-emerald-700">
              Vous pouvez suivre votre commande ci-dessous.
            </p>
          </div>
        ) : null}

        {actionMessage ? (
          <p className="mt-4 rounded-xl bg-emerald-50 p-3 text-sm font-medium text-emerald-700">
            {actionMessage}
          </p>
        ) : null}

        {errorMessage ? (
          <p className="mt-4 rounded-xl bg-rose-50 p-3 text-sm font-medium text-rose-700">
            {errorMessage}
          </p>
        ) : null}

        <article className="mt-6 rounded-2xl bg-white p-5 shadow-card">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Date de creation
              </p>
              <p className="text-sm font-medium text-slate-700">
                {formatOrderDate(order.created_at)}
              </p>
            </div>
            <span
              className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${statusClassName[order.status]}`}
            >
              {statusLabel[order.status]}
            </span>
          </div>

          <div className="mt-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Suivi de commande
            </p>

            {isCancelled ? (
              <p className="mt-2 rounded-xl bg-rose-50 p-3 text-sm font-semibold text-rose-700">
                Commande annulee.
              </p>
            ) : (
              <ol className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
                {trackingSteps.map((step, index) => {
                  const isCompleted = trackingIndex >= index;
                  const isCurrent = trackingIndex === index;

                  return (
                    <li
                      key={step.id}
                      className={`rounded-xl border px-3 py-2 text-xs font-semibold ${
                        isCurrent
                          ? "border-brand-orange bg-orange-50 text-brand-orange"
                          : isCompleted
                            ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                            : "border-slate-200 bg-slate-50 text-slate-500"
                      }`}
                    >
                      {step.label}
                    </li>
                  );
                })}
              </ol>
            )}

            {isPickupOrder && order.status === "ready" ? (
              <p className="mt-3 rounded-xl bg-emerald-50 p-3 text-sm font-semibold text-emerald-700">
                Votre commande est prete en magasin.
              </p>
            ) : null}
          </div>

          <div className="mt-5 overflow-x-auto">
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

          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
              <p>
                Sous-total: <span className="font-semibold">{formatDh(order.subtotal)}</span>
              </p>
              <p>
                Livraison: <span className="font-semibold">{formatDh(order.delivery_fee)}</span>
              </p>
              <p className="font-bold text-brand-blue">Total: {formatDh(order.total)}</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
              <p>
                Mode de reception:{" "}
                <span className="font-semibold">
                  {isPickupOrder ? "Retrait en magasin" : "Livraison"}
                </span>
              </p>
              <p>
                Nom: <span className="font-semibold">{order.customer_name}</span>
              </p>
              <p>
                Telephone: <span className="font-semibold">{order.customer_phone}</span>
              </p>
              {isPickupOrder ? (
                <>
                  <p>
                    Magasin: <span className="font-semibold">{businessInfo.address}</span>
                  </p>
                  <p>
                    Horaires: <span className="font-semibold">{businessInfo.openingHours}</span>
                  </p>
                </>
              ) : (
                <p>
                  Adresse: <span className="font-semibold">{order.customer_address}</span>
                </p>
              )}
              <p>
                Localisation: <span className="font-semibold">{order.customer_location}</span>
              </p>
              <p>
                Paiement:{" "}
                <span className="font-semibold">
                  {order.paymentMethod ?? "Non precise"}
                </span>
              </p>
            </div>
          </div>

          <div className="mt-5 border-t border-slate-100 pt-4">
            {canCancelNow ? (
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-xs text-slate-600">
                  Annulation possible jusqu&apos;a{" "}
                  <span className="font-semibold">
                    {formatCancellationDeadline(order.cancellationDeadline)}
                  </span>
                  .
                </p>
                <button
                  type="button"
                  onClick={handleCancelOrder}
                  disabled={isCancelling}
                  className="rounded-xl border border-rose-300 px-4 py-2 text-sm font-semibold text-rose-700 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {isCancelling ? "Annulation..." : "Annuler la commande"}
                </button>
              </div>
            ) : (
              <p className="text-sm font-medium text-slate-600">
                {order.cannotCancelMessage ?? "Le délai d'annulation est dépassé."}
              </p>
            )}
          </div>
        </article>
      </div>
    </section>
  );
}
