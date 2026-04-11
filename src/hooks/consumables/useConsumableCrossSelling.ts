import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Consumable } from "./useConsumablesByModel";

// Tables not yet in generated Supabase types
const db = supabase as unknown as { from: (table: string) => ReturnType<typeof supabase.from> };

interface CrossSellingLink {
  related_consumable_id: string;
  relation_type: string;
}

export function useConsumableCrossSelling(consumableId: string | null) {
  return useQuery({
    queryKey: ["consumable-cross-selling", consumableId],
    enabled: !!consumableId,
    staleTime: 10 * 60_000,
    queryFn: async (): Promise<Consumable[]> => {
      const { data: links, error: linksError } = await db
        .from("consumable_cross_selling")
        .select("related_consumable_id, relation_type")
        .eq("consumable_id", consumableId);

      if (linksError) throw linksError;
      if (!links || links.length === 0) return [];

      const typedLinks = links as unknown as CrossSellingLink[];
      const relatedIds = typedLinks.map((l) => l.related_consumable_id);

      const { data, error } = await db
        .from("consumables")
        .select("id, name, slug, sku, ean, consumable_type, brand, is_oem, color, capacity, page_yield, price_ht, price_ttc, image_url, description, stock_quantity")
        .in("id", relatedIds)
        .eq("is_active", true);

      if (error) throw error;

      const linkMap = new Map(typedLinks.map((l) => [l.related_consumable_id, l.relation_type]));
      return ((data ?? []) as (Omit<Consumable, 'link_type'>)[]).map((c) => ({
        ...c,
        link_type: linkMap.get(c.id) ?? "cross_sell",
      })) as Consumable[];
    },
  });
}
