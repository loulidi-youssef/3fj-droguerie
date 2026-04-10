"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { trackEvent } from "@/lib/analytics";
import { formatDh } from "@/lib/currency";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";
import {
  downloadOrderReceiptPdf,
  type ReceiptCompanyInfo,
  type ReceiptOrder,
} from "./receipt-pdf";

type RawOrderItem = {
  id?: unknown;
  product_name?: unknown;
  quantity?: unknown;
  unit_price?: unknown;
  line_total?: unknown;
};

type RawOrder = {
  id?: unknown;
  created_at?: unknown;
  status?: unknown;
  fulfillmentMethod?: unknown;
  deliveryOption?: unknown;
  customer_name?: unknown;
  customer_phone?: unknown;
  customer_address?: unknown;
  customer_location?: unknown;
  customer_note?: unknown;
  subtotal?: unknown;
  delivery_fee?: unknown;
  total?: unknown;
  order_items?: unknown;
};

type OrderDetailsApiResponse = {
  order?: RawOrder;
  error?: string;
};

type NormalizedReceiptOrderItem = {
  id: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
};

type NormalizedReceiptOrder = {
  id: string;
  createdAt: string;
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
  customerName: string;
  customerPhone: string;
  customerAddress: string;
  customerLocation: string;
  customerNote: string;
  subtotal: number;
  deliveryFee: number;
  total: number;
  items: NormalizedReceiptOrderItem[];
};

type SuccessContentProps = {
  companyLogoPath?: string | null;
};

const RECEIPT_COMPANY: ReceiptCompanyInfo = {
  name: "3FJ Droguerie",
  activity: "Materiaux de construction et droguerie",
  city: "Fes",
  phone: "06XXXXXXXX",
  whatsapp: "06XXXXXXXX",
};

const PAYMENT_LABEL = "Paiement a la livraison";

const DELIVERY_OPTION_LABELS: Record<NormalizedReceiptOrder["deliveryOption"], string> = {
  standard: "Livraison Standard",
  express: "Livraison Express",
  pickup: "Retrait magasin",
};

const STATUS_LABELS: Record<NormalizedReceiptOrder["status"], string> = {
  new: "Nouvelle",
  confirmed: "Confirmee",
  preparing: "En preparation",
  ready: "Prete",
  shipped: "Expediee",
  collected: "Recuperee",
  delivered: "Livree",
  cancelled: "Annulee",
};

const asRecord = (value: unknown): Record<string, unknown> | null => {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }
  return value as Record<string, unknown>;
};

const toStringOrDefault = (value: unknown, fallback = ""): string => {
  if (typeof value !== "string") {
    return fallback;
  }
  return value;
};

const toNonEmptyStringOrDefault = (value: unknown, fallback = ""): string => {
  const candidate = toStringOrDefault(value, "").trim();
  return candidate.length > 0 ? candidate : fallback;
};

const toFiniteNumberOrDefault = (value: unknown, fallback = 0): number => {
  const candidate = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(candidate)) {
    return fallback;
  }
  return candidate;
};

const normalizeDeliveryOption = (value: unknown): NormalizedReceiptOrder["deliveryOption"] => {
  const normalized = toNonEmptyStringOrDefault(value, "standard").toLowerCase();
  if (normalized === "express") {
    return "express";
  }
  if (normalized === "pickup") {
    return "pickup";
  }
  return "standard";
};

const normalizeFulfillmentMethod = (
  value: unknown,
  deliveryOption: NormalizedReceiptOrder["deliveryOption"],
): NormalizedReceiptOrder["fulfillmentMethod"] => {
  const normalized = toNonEmptyStringOrDefault(value, "").toLowerCase();
  if (normalized === "pickup") {
    return "pickup";
  }
  if (normalized === "delivery") {
    return "delivery";
  }
  return deliveryOption === "pickup" ? "pickup" : "delivery";
};

const normalizeStatus = (value: unknown): NormalizedReceiptOrder["status"] => {
  const normalized = toNonEmptyStringOrDefault(value, "new").toLowerCase();
  if (
    normalized === "new" ||
    normalized === "confirmed" ||
    normalized === "preparing" ||
    normalized === "ready" ||
    normalized === "shipped" ||
    normalized === "collected" ||
    normalized === "delivered" ||
    normalized === "cancelled"
  ) {
    return normalized;
  }
  return "new";
};

const normalizeOrderItems = (value: unknown): NormalizedReceiptOrderItem[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.map((entry, index) => {
    const item = asRecord(entry) as RawOrderItem | null;
    const quantity = Math.max(0, Math.floor(toFiniteNumberOrDefault(item?.quantity, 0)));
    const unitPrice = toFiniteNumberOrDefault(item?.unit_price, 0);
    const lineTotalFromApi = toFiniteNumberOrDefault(item?.line_total, Number.NaN);
    const lineTotal = Number.isFinite(lineTotalFromApi)
      ? lineTotalFromApi
      : unitPrice * quantity;

    return {
      id: toNonEmptyStringOrDefault(item?.id, `line-${index + 1}`),
      productName: toNonEmptyStringOrDefault(item?.product_name, "Produit"),
      quantity,
      unitPrice,
      lineTotal,
    };
  });
};

const normalizeOrder = (value: unknown, fallbackOrderId: string): NormalizedReceiptOrder | null => {
  const rawOrder = asRecord(value) as RawOrder | null;
  if (!rawOrder) {
    return null;
  }

  const deliveryOption = normalizeDeliveryOption(rawOrder.deliveryOption);
  const normalizedId = toNonEmptyStringOrDefault(rawOrder.id, fallbackOrderId);
  if (!normalizedId) {
    return null;
  }

  return {
    id: normalizedId,
    createdAt: toNonEmptyStringOrDefault(rawOrder.created_at, ""),
    status: normalizeStatus(rawOrder.status),
    deliveryOption,
    fulfillmentMethod: normalizeFulfillmentMethod(rawOrder.fulfillmentMethod, deliveryOption),
    customerName: toStringOrDefault(rawOrder.customer_name, "").trim(),
    customerPhone: toStringOrDefault(rawOrder.customer_phone, "").trim(),
    customerAddress: toStringOrDefault(rawOrder.customer_address, "").trim(),
    customerLocation: toStringOrDefault(rawOrder.customer_location, "").trim(),
    customerNote: toStringOrDefault(rawOrder.customer_note, "").trim(),
    subtotal: toFiniteNumberOrDefault(rawOrder.subtotal, 0),
    deliveryFee: toFiniteNumberOrDefault(rawOrder.delivery_fee, 0),
    total: toFiniteNumberOrDefault(rawOrder.total, 0),
    items: normalizeOrderItems(rawOrder.order_items),
  };
};

const formatOrderDate = (value: string): string => {
  if (!value.trim()) {
    return "-";
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("fr-MA", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(parsed);
};

export default function SuccessContent({ companyLogoPath }: SuccessContentProps) {
  const searchParams = useSearchParams();
  const supabase = useMemo(() => getSupabaseBrowserClient(), []);
  const [order, setOrder] = useState<NormalizedReceiptOrder | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [logoHidden, setLogoHidden] = useState(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const trackedOrderIdRef = useRef<string | null>(null);
  const orderId = toNonEmptyStringOrDefault(searchParams.get("orderId"), "");

  useEffect(() => {
    let isMounted = true;

    const fetchOrder = async () => {
      if (!orderId) {
        if (isMounted) {
          setErrorMessage("Commande introuvable.");
          setOrder(null);
          setIsLoading(false);
        }
        return;
      }

      setIsLoading(true);
      setErrorMessage(null);

      let accessToken = "";
      if (supabase) {
        try {
          const sessionResult = await supabase.auth.getSession();
          accessToken = toStringOrDefault(sessionResult.data.session?.access_token, "");
        } catch (error) {
          console.warn("[commande/success] Session lookup failed.", {
            message: error instanceof Error ? error.message : String(error),
          });
        }
      }

      try {
        const response = await fetch(`/api/account/orders/${encodeURIComponent(orderId)}`, {
          headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
          cache: "no-store",
        });

        let payload: OrderDetailsApiResponse = {};
        try {
          payload = (await response.json()) as OrderDetailsApiResponse;
        } catch {
          payload = {};
        }

        if (!response.ok || !payload.order) {
          const fallbackMessage =
            response.status === 404 || response.status === 401
              ? "Commande introuvable."
              : payload.error ?? "Impossible de recuperer la commande.";
          throw new Error(fallbackMessage);
        }

        const normalizedOrder = normalizeOrder(payload.order, orderId);
        if (!normalizedOrder) {
          throw new Error("Commande introuvable.");
        }

        if (!isMounted) {
          return;
        }

        setOrder(normalizedOrder);
      } catch (error) {
        if (!isMounted) {
          return;
        }

        setOrder(null);
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
  }, [orderId, supabase]);

  useEffect(() => {
    if (!order || trackedOrderIdRef.current === order.id) {
      return;
    }

    trackedOrderIdRef.current = order.id;
    const cartSize = order.items.reduce((sum, item) => sum + item.quantity, 0);

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

  const handleDownloadPdf = async () => {
    if (!order || isGeneratingPdf) {
      return;
    }

    setIsGeneratingPdf(true);
    try {
      const pdfOrder: ReceiptOrder = {
        id: order.id,
        createdAt: order.createdAt,
        deliveryOptionLabel: DELIVERY_OPTION_LABELS[order.deliveryOption],
        paymentLabel: PAYMENT_LABEL,
        customerName: order.customerName,
        customerPhone: order.customerPhone,
        customerAddress: order.fulfillmentMethod === "pickup" ? "" : order.customerAddress,
        customerNote: order.customerNote,
        subtotal: order.subtotal,
        deliveryFee: order.deliveryFee,
        total: order.total,
        items: order.items.map((item) => ({
          productName: item.productName,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          lineTotal: item.lineTotal,
        })),
      };

      await downloadOrderReceiptPdf({
        company: RECEIPT_COMPANY,
        order: pdfOrder,
      });
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Impossible de generer le PDF.",
      );
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  if (isLoading) {
    return (
      <section className="section-padding bg-brand-light">
        <div className="mx-auto max-w-4xl px-4">
          <p className="rounded-xl bg-white p-4 text-sm text-slate-600 shadow-card">
            Chargement de votre recu...
          </p>
        </div>
      </section>
    );
  }

  if (!order) {
    return (
      <section className="section-padding bg-brand-light">
        <div className="mx-auto max-w-4xl px-4">
          <article className="rounded-2xl bg-white p-6 shadow-card">
            <h1 className="text-2xl font-extrabold text-brand-blue">Commande introuvable</h1>
            <p className="mt-2 text-sm text-slate-600">
              {errorMessage ?? "Nous n'avons pas pu retrouver cette commande."}
            </p>
            <div className="mt-5">
              <Link
                href="/"
                className="inline-flex rounded-xl bg-brand-blue px-4 py-2 text-sm font-semibold text-white"
              >
                Retour a l&apos;accueil
              </Link>
            </div>
          </article>
        </div>
      </section>
    );
  }

  const isPickup = order.fulfillmentMethod === "pickup";
  const displayAddress = isPickup ? "" : order.customerAddress;
  const displayLocation = order.customerLocation || RECEIPT_COMPANY.city;
  const displayName = order.customerName || "-";
  const displayPhone = order.customerPhone || "-";
  const canShowLogo = Boolean(companyLogoPath) && !logoHidden;

  return (
    <section className="section-padding bg-brand-light">
      <div className="mx-auto max-w-4xl px-4">
        <article className="rounded-2xl bg-white p-5 shadow-card sm:p-6">
          <header className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
            <h1 className="text-2xl font-extrabold text-emerald-800">Commande confirmee</h1>
            <p className="mt-1 text-sm text-emerald-700">
              Votre commande a bien ete enregistree
            </p>
          </header>

          <section className="mt-5 rounded-xl border border-slate-200 p-4">
            <div className="flex flex-wrap items-center gap-3">
              {canShowLogo ? (
                <img
                  src={companyLogoPath ?? ""}
                  alt="Logo 3FJ Droguerie"
                  className="h-12 w-12 rounded-lg object-contain"
                  onError={() => setLogoHidden(true)}
                />
              ) : null}
              <div>
                <p className="text-lg font-extrabold text-brand-blue">{RECEIPT_COMPANY.name}</p>
                <p className="text-sm font-semibold text-slate-700">Materiaux de construction</p>
                <p className="text-xs text-slate-500">{RECEIPT_COMPANY.activity}</p>
              </div>
            </div>
            <div className="mt-3 grid gap-2 text-sm text-slate-700 sm:grid-cols-2">
              <p>
                Telephone: <span className="font-semibold">{RECEIPT_COMPANY.phone}</span>
              </p>
              <p>
                WhatsApp: <span className="font-semibold">{RECEIPT_COMPANY.whatsapp}</span>
              </p>
              <p>
                Ville: <span className="font-semibold">{RECEIPT_COMPANY.city}</span>
              </p>
            </div>
          </section>

          <div className="mt-5 grid gap-4 lg:grid-cols-2">
            <section className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-sm font-bold uppercase tracking-wide text-brand-blue">
                Informations commande
              </p>
              <div className="mt-3 space-y-1.5 text-sm text-slate-700">
                <p>
                  Numero de commande: <span className="font-semibold">{order.id}</span>
                </p>
                <p>
                  Date: <span className="font-semibold">{formatOrderDate(order.createdAt)}</span>
                </p>
                <p>
                  Mode:{" "}
                  <span className="font-semibold">
                    {DELIVERY_OPTION_LABELS[order.deliveryOption]}
                  </span>
                </p>
                <p>
                  Paiement: <span className="font-semibold">{PAYMENT_LABEL}</span>
                </p>
                <p>
                  Statut: <span className="font-semibold">{STATUS_LABELS[order.status]}</span>
                </p>
              </div>
            </section>

            <section className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-sm font-bold uppercase tracking-wide text-brand-blue">
                Informations client
              </p>
              <div className="mt-3 space-y-1.5 text-sm text-slate-700">
                <p>
                  Nom: <span className="font-semibold">{displayName}</span>
                </p>
                <p>
                  Telephone: <span className="font-semibold">{displayPhone}</span>
                </p>
                {!isPickup ? (
                  <p>
                    Adresse: <span className="font-semibold">{displayAddress || "-"}</span>
                  </p>
                ) : null}
                <p>
                  Ville: <span className="font-semibold">{displayLocation}</span>
                </p>
                {order.customerNote ? (
                  <p>
                    Note client: <span className="font-semibold">{order.customerNote}</span>
                  </p>
                ) : null}
              </div>
            </section>
          </div>

          <section className="mt-5 overflow-hidden rounded-xl border border-slate-200">
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-slate-100 text-xs uppercase tracking-wide text-slate-600">
                  <tr>
                    <th className="px-3 py-3">Nom produit</th>
                    <th className="px-3 py-3">Quantite</th>
                    <th className="px-3 py-3">Prix unitaire</th>
                    <th className="px-3 py-3">Total ligne</th>
                  </tr>
                </thead>
                <tbody>
                  {order.items.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-3 py-4 text-sm text-slate-500">
                        Aucun article trouve pour cette commande.
                      </td>
                    </tr>
                  ) : (
                    order.items.map((item) => (
                      <tr key={item.id} className="border-t border-slate-100 text-slate-700">
                        <td className="px-3 py-3">{item.productName}</td>
                        <td className="px-3 py-3">{item.quantity}</td>
                        <td className="px-3 py-3">{formatDh(item.unitPrice)}</td>
                        <td className="px-3 py-3 font-semibold text-brand-blue">
                          {formatDh(item.lineTotal)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>

          <section className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-sm font-bold uppercase tracking-wide text-brand-blue">
              Totaux
            </p>
            <div className="mt-3 space-y-2 text-sm text-slate-700">
              <div className="flex items-center justify-between">
                <span>Total produits</span>
                <span className="font-semibold">{formatDh(order.subtotal)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Livraison</span>
                <span className="font-semibold">
                  {order.deliveryFee <= 0 ? "Gratuit" : formatDh(order.deliveryFee)}
                </span>
              </div>
              <div className="mt-1 flex items-center justify-between rounded-lg bg-brand-blue px-3 py-2 text-base font-extrabold text-white">
                <span>TOTAL FINAL</span>
                <span>{formatDh(order.total)}</span>
              </div>
            </div>
          </section>

          <section className="mt-5 flex flex-wrap gap-2 print:hidden">
            <button
              type="button"
              onClick={() => void handleDownloadPdf()}
              disabled={isGeneratingPdf}
              className="rounded-xl bg-brand-blue px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isGeneratingPdf ? "Generation du PDF..." : "Telecharger le recu PDF"}
            </button>
            <button
              type="button"
              onClick={handlePrint}
              className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700"
            >
              Imprimer
            </button>
            <Link
              href="/"
              className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700"
            >
              Retour a l&apos;accueil
            </Link>
          </section>

          {errorMessage ? (
            <p className="mt-4 rounded-xl bg-rose-50 p-3 text-sm font-medium text-rose-700">
              {errorMessage}
            </p>
          ) : null}
        </article>
      </div>
    </section>
  );
}
