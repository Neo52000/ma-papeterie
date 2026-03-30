import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Consumable } from "./useConsumablesByModel";

export function useConsumableCrossSelling(consumableId: string | null) {
  return useQuery({
    queryKey: ["consumable-cross-selling", consumableId],
    enabled: !!consumableId,
    staleTime: 10 * 60_000,
    queryFn: async (): Promise<Consumable[]> => {
      const { data: links, error: linksError } = await (supabase.from("consumable_cross_selling" as any) as any)
        .select("related_consumable_id, relation_type")
        .eq("consumable_id", consumableId);

      if (linksError) throw linksError;
      if (!links || links.length === 0) return [];

      const relatedIds = (links as any[]).map((l: { related_consumable_id: string }) => l.related_consumable_id);

      const { data, error } = await (supabase.from("consumables" as any) as any)
        .select("id, name, slug, sku, ean, consumable_type, brand, is_oem, color, capacity, page_yield, price_ht, price_ttc, image_url, description, stock_quantity")
        .in("id", relatedIds)
        .eq("is_active", true);

      if (error) throw error;

      const linkMap = new Map((links as any[]).map((l: { related_consumable_id: string; relation_type: string }) => [l.related_consumable_id, l.relation_type]));
      return ((data ?? []) as any[]).map((c: { id: string; [key: string]: unknown }) => ({
        ...c,
        link_type: linkMap.get(c.id) ?? "cross_sell",
      })) as Consumable[];
    },
  });
}
