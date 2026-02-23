import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    // ── Auth ────────────────────────────────────────────────────────────────
    const authHeader = req.headers.get("Authorization");
    const token = authHeader?.replace("Bearer ", "");
    if (!token) throw new Error("Non autorisé: token manquant");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) throw new Error("Non autorisé: token invalide");

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();
    if (!profile || !["admin", "super_admin"].includes(profile.role)) {
      throw new Error("Non autorisé: rôle admin requis");
    }

    // ── Paramètres ──────────────────────────────────────────────────────────
    const { ruleset_id, category } = await req.json();
    if (!ruleset_id) throw new Error("ruleset_id requis");

    // ── Charger les règles actives du ruleset ────────────────────────────────
    const { data: rules, error: rulesError } = await supabase
      .from("pricing_ruleset_rules")
      .select("*")
      .eq("ruleset_id", ruleset_id)
      .eq("is_active", true)
      .order("priority", { ascending: true });

    if (rulesError) throw rulesError;
    if (!rules || rules.length === 0) {
      throw new Error("Aucune règle active dans ce ruleset");
    }

    const guardRules = rules.filter((r) => r.rule_type === "margin_guard");
    const adjustRules = rules.filter((r) => r.rule_type !== "margin_guard");

    // ── Charger les produits ────────────────────────────────────────────────
    let productsQuery = supabase
      .from("products")
      .select("id, name, category, price_ht, price_ttc")
      .eq("is_active", true);

    if (category) productsQuery = productsQuery.eq("category", category);

    const { data: products, error: productsError } = await productsQuery;
    if (productsError) throw productsError;
    if (!products || products.length === 0) {
      throw new Error("Aucun produit actif trouvé pour ce filtre");
    }

    // ── Données stock (non bloquant) ────────────────────────────────────────
    const stockMap = new Map<string, number>();
    try {
      const { data: stockData } = await supabase
        .from("v_stock_virtuel")
        .select("product_id, total_stock");
      for (const s of stockData ?? []) {
        stockMap.set(s.product_id, Number(s.total_stock ?? 0));
      }
    } catch {
      console.warn("v_stock_virtuel indisponible — stock supposé 0");
    }

    // ── Données ventes (non bloquant) ───────────────────────────────────────
    // daysSinceLastSale = 0 par défaut (pas de promo si données absentes)
    const lastSaleMap = new Map<string, Date>();
    try {
      const ninetyDaysAgo = new Date(Date.now() - 90 * 86_400_000).toISOString();
      const { data: salesData } = await supabase
        .from("order_items")
        .select("product_id, created_at")
        .gte("created_at", ninetyDaysAgo);
      for (const sale of salesData ?? []) {
        const saleDate = new Date(sale.created_at);
        const existing = lastSaleMap.get(sale.product_id);
        if (!existing || saleDate > existing) lastSaleMap.set(sale.product_id, saleDate);
      }
    } catch {
      console.warn("order_items indisponible — rotation supposée récente");
    }

    // ── Coûts fournisseur pour le calcul de marge ───────────────────────────
    const costMap = new Map<string, number>();
    try {
      const { data: supplierData } = await supabase
        .from("supplier_products")
        .select("product_id, supplier_price")
        .order("supplier_price", { ascending: true });
      for (const sp of supplierData ?? []) {
        if (!costMap.has(sp.product_id)) {
          costMap.set(sp.product_id, Number(sp.supplier_price));
        }
      }
    } catch {
      console.warn("supplier_products indisponible — marges non calculées");
    }

    const currentMonth = new Date().getMonth() + 1; // 1–12

    // ── Évaluation règle par règle ─────────────────────────────────────────
    const simulationItems: Record<string, unknown>[] = [];
    let affectedCount = 0;

    for (const product of products) {
      const currentPriceHt = Number(product.price_ht ?? product.price_ttc ?? 0);
      if (currentPriceHt === 0) continue;

      const cost = costMap.get(product.id);
      const stock = stockMap.get(product.id) ?? 0;
      const lastSale = lastSaleMap.get(product.id);
      const daysSinceLastSale = lastSale
        ? Math.floor((Date.now() - lastSale.getTime()) / 86_400_000)
        : 0; // défaut = vente récente (plus sûr)

      const oldMarginPct = cost != null && cost > 0
        ? ((currentPriceHt - cost) / currentPriceHt) * 100
        : null;

      let newPriceHt = currentPriceHt;
      let appliedRule: Record<string, unknown> | null = null;
      let reason = "";
      let blockedByGuard = false;

      // Évaluer les règles d'ajustement (par priorité, 1ère correspondance)
      for (const rule of adjustRules) {
        const p = rule.params as Record<string, unknown>;
        let proposed = currentPriceHt;
        let ruleReason = "";

        switch (rule.rule_type) {
          case "seasonality": {
            const months = (p.months as number[]) ?? [8, 9];
            if (months.includes(currentMonth)) {
              const pct = Number(p.adjustment_percent ?? 10);
              proposed = currentPriceHt * (1 + pct / 100);
              ruleReason = `Saisonnalité rentrée +${pct}%`;
            }
            break;
          }
          case "low_stock": {
            const threshold = Number(p.threshold ?? 5);
            if (stock >= 0 && stock <= threshold) {
              const pct = Number(p.adjustment_percent ?? 10);
              proposed = currentPriceHt * (1 + pct / 100);
              ruleReason = `Stock faible (${stock} unités) +${pct}%`;
            }
            break;
          }
          case "low_rotation": {
            const days = Number(p.days_without_sale ?? 60);
            if (daysSinceLastSale >= days) {
              const pct = Number(p.discount_percent ?? 15);
              proposed = currentPriceHt * (1 - pct / 100);
              ruleReason = `Rotation faible (${daysSinceLastSale}j sans vente) -${pct}%`;
            }
            break;
          }
        }

        if (proposed === currentPriceHt) continue; // règle non déclenchée

        // Appliquer les gardes-fous marge
        for (const guard of guardRules) {
          const minMargin = Number((guard.params as Record<string, unknown>).min_margin_percent ?? 15);
          if (cost != null && cost > 0) {
            const newMargin = ((proposed - cost) / proposed) * 100;
            if (newMargin < minMargin) {
              // Corriger pour atteindre exactement la marge minimale
              const minPrice = cost / (1 - minMargin / 100);
              if (proposed < minPrice) {
                proposed = minPrice;
                ruleReason += ` [garde-fou: marge min ${minMargin}%]`;
                blockedByGuard = true;
              }
            }
          }
        }

        newPriceHt = proposed;
        appliedRule = rule;
        reason = ruleReason;
        break; // 1ère règle déclenchée gagne
      }

      if (newPriceHt === currentPriceHt) continue; // aucune modification

      const roundedNew = Math.round(newPriceHt * 100) / 100;
      const changePct = ((roundedNew - currentPriceHt) / currentPriceHt) * 100;
      const newMarginPct = cost != null && cost > 0
        ? ((roundedNew - cost) / roundedNew) * 100
        : null;

      simulationItems.push({
        product_id: product.id,
        rule_id: appliedRule?.id ?? null,
        rule_type: appliedRule?.rule_type ?? null,
        old_price_ht: currentPriceHt,
        new_price_ht: roundedNew,
        price_change_percent: Math.round(changePct * 100) / 100,
        old_margin_percent: oldMarginPct != null ? Math.round(oldMarginPct * 100) / 100 : null,
        new_margin_percent: newMarginPct != null ? Math.round(newMarginPct * 100) / 100 : null,
        reason,
        blocked_by_guard: blockedByGuard,
      });
      affectedCount++;
    }

    // ── Créer l'enregistrement de simulation ────────────────────────────────
    const avgChangePct = simulationItems.length > 0
      ? simulationItems.reduce((s, i) => s + (Number(i.price_change_percent) || 0), 0) / simulationItems.length
      : 0;

    const { data: simulation, error: simError } = await supabase
      .from("pricing_simulations")
      .insert({
        ruleset_id,
        category: category ?? null,
        status: "completed",
        product_count: products.length,
        affected_count: affectedCount,
        avg_change_pct: Math.round(avgChangePct * 100) / 100,
        created_by: user.id,
      })
      .select()
      .single();

    if (simError) throw simError;

    // ── Insérer les items par lots de 100 ───────────────────────────────────
    const BATCH = 100;
    for (let i = 0; i < simulationItems.length; i += BATCH) {
      const batch = simulationItems.slice(i, i + BATCH).map((item) => ({
        ...item,
        simulation_id: simulation.id,
      }));
      const { error } = await supabase.from("pricing_simulation_items").insert(batch);
      if (error) throw error;
    }

    return new Response(
      JSON.stringify({
        success: true,
        simulation_id: simulation.id,
        product_count: products.length,
        affected_count: affectedCount,
        avg_change_pct: Math.round(avgChangePct * 100) / 100,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("pricing-simulate error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Erreur inconnue" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
