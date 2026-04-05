import { getAdminAds } from "@/lib/admin-ads";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

export type AdminAdAnalyticsStatus = "active" | "scheduled" | "inactive" | "expired";

export type AdminAdAnalyticsRow = {
  adId: string;
  title: string;
  imageUrl: string;
  position: "top" | "middle";
  status: AdminAdAnalyticsStatus;
  startDate: string | null;
  endDate: string | null;
  plan: {
    id: string;
    name: string;
    price: number;
    durationDays: number;
  } | null;
  views: number;
  clicks: number;
  ctr: number;
  estimatedRevenue: number;
};

export type AdminAdAnalyticsSummary = {
  totalActiveAds: number;
  totalScheduledAds: number;
  totalEstimatedRevenue: number;
  totalViews: number;
  totalClicks: number;
  averageCtr: number;
};

export type AdminAdAnalyticsDashboard = {
  summary: AdminAdAnalyticsSummary;
  rows: AdminAdAnalyticsRow[];
};

type AdEventRow = {
  ad_id: string;
  event_type: "view" | "click";
};

const toRoundedCtr = (clicks: number, views: number): number => {
  if (views <= 0) {
    return 0;
  }

  return Number(((clicks / views) * 100).toFixed(2));
};

const toAdStatus = (
  isActive: boolean,
  startDate: string | null,
  endDate: string | null,
  nowTimestamp: number,
): AdminAdAnalyticsStatus => {
  if (!isActive) {
    return "inactive";
  }

  const startTimestamp = startDate ? new Date(startDate).getTime() : null;
  const endTimestamp = endDate ? new Date(endDate).getTime() : null;

  if (startTimestamp !== null && !Number.isNaN(startTimestamp) && startTimestamp > nowTimestamp) {
    return "scheduled";
  }

  if (endTimestamp !== null && !Number.isNaN(endTimestamp) && endTimestamp <= nowTimestamp) {
    return "expired";
  }

  return "active";
};

const buildEmptySummary = (): AdminAdAnalyticsSummary => {
  return {
    totalActiveAds: 0,
    totalScheduledAds: 0,
    totalEstimatedRevenue: 0,
    totalViews: 0,
    totalClicks: 0,
    averageCtr: 0,
  };
};

const getAdEventCounters = async (
  adIds: string[],
): Promise<Map<string, { views: number; clicks: number }>> => {
  const counters = new Map<string, { views: number; clicks: number }>();
  if (adIds.length === 0) {
    return counters;
  }

  const supabaseAdmin = getSupabaseAdminClient();
  if (!supabaseAdmin) {
    return counters;
  }

  const { data, error } = await supabaseAdmin
    .from("ad_events")
    .select("ad_id, event_type")
    .in("ad_id", adIds);

  if (error || !data) {
    return counters;
  }

  for (const row of data as AdEventRow[]) {
    const existing = counters.get(row.ad_id) ?? { views: 0, clicks: 0 };
    if (row.event_type === "view") {
      existing.views += 1;
    } else if (row.event_type === "click") {
      existing.clicks += 1;
    }
    counters.set(row.ad_id, existing);
  }

  return counters;
};

export const getAdminAdAnalyticsDashboard = async (): Promise<AdminAdAnalyticsDashboard> => {
  const ads = await getAdminAds();
  if (ads.length === 0) {
    return {
      summary: buildEmptySummary(),
      rows: [],
    };
  }

  const adIds = ads.map((ad) => ad.id);
  const eventCounters = await getAdEventCounters(adIds);
  const nowTimestamp = Date.now();

  const rows: AdminAdAnalyticsRow[] = ads.map((ad) => {
    const counters = eventCounters.get(ad.id) ?? { views: 0, clicks: 0 };
    const status = toAdStatus(ad.is_active, ad.start_date, ad.end_date, nowTimestamp);
    const estimatedRevenue = ad.ad_plan?.price ?? 0;

    return {
      adId: ad.id,
      title: ad.title?.trim() || "Sans titre",
      imageUrl: ad.image_url,
      position: ad.position,
      status,
      startDate: ad.start_date,
      endDate: ad.end_date,
      plan: ad.ad_plan
        ? {
            id: ad.ad_plan.id,
            name: ad.ad_plan.name,
            price: ad.ad_plan.price,
            durationDays: ad.ad_plan.duration_days,
          }
        : null,
      views: counters.views,
      clicks: counters.clicks,
      ctr: toRoundedCtr(counters.clicks, counters.views),
      estimatedRevenue,
    };
  });

  const summary = rows.reduce<AdminAdAnalyticsSummary>((accumulator, row) => {
    if (row.status === "active") {
      accumulator.totalActiveAds += 1;
      accumulator.totalEstimatedRevenue += row.estimatedRevenue;
    } else if (row.status === "scheduled") {
      accumulator.totalScheduledAds += 1;
      accumulator.totalEstimatedRevenue += row.estimatedRevenue;
    }

    accumulator.totalViews += row.views;
    accumulator.totalClicks += row.clicks;

    return accumulator;
  }, buildEmptySummary());

  summary.averageCtr = toRoundedCtr(summary.totalClicks, summary.totalViews);

  return {
    summary,
    rows,
  };
};
