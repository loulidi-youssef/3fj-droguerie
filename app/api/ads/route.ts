import { NextResponse } from "next/server";
import type { Ad } from "@/types";
import { getActiveAdsGroupedByPosition } from "@/lib/ads";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const serializeAd = (ad: Ad | null) => {
  if (!ad) {
    return null;
  }

  return {
    id: ad.id,
    image_url: ad.imageUrl,
    title: ad.title,
    description: ad.description,
    link: ad.link,
    position: ad.position,
    start_date: ad.startDate ?? null,
    end_date: ad.endDate ?? null,
  };
};

export async function GET() {
  const groupedAds = await getActiveAdsGroupedByPosition();

  return NextResponse.json({
    ads: {
      top: serializeAd(groupedAds.top),
      middle: serializeAd(groupedAds.middle),
    },
  });
}

