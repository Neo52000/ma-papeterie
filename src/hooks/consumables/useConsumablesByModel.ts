import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface Consumable {
  id: string;
  name: string;
  slug: string;
  sku: string | null;
  ean: string | null;
  consumable_type: string;
  brand: string | null;
  is_oem: boolean;
  color: string | null;
  capacity: string | null;
  page_yield: number | null;
  price_ht: number | null;
  price_ttc: number | null;
  image_url: string | null;
  description: string | null;
  stock_quantity: number;
  link_type: string;
}

export interface ConsumableFilters {
  consumable_type?: string;
  is_oem?: boolean | null;
  color?: string;
}

export function useConsumablesByModel(
  modelId: string | null,
  filters?: ConsumableFilters
) {
  return useQuery({
    queryKey: ["consumables-by-model", modelId, filters],
    enabled: !!modelId,
    staleTime: 5 * 60_000,
    queryFn: async (): Promise<Consumable[]> => {
      // Get consumable IDs linked to this printer model
      const { data: links, error: linksError } = await (supabase.from("printer_consumable_links" as any) as any)
        .select("consumable_id, link_type")
        .eq("printer_model_id", modelId);

      if (linksError) throw linksError;
      if (!links || links.length === 0) return [];

      const consumableIds = (links as any[]).map((l: { consumable_id: string }) => l.consumable_id);
      const linkMap = new Map((links as any[]).map((l: { consumable_id: string; link_type: string }) => [l.consumable_id, l.link_type]));

      let query = (supabase.from("consumables" as any) as any)
        .select("id, name, slug, sku, ean, consumable_type, brand, is_oem, color, capacity, page_yield, price_ht, price_ttc, image_url, description, stock_quantity")
        .in("id", consumableIds)
        .eq("is_active", true);

      if (filters?.consumable_type) {
        query = query.eq("consumable_type", filters.consumable_type);
      }
      if (filters?.is_oem !== undefined && filters?.is_oem !== null) {
        query = query.eq("is_oem", filters.is_oem);
      }
      if (filters?.color) {
        query = query.eq("color", filters.color);
      }

      query = query.order("is_oem", { ascending: false }).order("name");

      const { data, error } = await query;
      if (error) throw error;

      return ((data ?? []) as any[]).map((c: { id: string; [key: string]: unknown }) => ({
        ...c,
        link_type: linkMap.get(c.id) ?? "compatible",
      })) as Consumable[];
    },
  });
}
