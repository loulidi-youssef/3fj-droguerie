import Link from "next/link";
import { BlogCard } from "@/components/blog-card";
import { homepageContent } from "@/data/homepage";
import { getPublishedBlogPosts } from "@/lib/blog";

export const BlogSection = async () => {
  const blogPosts = await getPublishedBlogPosts();

  return (
    <section className="section-padding">
      <div className="mx-auto max-w-7xl px-4 sm:px-5 lg:px-6">
        <div className="mb-6 flex items-end justify-between gap-3">
          <div>
            <h2 className="section-title">{homepageContent.blog.title}</h2>
            <p className="section-subtitle">{homepageContent.blog.subtitle}</p>
          </div>
          <Link
            href="/blog"
            className="text-sm font-semibold text-brand-orange transition-colors duration-200 hover:text-brand-orangeDark hover:underline"
          >
            {homepageContent.blog.allPostsCta}
          </Link>
        </div>

        {blogPosts.length === 0 ? (
          <p className="rounded-2xl bg-white p-4 text-sm text-slate-600 shadow-card">
            Aucun article disponible pour le moment.
          </p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {blogPosts.slice(0, 6).map((post) => (
              <BlogCard key={post.id} post={post} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
};
