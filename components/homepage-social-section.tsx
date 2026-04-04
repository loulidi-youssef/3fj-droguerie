import Image from "next/image";
import Link from "next/link";
import { StarRating } from "@/components/star-rating";
import { getPublishedBlogPosts } from "@/lib/blog";
import { getActiveReviews } from "@/lib/reviews";

const formatReviewName = (name: string) => {
  if (name.length > 16) {
    return `${name.slice(0, 15)}...`;
  }
  return name;
};

export const HomepageSocialSection = async () => {
  const [reviews, blogPosts] = await Promise.all([getActiveReviews(), getPublishedBlogPosts()]);
  const visibleReviews = reviews.slice(0, 3);
  const visiblePosts = blogPosts.slice(0, 2);

  return (
    <section className="bg-[#f1f3f5] pb-8">
      <div className="mx-auto grid max-w-7xl gap-4 px-4 sm:px-5 lg:grid-cols-2 lg:px-6">
        <article className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-[0_8px_18px_rgba(15,42,77,0.08)]">
          <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3">
            <h2 className="text-[2rem] font-extrabold uppercase tracking-tight text-brand-blue">Avis clients</h2>
            <Link href="/contact" className="text-lg font-bold text-brand-blue transition hover:text-brand-orange">
              Voir tous &rarr;
            </Link>
          </div>

          {visibleReviews.length === 0 ? (
            <p className="p-5 text-sm text-slate-600">Aucun avis disponible pour le moment.</p>
          ) : (
            <div className="grid gap-px bg-slate-200 sm:grid-cols-3">
              {visibleReviews.map((review) => (
                <div key={review.id} className="flex flex-col bg-white p-4">
                  <StarRating value={review.rating} />
                  <p className="mt-2 flex-1 text-[1.02rem] leading-snug text-slate-700">"{review.text}"</p>
                  <div className="mt-3 flex items-center gap-2">
                    <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-orange-100 text-xs font-bold text-brand-orange">
                      {review.name.charAt(0).toUpperCase()}
                    </span>
                    <p className="text-[1rem] font-bold text-brand-blue">{formatReviewName(review.name)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </article>

        <article className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-[0_8px_18px_rgba(15,42,77,0.08)]">
          <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3">
            <h2 className="text-[2rem] font-extrabold uppercase tracking-tight text-brand-blue">
              Derniers articles (blog)
            </h2>
            <Link href="/blog" className="text-lg font-bold text-brand-blue transition hover:text-brand-orange">
              Voir tout &rarr;
            </Link>
          </div>

          {visiblePosts.length === 0 ? (
            <p className="p-5 text-sm text-slate-600">Aucun article disponible pour le moment.</p>
          ) : (
            <div className="grid gap-px bg-slate-200 sm:grid-cols-2">
              {visiblePosts.map((post) => (
                <article key={post.id} className="bg-white p-3">
                  <Link href={`/blog/${post.slug}`} className="block overflow-hidden rounded-lg">
                    <Image
                      src={post.image}
                      alt={post.title}
                      width={480}
                      height={270}
                      className="aspect-[16/9] w-full object-cover"
                    />
                  </Link>
                  <Link
                    href={`/blog/${post.slug}`}
                    className="mt-2 block text-[1.17rem] font-extrabold leading-snug text-brand-blue transition hover:text-brand-orange"
                  >
                    {post.title}
                  </Link>
                  <p className="mt-1 text-sm text-slate-500">{post.publishedAt}</p>
                </article>
              ))}
            </div>
          )}
        </article>
      </div>
    </section>
  );
};
