import type { MetadataRoute } from "next";
import { categories } from "@/data/categories";
import { getPublishedBlogPosts } from "@/lib/blog";
import { getAllProducts } from "@/lib/products";
import { getSiteUrl } from "@/lib/site-url";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const siteUrl = getSiteUrl();
  const [products, blogPosts] = await Promise.all([
    getAllProducts(),
    getPublishedBlogPosts(),
  ]);

  const staticPages: MetadataRoute.Sitemap = [
    {
      url: `${siteUrl}/`,
      changeFrequency: "daily",
      priority: 1,
    },
    {
      url: `${siteUrl}/produits`,
      changeFrequency: "daily",
      priority: 0.9,
    },
    {
      url: `${siteUrl}/offres`,
      changeFrequency: "daily",
      priority: 0.85,
    },
    {
      url: `${siteUrl}/blog`,
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      url: `${siteUrl}/contact`,
      changeFrequency: "monthly",
      priority: 0.6,
    },
  ];

  const productPages: MetadataRoute.Sitemap = products.map((product) => ({
    url: `${siteUrl}/produits/${product.slug}`,
    changeFrequency: "weekly",
    priority: 0.7,
    lastModified: product.createdAt ? new Date(product.createdAt) : undefined,
  }));

  const categoryPages: MetadataRoute.Sitemap = categories.map((category) => ({
    url: `${siteUrl}/produits?categorie=${encodeURIComponent(category.slug)}`,
    changeFrequency: "weekly",
    priority: 0.75,
  }));

  const blogPages: MetadataRoute.Sitemap = blogPosts.map((post) => ({
    url: `${siteUrl}/blog/${post.slug}`,
    changeFrequency: "monthly",
    priority: 0.65,
    lastModified: post.publishedAt ? new Date(post.publishedAt) : undefined,
  }));

  return [...staticPages, ...categoryPages, ...productPages, ...blogPages];
}
