import type { Ad } from "@/types";

type HomepageAdBannerProps = {
  ad: Ad | null;
  slot: "top" | "middle";
};

const getAltText = (ad: Ad): string => {
  const title = ad.title?.trim();
  if (title) {
    return title;
  }

  return "Publicite sponsorisee";
};

export const HomepageAdBanner = ({ ad, slot }: HomepageAdBannerProps) => {
  if (!ad) {
    return null;
  }

  const hasOverlayContent = Boolean(ad.title?.trim() || ad.description?.trim());
  const containerHeightClass =
    slot === "top"
      ? "h-[132px] sm:h-[170px] lg:h-[220px]"
      : "h-[116px] sm:h-[142px] lg:h-[170px]";

  return (
    <section className={slot === "top" ? "bg-[#f1f3f5] pt-2" : "bg-[#f1f3f5] py-3"}>
      <div className="mx-auto max-w-7xl px-4 sm:px-5 lg:px-6">
        <a
          href={ad.link}
          target="_blank"
          rel="noopener noreferrer sponsored"
          className="group block overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-card"
        >
          <div className={`relative ${containerHeightClass}`}>
            <img
              src={ad.imageUrl}
              alt={getAltText(ad)}
              loading="lazy"
              className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.02] group-hover:opacity-95"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-slate-950/55 via-slate-950/25 to-transparent" />

            {hasOverlayContent ? (
              <div className="absolute inset-0 flex items-end p-3 sm:p-5">
                <div className="max-w-3xl text-white">
                  {ad.title ? (
                    <p className="text-sm font-bold uppercase tracking-wide sm:text-base">
                      {ad.title}
                    </p>
                  ) : null}
                  {ad.description ? (
                    <p className="mt-1 text-xs text-slate-100 sm:text-sm">{ad.description}</p>
                  ) : null}
                </div>
              </div>
            ) : null}

            <span className="absolute right-2 top-2 rounded-full bg-black/60 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-white">
              Publicite
            </span>
          </div>
        </a>
      </div>
    </section>
  );
};

