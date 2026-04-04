"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { FormEvent, useEffect, useRef, useState } from "react";
import { businessInfo } from "@/data/business";
import { categories, getCategoryBySlug } from "@/data/categories";
import { homepageContent } from "@/data/homepage";
import { useCart } from "@/components/cart-provider";

export const Header = () => {
  const router = useRouter();
  const pathname = usePathname();
  const { itemCount } = useCart();
  const [query, setQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [isCategoriesOpen, setIsCategoriesOpen] = useState(false);
  const categoriesDropdownRef = useRef<HTMLDivElement | null>(null);

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
    const onPointerDown = (event: MouseEvent) => {
      const target = event.target as Node | null;
      if (!target) {
        return;
      }

      if (categoriesDropdownRef.current?.contains(target)) {
        return;
      }

      setIsCategoriesOpen(false);
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
          <form onSubmit={onSubmit} className="relative w-full lg:w-80">
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={homepageContent.header.searchPlaceholder}
              className="w-full rounded-full border border-slate-300 bg-white px-4 py-2.5 text-sm outline-none transition focus:border-brand-orange focus:ring-2 focus:ring-orange-100"
            />
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
