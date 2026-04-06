import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import { ProductDetailPurchasePanel } from "@/components/product-detail-purchase-panel";
import { ProductCard } from "@/components/product-card";
import { getActiveOffersWithProducts } from "@/lib/offers";
import { getAllProducts, getProductBySlug } from "@/lib/products";

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

          <div className="lg:sticky lg:top-24 lg:self-start">
            <ProductDetailPurchasePanel product={product} offerPricing={activeOfferPricing} />
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
