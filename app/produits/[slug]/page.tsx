import type { Metadata } from "next";
import Image from "next/image";
import Script from "next/script";
import { notFound } from "next/navigation";
import { ProductDetailPurchasePanel } from "@/components/product-detail-purchase-panel";
import { ProductCard } from "@/components/product-card";
import { RecentlyViewedProducts } from "@/components/recently-viewed-products";
import { getSafeNextImageProps } from "@/lib/image-optimization";
import { getActiveOffersWithProducts } from "@/lib/offers";
import { getAllProducts, getProductBySlug } from "@/lib/products";
import { buildProductJsonLd } from "@/lib/seo";
import { getSiteUrl } from "@/lib/site-url";
import type { Product } from "@/types";

type ProductDetailProps = {
  params: {
    slug: string;
  };
};

const tokenize = (value: string): string[] => {
  return value
    .toLocaleLowerCase("fr")
    .split(/[^a-z0-9]+/gi)
    .map((token) => token.trim())
    .filter((token) => token.length >= 3);
};

const countTokenOverlap = (firstTokens: Set<string>, secondTokens: string[]): number => {
  let overlap = 0;

  for (const token of secondTokens) {
    if (firstTokens.has(token)) {
      overlap += 1;
    }
  }

  return overlap;
};

const scoreRelatedProduct = (
  currentProduct: Product,
  candidate: Product,
  currentTokens: Set<string>,
): number => {
  let score = 0;

  if (candidate.categorySlug === currentProduct.categorySlug) {
    score += 70;
  }

  const safePrice = Math.max(1, currentProduct.price);
  const priceGapRatio = Math.abs(candidate.price - currentProduct.price) / safePrice;
  score += Math.max(0, 24 - priceGapRatio * 36);

  const ratingGap = Math.abs(candidate.rating - currentProduct.rating);
  score += Math.max(0, 10 - ratingGap * 6);

  const overlap = countTokenOverlap(
    currentTokens,
    tokenize(`${candidate.name} ${candidate.shortDescription}`),
  );
  score += Math.min(12, overlap * 3);

  if ((candidate.stock ?? 1) > 0) {
    score += 4;
  }

  if (candidate.isPromo) {
    score += 3;
  }

  if (candidate.isNew) {
    score += 2;
  }

  return score;
};

const buildRelatedProducts = (
  currentProduct: Product,
  allProducts: Product[],
  limit = 6,
): Product[] => {
  const currentTokens = new Set(
    tokenize(`${currentProduct.name} ${currentProduct.shortDescription}`),
  );

  return allProducts
    .filter((candidate) => candidate.id !== currentProduct.id)
    .map((candidate) => ({
      product: candidate,
      score: scoreRelatedProduct(currentProduct, candidate, currentTokens),
    }))
    .sort((first, second) => {
      if (second.score !== first.score) {
        return second.score - first.score;
      }

      if (second.product.rating !== first.product.rating) {
        return second.product.rating - first.product.rating;
      }

      return first.product.price - second.product.price;
    })
    .slice(0, limit)
    .map((entry) => entry.product);
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

  const relatedProducts = buildRelatedProducts(product, products);

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
  const primaryImage = getSafeNextImageProps(product.images[0]);

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
                src={primaryImage.src}
                alt={product.name}
                width={900}
                height={680}
                unoptimized={primaryImage.unoptimized}
                className="aspect-[4/3] w-full rounded-xl border border-slate-200 bg-white object-contain p-2 sm:aspect-[4/3] sm:rounded-2xl sm:object-cover sm:p-0"
              />
              <div className="mt-2 sm:mt-3">
                <div className="flex gap-2 overflow-x-auto pb-1 sm:hidden [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
                  {product.images.map((imageSrc, index) => {
                    const image = getSafeNextImageProps(imageSrc);
                    return (
                      <Image
                        key={imageSrc}
                        src={image.src}
                        alt={`${product.name} vue ${index + 1}`}
                        width={96}
                        height={96}
                        unoptimized={image.unoptimized}
                        className="h-16 w-16 shrink-0 rounded-lg border border-slate-200 bg-white object-cover p-1"
                      />
                    );
                  })}
                </div>
                <div className="hidden grid-cols-3 gap-3 sm:grid">
                  {product.images.map((imageSrc, index) => {
                    const image = getSafeNextImageProps(imageSrc);
                    return (
                      <Image
                        key={imageSrc}
                        src={image.src}
                        alt={`${product.name} vue ${index + 1}`}
                        width={280}
                        height={200}
                        unoptimized={image.unoptimized}
                        className="aspect-[4/3] rounded-xl border border-slate-200 object-cover"
                      />
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="min-w-0 lg:sticky lg:top-24 lg:self-start">
              <ProductDetailPurchasePanel product={product} offerPricing={activeOfferPricing} />
            </div>
          </div>

          {relatedProducts.length > 0 ? (
            <div className="mt-6 sm:mt-12">
              <div className="flex flex-wrap items-end justify-between gap-2">
                <h2 className="text-[1.2rem] font-extrabold tracking-tight text-brand-blue sm:text-[2rem]">
                  Produits recommandes
                </h2>
                <p className="text-xs font-medium text-slate-500 sm:text-sm">
                  Selectionnes selon la categorie, le prix et les notes clients.
                </p>
              </div>

              <div className="mt-3 flex gap-2.5 overflow-x-auto pb-1 sm:hidden [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
                {relatedProducts.map((related) => (
                  <div key={related.id} className="w-[170px] shrink-0">
                    <ProductCard product={related} variant="listing" />
                  </div>
                ))}
              </div>

              <div className="mt-4 hidden grid-cols-2 gap-4 sm:grid lg:grid-cols-3">
                {relatedProducts.map((related) => (
                  <ProductCard key={related.id} product={related} />
                ))}
              </div>
            </div>
          ) : null}

          <RecentlyViewedProducts currentProductId={product.id} products={products} />
        </div>
      </section>
    </>
  );
}
