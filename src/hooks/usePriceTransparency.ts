import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

// Helper: Supabase client typed as any for tables/columns missing from generated types.
// Remove after running `supabase gen types typescript`.
const db = supabase as any;

// ── Constantes de règles ──────────────────────────────────────────────────────
// Seuil à partir duquel on considère le prix "non compétitif"
export const GAP_PCT = 5;   // 5 %
export const GAP_EUR = 1.0; // 1 €

// ── Types ─────────────────────────────────────────────────────────────────────

export type TransparenceBadge = "best" | "comparable" | "expensive" | "no_data";

export interface CompetitorOffer {
  competitor_id: string;
  competitor_name: string;
  competitor_base_url: string;
  price: number;
  delivery_cost: number;
  /** Prix produit + frais de port */
  price_livre: number;
  source_url: string | null;
  scraped_at: string;
  is_suspect: boolean;
}

export interface TransparencyData {
  badge: TransparenceBadge;
  /** Écart par rapport au meilleur prix livré concurrent (€, positif = on est plus cher) */
  gap_eur: number | null;
  /** Écart en % */
  gap_pct: number | null;
  /** Offre la moins chère (prix livré) */
  best_offer: CompetitorOffer | null;
  /** Toutes les offres récentes non suspectes */
  offers: CompetitorOffer[];
  /** Date du relevé le plus récent */
  latest_scraped_at: string | null;
}

export interface PriceException {
  id: string;
  product_id: string;
  reason: string | null;
  disabled_by: string | null;
  disabled_at: string;
  products?: { name: string; category: string } | null;
}

// ── Vérification exception produit ───────────────────────────────────────────

export const usePriceException = (productId: string | null) =>
  useQuery({
    queryKey: ["price-exception", productId],
    enabled: !!productId,
    // Résultat mis en cache 5 min – l'exception ne change pas souvent
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await db
        .from("price_exceptions")
        .select("id")
        .eq("product_id", productId!)
        .maybeSingle();
      if (error) throw error;
      return data; // null si pas d'exception
    },
  });

// ── Données de transparence complètes ────────────────────────────────────────
/**
 * Charge les offres concurrentes récentes (72h, non-suspectes) et calcule
 * le badge de positionnement selon les règles GAP_PCT / GAP_EUR.
 *
 * @param ourPriceTtc  Prix TTC affiché sur notre fiche produit
 */
export const useTransparencyData = (
  productId: string | null,
  ourPriceTtc: number,
) =>
  useQuery({
    queryKey: ["transparency-data", productId, ourPriceTtc],
    enabled: !!productId && ourPriceTtc > 0,
    staleTime: 10 * 60 * 1000, // 10 min
    queryFn: async (): Promise<TransparencyData> => {
      const since = new Date(Date.now() - 72 * 3_600_000).toISOString();

      // Récupérer les snapshots récents non-suspects avec delivery_cost du concurrent
      const { data: snapshots, error } = await supabase
        .from("price_snapshots")
        .select(`
          id,
          product_id,
          competitor_id,
          pack_size,
          price,
          scraped_at,
          source_url,
          is_suspect,
          competitor:competitors(id, name, base_url, delivery_cost)
        `)
        .eq("product_id", productId!)
        .eq("pack_size", 1)
        .eq("is_suspect", false)
        .gte("scraped_at", since)
        .order("scraped_at", { ascending: false });

      if (error) throw error;

      if (!snapshots || snapshots.length === 0) {
        return { badge: "no_data", gap_eur: null, gap_pct: null, best_offer: null, offers: [], latest_scraped_at: null };
      }

      // Garder seulement le relevé le plus récent par concurrent
      const latestByCompetitor = new Map<string, typeof snapshots[0]>();
      for (const s of snapshots) {
        if (!latestByCompetitor.has(s.competitor_id)) {
          latestByCompetitor.set(s.competitor_id, s);
        }
      }

      // Construire les offres avec prix livré
      const offers: CompetitorOffer[] = Array.from(latestByCompetitor.values()).map((s) => {
        const comp = s.competitor as unknown as { id: string; name: string; base_url: string; delivery_cost: number } | null;
        const delivery = Number(comp?.delivery_cost ?? 0);
        return {
          competitor_id: s.competitor_id,
          competitor_name: comp?.name ?? "Concurrent",
          competitor_base_url: comp?.base_url ?? "",
          price: Number(s.price),
          delivery_cost: delivery,
          price_livre: Number(s.price) + delivery,
          source_url: s.source_url,
          scraped_at: s.scraped_at,
          is_suspect: s.is_suspect,
        };
      });

      // Trier par prix livré croissant
      offers.sort((a, b) => a.price_livre - b.price_livre);

      const best = offers[0] ?? null;
      const latest_scraped_at = snapshots[0]?.scraped_at ?? null;

      if (!best) {
        return { badge: "no_data", gap_eur: null, gap_pct: null, best_offer: null, offers, latest_scraped_at };
      }

      // ── Calcul du badge ──────────────────────────────────────────────────
      // On compare notre prix TTC (retrait magasin = 0 port) au meilleur prix livré concurrent
      const gap_eur = ourPriceTtc - best.price_livre;
      const gap_pct = (gap_eur / best.price_livre) * 100;

      let badge: TransparenceBadge;
      if (gap_eur < -GAP_EUR && gap_pct < -GAP_PCT) {
        // Nous sommes moins chers de manière significative (% ET €)
        badge = "best";
      } else if (gap_eur > GAP_EUR && gap_pct > GAP_PCT) {
        // Nous sommes plus chers de manière significative
        badge = "expensive";
      } else {
        // Dans les deux seuils : comparable
        badge = "comparable";
      }

      return {
        badge,
        gap_eur: Math.round(gap_eur * 100) / 100,
        gap_pct: Math.round(gap_pct * 10) / 10,
        best_offer: best,
        offers,
        latest_scraped_at,
      };
    },
  });

// ── Admin : liste de toutes les exceptions ────────────────────────────────────

export const usePriceExceptions = () =>
  useQuery({
    queryKey: ["price-exceptions-list"],
    queryFn: async () => {
      const { data, error } = await db
        .from("price_exceptions")
        .select("*, products(name, category)")
        .order("disabled_at", { ascending: false });
      if (error) throw error;
      return data as PriceException[];
    },
  });

export const useCreatePriceException = () => {
  const { toast } = useToast();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ product_id, reason }: { product_id: string; reason?: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      const { data, error } = await db
        .from("price_exceptions")
        .insert([{ product_id, reason: reason || null, disabled_by: user?.id }])
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["price-exceptions-list"] });
      qc.invalidateQueries({ queryKey: ["price-exception", data.product_id] });
      toast({ title: "Exception créée", description: "Le bloc transparence est désactivé pour ce produit." });
    },
    onError: (e: Error) =>
      toast({ title: "Erreur", description: e.message, variant: "destructive" }),
  });
};

export const useDeletePriceException = () => {
  const { toast } = useToast();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, product_id }: { id: string; product_id: string }) => {
      const { error } = await db
        .from("price_exceptions")
        .delete()
        .eq("id", id);
      if (error) throw error;
      return product_id;
    },
    onSuccess: (product_id) => {
      qc.invalidateQueries({ queryKey: ["price-exceptions-list"] });
      qc.invalidateQueries({ queryKey: ["price-exception", product_id] });
      toast({ title: "Exception supprimée", description: "Le bloc transparence est réactivé pour ce produit." });
    },
    onError: (e: Error) =>
      toast({ title: "Erreur", description: e.message, variant: "destructive" }),
  });
};

// ── Mise à jour du delivery_cost d'un concurrent ─────────────────────────────

export const useUpdateCompetitorDelivery = () => {
  const { toast } = useToast();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, delivery_cost }: { id: string; delivery_cost: number }) => {
      const { data, error } = await db
        .from("competitors")
        .update({ delivery_cost })
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["competitors"] });
      qc.invalidateQueries({ queryKey: ["transparency-data"] });
      toast({ title: "Frais de port mis à jour" });
    },
    onError: (e: Error) =>
      toast({ title: "Erreur", description: e.message, variant: "destructive" }),
  });
};
