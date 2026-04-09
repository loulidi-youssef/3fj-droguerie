"use client";

import { useMemo, useState } from "react";
import {
  ImportCommitResponse,
  ImportPreviewResponse,
  columnHelpRows,
  productImportColumns,
} from "@/app/admin/products/import/components/product-import-config";
import { ProductImportPreviewTable } from "@/app/admin/products/import/components/product-import-preview-table";

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

const createUploadPayload = (file: File): FormData => {
  const formData = new FormData();
  formData.set("file", file);
  return formData;
};

export const AdminProductImportClient = () => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [requestError, setRequestError] = useState("");
  const [isParsing, setIsParsing] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [isDownloadingTemplate, setIsDownloadingTemplate] = useState<"" | "csv" | "xlsx">("");
  const [preview, setPreview] = useState<ImportPreviewResponse | null>(null);
  const [commitResult, setCommitResult] = useState<ImportCommitResponse | null>(null);

  const canGeneratePreview = Boolean(selectedFile) && !isParsing && !isImporting;
  const canImport = Boolean(
    selectedFile && preview?.ok && preview.summary.validRows > 0 && !isParsing && !isImporting,
  );

  const previewStatusLabel = useMemo(() => {
    if (!preview) {
      return "";
    }
    return `${preview.summary.validRows} valides / ${preview.summary.invalidRows} invalides`;
  }, [preview]);

  const onFileSelected = (event: React.ChangeEvent<HTMLInputElement>): void => {
    const nextFile = event.target.files?.[0] ?? null;
    setSelectedFile(nextFile);
    setPreview(null);
    setCommitResult(null);
    setRequestError("");
  };

  const runPreview = async (): Promise<void> => {
    if (!selectedFile || isParsing) {
      return;
    }

    setIsParsing(true);
    setRequestError("");
    setCommitResult(null);

    try {
      const response = await fetch("/api/admin/products/import/preview", {
        method: "POST",
        body: createUploadPayload(selectedFile),
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
    if (!selectedFile || !canImport) {
      return;
    }

    setIsImporting(true);
    setRequestError("");

    try {
      const response = await fetch("/api/admin/products/import/commit", {
        method: "POST",
        body: createUploadPayload(selectedFile),
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
        <h2 className="text-lg font-bold text-brand-blue">1) Fichier a importer</h2>
        <p className="mt-1 text-sm text-slate-600">
          Chargez un fichier CSV ou XLSX. Chaque ligne correspond a un produit.
        </p>

        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <section className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Televersement
            </p>
            <label className="mt-2 block">
              <input
                type="file"
                accept=".csv,.xlsx,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                onChange={onFileSelected}
                className="block w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-700 file:mr-3 file:rounded-lg file:border-0 file:bg-brand-blue file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-white"
              />
            </label>
            <p className="mt-2 text-xs text-slate-500">
              Formats acceptes: CSV, XLSX.
            </p>
            <p className="text-xs text-slate-500">Chaque ligne correspond a un produit.</p>
            {selectedFile ? (
              <p className="mt-2 text-sm text-slate-700">
                Fichier selectionne: <span className="font-semibold">{selectedFile.name}</span>
              </p>
            ) : null}
          </section>

          <section className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Modeles a telecharger
            </p>
            <p className="mt-2 text-sm text-slate-600">
              Utilisez le modele Excel pour eviter les problemes de separateur.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
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
          </section>
        </div>

        <div className="mt-4 overflow-x-auto rounded-xl border border-slate-200">
          <table className="min-w-[940px] text-left text-xs text-slate-700">
            <thead className="bg-slate-50 text-[11px] uppercase tracking-wide text-slate-500">
              <tr>
                {productImportColumns.map((column) => (
                  <th key={column} className="px-3 py-2 font-semibold">
                    {column}
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
                <td className="px-3 py-2">outillage/perceuse-bosch-500w.jpg</td>
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
            <table className="min-w-[900px] text-left text-xs text-slate-700">
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
            disabled={!canGeneratePreview}
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

          {preview.notices.length > 0 ? (
            <div className="mt-3 rounded-xl border border-sky-200 bg-sky-50 p-3 text-sm text-sky-700">
              {preview.notices.map((notice) => (
                <p key={notice}>{notice}</p>
              ))}
            </div>
          ) : null}

          {preview.headerErrors.length > 0 ? (
            <div className="mt-3 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
              {preview.headerErrors.map((error) => (
                <p key={error}>{error}</p>
              ))}
            </div>
          ) : null}

          <div className="mt-4 grid gap-2 md:grid-cols-3">
            <p className="rounded-xl bg-slate-50 px-3 py-2 text-sm text-slate-700">
              Lignes totales: <span className="font-bold">{preview.summary.totalRows}</span>
            </p>
            <p className="rounded-xl bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
              Lignes valides: <span className="font-bold">{preview.summary.validRows}</span>
            </p>
            <p className="rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-700">
              Lignes invalides: <span className="font-bold">{preview.summary.invalidRows}</span>
            </p>
          </div>

          {preview.rows.length > 0 ? <ProductImportPreviewTable rows={preview.rows} /> : null}

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
              <span>
                {isImporting
                  ? "Import en cours..."
                  : `Confirmer import (${preview.summary.validRows} ligne(s) valide(s))`}
              </span>
            </button>
            {!canImport ? (
              <p className="text-sm text-slate-600">
                L'import est actif seulement avec au moins une ligne valide.
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
              Total: <span className="font-bold">{commitResult.totalRows}</span>
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
