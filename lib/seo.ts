import type { Metadata } from "next";
import { businessInfo } from "@/data/business";
import { siteImages } from "@/data/images";
import { getSiteUrl } from "@/lib/site-url";
import type { BlogPost, Product } from "@/types";

export const localBusinessJsonLd = {
  "@context": "https://schema.org",
  "@type": "HardwareStore",
  name: businessInfo.brandName,
  legalName: businessInfo.legalName,
  telephone: businessInfo.phoneDisplay,
  address: {
    "@type": "PostalAddress",
    streetAddress: businessInfo.address,
    addressLocality: businessInfo.city,
    addressCountry: "MA",
  },
  areaServed: "Fes",
  url: getSiteUrl(),
};

const toAbsoluteUrl = (value: string): string => {
  const trimmed = value.trim();
  if (!trimmed) {
    return getSiteUrl();
  }

  try {
    return new URL(trimmed).toString();
  } catch {
    const normalizedPath = trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
    return `${getSiteUrl()}${normalizedPath}`;
  }
};

export const resolveSocialImageUrl = (imagePath?: string | null): string => {
  return toAbsoluteUrl(imagePath?.trim() || siteImages.hero);
};

type BuildSocialMetadataInput = {
  title: string;
  description: string;
  canonicalPath: string;
  imagePath?: string | null;
  openGraphType?: "website" | "article";
};

export const buildSocialMetadata = ({
  title,
  description,
  canonicalPath,
  imagePath,
  openGraphType = "website",
}: BuildSocialMetadataInput): Pick<Metadata, "alternates" | "openGraph" | "twitter"> => {
  const imageUrl = resolveSocialImageUrl(imagePath);
  const canonicalUrl = toAbsoluteUrl(canonicalPath);

  return {
    alternates: {
      canonical: canonicalPath,
    },
    openGraph: {
      type: openGraphType,
      url: canonicalUrl,
      title,
      description,
      siteName: businessInfo.brandName,
      locale: "fr_MA",
      images: [
        {
          url: imageUrl,
          alt: title,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [imageUrl],
    },
  };
};

type BuildProductJsonLdInput = {
  product: Product;
  url: string;
  price: number;
  currency?: string;
  priceValidUntil?: string | null;
};

const toSchemaAvailability = (stock: number | undefined): string => {
  if (typeof stock === "number" && stock <= 0) {
    return "https://schema.org/OutOfStock";
  }

  return "https://schema.org/InStock";
};

export const buildProductJsonLd = ({
  product,
  url,
  price,
  currency = "MAD",
  priceValidUntil = null,
}: BuildProductJsonLdInput) => {
  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    image: product.images,
    description: product.shortDescription || product.description,
    sku: product.id,
    category: product.categorySlug,
    brand: {
      "@type": "Brand",
      name: businessInfo.brandName,
    },
    offers: {
      "@type": "Offer",
      url,
      priceCurrency: currency,
      price,
      availability: toSchemaAvailability(product.stock),
      itemCondition: "https://schema.org/NewCondition",
      seller: {
        "@type": "Organization",
        name: businessInfo.brandName,
      },
      ...(priceValidUntil ? { priceValidUntil } : {}),
    },
  };
};

type BuildArticleJsonLdInput = {
  post: BlogPost;
  url: string;
};

export const buildArticleJsonLd = ({ post, url }: BuildArticleJsonLdInput) => {
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: post.title,
    description: post.seoDescription || post.excerpt,
    image: post.image,
    datePublished: post.publishedAt,
    dateModified: post.publishedAt,
    author: {
      "@type": "Organization",
      name: businessInfo.brandName,
    },
    publisher: {
      "@type": "Organization",
      name: businessInfo.brandName,
      logo: {
        "@type": "ImageObject",
        url: `${getSiteUrl()}/favicon.ico`,
      },
    },
    mainEntityOfPage: url,
    url,
  };
};
