import type { Metadata } from "next";
import Image from "next/image";
import Script from "next/script";
import { notFound } from "next/navigation";
import { ProductDetailPurchasePanel } from "@/components/product-detail-purchase-panel";
import { ProductCard } from "@/components/product-card";
import { getActiveOffersWithProducts } from "@/lib/offers";
import { getAllProducts, getProductBySlug } from "@/lib/products";
import { buildProductJsonLd } from "@/lib/seo";
import { getSiteUrl } from "@/lib/site-url";

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
      robots: {
        index: false,
        follow: false,
      },
    };
  }

  return {
    title: `${product.name} a Fes | Prix Maroc | Livraison rapide`,
    description: `${product.shortDescription} Achetez ${product.name} au meilleur prix au Maroc avec livraison rapide a Fes et paiement a la livraison.`,
    alternates: {
      canonical: `/produits/${product.slug}`,
    },
  };
};

export default async function ProductDetailPage({ params }: ProductDetailProps) {
  const [product, products, offersWithProducts] = await Promise.all([
    getProductBySlug(params.slug),
    getAllProducts(),
    getActiveOffersWithProducts(),
  ]);

  if (!product) {
    notFound();
  }

  const activeOffer = offersWithProducts.find(
    (offerWithProduct) => offerWithProduct.product.id === product.id,
  );
  const activeOfferPricing = activeOffer
    ? {
        discountType: activeOffer.offer.discountType,
        discountValue: activeOffer.offer.discountValue,
        discountLabel: activeOffer.offer.discountLabel,
        endAt: activeOffer.offer.endAt ?? null,
      }
    : undefined;

  const relatedProducts = products
    .filter(
      (item) =>
        item.id !== product.id && item.categorySlug === product.categorySlug,
    )
    .slice(0, 4);

  const siteUrl = getSiteUrl();
  const productUrl = `${siteUrl}/produits/${product.slug}`;
  const effectivePrice = activeOffer?.discountedPrice ?? product.price;

  const productJsonLd = buildProductJsonLd({
    product,
    url: productUrl,
    price: effectivePrice,
    priceValidUntil: activeOffer?.offer.endAt ?? null,
  });

  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Accueil",
        item: siteUrl,
      },
      {
        "@type": "ListItem",
        position: 2,
        name: "Produits",
        item: `${siteUrl}/produits`,
      },
      {
        "@type": "ListItem",
        position: 3,
        name: product.name,
        item: productUrl,
      },
    ],
  };

  return (
    <>
      <Script
        id={`product-jsonld-${product.id}`}
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(productJsonLd) }}
      />
      <Script
        id={`product-breadcrumb-jsonld-${product.id}`}
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
      <section className="py-5 sm:py-14">
        <div className="mx-auto max-w-7xl px-4 sm:px-5 lg:px-6">
          <div className="grid gap-3 sm:gap-8 lg:grid-cols-2">
            <div className="min-w-0">
              <Image
                src={product.images[0]}
                alt={product.name}
                width={900}
                height={680}
                className="aspect-[4/3] w-full rounded-xl border border-slate-200 bg-white object-contain p-2 sm:aspect-[4/3] sm:rounded-2xl sm:object-cover sm:p-0"
              />
              <div className="mt-2 sm:mt-3">
                <div className="flex gap-2 overflow-x-auto pb-1 sm:hidden [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
                  {product.images.map((image, index) => (
                    <Image
                      key={image}
                      src={image}
                      alt={`${product.name} vue ${index + 1}`}
                      width={96}
                      height={96}
                      className="h-16 w-16 shrink-0 rounded-lg border border-slate-200 bg-white object-cover p-1"
                    />
                  ))}
                </div>
                <div className="hidden grid-cols-3 gap-3 sm:grid">
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
            </div>

            <div className="min-w-0 lg:sticky lg:top-24 lg:self-start">
              <ProductDetailPurchasePanel product={product} offerPricing={activeOfferPricing} />
            </div>
          </div>

          {relatedProducts.length > 0 ? (
            <div className="mt-6 sm:mt-12">
              <h2 className="text-[1.2rem] font-extrabold tracking-tight text-brand-blue sm:text-[2rem]">
                Produits similaires
              </h2>

              <div className="mt-3 flex gap-2.5 overflow-x-auto pb-1 sm:hidden [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
                {relatedProducts.map((related) => (
                  <div key={related.id} className="w-[170px] shrink-0">
                    <ProductCard product={related} variant="listing" />
                  </div>
                ))}
              </div>

              <div className="mt-4 hidden grid-cols-2 gap-4 sm:grid lg:grid-cols-4">
                {relatedProducts.map((related) => (
                  <ProductCard key={related.id} product={related} />
                ))}
              </div>
            </div>
          ) : null}
        </div>
      </section>
    </>
  );
}
