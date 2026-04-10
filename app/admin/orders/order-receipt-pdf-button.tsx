"use client";

import { useState } from "react";
import { downloadOrderReceiptPdf } from "@/app/(storefront)/commande/success/receipt-pdf";
import {
  buildReceiptPdfOrderPayload,
  normalizeOrderForReceipt,
  RECEIPT_COMPANY,
} from "@/lib/order-receipt";

type AdminOrderReceiptPdfButtonProps = {
  orderId: string;
};

type AdminOrderDetailsApiResponse = {
  order?: unknown;
  error?: string;
};

export default function AdminOrderReceiptPdfButton({
  orderId,
}: AdminOrderReceiptPdfButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleDownloadPdf = async () => {
    if (!orderId || isLoading) {
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    try {
      const response = await fetch(`/api/admin/orders/${encodeURIComponent(orderId)}`, {
        cache: "no-store",
      });

      let payload: AdminOrderDetailsApiResponse = {};
      try {
        payload = (await response.json()) as AdminOrderDetailsApiResponse;
      } catch {
        payload = {};
      }

      if (!response.ok || !payload.order) {
        const fallbackMessage =
          response.status === 404 ? "Commande introuvable." : payload.error ?? "Commande introuvable.";
        throw new Error(fallbackMessage);
      }

      const normalizedOrder = normalizeOrderForReceipt(payload.order, orderId);
      if (!normalizedOrder) {
        throw new Error("Commande introuvable.");
      }

      await downloadOrderReceiptPdf({
        company: RECEIPT_COMPANY,
        order: buildReceiptPdfOrderPayload(normalizedOrder),
      });
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Generation PDF impossible.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-1">
      <button
        type="button"
        onClick={() => void handleDownloadPdf()}
        disabled={isLoading}
        className="rounded-md border border-slate-300 bg-white px-2 py-1 text-[11px] font-semibold text-slate-700 transition hover:border-brand-blue hover:text-brand-blue disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isLoading ? "PDF..." : "PDF"}
      </button>
      {errorMessage ? <span className="text-[10px] text-rose-700">{errorMessage}</span> : null}
    </div>
  );
}
