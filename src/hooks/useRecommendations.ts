import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

// ── Types ─────────────────────────────────────────────────────────────────────

export type RelationType = "complement" | "compatibility" | "alternative_durable" | "substitution";

export const RELATION_LABELS: Record<RelationType, string> = {
  complement:           "Complément",
  compatibility:        "Compatible avec",
  alternative_durable:  "Alternative éco-responsable",
  substitution:         "Substitut disponible",
};

export const RELATION_REASONS: Record<RelationType, string> = {
  complement:           "Souvent acheté avec ce produit",
  compatibility:        "Compatible avec ce produit",
  alternative_durable:  "Version éco-responsable disponible",
  substitution:         "Disponible à la place de ce produit",
};

export interface RecoProduct {
  id: string;
  name: string;
  price_ttc: number | null;
  price: number | null;
  image_url: string | null;
  category: string;
  eco: boolean | null;
  stock_quantity: number | null;
  margin_percent: number | null;
  relation_type: RelationType;
  reason: string;
  /** Score de pertinence calculé côté client (marge + stock) */
  score: number;
}

export interface ProductRelation {
  id: string;
  product_id: string;
  related_product_id: string;
  relation_type: RelationType;
  created_at: string;
  // Relations jointes
  product?: { id: string; name: string; category: string };
  related_product?: { id: string; name: string; category: string };
}

export interface CompatibilityEntry {
  id: string;
  product_id: string;
  compatible_product_id: string;
  compatibility_note: string | null;
  is_bidirectional: boolean;
  created_at: string;
  product?: { id: string; name: string; category: string };
  compatible_product?: { id: string; name: string; category: string };
}

// ── Scoring côté client ───────────────────────────────────────────────────────
function scoreProduct(p: { stock_quantity: number | null; margin_percent: number | null }) {
  const marginScore = Math.min((p.margin_percent ?? 20) / 100, 1);
  const stockScore = p.stock_quantity != null && p.stock_quantity > 0 ? 1 : 0.2;
  return marginScore * 0.5 + stockScore * 0.5;
}

// ── Recommandations pour une fiche produit ────────────────────────────────────

export const useProductRecommendations = (
  productId: string | null,
  types: RelationType[] = ["complement", "alternative_durable", "compatibility"],
  limit = 8,
) =>
  useQuery({
    queryKey: ["product-recos", productId, types],
    enabled: !!productId,
    staleTime: 5 * 60 * 1000,
    queryFn: async (): Promise<RecoProduct[]> => {
      // Récupérer les relations du produit pour les types demandés
      const { data: relations, error: relErr } = await supabase
        .from("product_relations")
        .select("related_product_id, relation_type")
        .eq("product_id", productId!)
        .in("relation_type", types);

      if (relErr) throw relErr;

      // Ajouter les compatibilités bidirectionnelles
      const { data: compatRows } = await (supabase as any)
        .from("compatibility_matrix")
        .select("product_id, compatible_product_id, compatibility_note")
        .or(`product_id.eq.${productId},compatible_product_id.eq.${productId}`);

      const compatIds: { id: string; type: RelationType }[] = (compatRows ?? []).map(
        (c: { product_id: string; compatible_product_id: string }) => ({
          id: c.product_id === productId ? c.compatible_product_id : c.product_id,
          type: "compatibility" as RelationType,
        }),
      );

      const relIds: { id: string; type: RelationType }[] = (relations ?? []).map(
        (r: { related_product_id: string; relation_type: string }) => ({
          id: r.related_product_id,
          type: r.relation_type as RelationType,
        }),
      );

      const allPairs = [...relIds, ...compatIds].filter((p) => p.id !== productId);
      if (allPairs.length === 0) return [];

      const uniqueIds = [...new Set(allPairs.map((p) => p.id))];

      // Récupérer les détails des produits
      const { data: products, error: prodErr } = await supabase
        .from("products")
        .select("id, name, price_ttc, price, image_url, category, eco, stock_quantity, margin_percent")
        .in("id", uniqueIds)
        .eq("is_active", true);

      if (prodErr) throw prodErr;

      // Construire les résultats avec scoring
      const results: RecoProduct[] = (products ?? []).map((p) => {
        const pair = allPairs.find((a) => a.id === p.id)!;
        const score = scoreProduct(p);
        return {
          ...p,
          price_ttc: p.price_ttc ? Number(p.price_ttc) : null,
          price: p.price ? Number(p.price) : null,
          margin_percent: p.margin_percent ? Number(p.margin_percent) : null,
          stock_quantity: p.stock_quantity ? Number(p.stock_quantity) : null,
          relation_type: pair?.type ?? "complement",
          reason: RELATION_REASONS[pair?.type ?? "complement"],
          score,
        };
      });

      return results.sort((a, b) => b.score - a.score).slice(0, limit);
    },
  });

// ── Recommandations pour le panier ───────────────────────────────────────────

export const useCartRecommendations = (cartProductIds: string[], limit = 4) =>
  useQuery({
    queryKey: ["cart-recos", cartProductIds.join(",")],
    enabled: cartProductIds.length > 0,
    staleTime: 3 * 60 * 1000,
    queryFn: async (): Promise<RecoProduct[]> => {
      // Compléments de tous les produits dans le panier
      const { data: relations, error: relErr } = await supabase
        .from("product_relations")
        .select("related_product_id, relation_type")
        .in("product_id", cartProductIds)
        .eq("relation_type", "complement");

      if (relErr) throw relErr;
      if (!relations || relations.length === 0) return [];

      // Exclure les produits déjà dans le panier
      const relatedIds = [
        ...new Set(
          (relations as { related_product_id: string }[])
            .map((r) => r.related_product_id)
            .filter((id) => !cartProductIds.includes(id)),
        ),
      ];

      if (relatedIds.length === 0) return [];

      const { data: products, error: prodErr } = await supabase
        .from("products")
        .select("id, name, price_ttc, price, image_url, category, eco, stock_quantity, margin_percent")
        .in("id", relatedIds)
        .eq("is_active", true);

      if (prodErr) throw prodErr;

      return (products ?? [])
        .map((p) => ({
          ...p,
          price_ttc: p.price_ttc ? Number(p.price_ttc) : null,
          price: p.price ? Number(p.price) : null,
          margin_percent: p.margin_percent ? Number(p.margin_percent) : null,
          stock_quantity: p.stock_quantity ? Number(p.stock_quantity) : null,
          relation_type: "complement" as RelationType,
          reason: RELATION_REASONS.complement,
          score: scoreProduct(p),
        }))
        .sort((a, b) => b.score - a.score)
        .slice(0, limit);
    },
  });

// ── Tracking événements ───────────────────────────────────────────────────────

export const useLogRecommendationEvent = () =>
  useMutation({
    mutationFn: async (event: {
      source_product_id?: string;
      product_id: string;
      relation_type?: RelationType;
      event_type: "shown" | "clicked" | "added_to_cart";
      placement: "product_page" | "cart";
      position?: number;
    }) => {
      // Fire-and-forget : on ne throw pas les erreurs pour ne pas bloquer l'UX
      const { data: { session } } = await supabase.auth.getSession();
      await (supabase as any)
        .from("recommendation_logs")
        .insert({
          user_id: session?.user?.id ?? null,
          source_product_id: event.source_product_id ?? null,
          product_id: event.product_id,
          relation_type: event.relation_type ?? null,
          event_type: event.event_type,
          placement: event.placement,
          position: event.position ?? null,
        });
    },
    onError: () => {
      // Silencieux : le tracking ne doit jamais bloquer l'UI
    },
  });

// ── Admin : CRUD product_relations ────────────────────────────────────────────

export const useAllProductRelations = (filter?: { type?: RelationType; search?: string }) =>
  useQuery({
    queryKey: ["all-product-relations", filter],
    queryFn: async () => {
      // Les product_relations utilisent TEXT ids → on ne peut pas joindre directement
      const { data: rels, error } = await supabase
        .from("product_relations")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;

      const relations = (rels ?? []) as ProductRelation[];
      const allIds = [...new Set([
        ...relations.map((r) => r.product_id),
        ...relations.map((r) => r.related_product_id),
      ])];

      if (allIds.length === 0) return [];

      const { data: products } = await supabase
        .from("products")
        .select("id, name, category")
        .in("id", allIds);

      const prodMap = new Map((products ?? []).map((p) => [p.id, p]));

      return relations
        .map((r) => ({
          ...r,
          relation_type: r.relation_type as RelationType,
          product: prodMap.get(r.product_id) ?? undefined,
          related_product: prodMap.get(r.related_product_id) ?? undefined,
        }))
        .filter((r) => {
          if (filter?.type && r.relation_type !== filter.type) return false;
          if (filter?.search) {
            const s = filter.search.toLowerCase();
            return r.product?.name?.toLowerCase().includes(s) ||
              r.related_product?.name?.toLowerCase().includes(s);
          }
          return true;
        });
    },
  });

export const useCreateRelation = () => {
  const { toast } = useToast();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (values: { product_id: string; related_product_id: string; relation_type: RelationType }) => {
      const { data, error } = await supabase
        .from("product_relations")
        .insert([values])
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["all-product-relations"] });
      qc.invalidateQueries({ queryKey: ["product-recos"] });
      toast({ title: "Relation créée" });
    },
    onError: (e: Error) =>
      toast({ title: "Erreur", description: e.message, variant: "destructive" }),
  });
};

export const useDeleteRelation = () => {
  const { toast } = useToast();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("product_relations")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["all-product-relations"] });
      qc.invalidateQueries({ queryKey: ["product-recos"] });
      toast({ title: "Relation supprimée" });
    },
    onError: (e: Error) =>
      toast({ title: "Erreur", description: e.message, variant: "destructive" }),
  });
};

// ── Admin : CRUD compatibility_matrix ────────────────────────────────────────

export const useAllCompatibility = () =>
  useQuery({
    queryKey: ["all-compatibility"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("compatibility_matrix")
        .select(`
          *,
          product:products!compatibility_matrix_product_id_fkey(id, name, category),
          compatible_product:products!compatibility_matrix_compatible_product_id_fkey(id, name, category)
        `)
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return data as CompatibilityEntry[];
    },
  });

export const useCreateCompatibility = () => {
  const { toast } = useToast();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (values: {
      product_id: string;
      compatible_product_id: string;
      compatibility_note?: string;
      is_bidirectional?: boolean;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      const { data, error } = await (supabase as any)
        .from("compatibility_matrix")
        .insert([{ ...values, created_by: user?.id }])
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["all-compatibility"] });
      qc.invalidateQueries({ queryKey: ["product-recos"] });
      toast({ title: "Compatibilité créée" });
    },
    onError: (e: Error) =>
      toast({ title: "Erreur", description: e.message, variant: "destructive" }),
  });
};

export const useDeleteCompatibility = () => {
  const { toast } = useToast();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any)
        .from("compatibility_matrix")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["all-compatibility"] });
      toast({ title: "Compatibilité supprimée" });
    },
    onError: (e: Error) =>
      toast({ title: "Erreur", description: e.message, variant: "destructive" }),
  });
};

// ── Admin : Statistiques CTR ──────────────────────────────────────────────────

export interface RecoStatRow {
  relation_type: string;
  placement: string;
  shown: number;
  clicked: number;
  added: number;
  ctr: number;     // clicked / shown
  conversion: number; // added / shown
}

export const useRecommendationStats = (days = 30) =>
  useQuery({
    queryKey: ["reco-stats", days],
    queryFn: async (): Promise<RecoStatRow[]> => {
      const since = new Date(Date.now() - days * 86_400_000).toISOString();
      const { data, error } = await (supabase as any)
        .from("recommendation_logs")
        .select("relation_type, placement, event_type")
        .gte("created_at", since);
      if (error) throw error;

      type LogRow = { relation_type: string | null; placement: string | null; event_type: string };
      const rows = (data ?? []) as LogRow[];

      // Agréger par (relation_type, placement)
      const map = new Map<string, { shown: number; clicked: number; added: number }>();
      for (const row of rows) {
        const key = `${row.relation_type ?? "unknown"}|${row.placement ?? "unknown"}`;
        const cur = map.get(key) ?? { shown: 0, clicked: 0, added: 0 };
        if (row.event_type === "shown") cur.shown++;
        else if (row.event_type === "clicked") cur.clicked++;
        else if (row.event_type === "added_to_cart") cur.added++;
        map.set(key, cur);
      }

      return Array.from(map.entries()).map(([key, v]) => {
        const [relation_type, placement] = key.split("|");
        return {
          relation_type,
          placement,
          ...v,
          ctr: v.shown > 0 ? Math.round((v.clicked / v.shown) * 1000) / 10 : 0,
          conversion: v.shown > 0 ? Math.round((v.added / v.shown) * 1000) / 10 : 0,
        };
      });
    },
  });
