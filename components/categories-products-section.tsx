import Link from "next/link";
import { categories } from "@/data/categories";
import { homepageContent } from "@/data/homepage";
import { ProductCard } from "@/components/product-card";
import { getAllProducts } from "@/lib/products";

export const CategoriesProductsSection = async () => {
  const products = await getAllProducts();

  return (
    <section className="bg-brand-light py-14">
      <div className="mx-auto max-w-7xl px-4 sm:px-5 lg:px-6">
        <div className="mb-7 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-2xl font-extrabold text-brand-blue sm:text-3xl">
              {homepageContent.categoriesProducts.title}
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-600">
              {homepageContent.categoriesProducts.subtitle}
            </p>
          </div>
          <Link href="/produits" className="text-sm font-semibold text-brand-orange hover:underline underline-offset-4">
            {homepageContent.categoriesProducts.allProductsCta}
          </Link>
        </div>

        <div className="grid gap-5 lg:grid-cols-12">
          <aside className="lg:col-span-4">
            <div className="h-full rounded-3xl border border-slate-200 bg-white p-5 shadow-card">
              <h3 className="mb-3 text-lg font-bold text-brand-blue">
                {homepageContent.categoriesProducts.categoriesTitle}
              </h3>
              <ul className="space-y-2">
                {categories.map((category) => (
                  <li key={category.id}>
                    <Link
                      href={`/produits?categorie=${category.slug}`}
                      className="block rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-medium text-slate-700 transition hover:border-brand-orange hover:text-brand-orange"
                    >
                      {category.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </aside>

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:col-span-8">
            {products.slice(0, 4).map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};
