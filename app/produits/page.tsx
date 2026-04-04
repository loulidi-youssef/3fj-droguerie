import type { Metadata } from "next";
import { ProductCard } from "@/components/product-card";
import { categories, getCategoryBySlug } from "@/data/categories";
import { getAllProducts } from "@/lib/products";

type ProductSortOption = "defaut" | "prix-asc" | "prix-desc" | "nouveaux";

type ProductsPageProps = {
  searchParams: {
    q?: string | string[];
    categorie?: string | string[];
    tri?: string | string[];
  };
};

export const metadata: Metadata = {
  title: "Produits",
  description:
    "Decouvrez nos produits de droguerie a Fes: peinture, outillage et materiaux de construction.",
};

const getSingleSearchParam = (value: string | string[] | undefined): string => {
  if (typeof value === "string") return value;
  if (Array.isArray(value)) return value[0] ?? "";
  return "";
};

const normalizeSort = (value: string): ProductSortOption => {
  const normalized = value.trim().toLowerCase();

  if (
    normalized === "prix-asc" ||
    normalized === "prix-desc" ||
    normalized === "nouveaux"
  ) {
    return normalized;
  }

  return "defaut";
};

export default async function ProduitsPage({ searchParams }: ProductsPageProps) {
  const products = await getAllProducts();

  const selectedCategory = getSingleSearchParam(searchParams.categorie)
    .trim()
    .toLowerCase();
  const rawQuery = getSingleSearchParam(searchParams.q).trim();
  const query = rawQuery.toLowerCase();
  const sort = normalizeSort(getSingleSearchParam(searchParams.tri));

  const filteredByCategory = selectedCategory
    ? products.filter((product) => product.categorySlug === selectedCategory)
    : products;

  const filteredProducts = query
    ? filteredByCategory.filter((product) =>
        product.name.toLowerCase().includes(query),
      )
    : filteredByCategory;

  const sortedProducts = [...filteredProducts];

  if (sort === "prix-asc") {
    sortedProducts.sort((first, second) => first.price - second.price);
  } else if (sort === "prix-desc") {
    sortedProducts.sort((first, second) => second.price - first.price);
  } else if (sort === "nouveaux") {
    sortedProducts.sort((first, second) => {
      const firstTime = first.createdAt ? new Date(first.createdAt).getTime() : 0;
      const secondTime = second.createdAt ? new Date(second.createdAt).getTime() : 0;
      return secondTime - firstTime;
    });
  }

  const activeCategoryName = selectedCategory
    ? getCategoryBySlug(selectedCategory)?.name
    : undefined;

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

  return (
    <section className="section-padding bg-brand-light">
      <div className="mx-auto max-w-7xl px-4 sm:px-5 lg:px-6">
        <h1 className="text-3xl font-extrabold tracking-tight text-brand-blue sm:text-4xl">
          Produits de Droguerie a Fes
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-slate-600 sm:text-[0.95rem]">
          Vente en gros et detail de materiaux de construction, peinture et outillage.
        </p>

        <form action="/produits" method="get" className="mt-5 rounded-2xl bg-white p-4 shadow-card">
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
            <label className="block lg:col-span-2">
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-600">
                Recherche produit (nom)
              </span>
              <input
                type="search"
                name="q"
                defaultValue={rawQuery}
                placeholder="Ex: perceuse, marteau..."
                className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-700 outline-none focus:border-brand-orange"
              />
            </label>

            <label className="block">
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-600">
                Categorie
              </span>
              <select
                name="categorie"
                defaultValue={selectedCategory}
                className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-brand-orange"
              >
                <option value="">Toutes les categories</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.slug}>
                    {category.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-600">
                Tri
              </span>
              <select
                name="tri"
                defaultValue={sort}
                className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-brand-orange"
              >
                <option value="defaut">Ordre par defaut</option>
                <option value="nouveaux">Plus recents</option>
                <option value="prix-asc">Prix croissant</option>
                <option value="prix-desc">Prix decroissant</option>
              </select>
            </label>
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="submit"
              className="inline-flex items-center justify-center rounded-xl bg-brand-blue px-4 py-2 text-sm font-semibold text-white transition-colors duration-200 hover:bg-slate-900"
            >
              Appliquer
            </button>
            <a
              href="/produits"
              className="inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition-colors duration-200 hover:border-slate-400 hover:bg-slate-50"
            >
              Reinitialiser
            </a>
          </div>
        </form>

        <div className="mt-4 text-sm">
          <p className="mb-2 font-semibold text-slate-700">Categories:</p>
          <div className="-mx-1 overflow-x-auto pb-1 sm:mx-0 sm:overflow-visible">
            <div className="flex min-w-max gap-2 px-1 sm:min-w-0 sm:flex-wrap sm:px-0">
              <a
                href={buildCategoryUrl(null)}
                className={`whitespace-nowrap rounded-full px-3 py-1 ${
                  !selectedCategory
                    ? "bg-brand-blue text-white"
                    : "bg-white text-slate-700 hover:bg-slate-100"
                }`}
              >
                Toutes
              </a>
              {categories.map((category) => (
                <a
                  key={category.id}
                  href={buildCategoryUrl(category.slug)}
                  className={`whitespace-nowrap rounded-full px-3 py-1 ${
                    selectedCategory === category.slug
                      ? "bg-brand-orange text-white"
                      : "bg-white text-slate-700 hover:bg-slate-100"
                  }`}
                >
                  {category.name}
                </a>
              ))}
            </div>
          </div>
        </div>

        {activeCategoryName ? (
          <p className="mt-4 text-sm text-slate-700">
            Categorie selectionnee: <span className="font-semibold">{activeCategoryName}</span>
          </p>
        ) : null}

        {query ? (
          <p className="mt-2 text-sm text-slate-700">
            Resultat de recherche pour: <span className="font-semibold">{rawQuery}</span>
          </p>
        ) : null}

        <p className="mt-2 text-sm text-slate-600">
          {sortedProducts.length} produit(s) trouve(s).
        </p>

        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-2 sm:gap-5 lg:grid-cols-4">
          {sortedProducts.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>

        {sortedProducts.length === 0 ? (
          <p className="mt-8 rounded-xl bg-white p-4 text-sm text-slate-600 shadow-card">
            Aucun produit ne correspond a votre recherche ou a vos filtres.
          </p>
        ) : null}
      </div>
    </section>
  );
}
