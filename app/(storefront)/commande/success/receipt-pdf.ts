type ReceiptCompanyInfo = {
  name: string;
  activity: string;
  city: string;
  phone: string;
  whatsapp: string;
};

type ReceiptOrderItem = {
  productName: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
};

type ReceiptOrder = {
  id: string;
  createdAt: string;
  deliveryOptionLabel: string;
  paymentLabel: string;
  customerName: string;
  customerPhone: string;
  customerAddress: string;
  customerNote: string;
  subtotal: number;
  deliveryFee: number;
  total: number;
  items: ReceiptOrderItem[];
};

type DownloadReceiptPdfInput = {
  company: ReceiptCompanyInfo;
  order: ReceiptOrder;
};

const formatDhPdf = (value: number): string => {
  const normalized = Number.isFinite(value) ? value : 0;
  return `${normalized.toLocaleString("fr-MA", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} DH`;
};

const formatDatePdf = (value: string): string => {
  if (!value) {
    return "-";
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("fr-MA", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(parsed);
};

const sanitizeFilePart = (value: string): string => {
  const cleaned = value.trim().replace(/[^a-zA-Z0-9-_]/g, "");
  return cleaned.length > 0 ? cleaned : "inconnue";
};

export const downloadOrderReceiptPdf = async ({
  company,
  order,
}: DownloadReceiptPdfInput): Promise<void> => {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "pt", format: "a4" });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 40;
  const contentWidth = pageWidth - margin * 2;
  const rowHeight = 22;
  let y = 44;

  const drawSectionTitle = (title: string) => {
    if (y > pageHeight - 120) {
      doc.addPage();
      y = 44;
    }
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(18, 45, 90);
    doc.text(title, margin, y);
    y += 16;
  };

  const drawLabelValue = (label: string, value: string) => {
    const safeValue = value.trim().length > 0 ? value : "-";
    const wrapped = doc.splitTextToSize(safeValue, contentWidth - 120);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(51, 65, 85);
    doc.text(label, margin, y);

    doc.setFont("helvetica", "normal");
    doc.text(wrapped, margin + 120, y);
    y += Math.max(14, wrapped.length * 12);
  };

  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.setTextColor(14, 33, 74);
  doc.text(company.name, margin, y);
  y += 18;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(71, 85, 105);
  doc.text(company.activity, margin, y);
  y += 14;
  doc.text(`Ville: ${company.city}`, margin, y);
  y += 14;
  doc.text(`Tel: ${company.phone}`, margin, y);
  y += 14;
  doc.text(`WhatsApp: ${company.whatsapp}`, margin, y);
  y += 16;

  doc.setDrawColor(203, 213, 225);
  doc.line(margin, y, margin + contentWidth, y);
  y += 16;

  drawSectionTitle("Informations de commande");
  drawLabelValue("Numero", order.id);
  drawLabelValue("Date", formatDatePdf(order.createdAt));
  drawLabelValue("Mode", order.deliveryOptionLabel);
  drawLabelValue("Paiement", order.paymentLabel);

  y += 8;
  drawSectionTitle("Informations client");
  drawLabelValue("Nom", order.customerName);
  drawLabelValue("Telephone", order.customerPhone);
  if (order.customerAddress.trim().length > 0) {
    drawLabelValue("Adresse", order.customerAddress);
  }
  if (order.customerNote.trim().length > 0) {
    drawLabelValue("Note client", order.customerNote);
  }

  y += 6;
  drawSectionTitle("Articles");

  const colNameWidth = contentWidth * 0.46;
  const colQtyWidth = contentWidth * 0.12;
  const colUnitWidth = contentWidth * 0.2;
  const colTotalWidth = contentWidth - colNameWidth - colQtyWidth - colUnitWidth;

  doc.setFillColor(241, 245, 249);
  doc.rect(margin, y, contentWidth, rowHeight, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(30, 41, 59);
  doc.text("Produit", margin + 6, y + 14);
  doc.text("Qt", margin + colNameWidth + 6, y + 14);
  doc.text("Prix unite", margin + colNameWidth + colQtyWidth + 6, y + 14);
  doc.text("Total", margin + colNameWidth + colQtyWidth + colUnitWidth + 6, y + 14);
  y += rowHeight;

  const items = Array.isArray(order.items) ? order.items : [];
  if (items.length === 0) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(71, 85, 105);
    doc.text("Aucun article enregistre.", margin + 6, y + 14);
    y += rowHeight;
  } else {
    for (const item of items) {
      if (y > pageHeight - 120) {
        doc.addPage();
        y = 44;
      }

      const productName = item.productName.trim().length > 0 ? item.productName : "Produit";
      const wrappedName = doc.splitTextToSize(productName, colNameWidth - 10);
      const rowTextHeight = Math.max(14, wrappedName.length * 11);
      const dynamicRowHeight = Math.max(rowHeight, rowTextHeight + 8);

      doc.setDrawColor(226, 232, 240);
      doc.rect(margin, y, contentWidth, dynamicRowHeight);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(30, 41, 59);
      doc.text(wrappedName, margin + 6, y + 13);
      doc.text(String(item.quantity), margin + colNameWidth + 6, y + 13);
      doc.text(
        formatDhPdf(item.unitPrice),
        margin + colNameWidth + colQtyWidth + 6,
        y + 13,
      );
      doc.text(
        formatDhPdf(item.lineTotal),
        margin + colNameWidth + colQtyWidth + colUnitWidth + 6,
        y + 13,
      );

      y += dynamicRowHeight;
    }
  }

  y += 12;
  if (y > pageHeight - 120) {
    doc.addPage();
    y = 44;
  }

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(51, 65, 85);
  doc.text(`Total produits: ${formatDhPdf(order.subtotal)}`, margin, y);
  y += 14;
  doc.text(
    `Livraison: ${order.deliveryFee <= 0 ? "Gratuit" : formatDhPdf(order.deliveryFee)}`,
    margin,
    y,
  );
  y += 18;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.setTextColor(14, 33, 74);
  doc.text(`TOTAL FINAL: ${formatDhPdf(order.total)}`, margin, y);

  y += 20;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(71, 85, 105);
  doc.text("Merci pour votre confiance.", margin, y);

  const fileName = `commande-${sanitizeFilePart(order.id)}.pdf`;
  doc.save(fileName);
};

export type { ReceiptCompanyInfo, ReceiptOrder, ReceiptOrderItem };
