"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState, type MouseEvent } from "react";
import { useCart } from "@/components/cart-provider";
import { useToast } from "@/components/toast-provider";
import { trackEvent } from "@/lib/analytics";
import { isBulkQuoteQuantity, resolveBulkQuoteThreshold } from "@/lib/bulk-quote";
import {
  type CheckoutCustomerInput,
  type CheckoutField,
  type CheckoutFieldErrors,
  validateCheckoutCustomer,
} from "@/lib/checkout-validation";
import { formatDh, roundDhAmount } from "@/lib/currency";
import {
  getCheckoutDeliveryOptions,
  getDefaultDeliveryOption,
  getFulfillmentMethodForDeliveryOption,
  requiresAddressForDeliveryOption,
  type DeliveryOption,
  type DeliveryOptionIcon as DeliveryOptionIconKey,
  type FulfillmentMethod,
} from "@/lib/delivery";
import { getStockStatusClassName, getStockStatusLabel } from "@/lib/quantity";
import { captureQuoteRequestAndRedirectToWhatsApp } from "@/lib/quote-request-client";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";
import { useQuantityController } from "@/lib/use-quantity-controller";
import {
  getMissingProductsWarningMessage,
  useResolvedCartItems,
} from "@/lib/use-resolved-cart-items";
import { buildCartWhatsAppLink, buildCartWhatsAppQuoteLink } from "@/lib/whatsapp";

type CheckoutFormValues = CheckoutCustomerInput;

type OrderApiResponse = {
  orderId?: string;
  subtotal?: number;
  deliveryFee?: number;
  total?: number;
  fulfillmentMethod?: "delivery" | "pickup";
  deliveryOption?: DeliveryOption;
  error?: string;
  fieldErrors?: CheckoutFieldErrors;
};

const initialCheckoutForm: CheckoutFormValues = {
  name: "",
  phone: "",
  address: "",
  location: "",
  note: "",
};

const initialTouchedFields: Record<CheckoutField, boolean> = {
  name: false,
  phone: false,
  address: false,
  location: false,
  note: false,
};

const baseRequiredFields: CheckoutField[] = ["phone", "location"];
const CHECKOUT_DRAFT_STORAGE_KEY = "3fj-checkout-draft-v1";
const BULK_STEPS = [10, 50, 100];

const getRequiredFieldsForDeliveryOption = (
  deliveryOption: DeliveryOption,
  options?: { requireName?: boolean },
): CheckoutField[] => {
  const requiredFields: CheckoutField[] = requiresAddressForDeliveryOption(deliveryOption)
    ? [...baseRequiredFields, "address"]
    : [...baseRequiredFields];

  if (options?.requireName) {
    requiredFields.unshift("name");
  }

  return requiredFields;
};

const DeliveryModeIcon = ({
  icon,
  className,
}: {
  icon: DeliveryOptionIconKey;
  className?: string;
}) => {
  if (icon === "zap") {
    return (
      <svg
        viewBox="0 0 24 24"
        aria-hidden="true"
        className={className ?? "h-4 w-4"}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M13 2L4 14h7l-1 8 10-13h-7l0-7z" />
      </svg>
    );
  }

  if (icon === "store") {
    return (
      <svg
        viewBox="0 0 24 24"
        aria-hidden="true"
        className={className ?? "h-4 w-4"}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M3 9h18" />
        <path d="M4 9l2-5h12l2 5" />
        <path d="M5 9v11h14V9" />
        <path d="M9 20v-6h6v6" />
      </svg>
    );
  }

  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className={className ?? "h-4 w-4"}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M3 7h11v8H3z" />
      <path d="M14 10h3l4 3v2h-2" />
      <path d="M7 17a2 2 0 100 4 2 2 0 000-4z" />
      <path d="M17 17a2 2 0 100 4 2 2 0 000-4z" />
      <path d="M14 19h1" />
    </svg>
  );
};

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

      <div className="mt-2 flex flex-wrap gap-1.5">
        {BULK_STEPS.map((step) => (
          <button
            key={step}
            type="button"
            onClick={() => quantityController.incrementBy(step)}
            disabled={!quantityController.canIncrement}
            className="inline-flex h-8 items-center justify-center rounded-md border border-slate-300 bg-white px-2.5 text-xs font-semibold text-slate-700 transition hover:border-slate-400 disabled:cursor-not-allowed disabled:opacity-50"
          >
            +{step}
          </button>
        ))}
      </div>

      <p className={`mt-1.5 inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${stockClassName}`}>
        {stockLabel}
      </p>

      {quantityController.hasReachedMax &&
      maxAvailableQuantity !== null &&
      maxAvailableQuantity > 0 ? (
        <p className="mt-2 text-sm font-medium text-amber-700">
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
  const handleStockReconciled = useCallback(
    (payload: { message: string }) => {
      showToast(payload.message, { variant: "info", durationMs: 3200 });
    },
    [showToast],
  );
  const { detailedItems, isLoadingProducts: isProductsLoading, missingProductsCount } =
    useResolvedCartItems({
      items,
      updateQuantity,
      onStockReconciled: handleStockReconciled,
    });
  const missingProductsMessage = getMissingProductsWarningMessage(missingProductsCount, {
    includeCount: true,
  });
  const [checkoutForm, setCheckoutForm] = useState<CheckoutFormValues>(initialCheckoutForm);
  const [fieldErrors, setFieldErrors] = useState<CheckoutFieldErrors>({});
  const [touchedFields, setTouchedFields] =
    useState<Record<CheckoutField, boolean>>(initialTouchedFields);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitInfo, setSubmitInfo] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [customerAccessToken, setCustomerAccessToken] = useState<string | null>(null);
  const [selectedDeliveryOption, setSelectedDeliveryOption] = useState<DeliveryOption>(
    getDefaultDeliveryOption(),
  );
  const checkoutSectionRef = useRef<HTMLElement | null>(null);
  const hasTrackedCartViewRef = useRef(false);
  const hasTrackedCheckoutStartRef = useRef(false);

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
        note: typeof parsedDraft.note === "string" ? parsedDraft.note : current.note,
      }));
    } catch {
      window.localStorage.removeItem(CHECKOUT_DRAFT_STORAGE_KEY);
    }
  }, []);

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) {
      setCustomerAccessToken(null);
      return;
    }

    let isMounted = true;

    const syncSession = async () => {
      const { data } = await supabase.auth.getSession();
      if (!isMounted) {
        return;
      }

      setCustomerAccessToken(data.session?.access_token ?? null);
    };

    void syncSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
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

  const cartSize = useMemo(
    () => detailedItems.reduce((sum, item) => sum + item.quantity, 0),
    [detailedItems],
  );
  const subtotal = roundDhAmount(detailedItems.reduce((sum, item) => sum + item.lineTotal, 0));
  const deliveryOptions = useMemo(() => getCheckoutDeliveryOptions(subtotal), [subtotal]);
  const selectedDeliveryDetails = useMemo(
    () =>
      deliveryOptions.find((option) => option.id === selectedDeliveryOption) ??
      deliveryOptions[0],
    [deliveryOptions, selectedDeliveryOption],
  );
  const fulfillmentMethod: FulfillmentMethod = getFulfillmentMethodForDeliveryOption(
    selectedDeliveryOption,
  );
  const requiresAddress = requiresAddressForDeliveryOption(selectedDeliveryOption);
  const isNameRequired = Boolean(customerAccessToken);
  const deliveryCost = roundDhAmount(selectedDeliveryDetails?.price ?? 0);
  const total = roundDhAmount(subtotal + deliveryCost);
  const selectedDeliveryTitle = selectedDeliveryDetails?.title ?? "Livraison Standard";
  const checkoutName = checkoutForm.name.trim();
  const checkoutPhone = checkoutForm.phone.trim();
  const checkoutAddress = checkoutForm.address.trim();
  const checkoutLocation = checkoutForm.location.trim();
  const checkoutNote = checkoutForm.note.trim();
  const hasWhatsAppCustomerDetails = Boolean(
    checkoutName || checkoutPhone || checkoutAddress || checkoutLocation || checkoutNote,
  );

  useEffect(() => {
    if (hasTrackedCartViewRef.current) {
      return;
    }

    if (items.length > 0 && isProductsLoading) {
      return;
    }

    hasTrackedCartViewRef.current = true;
    trackEvent("cart_view", {
      source: "panier-page",
      cartSize,
      totalPrice: total,
      deliveryOption: selectedDeliveryOption,
    });
  }, [cartSize, isProductsLoading, items.length, selectedDeliveryOption, total]);

  const trackCheckoutStart = useCallback(() => {
    if (hasTrackedCheckoutStartRef.current) {
      return;
    }

    hasTrackedCheckoutStartRef.current = true;
    trackEvent("checkout_start", {
      source: "checkout-section",
      cartSize,
      totalPrice: total,
      deliveryOption: selectedDeliveryOption,
    });
  }, [cartSize, selectedDeliveryOption, total]);

  useEffect(() => {
    if (hasTrackedCheckoutStartRef.current || cartSize <= 0) {
      return;
    }

    const target = checkoutSectionRef.current;
    if (!target) {
      return;
    }

    if (typeof IntersectionObserver === "undefined") {
      trackCheckoutStart();
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) {
            continue;
          }

          trackCheckoutStart();
          observer.disconnect();
          break;
        }
      },
      { threshold: 0.15 },
    );

    observer.observe(target);

    return () => {
      observer.disconnect();
    };
  }, [cartSize, trackCheckoutStart]);

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
          note: checkoutNote || undefined,
        }
      : undefined,
    {
      fulfillmentMethod,
      deliveryOptionLabel: selectedDeliveryTitle,
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
          note: checkoutNote || undefined,
        }
      : undefined,
    {
      fulfillmentMethod,
      deliveryOptionLabel: selectedDeliveryTitle,
      note:
        bulkTriggeredItemNames.length === 1
          ? `Je souhaite un prix de gros pour ${bulkTriggeredItemNames[0]}.`
          : `Je souhaite un prix de gros pour ces articles: ${bulkTriggeredItemNames.join(", ")}.`,
    },
  );
  const handleGlobalQuoteRequestClick = async (
    event: MouseEvent<HTMLAnchorElement>,
  ) => {
    event.preventDefault();

    await captureQuoteRequestAndRedirectToWhatsApp({
      whatsappUrl: globalBulkQuoteWhatsAppLink,
      accessToken: customerAccessToken,
      payload: {
        source: "cart-page",
        fulfillmentMethod,
        items: detailedItems.map((item) => ({
          productId: item.productId,
          quantity: item.quantity,
          variantId: item.variantId,
          selectedColor: item.selectedColor,
          selectedSize: item.selectedSize,
        })),
      },
      openInNewTab: true,
    });
  };

  const validateAndSetErrors = (
    nextForm: CheckoutFormValues,
    deliveryOption: DeliveryOption = selectedDeliveryOption,
  ) => {
    const validation = validateCheckoutCustomer(nextForm, {
      requireAddress: requiresAddressForDeliveryOption(deliveryOption),
      requireName: isNameRequired,
      requireLocation: true,
    });
    setFieldErrors(validation.errors);
    return validation;
  };

  const handleDeliveryOptionChange = (nextOption: DeliveryOption) => {
    setSelectedDeliveryOption(nextOption);
    setSubmitError(null);
    setSubmitInfo(null);
    validateAndSetErrors(checkoutForm, nextOption);
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
    const requiredFields = getRequiredFieldsForDeliveryOption(selectedDeliveryOption, {
      requireName: isNameRequired,
    });
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
      note: current.note || Boolean(errors.note),
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
    trackEvent("checkout_submit", {
      source: "confirm-order-button",
      cartSize,
      totalPrice: total,
      deliveryOption: selectedDeliveryOption,
      fulfillmentMethod,
    });

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
        validation.errors.note ||
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
          deliveryOption: selectedDeliveryOption,
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
      showToast("Commande enregistree avec succes.");
      setSubmitInfo(`Commande enregistree (ref: ${payload.orderId}). Redirection...`);
      router.push(`/commande/success?orderId=${encodeURIComponent(payload.orderId)}`);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Une erreur est survenue.";
      trackEvent("order_error", {
        source: "checkout-submit",
        cartSize,
        totalPrice: total,
        deliveryOption: selectedDeliveryOption,
        fulfillmentMethod,
        errorMessage: message,
      });
      setSubmitError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmWhatsApp = () => {
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
        validation.errors.location ||
        validation.errors.address ||
        validation.errors.note ||
        "Merci de verifier vos informations.";
      setSubmitError(firstError);
      return;
    }

    window.open(directWhatsAppLink, "_blank", "noopener,noreferrer");
  };

  const isCheckoutActionDisabled = isSubmitting || isProductsLoading || detailedItems.length === 0;
  const isWhatsAppActionDisabled =
    isSubmitting || isProductsLoading || detailedItems.length === 0;
  const primaryCheckoutCtaLabel = isSubmitting
    ? "Enregistrement de votre commande..."
    : "Confirmer la commande";

  return (
    <section className="bg-brand-light py-8 pb-56 md:py-12 md:pb-12">
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
          <div className="mt-6 grid gap-7 lg:grid-cols-3">
            <div className="space-y-4 lg:col-span-2">
              {detailedItems.length > 0 ? (
                detailedItems.map((item) => {
                  return (
                    <article key={item.lineKey} className="rounded-2xl bg-white p-4 shadow-card">
                      <div className="flex flex-wrap items-center justify-between gap-4">
                        <div>
                          <h2 className="text-lg font-bold text-brand-blue">{item.product.name}</h2>
                          {item.variantLabel ? (
                            <p className="text-sm font-medium text-slate-500">{item.variantLabel}</p>
                          ) : null}
                          <p className="text-sm md:text-base text-slate-600">
                            {item.originalUnitPrice ? (
                              <span className="mr-2 text-sm line-through">{formatDh(item.originalUnitPrice)}</span>
                            ) : null}
                            <span className="text-base font-semibold">{formatDh(item.unitPrice)} / unite</span>
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
                        <p className="text-base font-semibold text-brand-blue">Total ligne: {formatDh(item.lineTotal)}</p>
                        <button
                          type="button"
                          onClick={() => removeItem(item.productId, item.variantId)}
                          className="text-sm font-semibold text-rose-600 hover:underline"
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

            <aside ref={checkoutSectionRef} className="rounded-2xl bg-white p-4 shadow-card md:p-5">
              <h2 className="text-xl font-extrabold text-brand-blue">Confirmation rapide</h2>
              <p className="mt-1 text-sm text-slate-600">
                1) Completez vos coordonnees 2) Choisissez la livraison 3) Confirmez votre commande.
              </p>

              <div className="mt-5 space-y-4">
                <section>
                  <p className="text-sm font-semibold uppercase tracking-wide text-slate-600">
                    Choisissez votre mode de livraison
                  </p>
                  <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                    {deliveryOptions.map((option, index) => {
                      const isSelected = option.id === selectedDeliveryOption;
                      const priceLabel = option.price === 0 ? "Gratuit" : formatDh(option.price);

                      return (
                        <button
                          key={option.id}
                          type="button"
                          onClick={() => handleDeliveryOptionChange(option.id)}
                          className={`min-h-[92px] rounded-xl border px-3 py-3 text-left shadow-sm transition ${
                            index === 2 ? "sm:col-span-2" : ""
                          } ${
                            isSelected
                              ? "border-brand-orange bg-orange-50 ring-1 ring-orange-200"
                              : "border-slate-200 bg-white hover:border-brand-orange/70"
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-start gap-2">
                              <span
                                className={`mt-0.5 inline-flex h-7 w-7 items-center justify-center rounded-full border ${
                                  isSelected
                                    ? "border-brand-orange bg-white text-brand-orange"
                                    : "border-slate-300 text-slate-500"
                                }`}
                              >
                                <DeliveryModeIcon icon={option.icon} className="h-4 w-4" />
                              </span>
                              <div>
                                <span className="block text-base font-bold text-brand-blue">
                                  {option.title}
                                </span>
                                <span className="mt-1 block text-sm text-slate-600">
                                  {option.description}
                                </span>
                              </div>
                            </div>
                            <span
                              className={`inline-flex rounded-full px-2.5 py-1 text-sm font-bold ${
                                isSelected
                                  ? "bg-brand-orange text-white"
                                  : "bg-slate-100 text-slate-700"
                              }`}
                            >
                              {priceLabel}
                            </span>
                          </div>
                          {option.condition ? (
                            <p className="mt-2 text-sm font-medium text-slate-500">
                              {option.condition}
                            </p>
                          ) : null}
                        </button>
                      );
                    })}
                  </div>
                </section>

                <section className="space-y-3">
                  <label className="block">
                    <span className="text-sm font-semibold uppercase tracking-wide text-slate-600">
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
                      <p className="mt-1 text-sm font-medium text-rose-700">{fieldErrors.phone}</p>
                    ) : null}
                  </label>

                  <label className="block">
                    <span className="text-sm font-semibold uppercase tracking-wide text-slate-600">
                      {isNameRequired ? "Nom complet *" : "Nom complet (optionnel)"}
                    </span>
                    <input
                      type="text"
                      value={checkoutForm.name}
                      onChange={(event) => handleCheckoutFieldChange("name", event.target.value)}
                      onBlur={() => handleFieldBlur("name")}
                      className={getInputClassName("name")}
                      placeholder="Nom et prenom"
                      autoComplete="name"
                      aria-invalid={touchedFields.name && Boolean(fieldErrors.name)}
                    />
                    {touchedFields.name && fieldErrors.name ? (
                      <p className="mt-1 text-sm font-medium text-rose-700">{fieldErrors.name}</p>
                    ) : null}
                  </label>

                  <label className="block">
                    <span className="text-sm font-semibold uppercase tracking-wide text-slate-600">
                      Ville *
                    </span>
                    <input
                      type="text"
                      value={checkoutForm.location}
                      onChange={(event) => handleCheckoutFieldChange("location", event.target.value)}
                      onBlur={() => handleFieldBlur("location")}
                      className={getInputClassName("location")}
                      placeholder="Ex: Fes"
                      autoComplete="address-level2"
                      aria-invalid={touchedFields.location && Boolean(fieldErrors.location)}
                    />
                    {touchedFields.location && fieldErrors.location ? (
                      <p className="mt-1 text-sm font-medium text-rose-700">{fieldErrors.location}</p>
                    ) : null}
                  </label>

                  {requiresAddress ? (
                    <label className="block">
                      <span className="text-sm font-semibold uppercase tracking-wide text-slate-600">
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
                        <p className="mt-1 text-sm font-medium text-rose-700">{fieldErrors.address}</p>
                      ) : null}
                    </label>
                  ) : (
                    <p className="rounded-xl bg-emerald-50 px-3 py-3 text-sm font-medium text-emerald-700">
                      Retrait en magasin selectionne. Aucune adresse n'est requise.
                    </p>
                  )}

                  <label className="block">
                    <span className="text-sm font-semibold uppercase tracking-wide text-slate-600">
                      Note de commande (optionnel)
                    </span>
                    <textarea
                      value={checkoutForm.note}
                      onChange={(event) => handleCheckoutFieldChange("note", event.target.value)}
                      onBlur={() => handleFieldBlur("note")}
                      className={`${getInputClassName("note")} min-h-[88px] resize-y`}
                      placeholder="Instruction de livraison, etage, point de repere..."
                      aria-invalid={touchedFields.note && Boolean(fieldErrors.note)}
                    />
                    {touchedFields.note && fieldErrors.note ? (
                      <p className="mt-1 text-sm font-medium text-rose-700">{fieldErrors.note}</p>
                    ) : null}
                  </label>
                </section>
              </div>

              <section className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-3">
                <p className="text-base font-semibold text-brand-blue">Recapitulatif final</p>
                <ul className="mt-3 space-y-2 text-sm md:text-base text-slate-700">
                  {detailedItems.map((item) => (
                    <li key={`summary-${item.lineKey}`} className="flex justify-between gap-2">
                      <span className="truncate">
                        {item.product.name} x{item.quantity}
                      </span>
                      <span className="font-semibold">{formatDh(item.lineTotal)}</span>
                    </li>
                  ))}
                </ul>
                <div className="mt-3 space-y-2.5 border-t border-slate-200 pt-3 text-sm md:text-base text-slate-700">
                  <div className="flex items-center justify-between">
                    <span>Total produits</span>
                    <span className="font-semibold">{formatDh(subtotal)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Livraison ({selectedDeliveryTitle})</span>
                    <span className="font-semibold">
                      {deliveryCost === 0 ? "Gratuit" : formatDh(deliveryCost)}
                    </span>
                  </div>
                  <div className="mt-2 flex items-center justify-between rounded-xl bg-brand-blue px-3 py-3 text-base font-extrabold text-white">
                    <span>Total a payer</span>
                    <span className="text-lg">{formatDh(total)}</span>
                  </div>
                  <p className="text-sm font-medium text-slate-500">
                    Paiement a la livraison apres confirmation.
                  </p>
                </div>
              </section>

              {missingProductsMessage ? (
                <p className="mt-3 rounded-xl bg-amber-50 p-3 text-sm font-medium text-amber-700">
                  {missingProductsMessage}
                </p>
              ) : null}

              {submitInfo ? (
                <p className="mt-3 rounded-xl bg-sky-50 p-3 text-sm font-medium text-sky-700">
                  {submitInfo}
                </p>
              ) : null}

              {submitError ? (
                <p className="mt-3 rounded-xl bg-rose-50 p-3 text-sm font-medium text-rose-700">
                  {submitError}
                </p>
              ) : null}

              <div className="mt-5 hidden gap-3 md:grid">
                <p className="text-sm font-bold uppercase tracking-wide text-brand-blue/80">
                  Action recommandee
                </p>
                <button
                  type="button"
                  onClick={handleConfirmOrder}
                  disabled={isCheckoutActionDisabled}
                  className="block w-full rounded-xl bg-brand-blue px-4 py-3 text-center text-base font-bold text-white shadow-[0_10px_24px_rgba(15,42,77,0.25)] transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {primaryCheckoutCtaLabel}
                </button>

                <button
                  type="button"
                  onClick={handleConfirmWhatsApp}
                  disabled={isWhatsAppActionDisabled}
                  className="block w-full rounded-xl border border-emerald-400 bg-emerald-50 px-4 py-3 text-center text-base font-semibold text-emerald-700 transition hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  Confirmer sur WhatsApp
                </button>

                <div className="mt-2 grid grid-cols-2 gap-2.5 text-sm font-semibold text-slate-600">
                  <p className="rounded-lg border border-slate-200 bg-white px-2.5 py-2.5 text-center">
                    Paiement a la livraison
                  </p>
                  <p className="rounded-lg border border-slate-200 bg-white px-2.5 py-2.5 text-center">
                    Confirmation rapide
                  </p>
                  <p className="rounded-lg border border-slate-200 bg-white px-2.5 py-2.5 text-center">
                    Support WhatsApp
                  </p>
                  <p className="rounded-lg border border-slate-200 bg-white px-2.5 py-2.5 text-center">
                    Retrait en magasin
                  </p>
                </div>
              </div>

              {hasBulkEligibleItems ? (
                <a
                  href={globalBulkQuoteWhatsAppLink}
                  target="_blank"
                  rel="noreferrer"
                  onClick={(event) => {
                    void handleGlobalQuoteRequestClick(event);
                  }}
                  className="mt-4 hidden rounded-xl border border-emerald-300 bg-emerald-50 px-4 py-3 text-center text-base font-semibold text-emerald-700 md:block"
                >
                  Demande globale de devis
                </a>
              ) : null}

              <button
                type="button"
                onClick={clearCart}
                className="mt-4 hidden w-full rounded-xl border border-slate-300 px-4 py-3 text-base font-semibold text-slate-700 md:block"
              >
                Vider le panier
              </button>
            </aside>
          </div>
        )}
      </div>

      {items.length > 0 ? (
        <div className="fixed inset-x-0 bottom-[calc(4.6rem+env(safe-area-inset-bottom))] z-[118] px-3 pb-[env(safe-area-inset-bottom)] md:hidden">
          <div className="rounded-2xl border border-emerald-300 bg-white p-2.5 shadow-[0_12px_24px_rgba(15,23,42,0.12)]">
            <div className="mb-2.5 space-y-2 rounded-xl bg-slate-50 px-2.5 py-2 text-sm font-semibold text-slate-600">
              <div className="flex items-center justify-between">
                <span>Total produits</span>
                <span>{formatDh(subtotal)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Livraison</span>
                <span>{deliveryCost === 0 ? "Gratuit" : formatDh(deliveryCost)}</span>
              </div>
              <div className="flex items-center justify-between rounded-lg bg-brand-blue px-2.5 py-2 text-base font-extrabold text-white">
                <span>Total a payer</span>
                <span>{formatDh(total)}</span>
              </div>
            </div>
            <div className="grid gap-2.5">
              <button
                type="button"
                onClick={handleConfirmOrder}
                disabled={isCheckoutActionDisabled}
                className="block w-full rounded-xl bg-brand-blue px-4 py-3 text-center text-base font-bold text-white shadow-[0_10px_24px_rgba(15,42,77,0.25)] transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {primaryCheckoutCtaLabel}
              </button>
              <button
                type="button"
                onClick={handleConfirmWhatsApp}
                disabled={isWhatsAppActionDisabled}
                className="block w-full rounded-xl border border-emerald-500 bg-emerald-50 px-4 py-3 text-center text-base font-bold text-emerald-700 transition hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-70"
              >
                Confirmer sur WhatsApp
              </button>
            </div>
            <div className="mt-2.5 grid grid-cols-2 gap-2 text-sm font-semibold text-slate-600">
              <p className="rounded-md border border-slate-200 bg-slate-50 px-2 py-2 text-center">
                Paiement livraison
              </p>
              <p className="rounded-md border border-slate-200 bg-slate-50 px-2 py-2 text-center">
                Confirmation rapide
              </p>
              <p className="rounded-md border border-slate-200 bg-slate-50 px-2 py-2 text-center">
                Support WhatsApp
              </p>
              <p className="rounded-md border border-slate-200 bg-slate-50 px-2 py-2 text-center">
                Retrait magasin
              </p>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
