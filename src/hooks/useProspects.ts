import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

// ── Types ────────────────────────────────────────────────────────────────────

export type ProspectStatus =
  | "new" | "qualified" | "contacted" | "engaged"
  | "converted" | "rejected" | "unreachable";

export type ProspectSegment = "educational" | "public" | "liberal" | "pme";

export interface ProspectRow {
  id: string;
  siren: string;
  siret: string | null;
  name: string;
  legal_form: string | null;
  naf_code: string | null;
  naf_label: string | null;
  employee_range: string | null;
  founded_date: string | null;
  address: {
    street?: string;
    zip?: string;
    city?: string;
    dept?: string | null;
    code_commune?: string | null;
  } | null;
  contact_phone: string | null;
  contact_email: string | null;
  website: string | null;
  status: ProspectStatus;
  score: number | null;
  client_segment: ProspectSegment | null;
  assigned_to: string | null;
  tags: string[];
  notes: string | null;
  source: string;
  sirene_synced_at: string | null;
  converted_profile_id: string | null;
  converted_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ProspectFilters {
  search: string;
  status: ProspectStatus | "all";
  segment: ProspectSegment | "all";
  dept: string | "all";
  minScore: number;
  assignedTo: string | "all" | "unassigned";
  sortBy: "score" | "created_at" | "name";
  sortDir: "asc" | "desc";
  page: number;
  pageSize: number;
}

export const DEFAULT_PROSPECT_FILTERS: ProspectFilters = {
  search: "",
  status: "all",
  segment: "all",
  dept: "all",
  minScore: 0,
  assignedTo: "all",
  sortBy: "score",
  sortDir: "desc",
  page: 0,
  pageSize: 25,
};

// ── Hook: list paginée + compteurs ──────────────────────────────────────────

export function useProspects(filters: ProspectFilters) {
  return useQuery({
    queryKey: ["prospects-list", filters],
    queryFn: async () => {
      let query = supabase
        .from("prospects")
        // NB : cast `as never` seulement pour l'enum sortBy, pas pour la FROM
        .select("*", { count: "exact" });

      if (filters.search) {
        // recherche sur nom, siren ou ville
        query = query.or(
          `name.ilike.%${filters.search}%,siren.ilike.%${filters.search}%`,
        );
      }
      if (filters.status !== "all") query = query.eq("status", filters.status);
      if (filters.segment !== "all") query = query.eq("client_segment", filters.segment);
      if (filters.dept !== "all") query = query.eq("address->>dept", filters.dept);
      if (filters.minScore > 0) query = query.gte("score", filters.minScore);
      if (filters.assignedTo === "unassigned") query = query.is("assigned_to", null);
      else if (filters.assignedTo !== "all") query = query.eq("assigned_to", filters.assignedTo);

      // Tri
      const ascending = filters.sortDir === "asc";
      if (filters.sortBy === "score") {
        query = query.order("score", { ascending, nullsFirst: false });
      } else {
        query = query.order(filters.sortBy, { ascending });
      }

      // Pagination
      const from = filters.page * filters.pageSize;
      const to = from + filters.pageSize - 1;
      query = query.range(from, to);

      const { data, error, count } = await query;
      if (error) throw error;

      const rows = (data ?? []) as unknown as ProspectRow[];
      const totalCount = count ?? 0;
      const totalPages = Math.max(1, Math.ceil(totalCount / filters.pageSize));
      return { prospects: rows, totalCount, totalPages };
    },
    placeholderData: (prev) => prev,
    staleTime: 30 * 1000,
  });
}

// ── Hook: KPI dashboard prospection ─────────────────────────────────────────

export interface ProspectionKpis {
  totalProspects: number;
  byStatus: Record<ProspectStatus, number>;
  bySegment: Record<ProspectSegment, number>;
  unassigned: number;
  convertedLast30Days: number;
  avgScore: number;
}

export function useProspectionKpis() {
  return useQuery<ProspectionKpis>({
    queryKey: ["prospection-kpis"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("prospects")
        .select("status, client_segment, score, assigned_to, converted_at");
      if (error) throw error;

      const rows = (data ?? []) as Array<{
        status: ProspectStatus;
        client_segment: ProspectSegment | null;
        score: number | null;
        assigned_to: string | null;
        converted_at: string | null;
      }>;

      const byStatus: Record<ProspectStatus, number> = {
        new: 0, qualified: 0, contacted: 0, engaged: 0,
        converted: 0, rejected: 0, unreachable: 0,
      };
      const bySegment: Record<ProspectSegment, number> = {
        educational: 0, public: 0, liberal: 0, pme: 0,
      };
      let unassigned = 0;
      let convertedLast30 = 0;
      const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
      let scoreSum = 0;
      let scoreCount = 0;

      for (const r of rows) {
        byStatus[r.status] = (byStatus[r.status] ?? 0) + 1;
        if (r.client_segment) {
          bySegment[r.client_segment] = (bySegment[r.client_segment] ?? 0) + 1;
        }
        if (!r.assigned_to) unassigned++;
        if (r.converted_at && new Date(r.converted_at).getTime() > thirtyDaysAgo) {
          convertedLast30++;
        }
        if (typeof r.score === "number") {
          scoreSum += r.score;
          scoreCount++;
        }
      }

      return {
        totalProspects: rows.length,
        byStatus,
        bySegment,
        unassigned,
        convertedLast30Days: convertedLast30,
        avgScore: scoreCount > 0 ? Math.round(scoreSum / scoreCount) : 0,
      };
    },
    staleTime: 60 * 1000,
  });
}

// ── Hook: détail prospect + timeline ────────────────────────────────────────

export interface ProspectInteraction {
  id: string;
  prospect_id: string;
  channel: string;
  direction: "inbound" | "outbound";
  subject: string | null;
  description: string | null;
  metadata: Record<string, unknown> | null;
  created_by: string | null;
  created_at: string;
}

export interface ProspectEnrollment {
  prospect_id: string;
  campaign_id: string;
  enrolled_at: string;
  unsubscribed_at: string | null;
  bounced_at: string | null;
  last_event: string | null;
  last_event_at: string | null;
  campaign?: {
    id: string;
    name: string;
    status: string;
  };
}

export function useProspect(prospectId: string | null) {
  return useQuery({
    queryKey: ["prospect-detail", prospectId],
    queryFn: async () => {
      if (!prospectId) return null;

      const [pr, inter, enrol] = await Promise.all([
        supabase.from("prospects").select("*").eq("id", prospectId).single(),
        supabase
          .from("prospect_interactions")
          .select("*")
          .eq("prospect_id", prospectId)
          .order("created_at", { ascending: false }),
        supabase
          .from("prospect_enrollments")
          .select("*, campaign:prospect_campaigns(id, name, status)")
          .eq("prospect_id", prospectId),
      ]);

      if (pr.error) throw pr.error;

      return {
        prospect: pr.data as unknown as ProspectRow,
        interactions: (inter.data ?? []) as unknown as ProspectInteraction[],
        enrollments: (enrol.data ?? []) as unknown as ProspectEnrollment[],
      };
    },
    enabled: !!prospectId,
  });
}
