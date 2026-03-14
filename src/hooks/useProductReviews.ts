import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface ProductReview {
  id: string;
  product_id: string;
  author_name: string;
  author_company?: string;
  title?: string;
  body: string;
  rating: number;
  is_verified_purchase?: boolean;
  created_at: string;
  helpful_count: number;
  unhelpful_count: number;
}

export interface ReviewStats {
  review_count: number;
  avg_rating: number;
  five_star_count?: number;
  four_star_count?: number;
  three_star_count?: number;
  two_star_count?: number;
  one_star_count?: number;
}

// Helper: cast supabase to bypass stale generated types
const sb = supabase as any;

/**
 * Fetch published reviews for a product
 */
export function useProductReviews(productId: string, limit: number = 10) {
  return useQuery({
    queryKey: ["product-reviews", productId],
    queryFn: async () => {
      const { data, error } = await sb
        .from("product_reviews")
        .select(
          `
          id,
          product_id,
          author_name,
          author_company,
          title,
          body,
          rating,
          is_verified_purchase,
          created_at,
          helpful_count,
          unhelpful_count
        `
        )
        .eq("product_id", productId)
        .eq("is_published", true)
        .order("created_at", { ascending: false })
        .limit(limit);

      if (error) throw error;
      return (data as ProductReview[]) || [];
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Fetch review statistics (aggregate ratings) for a product
 */
export function useProductReviewStats(productId: string) {
  return useQuery({
    queryKey: ["product-review-stats", productId],
    queryFn: async () => {
      const { data, error } = await sb
        .from("v_product_review_stats")
        .select("*")
        .eq("product_id", productId)
        .single();

      if (error && error.code !== "PGRST116") throw error; // PGRST116 = no rows
      return (data as ReviewStats) || null;
    },
    staleTime: 10 * 60 * 1000, // 10 minutes (stats change slowly)
  });
}

/**
 * Submit a new review (requires moderation)
 */
export function useSubmitReview() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (reviewData: {
      productId: string;
      title?: string;
      body: string;
      rating: number;
      authorName: string;
      authorEmail: string;
      authorCompany?: string;
    }) => {
      const user = (await supabase.auth.getUser()).data.user;

      const { data, error } = await sb.from("product_reviews").insert({
        product_id: reviewData.productId,
        title: reviewData.title || undefined,
        body: reviewData.body,
        rating: reviewData.rating,
        author_name: reviewData.authorName,
        author_email: reviewData.authorEmail,
        author_company: reviewData.authorCompany || undefined,
        author_id: user?.id || undefined,
        is_published: false, // Awaits moderation
        is_verified_purchase: false, // Could be set via order verification
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      // Invalidate review queries for this product
      queryClient.invalidateQueries({
        queryKey: ["product-reviews", variables.productId],
      });
    },
  });
}

/**
 * Mark a review as helpful/unhelpful
 */
export function useMarkHelpful() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      reviewId,
      isHelpful,
    }: {
      reviewId: string;
      isHelpful: boolean;
    }) => {
      const column = isHelpful ? "helpful_count" : "unhelpful_count";

      const { data, error } = await sb.rpc("increment_review_count", {
        review_id: reviewId,
        count_type: column,
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["product-reviews", variables.productId],
      });
    },
  });
}
