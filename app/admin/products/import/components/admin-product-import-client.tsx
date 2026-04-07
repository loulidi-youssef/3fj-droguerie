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

type AdminProductImportClientProps = {
  csvTemplate: string;
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

export const AdminProductImportClient = ({
  csvTemplate,
}: AdminProductImportClientProps) => {
  const [csvPayload, setCsvPayload] = useState("");
  const [selectedFileName, setSelectedFileName] = useState("");
  const [requestError, setRequestError] = useState("");
  const [isParsing, setIsParsing] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
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

  const downloadTemplate = (): void => {
    const blob = new Blob([csvTemplate], { type: "text/csv;charset=utf-8;" });
    const objectUrl = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = objectUrl;
    anchor.download = "produits-import-template.csv";
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    URL.revokeObjectURL(objectUrl);
  };

  return (
    <div className="space-y-4">
      <article className="rounded-2xl bg-white p-5 shadow-card">
        <h2 className="text-lg font-bold text-brand-blue">1) Charger le CSV</h2>
        <p className="mt-1 text-sm text-slate-600">
          Format initial supporte: CSV. Le support JSON est prevu ensuite.
        </p>

        <div className="mt-3 grid gap-3 md:grid-cols-2">
          <label className="block">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Fichier CSV
            </span>
            <input
              type="file"
              accept=".csv,text/csv"
              onChange={onFileSelected}
              className="mt-1 block w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-700 file:mr-3 file:rounded-lg file:border-0 file:bg-brand-blue file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-white"
            />
          </label>
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Schema CSV attendu
            </p>
            <p className="mt-1 text-sm text-slate-700">{requiredColumns.join(", ")}</p>
            <button
              type="button"
              onClick={downloadTemplate}
              className="mt-3 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700"
            >
              Telecharger modele CSV
            </button>
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
            <table className="min-w-[1150px] text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-3 py-2">Ligne</th>
                  <th className="px-3 py-2">Statut</th>
                  <th className="px-3 py-2">Nom</th>
                  <th className="px-3 py-2">Slug</th>
                  <th className="px-3 py-2">Prix</th>
                  <th className="px-3 py-2">Stock</th>
                  <th className="px-3 py-2">Categorie</th>
                  <th className="px-3 py-2">Actif</th>
                  <th className="px-3 py-2">Details</th>
                </tr>
              </thead>
              <tbody>
                {preview.rows.map((row) => (
                  <tr
                    key={row.rowNumber}
                    className={`border-t border-slate-100 align-top ${
                      row.isValid ? "bg-white" : "bg-rose-50/40"
                    }`}
                  >
                    <td className="px-3 py-2 font-semibold text-slate-700">{row.rowNumber}</td>
                    <td className="px-3 py-2">
                      <span
                        className={`rounded-full px-2 py-1 text-xs font-semibold ${
                          row.isValid
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-rose-100 text-rose-700"
                        }`}
                      >
                        {row.isValid ? "Valide" : "Invalide"}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-slate-700">{row.raw.name || "-"}</td>
                    <td className="px-3 py-2 font-mono text-xs text-slate-700">
                      {row.normalized?.slug ?? (row.raw.slug || "-")}
                    </td>
                    <td className="px-3 py-2 text-slate-700">
                      {typeof row.normalized?.price === "number"
                        ? row.normalized.price.toFixed(2)
                        : row.raw.price || "-"}
                    </td>
                    <td className="px-3 py-2 text-slate-700">
                      {typeof row.normalized?.stock === "number"
                        ? row.normalized.stock
                        : row.raw.stock || "-"}
                    </td>
                    <td className="px-3 py-2 text-slate-700">
                      {row.normalized?.categorySlug ?? (row.raw.category || "-")}
                    </td>
                    <td className="px-3 py-2 text-slate-700">
                      {row.normalized ? (row.normalized.isActive ? "Oui" : "Non") : row.raw.is_active || "-"}
                    </td>
                    <td className="px-3 py-2 text-xs">
                      {row.errors.length > 0 ? (
                        <div className="space-y-1 text-rose-700">
                          {row.errors.map((error) => (
                            <p key={`${row.rowNumber}-error-${error}`}>{error}</p>
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
                ))}
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
                L'import est disponible uniquement apres un apercu valide avec au moins une ligne correcte.
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
