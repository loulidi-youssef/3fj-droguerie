import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import { getBlogPostBySlug, getPublishedBlogPosts } from "@/lib/blog";

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
    return { title: "Article introuvable" };
  }

  return {
    title: post.seoTitle ?? post.title,
    description: post.seoDescription,
  };
};

export default async function BlogDetailPage({ params }: BlogDetailProps) {
  const post = await getBlogPostBySlug(params.slug);

  if (!post) {
    notFound();
  }

  return (
    <article className="py-12">
      <div className="mx-auto max-w-3xl px-4">
        <p className="text-sm font-semibold uppercase tracking-wide text-brand-orange">Blog 3FJ Droguerie</p>
        <h1 className="mt-2 text-3xl font-extrabold text-brand-blue">{post.title}</h1>
        <p className="mt-2 text-sm text-slate-500">
          {post.publishedAt} - {post.readTime}
        </p>

        <Image
          src={post.image}
          alt={post.title}
          width={1200}
          height={680}
          className="mt-6 w-full rounded-2xl border border-slate-200 object-cover"
        />

        <div className="mt-6 space-y-5 text-sm leading-7 text-slate-700">
          {post.content.map((paragraph, index) => (
            <p key={`${post.id}-${index}`}>{paragraph}</p>
          ))}
        </div>
      </div>
    </article>
  );
}
