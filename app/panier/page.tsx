"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useCart } from "@/components/cart-provider";
import { useToast } from "@/components/toast-provider";
import {
  type CheckoutCustomerInput,
  type CheckoutField,
  type CheckoutFieldErrors,
  validateCheckoutCustomer,
} from "@/lib/checkout-validation";
import { formatDh } from "@/lib/currency";
import { getAmountForFreeDelivery, getDeliveryCost } from "@/lib/delivery";
import { buildCartWhatsAppLink } from "@/lib/whatsapp";
import type { Product } from "@/types";

type CheckoutFormValues = CheckoutCustomerInput;

type OrderApiResponse = {
  orderId?: string;
  subtotal?: number;
  deliveryFee?: number;
  total?: number;
  error?: string;
  fieldErrors?: CheckoutFieldErrors;
};

type SavedOrderState = {
  orderId: string;
  whatsappLink: string;
};

const initialCheckoutForm: CheckoutFormValues = {
  name: "",
  phone: "",
  address: "",
  location: "",
};

const initialTouchedFields: Record<CheckoutField, boolean> = {
  name: false,
  phone: false,
  address: false,
  location: false,
};

const requiredFields: CheckoutField[] = ["name", "phone", "address"];

export default function PanierPage() {
  const { items, updateQuantity, removeItem, clearCart } = useCart();
  const { showToast } = useToast();

  const [productsById, setProductsById] = useState<Record<string, Product>>({});
  const [isProductsLoading, setIsProductsLoading] = useState(false);
  const [checkoutForm, setCheckoutForm] = useState<CheckoutFormValues>(initialCheckoutForm);
  const [fieldErrors, setFieldErrors] = useState<CheckoutFieldErrors>({});
  const [touchedFields, setTouchedFields] =
    useState<Record<CheckoutField, boolean>>(initialTouchedFields);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitInfo, setSubmitInfo] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [savedOrder, setSavedOrder] = useState<SavedOrderState | null>(null);

  useEffect(() => {
    const uniqueProductIds = [...new Set(items.map((item) => item.productId))];

    if (uniqueProductIds.length === 0) {
      setProductsById({});
      setIsProductsLoading(false);
      return;
    }

    const controller = new AbortController();

    const fetchProducts = async () => {
      setIsProductsLoading(true);

      try {
        const searchParams = new URLSearchParams({
          ids: uniqueProductIds.join(","),
        });
        const response = await fetch(`/api/products?${searchParams.toString()}`, {
          signal: controller.signal,
          cache: "no-store",
        });

        if (!response.ok) {
          throw new Error("Erreur API produits");
        }

        const payload = (await response.json()) as { products: Product[] };
        const nextProductsById = payload.products.reduce<Record<string, Product>>(
          (accumulator, product) => {
            accumulator[product.id] = product;
            return accumulator;
          },
          {},
        );
        setProductsById(nextProductsById);
      } catch (error) {
        if ((error as { name?: string }).name === "AbortError") {
          return;
        }
        setProductsById({});
      } finally {
        setIsProductsLoading(false);
      }
    };

    void fetchProducts();

    return () => controller.abort();
  }, [items]);

  const detailedItems = useMemo(
    () =>
      items
        .map((item) => {
          const product = productsById[item.productId];
          if (!product) return null;

          return {
            ...item,
            product,
            lineTotal: product.price * item.quantity,
          };
        })
        .filter((item): item is NonNullable<typeof item> => item !== null),
    [items, productsById],
  );

  const missingProductsCount = items.length - detailedItems.length;
  const subtotal = detailedItems.reduce((sum, item) => sum + item.lineTotal, 0);
  const deliveryCost = getDeliveryCost(subtotal);
  const total = subtotal + deliveryCost;
  const amountForFreeDelivery = getAmountForFreeDelivery(subtotal);

  const directWhatsAppLink = buildCartWhatsAppLink(
    detailedItems.map((item) => ({
      name: item.product.name,
      quantity: item.quantity,
      unitPrice: item.product.price,
    })),
    subtotal,
    deliveryCost,
  );

  const validateAndSetErrors = (nextForm: CheckoutFormValues) => {
    const validation = validateCheckoutCustomer(nextForm);
    setFieldErrors(validation.errors);
    return validation;
  };

  const handleCheckoutFieldChange = (field: CheckoutField, value: string) => {
    const nextForm = { ...checkoutForm, [field]: value };
    setCheckoutForm(nextForm);

    if (touchedFields[field]) {
      validateAndSetErrors(nextForm);
    }

    if (submitError) {
      setSubmitError(null);
    }
    if (submitInfo) {
      setSubmitInfo(null);
    }
  };

  const handleFieldBlur = (field: CheckoutField) => {
    const nextTouched = { ...touchedFields, [field]: true };
    setTouchedFields(nextTouched);
    validateAndSetErrors(checkoutForm);
  };

  const markAllRequiredFieldsTouched = () => {
    setTouchedFields((current) => {
      const next = { ...current };
      for (const field of requiredFields) {
        next[field] = true;
      }
      return next;
    });
  };

  const markTouchedFromFieldErrors = (errors: CheckoutFieldErrors) => {
    setTouchedFields((current) => ({
      ...current,
      name: current.name || Boolean(errors.name),
      phone: current.phone || Boolean(errors.phone),
      address: current.address || Boolean(errors.address),
      location: current.location || Boolean(errors.location),
    }));
  };

  const getInputClassName = (field: CheckoutField): string => {
    const hasError = touchedFields[field] && Boolean(fieldErrors[field]);
    return `mt-1 w-full rounded-xl border px-3 py-2 text-sm text-slate-700 outline-none ${
      hasError
        ? "border-rose-400 bg-rose-50 focus:border-rose-500"
        : "border-slate-300 focus:border-brand-orange"
    }`;
  };

  const handleConfirmOrder = async () => {
    setSubmitError(null);
    setSubmitInfo(null);

    if (isProductsLoading) {
      setSubmitError("Chargement des produits en cours. Merci de patienter.");
      return;
    }

    if (detailedItems.length === 0) {
      setSubmitError("Votre panier est vide.");
      return;
    }

    markAllRequiredFieldsTouched();

    const validation = validateAndSetErrors(checkoutForm);
    if (!validation.isValid) {
      markTouchedFromFieldErrors(validation.errors);

      const firstError =
        validation.errors.name ||
        validation.errors.phone ||
        validation.errors.address ||
        validation.errors.location ||
        "Merci de corriger le formulaire avant de continuer.";

      setSubmitError(firstError);
      return;
    }

    const customer = validation.customer;
    setIsSubmitting(true);
    setSubmitInfo("Verification et enregistrement securise de votre commande...");

    try {
      const response = await fetch("/api/orders", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          customer,
          items: detailedItems.map((item) => ({
            productId: item.productId,
            quantity: item.quantity,
          })),
        }),
      });

      let payload: OrderApiResponse = {};
      try {
        payload = (await response.json()) as OrderApiResponse;
      } catch {
        payload = {};
      }

      if (!response.ok || !payload.orderId) {
        if (payload.fieldErrors) {
          setFieldErrors(payload.fieldErrors);
          markTouchedFromFieldErrors(payload.fieldErrors);
        }
        throw new Error(payload.error ?? "Impossible de sauvegarder la commande.");
      }

      const confirmedSubtotal =
        typeof payload.subtotal === "number" ? payload.subtotal : subtotal;
      const confirmedDeliveryFee =
        typeof payload.deliveryFee === "number" ? payload.deliveryFee : deliveryCost;

      const whatsappLink = buildCartWhatsAppLink(
        detailedItems.map((item) => ({
          name: item.product.name,
          quantity: item.quantity,
          unitPrice: item.product.price,
        })),
        confirmedSubtotal,
        confirmedDeliveryFee,
        {
          ...customer,
          orderId: payload.orderId,
        },
      );

      setSavedOrder({
        orderId: payload.orderId,
        whatsappLink,
      });

      const popup = window.open(whatsappLink, "_blank", "noopener,noreferrer");

      if (popup) {
        setSubmitInfo(
          `Commande enregistree avec succes (ref: ${payload.orderId}). WhatsApp est ouvert.`,
        );
      } else {
        setSubmitInfo(
          `Commande enregistree (ref: ${payload.orderId}). Cliquez sur le bouton WhatsApp ci-dessous pour continuer.`,
        );
      }

      clearCart();
      setCheckoutForm(initialCheckoutForm);
      setFieldErrors({});
      setTouchedFields(initialTouchedFields);
      showToast("Commande enregistree avec succes.");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Une erreur est survenue.";
      setSubmitError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="bg-brand-light py-12">
      <div className="mx-auto max-w-7xl px-4">
        <h1 className="text-3xl font-extrabold text-brand-blue">Votre Panier</h1>

        {items.length === 0 ? (
          <div className="mt-6 rounded-2xl bg-white p-6 shadow-card">
            {savedOrder ? (
              <>
                <p className="rounded-xl bg-emerald-50 p-3 text-sm font-medium text-emerald-700">
                  Commande enregistree avec succes. Reference: {savedOrder.orderId}
                </p>
                <a
                  href={savedOrder.whatsappLink}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-3 inline-flex rounded-xl bg-brand-blue px-4 py-2 text-sm font-semibold text-white"
                >
                  Continuer sur WhatsApp
                </a>
              </>
            ) : (
              <p className="text-sm text-slate-600">Votre panier est vide.</p>
            )}
            <Link href="/produits" className="mt-3 inline-flex text-sm font-semibold text-brand-orange hover:underline">
              Voir les produits
            </Link>
          </div>
        ) : (
          <div className="mt-6 grid gap-6 lg:grid-cols-3">
            <div className="space-y-4 lg:col-span-2">
              {detailedItems.length > 0 ? (
                detailedItems.map((item) => (
                  <article key={item.productId} className="rounded-2xl bg-white p-4 shadow-card">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <h2 className="text-lg font-bold text-brand-blue">{item.product.name}</h2>
                        <p className="text-sm text-slate-600">{formatDh(item.product.price)} / unite</p>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          className="h-8 w-8 rounded-full border border-slate-300 text-lg"
                          onClick={() => updateQuantity(item.productId, item.quantity - 1)}
                        >
                          -
                        </button>
                        <span className="min-w-8 text-center text-sm font-semibold">{item.quantity}</span>
                        <button
                          type="button"
                          className="h-8 w-8 rounded-full border border-slate-300 text-lg"
                          onClick={() => updateQuantity(item.productId, item.quantity + 1)}
                        >
                          +
                        </button>
                      </div>
                    </div>

                    <div className="mt-3 flex items-center justify-between">
                      <p className="text-sm font-semibold text-brand-blue">Total ligne: {formatDh(item.lineTotal)}</p>
                      <button
                        type="button"
                        onClick={() => removeItem(item.productId)}
                        className="text-xs font-semibold text-rose-600 hover:underline"
                      >
                        Supprimer
                      </button>
                    </div>
                  </article>
                ))
              ) : (
                <div className="rounded-2xl bg-white p-4 text-sm text-slate-600 shadow-card">
                  Chargement des produits...
                </div>
              )}
            </div>

            <aside className="rounded-2xl bg-white p-5 shadow-card">
              <h2 className="text-xl font-extrabold text-brand-blue">Validation de commande</h2>
              <p className="mt-1 text-xs text-slate-600">
                Les champs avec * sont obligatoires.
              </p>

              <div className="mt-4 space-y-3">
                <label className="block">
                  <span className="text-xs font-semibold uppercase tracking-wide text-slate-600">
                    Nom complet *
                  </span>
                  <input
                    type="text"
                    value={checkoutForm.name}
                    onChange={(event) => handleCheckoutFieldChange("name", event.target.value)}
                    onBlur={() => handleFieldBlur("name")}
                    className={getInputClassName("name")}
                    placeholder="Votre nom complet"
                    autoComplete="name"
                    aria-invalid={touchedFields.name && Boolean(fieldErrors.name)}
                  />
                  {touchedFields.name && fieldErrors.name ? (
                    <p className="mt-1 text-xs font-medium text-rose-700">{fieldErrors.name}</p>
                  ) : null}
                </label>

                <label className="block">
                  <span className="text-xs font-semibold uppercase tracking-wide text-slate-600">
                    Telephone *
                  </span>
                  <input
                    type="tel"
                    value={checkoutForm.phone}
                    onChange={(event) => handleCheckoutFieldChange("phone", event.target.value)}
                    onBlur={() => handleFieldBlur("phone")}
                    className={getInputClassName("phone")}
                    placeholder="06XXXXXXXX ou +2126XXXXXXXX"
                    autoComplete="tel"
                    aria-invalid={touchedFields.phone && Boolean(fieldErrors.phone)}
                  />
                  {touchedFields.phone && fieldErrors.phone ? (
                    <p className="mt-1 text-xs font-medium text-rose-700">{fieldErrors.phone}</p>
                  ) : null}
                </label>

                <label className="block">
                  <span className="text-xs font-semibold uppercase tracking-wide text-slate-600">
                    Adresse *
                  </span>
                  <input
                    type="text"
                    value={checkoutForm.address}
                    onChange={(event) => handleCheckoutFieldChange("address", event.target.value)}
                    onBlur={() => handleFieldBlur("address")}
                    className={getInputClassName("address")}
                    placeholder="Quartier, rue, numero..."
                    autoComplete="street-address"
                    aria-invalid={touchedFields.address && Boolean(fieldErrors.address)}
                  />
                  {touchedFields.address && fieldErrors.address ? (
                    <p className="mt-1 text-xs font-medium text-rose-700">{fieldErrors.address}</p>
                  ) : null}
                </label>

                <label className="block">
                  <span className="text-xs font-semibold uppercase tracking-wide text-slate-600">
                    Ville / localisation (optionnel)
                  </span>
                  <input
                    type="text"
                    value={checkoutForm.location}
                    onChange={(event) => handleCheckoutFieldChange("location", event.target.value)}
                    onBlur={() => handleFieldBlur("location")}
                    className={getInputClassName("location")}
                    placeholder="Fes"
                    autoComplete="address-level2"
                    aria-invalid={touchedFields.location && Boolean(fieldErrors.location)}
                  />
                  {touchedFields.location && fieldErrors.location ? (
                    <p className="mt-1 text-xs font-medium text-rose-700">{fieldErrors.location}</p>
                  ) : (
                    <p className="mt-1 text-[11px] text-slate-500">
                      Si vide, la localisation par defaut sera Fes.
                    </p>
                  )}
                </label>
              </div>

              <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-3">
                <p className="text-sm font-semibold text-brand-blue">Recapitulatif de commande</p>
                <div className="mt-2 space-y-2 text-sm text-slate-700">
                  <div className="flex justify-between">
                    <span>Articles</span>
                    <span>{detailedItems.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Sous-total produits</span>
                    <span>{formatDh(subtotal)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Frais de livraison</span>
                    <span>{formatDh(deliveryCost)}</span>
                  </div>
                  <div className="border-t border-slate-200 pt-2 text-base font-bold text-brand-blue">
                    <div className="flex justify-between">
                      <span>Total a confirmer</span>
                      <span>{formatDh(total)}</span>
                    </div>
                  </div>
                </div>
                <p className="mt-2 text-[11px] text-slate-500">
                  Livraison gratuite a partir de 300 DH.
                </p>
              </div>

              {amountForFreeDelivery > 0 ? (
                <p className="mt-3 rounded-xl bg-orange-50 p-3 text-sm font-medium text-orange-700">
                  Ajoutez encore {formatDh(amountForFreeDelivery)} pour beneficier de la livraison gratuite.
                </p>
              ) : (
                <p className="mt-3 rounded-xl bg-emerald-50 p-3 text-sm font-medium text-emerald-700">
                  Livraison gratuite activee.
                </p>
              )}

              {missingProductsCount > 0 ? (
                <p className="mt-3 rounded-xl bg-amber-50 p-3 text-xs font-medium text-amber-700">
                  {missingProductsCount} produit(s) indisponible(s) ont ete ignores.
                </p>
              ) : null}

              {submitInfo ? (
                <p className="mt-3 rounded-xl bg-sky-50 p-3 text-xs font-medium text-sky-700">
                  {submitInfo}
                </p>
              ) : null}

              {submitError ? (
                <p className="mt-3 rounded-xl bg-rose-50 p-3 text-xs font-medium text-rose-700">
                  {submitError}
                </p>
              ) : null}

              <button
                type="button"
                onClick={handleConfirmOrder}
                disabled={isSubmitting || isProductsLoading || detailedItems.length === 0}
                className="mt-4 block w-full rounded-xl bg-brand-blue px-4 py-3 text-center text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-70"
              >
                {isSubmitting ? "Enregistrement de votre commande..." : "Confirmer la commande"}
              </button>

              <p className="mt-2 text-center text-[11px] text-slate-500">
                Apres confirmation, votre commande est enregistree puis WhatsApp s'ouvre automatiquement.
              </p>

              <a
                href={directWhatsAppLink}
                target="_blank"
                rel="noreferrer"
                className="mt-3 block rounded-xl border border-brand-blue px-4 py-3 text-center text-sm font-semibold text-brand-blue"
              >
                WhatsApp direct (sans enregistrement)
              </a>

              <button
                type="button"
                onClick={clearCart}
                className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 text-sm font-semibold text-slate-700"
              >
                Vider le panier
              </button>
            </aside>
          </div>
        )}
      </div>
    </section>
  );
}
