import Image from "next/image";
import Link from "next/link";
import { getSafeNextImageProps } from "@/lib/image-optimization";
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
    <section className="bg-[#f1f3f5] pb-6 sm:pb-8">
      <div className="mx-auto grid max-w-7xl gap-3 px-4 sm:gap-4 sm:px-5 lg:grid-cols-2 lg:px-6">
        <article className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-[0_8px_18px_rgba(15,42,77,0.08)]">
          <div className="flex items-center justify-between border-b border-slate-200 px-4 py-2.5 sm:px-5 sm:py-3">
            <h2 className="text-lg font-extrabold uppercase tracking-tight text-brand-blue sm:text-[2rem]">Avis clients</h2>
            <Link href="/contact" className="text-xs font-bold text-brand-blue transition hover:text-brand-orange sm:text-lg">
              Voir tous &rarr;
            </Link>
          </div>

          {visibleReviews.length === 0 ? (
            <p className="p-5 text-sm text-slate-600">Aucun avis disponible pour le moment.</p>
          ) : (
            <div className="grid gap-px bg-slate-200 sm:grid-cols-3">
              {visibleReviews.map((review) => (
                <div key={review.id} className="flex flex-col bg-white p-3 sm:p-4">
                  <StarRating value={review.rating} />
                  <p
                    className="mt-1.5 flex-1 text-sm leading-snug text-slate-700 sm:mt-2 sm:text-[1.02rem]"
                    style={{
                      display: "-webkit-box",
                      WebkitBoxOrient: "vertical",
                      WebkitLineClamp: 4,
                      overflow: "hidden",
                    }}
                  >
                    "{review.text}"
                  </p>
                  <div className="mt-2.5 flex items-center gap-2 sm:mt-3">
                    <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-orange-100 text-[10px] font-bold text-brand-orange sm:h-7 sm:w-7 sm:text-xs">
                      {review.name.charAt(0).toUpperCase()}
                    </span>
                    <p className="text-sm font-bold text-brand-blue sm:text-[1rem]">{formatReviewName(review.name)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </article>

        <article className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-[0_8px_18px_rgba(15,42,77,0.08)]">
          <div className="flex items-center justify-between border-b border-slate-200 px-4 py-2.5 sm:px-5 sm:py-3">
            <h2 className="text-lg font-extrabold uppercase tracking-tight text-brand-blue sm:text-[2rem]">
              Derniers articles (blog)
            </h2>
            <Link href="/blog" className="text-xs font-bold text-brand-blue transition hover:text-brand-orange sm:text-lg">
              Voir tout &rarr;
            </Link>
          </div>

          {visiblePosts.length === 0 ? (
            <p className="p-5 text-sm text-slate-600">Aucun article disponible pour le moment.</p>
          ) : (
            <div className="grid gap-px bg-slate-200 sm:grid-cols-2">
              {visiblePosts.map((post) => {
                const image = getSafeNextImageProps(post.image);
                return (
                <article key={post.id} className="bg-white p-2.5 sm:p-3">
                  <Link href={`/blog/${post.slug}`} className="block overflow-hidden rounded-lg">
                    <Image
                      src={image.src}
                      alt={post.title}
                      width={480}
                      height={270}
                      unoptimized={image.unoptimized}
                      className="aspect-[16/9] w-full object-cover"
                    />
                  </Link>
                  <Link
                    href={`/blog/${post.slug}`}
                    className="mt-1.5 block text-base font-extrabold leading-snug text-brand-blue transition hover:text-brand-orange sm:mt-2 sm:text-[1.17rem]"
                    style={{
                      display: "-webkit-box",
                      WebkitBoxOrient: "vertical",
                      WebkitLineClamp: 2,
                      overflow: "hidden",
                    }}
                  >
                    {post.title}
                  </Link>
                  <p className="mt-1 text-xs text-slate-500 sm:text-sm">{post.publishedAt}</p>
                </article>
                );
              })}
            </div>
          )}
        </article>
      </div>
    </section>
  );
};
