import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface PopularPrinter {
  id: string;
  name: string;
  slug: string;
  printer_type: string | null;
  brand_name: string;
  brand_slug: string;
  brand_logo_url: string | null;
}

export function usePopularPrinters(limit: number = 8) {
  return useQuery({
    queryKey: ["popular-printers", limit],
    staleTime: 10 * 60_000,
    queryFn: async (): Promise<PopularPrinter[]> => {
      const { data, error } = await (supabase as any)
        .from("printer_models")
        .select("id, name, slug, printer_type, search_count, printer_brands!inner(name, slug, logo_url)")
        .eq("is_active", true)
        .gt("search_count", 0)
        .order("search_count", { ascending: false })
        .limit(limit);

      if (error) throw error;

      return (data ?? []).map((m: { id: string; name: string; slug: string; printer_type: string | null; printer_brands: { name: string; slug: string; logo_url: string | null } }) => ({
        id: m.id,
        name: m.name,
        slug: m.slug,
        printer_type: m.printer_type,
        brand_name: m.printer_brands.name,
        brand_slug: m.printer_brands.slug,
        brand_logo_url: m.printer_brands.logo_url,
      }));
    },
  });
}

export function useIncrementSearchCount() {
  return async (modelId: string) => {
    await (supabase as any).rpc("increment_printer_search_count", {
      model_id: modelId,
    });
  };
}
