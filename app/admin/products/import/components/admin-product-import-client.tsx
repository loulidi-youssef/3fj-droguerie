"use client";

import { useMemo, useState } from "react";

type ImportPreviewRow = {
  rowNumber: number;
  raw: {
    name: string;
    slug: string;
    description: string;
    price: string;
    old_price: string;
    stock: string;
    category: string;
    image_url: string;
    is_active: string;
  };
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
  isValid: boolean;
};

type ImportPreviewResponse = {
  ok: boolean;
  format: "csv" | "json";
  message: string;
  summary: {
    totalRows: number;
    validRows: number;
    invalidRows: number;
  };
  headerErrors: string[];
  rows: ImportPreviewRow[];
};

type ImportCommitFailedRow = {
  rowNumber: number;
  slug: string;
  reason: string;
};

type ImportCommitResponse = {
  ok: boolean;
  format: "csv" | "json";
  message: string;
  totalRows: number;
  importedCount: number;
  skippedCount: number;
  failedRows: ImportCommitFailedRow[];
  invalidRowsBeforeImport: number;
  duplicateRowsDuringInsert: number;
};

const requiredColumns = [
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

type ProductImportColumn = (typeof requiredColumns)[number];

type PreviewColumn = {
  key: ProductImportColumn;
  label: string;
};

const previewColumns: PreviewColumn[] = requiredColumns.map((column) => ({
  key: column,
  label: column,
}));

const columnHelpRows: Array<{
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
    description: "Description du produit",
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

const readErrorFromResponse = async (response: Response): Promise<string> => {
  try {
    const data = (await response.json()) as { error?: string };
    if (typeof data.error === "string" && data.error.trim()) {
      return data.error;
    }
  } catch {
    // no-op
  }

  return "Operation impossible pour le moment.";
};

const inferErrorColumns = (row: ImportPreviewRow): Set<ProductImportColumn> => {
  const problematicColumns = new Set<ProductImportColumn>();
  for (const error of row.errors) {
    const normalizedError = error.toLowerCase();

    if (normalizedError.includes("nom")) {
      problematicColumns.add("name");
    }
    if (normalizedError.includes("slug")) {
      problematicColumns.add("slug");
    }
    if (normalizedError.includes("description")) {
      problematicColumns.add("description");
    }
    if (normalizedError.includes("old_price")) {
      problematicColumns.add("old_price");
    }
    if (normalizedError.includes("prix")) {
      problematicColumns.add("price");
    }
    if (normalizedError.includes("stock")) {
      problematicColumns.add("stock");
    }
    if (normalizedError.includes("categorie")) {
      problematicColumns.add("category");
    }
    if (normalizedError.includes("image_url")) {
      problematicColumns.add("image_url");
    }
    if (normalizedError.includes("is_active")) {
      problematicColumns.add("is_active");
    }
  }

  return problematicColumns;
};

const toFriendlyRowError = (error: string, row: ImportPreviewRow): string => {
  const normalizedError = error.toLowerCase();

  if (normalizedError.startsWith("prix invalide")) {
    return !row.raw.price.trim() ? "Prix manquant." : "Prix invalide.";
  }

  if (normalizedError.startsWith("stock invalide")) {
    return !row.raw.stock.trim() ? "Stock manquant." : "Stock invalide.";
  }

  if (normalizedError.startsWith("nom requis")) {
    return "Nom manquant.";
  }

  if (normalizedError.startsWith("description requise")) {
    return "Description manquante.";
  }

  if (normalizedError.startsWith("categorie requise")) {
    return "Categorie manquante.";
  }

  if (normalizedError.startsWith("image_url requis")) {
    return "Image manquante (image_url requis).";
  }

  if (normalizedError.startsWith("is_active invalide")) {
    return "is_active invalide (true/false).";
  }

  return error;
};

const getPreviewCellText = (
  row: ImportPreviewRow,
  column: ProductImportColumn,
): string => {
  if (column === "name") {
    return row.normalized?.name ?? row.raw.name ?? "";
  }

  if (column === "slug") {
    return row.normalized?.slug ?? row.raw.slug ?? "";
  }

  if (column === "description") {
    return row.normalized?.description ?? row.raw.description ?? "";
  }

  if (column === "price") {
    if (typeof row.normalized?.price === "number") {
      return row.normalized.price.toFixed(2);
    }
    return row.raw.price ?? "";
  }

  if (column === "old_price") {
    if (typeof row.normalized?.oldPrice === "number") {
      return row.normalized.oldPrice.toFixed(2);
    }
    return row.raw.old_price ?? "";
  }

  if (column === "stock") {
    if (typeof row.normalized?.stock === "number") {
      return String(row.normalized.stock);
    }
    return row.raw.stock ?? "";
  }

  if (column === "category") {
    return row.normalized?.categorySlug ?? row.raw.category ?? "";
  }

  if (column === "image_url") {
    return row.raw.image_url ?? "";
  }

  if (row.normalized) {
    return row.normalized.isActive ? "true" : "false";
  }
  return row.raw.is_active ?? "";
};

export const AdminProductImportClient = () => {
  const [csvPayload, setCsvPayload] = useState("");
  const [selectedFileName, setSelectedFileName] = useState("");
  const [requestError, setRequestError] = useState("");
  const [isParsing, setIsParsing] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [isDownloadingTemplate, setIsDownloadingTemplate] = useState<"" | "csv" | "xlsx">("");
  const [preview, setPreview] = useState<ImportPreviewResponse | null>(null);
  const [commitResult, setCommitResult] = useState<ImportCommitResponse | null>(null);

  const canImport = Boolean(
    preview?.ok && preview.summary.validRows > 0 && !isParsing && !isImporting,
  );

  const previewStatusLabel = useMemo(() => {
    if (!preview) {
      return "";
    }
    return `${preview.summary.validRows} valides / ${preview.summary.invalidRows} invalides`;
  }, [preview]);

  const onFileSelected = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ): Promise<void> => {
    const nextFile = event.target.files?.[0];
    if (!nextFile) {
      setCsvPayload("");
      setSelectedFileName("");
      return;
    }

    const rawText = await nextFile.text();
    setCsvPayload(rawText);
    setSelectedFileName(nextFile.name);
    setPreview(null);
    setCommitResult(null);
    setRequestError("");
  };

  const runPreview = async (): Promise<void> => {
    if (!csvPayload.trim() || isParsing) {
      return;
    }

    setIsParsing(true);
    setRequestError("");
    setCommitResult(null);

    try {
      const response = await fetch("/api/admin/products/import/preview", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          format: "csv",
          payload: csvPayload,
        }),
      });

      if (!response.ok) {
        setPreview(null);
        setRequestError(await readErrorFromResponse(response));
        return;
      }

      const payload = (await response.json()) as ImportPreviewResponse;
      setPreview(payload);
    } catch {
      setPreview(null);
      setRequestError("Impossible de generer l'apercu pour le moment.");
    } finally {
      setIsParsing(false);
    }
  };

  const runImport = async (): Promise<void> => {
    if (!canImport) {
      return;
    }

    setIsImporting(true);
    setRequestError("");

    try {
      const response = await fetch("/api/admin/products/import/commit", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          format: "csv",
          payload: csvPayload,
        }),
      });

      if (!response.ok) {
        setCommitResult(null);
        setRequestError(await readErrorFromResponse(response));
        return;
      }

      const payload = (await response.json()) as ImportCommitResponse;
      setCommitResult(payload);
    } catch {
      setCommitResult(null);
      setRequestError("Impossible de finaliser l'import pour le moment.");
    } finally {
      setIsImporting(false);
    }
  };

  const downloadTemplate = async (format: "csv" | "xlsx"): Promise<void> => {
    if (isDownloadingTemplate) {
      return;
    }

    setIsDownloadingTemplate(format);
    setRequestError("");

    try {
      const response = await fetch(`/api/admin/products/import/template?format=${format}`, {
        method: "GET",
        cache: "no-store",
      });

      if (!response.ok) {
        setRequestError(await readErrorFromResponse(response));
        return;
      }

      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = objectUrl;
      anchor.download =
        format === "xlsx"
          ? "produits-import-template.xlsx"
          : "produits-import-template.csv";
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
      URL.revokeObjectURL(objectUrl);
    } catch {
      setRequestError("Impossible de telecharger le modele pour le moment.");
    } finally {
      setIsDownloadingTemplate("");
    }
  };

  return (
    <div className="space-y-4">
      <article className="rounded-2xl bg-white p-5 shadow-card">
        <h2 className="text-lg font-bold text-brand-blue">1) Charger le fichier d'import</h2>
        <p className="mt-1 text-sm text-slate-600">
          Importez un CSV puis validez l&apos;apercu avant insertion.
        </p>

        <div className="mt-3 grid gap-3 lg:grid-cols-[1.1fr_1fr]">
          <label className="block rounded-xl border border-slate-200 bg-slate-50 p-3">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Fichier CSV
            </span>
            <input
              type="file"
              accept=".csv,text/csv"
              onChange={onFileSelected}
              className="mt-1 block w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-700 file:mr-3 file:rounded-lg file:border-0 file:bg-brand-blue file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-white"
            />
            <p className="mt-2 text-xs text-slate-500">
              Chaque colonne correspond a une information produit. Remplissez chaque ligne avec un produit.
            </p>
          </label>

          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Modeles de fichier
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => downloadTemplate("csv")}
                disabled={Boolean(isDownloadingTemplate)}
                className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:border-brand-orange hover:text-brand-orange disabled:opacity-70"
              >
                {isDownloadingTemplate === "csv"
                  ? "Telechargement..."
                  : "Telecharger modele CSV"}
              </button>
              <button
                type="button"
                onClick={() => downloadTemplate("xlsx")}
                disabled={Boolean(isDownloadingTemplate)}
                className="rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 transition hover:border-emerald-400 hover:bg-emerald-100 disabled:opacity-70"
              >
                {isDownloadingTemplate === "xlsx"
                  ? "Telechargement..."
                  : "Telecharger modele Excel (.xlsx)"}
              </button>
            </div>
          </div>
        </div>

        <div className="mt-4 overflow-x-auto rounded-xl border border-slate-200">
          <table className="min-w-[940px] text-left text-xs text-slate-700">
            <thead className="bg-slate-50 text-[11px] uppercase tracking-wide text-slate-500">
              <tr>
                {previewColumns.map((column) => (
                  <th key={column.key} className="px-3 py-2 font-semibold">
                    {column.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr className="border-t border-slate-100 bg-white">
                <td className="px-3 py-2">Perceuse Bosch 500W</td>
                <td className="px-3 py-2 font-mono">perceuse-bosch-500w</td>
                <td className="px-3 py-2">Perceuse electrique compacte</td>
                <td className="px-3 py-2">799.90</td>
                <td className="px-3 py-2">999.90</td>
                <td className="px-3 py-2">25</td>
                <td className="px-3 py-2">outillage</td>
                <td className="px-3 py-2">/images/products/perceuse-bosch.jpg</td>
                <td className="px-3 py-2">true</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Aide colonnes
          </p>
          <div className="mt-2 overflow-x-auto">
            <table className="min-w-[880px] text-left text-xs text-slate-700">
              <thead className="text-[11px] uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-2 py-1.5">Colonne</th>
                  <th className="px-2 py-1.5">Description</th>
                  <th className="px-2 py-1.5">Format</th>
                  <th className="px-2 py-1.5">Exemple</th>
                </tr>
              </thead>
              <tbody>
                {columnHelpRows.map((helpRow) => (
                  <tr key={helpRow.column} className="border-t border-slate-200">
                    <td className="px-2 py-1.5 font-semibold">{helpRow.column}</td>
                    <td className="px-2 py-1.5">{helpRow.description}</td>
                    <td className="px-2 py-1.5">{helpRow.format}</td>
                    <td className="px-2 py-1.5 font-mono text-[11px]">{helpRow.example}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={runPreview}
            disabled={!csvPayload.trim() || isParsing || isImporting}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-brand-blue px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isParsing ? (
              <span
                aria-hidden="true"
                className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent"
              />
            ) : null}
            <span>{isParsing ? "Analyse en cours..." : "Generer apercu"}</span>
          </button>
          {selectedFileName ? (
            <p className="text-sm text-slate-600">
              Fichier selectionne: <span className="font-semibold">{selectedFileName}</span>
            </p>
          ) : null}
          {previewStatusLabel ? (
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
              {previewStatusLabel}
            </span>
          ) : null}
        </div>
      </article>

      {requestError ? (
        <p className="rounded-xl bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">
          {requestError}
        </p>
      ) : null}

      {preview ? (
        <article className="rounded-2xl bg-white p-5 shadow-card">
          <h2 className="text-lg font-bold text-brand-blue">2) Apercu et validation</h2>
          <p className="mt-1 text-sm text-slate-600">{preview.message}</p>

          {preview.headerErrors.length > 0 ? (
            <div className="mt-3 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
              {preview.headerErrors.map((error) => (
                <p key={error}>{error}</p>
              ))}
            </div>
          ) : null}

          <div className="mt-4 grid gap-2 md:grid-cols-3">
            <p className="rounded-xl bg-slate-50 px-3 py-2 text-sm text-slate-700">
              Lignes totales:{" "}
              <span className="font-bold">{preview.summary.totalRows}</span>
            </p>
            <p className="rounded-xl bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
              Lignes valides: <span className="font-bold">{preview.summary.validRows}</span>
            </p>
            <p className="rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-700">
              Lignes invalides:{" "}
              <span className="font-bold">{preview.summary.invalidRows}</span>
            </p>
          </div>

          <div className="mt-4 overflow-x-auto rounded-xl border border-slate-200">
            <table className="min-w-[1450px] text-left text-xs text-slate-700">
              <thead className="bg-slate-50 text-[11px] uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-2 py-2">Ligne</th>
                  <th className="px-2 py-2">Statut</th>
                  {previewColumns.map((column) => (
                    <th key={column.key} className="px-2 py-2">
                      {column.label}
                    </th>
                  ))}
                  <th className="px-2 py-2">Erreurs / Avertissements</th>
                </tr>
              </thead>
              <tbody>
                {preview.rows.map((row) => {
                  const errorColumns = inferErrorColumns(row);

                  return (
                    <tr
                      key={row.rowNumber}
                      className={`border-t border-slate-100 align-top ${
                        row.isValid ? "bg-white" : "bg-rose-50/30"
                      }`}
                    >
                      <td className="px-2 py-2 font-semibold text-slate-700">{row.rowNumber}</td>
                      <td className="px-2 py-2">
                        <span
                          className={`rounded-full px-2 py-1 text-[11px] font-semibold ${
                            row.isValid
                              ? "bg-emerald-100 text-emerald-700"
                              : "bg-rose-100 text-rose-700"
                          }`}
                        >
                          {row.isValid ? "Valide" : "Invalide"}
                        </span>
                      </td>

                      {previewColumns.map((column) => {
                        const hasError = errorColumns.has(column.key);
                        return (
                          <td
                            key={`${row.rowNumber}-${column.key}`}
                            className={`px-2 py-2 ${
                              hasError
                                ? "bg-rose-50 font-semibold text-rose-700"
                                : "text-slate-700"
                            }`}
                          >
                            {getPreviewCellText(row, column.key) || "-"}
                          </td>
                        );
                      })}

                      <td className="px-2 py-2">
                        {row.errors.length > 0 ? (
                          <div className="space-y-1 text-rose-700">
                            {row.errors.map((error) => (
                              <p key={`${row.rowNumber}-error-${error}`}>
                                {toFriendlyRowError(error, row)}
                              </p>
                            ))}
                          </div>
                        ) : null}
                        {row.warnings.length > 0 ? (
                          <div className="mt-1 space-y-1 text-amber-700">
                            {row.warnings.map((warning) => (
                              <p key={`${row.rowNumber}-warning-${warning}`}>{warning}</p>
                            ))}
                          </div>
                        ) : null}
                        {row.errors.length === 0 && row.warnings.length === 0 ? (
                          <span className="text-emerald-700">Aucune erreur.</span>
                        ) : null}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={runImport}
              disabled={!canImport}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isImporting ? (
                <span
                  aria-hidden="true"
                  className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent"
                />
              ) : null}
              <span>{isImporting ? "Import en cours..." : "Confirmer import des lignes valides"}</span>
            </button>
            {!canImport ? (
              <p className="text-sm text-slate-600">
                L&apos;import est disponible uniquement apres un apercu valide avec au moins une ligne correcte.
              </p>
            ) : null}
          </div>
        </article>
      ) : null}

      {commitResult ? (
        <article
          className={`rounded-2xl border p-5 shadow-card ${
            commitResult.ok
              ? "border-emerald-200 bg-emerald-50"
              : "border-amber-200 bg-amber-50"
          }`}
        >
          <h2 className="text-lg font-bold text-slate-800">3) Resultat import</h2>
          <p className="mt-1 text-sm text-slate-700">{commitResult.message}</p>
          <div className="mt-3 grid gap-2 md:grid-cols-4">
            <p className="rounded-xl bg-white px-3 py-2 text-sm text-slate-700">
              Importes: <span className="font-bold">{commitResult.importedCount}</span>
            </p>
            <p className="rounded-xl bg-white px-3 py-2 text-sm text-slate-700">
              Ignores: <span className="font-bold">{commitResult.skippedCount}</span>
            </p>
            <p className="rounded-xl bg-white px-3 py-2 text-sm text-slate-700">
              Echecs: <span className="font-bold">{commitResult.failedRows.length}</span>
            </p>
            <p className="rounded-xl bg-white px-3 py-2 text-sm text-slate-700">
              Total CSV: <span className="font-bold">{commitResult.totalRows}</span>
            </p>
          </div>

          {commitResult.failedRows.length > 0 ? (
            <div className="mt-3 rounded-xl border border-amber-200 bg-white p-3">
              <p className="text-sm font-semibold text-amber-800">Lignes en echec</p>
              <div className="mt-1 space-y-1 text-xs text-amber-800">
                {commitResult.failedRows.map((failedRow) => (
                  <p key={`${failedRow.rowNumber}-${failedRow.slug}`}>
                    Ligne {failedRow.rowNumber} ({failedRow.slug}): {failedRow.reason}
                  </p>
                ))}
              </div>
            </div>
          ) : null}
        </article>
      ) : null}
    </div>
  );
};

