"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { FormEvent, useEffect, useRef, useState } from "react";
import { businessInfo } from "@/data/business";
import { categories, getCategoryBySlug } from "@/data/categories";
import { homepageContent } from "@/data/homepage";
import { useCart } from "@/components/cart-provider";
import { CustomerAuthNav } from "@/components/customer-auth-nav";

export const Header = () => {
  type ProductSuggestion = {
    id: string;
    name: string;
    slug: string;
  };

  const router = useRouter();
  const pathname = usePathname();
  const { itemCount } = useCart();
  const [query, setQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [isCategoriesOpen, setIsCategoriesOpen] = useState(false);
  const [allProducts, setAllProducts] = useState<ProductSuggestion[]>([]);
  const [suggestions, setSuggestions] = useState<ProductSuggestion[]>([]);
  const [isSuggestionsOpen, setIsSuggestionsOpen] = useState(false);
  const [highlightedSuggestionIndex, setHighlightedSuggestionIndex] = useState(-1);
  const categoriesDropdownRef = useRef<HTMLDivElement | null>(null);
  const searchDropdownRef = useRef<HTMLFormElement | null>(null);

  const computeSuggestions = (input: string, products: ProductSuggestion[]) => {
    const normalizedInput = input.trim().toLowerCase();
    if (!normalizedInput) {
      return [];
    }

    const startsWithMatches: ProductSuggestion[] = [];
    const containsMatches: ProductSuggestion[] = [];

    for (const product of products) {
      const normalizedName = product.name.toLowerCase();

      if (normalizedName.startsWith(normalizedInput)) {
        startsWithMatches.push(product);
      } else if (normalizedName.includes(normalizedInput)) {
        containsMatches.push(product);
      }
    }

    const sorter = (first: ProductSuggestion, second: ProductSuggestion) =>
      first.name.localeCompare(second.name);

    startsWithMatches.sort(sorter);
    containsMatches.sort(sorter);

    return [...startsWithMatches, ...containsMatches].slice(0, 7);
  };

  useEffect(() => {
    const syncCategoryFromUrl = () => {
      const params = new URLSearchParams(window.location.search);
      setSelectedCategory(params.get("categorie")?.toLowerCase() ?? "");
    };

    syncCategoryFromUrl();
    window.addEventListener("popstate", syncCategoryFromUrl);

    return () => {
      window.removeEventListener("popstate", syncCategoryFromUrl);
    };
  }, [pathname]);

  useEffect(() => {
    let isMounted = true;

    const fetchProducts = async () => {
      try {
        const response = await fetch("/api/products", { cache: "no-store" });
        if (!response.ok) {
          return;
        }

        const payload = (await response.json()) as {
          products?: Array<{ id: string; name: string; slug: string }>;
        };

        if (!isMounted) {
          return;
        }

        const suggestionsSource = (payload.products ?? []).map((product) => ({
          id: product.id,
          name: product.name,
          slug: product.slug,
        }));

        setAllProducts(suggestionsSource);
      } catch {
        if (!isMounted) {
          return;
        }
        setAllProducts([]);
      }
    };

    void fetchProducts();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    const nextSuggestions = computeSuggestions(query, allProducts);
    setSuggestions(nextSuggestions);
    setHighlightedSuggestionIndex(-1);

    if (!query.trim()) {
      setIsSuggestionsOpen(false);
    }
  }, [allProducts, query]);

  useEffect(() => {
    const onPointerDown = (event: MouseEvent) => {
      const target = event.target as Node | null;
      if (!target) {
        return;
      }

      if (!categoriesDropdownRef.current?.contains(target)) {
        setIsCategoriesOpen(false);
      }

      if (!searchDropdownRef.current?.contains(target)) {
        setIsSuggestionsOpen(false);
        setHighlightedSuggestionIndex(-1);
      }
    };

    const onEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsCategoriesOpen(false);
      }
    };

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onEscape);

    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onEscape);
    };
  }, []);

  useEffect(() => {
    setIsCategoriesOpen(false);
    setIsSuggestionsOpen(false);
  }, [pathname]);

  const activeCategoryName = selectedCategory
    ? getCategoryBySlug(selectedCategory)?.name
    : undefined;
  const homeNavItem = homepageContent.header.navItems.find((item) => item.href === "/");
  const remainingNavItems = homepageContent.header.navItems.filter(
    (item) => item.href !== "/",
  );

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const value = query.trim();
    if (!value) {
      router.push("/produits");
      return;
    }
    router.push(`/produits?q=${encodeURIComponent(value)}`);
    setIsSuggestionsOpen(false);
    setHighlightedSuggestionIndex(-1);
  };

  const openSuggestion = (suggestion: ProductSuggestion) => {
    setQuery(suggestion.name);
    setIsSuggestionsOpen(false);
    setHighlightedSuggestionIndex(-1);
    router.push(`/produits/${suggestion.slug}`);
  };

  return (
    <header className="relative z-40 border-b border-slate-200/80 bg-white/95 backdrop-blur">
      <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-4 sm:px-5 lg:flex-row lg:items-center lg:justify-between lg:px-6">
        <Link href="/" className="text-2xl font-extrabold tracking-tight text-brand-blue sm:text-[1.75rem]">
          3FJ <span className="text-brand-orange">Droguerie</span>
        </Link>

        <nav className="flex flex-wrap items-center gap-4 text-sm font-semibold text-slate-700 lg:gap-5">
          {homeNavItem ? (
            <Link
              href={homeNavItem.href}
              className="transition hover:text-brand-orange hover:underline"
            >
              {homeNavItem.label}
            </Link>
          ) : null}

          <div ref={categoriesDropdownRef} className="relative">
            <button
              type="button"
              onClick={() => setIsCategoriesOpen((current) => !current)}
              aria-expanded={isCategoriesOpen}
              aria-haspopup="menu"
              className={`rounded-full px-2 py-1 transition hover:text-brand-orange ${
                pathname === "/produits" && selectedCategory ? "text-brand-orange" : ""
              }`}
            >
              {homepageContent.header.categoriesLabel}
              {activeCategoryName ? `: ${activeCategoryName}` : ""}
            </button>
            <div
              className={`absolute left-0 top-full z-[80] mt-2 min-w-56 rounded-2xl border border-slate-200 bg-white p-2 shadow-xl ${
                isCategoriesOpen ? "block" : "hidden"
              }`}
            >
              <Link
                href="/produits"
                onClick={() => {
                  setSelectedCategory("");
                  setIsCategoriesOpen(false);
                }}
                className={`block rounded-xl px-3 py-2 text-sm ${
                  !selectedCategory
                    ? "bg-brand-blue text-white"
                    : "text-slate-700 hover:bg-slate-100"
                }`}
              >
                Toutes les categories
              </Link>
              {categories.map((category) => (
                <Link
                  key={category.id}
                  href={`/produits?categorie=${category.slug}`}
                  onClick={() => {
                    setSelectedCategory(category.slug);
                    setIsCategoriesOpen(false);
                  }}
                  className={`mt-1 block rounded-xl px-3 py-2 text-sm ${
                    selectedCategory === category.slug
                      ? "bg-brand-orange text-white"
                      : "text-slate-700 hover:bg-slate-100"
                  }`}
                >
                  {category.name}
                </Link>
              ))}
            </div>
          </div>

          {remainingNavItems.map((item) => (
            <Link key={item.href} href={item.href} className="transition hover:text-brand-orange hover:underline">
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="flex w-full flex-col gap-3 lg:w-auto lg:flex-row lg:items-center">
          <form onSubmit={onSubmit} className="relative w-full lg:w-80" ref={searchDropdownRef}>
            <input
              type="search"
              value={query}
              onChange={(event) => {
                const value = event.target.value;
                setQuery(value);
                if (value.trim()) {
                  setIsSuggestionsOpen(true);
                } else {
                  setIsSuggestionsOpen(false);
                }
              }}
              onFocus={() => {
                if (query.trim() && suggestions.length > 0) {
                  setIsSuggestionsOpen(true);
                }
              }}
              onKeyDown={(event) => {
                if (!isSuggestionsOpen || suggestions.length === 0) {
                  return;
                }

                if (event.key === "ArrowDown") {
                  event.preventDefault();
                  setHighlightedSuggestionIndex((current) =>
                    Math.min(current + 1, suggestions.length - 1),
                  );
                } else if (event.key === "ArrowUp") {
                  event.preventDefault();
                  setHighlightedSuggestionIndex((current) => Math.max(current - 1, 0));
                } else if (event.key === "Enter" && highlightedSuggestionIndex >= 0) {
                  event.preventDefault();
                  const suggestion = suggestions[highlightedSuggestionIndex];
                  if (suggestion) {
                    openSuggestion(suggestion);
                  }
                } else if (event.key === "Escape") {
                  setIsSuggestionsOpen(false);
                  setHighlightedSuggestionIndex(-1);
                }
              }}
              placeholder={homepageContent.header.searchPlaceholder}
              className="w-full rounded-full border border-slate-300 bg-white px-4 py-2.5 text-sm outline-none transition focus:border-brand-orange focus:ring-2 focus:ring-orange-100"
            />

            {isSuggestionsOpen && suggestions.length > 0 ? (
              <div className="absolute left-0 right-0 top-[calc(100%+6px)] z-[85] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl">
                <ul className="max-h-72 overflow-y-auto py-1">
                  {suggestions.map((suggestion, index) => (
                    <li key={suggestion.id}>
                      <button
                        type="button"
                        onClick={() => openSuggestion(suggestion)}
                        className={`flex w-full items-center justify-between px-3 py-2 text-left text-sm transition ${
                          index === highlightedSuggestionIndex
                            ? "bg-slate-100 text-brand-blue"
                            : "text-slate-700 hover:bg-slate-50"
                        }`}
                      >
                        <span>{suggestion.name}</span>
                        <span className="text-xs text-slate-400">Produit</span>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </form>

          <Link
            href="/panier"
            className="relative inline-flex h-11 w-11 items-center justify-center rounded-full border border-slate-300 bg-white text-slate-700 transition hover:border-brand-orange hover:text-brand-orange"
            aria-label={homepageContent.header.cartAriaLabel}
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M2 3h3l2.5 11h10L20 6H6" />
              <circle cx="10" cy="19" r="1.5" />
              <circle cx="17" cy="19" r="1.5" />
            </svg>
            {itemCount > 0 ? (
              <span className="absolute -right-1 -top-1 rounded-full bg-brand-orange px-1.5 py-0.5 text-[10px] font-bold text-white">
                {itemCount}
              </span>
            ) : null}
          </Link>

          <CustomerAuthNav />

          <a
            href={`https://wa.me/${businessInfo.whatsappPhone}`}
            target="_blank"
            rel="noreferrer"
            className="rounded-full bg-brand-blue px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-brand-blue/15 transition hover:bg-slate-900"
          >
            {homepageContent.header.whatsappLabel}
          </a>
        </div>
      </div>
    </header>
  );
};
