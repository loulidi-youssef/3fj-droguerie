import type { Metadata } from "next";
import Image from "next/image";
import Script from "next/script";
import { notFound } from "next/navigation";
import { getBlogPostBySlug, getPublishedBlogPosts } from "@/lib/blog";
import { getSafeNextImageProps } from "@/lib/image-optimization";
import { buildArticleJsonLd } from "@/lib/seo";
import { getSiteUrl } from "@/lib/site-url";

type BlogDetailProps = {
  params: {
    slug: string;
  };
};

export const generateStaticParams = async () => {
  const blogPosts = await getPublishedBlogPosts();
  return blogPosts.map((post) => ({ slug: post.slug }));
};

export const generateMetadata = async ({ params }: BlogDetailProps): Promise<Metadata> => {
  const post = await getBlogPostBySlug(params.slug);
  if (!post) {
    return {
      title: "Article introuvable",
      robots: {
        index: false,
        follow: false,
      },
    };
  }

  return {
    title: post.seoTitle ?? post.title,
    description: post.seoDescription,
    alternates: {
      canonical: `/blog/${post.slug}`,
    },
  };
};

export default async function BlogDetailPage({ params }: BlogDetailProps) {
  const post = await getBlogPostBySlug(params.slug);

  if (!post) {
    notFound();
  }

  const articleUrl = `${getSiteUrl()}/blog/${post.slug}`;
  const articleJsonLd = buildArticleJsonLd({
    post,
    url: articleUrl,
  });
  const image = getSafeNextImageProps(post.image);

  return (
    <>
      <Script
        id={`article-jsonld-${post.id}`}
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleJsonLd) }}
      />
      <article className="py-12">
        <div className="mx-auto max-w-3xl px-4">
          <p className="text-sm font-semibold uppercase tracking-wide text-brand-orange">Blog 3FJ Droguerie</p>
          <h1 className="mt-2 text-3xl font-extrabold text-brand-blue">{post.title}</h1>
          <p className="mt-2 text-sm text-slate-500">
            {post.publishedAt} - {post.readTime}
          </p>

          <Image
            src={image.src}
            alt={post.title}
            width={1200}
            height={680}
            unoptimized={image.unoptimized}
            className="mt-6 w-full rounded-2xl border border-slate-200 object-cover"
          />

          <div className="mt-6 space-y-5 text-sm leading-7 text-slate-700">
            {post.content.map((paragraph, index) => (
              <p key={`${post.id}-${index}`}>{paragraph}</p>
            ))}
          </div>
        </div>
      </article>
    </>
  );
}
