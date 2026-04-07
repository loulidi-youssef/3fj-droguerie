import { categories } from "@/data/categories";
import { parseDecimalInput, roundDhAmount } from "@/lib/currency";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

export const PRODUCT_IMPORT_SUPPORTED_FORMATS = ["csv", "json"] as const;
export type ProductImportFormat = (typeof PRODUCT_IMPORT_SUPPORTED_FORMATS)[number];

export const PRODUCT_IMPORT_CSV_COLUMNS = [
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

type ProductImportCsvColumn = (typeof PRODUCT_IMPORT_CSV_COLUMNS)[number];

const REQUIRED_PRODUCT_IMPORT_COLUMNS = new Set<ProductImportCsvColumn>(
  PRODUCT_IMPORT_CSV_COLUMNS,
);

const PRODUCT_IMPORT_MAX_FILE_SIZE_BYTES = 2_000_000;
const PRODUCT_IMPORT_MAX_ROWS = 5_000;
const DEFAULT_PRODUCT_RATING = 4.5;

type ProductImportNormalizedRow = {
  name: string;
  slug: string;
  description: string;
  price: number;
  oldPrice: number | null;
  stock: number;
  categorySlug: string;
  imageUrls: string[];
  isActive: boolean;
};

type ProductImportRowOutput = {
  rowNumber: number;
  raw: Record<ProductImportCsvColumn, string>;
  normalized: ProductImportNormalizedRow | null;
  errors: string[];
  warnings: string[];
  isValid: boolean;
};

type ProductImportSummary = {
  totalRows: number;
  validRows: number;
  invalidRows: number;
};

export type ProductImportPreviewResult = {
  ok: boolean;
  format: ProductImportFormat;
  message: string;
  summary: ProductImportSummary;
  headerErrors: string[];
  rows: ProductImportRowOutput[];
};

export type ProductImportFailedRow = {
  rowNumber: number;
  slug: string;
  reason: string;
};

export type ProductImportCommitResult = {
  ok: boolean;
  format: ProductImportFormat;
  message: string;
  totalRows: number;
  importedCount: number;
  skippedCount: number;
  failedRows: ProductImportFailedRow[];
  invalidRowsBeforeImport: number;
  duplicateRowsDuringInsert: number;
};

type ParseCsvResult =
  | {
      ok: true;
      rows: string[][];
    }
  | {
      ok: false;
      error: string;
    };

type WorkingProductImportRow = {
  rowNumber: number;
  raw: Record<ProductImportCsvColumn, string>;
  normalized: ProductImportNormalizedRow | null;
  errors: Set<string>;
  warnings: Set<string>;
};

const normalizeSlugLikeValue = (rawValue: string): string => {
  return rawValue
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
};

const normalizeCellValue = (rawValue: string | undefined): string => {
  return typeof rawValue === "string" ? rawValue.trim() : "";
};

const parseBooleanCellValue = (rawValue: string): boolean | null => {
  const normalized = rawValue.trim().toLowerCase();
  if (!normalized) {
    return true;
  }

  if (["true", "1", "yes", "oui", "on", "active"].includes(normalized)) {
    return true;
  }

  if (["false", "0", "no", "non", "off", "inactive"].includes(normalized)) {
    return false;
  }

  return null;
};

const parseImageUrlsCell = (rawValue: string): string[] => {
  return rawValue
    .split("|")
    .map((value) => value.trim())
    .filter(Boolean);
};

const isAcceptedImagePath = (value: string): boolean => {
  if (!value) {
    return false;
  }

  if (value.startsWith("/")) {
    return true;
  }

  return /^https?:\/\//i.test(value);
};

const shortenDescription = (description: string): string => {
  const compact = description.trim().replace(/\s+/g, " ");
  if (compact.length <= 140) {
    return compact;
  }

  return `${compact.slice(0, 137).trimEnd()}...`;
};

const normalizeDatabaseImportError = (message: string | undefined): string => {
  const rawMessage = message ?? "";
  if (!rawMessage) {
    return "Erreur base de donnees.";
  }

  if (rawMessage.includes("duplicate key value") || rawMessage.includes("products_slug_key")) {
    return "Slug deja existant.";
  }

  if (rawMessage.includes("products_price_check")) {
    return "Prix invalide (doit etre > 0).";
  }

  if (rawMessage.includes("products_stock_check")) {
    return "Stock invalide (doit etre >= 0).";
  }

  if (rawMessage.includes("cardinality(images) > 0")) {
    return "Au moins une image est requise.";
  }

  return "Erreur base de donnees lors de l'insertion.";
};

const parseCsv = (rawCsvText: string): ParseCsvResult => {
  const csvText = rawCsvText.replace(/^\uFEFF/, "");
  const rows: string[][] = [];
  let currentField = "";
  let currentRow: string[] = [];
  let insideQuotes = false;

  for (let index = 0; index < csvText.length; index += 1) {
    const char = csvText[index];

    if (insideQuotes) {
      if (char === "\"") {
        const nextChar = csvText[index + 1];
        if (nextChar === "\"") {
          currentField += "\"";
          index += 1;
          continue;
        }
        insideQuotes = false;
        continue;
      }

      currentField += char;
      continue;
    }

    if (char === "\"") {
      insideQuotes = true;
      continue;
    }

    if (char === ",") {
      currentRow.push(currentField);
      currentField = "";
      continue;
    }

    if (char === "\r") {
      continue;
    }

    if (char === "\n") {
      currentRow.push(currentField);
      rows.push(currentRow);
      currentField = "";
      currentRow = [];
      continue;
    }

    currentField += char;
  }

  if (insideQuotes) {
    return {
      ok: false,
      error: "CSV invalide: guillemets non fermes.",
    };
  }

  currentRow.push(currentField);
  if (currentRow.some((cell) => cell.trim().length > 0)) {
    rows.push(currentRow);
  }

  if (rows.length === 0) {
    return {
      ok: false,
      error: "Le fichier CSV est vide.",
    };
  }

  return {
    ok: true,
    rows,
  };
};

const getHeaderIndexMap = (
  headerRow: string[],
): {
  headerErrors: string[];
  indexByColumn: Map<ProductImportCsvColumn, number>;
} => {
  const normalizedHeaderToIndex = new Map<string, number>();
  for (const [index, headerCell] of headerRow.entries()) {
    const normalizedHeader = headerCell.trim().toLowerCase();
    if (!normalizedHeader) {
      continue;
    }

    if (!normalizedHeaderToIndex.has(normalizedHeader)) {
      normalizedHeaderToIndex.set(normalizedHeader, index);
    }
  }

  const indexByColumn = new Map<ProductImportCsvColumn, number>();
  const headerErrors: string[] = [];

  for (const column of REQUIRED_PRODUCT_IMPORT_COLUMNS) {
    const index = normalizedHeaderToIndex.get(column);
    if (typeof index !== "number") {
      headerErrors.push(`Colonne manquante: ${column}`);
      continue;
    }
    indexByColumn.set(column, index);
  }

  return { headerErrors, indexByColumn };
};

const buildWorkingRow = (
  csvRow: string[],
  rowNumber: number,
  indexByColumn: Map<ProductImportCsvColumn, number>,
): WorkingProductImportRow => {
  const readCell = (column: ProductImportCsvColumn): string => {
    const index = indexByColumn.get(column);
    if (typeof index !== "number") {
      return "";
    }
    return normalizeCellValue(csvRow[index]);
  };

  const raw: Record<ProductImportCsvColumn, string> = {
    name: readCell("name"),
    slug: readCell("slug"),
    description: readCell("description"),
    price: readCell("price"),
    old_price: readCell("old_price"),
    stock: readCell("stock"),
    category: readCell("category"),
    image_url: readCell("image_url"),
    is_active: readCell("is_active"),
  };

  const errors = new Set<string>();
  const warnings = new Set<string>();

  const name = raw.name.trim();
  if (!name) {
    errors.add("Nom requis.");
  }

  const slug = normalizeSlugLikeValue(raw.slug);
  if (!slug) {
    errors.add("Slug requis.");
  } else if (!/^[a-z0-9-]+$/.test(slug)) {
    errors.add("Slug invalide (lettres minuscules, chiffres, tirets).");
  }

  const description = raw.description.trim();
  if (!description) {
    errors.add("Description requise.");
  }

  const priceValue = parseDecimalInput(raw.price);
  if (!Number.isFinite(priceValue) || priceValue <= 0) {
    errors.add("Prix invalide (> 0 attendu).");
  }
  const price = roundDhAmount(priceValue);

  let oldPrice: number | null = null;
  if (raw.old_price) {
    const oldPriceValue = parseDecimalInput(raw.old_price);
    if (!Number.isFinite(oldPriceValue) || oldPriceValue <= 0) {
      errors.add("old_price invalide (> 0 attendu).");
    } else {
      oldPrice = roundDhAmount(oldPriceValue);
      if (Number.isFinite(price) && oldPrice <= price) {
        errors.add("old_price doit etre superieur au prix.");
      }
      warnings.add(
        "old_price est valide mais non persiste dans products (colonne absente).",
      );
    }
  }

  const stockValue = parseDecimalInput(raw.stock);
  if (
    !Number.isFinite(stockValue) ||
    stockValue < 0 ||
    Math.trunc(stockValue) !== stockValue
  ) {
    errors.add("Stock invalide (entier >= 0 attendu).");
  }
  const stock = Number.isFinite(stockValue) ? Math.trunc(stockValue) : 0;

  const categorySlug = normalizeSlugLikeValue(raw.category);
  if (!categorySlug) {
    errors.add("Categorie requise.");
  }

  const imageUrls = parseImageUrlsCell(raw.image_url);
  if (imageUrls.length === 0) {
    errors.add("image_url requis (au moins une URL ou chemin).");
  } else {
    const invalidImagePath = imageUrls.find((imageUrl) => !isAcceptedImagePath(imageUrl));
    if (invalidImagePath) {
      errors.add(
        "image_url invalide: utilisez un chemin /images/... ou une URL https://...",
      );
    }
  }

  const isActive = parseBooleanCellValue(raw.is_active);
  if (isActive === null) {
    errors.add("is_active invalide (true/false, 1/0, yes/no, oui/non).");
  }

  const normalized: ProductImportNormalizedRow | null =
    errors.size === 0
      ? {
          name,
          slug,
          description,
          price,
          oldPrice,
          stock,
          categorySlug,
          imageUrls,
          isActive: isActive ?? true,
        }
      : null;

  return {
    rowNumber,
    raw,
    normalized,
    errors,
    warnings,
  };
};

const chunkValues = <T,>(values: T[], chunkSize: number): T[][] => {
  const chunks: T[][] = [];
  for (let index = 0; index < values.length; index += chunkSize) {
    chunks.push(values.slice(index, index + chunkSize));
  }
  return chunks;
};

const getExistingProductSlugs = async (slugs: string[]): Promise<Set<string>> => {
  const supabaseAdmin = getSupabaseAdminClient();
  if (!supabaseAdmin) {
    throw new Error("Supabase admin non configure.");
  }

  if (slugs.length === 0) {
    return new Set<string>();
  }

  const existingSlugs = new Set<string>();
  for (const chunk of chunkValues(slugs, 200)) {
    const { data, error } = await supabaseAdmin
      .from("products")
      .select("slug")
      .in("slug", chunk);

    if (error) {
      throw new Error("Impossible de verifier les slugs existants.");
    }

    for (const entry of data ?? []) {
      const slug = String((entry as { slug?: string }).slug ?? "")
        .trim()
        .toLowerCase();
      if (slug) {
        existingSlugs.add(slug);
      }
    }
  }

  return existingSlugs;
};

const getKnownCategorySlugs = async (): Promise<Set<string>> => {
  const categorySlugs = new Set<string>(categories.map((category) => category.slug));
  const supabaseAdmin = getSupabaseAdminClient();
  if (!supabaseAdmin) {
    return categorySlugs;
  }

  const { data } = await supabaseAdmin.from("products").select("category_slug");
  for (const entry of data ?? []) {
    const value = String((entry as { category_slug?: string }).category_slug ?? "")
      .trim()
      .toLowerCase();
    if (value) {
      categorySlugs.add(value);
    }
  }

  return categorySlugs;
};

const toPreviewRows = (rows: WorkingProductImportRow[]): ProductImportRowOutput[] => {
  return rows.map((row) => ({
    rowNumber: row.rowNumber,
    raw: row.raw,
    normalized: row.normalized,
    errors: [...row.errors],
    warnings: [...row.warnings],
    isValid: row.errors.size === 0 && row.normalized !== null,
  }));
};

const buildPreviewFromCsv = async (
  csvText: string,
): Promise<ProductImportPreviewResult> => {
  if (!csvText.trim()) {
    return {
      ok: false,
      format: "csv",
      message: "Ajoutez un fichier CSV avant de continuer.",
      headerErrors: [],
      rows: [],
      summary: {
        totalRows: 0,
        validRows: 0,
        invalidRows: 0,
      },
    };
  }

  if (csvText.length > PRODUCT_IMPORT_MAX_FILE_SIZE_BYTES) {
    return {
      ok: false,
      format: "csv",
      message: "Le fichier depasse 2 MB. Decoupez le catalogue en plusieurs imports.",
      headerErrors: [],
      rows: [],
      summary: {
        totalRows: 0,
        validRows: 0,
        invalidRows: 0,
      },
    };
  }

  const parsedCsv = parseCsv(csvText);
  if (!parsedCsv.ok) {
    return {
      ok: false,
      format: "csv",
      message: parsedCsv.error,
      headerErrors: [],
      rows: [],
      summary: {
        totalRows: 0,
        validRows: 0,
        invalidRows: 0,
      },
    };
  }

  const [headerRow, ...dataRows] = parsedCsv.rows;

  if (dataRows.length === 0) {
    return {
      ok: false,
      format: "csv",
      message: "Aucune ligne produit trouvee dans le CSV.",
      headerErrors: [],
      rows: [],
      summary: {
        totalRows: 0,
        validRows: 0,
        invalidRows: 0,
      },
    };
  }

  if (dataRows.length > PRODUCT_IMPORT_MAX_ROWS) {
    return {
      ok: false,
      format: "csv",
      message: "Le fichier contient trop de lignes (max 5000 par import).",
      headerErrors: [],
      rows: [],
      summary: {
        totalRows: 0,
        validRows: 0,
        invalidRows: 0,
      },
    };
  }

  const { headerErrors, indexByColumn } = getHeaderIndexMap(headerRow);
  if (headerErrors.length > 0) {
    return {
      ok: false,
      format: "csv",
      message: "Schema CSV invalide. Corrigez les en-tetes puis relancez l'aperçu.",
      headerErrors,
      rows: [],
      summary: {
        totalRows: dataRows.length,
        validRows: 0,
        invalidRows: dataRows.length,
      },
    };
  }

  const workingRows = dataRows.map((dataRow, index) =>
    buildWorkingRow(dataRow, index + 2, indexByColumn),
  );

  const slugOccurrences = new Map<string, number[]>();
  for (const row of workingRows) {
    const slug = row.normalized?.slug;
    if (!slug) {
      continue;
    }
    const rowsForSlug = slugOccurrences.get(slug) ?? [];
    rowsForSlug.push(row.rowNumber);
    slugOccurrences.set(slug, rowsForSlug);
  }

  for (const row of workingRows) {
    const slug = row.normalized?.slug;
    if (!slug) {
      continue;
    }
    const duplicatedRows = slugOccurrences.get(slug) ?? [];
    if (duplicatedRows.length > 1) {
      row.errors.add(`Slug duplique dans le fichier (lignes: ${duplicatedRows.join(", ")}).`);
      row.normalized = null;
    }
  }

  try {
    const slugsToCheck = [...new Set(workingRows.map((row) => row.normalized?.slug).filter(Boolean))];
    const existingSlugs = await getExistingProductSlugs(slugsToCheck as string[]);

    for (const row of workingRows) {
      const slug = row.normalized?.slug;
      if (!slug) {
        continue;
      }
      if (existingSlugs.has(slug)) {
        row.errors.add("Slug deja existant en base.");
        row.normalized = null;
      }
    }
  } catch {
    return {
      ok: false,
      format: "csv",
      message: "Impossible de verifier les slugs existants pour le moment.",
      headerErrors: [],
      rows: [],
      summary: {
        totalRows: dataRows.length,
        validRows: 0,
        invalidRows: dataRows.length,
      },
    };
  }

  const knownCategorySlugs = await getKnownCategorySlugs();
  for (const row of workingRows) {
    const categorySlug = row.normalized?.categorySlug;
    if (!categorySlug) {
      continue;
    }

    if (!knownCategorySlugs.has(categorySlug)) {
      row.warnings.add(
        "Categorie nouvelle detectee: le produit sera importe avec ce category slug.",
      );
    }
  }

  const previewRows = toPreviewRows(workingRows);
  const validRows = previewRows.filter((row) => row.isValid).length;
  const invalidRows = previewRows.length - validRows;

  return {
    ok: true,
    format: "csv",
    message:
      invalidRows > 0
        ? "Apercu genere avec erreurs. Corrigez les lignes invalides avant import."
        : "Apercu valide. Vous pouvez lancer l'import.",
    headerErrors: [],
    rows: previewRows,
    summary: {
      totalRows: previewRows.length,
      validRows,
      invalidRows,
    },
  };
};

const isDuplicateSlugInsertError = (message: string | undefined): boolean => {
  if (!message) {
    return false;
  }
  return message.includes("duplicate key value") || message.includes("products_slug_key");
};

const commitCsvImport = async (csvText: string): Promise<ProductImportCommitResult> => {
  const preview = await buildPreviewFromCsv(csvText);
  if (!preview.ok) {
    return {
      ok: false,
      format: "csv",
      message: preview.message,
      totalRows: preview.summary.totalRows,
      importedCount: 0,
      skippedCount: preview.summary.totalRows,
      failedRows: [],
      invalidRowsBeforeImport: preview.summary.totalRows,
      duplicateRowsDuringInsert: 0,
    };
  }

  const supabaseAdmin = getSupabaseAdminClient();
  if (!supabaseAdmin) {
    return {
      ok: false,
      format: "csv",
      message: "Supabase admin non configure.",
      totalRows: preview.summary.totalRows,
      importedCount: 0,
      skippedCount: preview.summary.totalRows,
      failedRows: [],
      invalidRowsBeforeImport: preview.summary.invalidRows,
      duplicateRowsDuringInsert: 0,
    };
  }

  const validRows = preview.rows.filter((row) => row.isValid && row.normalized !== null);

  let importedCount = 0;
  let duplicateRowsDuringInsert = 0;
  const failedRows: ProductImportFailedRow[] = [];

  for (const row of validRows) {
    const normalizedRow = row.normalized as ProductImportNormalizedRow;
    const { error } = await supabaseAdmin.from("products").insert({
      id: normalizedRow.slug,
      slug: normalizedRow.slug,
      name: normalizedRow.name,
      short_description: shortenDescription(normalizedRow.description),
      description: normalizedRow.description,
      price: roundDhAmount(normalizedRow.price),
      category_slug: normalizedRow.categorySlug,
      stock: normalizedRow.stock,
      rating: DEFAULT_PRODUCT_RATING,
      images: normalizedRow.imageUrls,
      is_active: normalizedRow.isActive,
    });

    if (error) {
      if (isDuplicateSlugInsertError(error.message)) {
        duplicateRowsDuringInsert += 1;
        continue;
      }

      failedRows.push({
        rowNumber: row.rowNumber,
        slug: normalizedRow.slug,
        reason: normalizeDatabaseImportError(error.message),
      });
      continue;
    }

    importedCount += 1;
  }

  const skippedCount =
    preview.summary.invalidRows + duplicateRowsDuringInsert;

  const failedCount = failedRows.length;
  const ok = failedCount === 0;

  return {
    ok,
    format: "csv",
    message: ok
      ? "Import termine avec succes."
      : "Import termine avec des erreurs sur certaines lignes.",
    totalRows: preview.summary.totalRows,
    importedCount,
    skippedCount,
    failedRows,
    invalidRowsBeforeImport: preview.summary.invalidRows,
    duplicateRowsDuringInsert,
  };
};

export const getProductImportCsvTemplate = (): string => {
  return [
    PRODUCT_IMPORT_CSV_COLUMNS.join(","),
    "\"Perceuse Bosch 500W\",\"perceuse-bosch-500w\",\"Perceuse electrique compacte pour bricolage.\",\"799.90\",\"999.90\",\"25\",\"outillage\",\"/images/products/perceuse-bosch.jpg\",\"true\"",
    "\"Peinture Atlas 20KG\",\"peinture-atlas-20kg\",\"Peinture blanche haute couvrance.\",\"235.00\",\"\",\"60\",\"peinture\",\"/images/products/peinture-atlas.jpg\",\"true\"",
  ].join("\n");
};

export const buildProductImportPreview = async (
  format: ProductImportFormat,
  rawPayload: string,
): Promise<ProductImportPreviewResult> => {
  if (format === "json") {
    return {
      ok: false,
      format,
      message: "Le format JSON sera ajoute dans une prochaine iteration. Utilisez CSV pour le moment.",
      headerErrors: [],
      rows: [],
      summary: {
        totalRows: 0,
        validRows: 0,
        invalidRows: 0,
      },
    };
  }

  return buildPreviewFromCsv(rawPayload);
};

export const commitProductImport = async (
  format: ProductImportFormat,
  rawPayload: string,
): Promise<ProductImportCommitResult> => {
  if (format === "json") {
    return {
      ok: false,
      format,
      message: "Le format JSON sera ajoute dans une prochaine iteration. Utilisez CSV pour le moment.",
      totalRows: 0,
      importedCount: 0,
      skippedCount: 0,
      failedRows: [],
      invalidRowsBeforeImport: 0,
      duplicateRowsDuringInsert: 0,
    };
  }

  return commitCsvImport(rawPayload);
};
