import { reviews as fallbackReviews } from "@/data/reviews";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import type { Review } from "@/types";

type ReviewRow = {
  id: string;
  customer_name: string;
  rating: number;
  testimonial_text: string;
  role: string | null;
  avatar_image_path: string | null;
  is_active: boolean;
  created_at: string;
};

const REVIEWS_SELECT =
  "id, customer_name, rating, testimonial_text, role, avatar_image_path, is_active, created_at";

const mapReviewRow = (row: ReviewRow): Review => ({
  id: row.id,
  name: row.customer_name,
  rating: row.rating,
  text: row.testimonial_text,
  role: row.role ?? undefined,
  avatarImagePath: row.avatar_image_path ?? undefined,
  isActive: row.is_active,
  createdAt: row.created_at,
});

const getFallbackActiveReviews = (): Review[] => {
  return fallbackReviews.filter((review) => review.isActive !== false);
};

export const getActiveReviews = async (): Promise<Review[]> => {
  const supabase = getSupabaseServerClient();

  if (!supabase) {
    return getFallbackActiveReviews();
  }

  const { data, error } = await supabase
    .from("reviews")
    .select(REVIEWS_SELECT)
    .eq("is_active", true)
    .order("created_at", { ascending: false });

  if (error || !data) {
    return getFallbackActiveReviews();
  }

  return (data as ReviewRow[]).map(mapReviewRow);
};
