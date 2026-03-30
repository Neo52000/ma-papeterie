import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface PrinterBrand {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
}

export function usePrinterBrands() {
  return useQuery({
    queryKey: ["printer-brands"],
    staleTime: 10 * 60_000,
    queryFn: async (): Promise<PrinterBrand[]> => {
      const { data, error } = await (supabase.from("printer_brands" as any) as any)
        .select("id, name, slug, logo_url")
        .eq("is_active", true)
        .order("display_order")
        .order("name");

      if (error) throw error;
      return (data ?? []) as PrinterBrand[];
    },
  });
}
