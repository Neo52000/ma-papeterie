import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface CrmKpis {
  pipelineTotal: number;
  pipelineWeighted: number;
  pipelineDealsCount: number;
  winRate: number;
  avgClv: number;
  abandonedCartsRecovered: number;
  abandonedCartsTotal: number;
  recoveryRate: number;
  pendingQuotes: number;
  pendingQuotesValue: number;
  overdueTasks: number;
  rfmSegments: Array<{ segment: string; count: number }>;
}

export function useAdminCrmKpis() {
  return useQuery({
    queryKey: ["crm-kpis"],
    queryFn: async (): Promise<CrmKpis> => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const client = supabase as any;

      // Pipeline KPIs
      const { data: pipelineData } = await client
        .from("crm_pipeline")
        .select("stage, estimated_value, weighted_value, probability");

      const activeDeals = (pipelineData ?? []).filter(
        (d: { stage: string }) => !["won", "lost"].includes(d.stage),
      );
      const allDeals = pipelineData ?? [];
      const wonDeals = allDeals.filter((d: { stage: string }) => d.stage === "won");

      const pipelineTotal = activeDeals.reduce(
        (sum: number, d: { estimated_value: number | null }) => sum + (d.estimated_value ?? 0), 0,
      );
      const pipelineWeighted = activeDeals.reduce(
        (sum: number, d: { weighted_value: number | null }) => sum + (d.weighted_value ?? 0), 0,
      );
      const winRate = allDeals.length > 0 ? (wonDeals.length / allDeals.length) * 100 : 0;

      // CLV moyen
      const { data: rfmData } = await client
        .from("customer_rfm_scores")
        .select("lifetime_value_estimate, rfm_segment");

      const clvValues = (rfmData ?? [])
        .map((r: { lifetime_value_estimate: number | null }) => r.lifetime_value_estimate ?? 0)
        .filter((v: number) => v > 0);
      const avgClv = clvValues.length > 0
        ? clvValues.reduce((a: number, b: number) => a + b, 0) / clvValues.length
        : 0;

      // RFM segments
      const segmentCounts: Record<string, number> = {};
      for (const r of rfmData ?? []) {
        const seg = (r as { rfm_segment: string | null }).rfm_segment ?? "Nouveau";
        segmentCounts[seg] = (segmentCounts[seg] ?? 0) + 1;
      }
      const rfmSegments = Object.entries(segmentCounts).map(([segment, count]) => ({
        segment,
        count,
      }));

      // Abandoned carts
      const { data: cartsData } = await client
        .from("abandoned_carts")
        .select("recovered");

      const abandonedCartsTotal = (cartsData ?? []).length;
      const abandonedCartsRecovered = (cartsData ?? []).filter(
        (c: { recovered: boolean }) => c.recovered,
      ).length;
      const recoveryRate = abandonedCartsTotal > 0
        ? (abandonedCartsRecovered / abandonedCartsTotal) * 100
        : 0;

      // Pending quotes
      const { data: quotesData } = await client
        .from("quotes")
        .select("total_ttc, status")
        .in("status", ["sent", "viewed"]);

      const pendingQuotes = (quotesData ?? []).length;
      const pendingQuotesValue = (quotesData ?? []).reduce(
        (sum: number, q: { total_ttc: number }) => sum + (q.total_ttc ?? 0), 0,
      );

      // Overdue tasks
      const { data: tasksData } = await client
        .from("crm_tasks")
        .select("id")
        .eq("status", "overdue");

      return {
        pipelineTotal,
        pipelineWeighted,
        pipelineDealsCount: activeDeals.length,
        winRate: Math.round(winRate * 10) / 10,
        avgClv: Math.round(avgClv * 100) / 100,
        abandonedCartsRecovered,
        abandonedCartsTotal,
        recoveryRate: Math.round(recoveryRate * 10) / 10,
        pendingQuotes,
        pendingQuotesValue,
        overdueTasks: (tasksData ?? []).length,
        rfmSegments,
      };
    },
    staleTime: 2 * 60_000,
    gcTime: 5 * 60_000,
  });
}
