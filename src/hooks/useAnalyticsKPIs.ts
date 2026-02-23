import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

// ── Types ─────────────────────────────────────────────────────────────────────

interface RawEvent {
  event_type: string;
  session_id: string | null;
  payload: Record<string, unknown> | null;
  created_at: string;
}

export interface FunnelStep {
  label: string;
  event: string;
  count: number;
  rate: number; // % par rapport à la première étape
}

export interface DailyCount {
  date: string;   // "DD/MM"
  events: number;
  sessions: number;
}

export interface SearchRow {
  query: string;
  count: number;
  zero_results: number;
  zero_rate: number; // %
}

export interface ProductRow {
  product_id: string;
  name: string;
  views: number;
}

export interface OcrStats {
  uploads: number;
  completions: number;
  failed: number;
  avg_duration_ms: number | null;
  success_rate: number; // %
}

export interface AnalyticsKPIs {
  total_events: number;
  unique_sessions: number;
  event_counts: Record<string, number>;
  /** Panier moyen en € (depuis les add_to_cart avec payload.price) */
  avg_cart_value: number | null;
  funnel: FunnelStep[];
  daily_counts: DailyCount[];
  top_searches: SearchRow[];
  top_products: ProductRow[];
  ocr: OcrStats;
}

// ── Agrégation client-side ────────────────────────────────────────────────────

function computeKPIs(events: RawEvent[], days: number): AnalyticsKPIs {
  const eventCounts: Record<string, number> = {};
  const sessionSet = new Set<string>();
  const dailyMap: Record<string, { events: number; sessions: Set<string> }> = {};
  const searchMap: Record<string, { count: number; zero: number }> = {};
  const productMap: Record<string, { name: string; count: number }> = {};
  let cartTotal = 0;
  let cartCount = 0;
  const ocrDurations: number[] = [];
  let ocrFailed = 0;
  let ocrUploads = 0;
  let ocrCompletions = 0;

  for (const ev of events) {
    eventCounts[ev.event_type] = (eventCounts[ev.event_type] ?? 0) + 1;
    if (ev.session_id) sessionSet.add(ev.session_id);

    // Agrégation par jour (YYYY-MM-DD → DD/MM)
    const dayKey = ev.created_at.slice(0, 10);
    if (!dailyMap[dayKey]) dailyMap[dayKey] = { events: 0, sessions: new Set() };
    dailyMap[dayKey].events++;
    if (ev.session_id) dailyMap[dayKey].sessions.add(ev.session_id);

    const p = ev.payload ?? {};

    // Recherches
    if (ev.event_type === "search_performed") {
      const q = ((p.query as string) ?? "").toLowerCase().trim();
      if (q) {
        if (!searchMap[q]) searchMap[q] = { count: 0, zero: 0 };
        searchMap[q].count++;
        if (Number(p.result_count ?? 1) === 0) searchMap[q].zero++;
      }
    }

    // Produits vus
    if (ev.event_type === "product_viewed" && p.product_id) {
      const pid = p.product_id as string;
      if (!productMap[pid]) productMap[pid] = { name: (p.name as string) ?? pid, count: 0 };
      productMap[pid].count++;
    }

    // Panier
    if (ev.event_type === "add_to_cart" && p.price) {
      const v = Number(p.price);
      if (!isNaN(v) && v > 0) { cartTotal += v; cartCount++; }
    }

    // OCR
    if (ev.event_type === "upload_started") ocrUploads++;
    if (ev.event_type === "ocr_completed") {
      ocrCompletions++;
      if (p.success === false) ocrFailed++;
      if (p.duration_ms) ocrDurations.push(Number(p.duration_ms));
    }
  }

  // ── Funnel ──────────────────────────────────────────────────────────────────
  const funnelDefs: { label: string; event: string }[] = [
    { label: "Vues produit",     event: "product_viewed"      },
    { label: "Ajouts panier",    event: "add_to_cart"          },
    { label: "Commandes démarrées", event: "checkout_started"  },
    { label: "Achats confirmés", event: "purchase_completed"   },
  ];
  const topCount = eventCounts[funnelDefs[0].event] ?? 1;
  const funnel: FunnelStep[] = funnelDefs.map((f) => {
    const count = eventCounts[f.event] ?? 0;
    return { ...f, count, rate: topCount > 0 ? Math.round((count / topCount) * 100) : 0 };
  });

  // ── Séries temporelles — remplir les jours manquants ────────────────────────
  const daily_counts: DailyCount[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86_400_000);
    const dayKey = d.toISOString().slice(0, 10);
    const label = `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}`;
    const entry = dailyMap[dayKey];
    daily_counts.push({
      date: label,
      events: entry?.events ?? 0,
      sessions: entry?.sessions.size ?? 0,
    });
  }

  // ── Top recherches ──────────────────────────────────────────────────────────
  const top_searches: SearchRow[] = Object.entries(searchMap)
    .map(([query, v]) => ({
      query,
      count: v.count,
      zero_results: v.zero,
      zero_rate: Math.round((v.zero / v.count) * 100),
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 15);

  // ── Top produits ────────────────────────────────────────────────────────────
  const top_products: ProductRow[] = Object.entries(productMap)
    .map(([product_id, v]) => ({ product_id, name: v.name, views: v.count }))
    .sort((a, b) => b.views - a.views)
    .slice(0, 10);

  // ── OCR ─────────────────────────────────────────────────────────────────────
  const avgDur = ocrDurations.length > 0
    ? Math.round(ocrDurations.reduce((a, b) => a + b, 0) / ocrDurations.length)
    : null;
  const ocr: OcrStats = {
    uploads: ocrUploads,
    completions: ocrCompletions,
    failed: ocrFailed,
    avg_duration_ms: avgDur,
    success_rate: ocrCompletions > 0 ? Math.round(((ocrCompletions - ocrFailed) / ocrCompletions) * 100) : 0,
  };

  return {
    total_events: events.length,
    unique_sessions: sessionSet.size,
    event_counts: eventCounts,
    avg_cart_value: cartCount > 0 ? Math.round((cartTotal / cartCount) * 100) / 100 : null,
    funnel,
    daily_counts,
    top_searches,
    top_products,
    ocr,
  };
}

// ── Hook principal ────────────────────────────────────────────────────────────

export const useAnalyticsKPIs = (days = 30) =>
  useQuery({
    queryKey: ["analytics-kpis", days],
    staleTime: 5 * 60_000,
    queryFn: async (): Promise<AnalyticsKPIs> => {
      const since = new Date(Date.now() - days * 86_400_000).toISOString();

      const { data, error } = await (supabase as any)
        .from("analytics_events")
        .select("event_type, session_id, payload, created_at")
        .gte("created_at", since)
        .order("created_at", { ascending: true })
        .limit(50_000);

      if (error) throw error;

      return computeKPIs((data ?? []) as RawEvent[], days);
    },
  });
