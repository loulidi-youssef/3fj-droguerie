import { getSupabaseServerClient } from "@/lib/supabase/server";
import type { Ad, AdPosition } from "@/types";

type AdRow = {
  id: string;
  image_url: string;
  title: string | null;
  description: string | null;
  link: string;
  position: string;
  is_active: boolean;
  start_date: string | null;
  end_date: string | null;
  created_at: string;
};

export type ActiveAdsByPosition = {
  top: Ad | null;
  middle: Ad | null;
};

const ADS_SELECT =
  "id, image_url, title, description, link, position, is_active, start_date, end_date, created_at";

const isAdPosition = (value: string): value is AdPosition => {
  return value === "top" || value === "middle";
};

const toTimestamp = (value: string | null | undefined): number | null => {
  if (!value) {
    return null;
  }

  const parsed = new Date(value).getTime();
  if (Number.isNaN(parsed)) {
    return null;
  }

  return parsed;
};

const mapAdRow = (row: AdRow): Ad | null => {
  if (!isAdPosition(row.position)) {
    return null;
  }

  return {
    id: row.id,
    imageUrl: row.image_url,
    title: row.title,
    description: row.description,
    link: row.link,
    position: row.position,
    isActive: row.is_active,
    startDate: row.start_date,
    endDate: row.end_date,
    createdAt: row.created_at,
  };
};

export const isAdVisibleNow = (ad: Ad, now: number = Date.now()): boolean => {
  if (!ad.isActive) {
    return false;
  }

  const startTimestamp = toTimestamp(ad.startDate);
  if (startTimestamp !== null && startTimestamp > now) {
    return false;
  }

  const endTimestamp = toTimestamp(ad.endDate);
  if (endTimestamp !== null && endTimestamp <= now) {
    return false;
  }

  return true;
};

export const getActiveAds = async (): Promise<Ad[]> => {
  const supabase = getSupabaseServerClient();

  if (!supabase) {
    return [];
  }

  const { data, error } = await supabase
    .from("ads")
    .select(ADS_SELECT)
    .eq("is_active", true)
    .order("created_at", { ascending: false });

  if (error || !data) {
    return [];
  }

  const mapped = (data as AdRow[])
    .map(mapAdRow)
    .filter((ad): ad is Ad => Boolean(ad));

  return mapped.filter((ad) => isAdVisibleNow(ad));
};

export const getActiveAdsGroupedByPosition = async (): Promise<ActiveAdsByPosition> => {
  const activeAds = await getActiveAds();

  const grouped: ActiveAdsByPosition = {
    top: null,
    middle: null,
  };

  for (const ad of activeAds) {
    if (ad.position === "top" && !grouped.top) {
      grouped.top = ad;
      continue;
    }

    if (ad.position === "middle" && !grouped.middle) {
      grouped.middle = ad;
    }

    if (grouped.top && grouped.middle) {
      break;
    }
  }

  return grouped;
};

