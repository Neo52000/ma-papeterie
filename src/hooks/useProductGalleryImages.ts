import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface ProductImageRow {
  id: string;
  url_originale: string | null;
  url_optimisee: string | null;
  alt_seo: string | null;
  is_principal: boolean;
  display_order: number | null;
}

/**
 * Fetch the gallery images for a product from the product_images table.
 * Ordered by display_order, then is_principal desc.
 *
 * Returns an array of image URLs (url_optimisee || url_originale).
 * Safe to call with null/undefined productId — query is disabled.
 */
export function useProductGalleryImages(productId: string | null | undefined) {
  return useQuery({
    queryKey: ["product_images", productId],
    enabled: !!productId,
    staleTime: 5 * 60_000,
    queryFn: async (): Promise<string[]> => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const sbAny = supabase as any;
      const { data, error } = await sbAny
        .from("product_images")
        .select("id, url_originale, url_optimisee, is_principal, display_order")
        .eq("product_id", productId)
        .order("display_order")
        .order("is_principal", { ascending: false });

      if (error) throw error;
      return ((data ?? []) as ProductImageRow[])
        .map((row) => row.url_optimisee || row.url_originale)
        .filter((url): url is string => !!url);
    },
  });
}
