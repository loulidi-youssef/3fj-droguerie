import {
  getAdminAdAnalyticsDashboard,
  type AdminAdAnalyticsDashboard,
  type AdminAdAnalyticsRow,
} from "@/lib/admin-ad-analytics";
import { getAdminAdPlans, type AdminAdPlan } from "@/lib/admin-ad-plans";
import { getAdminAds, type AdminAd } from "@/lib/admin-ads";
import { parseFlashMessage } from "@/app/admin/publicites/lib/formatters";

export type AdminPublicitesSearchParams = {
  success?: string | string[];
  error?: string | string[];
};

export type AdminPublicitesPageData = {
  ads: AdminAd[];
  plans: AdminAdPlan[];
  analytics: AdminAdAnalyticsDashboard;
  analyticsByAdId: Map<string, AdminAdAnalyticsRow>;
  successMessage: string;
  errorMessage: string;
};

export const getAdminPublicitesPageData = async (
  searchParams: AdminPublicitesSearchParams,
): Promise<AdminPublicitesPageData> => {
  const [ads, plans, analytics] = await Promise.all([
    getAdminAds(),
    getAdminAdPlans(),
    getAdminAdAnalyticsDashboard(),
  ]);

  return {
    ads,
    plans,
    analytics,
    analyticsByAdId: new Map(analytics.rows.map((row) => [row.adId, row])),
    successMessage: parseFlashMessage(searchParams.success),
    errorMessage: parseFlashMessage(searchParams.error),
  };
};

