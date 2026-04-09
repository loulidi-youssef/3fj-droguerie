import { categories } from "@/data/categories";
import { parseDecimalInput, roundDhAmount } from "@/lib/currency";
import {
  PRODUCT_IMAGE_FALLBACK_SRC,
  normalizeProductImageReferenceForStorage,
} from "@/lib/product-image-variants";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

export const PRODUCT_IMPORT_SUPPORTED_FORMATS = ["csv", "xlsx"] as const;
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

export type ProductImportCsvColumn = (typeof PRODUCT_IMPORT_CSV_COLUMNS)[number];

type ProductImportRawRow = Record<ProductImportCsvColumn, string>;

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
  raw: ProductImportRawRow;
  normalized: ProductImportNormalizedRow | null;
  errors: string[];
  warnings: string[];
  invalidColumns: ProductImportCsvColumn[];
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
  notices: string[];
  skippedEmptyRows: number;
  detectedDelimiter?: "," | ";";
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

export type ProductImportUploadedFile = {
  fileName: string;
  fileBuffer: Buffer;
};

type ParseCsvResult =
  | {
      ok: true;
      rows: string[][];
      delimiter: "," | ";";
    }
  | {
      ok: false;
      error: string;
    };

type ParsedInputRow = {
  rowNumber: number;
  cells: string[];
};

type ParsedProductImportInput = {
  format: ProductImportFormat;
  headerRow: string[];
  dataRows: ParsedInputRow[];
  notices: string[];
  detectedDelimiter?: "," | ";";
};

type WorkingProductImportRow = {
  rowNumber: number;
  raw: ProductImportRawRow;
  normalized: ProductImportNormalizedRow | null;
  errors: Set<string>;
  warnings: Set<string>;
  invalidColumns: Set<ProductImportCsvColumn>;
};

type ProductImportTemplateRow = Record<ProductImportCsvColumn, string>;

type BuildWorkingRowResult = {
  workingRow: WorkingProductImportRow;
  usesOldPrice: boolean;
};

const REQUIRED_PRODUCT_IMPORT_COLUMNS = new Set<ProductImportCsvColumn>(
  PRODUCT_IMPORT_CSV_COLUMNS,
);

const PRODUCT_IMPORT_MAX_FILE_SIZE_BYTES = 8_000_000;
const PRODUCT_IMPORT_MAX_ROWS = 5_000;
const DEFAULT_PRODUCT_RATING = 4.5;
const PRODUCT_IMPORT_EXCEL_SHEET_NAME = "Produits";
const PRODUCT_IMPORT_EXCEL_INSTRUCTIONS_SHEET_NAME = "Instructions";
const PRODUCT_IMPORT_TEMPLATE_CATEGORIES = [
  "outillage",
  "peinture",
  "electricite",
  "construction",
] as const;

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

const stripUtf8Bom = (value: string): string => value.replace(/^\uFEFF/, "");

const normalizeCellValue = (rawValue: string | undefined): string => {
  return typeof rawValue === "string" ? rawValue.trim() : "";
};

const normalizeHeaderValue = (headerValue: string): string => {
  return stripUtf8Bom(normalizeCellValue(headerValue)).toLowerCase();
};

const normalizeSlugValue = (rawValue: string): string => {
  return normalizeCellValue(rawValue).toLowerCase();
};

const parseBooleanCellValue = (rawValue: string): boolean | null => {
  const normalized = normalizeCellValue(rawValue).toLowerCase();
  if (!normalized) {
    return true;
  }

  if (
    ["true", "1", "yes", "oui", "on", "active", "actif", "vrai"].includes(
      normalized,
    )
  ) {
    return true;
  }

  if (
    ["false", "0", "no", "non", "off", "inactive", "inactif", "faux"].includes(
      normalized,
    )
  ) {
    return false;
  }

  return null;
};

const parseImageReferencesCell = (
  rawValue: string,
): {
  validReferences: string[];
  invalidReferences: string[];
} => {
  const rawReferences = rawValue
    .split("|")
    .map((value) => value.trim())
    .filter(Boolean);

  const validReferences: string[] = [];
  const invalidReferences: string[] = [];

  for (const rawReference of rawReferences) {
    const normalizedReference = normalizeProductImageReferenceForStorage(rawReference);
    if (!normalizedReference) {
      invalidReferences.push(rawReference);
      continue;
    }

    validReferences.push(normalizedReference);
  }

  return { validReferences, invalidReferences };
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

const detectCsvDelimiter = (rawCsvText: string): "," | ";" => {
  const lines = rawCsvText.split(/\r?\n/);

  for (const line of lines) {
    const trimmedLine = line.trim();
    if (!trimmedLine) {
      continue;
    }

    const semicolonCount = (trimmedLine.match(/;/g) ?? []).length;
    const commaCount = (trimmedLine.match(/,/g) ?? []).length;
    return semicolonCount > commaCount ? ";" : ",";
  }

  return ",";
};

const parseCsv = (rawCsvText: string): ParseCsvResult => {
  const csvText = stripUtf8Bom(rawCsvText);
  const delimiter = detectCsvDelimiter(csvText);
  const rows: string[][] = [];
  let currentField = "";
  let currentRow: string[] = [];
  let insideQuotes = false;

  for (let index = 0; index < csvText.length; index += 1) {
    const char = csvText[index];

    if (insideQuotes) {
      if (char === '"') {
        const nextChar = csvText[index + 1];
        if (nextChar === '"') {
          currentField += '"';
          index += 1;
          continue;
        }
        insideQuotes = false;
        continue;
      }

      currentField += char;
      continue;
    }

    if (char === '"') {
      insideQuotes = true;
      continue;
    }

    if (char === delimiter) {
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
  rows.push(currentRow);

  if (rows.length === 0) {
    return {
      ok: false,
      error: "Le fichier CSV est vide.",
    };
  }

  return {
    ok: true,
    rows,
    delimiter,
  };
};

const getHeaderIndexMap = (
  headerRow: string[],
): {
  headerErrors: string[];
  indexByColumn: Map<ProductImportCsvColumn, number>;
} => {
  const normalizedHeaderToIndex = new Map<string, number>();
  const headerErrors: string[] = [];

  for (const [index, headerCell] of headerRow.entries()) {
    const normalizedHeader = normalizeHeaderValue(headerCell);
    if (!normalizedHeader) {
      continue;
    }

    if (normalizedHeaderToIndex.has(normalizedHeader)) {
      if (REQUIRED_PRODUCT_IMPORT_COLUMNS.has(normalizedHeader as ProductImportCsvColumn)) {
        headerErrors.push(`Colonne dupliquee: ${normalizedHeader}`);
      }
      continue;
    }

    normalizedHeaderToIndex.set(normalizedHeader, index);
  }

  const indexByColumn = new Map<ProductImportCsvColumn, number>();

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

const readRawRowByColumn = (
  cells: string[],
  indexByColumn: Map<ProductImportCsvColumn, number>,
): ProductImportRawRow => {
  const readCell = (column: ProductImportCsvColumn): string => {
    const index = indexByColumn.get(column);
    if (typeof index !== "number") {
      return "";
    }
    return normalizeCellValue(cells[index]);
  };

  return {
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
};

const isRawRowEmpty = (raw: ProductImportRawRow): boolean => {
  return PRODUCT_IMPORT_CSV_COLUMNS.every((column) => normalizeCellValue(raw[column]).length === 0);
};

const createWorkingRowScaffold = (
  rowNumber: number,
  raw: ProductImportRawRow,
): WorkingProductImportRow => ({
  rowNumber,
  raw,
  normalized: null,
  errors: new Set<string>(),
  warnings: new Set<string>(),
  invalidColumns: new Set<ProductImportCsvColumn>(),
});

const addRowError = (
  row: WorkingProductImportRow,
  error: string,
  invalidColumn?: ProductImportCsvColumn,
): void => {
  row.errors.add(error);
  if (invalidColumn) {
    row.invalidColumns.add(invalidColumn);
  }
};

const buildWorkingRow = (
  raw: ProductImportRawRow,
  rowNumber: number,
): BuildWorkingRowResult => {
  const row = createWorkingRowScaffold(rowNumber, raw);

  const name = normalizeCellValue(raw.name);
  if (!name) {
    addRowError(row, "Nom manquant.", "name");
  }

  const slug = normalizeSlugValue(raw.slug);
  if (!slug) {
    addRowError(row, "Slug manquant.", "slug");
  } else if (!SLUG_PATTERN.test(slug)) {
    addRowError(row, "Slug invalide (minuscules, chiffres, tirets).", "slug");
  }

  const description = normalizeCellValue(raw.description);
  if (!description) {
    addRowError(row, "Description manquante.", "description");
  }

  const priceValue = parseDecimalInput(raw.price);
  if (!Number.isFinite(priceValue) || priceValue <= 0) {
    addRowError(row, "Prix invalide.", "price");
  }
  const normalizedPrice = roundDhAmount(priceValue);

  let oldPrice: number | null = null;
  const hasOldPriceValue = normalizeCellValue(raw.old_price).length > 0;
  if (hasOldPriceValue) {
    const oldPriceValue = parseDecimalInput(raw.old_price);
    if (!Number.isFinite(oldPriceValue) || oldPriceValue <= 0) {
      addRowError(row, "old_price invalide.", "old_price");
    } else {
      oldPrice = roundDhAmount(oldPriceValue);
      if (Number.isFinite(normalizedPrice) && oldPrice <= normalizedPrice) {
        addRowError(row, "old_price doit etre superieur au prix.", "old_price");
      }
    }
  }

  const stockValue = parseDecimalInput(raw.stock);
  if (
    !Number.isFinite(stockValue) ||
    stockValue < 0 ||
    Math.trunc(stockValue) !== stockValue
  ) {
    addRowError(row, "Stock invalide.", "stock");
  }
  const normalizedStock = Number.isFinite(stockValue) ? Math.trunc(stockValue) : 0;

  const categorySlug = normalizeSlugValue(raw.category);
  if (!categorySlug) {
    addRowError(row, "Categorie manquante.", "category");
  } else if (!SLUG_PATTERN.test(categorySlug)) {
    addRowError(
      row,
      "Categorie invalide (utilisez minuscules, chiffres et tirets).",
      "category",
    );
  }

  const imageReferences = parseImageReferencesCell(raw.image_url);
  let imageUrls = imageReferences.validReferences;

  if (imageUrls.length === 0) {
    imageUrls = [PRODUCT_IMAGE_FALLBACK_SRC];
    if (imageReferences.invalidReferences.length > 0) {
      row.warnings.add("Reference image invalide, image par defaut utilisee.");
    } else {
      row.warnings.add("Aucune image fournie, image par defaut utilisee.");
    }
  }

  if (imageReferences.invalidReferences.length > 0) {
    row.warnings.add("Certaines references image sont invalides et ont ete ignorees.");
    if (imageReferences.validReferences.length === 0) {
      row.warnings.add(`Image par defaut utilisee: ${PRODUCT_IMAGE_FALLBACK_SRC}`);
    }
  }

  const isActive = parseBooleanCellValue(raw.is_active);
  if (isActive === null) {
    addRowError(row, "is_active doit etre true ou false.", "is_active");
  }

  if (row.errors.size === 0) {
    row.normalized = {
      name,
      slug,
      description,
      price: normalizedPrice,
      oldPrice,
      stock: normalizedStock,
      categorySlug,
      imageUrls,
      isActive: isActive ?? true,
    };
  }

  return {
    workingRow: row,
    usesOldPrice: hasOldPriceValue,
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
      const slug = normalizeSlugValue(String((entry as { slug?: string }).slug ?? ""));
      if (slug) {
        existingSlugs.add(slug);
      }
    }
  }

  return existingSlugs;
};

const getKnownCategorySlugs = async (): Promise<Set<string>> => {
  const categorySlugs = new Set<string>(
    categories.map((category) => normalizeSlugValue(category.slug)).filter(Boolean),
  );

  const supabaseAdmin = getSupabaseAdminClient();
  if (!supabaseAdmin) {
    return categorySlugs;
  }

  const { data } = await supabaseAdmin.from("products").select("category_slug");
  for (const entry of data ?? []) {
    const categorySlug = normalizeSlugValue(
      String((entry as { category_slug?: string }).category_slug ?? ""),
    );
    if (categorySlug) {
      categorySlugs.add(categorySlug);
    }
  }

  return categorySlugs;
};

const toPreviewRows = (rows: WorkingProductImportRow[]): ProductImportRowOutput[] => {
  const orderedColumns = new Map<ProductImportCsvColumn, number>(
    PRODUCT_IMPORT_CSV_COLUMNS.map((column, index) => [column, index]),
  );

  return rows.map((row) => ({
    rowNumber: row.rowNumber,
    raw: row.raw,
    normalized: row.normalized,
    errors: [...row.errors],
    warnings: [...row.warnings],
    invalidColumns: [...row.invalidColumns].sort(
      (left, right) => (orderedColumns.get(left) ?? 0) - (orderedColumns.get(right) ?? 0),
    ),
    isValid: row.errors.size === 0 && row.normalized !== null,
  }));
};

const parseCsvInput = (
  fileBuffer: Buffer,
):
  | {
      ok: true;
      parsed: ParsedProductImportInput;
    }
  | {
      ok: false;
      error: string;
    } => {
  const rawCsvText = fileBuffer.toString("utf8");
  if (!rawCsvText.trim()) {
    return {
      ok: false,
      error: "Le fichier CSV est vide.",
    };
  }

  const parsedCsv = parseCsv(rawCsvText);
  if (!parsedCsv.ok) {
    return {
      ok: false,
      error: parsedCsv.error,
    };
  }

  const [headerRow = [], ...dataRows] = parsedCsv.rows;
  const normalizedHeaderRow = headerRow.map((cell) => normalizeCellValue(cell));
  if (normalizedHeaderRow.length > 0) {
    normalizedHeaderRow[0] = stripUtf8Bom(normalizedHeaderRow[0]);
  }

  const normalizedDataRows: ParsedInputRow[] = dataRows.map((row, index) => ({
    rowNumber: index + 2,
    cells: row.map((cell) => normalizeCellValue(cell)),
  }));

  const notices: string[] = [];
  if (parsedCsv.delimiter === ";") {
    notices.push("Le fichier semble utiliser ';' comme separateur. Il a ete detecte automatiquement.");
  }

  return {
    ok: true,
    parsed: {
      format: "csv",
      headerRow: normalizedHeaderRow,
      dataRows: normalizedDataRows,
      notices,
      detectedDelimiter: parsedCsv.delimiter,
    },
  };
};

const parseXlsxInput = async (
  fileBuffer: Buffer,
): Promise<
  | {
      ok: true;
      parsed: ParsedProductImportInput;
    }
  | {
      ok: false;
      error: string;
    }
> => {
  let workbook: import("exceljs").Workbook;

  try {
    const ExcelJS = await import("exceljs");
    workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(fileBuffer);
  } catch {
    return {
      ok: false,
      error: "Impossible de lire ce fichier Excel (.xlsx).",
    };
  }

  const worksheet = workbook.worksheets[0];
  if (!worksheet) {
    return {
      ok: false,
      error: "Le fichier Excel ne contient aucune feuille.",
    };
  }

  const headerWorksheetRow = worksheet.getRow(1);
  const headerColumnCount = Math.max(
    PRODUCT_IMPORT_CSV_COLUMNS.length,
    headerWorksheetRow.cellCount,
    headerWorksheetRow.actualCellCount,
  );

  const headerRow: string[] = [];
  for (let columnNumber = 1; columnNumber <= headerColumnCount; columnNumber += 1) {
    headerRow.push(normalizeCellValue(headerWorksheetRow.getCell(columnNumber).text));
  }

  if (headerRow.length > 0) {
    headerRow[0] = stripUtf8Bom(headerRow[0]);
  }

  const dataRows: ParsedInputRow[] = [];
  worksheet.eachRow({ includeEmpty: false }, (row: import("exceljs").Row, rowNumber: number) => {
    if (rowNumber === 1) {
      return;
    }

    const cells: string[] = [];
    for (let columnNumber = 1; columnNumber <= headerColumnCount; columnNumber += 1) {
      cells.push(normalizeCellValue(row.getCell(columnNumber).text));
    }

    dataRows.push({
      rowNumber,
      cells,
    });
  });

  return {
    ok: true,
    parsed: {
      format: "xlsx",
      headerRow,
      dataRows,
      notices: [
        `Fichier Excel detecte: feuille utilisee \"${worksheet.name}\" (premiere feuille).`,
      ],
    },
  };
};

const parseProductImportInput = async (
  file: ProductImportUploadedFile,
): Promise<
  | {
      ok: true;
      parsed: ParsedProductImportInput;
    }
  | {
      ok: false;
      format: ProductImportFormat;
      error: string;
    }
> => {
  const format = getProductImportFormatFromFileName(file.fileName);
  if (!format) {
    return {
      ok: false,
      format: "csv",
      error: "Format non supporte. Utilisez un fichier .csv ou .xlsx.",
    };
  }

  if (file.fileBuffer.length === 0) {
    return {
      ok: false,
      format,
      error: "Le fichier est vide.",
    };
  }

  if (file.fileBuffer.length > PRODUCT_IMPORT_MAX_FILE_SIZE_BYTES) {
    return {
      ok: false,
      format,
      error: "Le fichier depasse la limite de 8 MB.",
    };
  }

  if (format === "xlsx") {
    const parsedExcel = await parseXlsxInput(file.fileBuffer);
    if (!parsedExcel.ok) {
      return {
        ok: false,
        format,
        error: parsedExcel.error,
      };
    }

    return {
      ok: true,
      parsed: parsedExcel.parsed,
    };
  }

  const parsedCsv = parseCsvInput(file.fileBuffer);
  if (!parsedCsv.ok) {
    return {
      ok: false,
      format,
      error: parsedCsv.error,
    };
  }

  return {
    ok: true,
    parsed: parsedCsv.parsed,
  };
};

const buildPreviewFromParsedInput = async (
  parsedInput: ParsedProductImportInput,
): Promise<ProductImportPreviewResult> => {
  const { headerErrors, indexByColumn } = getHeaderIndexMap(parsedInput.headerRow);
  if (headerErrors.length > 0) {
    return {
      ok: false,
      format: parsedInput.format,
      message: "Schema invalide: verifiez les en-tetes du fichier.",
      headerErrors,
      rows: [],
      notices: parsedInput.notices,
      skippedEmptyRows: 0,
      detectedDelimiter: parsedInput.detectedDelimiter,
      summary: {
        totalRows: 0,
        validRows: 0,
        invalidRows: 0,
      },
    };
  }

  if (parsedInput.dataRows.length === 0) {
    return {
      ok: false,
      format: parsedInput.format,
      message: "Aucune ligne produit detectee.",
      headerErrors: [],
      rows: [],
      notices: parsedInput.notices,
      skippedEmptyRows: 0,
      detectedDelimiter: parsedInput.detectedDelimiter,
      summary: {
        totalRows: 0,
        validRows: 0,
        invalidRows: 0,
      },
    };
  }

  const workingRows: WorkingProductImportRow[] = [];
  let skippedEmptyRows = 0;
  let foundOldPriceValue = false;

  for (const row of parsedInput.dataRows) {
    const raw = readRawRowByColumn(row.cells, indexByColumn);
    if (isRawRowEmpty(raw)) {
      skippedEmptyRows += 1;
      continue;
    }

    const working = buildWorkingRow(raw, row.rowNumber);
    if (working.usesOldPrice) {
      foundOldPriceValue = true;
    }

    workingRows.push(working.workingRow);
  }

  if (workingRows.length === 0) {
    const notices = [...parsedInput.notices];
    if (skippedEmptyRows > 0) {
      notices.push(`${skippedEmptyRows} ligne(s) vide(s) ignoree(s).`);
    }

    return {
      ok: false,
      format: parsedInput.format,
      message: "Aucune ligne produit utile detectee (lignes vides ignorees).",
      headerErrors: [],
      rows: [],
      notices,
      skippedEmptyRows,
      detectedDelimiter: parsedInput.detectedDelimiter,
      summary: {
        totalRows: 0,
        validRows: 0,
        invalidRows: 0,
      },
    };
  }

  if (workingRows.length > PRODUCT_IMPORT_MAX_ROWS) {
    return {
      ok: false,
      format: parsedInput.format,
      message: "Le fichier contient trop de lignes (max 5000 lignes utiles par import).",
      headerErrors: [],
      rows: [],
      notices: parsedInput.notices,
      skippedEmptyRows,
      detectedDelimiter: parsedInput.detectedDelimiter,
      summary: {
        totalRows: workingRows.length,
        validRows: 0,
        invalidRows: workingRows.length,
      },
    };
  }

  const slugOccurrences = new Map<string, number[]>();
  for (const row of workingRows) {
    const slug = row.normalized?.slug;
    if (!slug) {
      continue;
    }

    const occurrences = slugOccurrences.get(slug) ?? [];
    occurrences.push(row.rowNumber);
    slugOccurrences.set(slug, occurrences);
  }

  for (const row of workingRows) {
    const slug = row.normalized?.slug;
    if (!slug) {
      continue;
    }

    const duplicateRows = slugOccurrences.get(slug) ?? [];
    if (duplicateRows.length > 1) {
      addRowError(
        row,
        `Slug duplique dans le fichier (lignes: ${duplicateRows.join(", ")}).`,
        "slug",
      );
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
        addRowError(row, "Slug deja existant en base.", "slug");
        row.normalized = null;
      }
    }
  } catch {
    return {
      ok: false,
      format: parsedInput.format,
      message: "Impossible de verifier les slugs existants pour le moment.",
      headerErrors: [],
      rows: [],
      notices: parsedInput.notices,
      skippedEmptyRows,
      detectedDelimiter: parsedInput.detectedDelimiter,
      summary: {
        totalRows: workingRows.length,
        validRows: 0,
        invalidRows: workingRows.length,
      },
    };
  }

  try {
    const knownCategorySlugs = await getKnownCategorySlugs();
    for (const row of workingRows) {
      const categorySlug = row.normalized?.categorySlug;
      if (!categorySlug) {
        continue;
      }

      if (!knownCategorySlugs.has(categorySlug)) {
        row.warnings.add(
          "Categorie nouvelle detectee: le produit sera importe avec cette categorie.",
        );
      }
    }
  } catch {
    // Non bloquant: on garde l'import possible meme si les warnings categories ne peuvent pas etre enrichis.
  }

  const notices = [...parsedInput.notices];
  if (skippedEmptyRows > 0) {
    notices.push(`${skippedEmptyRows} ligne(s) vide(s) ignoree(s).`);
  }
  if (foundOldPriceValue) {
    notices.push("La colonne old_price est validee mais n'est pas encore enregistree dans la base.");
  }

  const previewRows = toPreviewRows(workingRows);
  const validRows = previewRows.filter((row) => row.isValid).length;
  const invalidRows = previewRows.length - validRows;

  return {
    ok: true,
    format: parsedInput.format,
    message:
      invalidRows > 0
        ? "Apercu genere: corrigez les lignes en erreur avant import."
        : "Apercu valide: vous pouvez lancer l'import securise.",
    headerErrors: [],
    rows: previewRows,
    notices,
    skippedEmptyRows,
    detectedDelimiter: parsedInput.detectedDelimiter,
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

const commitPreviewRows = async (
  preview: ProductImportPreviewResult,
): Promise<ProductImportCommitResult> => {
  const supabaseAdmin = getSupabaseAdminClient();
  if (!supabaseAdmin) {
    return {
      ok: false,
      format: preview.format,
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

  const skippedCount = preview.summary.invalidRows + duplicateRowsDuringInsert;

  return {
    ok: failedRows.length === 0,
    format: preview.format,
    message:
      failedRows.length === 0
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

export const getProductImportFormatFromFileName = (
  fileName: string,
): ProductImportFormat | null => {
  const normalized = fileName.trim().toLowerCase();
  if (normalized.endsWith(".csv")) {
    return "csv";
  }

  if (normalized.endsWith(".xlsx")) {
    return "xlsx";
  }

  return null;
};

export const buildProductImportPreviewFromFile = async (
  file: ProductImportUploadedFile,
): Promise<ProductImportPreviewResult> => {
  const parsedInput = await parseProductImportInput(file);
  if (!parsedInput.ok) {
    return {
      ok: false,
      format: parsedInput.format,
      message: parsedInput.error,
      headerErrors: [],
      rows: [],
      notices: [],
      skippedEmptyRows: 0,
      summary: {
        totalRows: 0,
        validRows: 0,
        invalidRows: 0,
      },
    };
  }

  return buildPreviewFromParsedInput(parsedInput.parsed);
};

export const commitProductImportFromFile = async (
  file: ProductImportUploadedFile,
): Promise<ProductImportCommitResult> => {
  const preview = await buildProductImportPreviewFromFile(file);
  if (!preview.ok) {
    return {
      ok: false,
      format: preview.format,
      message: preview.message,
      totalRows: preview.summary.totalRows,
      importedCount: 0,
      skippedCount: preview.summary.totalRows,
      failedRows: [],
      invalidRowsBeforeImport: preview.summary.totalRows,
      duplicateRowsDuringInsert: 0,
    };
  }

  if (preview.summary.validRows === 0) {
    return {
      ok: false,
      format: preview.format,
      message: "Aucune ligne valide a importer.",
      totalRows: preview.summary.totalRows,
      importedCount: 0,
      skippedCount: preview.summary.totalRows,
      failedRows: [],
      invalidRowsBeforeImport: preview.summary.invalidRows,
      duplicateRowsDuringInsert: 0,
    };
  }

  return commitPreviewRows(preview);
};

export const getProductImportCsvTemplate = (): string => {
  const escapeCsvCell = (value: string): string => {
    if (!/[",\n\r]/.test(value)) {
      return value;
    }
    return `"${value.replace(/"/g, "\"\"")}"`;
  };

  const templateRows: ProductImportTemplateRow[] = [
    {
      name: "Perceuse Bosch 500W",
      slug: "perceuse-bosch-500w",
      description: "Perceuse electrique compacte pour bricolage.",
      price: "799.90",
      old_price: "999.90",
      stock: "25",
      category: "outillage",
      image_url: "outillage/perceuse-bosch-500w.jpg",
      is_active: "true",
    },
    {
      name: "Peinture Atlas 20KG",
      slug: "peinture-atlas-20kg",
      description: "Peinture blanche haute couvrance.",
      price: "235.00",
      old_price: "",
      stock: "60",
      category: "peinture",
      image_url: "peinture/peinture-atlas-20kg.jpg",
      is_active: "true",
    },
  ];

  const headerLine = PRODUCT_IMPORT_CSV_COLUMNS.join(",");
  const rowLines = templateRows.map((row) =>
    PRODUCT_IMPORT_CSV_COLUMNS.map((column) => escapeCsvCell(row[column])).join(","),
  );

  return `\uFEFF${[headerLine, ...rowLines].join("\n")}`;
};

export const getProductImportExcelTemplateBuffer = async (): Promise<Buffer> => {
  const ExcelJS = await import("exceljs");
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "3FJ Admin";
  workbook.created = new Date();
  workbook.modified = new Date();

  const sampleRows: ProductImportTemplateRow[] = [
    {
      name: "Perceuse Bosch 500W",
      slug: "perceuse-bosch-500w",
      description: "Perceuse electrique compacte pour bricolage.",
      price: "799.90",
      old_price: "999.90",
      stock: "25",
      category: "outillage",
      image_url: "outillage/perceuse-bosch-500w.jpg",
      is_active: "true",
    },
    {
      name: "Peinture Atlas 20KG",
      slug: "peinture-atlas-20kg",
      description: "Peinture blanche haute couvrance.",
      price: "235.00",
      old_price: "",
      stock: "60",
      category: "peinture",
      image_url: "peinture/peinture-atlas-20kg.jpg",
      is_active: "true",
    },
  ];

  const productsSheet = workbook.addWorksheet(PRODUCT_IMPORT_EXCEL_SHEET_NAME, {
    views: [{ state: "frozen", ySplit: 1 }],
  });

  productsSheet.columns = PRODUCT_IMPORT_CSV_COLUMNS.map((column) => ({
    header: column,
    key: column,
    width: 18,
  }));

  for (const row of sampleRows) {
    const worksheetRow = productsSheet.addRow({
      ...row,
      price: Number.parseFloat(row.price),
      old_price: row.old_price ? Number.parseFloat(row.old_price) : "",
      stock: Number.parseInt(row.stock, 10),
    });
    worksheetRow.height = 20;
  }

  const headerRow = productsSheet.getRow(1);
  headerRow.height = 22;
  for (let columnNumber = 1; columnNumber <= PRODUCT_IMPORT_CSV_COLUMNS.length; columnNumber += 1) {
    const cell = headerRow.getCell(columnNumber);
    cell.font = { bold: true, color: { argb: "FF0F2A4D" } };
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFDCEBFF" },
    };
    cell.alignment = { vertical: "middle", horizontal: "left" };
    cell.border = {
      top: { style: "thin", color: { argb: "FFB6C8E6" } },
      left: { style: "thin", color: { argb: "FFB6C8E6" } },
      bottom: { style: "thin", color: { argb: "FFB6C8E6" } },
      right: { style: "thin", color: { argb: "FFB6C8E6" } },
    };
  }

  const borderColor = { argb: "FFE2E8F0" };
  for (let rowNumber = 2; rowNumber <= 120; rowNumber += 1) {
    const row = productsSheet.getRow(rowNumber);
    for (let columnNumber = 1; columnNumber <= PRODUCT_IMPORT_CSV_COLUMNS.length; columnNumber += 1) {
      const cell = row.getCell(columnNumber);
      cell.border = {
        top: { style: "thin", color: borderColor },
        left: { style: "thin", color: borderColor },
        bottom: { style: "thin", color: borderColor },
        right: { style: "thin", color: borderColor },
      };
    }
  }

  const categoryValidationFormula = `"${PRODUCT_IMPORT_TEMPLATE_CATEGORIES.join(",")}"`;
  for (let rowNumber = 2; rowNumber <= 500; rowNumber += 1) {
    productsSheet.getCell(`I${rowNumber}`).dataValidation = {
      type: "list",
      allowBlank: true,
      formulae: ['"true,false"'],
      showErrorMessage: true,
      errorTitle: "Valeur invalide",
      error: "is_active doit etre true ou false.",
    };
    productsSheet.getCell(`G${rowNumber}`).dataValidation = {
      type: "list",
      allowBlank: true,
      formulae: [categoryValidationFormula],
      showErrorMessage: true,
      errorTitle: "Categorie invalide",
      error: "Selectionnez une categorie de la liste.",
    };
  }

  productsSheet.addConditionalFormatting({
    ref: "F2:F500",
    rules: [
      {
        type: "cellIs",
        operator: "equal",
        formulae: ["0"],
        priority: 1,
        style: {
          fill: {
            type: "pattern",
            pattern: "solid",
            bgColor: { argb: "FFFEE2E2" },
            fgColor: { argb: "FFFEE2E2" },
          },
          font: { color: { argb: "FFB91C1C" }, bold: true },
        },
      },
      {
        type: "cellIs",
        operator: "lessThan",
        formulae: ["10"],
        priority: 2,
        style: {
          fill: {
            type: "pattern",
            pattern: "solid",
            bgColor: { argb: "FFFFEDD5" },
            fgColor: { argb: "FFFFEDD5" },
          },
          font: { color: { argb: "FF9A3412" }, bold: true },
        },
      },
    ],
  });

  for (const [columnIndex, column] of PRODUCT_IMPORT_CSV_COLUMNS.entries()) {
    const textValues = [column, ...sampleRows.map((row) => row[column])];
    const maxLength = textValues.reduce((currentMax, value) => {
      return Math.max(currentMax, value.length);
    }, 10);
    productsSheet.getColumn(columnIndex + 1).width = Math.min(46, Math.max(13, maxLength + 3));
  }

  productsSheet.getColumn("D").numFmt = "0.00";
  productsSheet.getColumn("E").numFmt = "0.00";
  productsSheet.getColumn("F").numFmt = "0";

  const instructionsSheet = workbook.addWorksheet(PRODUCT_IMPORT_EXCEL_INSTRUCTIONS_SHEET_NAME);
  instructionsSheet.columns = [
    { header: "colonne", key: "column", width: 20 },
    { header: "description", key: "description", width: 38 },
    { header: "format", key: "format", width: 34 },
    { header: "exemple", key: "example", width: 30 },
  ];

  const instructions = [
    {
      column: "name",
      description: "Nom du produit",
      format: "Texte requis",
      example: "Perceuse Bosch 500W",
    },
    {
      column: "slug",
      description: "Identifiant unique en minuscules avec tirets",
      format: "lettres/chiffres/tirets",
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
      description: "Prix actuel du produit",
      format: "Nombre decimal > 0",
      example: "799.90",
    },
    {
      column: "old_price",
      description: "Ancien prix optionnel",
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
      description: "Categorie principale",
      format: "outillage/peinture/electricite/construction",
      example: "outillage",
    },
    {
      column: "image_url",
      description: "Chemin Supabase Storage relatif, URL https:// ou vide",
      format: "Ex: outillage/perceuse-bosch-500w.jpg",
      example: "outillage/perceuse-bosch-500w.jpg",
    },
    {
      column: "is_active",
      description: "Produit visible sur le site",
      format: "true ou false",
      example: "true",
    },
  ];

  for (const instruction of instructions) {
    instructionsSheet.addRow(instruction);
  }

  const instructionsHeaderRow = instructionsSheet.getRow(1);
  for (let columnNumber = 1; columnNumber <= 4; columnNumber += 1) {
    const cell = instructionsHeaderRow.getCell(columnNumber);
    cell.font = { bold: true, color: { argb: "FF0F2A4D" } };
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFDCEBFF" },
    };
    cell.border = {
      top: { style: "thin", color: { argb: "FFB6C8E6" } },
      left: { style: "thin", color: { argb: "FFB6C8E6" } },
      bottom: { style: "thin", color: { argb: "FFB6C8E6" } },
      right: { style: "thin", color: { argb: "FFB6C8E6" } },
    };
  }

  for (let rowNumber = 2; rowNumber <= instructions.length + 1; rowNumber += 1) {
    const row = instructionsSheet.getRow(rowNumber);
    for (let columnNumber = 1; columnNumber <= 4; columnNumber += 1) {
      const cell = row.getCell(columnNumber);
      cell.border = {
        top: { style: "thin", color: borderColor },
        left: { style: "thin", color: borderColor },
        bottom: { style: "thin", color: borderColor },
        right: { style: "thin", color: borderColor },
      };
      cell.alignment = { vertical: "top", wrapText: true };
    }
  }

  const rawBuffer = await workbook.xlsx.writeBuffer();
  if (Buffer.isBuffer(rawBuffer)) {
    return rawBuffer;
  }

  return Buffer.from(rawBuffer);
};
