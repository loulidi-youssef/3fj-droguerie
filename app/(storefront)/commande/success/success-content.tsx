"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { trackEvent } from "@/lib/analytics";
import { formatDh } from "@/lib/currency";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";

type SuccessOrderItem = {
  id: number;
  product_name: string;
  quantity: number;
  line_total: number;
};

type SuccessOrder = {
  id: string;
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
  deliveryOption: "standard" | "express" | "pickup";
  customer_name: string;
  customer_phone: string;
  customer_address: string;
  customer_location: string;
  customer_note: string | null;
  subtotal: number;
  delivery_fee: number;
  total: number;
  order_items: SuccessOrderItem[];
};

type OrderDetailsApiResponse = {
  order?: SuccessOrder;
  error?: string;
};

const deliveryOptionLabel: Record<SuccessOrder["deliveryOption"], string> = {
  standard: "Livraison Standard",
  express: "Livraison Express",
  pickup: "Retrait en magasin",
};

const statusLabel: Record<SuccessOrder["status"], string> = {
  new: "Nouvelle",
  confirmed: "Confirmee",
  preparing: "En preparation",
  ready: "Prete",
  shipped: "Expediee",
  collected: "Recuperee",
  delivered: "Livree",
  cancelled: "Annulee",
};

export default function SuccessContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = useMemo(() => getSupabaseBrowserClient(), []);
  const [order, setOrder] = useState<SuccessOrder | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const trackedOrderIdRef = useRef<string | null>(null);
  const orderId = searchParams.get("orderId")?.trim() ?? "";

  useEffect(() => {
    if (!orderId) {
      setErrorMessage("Reference de commande manquante.");
      setIsLoading(false);
      return;
    }

    if (!supabase) {
      router.replace(`/login?next=/commande/success?orderId=${encodeURIComponent(orderId)}`);
      return;
    }

    let isMounted = true;

    const fetchOrder = async () => {
      setIsLoading(true);
      setErrorMessage(null);

      const { data } = await supabase.auth.getSession();
      if (!isMounted) {
        return;
      }

      if (!data.session) {
        router.replace(`/login?next=/commande/success?orderId=${encodeURIComponent(orderId)}`);
        return;
      }

      try {
        const response = await fetch(`/api/account/orders/${encodeURIComponent(orderId)}`, {
          headers: {
            Authorization: `Bearer ${data.session.access_token}`,
          },
          cache: "no-store",
        });
        const payload = (await response.json()) as OrderDetailsApiResponse;
        if (!response.ok || !payload.order) {
          throw new Error(payload.error ?? "Impossible de recuperer la commande.");
        }
        setOrder(payload.order);
      } catch (error) {
        if (!isMounted) {
          return;
        }
        setErrorMessage(
          error instanceof Error ? error.message : "Impossible de recuperer la commande.",
        );
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    void fetchOrder();

    return () => {
      isMounted = false;
    };
  }, [orderId, router, supabase]);

  useEffect(() => {
    if (!order || trackedOrderIdRef.current === order.id) {
      return;
    }

    trackedOrderIdRef.current = order.id;
    const cartSize = order.order_items.reduce((sum, item) => sum + item.quantity, 0);

    trackEvent("order_success", {
      source: "success-page",
      orderId: order.id,
      cartSize,
      totalPrice: order.total,
      deliveryOption: order.deliveryOption,
      fulfillmentMethod: order.fulfillmentMethod,
      orderStatus: order.status,
    });
  }, [order]);

  if (isLoading) {
    return (
      <section className="section-padding bg-brand-light">
        <div className="mx-auto max-w-3xl px-4">
          <p className="rounded-xl bg-white p-4 text-sm text-slate-600 shadow-card">
            Validation de votre commande...
          </p>
        </div>
      </section>
    );
  }

  if (!order) {
    return (
      <section className="section-padding bg-brand-light">
        <div className="mx-auto max-w-3xl px-4">
          <div className="rounded-2xl bg-white p-6 shadow-card">
            <p className="text-sm font-medium text-rose-700">
              {errorMessage ?? "Commande introuvable."}
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Link href="/compte/commandes" className="btn-outline-brand">
                Mes commandes
              </Link>
              <Link
                href="/produits"
                className="rounded-xl bg-brand-blue px-4 py-2 text-sm font-semibold text-white"
              >
                Retour aux produits
              </Link>
            </div>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="section-padding bg-brand-light">
      <div className="mx-auto max-w-3xl px-4">
        <article className="rounded-2xl bg-white p-5 shadow-card sm:p-6">
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
            <p className="text-base font-extrabold text-emerald-800">
              Commande confirmee sur le site
            </p>
            <p className="mt-1 text-sm text-emerald-700">
              Reference: <span className="font-bold">{order.id}</span>
            </p>
            <p className="mt-1 text-sm text-emerald-700">
              Statut initial: <span className="font-semibold">{statusLabel[order.status]}</span>
            </p>
          </div>

          <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-sm font-semibold text-brand-blue">Recapitulatif</p>
            <ul className="mt-3 space-y-2 text-sm text-slate-700">
              {order.order_items.map((item) => (
                <li key={item.id} className="flex items-center justify-between gap-2">
                  <span className="truncate">
                    {item.product_name} x{item.quantity}
                  </span>
                  <span className="font-semibold">{formatDh(item.line_total)}</span>
                </li>
              ))}
            </ul>
            <div className="mt-3 space-y-1.5 border-t border-slate-200 pt-3 text-sm text-slate-700">
              <div className="flex items-center justify-between">
                <span>Sous-total</span>
                <span className="font-semibold">{formatDh(order.subtotal)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>{deliveryOptionLabel[order.deliveryOption]}</span>
                <span className="font-semibold">
                  {order.delivery_fee === 0 ? "Gratuit" : formatDh(order.delivery_fee)}
                </span>
              </div>
              <div className="flex items-center justify-between text-base font-extrabold text-brand-blue">
                <span>Total final</span>
                <span>{formatDh(order.total)}</span>
              </div>
            </div>
          </div>

          <div className="mt-5 rounded-xl border border-slate-200 p-4 text-sm text-slate-700">
            <p>
              Client: <span className="font-semibold">{order.customer_name}</span>
            </p>
            <p>
              Telephone: <span className="font-semibold">{order.customer_phone}</span>
            </p>
            <p>
              Ville: <span className="font-semibold">{order.customer_location}</span>
            </p>
            <p>
              Adresse: <span className="font-semibold">{order.customer_address}</span>
            </p>
            {order.customer_note ? (
              <p>
                Note: <span className="font-semibold">{order.customer_note}</span>
              </p>
            ) : null}
          </div>

          <div className="mt-5 flex flex-wrap gap-2">
            <Link
              href={`/compte/commandes/${encodeURIComponent(order.id)}`}
              className="rounded-xl bg-brand-blue px-4 py-2 text-sm font-semibold text-white"
            >
              Suivre ma commande
            </Link>
            <Link href="/compte/commandes" className="btn-outline-brand">
              Mes commandes
            </Link>
            <Link
              href="/produits"
              className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700"
            >
              Continuer mes achats
            </Link>
          </div>
        </article>
      </div>
    </section>
  );
}
