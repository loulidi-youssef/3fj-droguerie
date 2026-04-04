"use client";

import { useMemo, useState } from "react";

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

export const AdminProductVariantsInput = ({
  inputName,
  initialVariants = [],
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
    <div className="md:col-span-2">
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

        {rows.length === 0 ? (
          <p className="rounded-lg bg-white p-3 text-xs text-slate-500">
            Aucune variante. Le produit utilisera son prix et son stock principaux.
          </p>
        ) : (
          <div className="space-y-3">
            {rows.map((row, index) => {
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
