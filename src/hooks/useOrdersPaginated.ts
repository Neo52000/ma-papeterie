import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

// ── Types ────────────────────────────────────────────────────────────────────

export interface OrderItem {
  id: string;
  order_id: string;
  product_id: string;
  product_name: string;
  product_price: number;
  quantity: number;
  subtotal: number;
}

export type OrderStatus = "pending" | "confirmed" | "preparing" | "shipped" | "delivered" | "cancelled";

export interface Order {
  id: string;
  user_id: string;
  order_number: string;
  status: OrderStatus;
  total_amount: number;
  shipping_address?: any;
  billing_address?: any;
  customer_email: string;
  customer_phone?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
  order_items?: OrderItem[];
}

export interface OrderFilters {
  search: string;
  statuses: OrderStatus[];
  dateFrom: string | null;
  dateTo: string | null;
  sortBy: "created_at" | "total_amount" | "order_number" | "status";
  sortDir: "asc" | "desc";
  page: number;
  pageSize: number;
}

export const DEFAULT_FILTERS: OrderFilters = {
  search: "",
  statuses: [],
  dateFrom: null,
  dateTo: null,
  sortBy: "created_at",
  sortDir: "desc",
  page: 0,
  pageSize: 25,
};

export const STATUS_LABELS: Record<OrderStatus, string> = {
  pending: "En attente",
  confirmed: "Confirmée",
  preparing: "En préparation",
  shipped: "Expédiée",
  delivered: "Livrée",
  cancelled: "Annulée",
};

export const STATUS_COLORS: Record<OrderStatus, string> = {
  pending: "bg-yellow-100 text-yellow-800 border-yellow-200",
  confirmed: "bg-blue-100 text-blue-800 border-blue-200",
  preparing: "bg-purple-100 text-purple-800 border-purple-200",
  shipped: "bg-indigo-100 text-indigo-800 border-indigo-200",
  delivered: "bg-green-100 text-green-800 border-green-200",
  cancelled: "bg-red-100 text-red-800 border-red-200",
};

// ── Hook: paginated orders ───────────────────────────────────────────────────

export function useOrdersPaginated(filters: OrderFilters) {
  return useQuery({
    queryKey: ["orders-paginated", filters],
    queryFn: async () => {
      let query = supabase
        .from("orders")
        .select(
          `*, order_items(id, product_id, product_name, product_price, quantity, subtotal)`,
          { count: "exact" },
        );

      // Search
      if (filters.search) {
        query = query.or(
          `order_number.ilike.%${filters.search}%,customer_email.ilike.%${filters.search}%`,
        );
      }

      // Status filter
      if (filters.statuses.length > 0) {
        query = query.in("status", filters.statuses);
      }

      // Date range
      if (filters.dateFrom) {
        query = query.gte("created_at", filters.dateFrom);
      }
      if (filters.dateTo) {
        query = query.lte("created_at", `${filters.dateTo}T23:59:59`);
      }

      // Sort
      query = query.order(filters.sortBy, { ascending: filters.sortDir === "asc" });

      // Pagination
      const from = filters.page * filters.pageSize;
      const to = from + filters.pageSize - 1;
      query = query.range(from, to);

      const { data, error, count } = await query;
      if (error) throw error;

      return {
        orders: (data ?? []) as Order[],
        totalCount: count ?? 0,
        totalPages: Math.ceil((count ?? 0) / filters.pageSize),
      };
    },
    placeholderData: (prev) => prev,
  });
}

// ── Hook: order stats ────────────────────────────────────────────────────────

export function useOrderStats() {
  return useQuery({
    queryKey: ["order-stats"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select("status, total_amount, created_at");
      if (error) throw error;

      const orders = data ?? [];
      const now = new Date();
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      const recentOrders = orders.filter((o) => new Date(o.created_at) >= thirtyDaysAgo);

      return {
        total: orders.length,
        pending: orders.filter((o) => o.status === "pending").length,
        revenue: orders.reduce((sum, o) => sum + Number(o.total_amount), 0),
        revenue30d: recentOrders.reduce((sum, o) => sum + Number(o.total_amount), 0),
        avgOrder: orders.length > 0
          ? orders.reduce((sum, o) => sum + Number(o.total_amount), 0) / orders.length
          : 0,
        orders30d: recentOrders.length,
      };
    },
  });
}

// ── Mutation: update status ──────────────────────────────────────────────────

export function useUpdateOrderStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ orderId, status }: { orderId: string; status: OrderStatus }) => {
      const { error } = await supabase
        .from("orders")
        .update({ status, updated_at: new Date().toISOString() })
        .eq("id", orderId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["orders-paginated"] });
      qc.invalidateQueries({ queryKey: ["order-stats"] });
      toast.success("Statut mis à jour");
    },
    onError: () => {
      toast.error("Erreur lors de la mise à jour du statut");
    },
  });
}

// ── Mutation: update order notes ─────────────────────────────────────────────

export function useUpdateOrderNotes() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ orderId, notes }: { orderId: string; notes: string }) => {
      const { error } = await supabase
        .from("orders")
        .update({ notes, updated_at: new Date().toISOString() })
        .eq("id", orderId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["orders-paginated"] });
      toast.success("Notes mises à jour");
    },
    onError: () => {
      toast.error("Erreur lors de la mise à jour des notes");
    },
  });
}
