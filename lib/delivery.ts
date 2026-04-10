import { deliveryRules } from "@/data/business";

export type FulfillmentMethod = "delivery" | "pickup";
export type DeliveryOption = "standard" | "express" | "pickup";
export type DeliveryOptionIcon = "truck" | "zap" | "store";

export type CheckoutDeliveryOption = {
  id: DeliveryOption;
  title: string;
  description: string;
  condition?: string;
  icon: DeliveryOptionIcon;
  fulfillmentMethod: FulfillmentMethod;
  price: number;
};

const DEFAULT_EXPRESS_DELIVERY_FEE = 40;
const DEFAULT_DELIVERY_OPTION: DeliveryOption = "standard";

const getExpressDeliveryFee = (): number => {
  const configuredValue = Number(deliveryRules.expressFee ?? DEFAULT_EXPRESS_DELIVERY_FEE);
  return Number.isFinite(configuredValue) && configuredValue >= 0
    ? configuredValue
    : DEFAULT_EXPRESS_DELIVERY_FEE;
};

export const getDeliveryCost = (subtotal: number): number => {
  if (subtotal >= deliveryRules.freeFrom) {
    return 0;
  }
  return subtotal > 0 ? deliveryRules.fee : 0;
};

export const getExpressDeliveryCost = (subtotal: number): number => {
  return subtotal > 0 ? getExpressDeliveryFee() : 0;
};

export const getDeliveryCostByOption = (
  option: DeliveryOption,
  subtotal: number,
): number => {
  if (option === "pickup") {
    return 0;
  }

  if (option === "express") {
    return getExpressDeliveryCost(subtotal);
  }

  return getDeliveryCost(subtotal);
};

export const getDefaultDeliveryOption = (): DeliveryOption => {
  return DEFAULT_DELIVERY_OPTION;
};

export const normalizeDeliveryOption = (value: unknown): DeliveryOption | null => {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim().toLowerCase();
  if (normalized === "standard" || normalized === "express" || normalized === "pickup") {
    return normalized;
  }

  return null;
};

export const getFulfillmentMethodForDeliveryOption = (
  option: DeliveryOption,
): FulfillmentMethod => {
  return option === "pickup" ? "pickup" : "delivery";
};

export const getDeliveryOptionForFulfillmentMethod = (
  method: FulfillmentMethod,
): DeliveryOption => {
  return method === "pickup" ? "pickup" : DEFAULT_DELIVERY_OPTION;
};

export const requiresAddressForDeliveryOption = (option: DeliveryOption): boolean => {
  return option !== "pickup";
};

export const getCheckoutDeliveryOptions = (subtotal: number): CheckoutDeliveryOption[] => {
  return [
    {
      id: "standard",
      title: "Livraison Standard",
      description: "Reception sous 24h a 48h selon votre zone.",
      condition: `Gratuite des ${deliveryRules.freeFrom} DH d'achat.`,
      icon: "truck",
      fulfillmentMethod: "delivery",
      price: getDeliveryCostByOption("standard", subtotal),
    },
    {
      id: "express",
      title: "Livraison Express",
      description: "Traitement prioritaire et delai accelere.",
      condition: "Ideal pour les commandes urgentes.",
      icon: "zap",
      fulfillmentMethod: "delivery",
      price: getDeliveryCostByOption("express", subtotal),
    },
    {
      id: "pickup",
      title: "Retrait en magasin",
      description: "Recuperez votre commande sur place a Fes.",
      condition: "Disponible pendant les horaires d'ouverture.",
      icon: "store",
      fulfillmentMethod: "pickup",
      price: 0,
    },
  ];
};

export const getAmountForFreeDelivery = (subtotal: number): number => {
  return Math.max(0, deliveryRules.freeFrom - subtotal);
};
