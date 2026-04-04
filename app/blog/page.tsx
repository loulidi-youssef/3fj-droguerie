import type { Metadata } from "next";
import { BlogCard } from "@/components/blog-card";
import { getPublishedBlogPosts } from "@/lib/blog";

export const metadata: Metadata = {
  title: "Blog",
  description:
    "Articles pratiques sur la droguerie a Fes, les materiaux de construction et l'outillage.",
};

export default async function BlogPage() {
  const blogPosts = await getPublishedBlogPosts();

  return (
    <section className="bg-[#f1f3f5] py-8 sm:py-10">
      <div className="mx-auto max-w-7xl px-4 sm:px-5 lg:px-6">
        <div className="rounded-2xl border border-slate-200 bg-white px-5 py-5 shadow-[0_10px_24px_rgba(15,42,77,0.08)] sm:px-6">
          <h1 className="text-[2rem] font-extrabold uppercase tracking-tight text-brand-blue sm:text-[2.35rem]">
            Blog
          </h1>
          <p className="mt-1 text-base text-slate-600">
            Guides pratiques sur les materiaux de construction, peinture et outillage a Fes.
          </p>
        </div>

        {blogPosts.length === 0 ? (
          <p className="mt-6 rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-600 shadow-card">
            Aucun article publie pour le moment.
          </p>
        ) : (
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {blogPosts.map((post) => (
              <BlogCard key={post.id} post={post} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
