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

export async function generateMetadata({
  searchParams,
}: ProductsPageProps): Promise<Metadata> {
  const selectedCategory = getSingleSearchParam(searchParams.categorie).trim().toLowerCase();
  const rawQuery = getSingleSearchParam(searchParams.q).trim();
  const sort = normalizeSort(getSingleSearchParam(searchParams.tri));
  const category = selectedCategory ? getCategoryBySlug(selectedCategory) : null;
  const shouldIndex = rawQuery.length === 0 && sort === "defaut";

  if (category) {
    return {
      title: `${category.name} a Fes | Materiaux de construction`,
      description: `Decouvrez notre selection ${category.name.toLowerCase()} a Fes: prix competitifs, paiement a la livraison et livraison rapide.`,
      alternates: {
        canonical: `/produits?categorie=${encodeURIComponent(category.slug)}`,
      },
      robots: {
        index: shouldIndex,
        follow: true,
      },
    };
  }

  return {
    title: "Materiaux de construction a Fes | Produits et prix",
    description:
      "Catalogue des materiaux de construction a Fes: peinture, outillage, quincaillerie et produits de droguerie avec livraison rapide.",
    alternates: {
      canonical: "/produits",
    },
    robots: {
      index: shouldIndex,
      follow: true,
    },
  };
}

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
  const hasActiveFilters = Boolean(selectedCategory || rawQuery || sort !== "defaut");

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
    <section className="bg-[#f1f3f5] py-8 sm:py-10">
      <div className="mx-auto max-w-7xl px-4 sm:px-5 lg:px-6">
        <div className="rounded-2xl border border-slate-200 bg-white px-5 py-5 shadow-[0_10px_24px_rgba(15,42,77,0.08)] sm:px-6">
          <h1 className="text-[2rem] font-extrabold uppercase tracking-tight text-brand-blue sm:text-[2.35rem]">
            Materiaux de construction a Fes
          </h1>
          <p className="mt-1 text-base text-slate-600">
            Vente en gros et detail de materiaux de construction, peinture et outillage.
          </p>
          <div className="mt-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs leading-relaxed text-slate-600 sm:text-sm">
            <h2 className="text-sm font-bold text-brand-blue sm:text-base">
              Materiaux de construction, outillage et peinture a Fes
            </h2>
            <p className="mt-1">
              Comparez les prix et trouvez rapidement les meilleurs produits pour vos travaux.
            </p>
            Explorez aussi nos <a href="/offres" className="font-semibold text-brand-orange hover:underline">offres actives</a> et nos categories phares:{" "}
            <a href="/produits?categorie=peinture" className="font-semibold text-brand-blue hover:underline">peinture</a>,{" "}
            <a href="/produits?categorie=outillage" className="font-semibold text-brand-blue hover:underline">outillage</a> et{" "}
            <a href="/produits?categorie=bricolage" className="font-semibold text-brand-blue hover:underline">bricolage</a>.
          </div>

          <details className="mt-4 overflow-hidden rounded-2xl border border-slate-200 bg-[#f7f8fa] md:hidden">
            <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-3">
              <span className="text-sm font-bold uppercase tracking-wide text-brand-blue">
                Filtres
              </span>
              <span className="text-xs font-semibold text-slate-600">
                {hasActiveFilters ? "Actifs" : "Afficher"}
              </span>
            </summary>
            <div className="border-t border-slate-200 px-4 pb-4 pt-3">
              <form action="/produits" method="get">
                <div className="grid gap-2.5">
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
                  <div className="grid grid-cols-2 gap-2.5">
                    <label className="block">
                      <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-600">
                        Categorie
                      </span>
                      <select
                        name="categorie"
                        defaultValue={selectedCategory}
                        className="mt-1 h-10 w-full rounded-lg border border-slate-300 bg-white px-2 text-xs text-slate-700 outline-none transition focus:border-brand-orange focus:ring-2 focus:ring-orange-100"
                      >
                        <option value="">Toutes</option>
                        {categories.map((category) => (
                          <option key={category.id} value={category.slug}>
                            {category.name}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="block">
                      <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-600">
                        Tri
                      </span>
                      <select
                        name="tri"
                        defaultValue={sort}
                        className="mt-1 h-10 w-full rounded-lg border border-slate-300 bg-white px-2 text-xs text-slate-700 outline-none transition focus:border-brand-orange focus:ring-2 focus:ring-orange-100"
                      >
                        <option value="defaut">Defaut</option>
                        <option value="nouveaux">Recents</option>
                        <option value="prix-asc">Prix +</option>
                        <option value="prix-desc">Prix -</option>
                      </select>
                    </label>
                  </div>
                  <div className="mt-1 flex items-center gap-2">
                    <button
                      type="submit"
                      className="inline-flex h-9 flex-1 items-center justify-center rounded-lg bg-brand-blue px-3 text-xs font-semibold text-white transition hover:bg-slate-900"
                    >
                      Appliquer
                    </button>
                    <a
                      href="/produits"
                      className="inline-flex h-9 items-center justify-center rounded-lg border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-700 transition hover:border-brand-orange hover:text-brand-orange"
                    >
                      Reset
                    </a>
                  </div>
                </div>
              </form>

              <div className="mt-3 -mx-1 overflow-x-auto pb-1">
                <div className="flex min-w-max gap-2 px-1">
                  <a
                    href={buildCategoryUrl(null)}
                    className={`inline-flex h-8 items-center whitespace-nowrap rounded-full border px-3 text-xs font-semibold transition ${
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
                      className={`inline-flex h-8 items-center whitespace-nowrap rounded-full border px-3 text-xs font-semibold transition ${
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
            </div>
          </details>

          <div className="mt-5 hidden md:block">
            <form
              action="/produits"
              method="get"
              className="rounded-2xl border border-slate-200 bg-[#f7f8fa] p-4 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.8)] sm:p-5"
            >
              <div className="grid gap-3 lg:grid-cols-12">
                <label className="block lg:col-span-5">
                  <span className="text-xs font-semibold uppercase tracking-wide text-slate-600">
                    Recherche produit (nom)
                  </span>
                  <input
                    type="search"
                    name="q"
                    defaultValue={rawQuery}
                    placeholder="Ex: perceuse, marteau..."
                    className="mt-1 h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-700 outline-none transition focus:border-brand-orange focus:ring-2 focus:ring-orange-100"
                  />
                </label>

                <label className="block lg:col-span-3">
                  <span className="text-xs font-semibold uppercase tracking-wide text-slate-600">
                    Categorie
                  </span>
                  <select
                    name="categorie"
                    defaultValue={selectedCategory}
                    className="mt-1 h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-700 outline-none transition focus:border-brand-orange focus:ring-2 focus:ring-orange-100"
                  >
                    <option value="">Toutes les categories</option>
                    {categories.map((category) => (
                      <option key={category.id} value={category.slug}>
                        {category.name}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="block lg:col-span-2">
                  <span className="text-xs font-semibold uppercase tracking-wide text-slate-600">
                    Tri
                  </span>
                  <select
                    name="tri"
                    defaultValue={sort}
                    className="mt-1 h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-700 outline-none transition focus:border-brand-orange focus:ring-2 focus:ring-orange-100"
                  >
                    <option value="defaut">Ordre par defaut</option>
                    <option value="nouveaux">Plus recents</option>
                    <option value="prix-asc">Prix croissant</option>
                    <option value="prix-desc">Prix decroissant</option>
                  </select>
                </label>

                <div className="flex flex-wrap items-end gap-2 lg:col-span-2 lg:justify-end">
                  <button
                    type="submit"
                    className="inline-flex h-11 items-center justify-center rounded-xl bg-brand-blue px-4 text-sm font-semibold text-white transition hover:bg-slate-900"
                  >
                    Appliquer
                  </button>
                  <a
                    href="/produits"
                    className="inline-flex h-11 items-center justify-center rounded-xl border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:border-brand-orange hover:text-brand-orange"
                  >
                    Reinitialiser
                  </a>
                </div>
              </div>
            </form>

            <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_8px_20px_rgba(15,42,77,0.06)]">
              <p className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-600">Categories</p>
              <div className="-mx-1 overflow-x-auto pb-1 sm:mx-0 sm:overflow-visible">
                <div className="flex min-w-max gap-2 px-1 sm:min-w-0 sm:flex-wrap sm:px-0">
                  <a
                    href={buildCategoryUrl(null)}
                    className={`inline-flex h-9 items-center whitespace-nowrap rounded-full border px-3.5 text-sm font-semibold transition ${
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
                      className={`inline-flex h-9 items-center whitespace-nowrap rounded-full border px-3.5 text-sm font-semibold transition ${
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
            </div>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
            {activeCategoryName ? (
              <p className="text-slate-700">
                Categorie selectionnee: <span className="font-semibold text-brand-blue">{activeCategoryName}</span>
              </p>
            ) : null}

            {query ? (
              <p className="text-slate-700">
                Resultat de recherche pour: <span className="font-semibold text-brand-blue">{rawQuery}</span>
              </p>
            ) : null}

            <p className="font-semibold text-slate-600">{sortedProducts.length} produit(s) trouve(s).</p>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
          {sortedProducts.map((product) => (
            <ProductCard key={product.id} product={product} variant="listing" />
          ))}
        </div>

        {sortedProducts.length === 0 ? (
          <p className="mt-8 rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-600 shadow-card">
            Aucun produit ne correspond a votre recherche ou a vos filtres.
          </p>
        ) : null}
      </div>
    </section>
  );
}
