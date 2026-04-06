"use client";

import { useEffect, useMemo, useState } from "react";
import type { Category } from "@/types";

type ProductSortOption = "defaut" | "prix-asc" | "prix-desc" | "nouveaux";

type MobileProductsFiltersProps = {
  categories: Category[];
  rawQuery: string;
  selectedCategory: string;
  sort: ProductSortOption;
  hasActiveFilters: boolean;
};

const sortOptions: Array<{ value: ProductSortOption; label: string }> = [
  { value: "defaut", label: "Pertinence" },
  { value: "nouveaux", label: "Plus recents" },
  { value: "prix-asc", label: "Prix croissant" },
  { value: "prix-desc", label: "Prix decroissant" },
];

const getSortLabel = (sort: ProductSortOption): string => {
  const matched = sortOptions.find((option) => option.value === sort);
  return matched?.label ?? "Pertinence";
};

export const MobileProductsFilters = ({
  categories,
  rawQuery,
  selectedCategory,
  sort,
  hasActiveFilters,
}: MobileProductsFiltersProps) => {
  const [openSheet, setOpenSheet] = useState<"filter" | "sort" | null>(null);

  const currentSortLabel = useMemo(() => getSortLabel(sort), [sort]);

  useEffect(() => {
    if (!openSheet) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [openSheet]);

  const buildCategoryUrl = (categorySlug: string | null): string => {
    const params = new URLSearchParams();

    if (categorySlug) {
      params.set("categorie", categorySlug);
    }

    if (rawQuery) {
      params.set("q", rawQuery);
    }

    if (sort !== "defaut") {
      params.set("tri", sort);
    }

    const queryString = params.toString();
    return queryString ? `/produits?${queryString}` : "/produits";
  };

  const isSheetOpen = openSheet !== null;

  return (
    <div className="mt-2 md:hidden">
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => setOpenSheet("filter")}
          className={`inline-flex h-9 items-center justify-center gap-1.5 rounded-lg border bg-white px-3 text-[11px] font-semibold text-brand-blue transition ${
            hasActiveFilters
              ? "border-brand-orange text-brand-orange"
              : "border-slate-300 hover:border-brand-orange hover:text-brand-orange"
          }`}
          aria-haspopup="dialog"
          aria-expanded={openSheet === "filter"}
        >
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
            <path d="M4 7h16M7 12h10M10 17h4" />
          </svg>
          Filtrer
        </button>

        <button
          type="button"
          onClick={() => setOpenSheet("sort")}
          className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 text-[11px] font-semibold text-brand-blue transition hover:border-brand-orange hover:text-brand-orange"
          aria-haspopup="dialog"
          aria-expanded={openSheet === "sort"}
        >
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
            <path d="M7 6h10M5 12h14M9 18h6" />
          </svg>
          Trier
          <span className="text-[10px] text-slate-500">{currentSortLabel}</span>
        </button>
      </div>

      <div className="mt-2 -mx-0.5 overflow-x-auto pb-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
        <div className="flex min-w-max gap-1.5 px-0.5">
          <a
            href={buildCategoryUrl(null)}
            className={`inline-flex h-7 items-center whitespace-nowrap rounded-full border px-2.5 text-[10px] font-semibold transition ${
              !selectedCategory
                ? "border-brand-blue bg-brand-blue text-white"
                : "border-slate-300 bg-white text-slate-700 hover:border-brand-orange hover:text-brand-orange"
            }`}
          >
            Toutes
          </a>
          {categories.map((category) => (
            <a
              key={category.id}
              href={buildCategoryUrl(category.slug)}
              className={`inline-flex h-7 items-center whitespace-nowrap rounded-full border px-2.5 text-[10px] font-semibold transition ${
                selectedCategory === category.slug
                  ? "border-brand-orange bg-brand-orange text-white"
                  : "border-slate-300 bg-white text-slate-700 hover:border-brand-orange hover:text-brand-orange"
              }`}
            >
              {category.name}
            </a>
          ))}
        </div>
      </div>

      <div
        className={`fixed inset-0 z-[130] md:hidden ${isSheetOpen ? "" : "pointer-events-none"}`}
        aria-hidden={!isSheetOpen}
      >
        <button
          type="button"
          onClick={() => setOpenSheet(null)}
          className={`absolute inset-0 bg-slate-950/40 transition-opacity duration-300 ${
            isSheetOpen ? "opacity-100" : "opacity-0"
          }`}
          aria-label="Fermer les filtres"
        />

        <div
          role="dialog"
          aria-modal="true"
          className={`absolute inset-x-0 bottom-0 max-h-[85vh] overflow-y-auto rounded-t-2xl bg-white p-4 pb-[calc(0.9rem+env(safe-area-inset-bottom))] shadow-[0_-12px_30px_rgba(15,42,77,0.16)] transition-transform duration-300 ${
            isSheetOpen ? "translate-y-0" : "translate-y-full"
          }`}
        >
          <div className="mb-3 flex items-center justify-between">
            <p className="text-sm font-bold text-brand-blue">
              {openSheet === "sort" ? "Trier les produits" : "Filtrer les produits"}
            </p>
            <button
              type="button"
              onClick={() => setOpenSheet(null)}
              className="inline-flex h-8 w-8 items-center justify-center rounded-full text-slate-600 transition hover:bg-slate-100"
              aria-label="Fermer"
            >
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
                <path d="M6 6l12 12M18 6 6 18" />
              </svg>
            </button>
          </div>

          {openSheet === "sort" ? (
            <form action="/produits" method="get" className="space-y-3">
              {rawQuery ? <input type="hidden" name="q" value={rawQuery} /> : null}
              {selectedCategory ? <input type="hidden" name="categorie" value={selectedCategory} /> : null}

              <div className="space-y-2">
                {sortOptions.map((option) => (
                  <label
                    key={option.value}
                    className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700"
                  >
                    <input
                      type="radio"
                      name="tri"
                      value={option.value}
                      defaultChecked={sort === option.value}
                      className="h-4 w-4 accent-brand-orange"
                    />
                    <span>{option.label}</span>
                  </label>
                ))}
              </div>

              <button
                type="submit"
                className="inline-flex h-10 w-full items-center justify-center rounded-lg bg-brand-blue text-sm font-semibold text-white transition hover:bg-slate-900"
              >
                Appliquer le tri
              </button>
            </form>
          ) : (
            <form action="/produits" method="get" className="space-y-3">
              <label className="block">
                <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-600">
                  Recherche
                </span>
                <input
                  type="search"
                  name="q"
                  defaultValue={rawQuery}
                  placeholder="Ex: perceuse, marteau..."
                  className="mt-1 h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-700 outline-none transition focus:border-brand-orange focus:ring-2 focus:ring-orange-100"
                />
              </label>

              <label className="block">
                <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-600">
                  Categorie
                </span>
                <select
                  name="categorie"
                  defaultValue={selectedCategory}
                  className="mt-1 h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-700 outline-none transition focus:border-brand-orange focus:ring-2 focus:ring-orange-100"
                >
                  <option value="">Toutes les categories</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.slug}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </label>

              {sort !== "defaut" ? <input type="hidden" name="tri" value={sort} /> : null}

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="submit"
                  className="inline-flex h-10 items-center justify-center rounded-lg bg-brand-blue text-sm font-semibold text-white transition hover:bg-slate-900"
                >
                  Appliquer
                </button>
                <a
                  href="/produits"
                  className="inline-flex h-10 items-center justify-center rounded-lg border border-slate-300 bg-white text-sm font-semibold text-slate-700 transition hover:border-brand-orange hover:text-brand-orange"
                >
                  Reset
                </a>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
