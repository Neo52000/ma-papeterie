import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface PrinterModel {
  id: string;
  name: string;
  slug: string;
  series: string | null;
  printer_type: string | null;
  image_url: string | null;
}

export function usePrinterModels(brandId: string | null) {
  return useQuery({
    queryKey: ["printer-models", brandId],
    enabled: !!brandId,
    staleTime: 10 * 60_000,
    queryFn: async (): Promise<PrinterModel[]> => {
      const { data, error } = await (supabase as unknown as { from: (t: string) => ReturnType<typeof supabase.from> })
        .from("printer_models")
        .select("id, name, slug, series, printer_type, image_url")
        .eq("brand_id", brandId)
        .eq("is_active", true)
        .order("series")
        .order("name");

      if (error) throw error;
      return data ?? [];
    },
  });
}
