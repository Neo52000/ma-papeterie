import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

// ── Types ────────────────────────────────────────────────────────────────────

export interface CustomerSummary {
  email: string;
  phone: string | null;
  orderCount: number;
  totalSpent: number;
  avgOrder: number;
  lastOrderDate: string;
  firstOrderDate: string;
  segment: "vip" | "regular" | "occasional" | "inactive";
}

export interface CustomerDetail extends CustomerSummary {
  orders: Array<{
    id: string;
    order_number: string;
    status: string;
    total_amount: number;
    created_at: string;
    items_count: number;
  }>;
  rfm?: {
    recency_score: number | null;
    frequency_score: number | null;
    monetary_score: number | null;
    rfm_segment: string | null;
    churn_risk: number | null;
    lifetime_value_estimate: number | null;
  };
}

export interface CustomerFilters {
  search: string;
  segment: string;
  sortBy: "totalSpent" | "orderCount" | "lastOrderDate" | "email";
  sortDir: "asc" | "desc";
  page: number;
  pageSize: number;
}

export const DEFAULT_CUSTOMER_FILTERS: CustomerFilters = {
  search: "",
  segment: "all",
  sortBy: "totalSpent",
  sortDir: "desc",
  page: 0,
  pageSize: 25,
};

// ── Segmentation logic ───────────────────────────────────────────────────────

function classifySegment(
  totalSpent: number,
  orderCount: number,
  daysSinceLastOrder: number,
): CustomerSummary["segment"] {
  if (totalSpent > 500 && orderCount >= 5) return "vip";
  if (orderCount >= 3 && daysSinceLastOrder < 90) return "regular";
  if (orderCount >= 1 && daysSinceLastOrder < 180) return "occasional";
  return "inactive";
}

// ── Hook: customer list ──────────────────────────────────────────────────────

export function useCustomerList(filters: CustomerFilters) {
  return useQuery({
    queryKey: ["customer-list", filters],
    queryFn: async () => {
      const { data: orders, error } = await supabase
        .from("orders")
        .select("customer_email, customer_phone, total_amount, created_at, status");
      if (error) throw error;

      const now = new Date();
      const map = new Map<string, {
        phone: string | null;
        orderCount: number;
        totalSpent: number;
        lastOrderDate: string;
        firstOrderDate: string;
      }>();

      for (const o of orders ?? []) {
        const prev = map.get(o.customer_email);
        if (!prev) {
          map.set(o.customer_email, {
            phone: o.customer_phone,
            orderCount: 1,
            totalSpent: Number(o.total_amount),
            lastOrderDate: o.created_at,
            firstOrderDate: o.created_at,
          });
        } else {
          prev.orderCount++;
          prev.totalSpent += Number(o.total_amount);
          if (!prev.phone && o.customer_phone) prev.phone = o.customer_phone;
          if (o.created_at > prev.lastOrderDate) prev.lastOrderDate = o.created_at;
          if (o.created_at < prev.firstOrderDate) prev.firstOrderDate = o.created_at;
        }
      }

      let customers: CustomerSummary[] = Array.from(map.entries()).map(
        ([email, d]) => {
          const daysSince = (now.getTime() - new Date(d.lastOrderDate).getTime()) / 86400000;
          return {
            email,
            phone: d.phone,
            orderCount: d.orderCount,
            totalSpent: d.totalSpent,
            avgOrder: d.totalSpent / d.orderCount,
            lastOrderDate: d.lastOrderDate,
            firstOrderDate: d.firstOrderDate,
            segment: classifySegment(d.totalSpent, d.orderCount, daysSince),
          };
        },
      );

      // Search
      if (filters.search) {
        const q = filters.search.toLowerCase();
        customers = customers.filter(
          (c) => c.email.toLowerCase().includes(q) || c.phone?.includes(q),
        );
      }

      // Segment filter
      if (filters.segment !== "all") {
        customers = customers.filter((c) => c.segment === filters.segment);
      }

      // Sort
      const dir = filters.sortDir === "asc" ? 1 : -1;
      customers.sort((a, b) => {
        switch (filters.sortBy) {
          case "totalSpent": return (a.totalSpent - b.totalSpent) * dir;
          case "orderCount": return (a.orderCount - b.orderCount) * dir;
          case "lastOrderDate":
            return (new Date(a.lastOrderDate).getTime() - new Date(b.lastOrderDate).getTime()) * dir;
          case "email": return a.email.localeCompare(b.email) * dir;
          default: return 0;
        }
      });

      const totalCount = customers.length;
      const totalPages = Math.ceil(totalCount / filters.pageSize);
      const start = filters.page * filters.pageSize;
      const paged = customers.slice(start, start + filters.pageSize);

      // Segment counts
      const segmentCounts = {
        all: totalCount,
        vip: customers.filter((c) => c.segment === "vip").length,
        regular: customers.filter((c) => c.segment === "regular").length,
        occasional: customers.filter((c) => c.segment === "occasional").length,
        inactive: customers.filter((c) => c.segment === "inactive").length,
      };

      // All customers (for non-filtered count)
      const allCustomers = Array.from(map.entries()).map(([email, d]) => {
        const daysSince = (now.getTime() - new Date(d.lastOrderDate).getTime()) / 86400000;
        return {
          email,
          totalSpent: d.totalSpent,
          orderCount: d.orderCount,
          segment: classifySegment(d.totalSpent, d.orderCount, daysSince),
        };
      });
      const globalSegmentCounts = {
        all: allCustomers.length,
        vip: allCustomers.filter((c) => c.segment === "vip").length,
        regular: allCustomers.filter((c) => c.segment === "regular").length,
        occasional: allCustomers.filter((c) => c.segment === "occasional").length,
        inactive: allCustomers.filter((c) => c.segment === "inactive").length,
      };

      return { customers: paged, totalCount, totalPages, segmentCounts: globalSegmentCounts };
    },
    placeholderData: (prev) => prev,
  });
}

// ── Hook: customer detail ────────────────────────────────────────────────────

export function useCustomerDetail(email: string | null) {
  return useQuery({
    queryKey: ["customer-detail", email],
    queryFn: async () => {
      if (!email) return null;

      // Fetch orders
      const { data: orders, error: ordersErr } = await supabase
        .from("orders")
        .select(`
          id, order_number, status, total_amount, created_at, customer_phone,
          order_items(id)
        `)
        .eq("customer_email", email)
        .order("created_at", { ascending: false });
      if (ordersErr) throw ordersErr;

      const orderList = (orders ?? []).map((o: any) => ({
        id: o.id,
        order_number: o.order_number,
        status: o.status,
        total_amount: Number(o.total_amount),
        created_at: o.created_at,
        items_count: o.order_items?.length ?? 0,
      }));

      const now = new Date();
      const totalSpent = orderList.reduce((s, o) => s + o.total_amount, 0);
      const orderCount = orderList.length;
      const lastOrderDate = orderList[0]?.created_at ?? "";
      const firstOrderDate = orderList[orderList.length - 1]?.created_at ?? "";
      const phone = orders?.[0]?.customer_phone ?? null;
      const daysSince = lastOrderDate
        ? (now.getTime() - new Date(lastOrderDate).getTime()) / 86400000
        : 999;

      // Try to get RFM score (by matching user_id through orders)
      let rfm: CustomerDetail["rfm"] = undefined;
      if (orders?.[0]) {
        const userId = (orders[0] as any).user_id;
        if (userId) {
          const { data: rfmData } = await supabase
            .from("customer_rfm_scores")
            .select("recency_score, frequency_score, monetary_score, rfm_segment, churn_risk, lifetime_value_estimate")
            .eq("user_id", userId)
            .maybeSingle();
          if (rfmData) rfm = rfmData;
        }
      }

      return {
        email,
        phone,
        orderCount,
        totalSpent,
        avgOrder: orderCount > 0 ? totalSpent / orderCount : 0,
        lastOrderDate,
        firstOrderDate,
        segment: classifySegment(totalSpent, orderCount, daysSince),
        orders: orderList,
        rfm,
      } as CustomerDetail;
    },
    enabled: !!email,
  });
}

// ── Hook: monthly revenue chart data ─────────────────────────────────────────

export function useMonthlyRevenue() {
  return useQuery({
    queryKey: ["monthly-revenue"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select("total_amount, created_at, status")
        .neq("status", "cancelled");
      if (error) throw error;

      const map = new Map<string, { revenue: number; count: number }>();

      for (const o of data ?? []) {
        const d = new Date(o.created_at);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
        const prev = map.get(key) ?? { revenue: 0, count: 0 };
        prev.revenue += Number(o.total_amount);
        prev.count++;
        map.set(key, prev);
      }

      return Array.from(map.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .slice(-12)
        .map(([month, d]) => ({
          month,
          label: new Date(month + "-01").toLocaleDateString("fr-FR", { month: "short", year: "2-digit" }),
          revenue: Math.round(d.revenue * 100) / 100,
          orders: d.count,
        }));
    },
  });
}
