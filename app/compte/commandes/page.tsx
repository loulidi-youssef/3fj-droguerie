"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
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
  status: "new" | "confirmed" | "delivered" | "cancelled";
  subtotal: number;
  delivery_fee: number;
  total: number;
  order_items: CustomerOrderItem[];
  canCancel: boolean;
  cancellationDeadline: string | null;
  cannotCancelMessage: string | null;
};

type OrdersApiResponse = {
  orders?: CustomerOrder[];
  error?: string;
};

const statusLabel: Record<CustomerOrder["status"], string> = {
  new: "Nouvelle",
  confirmed: "Acceptee / Confirmee",
  delivered: "Livree",
  cancelled: "Annulee",
};

const statusClassName: Record<CustomerOrder["status"], string> = {
  new: "bg-sky-100 text-sky-700",
  confirmed: "bg-amber-100 text-amber-700",
  delivered: "bg-emerald-100 text-emerald-700",
  cancelled: "bg-rose-100 text-rose-700",
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
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
};

export default function CompteCommandesPage() {
  const router = useRouter();
  const supabase = useMemo(() => getSupabaseBrowserClient(), []);
  const [orders, setOrders] = useState<CustomerOrder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [cancellingOrderId, setCancellingOrderId] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  const fetchOrders = async (accessToken: string) => {
    const response = await fetch("/api/account/orders", {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      cache: "no-store",
    });

    const payload = (await response.json()) as OrdersApiResponse;
    if (!response.ok) {
      throw new Error(payload.error ?? "Impossible de recuperer vos commandes.");
    }

    setOrders(payload.orders ?? []);
  };

  useEffect(() => {
    if (!supabase) {
      router.replace("/login?next=/compte/commandes");
      return;
    }

    let isMounted = true;

    const loadInitialData = async () => {
      setIsLoading(true);
      setErrorMessage(null);

      const { data } = await supabase.auth.getSession();
      if (!isMounted) {
        return;
      }

      const session = data.session;

      if (!session) {
        router.replace("/login?next=/compte/commandes");
        return;
      }

      try {
        await fetchOrders(session.access_token);
      } catch (error) {
        if (!isMounted) {
          return;
        }
        setErrorMessage(
          error instanceof Error
            ? error.message
            : "Impossible de recuperer vos commandes.",
        );
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    void loadInitialData();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!session) {
        router.replace("/login?next=/compte/commandes");
        return;
      }

      try {
        await fetchOrders(session.access_token);
      } catch (error) {
        setErrorMessage(
          error instanceof Error
            ? error.message
            : "Impossible de recuperer vos commandes.",
        );
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [router, supabase]);

  const cancelOrder = async (orderId: string) => {
    if (!supabase) {
      return;
    }

    setActionMessage(null);
    setCancellingOrderId(orderId);
    setErrorMessage(null);

    try {
      const { data } = await supabase.auth.getSession();
      if (!data.session) {
        router.replace("/login?next=/compte/commandes");
        return;
      }

      const response = await fetch(`/api/account/orders/${orderId}/cancel`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${data.session.access_token}`,
        },
      });

      const payload = (await response.json()) as { ok?: boolean; error?: string };

      if (!response.ok) {
        throw new Error(payload.error ?? "Annulation impossible.");
      }

      await fetchOrders(data.session.access_token);
      setActionMessage("Commande annulee avec succes.");
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Annulation impossible pour le moment.",
      );
    } finally {
      setCancellingOrderId(null);
    }
  };

  if (isLoading) {
    return (
      <section className="section-padding bg-brand-light">
        <div className="mx-auto max-w-5xl px-4 sm:px-5 lg:px-6">
          <p className="rounded-xl bg-white p-4 text-sm text-slate-600 shadow-card">
            Chargement de vos commandes...
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className="section-padding bg-brand-light">
      <div className="mx-auto max-w-5xl px-4 sm:px-5 lg:px-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-brand-blue sm:text-4xl">
              Mes commandes
            </h1>
            <p className="mt-2 text-sm text-slate-600">
              Suivez vos commandes. L&apos;annulation est possible uniquement pendant 2 heures
              si la commande est encore nouvelle.
            </p>
          </div>
          <Link href="/compte" className="btn-outline-brand">
            Retour au compte
          </Link>
        </div>

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

        {orders.length === 0 ? (
          <div className="mt-6 rounded-2xl bg-white p-6 shadow-card">
            <p className="text-sm text-slate-600">Aucune commande liee a votre compte.</p>
            <Link
              href="/produits"
              className="mt-3 inline-flex text-sm font-semibold text-brand-orange hover:underline"
            >
              Commencer vos achats
            </Link>
          </div>
        ) : (
          <div className="mt-6 space-y-4">
            {orders.map((order) => (
              <article key={order.id} className="rounded-2xl bg-white p-5 shadow-card">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Reference
                    </p>
                    <Link
                      href={`/compte/commandes/${order.id}`}
                      className="text-sm font-bold text-brand-blue hover:underline"
                    >
                      {order.id}
                    </Link>
                    <p className="mt-1 text-xs text-slate-600">
                      {formatOrderDate(order.created_at)}
                    </p>
                  </div>

                  <span
                    className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${statusClassName[order.status]}`}
                  >
                    {statusLabel[order.status]}
                  </span>
                </div>

                <div className="mt-4 overflow-x-auto">
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

                <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3">
                  <div className="text-sm text-slate-700">
                    <p>
                      Livraison: <span className="font-semibold">{formatDh(order.delivery_fee)}</span>
                    </p>
                    <p className="font-bold text-brand-blue">
                      Total: {formatDh(order.total)}
                    </p>
                    <Link
                      href={`/compte/commandes/${order.id}`}
                      className="mt-2 inline-flex text-xs font-semibold text-brand-orange hover:underline"
                    >
                      Voir le detail de la commande
                    </Link>
                  </div>

                  <div className="text-right">
                    {order.canCancel ? (
                      <>
                        <button
                          type="button"
                          onClick={() => cancelOrder(order.id)}
                          disabled={cancellingOrderId === order.id}
                          className="rounded-xl border border-rose-300 px-4 py-2 text-sm font-semibold text-rose-700 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-70"
                        >
                          {cancellingOrderId === order.id
                            ? "Annulation..."
                            : "Annuler la commande"}
                        </button>
                        {order.cancellationDeadline ? (
                          <p className="mt-1 text-[11px] text-slate-500">
                            Possible jusqu&apos;a {formatCancellationDeadline(order.cancellationDeadline)}
                          </p>
                        ) : null}
                      </>
                    ) : (
                      <p className="text-xs font-medium text-slate-500">
                        {order.cannotCancelMessage ??
                          "Vous ne pouvez plus annuler cette commande"}
                      </p>
                    )}
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
