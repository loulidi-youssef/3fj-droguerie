import { businessInfo } from "@/data/business";
import { homepageContent } from "@/data/homepage";

export const TopBar = () => {
  const compactAddress = businessInfo.address
    .replace("Route Meknes", "Rte Meknes");

  return (
    <div className="bg-brand-orange text-white">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-2 px-3 py-1 text-[10px] font-medium sm:flex-wrap sm:gap-x-5 sm:gap-y-1 sm:px-5 sm:py-1.5 sm:text-xs lg:px-6">
        <p className="hidden items-center gap-1.5 md:inline-flex">
          <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="currentColor" aria-hidden>
            <path d="M12 2a7 7 0 0 0-7 7c0 4.87 6.12 12.08 6.38 12.39a.8.8 0 0 0 1.24 0C12.88 21.08 19 13.87 19 9a7 7 0 0 0-7-7Zm0 9.6a2.6 2.6 0 1 1 0-5.2 2.6 2.6 0 0 1 0 5.2Z" />
          </svg>
          <span className="truncate">{compactAddress}</span>
        </p>
        <p className="inline-flex min-w-0 items-center gap-1.5">
          <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="currentColor" aria-hidden>
            <path d="M6.35 10.28a15.1 15.1 0 0 0 7.37 7.37l1.72-1.72a1.2 1.2 0 0 1 1.22-.28c1.12.37 2.3.56 3.49.56.66 0 1.2.54 1.2 1.2V21a1.2 1.2 0 0 1-1.2 1.2A18.15 18.15 0 0 1 1.8 3.85 1.2 1.2 0 0 1 3 2.65h3.49c.66 0 1.2.54 1.2 1.2 0 1.19.19 2.37.56 3.49.13.42.03.87-.28 1.19l-1.62 1.75Z" />
          </svg>
          <span className="truncate">
            {homepageContent.topBar.phoneLabel}: {businessInfo.phoneDisplay}
          </span>
        </p>
        <p className="hidden items-center gap-1.5 whitespace-nowrap font-semibold text-orange-50 md:inline-flex">
          <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="currentColor" aria-hidden>
            <path d="M3.5 6.5a1 1 0 0 1 1-1h9a1 1 0 0 1 1 1V9h2.4a1 1 0 0 1 .77.36l2.9 3.45a1 1 0 0 1 .23.64v3.05a1 1 0 0 1-1 1h-.96a2.75 2.75 0 0 1-5.34 0H9.84a2.75 2.75 0 0 1-5.34 0H4.5a1 1 0 0 1-1-1V6.5Zm13 5.5v1.9h2.6L17.5 12h-1Zm-10.75 4.75a1.25 1.25 0 1 0 0-2.5 1.25 1.25 0 0 0 0 2.5Zm10 0a1.25 1.25 0 1 0 0-2.5 1.25 1.25 0 0 0 0 2.5Z" />
          </svg>
          <span>{homepageContent.topBar.deliveryMessage}</span>
        </p>
      </div>
    </div>
  );
};
