"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { parseDecimalInput } from "@/lib/currency";

type AdminProductBulkPriceTierInputTier = {
  minQty?: number | null;
  price?: number | null;
};

type TierRow = {
  key: string;
  minQty: string;
  price: string;
};

type AdminProductBulkPriceTiersInputProps = {
  inputName: string;
  initialTiers?: AdminProductBulkPriceTierInputTier[];
};

const createRowKey = (): string => {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
};

const createEmptyRow = (): TierRow => ({
  key: createRowKey(),
  minQty: "",
  price: "",
});

const isRowCompletelyEmpty = (row: TierRow): boolean => {
  return !row.minQty.trim() && !row.price.trim();
};

const parseMinQty = (value: string): number | null => {
  const trimmed = value.trim();
  if (!/^\d+$/.test(trimmed)) {
    return null;
  }

  const parsed = Number.parseInt(trimmed, 10);
  if (!Number.isSafeInteger(parsed) || parsed <= 0) {
    return null;
  }

  return parsed;
};

const parsePrice = (value: string): number | null => {
  const parsed = parseDecimalInput(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return null;
  }

  return parsed;
};

export const AdminProductBulkPriceTiersInput = ({
  inputName,
  initialTiers = [],
}: AdminProductBulkPriceTiersInputProps) => {
  const [rows, setRows] = useState<TierRow[]>(() => {
    if (initialTiers.length === 0) {
      return [];
    }

    return initialTiers.map((tier) => ({
      key: createRowKey(),
      minQty:
        typeof tier.minQty === "number" && Number.isFinite(tier.minQty)
          ? String(Math.floor(tier.minQty))
          : "",
      price:
        typeof tier.price === "number" && Number.isFinite(tier.price)
          ? String(tier.price)
          : "",
    }));
  });
  const rootRef = useRef<HTMLDivElement | null>(null);

  const rowErrorsByKey = useMemo(() => {
    const rowErrors = new Map<string, string[]>();
    const minQtyToRowKeys = new Map<number, string[]>();

    for (const row of rows) {
      const errors: string[] = [];
      const isEmpty = isRowCompletelyEmpty(row);

      if (isEmpty) {
        rowErrors.set(row.key, errors);
        continue;
      }

      const minQty = parseMinQty(row.minQty);
      if (minQty === null) {
        errors.push("La quantite minimum doit etre un entier positif.");
      }

      const price = parsePrice(row.price);
      if (price === null) {
        errors.push("Le prix doit etre un nombre superieur a 0.");
      }

      if (minQty !== null) {
        const bucket = minQtyToRowKeys.get(minQty) ?? [];
        minQtyToRowKeys.set(minQty, [...bucket, row.key]);
      }

      rowErrors.set(row.key, errors);
    }

    for (const rowKeys of minQtyToRowKeys.values()) {
      if (rowKeys.length < 2) {
        continue;
      }

      for (const rowKey of rowKeys) {
        const errors = rowErrors.get(rowKey) ?? [];
        rowErrors.set(rowKey, [...errors, "minQty duplique: chaque palier doit etre unique."]);
      }
    }

    return rowErrors;
  }, [rows]);

  const hasBlockingErrors = useMemo(() => {
    for (const row of rows) {
      if (isRowCompletelyEmpty(row)) {
        continue;
      }

      if ((rowErrorsByKey.get(row.key) ?? []).length > 0) {
        return true;
      }
    }

    return false;
  }, [rowErrorsByKey, rows]);
  const hasBlockingErrorsRef = useRef<boolean>(hasBlockingErrors);

  useEffect(() => {
    hasBlockingErrorsRef.current = hasBlockingErrors;
  }, [hasBlockingErrors]);

  useEffect(() => {
    const form = rootRef.current?.closest("form");
    if (!form) {
      return;
    }

    const onSubmit = (event: Event) => {
      if (!hasBlockingErrorsRef.current) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();
      rootRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    };

    form.addEventListener("submit", onSubmit);
    return () => {
      form.removeEventListener("submit", onSubmit);
    };
  }, []);

  const serializedTiers = useMemo(() => {
    const payload = rows
      .filter((row) => !isRowCompletelyEmpty(row))
      .map((row) => ({
        minQty: parseMinQty(row.minQty),
        price: parsePrice(row.price),
      }))
      .sort((first, second) => (first.minQty ?? Number.MAX_SAFE_INTEGER) - (second.minQty ?? Number.MAX_SAFE_INTEGER));

    return JSON.stringify(payload);
  }, [rows]);

  const validSortedTiersForPreview = useMemo(() => {
    return rows
      .map((row) => ({
        minQty: parseMinQty(row.minQty),
        price: parsePrice(row.price),
      }))
      .filter((tier): tier is { minQty: number; price: number } =>
        tier.minQty !== null && tier.price !== null,
      )
      .sort((first, second) => first.minQty - second.minQty);
  }, [rows]);

  const addRow = () => {
    setRows((current) => [...current, createEmptyRow()]);
  };

  const removeRow = (rowKey: string) => {
    setRows((current) => current.filter((row) => row.key !== rowKey));
  };

  const moveRow = (rowKey: string, direction: -1 | 1) => {
    setRows((current) => {
      const currentIndex = current.findIndex((row) => row.key === rowKey);
      if (currentIndex < 0) {
        return current;
      }

      const nextIndex = currentIndex + direction;
      if (nextIndex < 0 || nextIndex >= current.length) {
        return current;
      }

      const next = [...current];
      const [moved] = next.splice(currentIndex, 1);
      next.splice(nextIndex, 0, moved);
      return next;
    });
  };

  const updateRow = (rowKey: string, patch: Partial<TierRow>) => {
    setRows((current) =>
      current.map((row) => (row.key === rowKey ? { ...row, ...patch } : row)),
    );
  };

  return (
    <div ref={rootRef} className="md:col-span-2">
      <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
        <div className="mb-3 flex items-center justify-between gap-2">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-600">
              Prix de gros (optionnel)
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Le prix de base du produit reste applique en dessous du premier palier.
            </p>
          </div>
          <button
            type="button"
            onClick={addRow}
            className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:border-brand-orange hover:text-brand-orange"
          >
            Ajouter un palier
          </button>
        </div>

        {hasBlockingErrors ? (
          <p className="mb-3 rounded-lg border border-rose-200 bg-rose-50 p-2 text-xs font-medium text-rose-700">
            Corrigez les paliers de prix avant d&apos;enregistrer.
          </p>
        ) : null}

        {rows.length === 0 ? (
          <p className="rounded-lg bg-white p-3 text-xs text-slate-500">
            Aucun palier defini. Le prix de base sera applique a toutes les quantites.
          </p>
        ) : (
          <div className="space-y-3">
            {rows.map((row, index) => {
              const rowErrors = rowErrorsByKey.get(row.key) ?? [];
              return (
                <article key={row.key} className="rounded-xl border border-slate-200 bg-white p-3">
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-600">
                      Palier {index + 1}
                    </p>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => moveRow(row.key, -1)}
                        disabled={index === 0}
                        className="rounded-lg border border-slate-300 px-2 py-1 text-xs font-semibold text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
                        aria-label="Monter le palier"
                      >
                        ↑
                      </button>
                      <button
                        type="button"
                        onClick={() => moveRow(row.key, 1)}
                        disabled={index === rows.length - 1}
                        className="rounded-lg border border-slate-300 px-2 py-1 text-xs font-semibold text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
                        aria-label="Descendre le palier"
                      >
                        ↓
                      </button>
                      <button
                        type="button"
                        onClick={() => removeRow(row.key)}
                        className="rounded-lg border border-rose-300 px-2.5 py-1 text-xs font-semibold text-rose-700 transition hover:border-rose-400"
                      >
                        Supprimer
                      </button>
                    </div>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <label className="block">
                      <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-600">
                        Quantite min (minQty)
                      </span>
                      <input
                        type="number"
                        min="1"
                        step="1"
                        value={row.minQty}
                        onChange={(event) => updateRow(row.key, { minQty: event.target.value })}
                        className="mt-1 w-full rounded-lg border border-slate-300 px-2.5 py-2 text-xs"
                        placeholder="10"
                      />
                    </label>

                    <label className="block">
                      <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-600">
                        Prix unitaire (DH)
                      </span>
                      <input
                        type="number"
                        min="0.01"
                        step="0.01"
                        value={row.price}
                        onChange={(event) => updateRow(row.key, { price: event.target.value })}
                        className="mt-1 w-full rounded-lg border border-slate-300 px-2.5 py-2 text-xs"
                        placeholder="6.5"
                      />
                    </label>
                  </div>

                  {rowErrors.length > 0 ? (
                    <div className="mt-2 space-y-1">
                      {rowErrors.map((error, errorIndex) => (
                        <p
                          key={`${row.key}-error-${errorIndex}`}
                          className="text-xs font-medium text-rose-700"
                        >
                          {error}
                        </p>
                      ))}
                    </div>
                  ) : null}
                </article>
              );
            })}
          </div>
        )}

        {validSortedTiersForPreview.length > 0 ? (
          <div className="mt-3 rounded-lg border border-slate-200 bg-white p-3">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-600">
              Apercu trie automatiquement
            </p>
            <div className="mt-2 space-y-1">
              {validSortedTiersForPreview.map((tier) => (
                <p key={tier.minQty} className="text-xs font-medium text-slate-700">
                  {tier.minQty}+ → {tier.price} DH
                </p>
              ))}
            </div>
          </div>
        ) : null}
      </div>

      <input type="hidden" name={inputName} value={serializedTiers} readOnly />
    </div>
  );
};
