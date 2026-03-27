import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface ShippingMethod {
  id: string;
  zone_id: string;
  zone_name: string;
  name: string;
  carrier: string;
  method_type: "delivery" | "relay_point" | "store_pickup";
  min_weight: number;
  max_weight: number;
  base_cost: number;
  cost_per_kg: number;
  free_above: number | null;
  delivery_days_min: number | null;
  delivery_days_max: number | null;
  is_active: boolean;
  sort_order: number;
}

export function calculateShippingCost(
  method: Pick<ShippingMethod, "method_type" | "base_cost" | "free_above">,
  cartTotal: number
): number {
  if (method.method_type === "store_pickup") return 0;
  if (method.free_above != null && method.free_above > 0 && cartTotal >= method.free_above) return 0;
  return method.base_cost;
}

export function formatDeliveryDays(method: Pick<ShippingMethod, "method_type" | "delivery_days_min" | "delivery_days_max">): string {
  if (method.method_type === "store_pickup") return "Retrait immédiat";
  if (method.delivery_days_min == null && method.delivery_days_max == null) return "";
  if (method.delivery_days_min === method.delivery_days_max) return `${method.delivery_days_min}j`;
  return `${method.delivery_days_min ?? "?"}–${method.delivery_days_max ?? "?"}j`;
}

export function useShippingMethods(zoneId?: string) {
  return useQuery<ShippingMethod[]>({
    queryKey: ["shipping-methods", zoneId ?? "all"],
    staleTime: 5 * 60_000,
    queryFn: async () => {
      let query = (supabase.from("shipping_methods" as any) as any)
        .select("*, shipping_zones!inner(name)")
        .eq("is_active", true)
        .order("sort_order");

      if (zoneId) {
        query = query.eq("zone_id", zoneId);
      }

      const { data, error } = await query;
      if (error) throw error;

      return (data ?? []).map((row: Record<string, unknown>) => {
        const zone = row.shipping_zones as { name: string } | null;
        return {
          id: row.id as string,
          zone_id: row.zone_id as string,
          zone_name: zone?.name ?? "",
          name: row.name as string,
          carrier: row.carrier as string,
          method_type: row.method_type as ShippingMethod["method_type"],
          min_weight: Number(row.min_weight ?? 0),
          max_weight: Number(row.max_weight ?? 30),
          base_cost: Number(row.base_cost ?? 0),
          cost_per_kg: Number(row.cost_per_kg ?? 0),
          free_above: row.free_above != null ? Number(row.free_above) : null,
          delivery_days_min: row.delivery_days_min as number | null,
          delivery_days_max: row.delivery_days_max as number | null,
          is_active: row.is_active as boolean,
          sort_order: row.sort_order as number,
        };
      });
    },
  });
}
