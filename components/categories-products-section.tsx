import Link from "next/link";
import { categories } from "@/data/categories";
import { ProductCard } from "@/components/product-card";
import { getAllProducts } from "@/lib/products";

const categoryIconPathBySlug: Record<string, string> = {
  bricolage: "M4.8 19.2 3 21l1.8-1.8 8.5-8.5-1.8-1.8-8.5 8.5Zm9.8-16.2a1.8 1.8 0 0 1 2.56 0l3.84 3.84a1.8 1.8 0 0 1 0 2.56l-2.01 2.01-6.4-6.4 2.01-2.01ZM7.6 10.7l5.7 5.7-1.3 1.3-5.7-5.7 1.3-1.3Z",
  peinture: "M4 11.8 10.5 5.3a2 2 0 0 1 2.83 0l5.37 5.37a2 2 0 0 1 0 2.83L12.2 20H8a4 4 0 0 1-4-4v-4.2Zm8.9-3.7 3.8 3.8",
  outillage: "M20.4 6.2a4.1 4.1 0 0 1-5.18 5.18L9.4 17.2a1.6 1.6 0 1 1-2.26-2.26l5.82-5.82A4.1 4.1 0 0 1 18.14 4l-2.08 2.08 1.9 1.9L20.04 5.9c.24.1.47.2.36.3Z",
  electricite: "M13.2 2.7 5.3 13h5l-1.1 8.3L18.7 11h-5.1l-.4-8.3Z",
  plomberie: "M14.7 3.2a2.8 2.8 0 0 1 3.96 3.96l-2.02 2.02 1.27 1.27a1 1 0 0 1 0 1.41l-6.5 6.5a3 3 0 0 1-4.24-4.24l6.5-6.5a1 1 0 0 1 1.41 0l1.27 1.27 2.02-2.02Z",
  quincaillerie: "M12 2.4a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5Zm-6.6 7.1a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5Zm13.2 0a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5ZM12 16.6a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5Z",
};

export const CategoriesProductsSection = async () => {
  const products = await getAllProducts();
  const featuredProducts = products.slice(0, 4);
  const visibleCategories = categories.slice(0, 6);

  return (
    <section className="bg-[#f1f3f5] pb-8">
      <div className="mx-auto max-w-7xl px-4 sm:px-5 lg:px-6">
        <div className="grid gap-5 lg:grid-cols-12">
          <aside className="lg:col-span-3">
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_10px_22px_rgba(15,42,77,0.08)]">
              <h2 className="bg-brand-blue px-5 py-3 text-2xl font-extrabold uppercase tracking-wide text-white">
                Categories
              </h2>
              <ul className="space-y-1 p-4">
                {visibleCategories.map((category) => (
                  <li key={category.id}>
                    <Link
                      href={`/produits?categorie=${category.slug}`}
                      className="flex items-center gap-3 rounded-xl px-2.5 py-2.5 text-[1.05rem] font-semibold text-slate-700 transition hover:bg-orange-50 hover:text-brand-orange"
                    >
                      <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-orange-50 text-brand-orange">
                        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden>
                          <path d={categoryIconPathBySlug[category.slug] ?? categoryIconPathBySlug.bricolage} />
                        </svg>
                      </span>
                      {category.name}
                    </Link>
                  </li>
                ))}
              </ul>
              <Link
                href="/produits"
                className="block border-t border-slate-200 px-5 py-4 text-lg font-bold text-brand-blue transition hover:text-brand-orange"
              >
                Voir toutes les categories
              </Link>
            </div>
          </aside>

          <div className="lg:col-span-9">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-[2rem] font-extrabold uppercase tracking-tight text-brand-blue">
                Produits populaires
              </h2>
              <Link
                href="/produits"
                className="inline-flex items-center gap-1 text-2xl font-bold text-brand-blue transition hover:text-brand-orange"
              >
                Voir tout
                <span aria-hidden>&rarr;</span>
              </Link>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
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
