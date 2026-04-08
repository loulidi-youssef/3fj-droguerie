"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useCart } from "@/components/cart-provider";
import { useToast } from "@/components/toast-provider";
import {
  buildDetailedCartItems,
  fetchCartProductsLookup,
  type CartProductsLookup,
} from "@/lib/cart-display";
import { isBulkQuoteQuantity, resolveBulkQuoteThreshold } from "@/lib/bulk-quote";
import {
  type CheckoutCustomerInput,
  type CheckoutField,
  type CheckoutFieldErrors,
  validateCheckoutCustomer,
} from "@/lib/checkout-validation";
import { formatDh, roundDhAmount } from "@/lib/currency";
import { getAmountForFreeDelivery, getDeliveryCost } from "@/lib/delivery";
import {
  clampQuantityToStock,
  getStockStatusClassName,
  getStockStatusLabel,
} from "@/lib/quantity";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";
import { useQuantityController } from "@/lib/use-quantity-controller";
import { buildCartWhatsAppLink, buildCartWhatsAppQuoteLink } from "@/lib/whatsapp";

type CheckoutFormValues = CheckoutCustomerInput;

type OrderApiResponse = {
  orderId?: string;
  subtotal?: number;
  deliveryFee?: number;
  total?: number;
  fulfillmentMethod?: "delivery" | "pickup";
  error?: string;
  fieldErrors?: CheckoutFieldErrors;
};

type FulfillmentMethod = "delivery" | "pickup";

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
const CHECKOUT_DRAFT_STORAGE_KEY = "3fj-checkout-draft-v1";
const CHECKOUT_RETURN_PATH = "/panier?checkout=1";
const BULK_STEPS = [10, 50, 100];

type CartPageQuantityControlsProps = {
  productName: string;
  quantity: number;
  maxAvailableQuantity: number | null;
  onQuantityChange: (nextQuantity: number) => void;
};

const CartPageQuantityControls = ({
  productName,
  quantity,
  maxAvailableQuantity,
  onQuantityChange,
}: CartPageQuantityControlsProps) => {
  const quantityController = useQuantityController({
    quantity,
    stock: maxAvailableQuantity,
    minQuantity: 1,
    onQuantityChange,
  });
  const stockLabel = getStockStatusLabel(maxAvailableQuantity);
  const stockClassName = getStockStatusClassName(maxAvailableQuantity);

  return (
    <div>
      <div className="flex items-center gap-2">
        <button
          type="button"
          className="h-8 w-8 rounded-full border border-slate-300 text-lg disabled:cursor-not-allowed disabled:opacity-50"
          onClick={() => quantityController.decrementBy(1)}
          disabled={!quantityController.canDecrement}
          aria-label={`Diminuer la quantite de ${productName}`}
        >
          -
        </button>
        <input
          inputMode="numeric"
          pattern="[0-9]*"
          value={quantityController.inputValue}
          onChange={(event) => quantityController.setInputValue(event.target.value)}
          onBlur={quantityController.commitInputValue}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              quantityController.commitInputValue();
            }
          }}
          className="min-w-12 rounded-md border border-slate-300 px-2 py-1 text-center text-sm font-semibold text-slate-800 outline-none focus:border-brand-orange"
          aria-label={`Saisir la quantite de ${productName}`}
          disabled={quantityController.isOutOfStock}
        />
        <button
          type="button"
          className="h-8 w-8 rounded-full border border-slate-300 text-lg disabled:cursor-not-allowed disabled:opacity-50"
          onClick={() => quantityController.incrementBy(1)}
          disabled={!quantityController.canIncrement}
          aria-label={`Augmenter la quantite de ${productName}`}
        >
          +
        </button>
      </div>

      <div className="mt-1 flex flex-wrap gap-1">
        {BULK_STEPS.map((step) => (
          <button
            key={step}
            type="button"
            onClick={() => quantityController.incrementBy(step)}
            disabled={!quantityController.canIncrement}
            className="inline-flex h-6 items-center justify-center rounded-md border border-slate-300 bg-white px-2 text-[10px] font-semibold text-slate-700 transition hover:border-slate-400 disabled:cursor-not-allowed disabled:opacity-50"
          >
            +{step}
          </button>
        ))}
      </div>

      <p className={`mt-1 inline-flex rounded-full border px-2 py-0.5 text-[10px] font-semibold ${stockClassName}`}>
        {stockLabel}
      </p>

      {quantityController.hasReachedMax &&
      maxAvailableQuantity !== null &&
      maxAvailableQuantity > 0 ? (
        <p className="mt-2 text-xs font-medium text-amber-700">
          Quantite maximale disponible atteinte.
        </p>
      ) : null}
    </div>
  );
};

export default function PanierPage() {
  const router = useRouter();
  const { items, updateQuantity, removeItem, clearCart } = useCart();
  const { showToast } = useToast();

  const [cartLookup, setCartLookup] = useState<CartProductsLookup>({
    productsById: {},
    activeOfferRulesByProductId: {},
  });
  const [isProductsLoading, setIsProductsLoading] = useState(false);
  const [checkoutForm, setCheckoutForm] = useState<CheckoutFormValues>(initialCheckoutForm);
  const [fieldErrors, setFieldErrors] = useState<CheckoutFieldErrors>({});
  const [touchedFields, setTouchedFields] =
    useState<Record<CheckoutField, boolean>>(initialTouchedFields);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitInfo, setSubmitInfo] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCustomerAuthenticated, setIsCustomerAuthenticated] = useState(false);
  const [customerAccessToken, setCustomerAccessToken] = useState<string | null>(null);
  const [authRequiredPrompt, setAuthRequiredPrompt] = useState(false);
  const [fulfillmentMethod, setFulfillmentMethod] =
    useState<FulfillmentMethod>("delivery");

  useEffect(() => {
    try {
      const rawDraft = window.localStorage.getItem(CHECKOUT_DRAFT_STORAGE_KEY);
      if (!rawDraft) {
        return;
      }

      const parsedDraft = JSON.parse(rawDraft) as Partial<CheckoutFormValues>;
      setCheckoutForm((current) => ({
        name: typeof parsedDraft.name === "string" ? parsedDraft.name : current.name,
        phone: typeof parsedDraft.phone === "string" ? parsedDraft.phone : current.phone,
        address:
          typeof parsedDraft.address === "string" ? parsedDraft.address : current.address,
        location:
          typeof parsedDraft.location === "string"
            ? parsedDraft.location
            : current.location,
      }));
    } catch {
      window.localStorage.removeItem(CHECKOUT_DRAFT_STORAGE_KEY);
    }
  }, []);

  useEffect(() => {
    const uniqueProductIds = [...new Set(items.map((item) => item.productId))];

    if (uniqueProductIds.length === 0) {
      setCartLookup({
        productsById: {},
        activeOfferRulesByProductId: {},
      });
      setIsProductsLoading(false);
      return;
    }

    let isActive = true;

    const fetchProducts = async () => {
      setIsProductsLoading(true);

      try {
        const nextLookup = await fetchCartProductsLookup(uniqueProductIds);
        if (!isActive) {
          return;
        }
        setCartLookup(nextLookup);
      } catch {
        if (!isActive) {
          return;
        }
        setCartLookup({
          productsById: {},
          activeOfferRulesByProductId: {},
        });
      } finally {
        if (isActive) {
          setIsProductsLoading(false);
        }
      }
    };

    void fetchProducts();

    return () => {
      isActive = false;
    };
  }, [items]);

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) {
      setIsCustomerAuthenticated(false);
      setCustomerAccessToken(null);
      return;
    }

    let isMounted = true;

    const syncSession = async () => {
      const { data } = await supabase.auth.getSession();
      if (!isMounted) {
        return;
      }

      setIsCustomerAuthenticated(Boolean(data.session));
      setCustomerAccessToken(data.session?.access_token ?? null);
    };

    void syncSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsCustomerAuthenticated(Boolean(session));
      setCustomerAccessToken(session?.access_token ?? null);
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    window.localStorage.setItem(CHECKOUT_DRAFT_STORAGE_KEY, JSON.stringify(checkoutForm));
  }, [checkoutForm]);

  useEffect(() => {
    if (!isCustomerAuthenticated) {
      return;
    }

    const params = new URLSearchParams(window.location.search);
    if (params.get("checkout") !== "1") {
      return;
    }

    setSubmitInfo("Connexion reussie. Vous pouvez maintenant confirmer votre commande.");
    params.delete("checkout");
    const nextQueryString = params.toString();
    const nextUrl = nextQueryString ? `/panier?${nextQueryString}` : "/panier";
    window.history.replaceState({}, "", nextUrl);
  }, [isCustomerAuthenticated]);

  const detailedItems = useMemo(
    () => buildDetailedCartItems(items, cartLookup),
    [items, cartLookup],
  );

  useEffect(() => {
    if (isProductsLoading || detailedItems.length === 0) {
      return;
    }

    const itemsAboveStock = detailedItems.filter(
      (item) => {
        const clampedQuantity = clampQuantityToStock(item.quantity, item.maxAvailableQuantity, {
          minQuantity: 1,
          allowZeroWhenOutOfStock: true,
        });
        return clampedQuantity !== item.quantity;
      },
    );

    if (itemsAboveStock.length === 0) {
      return;
    }

    for (const item of itemsAboveStock) {
      const clampedQuantity = clampQuantityToStock(item.quantity, item.maxAvailableQuantity, {
        minQuantity: 1,
        allowZeroWhenOutOfStock: true,
      });

      updateQuantity(
        item.productId,
        clampedQuantity,
        item.variantId,
        item.maxAvailableQuantity ?? undefined,
      );
    }

    showToast(
      itemsAboveStock.length === 1
        ? "La quantité a été ajustée selon le stock disponible"
        : `${itemsAboveStock.length} quantités ont été ajustées selon le stock disponible`,
      { variant: "info", durationMs: 3200 },
    );
  }, [detailedItems, isProductsLoading, showToast, updateQuantity]);

  const missingProductsCount = items.length - detailedItems.length;
  const subtotal = roundDhAmount(detailedItems.reduce((sum, item) => sum + item.lineTotal, 0));
  const deliveryCost =
    fulfillmentMethod === "pickup" ? 0 : roundDhAmount(getDeliveryCost(subtotal));
  const total = roundDhAmount(subtotal + deliveryCost);
  const amountForFreeDelivery =
    fulfillmentMethod === "pickup" ? 0 : getAmountForFreeDelivery(subtotal);
  const freeDeliveryTarget = subtotal + amountForFreeDelivery;
  const freeDeliveryProgress =
    fulfillmentMethod === "pickup" || freeDeliveryTarget <= 0
      ? 0
      : Math.min(100, Math.round((subtotal / freeDeliveryTarget) * 100));
  const checkoutName = checkoutForm.name.trim();
  const checkoutPhone = checkoutForm.phone.trim();
  const checkoutAddress = checkoutForm.address.trim();
  const checkoutLocation = checkoutForm.location.trim();
  const hasWhatsAppCustomerDetails = Boolean(
    checkoutName || checkoutPhone || checkoutAddress || checkoutLocation,
  );

  const directWhatsAppLink = buildCartWhatsAppLink(
    detailedItems.map((item) => ({
      name: item.variantLabel ? `${item.product.name} (${item.variantLabel})` : item.product.name,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
    })),
    subtotal,
    deliveryCost,
    hasWhatsAppCustomerDetails
      ? {
          name: checkoutName || undefined,
          phone: checkoutPhone || undefined,
          address: checkoutAddress || undefined,
          location: checkoutLocation || undefined,
        }
      : undefined,
    {
      fulfillmentMethod,
    },
  );
  const bulkEligibleItems = detailedItems.filter((item) => {
    const selectedVariant = item.variantId
      ? item.product.variants?.find((variant) => variant.id === item.variantId)
      : undefined;
    const threshold = resolveBulkQuoteThreshold(item.product, selectedVariant);
    return isBulkQuoteQuantity(item.quantity, threshold);
  });
  const hasBulkEligibleItems = bulkEligibleItems.length > 0;
  const bulkTriggeredItemNames = bulkEligibleItems.map((item) => item.product.name);
  const globalBulkQuoteWhatsAppLink = buildCartWhatsAppQuoteLink(
    detailedItems.map((item) => {
      const selectedVariant = item.variantId
        ? item.product.variants?.find((variant) => variant.id === item.variantId)
        : undefined;

      return {
        name: item.product.name,
        quantity: item.quantity,
        variantLabel: item.variantLabel || undefined,
        unitLabel: selectedVariant?.unitLabel ?? item.product.unitLabel,
        unitPrice: item.unitPrice,
        estimatedTotal: item.lineTotal,
      };
    }),
    hasWhatsAppCustomerDetails
      ? {
          name: checkoutName || undefined,
          phone: checkoutPhone || undefined,
          address: checkoutAddress || undefined,
          location: checkoutLocation || undefined,
        }
      : undefined,
    {
      fulfillmentMethod,
      note:
        bulkTriggeredItemNames.length === 1
          ? `Je souhaite un prix de gros pour ${bulkTriggeredItemNames[0]}.`
          : `Je souhaite un prix de gros pour ces articles: ${bulkTriggeredItemNames.join(", ")}.`,
    },
  );

  const validateAndSetErrors = (
    nextForm: CheckoutFormValues,
    method: FulfillmentMethod = fulfillmentMethod,
  ) => {
    const validation = validateCheckoutCustomer(nextForm, {
      requireAddress: method === "delivery",
    });
    setFieldErrors(validation.errors);
    return validation;
  };

  const handleFulfillmentMethodChange = (nextMethod: FulfillmentMethod) => {
    setFulfillmentMethod(nextMethod);
    setSubmitError(null);
    setSubmitInfo(null);
    setAuthRequiredPrompt(false);
    validateAndSetErrors(checkoutForm, nextMethod);
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
    if (authRequiredPrompt) {
      setAuthRequiredPrompt(false);
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
    setAuthRequiredPrompt(false);

    if (isProductsLoading) {
      setSubmitError("Chargement des produits en cours. Merci de patienter.");
      return;
    }

    if (detailedItems.length === 0) {
      setSubmitError("Votre panier est vide.");
      return;
    }

    if (!isCustomerAuthenticated || !customerAccessToken) {
      setAuthRequiredPrompt(true);
      setSubmitError("Connexion requise pour confirmer votre commande.");
      setSubmitInfo("Connectez-vous ou creez un compte, puis revenez terminer votre commande.");
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
          ...(customerAccessToken
            ? { Authorization: `Bearer ${customerAccessToken}` }
            : {}),
        },
        body: JSON.stringify({
          customer,
          fulfillmentMethod,
          items: detailedItems.map((item) => ({
            productId: item.productId,
            quantity: item.quantity,
            variantId: item.variantId,
            selectedColor: item.selectedColor,
            selectedSize: item.selectedSize,
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

      clearCart();
      window.localStorage.removeItem(CHECKOUT_DRAFT_STORAGE_KEY);
      setCheckoutForm(initialCheckoutForm);
      setFieldErrors({});
      setTouchedFields(initialTouchedFields);
      setAuthRequiredPrompt(false);
      showToast("Commande enregistree avec succes.");
      setSubmitInfo(`Commande enregistree (ref: ${payload.orderId}). Redirection...`);
      router.push(`/compte/commandes/${encodeURIComponent(payload.orderId)}?success=1`);
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
            <p className="text-sm text-slate-600">Votre panier est vide.</p>
            <Link href="/produits" className="mt-3 inline-flex text-sm font-semibold text-brand-orange hover:underline">
              Voir les produits
            </Link>
          </div>
        ) : (
          <div className="mt-6 grid gap-6 lg:grid-cols-3">
            <div className="space-y-4 lg:col-span-2">
              {detailedItems.length > 0 ? (
                detailedItems.map((item) => {
                  return (
                    <article key={item.lineKey} className="rounded-2xl bg-white p-4 shadow-card">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <h2 className="text-lg font-bold text-brand-blue">{item.product.name}</h2>
                          {item.variantLabel ? (
                            <p className="text-xs font-medium text-slate-500">{item.variantLabel}</p>
                          ) : null}
                          <p className="text-sm text-slate-600">
                            {item.originalUnitPrice ? (
                              <span className="mr-2 line-through">{formatDh(item.originalUnitPrice)}</span>
                            ) : null}
                            <span>{formatDh(item.unitPrice)} / unite</span>
                          </p>
                        </div>

                        <div className="flex items-center gap-2">
                          <CartPageQuantityControls
                            productName={item.product.name}
                            quantity={item.quantity}
                            maxAvailableQuantity={item.maxAvailableQuantity}
                            onQuantityChange={(nextQuantity) =>
                              updateQuantity(
                                item.productId,
                                nextQuantity,
                                item.variantId,
                                item.maxAvailableQuantity ?? undefined,
                              )
                            }
                          />
                        </div>
                      </div>

                      <div className="mt-3 flex items-center justify-between">
                        <p className="text-sm font-semibold text-brand-blue">Total ligne: {formatDh(item.lineTotal)}</p>
                        <button
                          type="button"
                          onClick={() => removeItem(item.productId, item.variantId)}
                          className="text-xs font-semibold text-rose-600 hover:underline"
                        >
                          Supprimer
                        </button>
                      </div>
                    </article>
                  );
                })
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
                <fieldset className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                  <legend className="px-1 text-xs font-semibold uppercase tracking-wide text-slate-600">
                    Mode de reception *
                  </legend>
                  <div className="mt-2 grid gap-2 sm:grid-cols-2">
                    <label className="flex cursor-pointer items-start gap-2 rounded-lg border border-slate-200 bg-white p-2">
                      <input
                        type="radio"
                        name="fulfillmentMethod"
                        checked={fulfillmentMethod === "delivery"}
                        onChange={() => handleFulfillmentMethodChange("delivery")}
                      />
                      <span className="text-sm text-slate-700">
                        <span className="block font-semibold text-brand-blue">Livraison</span>
                        <span className="block text-xs text-slate-500">
                          Livraison a votre adresse.
                        </span>
                      </span>
                    </label>
                    <label className="flex cursor-pointer items-start gap-2 rounded-lg border border-slate-200 bg-white p-2">
                      <input
                        type="radio"
                        name="fulfillmentMethod"
                        checked={fulfillmentMethod === "pickup"}
                        onChange={() => handleFulfillmentMethodChange("pickup")}
                      />
                      <span className="text-sm text-slate-700">
                        <span className="block font-semibold text-brand-blue">Retrait en magasin</span>
                        <span className="block text-xs text-slate-500">
                          Vous recupererez votre commande directement en magasin.
                        </span>
                      </span>
                    </label>
                  </div>
                </fieldset>

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

                {fulfillmentMethod === "delivery" ? (
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
                ) : (
                  <p className="rounded-xl bg-emerald-50 p-3 text-xs font-medium text-emerald-700">
                    Vous recupererez votre commande directement en magasin.
                  </p>
                )}

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

              {!isCustomerAuthenticated ? (
                <div
                  className={`mt-4 rounded-xl border p-3 ${
                    authRequiredPrompt
                      ? "border-rose-300 bg-rose-50"
                      : "border-slate-200 bg-slate-50"
                  }`}
                >
                  <p className="text-sm font-semibold text-brand-blue">
                    Connexion requise pour confirmer
                  </p>
                  <p className="mt-1 text-xs leading-relaxed text-slate-600">
                    Pour finaliser la commande, connectez-vous ou creez un compte.
                    Apres authentification, vous revenez directement ici pour continuer.
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Link
                      href={`/login?next=${encodeURIComponent(CHECKOUT_RETURN_PATH)}`}
                      className="btn-primary px-3 py-2 text-xs sm:text-sm"
                    >
                      Se connecter
                    </Link>
                    <Link
                      href={`/register?next=${encodeURIComponent(CHECKOUT_RETURN_PATH)}`}
                      className="btn-outline-brand px-3 py-2 text-xs sm:text-sm"
                    >
                      Creer un compte
                    </Link>
                  </div>
                </div>
              ) : (
                <p className="mt-4 rounded-xl bg-emerald-50 p-3 text-xs font-medium text-emerald-700">
                  Connecte. Vous pouvez confirmer votre commande.
                </p>
              )}

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

              {fulfillmentMethod === "pickup" ? (
                <p className="mt-3 rounded-xl bg-emerald-50 p-3 text-sm font-medium text-emerald-700">
                  Retrait en magasin: aucun frais de livraison.
                </p>
              ) : amountForFreeDelivery > 0 ? (
                <p className="mt-3 rounded-xl bg-orange-50 p-3 text-sm font-medium text-orange-700">
                  Ajoutez encore {formatDh(amountForFreeDelivery)} pour beneficier de la livraison gratuite.
                </p>
              ) : (
                <p className="mt-3 rounded-xl bg-emerald-50 p-3 text-sm font-medium text-emerald-700">
                  Livraison gratuite activee.
                </p>
              )}
              {fulfillmentMethod === "delivery" ? (
                <div className="mt-2 rounded-xl border border-slate-200 bg-white p-2.5">
                  <div className="h-2 overflow-hidden rounded-full bg-slate-200">
                    <div
                      className="h-full rounded-full bg-brand-orange transition-all"
                      style={{ width: `${freeDeliveryProgress}%` }}
                    />
                  </div>
                  <p className="mt-1 text-[11px] text-slate-500">
                    Progression livraison gratuite: {freeDeliveryProgress}%
                  </p>
                </div>
              ) : null}

              {missingProductsCount > 0 ? (
                <p className="mt-3 rounded-xl bg-amber-50 p-3 text-xs font-medium text-amber-700">
                  {missingProductsCount} produit(s) indisponible(s) ont ete ignores.
                </p>
              ) : null}

              <div className="mt-3 space-y-2">
                <article className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-brand-blue">
                    Protection des donnees
                  </h3>
                  <p className="mt-1 text-[11px] leading-relaxed text-slate-600">
                    La protection de vos donnees est importante pour nous ! Soyez assure que
                    vos informations seront conservees en toute securite et sans compromis. Nous
                    ne vendons pas vos informations personnelles pour de l&apos;argent et nous
                    n&apos;utiliserons vos informations que conformement a notre politique en
                    matiere de confidentialite et de cookies afin de vous fournir nos services et
                    de les ameliorer.
                  </p>
                </article>

                <article className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-brand-blue">
                    Protection des achats sur 3FJ
                  </h3>
                  <p className="mt-1 text-[11px] leading-relaxed text-slate-600">
                    Faites vos achats sur 3FJ en toute confiance en sachant que si un probleme se
                    produit avec une commande, nous sommes la pour vous aider.
                  </p>
                </article>
              </div>

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
                {isSubmitting
                  ? "Enregistrement de votre commande..."
                  : isCustomerAuthenticated
                    ? "Confirmer la commande"
                    : "Se connecter pour confirmer"}
              </button>

              <p className="mt-2 text-center text-[11px] text-slate-500">
                Aucun paiement en ligne maintenant. Apres confirmation, vous serez redirige vers le suivi de commande.
              </p>

              {hasBulkEligibleItems ? (
                <div className="mt-3 rounded-xl border border-emerald-300 bg-emerald-50 p-3">
                  <p className="text-xs font-semibold text-emerald-800">
                    Pour les grandes quantites, demandez un devis personnalise.
                  </p>
                  <a
                    href={globalBulkQuoteWhatsAppLink}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-2 block rounded-xl border border-emerald-500 bg-emerald-100 px-4 py-3 text-center text-sm font-bold text-emerald-900 transition hover:bg-emerald-200"
                  >
                    Demande globale de devis
                  </a>
                </div>
              ) : null}

              <a
                href={directWhatsAppLink}
                target="_blank"
                rel="noreferrer"
                className="mt-3 block rounded-xl border border-brand-blue px-4 py-3 text-center text-sm font-semibold text-brand-blue"
              >
                Commander via WhatsApp (message pre-rempli)
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
