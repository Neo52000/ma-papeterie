import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface PricingRuleset {
  id: string;
  name: string;
  description?: string;
  is_active: boolean;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export type RuleType = "seasonality" | "low_stock" | "low_rotation" | "margin_guard";

export interface RuleParams {
  // seasonality
  months?: number[];
  adjustment_percent?: number;
  // low_stock
  threshold?: number;
  // low_rotation
  days_without_sale?: number;
  discount_percent?: number;
  // margin_guard
  min_margin_percent?: number;
  // common
  category?: string | null;
}

export interface PricingRulesetRule {
  id: string;
  ruleset_id: string;
  name: string;
  rule_type: RuleType;
  is_active: boolean;
  priority: number;
  params: RuleParams;
  created_at: string;
  updated_at: string;
}

export type SimulationStatus = "completed" | "applied" | "rolled_back";

export interface PricingSimulation {
  id: string;
  ruleset_id: string;
  category?: string | null;
  status: SimulationStatus;
  product_count: number;
  affected_count: number;
  avg_change_pct?: number | null;
  created_by?: string | null;
  applied_by?: string | null;
  created_at: string;
  applied_at?: string | null;
}

export interface PricingSimulationItem {
  id: string;
  simulation_id: string;
  product_id: string;
  rule_id?: string | null;
  rule_type?: string | null;
  old_price_ht: number;
  new_price_ht: number;
  price_change_percent?: number | null;
  old_margin_percent?: number | null;
  new_margin_percent?: number | null;
  reason?: string | null;
  blocked_by_guard: boolean;
  products?: { name: string; category: string } | null;
}

export interface PriceChangeLog {
  id: string;
  product_id: string;
  simulation_id?: string | null;
  rule_type?: string | null;
  old_price_ht: number;
  new_price_ht: number;
  price_change_percent?: number | null;
  old_margin_percent?: number | null;
  new_margin_percent?: number | null;
  reason?: string | null;
  applied_by?: string | null;
  applied_at: string;
  is_rollback: boolean;
  rollback_of?: string | null;
  products?: { name: string; category: string } | null;
}

// ── Rulesets ──────────────────────────────────────────────────────────────────

export const useRulesets = () =>
  useQuery({
    queryKey: ["pricing-rulesets"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("pricing_rulesets")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as PricingRuleset[];
    },
  });

export const useCreateRuleset = () => {
  const { toast } = useToast();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (values: Pick<PricingRuleset, "name" | "description">) => {
      const { data: { user } } = await supabase.auth.getUser();
      const { data, error } = await (supabase as any)
        .from("pricing_rulesets")
        .insert([{ ...values, created_by: user?.id }])
        .select()
        .single();
      if (error) throw error;
      return data as PricingRuleset;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["pricing-rulesets"] });
      toast({ title: "Ruleset créé" });
    },
    onError: (e: Error) =>
      toast({ title: "Erreur", description: e.message, variant: "destructive" }),
  });
};

export const useUpdateRuleset = () => {
  const { toast } = useToast();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<PricingRuleset> & { id: string }) => {
      const { data, error } = await (supabase as any)
        .from("pricing_rulesets")
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data as PricingRuleset;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["pricing-rulesets"] });
      toast({ title: "Ruleset mis à jour" });
    },
    onError: (e: Error) =>
      toast({ title: "Erreur", description: e.message, variant: "destructive" }),
  });
};

export const useDeleteRuleset = () => {
  const { toast } = useToast();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any)
        .from("pricing_rulesets")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["pricing-rulesets"] });
      toast({ title: "Ruleset supprimé" });
    },
    onError: (e: Error) =>
      toast({ title: "Erreur", description: e.message, variant: "destructive" }),
  });
};

// ── Règles ────────────────────────────────────────────────────────────────────

export const useRulesetRules = (rulesetId: string | null) =>
  useQuery({
    queryKey: ["pricing-ruleset-rules", rulesetId],
    enabled: !!rulesetId,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("pricing_ruleset_rules")
        .select("*")
        .eq("ruleset_id", rulesetId!)
        .order("priority", { ascending: true });
      if (error) throw error;
      return data as PricingRulesetRule[];
    },
  });

export const useCreateRule = () => {
  const { toast } = useToast();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (values: Omit<PricingRulesetRule, "id" | "created_at" | "updated_at">) => {
      const { data, error } = await (supabase as any)
        .from("pricing_ruleset_rules")
        .insert([values])
        .select()
        .single();
      if (error) throw error;
      return data as PricingRulesetRule;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["pricing-ruleset-rules", data.ruleset_id] });
      toast({ title: "Règle créée" });
    },
    onError: (e: Error) =>
      toast({ title: "Erreur", description: e.message, variant: "destructive" }),
  });
};

export const useUpdateRule = () => {
  const { toast } = useToast();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<PricingRulesetRule> & { id: string }) => {
      const { data, error } = await (supabase as any)
        .from("pricing_ruleset_rules")
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data as PricingRulesetRule;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["pricing-ruleset-rules", data.ruleset_id] });
      toast({ title: "Règle mise à jour" });
    },
    onError: (e: Error) =>
      toast({ title: "Erreur", description: e.message, variant: "destructive" }),
  });
};

export const useDeleteRule = () => {
  const { toast } = useToast();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, rulesetId }: { id: string; rulesetId: string }) => {
      const { error } = await (supabase as any)
        .from("pricing_ruleset_rules")
        .delete()
        .eq("id", id);
      if (error) throw error;
      return rulesetId;
    },
    onSuccess: (rulesetId) => {
      qc.invalidateQueries({ queryKey: ["pricing-ruleset-rules", rulesetId] });
      toast({ title: "Règle supprimée" });
    },
    onError: (e: Error) =>
      toast({ title: "Erreur", description: e.message, variant: "destructive" }),
  });
};

// ── Simulations ───────────────────────────────────────────────────────────────

export const useSimulations = () =>
  useQuery({
    queryKey: ["pricing-simulations"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("pricing_simulations")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data as PricingSimulation[];
    },
  });

export const useSimulationItems = (simulationId: string | null) =>
  useQuery({
    queryKey: ["pricing-simulation-items", simulationId],
    enabled: !!simulationId,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("pricing_simulation_items")
        .select("*, products(name, category)")
        .eq("simulation_id", simulationId!)
        .order("price_change_percent", { ascending: true });
      if (error) throw error;
      return data as PricingSimulationItem[];
    },
  });

export const useRunSimulation = () => {
  const { toast } = useToast();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ ruleset_id, category }: { ruleset_id: string; category?: string }) => {
      const { data, error } = await supabase.functions.invoke("pricing-simulate", {
        body: { ruleset_id, category: category || null },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data as { simulation_id: string; product_count: number; affected_count: number; avg_change_pct: number };
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["pricing-simulations"] });
      toast({
        title: "Simulation terminée",
        description: `${data.affected_count} produit(s) impacté(s) sur ${data.product_count} analysés`,
      });
    },
    onError: (e: Error) =>
      toast({ title: "Erreur simulation", description: e.message, variant: "destructive" }),
  });
};

export const useApplySimulation = () => {
  const { toast } = useToast();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (simulation_id: string) => {
      const { data, error } = await supabase.functions.invoke("pricing-apply", {
        body: { simulation_id },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data as { applied_count: number; total: number };
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["pricing-simulations"] });
      qc.invalidateQueries({ queryKey: ["price-changes-log"] });
      toast({
        title: "Prix appliqués",
        description: `${data.applied_count} produit(s) mis à jour`,
      });
    },
    onError: (e: Error) =>
      toast({ title: "Erreur application", description: e.message, variant: "destructive" }),
  });
};

export const useRollbackSimulation = () => {
  const { toast } = useToast();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (simulation_id: string) => {
      const { data, error } = await supabase.functions.invoke("pricing-rollback", {
        body: { simulation_id },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data as { rolled_back_count: number; total: number };
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["pricing-simulations"] });
      qc.invalidateQueries({ queryKey: ["price-changes-log"] });
      toast({
        title: "Rollback effectué",
        description: `${data.rolled_back_count} prix restaurés`,
      });
    },
    onError: (e: Error) =>
      toast({ title: "Erreur rollback", description: e.message, variant: "destructive" }),
  });
};

// ── Price Change Log ──────────────────────────────────────────────────────────

export const usePriceChangesLog = (simulationId?: string | null) =>
  useQuery({
    queryKey: ["price-changes-log", simulationId],
    queryFn: async () => {
      let query = (supabase as any)
        .from("price_changes_log")
        .select("*, products(name, category)")
        .order("applied_at", { ascending: false })
        .limit(200);
      if (simulationId) query = query.eq("simulation_id", simulationId);
      const { data, error } = await query;
      if (error) throw error;
      return data as PriceChangeLog[];
    },
  });
