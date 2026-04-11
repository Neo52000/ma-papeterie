import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface ClientOrder {
  id: string;
  order_number: string;
  status: string;
  payment_status: string;
  total_amount: number;
  delivery_cost: number | null;
  customer_email: string;
  shipping_method_name: string | null;
  created_at: string;
  items_count: number;
}

export function useClientOrders(userId: string | null) {
  return useQuery({
    queryKey: ["client-orders", userId],
    queryFn: async (): Promise<ClientOrder[]> => {
      if (!userId) return [];

      const { data: orders, error } = await supabase
        .from("orders")
        .select("id, order_number, status, payment_status, total_amount, delivery_cost, customer_email, shipping_method_name, created_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Get item counts per order
      const orderIds = (orders ?? []).map((o) => o.id);
      let itemCounts: Record<string, number> = {};

      if (orderIds.length > 0) {
        const { data: items } = await supabase
          .from("order_items")
          .select("order_id, quantity")
          .in("order_id", orderIds);

        if (items) {
          itemCounts = items.reduce((acc, item) => {
            acc[item.order_id] = (acc[item.order_id] ?? 0) + (item.quantity ?? 1);
            return acc;
          }, {} as Record<string, number>);
        }
      }

      return (orders ?? []).map((o) => ({
        ...o,
        items_count: itemCounts[o.id] ?? 0,
      }));
    },
    enabled: !!userId,
    staleTime: 2 * 60_000,
    gcTime: 5 * 60_000,
  });
}
