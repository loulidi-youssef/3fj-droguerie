"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { FormEvent, useEffect, useRef, useState } from "react";
import { businessInfo } from "@/data/business";
import { categories, getCategoryBySlug } from "@/data/categories";
import { homepageContent } from "@/data/homepage";
import { useCart } from "@/components/cart-provider";
import { CartDrawer } from "@/components/cart-drawer";
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
  const [isCartDrawerOpen, setIsCartDrawerOpen] = useState(false);
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
        const response = await fetch(
          "/api/products?minimal=1&includeOffers=0",
          { cache: "no-store" },
        );
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
    setIsCartDrawerOpen(false);
  }, [pathname]);

  const activeCategoryName = selectedCategory
    ? getCategoryBySlug(selectedCategory)?.name
    : undefined;
  const homeNavItem = homepageContent.header.navItems.find((item) => item.href === "/");
  const remainingNavItems = homepageContent.header.navItems.filter(
    (item) => item.href !== "/",
  );
  const isHomeActive = pathname === "/";

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
    <>
      <header className="relative z-40 border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-3 sm:px-5 lg:flex-row lg:items-center lg:gap-6 lg:px-6">
        <Link href="/" className="leading-none">
          <span className="block text-[2.35rem] font-black tracking-tight text-brand-orange">3FJ</span>
          <span className="-mt-1 block text-[1.75rem] font-black uppercase tracking-tight text-brand-blue">
            DROGUERIE
          </span>
          <span className="-mt-0.5 block text-[10px] font-semibold uppercase tracking-[0.07em] text-brand-orange">
            Materiaux de construction
          </span>
        </Link>

        <nav className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm font-semibold text-slate-700 lg:flex-1 lg:justify-center">
          {homeNavItem ? (
            <Link
              href={homeNavItem.href}
              className={`transition hover:text-brand-orange ${
                isHomeActive ? "text-brand-orange" : ""
              }`}
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
              className={`inline-flex items-center gap-1 transition hover:text-brand-orange ${
                pathname === "/produits" && selectedCategory ? "text-brand-orange" : ""
              }`}
            >
              {homepageContent.header.categoriesLabel}
              <svg viewBox="0 0 20 20" className="h-3.5 w-3.5" fill="currentColor" aria-hidden>
                <path d="m5.5 7.5 4.5 5 4.5-5H5.5Z" />
              </svg>
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
            <Link
              key={item.href}
              href={item.href}
              className={`transition hover:text-brand-orange ${
                pathname === item.href ? "text-brand-orange" : ""
              }`}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="flex w-full flex-col gap-2 sm:flex-row sm:items-center lg:w-auto">
          <form onSubmit={onSubmit} className="relative w-full sm:w-[17rem] lg:w-[20rem]" ref={searchDropdownRef}>
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
              className="h-11 w-full rounded-full border border-slate-300 bg-slate-50 pl-4 pr-11 text-sm outline-none transition focus:border-brand-orange focus:bg-white focus:ring-2 focus:ring-orange-100"
            />
            <button
              type="submit"
              aria-label="Lancer la recherche"
              className="absolute right-1 top-1 inline-flex h-9 w-9 items-center justify-center rounded-full text-slate-600 transition hover:bg-slate-100 hover:text-brand-blue"
            >
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="6.5" />
                <path d="m16 16 4.5 4.5" />
              </svg>
            </button>

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

          <div className="flex items-center gap-2">
            <CustomerAuthNav iconOnly />

            <button
              type="button"
              onClick={() => setIsCartDrawerOpen(true)}
              className="relative inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-300 bg-white text-slate-700 transition hover:border-brand-orange hover:text-brand-orange"
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
            </button>

            <a
              href={`https://wa.me/${businessInfo.whatsappPhone}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-[#25D366] text-white shadow-sm transition hover:brightness-95"
              aria-label={homepageContent.header.whatsappLabel}
            >
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor" aria-hidden>
                <path d="M19.05 4.94A9.86 9.86 0 0012.02 2c-5.45 0-9.88 4.43-9.88 9.88 0 1.74.45 3.45 1.32 4.96L2 22l5.31-1.39a9.84 9.84 0 004.71 1.2h.01c5.45 0 9.88-4.43 9.88-9.88 0-2.64-1.03-5.12-2.86-6.99zm-7.03 15.2h-.01a8.2 8.2 0 01-4.17-1.14l-.3-.18-3.15.83.84-3.07-.2-.31a8.2 8.2 0 01-1.26-4.35c0-4.52 3.68-8.2 8.21-8.2 2.19 0 4.24.85 5.79 2.4a8.13 8.13 0 012.4 5.8c0 4.52-3.68 8.21-8.15 8.22zm4.5-6.16c-.25-.12-1.49-.74-1.72-.82-.23-.08-.4-.12-.57.12-.17.25-.66.82-.8.99-.15.17-.29.19-.54.06-.25-.12-1.05-.39-2-1.24-.74-.66-1.24-1.48-1.39-1.73-.14-.25-.02-.39.11-.51.12-.12.25-.29.37-.44.12-.15.17-.25.25-.41.08-.17.04-.31-.02-.43-.06-.12-.57-1.37-.78-1.88-.21-.5-.43-.43-.57-.44h-.49c-.17 0-.43.06-.66.31-.23.25-.87.85-.87 2.07 0 1.22.89 2.4 1.01 2.57.12.17 1.75 2.68 4.24 3.75.59.25 1.05.4 1.41.51.59.19 1.12.16 1.54.1.47-.07 1.49-.61 1.7-1.21.21-.6.21-1.12.15-1.21-.06-.1-.23-.16-.48-.29z" />
              </svg>
            </a>
          </div>
        </div>
        </div>
      </header>
      <CartDrawer isOpen={isCartDrawerOpen} onClose={() => setIsCartDrawerOpen(false)} />
    </>
  );
};
