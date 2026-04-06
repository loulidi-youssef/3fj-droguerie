import type { AdminAdAnalyticsRow } from "@/lib/admin-ad-analytics";
import type { AdminAdPlan } from "@/lib/admin-ad-plans";
import type { AdminAd } from "@/lib/admin-ads";
import { AdItem } from "@/app/admin/publicites/components/ad-item";

type FormAction = (formData: FormData) => void | Promise<void>;

type AdsListProps = {
  ads: AdminAd[];
  plans: AdminAdPlan[];
  analyticsByAdId: Map<string, AdminAdAnalyticsRow>;
  updateAdAction: FormAction;
  toggleAdActiveAction: FormAction;
  deleteAdAction: FormAction;
};

export const AdsList = ({
  ads,
  plans,
  analyticsByAdId,
  updateAdAction,
  toggleAdActiveAction,
  deleteAdAction,
}: AdsListProps) => {
  if (ads.length === 0) {
    return (
      <div className="rounded-2xl bg-white p-6 shadow-card">
        <p className="text-sm text-slate-600">Aucune publicite en base pour le moment.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {ads.map((ad) => (
        <AdItem
          key={ad.id}
          ad={ad}
          plans={plans}
          adAnalytics={analyticsByAdId.get(ad.id)}
          updateAdAction={updateAdAction}
          toggleAdActiveAction={toggleAdActiveAction}
          deleteAdAction={deleteAdAction}
        />
      ))}
    </div>
  );
};

