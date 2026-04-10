"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, type MouseEvent } from "react";
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
import {
  getCheckoutDeliveryOptions,
  getDefaultDeliveryOption,
  getFulfillmentMethodForDeliveryOption,
  requiresAddressForDeliveryOption,
  type DeliveryOption,
  type DeliveryOptionIcon as DeliveryOptionIconKey,
  type FulfillmentMethod,
} from "@/lib/delivery";
import {
  clampQuantityToStock,
  getStockStatusClassName,
  getStockStatusLabel,
} from "@/lib/quantity";
import { captureQuoteRequestAndRedirectToWhatsApp } from "@/lib/quote-request-client";
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

const baseRequiredFields: CheckoutField[] = ["name", "phone", "location"];
const CHECKOUT_DRAFT_STORAGE_KEY = "3fj-checkout-draft-v1";
const CHECKOUT_RETURN_PATH = "/panier?checkout=1";
const BULK_STEPS = [10, 50, 100];

const getRequiredFieldsForDeliveryOption = (
  deliveryOption: DeliveryOption,
): CheckoutField[] => {
  return requiresAddressForDeliveryOption(deliveryOption)
    ? [...baseRequiredFields, "address"]
    : [...baseRequiredFields];
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
  const [selectedDeliveryOption, setSelectedDeliveryOption] = useState<DeliveryOption>(
    getDefaultDeliveryOption(),
  );

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
      requireName: true,
      requireLocation: true,
    });
    setFieldErrors(validation.errors);
    return validation;
  };

  const handleDeliveryOptionChange = (nextOption: DeliveryOption) => {
    setSelectedDeliveryOption(nextOption);
    setSubmitError(null);
    setSubmitInfo(null);
    setAuthRequiredPrompt(false);
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
    const requiredFields = getRequiredFieldsForDeliveryOption(selectedDeliveryOption);
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
      setAuthRequiredPrompt(false);
      showToast("Commande enregistree avec succes.");
      setSubmitInfo(`Commande enregistree (ref: ${payload.orderId}). Redirection...`);
      router.push(`/commande/succes?orderId=${encodeURIComponent(payload.orderId)}`);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Une erreur est survenue.";
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
  const isWhatsAppActionDisabled = isProductsLoading || detailedItems.length === 0;
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

            <aside className="rounded-2xl bg-white p-4 shadow-card md:p-5">
              <h2 className="text-xl font-extrabold text-brand-blue">Confirmation rapide</h2>
              <p className="mt-1 text-sm text-slate-600">
                1) Completez vos coordonnees 2) Choisissez la livraison 3) Confirmez votre commande.
              </p>

              <div className="mt-5 space-y-4">
                <section>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-600">
                    Choisissez votre mode de livraison
                  </p>
                  <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
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
                                <span className="block text-sm font-bold text-brand-blue">
                                  {option.title}
                                </span>
                                <span className="mt-0.5 block text-[11px] text-slate-600">
                                  {option.description}
                                </span>
                              </div>
                            </div>
                            <span
                              className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-bold ${
                                isSelected
                                  ? "bg-brand-orange text-white"
                                  : "bg-slate-100 text-slate-700"
                              }`}
                            >
                              {priceLabel}
                            </span>
                          </div>
                          {option.condition ? (
                            <p className="mt-2 text-[11px] font-medium text-slate-500">
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
                      Nom complet *
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
                      <p className="mt-1 text-xs font-medium text-rose-700">{fieldErrors.name}</p>
                    ) : null}
                  </label>

                  <label className="block">
                    <span className="text-xs font-semibold uppercase tracking-wide text-slate-600">
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
                      <p className="mt-1 text-xs font-medium text-rose-700">{fieldErrors.location}</p>
                    ) : null}
                  </label>

                  {requiresAddress ? (
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
                    <p className="rounded-xl bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-700">
                      Retrait en magasin selectionne. Aucune adresse n'est requise.
                    </p>
                  )}

                  <label className="block">
                    <span className="text-xs font-semibold uppercase tracking-wide text-slate-600">
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
                      <p className="mt-1 text-xs font-medium text-rose-700">{fieldErrors.note}</p>
                    ) : null}
                  </label>
                </section>
              </div>

              <section className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-3">
                <p className="text-sm font-semibold text-brand-blue">Recapitulatif</p>
                <ul className="mt-2 space-y-1.5 text-sm text-slate-700">
                  {detailedItems.map((item) => (
                    <li key={`summary-${item.lineKey}`} className="flex justify-between gap-2">
                      <span className="truncate">
                        {item.product.name} x{item.quantity}
                      </span>
                      <span className="font-semibold">{formatDh(item.lineTotal)}</span>
                    </li>
                  ))}
                </ul>
                <div className="mt-3 space-y-1.5 border-t border-slate-200 pt-3 text-sm text-slate-700">
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
                  <div className="mt-2 flex items-center justify-between text-lg font-extrabold text-brand-blue">
                    <span>Total final</span>
                    <span>{formatDh(total)}</span>
                  </div>
                </div>
              </section>

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

              <div className="mt-4 hidden gap-2 md:grid">
                <button
                  type="button"
                  onClick={handleConfirmOrder}
                  disabled={isCheckoutActionDisabled}
                  className="block w-full rounded-xl bg-brand-blue px-4 py-3 text-center text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {primaryCheckoutCtaLabel}
                </button>

                <a
                  href={directWhatsAppLink}
                  target="_blank"
                  rel="noreferrer"
                  className="block w-full rounded-xl border border-emerald-500 bg-emerald-50 px-4 py-3 text-center text-sm font-semibold text-emerald-700"
                >
                  Confirmer sur WhatsApp
                </a>
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
                    Connexion requise pour la confirmation interne
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
              ) : null}

              {hasBulkEligibleItems ? (
                <a
                  href={globalBulkQuoteWhatsAppLink}
                  target="_blank"
                  rel="noreferrer"
                  onClick={(event) => {
                    void handleGlobalQuoteRequestClick(event);
                  }}
                  className="mt-3 hidden rounded-xl border border-emerald-300 bg-emerald-50 px-4 py-3 text-center text-sm font-semibold text-emerald-700 md:block"
                >
                  Demande globale de devis
                </a>
              ) : null}

              <button
                type="button"
                onClick={clearCart}
                className="mt-3 hidden w-full rounded-xl border border-slate-300 px-4 py-3 text-sm font-semibold text-slate-700 md:block"
              >
                Vider le panier
              </button>
            </aside>
          </div>
        )}
      </div>

      {items.length > 0 ? (
        <div className="fixed inset-x-0 bottom-[calc(4.6rem+env(safe-area-inset-bottom))] z-[118] px-3 pb-[env(safe-area-inset-bottom)] md:hidden">
          <div className="rounded-2xl border border-emerald-300 bg-white p-2 shadow-[0_12px_24px_rgba(15,23,42,0.12)]">
            <div className="mb-2 space-y-1 rounded-xl bg-slate-50 px-2 py-1.5 text-xs font-semibold text-slate-600">
              <div className="flex items-center justify-between">
                <span>Total produits</span>
                <span>{formatDh(subtotal)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Livraison</span>
                <span>{deliveryCost === 0 ? "Gratuit" : formatDh(deliveryCost)}</span>
              </div>
              <div className="flex items-center justify-between text-sm font-extrabold text-brand-blue">
                <span>Total final</span>
                <span>{formatDh(total)}</span>
              </div>
            </div>
            <div className="grid gap-2">
              <button
                type="button"
                onClick={handleConfirmOrder}
                disabled={isCheckoutActionDisabled}
                className="block w-full rounded-xl bg-brand-blue px-4 py-3 text-center text-sm font-bold text-white transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {primaryCheckoutCtaLabel}
              </button>
              <button
                type="button"
                onClick={handleConfirmWhatsApp}
                disabled={isWhatsAppActionDisabled}
                className="block w-full rounded-xl border border-emerald-500 bg-emerald-50 px-4 py-3 text-center text-sm font-bold text-emerald-700 transition hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-70"
              >
                Confirmer sur WhatsApp
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
