import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AddToCartButton } from "@/components/add-to-cart-button";
import { FavoriteButton } from "@/components/favorite-button";
import { ProductCard } from "@/components/product-card";
import { getCategoryNameBySlug } from "@/data/categories";
import { formatDh } from "@/lib/currency";
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

            <div className="mt-6 flex flex-wrap gap-3">
              <AddToCartButton
                productId={product.id}
                className="btn-primary px-5 py-3"
              />
              <a
                href={buildProductWhatsAppLink(product.name)}
                target="_blank"
                rel="noreferrer"
                className="btn-outline-brand px-5 py-3"
              >
                WhatsApp
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
