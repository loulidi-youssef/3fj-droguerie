import { businessInfo } from "@/data/business";

type WhatsAppLineItem = {
  name: string;
  quantity: number;
  unitPrice: number;
};

type WhatsAppCustomerDetails = {
  name?: string;
  phone?: string;
  address?: string;
  location?: string;
  orderId?: string;
};

type ProductWhatsAppOptions = {
  quantity?: number;
  unitPrice?: number;
  variantLabel?: string;
};

type CartWhatsAppOptions = {
  fulfillmentMethod?: "delivery" | "pickup";
};

const toTrimmedLine = (label: string, value: string | undefined): string | null => {
  const trimmed = value?.trim();
  if (!trimmed) {
    return null;
  }

  return `${label}: ${trimmed}`;
};

export const buildProductWhatsAppLink = (
  productName: string,
  options?: ProductWhatsAppOptions,
): string => {
  const quantity = options?.quantity && options.quantity > 0 ? Math.round(options.quantity) : 1;

  const orderLine =
    options?.variantLabel?.trim()
      ? `${productName} (${options.variantLabel.trim()})`
      : productName;

  const priceLine =
    typeof options?.unitPrice === "number" && Number.isFinite(options.unitPrice) && options.unitPrice > 0
      ? `Prix affiche: ${options.unitPrice} DH`
      : null;

  const message = [
    `Bonjour ${businessInfo.brandName},`,
    "Je souhaite commander ce produit:",
    `- ${orderLine} x${quantity}`,
    ...(priceLine ? [priceLine] : []),
    "Merci de me confirmer la disponibilite et le delai de livraison a Fes.",
  ].join("\n");

  return `https://wa.me/${businessInfo.whatsappPhone}?text=${encodeURIComponent(message)}`;
};

export const buildCartWhatsAppLink = (
  items: WhatsAppLineItem[],
  subtotal: number,
  deliveryCost: number,
  customerDetails?: WhatsAppCustomerDetails,
  options?: CartWhatsAppOptions,
): string => {
  const lines = items.map(
    (item) => `- ${item.name} x${item.quantity} (${item.unitPrice} DH)`,
  );

  const total = subtotal + deliveryCost;
  const fulfillmentLine =
    options?.fulfillmentMethod === "pickup"
      ? "Mode de reception: Retrait en magasin"
      : options?.fulfillmentMethod === "delivery"
        ? "Mode de reception: Livraison"
        : null;
  const customerLines = [
    toTrimmedLine("Client", customerDetails?.name),
    toTrimmedLine("Telephone", customerDetails?.phone),
    toTrimmedLine("Adresse", customerDetails?.address),
    toTrimmedLine("Localisation", customerDetails?.location),
    customerDetails?.orderId ? `Reference commande: ${customerDetails.orderId}` : null,
    fulfillmentLine,
  ].filter((line): line is string => Boolean(line));

  const message = [
    `Bonjour ${businessInfo.brandName},`,
    ...(customerLines.length > 0 ? [...customerLines, ""] : []),
    "Je souhaite passer la commande suivante:",
    ...lines,
    "",
    `Sous-total: ${subtotal} DH`,
    `Livraison: ${deliveryCost} DH`,
    `Total: ${total} DH`,
    "",
    "Merci de confirmer la commande sur WhatsApp.",
  ].join("\n");

  return `https://wa.me/${businessInfo.whatsappPhone}?text=${encodeURIComponent(message)}`;
};
