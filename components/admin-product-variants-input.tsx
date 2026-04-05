"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type AdminProductVariantsInputVariant = {
  id?: string | null;
  color?: string | null;
  size?: string | null;
  price?: number | null;
  previousPrice?: number | null;
  stock?: number | null;
  sku?: string | null;
  image?: string | null;
  isActive?: boolean;
};

type VariantRow = {
  key: string;
  id: string;
  color: string;
  size: string;
  price: string;
  previousPrice: string;
  stock: string;
  sku: string;
  image: string;
  isActive: boolean;
};

type AdminProductVariantsInputProps = {
  inputName: string;
  initialVariants?: AdminProductVariantsInputVariant[];
  productIdForValidation?: string;
};

const createRowKey = (): string => {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
};

const toSafeText = (value: unknown): string => {
  if (typeof value !== "string") {
    return "";
  }
  return value;
};

const toStringNumber = (value: unknown): string => {
  return typeof value === "number" && Number.isFinite(value) ? String(value) : "";
};

const createEmptyRow = (): VariantRow => ({
  key: createRowKey(),
  id: "",
  color: "",
  size: "",
  price: "",
  previousPrice: "",
  stock: "",
  sku: "",
  image: "",
  isActive: true,
});

const isNumericFieldValid = (value: string): boolean => {
  if (!value.trim()) {
    return false;
  }

  return Number.isFinite(Number(value));
};

const isRowCompletelyEmpty = (row: VariantRow): boolean => {
  return (
    !row.id.trim() &&
    !row.color.trim() &&
    !row.size.trim() &&
    !row.price.trim() &&
    !row.previousPrice.trim() &&
    !row.stock.trim() &&
    !row.sku.trim() &&
    !row.image.trim()
  );
};

const toNormalizedVariantDimension = (value: string): string | null => {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  return trimmed.toLowerCase();
};

export const AdminProductVariantsInput = ({
  inputName,
  initialVariants = [],
  productIdForValidation,
}: AdminProductVariantsInputProps) => {
  const [rows, setRows] = useState<VariantRow[]>(() => {
    if (initialVariants.length === 0) {
      return [];
    }

    return initialVariants.map((variant) => ({
      key: createRowKey(),
      id: toSafeText(variant.id),
      color: toSafeText(variant.color),
      size: toSafeText(variant.size),
      price: toStringNumber(variant.price),
      previousPrice: toStringNumber(variant.previousPrice),
      stock: toStringNumber(variant.stock),
      sku: toSafeText(variant.sku),
      image: toSafeText(variant.image),
      isActive: variant.isActive !== false,
    }));
  });
  const rootRef = useRef<HTMLDivElement | null>(null);

  const serializedVariants = useMemo(() => {
    const payload = rows
      .filter((row) => !isRowCompletelyEmpty(row))
      .map((row) => ({
        id: row.id.trim() || undefined,
        color: row.color.trim() || null,
        size: row.size.trim() || null,
        price: row.price.trim(),
        previousPrice: row.previousPrice.trim() ? row.previousPrice.trim() : null,
        stock: row.stock.trim(),
        sku: row.sku.trim() || null,
        image: row.image.trim() || null,
        isActive: row.isActive,
      }));

    return JSON.stringify(payload);
  }, [rows]);

  const rowErrorsByKey = useMemo(() => {
    const rowErrors = new Map<string, string[]>();
    const variantKeysByRow = new Map<string, string>();
    const duplicateBuckets = new Map<string, string[]>();
    const validationProductId = (productIdForValidation ?? "__new__").trim() || "__new__";

    for (const row of rows) {
      const errors: string[] = [];
      const isEmpty = isRowCompletelyEmpty(row);

      if (isEmpty) {
        rowErrors.set(row.key, errors);
        continue;
      }

      const color = row.color.trim();
      const size = row.size.trim();
      const price = row.price.trim();
      const stock = row.stock.trim();

      const hasColorOrSize = Boolean(color) || Boolean(size);
      if (!hasColorOrSize) {
        errors.push("Ajoutez au moins une couleur ou une taille.");
      }

      if (!price) {
        errors.push("Le prix est obligatoire.");
      } else {
        const numericPrice = Number(price);
        if (!Number.isFinite(numericPrice) || numericPrice <= 0) {
          errors.push("Le prix doit etre un nombre superieur a 0.");
        }
      }

      if (!stock) {
        errors.push("Le stock est obligatoire.");
      } else {
        const numericStock = Number(stock);
        if (!Number.isFinite(numericStock) || numericStock < 0) {
          errors.push("Le stock doit etre un nombre superieur ou egal a 0.");
        }
      }

      if (hasColorOrSize) {
        const duplicateKey = [
          validationProductId,
          toNormalizedVariantDimension(color) ?? "__none__",
          toNormalizedVariantDimension(size) ?? "__none__",
        ].join("::");
        variantKeysByRow.set(row.key, duplicateKey);
      }

      rowErrors.set(row.key, errors);
    }

    for (const [rowKey, duplicateKey] of variantKeysByRow.entries()) {
      const bucket = duplicateBuckets.get(duplicateKey) ?? [];
      duplicateBuckets.set(duplicateKey, [...bucket, rowKey]);
    }

    for (const rowKeys of duplicateBuckets.values()) {
      if (rowKeys.length < 2) {
        continue;
      }

      for (const rowKey of rowKeys) {
        const errors = rowErrors.get(rowKey) ?? [];
        rowErrors.set(rowKey, [
          ...errors,
          "Combinaison couleur/taille dupliquee pour ce produit.",
        ]);
      }
    }

    return rowErrors;
  }, [rows, productIdForValidation]);

  const hasBlockingErrors = useMemo(() => {
    for (const row of rows) {
      if (isRowCompletelyEmpty(row)) {
        continue;
      }

      const errors = rowErrorsByKey.get(row.key) ?? [];
      if (errors.length > 0) {
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

  const addVariantRow = () => {
    setRows((current) => [...current, createEmptyRow()]);
  };

  const removeVariantRow = (rowKey: string) => {
    setRows((current) => current.filter((row) => row.key !== rowKey));
  };

  const updateRow = (rowKey: string, patch: Partial<VariantRow>) => {
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
              Variantes (optionnel)
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Ajoutez des variations simples par couleur et/ou taille.
            </p>
          </div>
          <button
            type="button"
            onClick={addVariantRow}
            className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:border-brand-orange hover:text-brand-orange"
          >
            Ajouter une variante
          </button>
        </div>
        {hasBlockingErrors ? (
          <p className="mb-3 rounded-lg border border-rose-200 bg-rose-50 p-2 text-xs font-medium text-rose-700">
            Corrigez les erreurs des variantes avant d&apos;enregistrer le produit.
          </p>
        ) : null}

        {rows.length === 0 ? (
          <p className="rounded-lg bg-white p-3 text-xs text-slate-500">
            Aucune variante. Le produit utilisera son prix et son stock principaux.
          </p>
        ) : (
          <div className="space-y-3">
            {rows.map((row, index) => {
              const rowErrors = rowErrorsByKey.get(row.key) ?? [];
              const priceInvalid = row.price.trim() !== "" && !isNumericFieldValid(row.price);
              const stockInvalid = row.stock.trim() !== "" && !isNumericFieldValid(row.stock);
              const previousPriceInvalid =
                row.previousPrice.trim() !== "" && !isNumericFieldValid(row.previousPrice);

              return (
                <article key={row.key} className="rounded-xl border border-slate-200 bg-white p-3">
                  <div className="mb-2 flex items-center justify-between">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-600">
                      Variante {index + 1}
                    </p>
                    <button
                      type="button"
                      onClick={() => removeVariantRow(row.key)}
                      className="rounded-lg border border-rose-300 px-2.5 py-1 text-xs font-semibold text-rose-700 transition hover:border-rose-400"
                    >
                      Supprimer
                    </button>
                  </div>

                  <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
                    <label className="block">
                      <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-600">
                        Couleur
                      </span>
                      <input
                        type="text"
                        value={row.color}
                        onChange={(event) => updateRow(row.key, { color: event.target.value })}
                        className="mt-1 w-full rounded-lg border border-slate-300 px-2.5 py-2 text-xs"
                        placeholder="Ex: Rouge"
                      />
                    </label>

                    <label className="block">
                      <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-600">
                        Taille
                      </span>
                      <input
                        type="text"
                        value={row.size}
                        onChange={(event) => updateRow(row.key, { size: event.target.value })}
                        className="mt-1 w-full rounded-lg border border-slate-300 px-2.5 py-2 text-xs"
                        placeholder="Ex: L / 1L"
                      />
                    </label>

                    <label className="block">
                      <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-600">
                        Prix (DH)
                      </span>
                      <input
                        type="number"
                        min="1"
                        step="1"
                        value={row.price}
                        onChange={(event) => updateRow(row.key, { price: event.target.value })}
                        className="mt-1 w-full rounded-lg border border-slate-300 px-2.5 py-2 text-xs"
                        placeholder="120"
                      />
                    </label>

                    <label className="block">
                      <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-600">
                        Ancien prix (optionnel)
                      </span>
                      <input
                        type="number"
                        min="1"
                        step="1"
                        value={row.previousPrice}
                        onChange={(event) =>
                          updateRow(row.key, { previousPrice: event.target.value })
                        }
                        className="mt-1 w-full rounded-lg border border-slate-300 px-2.5 py-2 text-xs"
                        placeholder="140"
                      />
                    </label>

                    <label className="block">
                      <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-600">
                        Stock
                      </span>
                      <input
                        type="number"
                        min="0"
                        step="1"
                        value={row.stock}
                        onChange={(event) => updateRow(row.key, { stock: event.target.value })}
                        className="mt-1 w-full rounded-lg border border-slate-300 px-2.5 py-2 text-xs"
                        placeholder="10"
                      />
                    </label>

                    <label className="block">
                      <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-600">
                        SKU (optionnel)
                      </span>
                      <input
                        type="text"
                        value={row.sku}
                        onChange={(event) => updateRow(row.key, { sku: event.target.value })}
                        className="mt-1 w-full rounded-lg border border-slate-300 px-2.5 py-2 text-xs"
                        placeholder="REF-123"
                      />
                    </label>

                    <label className="block lg:col-span-2">
                      <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-600">
                        Image (optionnel)
                      </span>
                      <input
                        type="text"
                        value={row.image}
                        onChange={(event) => updateRow(row.key, { image: event.target.value })}
                        className="mt-1 w-full rounded-lg border border-slate-300 px-2.5 py-2 text-xs"
                        placeholder="/images/products/mon-produit-rouge.jpg"
                      />
                    </label>
                  </div>

                  <label className="mt-2 inline-flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={row.isActive}
                      onChange={(event) => updateRow(row.key, { isActive: event.target.checked })}
                    />
                    <span className="text-xs font-medium text-slate-700">Variante active</span>
                  </label>

                  {priceInvalid || stockInvalid || previousPriceInvalid ? (
                    <p className="mt-2 text-xs font-medium text-rose-700">
                      Verifiez les nombres: prix et stock doivent etre numeriques. Ancien prix est optionnel.
                    </p>
                  ) : null}
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
      </div>

      <input type="hidden" name={inputName} value={serializedVariants} readOnly />
    </div>
  );
};
