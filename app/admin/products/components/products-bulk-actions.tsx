"use client";

import { useEffect, useMemo, useState } from "react";
import { FormSubmitButton } from "@/components/form-submit-button";

type FormAction = (formData: FormData) => void | Promise<void>;

type ProductsBulkActionsProps = {
  bulkUpdateProductsAction: FormAction;
  filteredProductsCount: number;
  currentPageProductsCount: number;
  selectedCategory: string;
  searchQuery: string;
  currentPage: number;
};

type BulkActionType = "status:active" | "status:inactive" | "stock:set" | "price:set";

const PRODUCT_SELECTION_SELECTOR = 'input[data-admin-product-select="true"]';

const getSelectionCheckboxes = (): HTMLInputElement[] => {
  return Array.from(
    document.querySelectorAll<HTMLInputElement>(PRODUCT_SELECTION_SELECTOR),
  );
};

const actionNeedsNumericValue = (actionType: BulkActionType): boolean => {
  return actionType === "stock:set" || actionType === "price:set";
};

const getActionConfirmationMessage = (
  actionType: BulkActionType,
  selectedCount: number,
  numericValue: string,
): string => {
  if (actionType === "status:active") {
    return `Activer ${selectedCount} produit(s) selectionne(s) ?`;
  }

  if (actionType === "status:inactive") {
    return `Desactiver ${selectedCount} produit(s) selectionne(s) ?`;
  }

  if (actionType === "stock:set") {
    return `Definir le stock a ${numericValue || "0"} pour ${selectedCount} produit(s) ?`;
  }

  return `Definir le prix a ${numericValue || "0"} DH pour ${selectedCount} produit(s) ?`;
};

export const ProductsBulkActions = ({
  bulkUpdateProductsAction,
  filteredProductsCount,
  currentPageProductsCount,
  selectedCategory,
  searchQuery,
  currentPage,
}: ProductsBulkActionsProps) => {
  const [selectedCount, setSelectedCount] = useState(0);
  const [selectableCount, setSelectableCount] = useState(0);
  const [bulkActionType, setBulkActionType] = useState<BulkActionType>("status:active");
  const [bulkNumericValue, setBulkNumericValue] = useState("");

  const isSelectAllChecked =
    selectableCount > 0 && selectedCount > 0 && selectedCount === selectableCount;
  const requiresNumericValue = actionNeedsNumericValue(bulkActionType);

  const numericInputLabel = useMemo(() => {
    if (bulkActionType === "stock:set") {
      return "Valeur stock";
    }

    if (bulkActionType === "price:set") {
      return "Prix (DH)";
    }

    return "Valeur";
  }, [bulkActionType]);

  useEffect(() => {
    const syncSelectionState = () => {
      const checkboxes = getSelectionCheckboxes();
      const checked = checkboxes.filter((checkbox) => checkbox.checked).length;

      setSelectableCount(checkboxes.length);
      setSelectedCount(checked);
    };

    syncSelectionState();

    const handleChange = (event: Event) => {
      const target = event.target;
      if (!(target instanceof HTMLInputElement)) {
        return;
      }

      if (target.matches(PRODUCT_SELECTION_SELECTOR)) {
        syncSelectionState();
      }
    };

    document.addEventListener("change", handleChange, true);
    return () => {
      document.removeEventListener("change", handleChange, true);
    };
  }, [currentPageProductsCount]);

  const applySelectAll = (checked: boolean) => {
    const checkboxes = getSelectionCheckboxes();
    for (const checkbox of checkboxes) {
      checkbox.checked = checked;
    }
    setSelectableCount(checkboxes.length);
    setSelectedCount(checked ? checkboxes.length : 0);
  };

  const handleSubmit = (event: Parameters<NonNullable<JSX.IntrinsicElements["form"]["onSubmit"]>>[0]) => {
    if (selectedCount <= 0) {
      event.preventDefault();
      window.alert("Selectionnez au moins un produit.");
      return;
    }

    if (requiresNumericValue && !bulkNumericValue.trim()) {
      event.preventDefault();
      window.alert("Entrez une valeur numerique pour cette action.");
      return;
    }

    const confirmationMessage = getActionConfirmationMessage(
      bulkActionType,
      selectedCount,
      bulkNumericValue.trim(),
    );

    if (!window.confirm(confirmationMessage)) {
      event.preventDefault();
    }
  };

  if (currentPageProductsCount === 0) {
    return null;
  }

  return (
    <section className="mb-6 rounded-2xl border border-slate-200 bg-white p-4 shadow-card">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        Operations bulk
      </p>
      <p className="mt-1 text-sm text-slate-700">
        Selection actuelle: <span className="font-semibold">{selectedCount}</span> /{" "}
        {currentPageProductsCount} produit(s) sur cette page.
      </p>
      <p className="mt-1 text-xs text-slate-500">
        Total filtres: {filteredProductsCount} produit(s).
      </p>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <label className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700">
          <input
            type="checkbox"
            checked={isSelectAllChecked}
            onChange={(event) => applySelectAll(event.target.checked)}
            aria-label="Selectionner tout le resultat courant"
          />
          Tout selectionner (resultat courant)
        </label>

        <button
          type="button"
          onClick={() => applySelectAll(false)}
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700"
        >
          Vider la selection
        </button>
      </div>

      <form
        id="admin-products-bulk-form"
        action={bulkUpdateProductsAction}
        onSubmit={handleSubmit}
        className="mt-3 grid gap-2 md:grid-cols-[1.2fr_1fr_auto]"
      >
        <input type="hidden" name="returnCategory" value={selectedCategory} />
        <input type="hidden" name="returnSearchQuery" value={searchQuery} />
        <input type="hidden" name="returnPage" value={String(currentPage)} />

        <label className="block">
          <span className="text-xs font-semibold uppercase tracking-wide text-slate-600">
            Action
          </span>
          <select
            name="bulkActionType"
            value={bulkActionType}
            onChange={(event) => setBulkActionType(event.target.value as BulkActionType)}
            className="mt-1 h-10 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-700"
          >
            <option value="status:active">Activer produits</option>
            <option value="status:inactive">Desactiver produits</option>
            <option value="stock:set">Definir stock</option>
            <option value="price:set">Definir prix</option>
          </select>
        </label>

        <label className="block">
          <span className="text-xs font-semibold uppercase tracking-wide text-slate-600">
            {numericInputLabel}
          </span>
          <input
            type="number"
            name="bulkNumericValue"
            value={bulkNumericValue}
            onChange={(event) => setBulkNumericValue(event.target.value)}
            min={bulkActionType === "price:set" ? "0.01" : "0"}
            step={bulkActionType === "price:set" ? "0.01" : "1"}
            inputMode="decimal"
            disabled={!requiresNumericValue}
            placeholder={requiresNumericValue ? "Entrez une valeur" : "Non requis"}
            className="mt-1 h-10 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-700 disabled:cursor-not-allowed disabled:bg-slate-100"
          />
        </label>

        <div className="flex items-end">
          <FormSubmitButton
            idleLabel="Appliquer en lot"
            pendingLabel="Mise a jour..."
            className="h-10 w-full rounded-xl bg-brand-blue px-4 text-sm font-semibold text-white md:w-auto"
          />
        </div>
      </form>
    </section>
  );
};
