import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AddToCartButton } from "@/components/add-to-cart-button";
import { FavoriteButton } from "@/components/favorite-button";
import { ProductCard } from "@/components/product-card";
import { getCategoryNameBySlug } from "@/data/categories";
import { formatDh } from "@/lib/currency";
import {
  getProductAvailabilityMeta,
  getProductAvailabilityStatus,
} from "@/lib/product-availability";
import { getAllProducts, getProductBySlug } from "@/lib/products";
import { buildProductWhatsAppLink } from "@/lib/whatsapp";

type ProductDetailProps = {
  params: {
    slug: string;
  };
};

export const generateStaticParams = async () => {
  const products = await getAllProducts();
  return products.map((product) => ({ slug: product.slug }));
};

export const generateMetadata = async ({ params }: ProductDetailProps): Promise<Metadata> => {
  const product = await getProductBySlug(params.slug);

  if (!product) {
    return {
      title: "Produit introuvable",
    };
  }

  return {
    title: `${product.name} a Fes`,
    description: `${product.shortDescription} Prix: ${product.price} DH. Disponible chez 3FJ Droguerie a Fes.`,
  };
};

export default async function ProductDetailPage({ params }: ProductDetailProps) {
  const [product, products] = await Promise.all([
    getProductBySlug(params.slug),
    getAllProducts(),
  ]);

  if (!product) {
    notFound();
  }

  const relatedProducts = products
    .filter(
      (item) =>
        item.id !== product.id && item.categorySlug === product.categorySlug,
    )
    .slice(0, 4);
  const availabilityStatus = getProductAvailabilityStatus(product);
  const availability = getProductAvailabilityMeta(product);

  return (
    <section className="section-padding">
      <div className="mx-auto max-w-7xl px-4 sm:px-5 lg:px-6">
        <div className="grid gap-8 lg:grid-cols-2">
          <div>
            <Image
              src={product.images[0]}
              alt={product.name}
              width={900}
              height={680}
              className="aspect-[4/3] w-full rounded-2xl border border-slate-200 object-cover"
            />
            <div className="mt-3 grid grid-cols-3 gap-3">
              {product.images.map((image, index) => (
                <Image
                  key={image}
                  src={image}
                  alt={`${product.name} vue ${index + 1}`}
                  width={280}
                  height={200}
                  className="aspect-[4/3] rounded-xl border border-slate-200 object-cover"
                />
              ))}
            </div>
          </div>

          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-brand-orange">
              {getCategoryNameBySlug(product.categorySlug)}
            </p>
            <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-brand-blue sm:text-[2.15rem]">
              {product.name}
            </h1>
            <p className="mt-4 text-sm leading-7 text-slate-700 sm:text-[0.95rem]">{product.description}</p>
            <p className="mt-5 text-3xl font-extrabold tracking-tight text-brand-blue">
              {formatDh(product.price)}
            </p>
            <p
              className={`mt-2 inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold ${availability.className}`}
            >
              {availability.label}
            </p>

            <div className="mt-6 flex flex-wrap gap-3">
              <AddToCartButton
                productId={product.id}
                disabled={availabilityStatus === "out-of-stock"}
                className="btn-primary h-11 px-5"
              />
              <a
                href={buildProductWhatsAppLink(product.name)}
                target="_blank"
                rel="noreferrer"
                className="btn-outline-brand h-11 gap-2 px-5"
              >
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden="true">
                  <path d="M19.05 4.94A9.86 9.86 0 0012.02 2c-5.45 0-9.88 4.43-9.88 9.88 0 1.74.45 3.45 1.32 4.96L2 22l5.31-1.39a9.84 9.84 0 004.71 1.2h.01c5.45 0 9.88-4.43 9.88-9.88 0-2.64-1.03-5.12-2.86-6.99zm-7.03 15.2h-.01a8.2 8.2 0 01-4.17-1.14l-.3-.18-3.15.83.84-3.07-.2-.31a8.2 8.2 0 01-1.26-4.35c0-4.52 3.68-8.2 8.21-8.2 2.19 0 4.24.85 5.79 2.4a8.13 8.13 0 012.4 5.8c0 4.52-3.68 8.21-8.15 8.22zm4.5-6.16c-.25-.12-1.49-.74-1.72-.82-.23-.08-.4-.12-.57.12-.17.25-.66.82-.8.99-.15.17-.29.19-.54.06-.25-.12-1.05-.39-2-1.24-.74-.66-1.24-1.48-1.39-1.73-.14-.25-.02-.39.11-.51.12-.12.25-.29.37-.44.12-.15.17-.25.25-.41.08-.17.04-.31-.02-.43-.06-.12-.57-1.37-.78-1.88-.21-.5-.43-.43-.57-.44h-.49c-.17 0-.43.06-.66.31-.23.25-.87.85-.87 2.07 0 1.22.89 2.4 1.01 2.57.12.17 1.75 2.68 4.24 3.75.59.25 1.05.4 1.41.51.59.19 1.12.16 1.54.1.47-.07 1.49-.61 1.7-1.21.21-.6.21-1.12.15-1.21-.06-.1-.23-.16-.48-.29z" />
                </svg>
                Commander WhatsApp
              </a>
              <FavoriteButton
                productId={product.id}
                className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-slate-300 bg-white text-slate-500 transition hover:border-rose-300 hover:text-rose-600 disabled:cursor-not-allowed disabled:opacity-70"
              />
            </div>

            <Link href="/panier" className="mt-4 inline-flex text-sm font-semibold text-brand-orange hover:underline">
              Aller au panier
            </Link>
          </div>
        </div>

        {relatedProducts.length > 0 ? (
          <div className="mt-12">
            <h2 className="section-title">Produits similaires</h2>
            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {relatedProducts.map((related) => (
                <ProductCard key={related.id} product={related} />
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
}
