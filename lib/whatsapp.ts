import { businessInfo } from "@/data/business";

type WhatsAppLineItem = {
  name: string;
  quantity: number;
  unitPrice: number;
};

type WhatsAppCustomerDetails = {
  name: string;
  phone: string;
  address: string;
  location: string;
  orderId?: string;
};

export const buildProductWhatsAppLink = (productName: string): string => {
  const message = [
    `Bonjour ${businessInfo.brandName},`,
    `Je souhaite commander: ${productName}.`,
    "Merci de me confirmer la disponibilite et le delai de livraison a Fes.",
  ].join("\n");

  return `https://wa.me/${businessInfo.whatsappPhone}?text=${encodeURIComponent(message)}`;
};

export const buildCartWhatsAppLink = (
  items: WhatsAppLineItem[],
  subtotal: number,
  deliveryCost: number,
  customerDetails?: WhatsAppCustomerDetails,
): string => {
  const lines = items.map(
    (item) => `- ${item.name} x${item.quantity} (${item.unitPrice} DH)`,
  );

  const total = subtotal + deliveryCost;
  const customerLines = customerDetails
    ? [
        `Client: ${customerDetails.name}`,
        `Telephone: ${customerDetails.phone}`,
        `Adresse: ${customerDetails.address}`,
        `Localisation: ${customerDetails.location}`,
        customerDetails.orderId ? `Reference commande: ${customerDetails.orderId}` : "",
        "",
      ].filter(Boolean)
    : [];

  const message = [
    `Bonjour ${businessInfo.brandName},`,
    ...customerLines,
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
