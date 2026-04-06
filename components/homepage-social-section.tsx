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
  const mobileReviews = visibleReviews.slice(0, 2);
  const mobilePosts = visiblePosts.slice(0, 1);

  return (
    <section className="bg-[#f1f3f5] pb-20 sm:pb-8">
      <div className="mx-auto grid max-w-7xl gap-2.5 px-3 sm:gap-4 sm:px-5 lg:grid-cols-2 lg:px-6">
        <article className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-[0_8px_18px_rgba(15,42,77,0.08)]">
          <div className="flex items-center justify-between border-b border-slate-200 px-3 py-2 sm:px-5 sm:py-3">
            <h2 className="text-[15px] font-extrabold uppercase tracking-tight text-brand-blue sm:text-[2rem]">Avis clients</h2>
            <Link href="/contact" className="text-[11px] font-bold text-brand-blue transition hover:text-brand-orange sm:text-lg">
              Voir tous &rarr;
            </Link>
          </div>

          {visibleReviews.length === 0 ? (
            <p className="p-5 text-sm text-slate-600">Aucun avis disponible pour le moment.</p>
          ) : (
            <div>
              <div className="flex gap-2 overflow-x-auto p-2.5 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden md:hidden">
                {mobileReviews.map((review) => (
                  <div key={review.id} className="flex min-w-[204px] shrink-0 flex-col rounded-lg bg-white p-2">
                    <StarRating value={review.rating} />
                    <p
                      className="mt-1.5 flex-1 text-[11px] leading-snug text-slate-700"
                      style={{
                        display: "-webkit-box",
                        WebkitBoxOrient: "vertical",
                        WebkitLineClamp: 3,
                        overflow: "hidden",
                      }}
                    >
                      "{review.text}"
                    </p>
                    <div className="mt-2 flex items-center gap-2">
                      <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-orange-100 text-[9px] font-bold text-brand-orange">
                        {review.name.charAt(0).toUpperCase()}
                      </span>
                      <p className="text-xs font-bold text-brand-blue">{formatReviewName(review.name)}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="hidden bg-slate-200 md:grid md:grid-cols-3 md:gap-px">
                {visibleReviews.map((review) => (
                  <div key={review.id} className="flex flex-col bg-white p-4">
                    <StarRating value={review.rating} />
                    <p
                      className="mt-2 flex-1 text-[1.02rem] leading-snug text-slate-700"
                      style={{
                        display: "-webkit-box",
                        WebkitBoxOrient: "vertical",
                        WebkitLineClamp: 4,
                        overflow: "hidden",
                      }}
                    >
                      "{review.text}"
                    </p>
                    <div className="mt-3 flex items-center gap-2">
                      <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-orange-100 text-xs font-bold text-brand-orange">
                        {review.name.charAt(0).toUpperCase()}
                      </span>
                      <p className="text-[1rem] font-bold text-brand-blue">{formatReviewName(review.name)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </article>

        <article className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-[0_8px_18px_rgba(15,42,77,0.08)]">
          <div className="flex items-center justify-between border-b border-slate-200 px-3 py-2 sm:px-5 sm:py-3">
            <h2 className="text-base font-extrabold uppercase tracking-tight text-brand-blue sm:text-[2rem]">
              Derniers articles (blog)
            </h2>
            <Link href="/blog" className="text-[11px] font-bold text-brand-blue transition hover:text-brand-orange sm:text-lg">
              Voir tout &rarr;
            </Link>
          </div>

          {visiblePosts.length === 0 ? (
            <p className="p-5 text-sm text-slate-600">Aucun article disponible pour le moment.</p>
          ) : (
            <div>
              <div className="flex gap-2 overflow-x-auto p-2.5 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden md:hidden">
                {mobilePosts.map((post) => {
                  const image = getSafeNextImageProps(post.image);
                  return (
                    <article
                      key={post.id}
                      className="min-w-[238px] shrink-0 rounded-lg border border-slate-200 bg-white p-2"
                    >
                      <Link href={`/blog/${post.slug}`} className="flex items-start gap-2.5">
                        <Image
                          src={image.src}
                          alt={post.title}
                          width={176}
                          height={99}
                          unoptimized={image.unoptimized}
                          className="aspect-video h-[72px] w-[124px] shrink-0 rounded-md object-cover"
                        />
                        <div className="min-w-0">
                          <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                            {post.publishedAt}
                          </p>
                          <p
                            className="mt-0.5 text-[12px] font-extrabold leading-snug text-brand-blue"
                            style={{
                              display: "-webkit-box",
                              WebkitBoxOrient: "vertical",
                              WebkitLineClamp: 2,
                              overflow: "hidden",
                            }}
                          >
                            {post.title}
                          </p>
                          <p
                            className="mt-1 text-[11px] leading-snug text-slate-600"
                            style={{
                              display: "-webkit-box",
                              WebkitBoxOrient: "vertical",
                              WebkitLineClamp: 2,
                              overflow: "hidden",
                            }}
                          >
                            {post.excerpt}
                          </p>
                          <span className="mt-1 inline-flex text-[11px] font-bold text-brand-orange">
                            Lire &rarr;
                          </span>
                        </div>
                      </Link>
                    </article>
                  );
                })}
              </div>

              <div className="hidden bg-slate-200 md:grid md:grid-cols-2 md:gap-px">
                {visiblePosts.map((post) => {
                  const image = getSafeNextImageProps(post.image);
                  return (
                    <article key={post.id} className="bg-white p-3">
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
                        className="mt-2 block text-[1.17rem] font-extrabold leading-snug text-brand-blue transition hover:text-brand-orange"
                        style={{
                          display: "-webkit-box",
                          WebkitBoxOrient: "vertical",
                          WebkitLineClamp: 2,
                          overflow: "hidden",
                        }}
                      >
                        {post.title}
                      </Link>
                      <p className="mt-1 text-sm text-slate-500">{post.publishedAt}</p>
                    </article>
                  );
                })}
              </div>
            </div>
          )}
        </article>
      </div>
    </section>
  );
};
