import Link from "next/link";
import { categories } from "@/data/categories";
import { ProductCard } from "@/components/product-card";
import { getAllProducts } from "@/lib/products";

const categoryIconPathBySlug: Record<string, string> = {
  bricolage:
    "M4.8 19.2 3 21l1.8-1.8 8.5-8.5-1.8-1.8-8.5 8.5Zm9.8-16.2a1.8 1.8 0 0 1 2.56 0l3.84 3.84a1.8 1.8 0 0 1 0 2.56l-2.01 2.01-6.4-6.4 2.01-2.01ZM7.6 10.7l5.7 5.7-1.3 1.3-5.7-5.7 1.3-1.3Z",
  peinture:
    "M4 11.8 10.5 5.3a2 2 0 0 1 2.83 0l5.37 5.37a2 2 0 0 1 0 2.83L12.2 20H8a4 4 0 0 1-4-4v-4.2Zm8.9-3.7 3.8 3.8",
  outillage:
    "M20.4 6.2a4.1 4.1 0 0 1-5.18 5.18L9.4 17.2a1.6 1.6 0 1 1-2.26-2.26l5.82-5.82A4.1 4.1 0 0 1 18.14 4l-2.08 2.08 1.9 1.9L20.04 5.9c.24.1.47.2.36.3Z",
  electricite: "M13.2 2.7 5.3 13h5l-1.1 8.3L18.7 11h-5.1l-.4-8.3Z",
  plomberie:
    "M14.7 3.2a2.8 2.8 0 0 1 3.96 3.96l-2.02 2.02 1.27 1.27a1 1 0 0 1 0 1.41l-6.5 6.5a3 3 0 0 1-4.24-4.24l6.5-6.5a1 1 0 0 1 1.41 0l1.27 1.27 2.02-2.02Z",
  quincaillerie:
    "M12 2.4a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5Zm-6.6 7.1a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5Zm13.2 0a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5ZM12 16.6a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5Z",
};

const getProductConversionScore = (
  product: Awaited<ReturnType<typeof getAllProducts>>[number],
): number => {
  const ratingScore = product.rating * 20;
  const promoScore = product.isPromo ? 18 : 0;
  const newScore = product.isNew ? 8 : 0;
  const stockScore =
    typeof product.stock === "number"
      ? Math.max(0, Math.min(product.stock, 20))
      : 10;
  return ratingScore + promoScore + newScore + stockScore;
};

export const CategoriesProductsSection = async () => {
  const products = await getAllProducts();
  const featuredProducts = [...products]
    .sort((first, second) => {
      const scoreDiff = getProductConversionScore(second) - getProductConversionScore(first);
      if (scoreDiff !== 0) {
        return scoreDiff;
      }
      return second.rating - first.rating;
    })
    .slice(0, 4);

  const categoryCountMap = new Map<string, number>();
  for (const product of products) {
    const slug = product.categorySlug.trim().toLowerCase();
    categoryCountMap.set(slug, (categoryCountMap.get(slug) ?? 0) + 1);
  }

  const visibleCategories = [...categories]
    .sort((first, second) => {
      const secondCount = categoryCountMap.get(second.slug) ?? 0;
      const firstCount = categoryCountMap.get(first.slug) ?? 0;
      if (secondCount !== firstCount) {
        return secondCount - firstCount;
      }
      return first.name.localeCompare(second.name, "fr");
    })
    .slice(0, 6);

  return (
    <section id="decouvrir-produits" className="bg-[#f1f3f5] pb-6 sm:pb-8">
      <div className="mx-auto max-w-7xl px-4 sm:px-5 lg:px-6">
        <div className="mb-3 rounded-xl border border-slate-200 bg-white px-3 py-3 shadow-[0_8px_18px_rgba(15,42,77,0.08)] sm:mb-4 sm:rounded-2xl sm:px-5 sm:py-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-lg font-extrabold uppercase tracking-tight text-brand-blue sm:text-2xl">
              Decouvrez rapidement les bons produits
            </h2>
            <div className="flex flex-wrap gap-2">
              <Link
                href="/offres"
                className="inline-flex rounded-full border border-orange-200 bg-orange-50 px-2.5 py-0.5 text-[10px] font-bold text-brand-orange transition hover:border-brand-orange sm:px-3 sm:py-1 sm:text-xs"
              >
                Offres actives
              </Link>
              <Link
                href="/produits"
                className="inline-flex rounded-full border border-slate-300 bg-white px-2.5 py-0.5 text-[10px] font-bold text-brand-blue transition hover:border-brand-orange hover:text-brand-orange sm:px-3 sm:py-1 sm:text-xs"
              >
                Catalogue complet
              </Link>
            </div>
          </div>
          <p className="mt-1.5 text-xs text-slate-600 sm:mt-2 sm:text-sm">
            Top ventes recommandees + categories les plus demandees pour commander plus vite.
          </p>
        </div>

        <div className="grid gap-3 sm:gap-5 lg:grid-cols-12">
          <aside className="lg:col-span-3">
            <div className="lg:hidden">
              <div className="mb-2 flex items-center justify-between gap-2">
                <h3 className="text-base font-extrabold uppercase tracking-wide text-brand-blue">
                  Categories phares
                </h3>
                <Link
                  href="/produits"
                  className="text-xs font-bold text-brand-blue transition hover:text-brand-orange"
                >
                  Voir tout
                </Link>
              </div>
              <ul className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
                {visibleCategories.map((category) => (
                  <li key={category.id} className="shrink-0">
                    <Link
                      href={`/produits?categorie=${category.slug}`}
                      className="flex min-w-[170px] items-center justify-between gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold text-slate-700 shadow-[0_8px_18px_rgba(15,42,77,0.08)] transition hover:border-orange-200 hover:bg-orange-50 hover:text-brand-orange"
                    >
                      <span className="flex items-center gap-2">
                        <span className="inline-flex h-6 w-6 items-center justify-center rounded-md bg-orange-50 text-brand-orange">
                          <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="currentColor" aria-hidden>
                            <path d={categoryIconPathBySlug[category.slug] ?? categoryIconPathBySlug.bricolage} />
                          </svg>
                        </span>
                        <span className="line-clamp-1">{category.name}</span>
                      </span>
                      <span className="text-[10px] font-bold text-slate-500">
                        {categoryCountMap.get(category.slug) ?? 0}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            <div className="hidden overflow-hidden rounded-xl border border-slate-200 bg-white shadow-[0_10px_22px_rgba(15,42,77,0.08)] sm:rounded-2xl lg:block">
              <h3 className="bg-brand-blue px-4 py-2.5 text-base font-extrabold uppercase tracking-wide text-white sm:px-5 sm:py-3 sm:text-xl">
                Categories phares
              </h3>
              <ul className="space-y-1 p-3 sm:p-4">
                {visibleCategories.map((category) => (
                  <li key={category.id}>
                    <Link
                      href={`/produits?categorie=${category.slug}`}
                      className="flex items-center justify-between gap-2 rounded-lg px-2 py-2 text-sm font-semibold text-slate-700 transition hover:bg-orange-50 hover:text-brand-orange sm:gap-3 sm:rounded-xl sm:px-2.5 sm:py-2.5 sm:text-[1.02rem]"
                    >
                      <span className="flex items-center gap-2">
                        <span className="inline-flex h-6 w-6 items-center justify-center rounded-md bg-orange-50 text-brand-orange sm:h-7 sm:w-7 sm:rounded-lg">
                          <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 sm:h-4 sm:w-4" fill="currentColor" aria-hidden>
                            <path d={categoryIconPathBySlug[category.slug] ?? categoryIconPathBySlug.bricolage} />
                          </svg>
                        </span>
                        {category.name}
                      </span>
                      <span className="text-[10px] font-bold text-slate-500 sm:text-xs">
                        {categoryCountMap.get(category.slug) ?? 0}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
              <Link
                href="/produits"
                className="block border-t border-slate-200 px-4 py-3 text-sm font-bold text-brand-blue transition hover:text-brand-orange sm:px-5 sm:py-4 sm:text-base"
              >
                Voir toutes les categories
              </Link>
            </div>
          </aside>

          <div className="lg:col-span-9">
            <div className="mb-2 flex items-center justify-between gap-2 sm:mb-3">
              <h3 className="text-[1.15rem] font-extrabold uppercase tracking-tight text-brand-blue sm:text-[1.85rem]">
                Top ventes recommandees
              </h3>
              <Link
                href="/produits"
                className="inline-flex items-center gap-1 text-sm font-bold text-brand-blue transition hover:text-brand-orange sm:text-xl"
              >
                Voir tout
                <span aria-hidden>&rarr;</span>
              </Link>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-2 sm:gap-4 xl:grid-cols-4">
              {featuredProducts.map((product) => (
                <ProductCard key={product.id} product={product} variant="homepage" />
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
