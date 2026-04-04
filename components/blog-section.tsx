import Image from "next/image";
import Link from "next/link";
import { homepageContent } from "@/data/homepage";
import { getPublishedBlogPosts } from "@/lib/blog";

export const BlogSection = async () => {
  const blogPosts = await getPublishedBlogPosts();

  return (
    <section className="py-14">
      <div className="mx-auto max-w-7xl px-4 sm:px-5 lg:px-6">
        <div className="mb-6 flex items-end justify-between gap-3">
          <div>
            <h2 className="text-2xl font-extrabold text-brand-blue sm:text-3xl">{homepageContent.blog.title}</h2>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-600">{homepageContent.blog.subtitle}</p>
          </div>
          <Link href="/blog" className="text-sm font-semibold text-brand-orange hover:underline">
            {homepageContent.blog.allPostsCta}
          </Link>
        </div>

        {blogPosts.length === 0 ? (
          <p className="rounded-2xl bg-white p-4 text-sm text-slate-600 shadow-card">
            Aucun article disponible pour le moment.
          </p>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {blogPosts.slice(0, 6).map((post) => (
              <article
                key={post.id}
                className="flex h-full flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-card"
              >
                <Link href={`/blog/${post.slug}`}>
                  <Image
                    src={post.image}
                    alt={post.title}
                    width={600}
                    height={380}
                    className="aspect-[16/10] w-full object-cover"
                  />
                </Link>
                <div className="flex flex-1 flex-col p-5">
                  <p className="text-xs font-medium text-slate-500">
                    {post.publishedAt} - {post.readTime}
                  </p>
                  <Link
                    href={`/blog/${post.slug}`}
                    className="mt-2 block min-h-[56px] text-lg font-bold leading-tight text-brand-blue hover:text-brand-orange"
                  >
                    {post.title}
                  </Link>
                  <p className="mt-2 text-sm leading-relaxed text-slate-600">{post.excerpt}</p>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </section>
  );
};
