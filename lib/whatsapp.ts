import { businessInfo } from "@/data/business";
import { formatBulkQuoteQuantity } from "@/lib/bulk-quote";
import { formatDh, roundDhAmount } from "@/lib/currency";

type WhatsAppLineItem = {
  name: string;
  quantity: number;
  unitPrice: number;
};

type WhatsAppQuoteLineItem = {
  name: string;
  quantity: number;
  variantLabel?: string;
  unitLabel?: string;
  unitPrice?: number;
  estimatedTotal?: number;
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

type ProductWhatsAppQuoteOptions = {
  quantity?: number;
  unitPrice?: number;
  variantLabel?: string;
  unitLabel?: string;
  estimatedTotal?: number;
  note?: string;
};

type CartWhatsAppQuoteOptions = {
  fulfillmentMethod?: "delivery" | "pickup";
  note?: string;
};

type WhatsAppQuoteMessageOptions = {
  headerLine: string;
  items: WhatsAppQuoteLineItem[];
  customerDetails?: WhatsAppCustomerDetails;
  fulfillmentMethod?: "delivery" | "pickup";
  note?: string;
};

const resolveWhatsAppPhone = (): string => {
  const configured = process.env.NEXT_PUBLIC_WHATSAPP_PHONE?.trim();
  if (!configured) {
    return businessInfo.whatsappPhone;
  }

  const normalized = configured.replace(/\D/g, "");
  return normalized || businessInfo.whatsappPhone;
};

const toWhatsAppLink = (message: string): string => {
  return `https://wa.me/${resolveWhatsAppPhone()}?text=${encodeURIComponent(message)}`;
};

const toTrimmedLine = (label: string, value: string | undefined): string | null => {
  const trimmed = value?.trim();
  if (!trimmed) {
    return null;
  }

  return `${label}: ${trimmed}`;
};

const toEstimatedUnitPriceLine = (unitPrice: number | undefined): string | null => {
  if (typeof unitPrice !== "number" || !Number.isFinite(unitPrice) || unitPrice <= 0) {
    return null;
  }

  return `Prix unitaire estime: ${formatDh(unitPrice)}`;
};

const toEstimatedTotalLine = (
  quantity: number,
  unitPrice: number | undefined,
  estimatedTotal: number | undefined,
): string | null => {
  const fromEstimatedTotal =
    typeof estimatedTotal === "number" && Number.isFinite(estimatedTotal) && estimatedTotal > 0
      ? roundDhAmount(estimatedTotal)
      : null;
  const fromUnitPrice =
    typeof unitPrice === "number" && Number.isFinite(unitPrice) && unitPrice > 0
      ? roundDhAmount(unitPrice * quantity)
      : null;

  const resolved = fromEstimatedTotal ?? fromUnitPrice;
  if (resolved === null || resolved <= 0) {
    return null;
  }

  return `Total estime: ${formatDh(resolved)}`;
};

export const buildWhatsAppQuoteMessage = ({
  headerLine,
  items,
  customerDetails,
  fulfillmentMethod,
  note,
}: WhatsAppQuoteMessageOptions): string => {
  const customerLines = [
    toTrimmedLine("Client", customerDetails?.name),
    toTrimmedLine("Telephone", customerDetails?.phone),
    toTrimmedLine("Adresse", customerDetails?.address),
    toTrimmedLine("Localisation", customerDetails?.location),
    customerDetails?.orderId ? `Reference commande: ${customerDetails.orderId}` : null,
    fulfillmentMethod === "pickup"
      ? "Mode de reception: Retrait en magasin"
      : fulfillmentMethod === "delivery"
        ? "Mode de reception: Livraison"
        : null,
  ].filter((line): line is string => Boolean(line));

  const itemSections = items.flatMap((item, index) => {
    const productLine = item.variantLabel?.trim()
      ? `${item.name} (${item.variantLabel.trim()})`
      : item.name;
    const estimatedPriceLine = toEstimatedUnitPriceLine(item.unitPrice);
    const estimatedTotalLine = toEstimatedTotalLine(
      item.quantity,
      item.unitPrice,
      item.estimatedTotal,
    );

    return [
      `Article ${index + 1}:`,
      `Produit: ${productLine}`,
      `Quantite: ${formatBulkQuoteQuantity(item.quantity, item.unitLabel)}`,
      ...(estimatedPriceLine ? [estimatedPriceLine] : []),
      ...(estimatedTotalLine ? [estimatedTotalLine] : []),
      "",
    ];
  });

  const messageLines = [
    `Bonjour ${businessInfo.brandName},`,
    ...(customerLines.length > 0 ? [...customerLines, ""] : []),
    headerLine,
    "",
    ...itemSections,
    `Note: ${note?.trim() || "Je souhaite un prix de gros."}`,
    "Merci de confirmer la disponibilite, le delai et votre meilleure offre.",
  ];

  while (messageLines.length > 0 && messageLines[messageLines.length - 1] === "") {
    messageLines.pop();
  }

  return messageLines.join("\n");
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
      ? `Prix affiche: ${formatDh(options.unitPrice)}`
      : null;

  const message = [
    `Bonjour ${businessInfo.brandName},`,
    "Je souhaite commander ce produit:",
    `- ${orderLine} x${quantity}`,
    ...(priceLine ? [priceLine] : []),
    "Merci de me confirmer la disponibilite et le delai de livraison a Fes.",
  ].join("\n");

  return toWhatsAppLink(message);
};

export const buildProductWhatsAppQuoteLink = (
  productName: string,
  options?: ProductWhatsAppQuoteOptions,
): string => {
  const quantity = options?.quantity && options.quantity > 0 ? Math.round(options.quantity) : 1;
  const message = buildWhatsAppQuoteMessage({
    headerLine: "Je souhaite un devis pour:",
    items: [
      {
        name: productName,
        quantity,
        variantLabel: options?.variantLabel,
        unitLabel: options?.unitLabel,
        unitPrice: options?.unitPrice,
        estimatedTotal: options?.estimatedTotal,
      },
    ],
    note: options?.note ?? "Je souhaite un prix de gros.",
  });

  return toWhatsAppLink(message);
};

export const buildCartWhatsAppLink = (
  items: WhatsAppLineItem[],
  subtotal: number,
  deliveryCost: number,
  customerDetails?: WhatsAppCustomerDetails,
  options?: CartWhatsAppOptions,
): string => {
  const lines = items.map(
    (item) => `- ${item.name} x${item.quantity} (${formatDh(item.unitPrice)})`,
  );

  const normalizedSubtotal = roundDhAmount(subtotal);
  const normalizedDeliveryCost = roundDhAmount(deliveryCost);
  const total = roundDhAmount(normalizedSubtotal + normalizedDeliveryCost);
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
    `Sous-total: ${formatDh(normalizedSubtotal)}`,
    `Livraison: ${formatDh(normalizedDeliveryCost)}`,
    `Total: ${formatDh(total)}`,
    "",
    "Merci de confirmer la commande sur WhatsApp.",
  ].join("\n");

  return toWhatsAppLink(message);
};

export const buildCartWhatsAppQuoteLink = (
  items: WhatsAppQuoteLineItem[],
  customerDetails?: WhatsAppCustomerDetails,
  options?: CartWhatsAppQuoteOptions,
): string => {
  const message = buildWhatsAppQuoteMessage({
    headerLine:
      items.length > 1
        ? "Je souhaite une demande globale de devis pour:"
        : "Je souhaite un devis pour:",
    items,
    customerDetails,
    fulfillmentMethod: options?.fulfillmentMethod,
    note: options?.note ?? "Je souhaite un prix de gros.",
  });

  return toWhatsAppLink(message);
};
