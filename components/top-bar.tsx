import { businessInfo } from "@/data/business";
import { homepageContent } from "@/data/homepage";

export const TopBar = () => {
  return (
    <div className="bg-brand-orange text-white">
      <div className="mx-auto flex max-w-7xl flex-col gap-1.5 px-4 py-2.5 text-xs font-medium sm:flex-row sm:items-center sm:justify-between sm:px-5 sm:text-[13px] lg:px-6">
        <p className="truncate">{businessInfo.address}</p>
        <p>
          {homepageContent.topBar.phoneLabel}: {businessInfo.phoneDisplay}
        </p>
        <p className="font-semibold text-orange-100">{homepageContent.topBar.deliveryMessage}</p>
      </div>
    </div>
  );
};
