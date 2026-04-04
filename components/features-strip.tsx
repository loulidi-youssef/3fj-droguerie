import { homepageContent } from "@/data/homepage";

export const FeaturesStrip = () => {
  return (
    <section className="bg-white py-7 sm:py-8">
      <div className="mx-auto grid max-w-7xl gap-3 px-4 sm:grid-cols-2 sm:px-5 lg:grid-cols-4 lg:px-6">
        {homepageContent.featuresStrip.items.map((feature) => (
          <div
            key={feature}
            className="flex min-h-[64px] items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-brand-blue"
          >
            <span className="h-2 w-2 rounded-full bg-brand-orange" aria-hidden />
            {feature}
          </div>
        ))}
      </div>
    </section>
  );
};
