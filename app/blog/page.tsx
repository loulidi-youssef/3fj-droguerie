import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { getPublishedBlogPosts } from "@/lib/blog";

export const metadata: Metadata = {
  title: "Blog",
  description:
    "Articles pratiques sur la droguerie a Fes, les materiaux de construction et l'outillage.",
};

export default async function BlogPage() {
  const blogPosts = await getPublishedBlogPosts();

  return (
    <section className="py-12">
      <div className="mx-auto max-w-7xl px-4">
        <h1 className="text-3xl font-extrabold text-brand-blue">Blog Droguerie Fes</h1>
        <p className="mt-2 text-sm text-slate-600">
          Guides pratiques sur les materiaux de construction, peinture et outillage a Fes.
        </p>

        {blogPosts.length === 0 ? (
          <p className="mt-6 rounded-2xl bg-white p-4 text-sm text-slate-600 shadow-card">
            Aucun article publie pour le moment.
          </p>
        ) : (
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {blogPosts.map((post) => (
              <article
                key={post.id}
                className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-card"
              >
                <Link href={`/blog/${post.slug}`}>
                  <Image
                    src={post.image}
                    alt={post.title}
                    width={600}
                    height={380}
                    className="h-44 w-full object-cover"
                  />
                </Link>
                <div className="p-4">
                  <p className="text-xs text-slate-500">
                    {post.publishedAt} - {post.readTime}
                  </p>
                  <Link
                    href={`/blog/${post.slug}`}
                    className="mt-2 block text-lg font-bold text-brand-blue hover:text-brand-orange"
                  >
                    {post.title}
                  </Link>
                  <p className="mt-2 text-sm text-slate-600">{post.excerpt}</p>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
