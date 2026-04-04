import { deliveryRules } from "@/data/business";

export const getDeliveryCost = (subtotal: number): number => {
  if (subtotal >= deliveryRules.freeFrom) {
    return 0;
  }
  return subtotal > 0 ? deliveryRules.fee : 0;
};

export const getAmountForFreeDelivery = (subtotal: number): number => {
  return Math.max(0, deliveryRules.freeFrom - subtotal);
};
