export const productImportColumns = [
  "name",
  "slug",
  "description",
  "price",
  "old_price",
  "stock",
  "category",
  "image_url",
  "is_active",
] as const;

export type ProductImportColumn = (typeof productImportColumns)[number];

export type ImportPreviewRow = {
  rowNumber: number;
  raw: Record<ProductImportColumn, string>;
  normalized: {
    name: string;
    slug: string;
    description: string;
    price: number;
    oldPrice: number | null;
    stock: number;
    categorySlug: string;
    imageUrls: string[];
    isActive: boolean;
  } | null;
  errors: string[];
  warnings: string[];
  invalidColumns: ProductImportColumn[];
  isValid: boolean;
};

export type ImportPreviewResponse = {
  ok: boolean;
  format: "csv" | "xlsx";
  message: string;
  summary: {
    totalRows: number;
    validRows: number;
    invalidRows: number;
  };
  headerErrors: string[];
  rows: ImportPreviewRow[];
  notices: string[];
  skippedEmptyRows: number;
  detectedDelimiter?: "," | ";";
};

export type ImportCommitFailedRow = {
  rowNumber: number;
  slug: string;
  reason: string;
};

export type ImportCommitResponse = {
  ok: boolean;
  format: "csv" | "xlsx";
  message: string;
  totalRows: number;
  importedCount: number;
  skippedCount: number;
  failedRows: ImportCommitFailedRow[];
  invalidRowsBeforeImport: number;
  duplicateRowsDuringInsert: number;
};

export const columnHelpRows: Array<{
  column: ProductImportColumn;
  description: string;
  format: string;
  example: string;
}> = [
  {
    column: "name",
    description: "Nom du produit",
    format: "Texte requis",
    example: "Perceuse Bosch 500W",
  },
  {
    column: "slug",
    description: "Identifiant unique",
    format: "minuscules/chiffres/tirets",
    example: "perceuse-bosch-500w",
  },
  {
    column: "description",
    description: "Description produit",
    format: "Texte requis",
    example: "Perceuse electrique compacte",
  },
  {
    column: "price",
    description: "Prix actuel",
    format: "Nombre decimal > 0",
    example: "799.90",
  },
  {
    column: "old_price",
    description: "Ancien prix (optionnel)",
    format: "Nombre decimal > price",
    example: "999.90",
  },
  {
    column: "stock",
    description: "Quantite disponible",
    format: "Entier >= 0",
    example: "25",
  },
  {
    column: "category",
    description: "Categorie produit",
    format: "Slug categorie",
    example: "outillage",
  },
  {
    column: "image_url",
    description: "Chemin image ou URL",
    format: "/images/... ou https://...",
    example: "/images/products/perceuse-bosch.jpg",
  },
  {
    column: "is_active",
    description: "Produit actif",
    format: "true ou false",
    example: "true",
  },
];
