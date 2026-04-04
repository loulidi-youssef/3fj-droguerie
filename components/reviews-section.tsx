import { StarRating } from "@/components/star-rating";
import { homepageContent } from "@/data/homepage";
import { getActiveReviews } from "@/lib/reviews";

export const ReviewsSection = async () => {
  const reviews = await getActiveReviews();

  return (
    <section className="bg-brand-light py-14">
      <div className="mx-auto max-w-7xl px-4 sm:px-5 lg:px-6">
        <h2 className="text-2xl font-extrabold text-brand-blue sm:text-3xl">
          {homepageContent.reviews.title}
        </h2>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-600">
          {homepageContent.reviews.subtitle}
        </p>

        {reviews.length === 0 ? (
          <p className="mt-7 rounded-2xl bg-white p-4 text-sm text-slate-600 shadow-card">
            Aucun avis disponible pour le moment.
          </p>
        ) : (
          <div className="mt-7 grid gap-5 md:grid-cols-3">
            {reviews.map((review) => (
              <article
                key={review.id}
                className="flex h-full flex-col rounded-3xl border border-slate-200 bg-white p-5 shadow-card"
              >
                <StarRating value={review.rating} />
                <p className="mt-3 flex-1 text-sm leading-relaxed text-slate-700">
                  "{review.text}"
                </p>
                <p className="mt-4 text-sm font-bold text-brand-blue">{review.name}</p>
                {review.role ? <p className="text-xs text-slate-500">{review.role}</p> : null}
              </article>
            ))}
          </div>
        )}
      </div>
    </section>
  );
};
