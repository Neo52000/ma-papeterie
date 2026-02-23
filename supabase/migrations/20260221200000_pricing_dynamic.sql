-- ─────────────────────────────────────────────────────────────────────────────
-- Pricing dynamique v1: rulesets, règles, simulations, logs immuables
-- ─────────────────────────────────────────────────────────────────────────────

-- ── 1. Rulesets (jeux de règles nommés) ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.pricing_rulesets (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  description TEXT,
  is_active   BOOLEAN NOT NULL DEFAULT true,
  created_by  UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── 2. Règles dans un ruleset ─────────────────────────────────────────────────
-- Séparées des pricing_rules existantes (stratégie concurrent)
CREATE TABLE IF NOT EXISTS public.pricing_ruleset_rules (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ruleset_id UUID NOT NULL REFERENCES public.pricing_rulesets(id) ON DELETE CASCADE,
  name       TEXT NOT NULL,
  rule_type  TEXT NOT NULL CHECK (rule_type IN (
    'seasonality',   -- saisonnalité (ex: rentrée scolaire)
    'low_stock',     -- stock faible => +x%
    'low_rotation',  -- rotation faible => promo
    'margin_guard'   -- garde-fou marge min (bloque/corrige)
  )),
  is_active  BOOLEAN NOT NULL DEFAULT true,
  priority   INTEGER NOT NULL DEFAULT 10,
  -- params JSON par type :
  -- seasonality  : { months:[8,9], adjustment_percent:10, category:null }
  -- low_stock    : { threshold:5, adjustment_percent:15, category:null }
  -- low_rotation : { days_without_sale:60, discount_percent:15, category:null }
  -- margin_guard : { min_margin_percent:15, category:null }
  params     JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── 3. Simulations ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.pricing_simulations (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ruleset_id     UUID NOT NULL REFERENCES public.pricing_rulesets(id) ON DELETE CASCADE,
  category       TEXT,          -- NULL = toutes catégories
  status         TEXT NOT NULL DEFAULT 'completed'
                   CHECK (status IN ('completed', 'applied', 'rolled_back')),
  product_count  INTEGER NOT NULL DEFAULT 0,
  affected_count INTEGER NOT NULL DEFAULT 0,
  avg_change_pct DECIMAL(8, 4),
  created_by     UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  applied_by     UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  applied_at     TIMESTAMPTZ
);

-- ── 4. Items de simulation (impact par produit) ───────────────────────────────
CREATE TABLE IF NOT EXISTS public.pricing_simulation_items (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  simulation_id        UUID NOT NULL REFERENCES public.pricing_simulations(id) ON DELETE CASCADE,
  product_id           UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  rule_id              UUID REFERENCES public.pricing_ruleset_rules(id) ON DELETE SET NULL,
  rule_type            TEXT,
  old_price_ht         DECIMAL(10, 4) NOT NULL,
  new_price_ht         DECIMAL(10, 4) NOT NULL,
  price_change_percent DECIMAL(8, 4),
  old_margin_percent   DECIMAL(8, 4),
  new_margin_percent   DECIMAL(8, 4),
  reason               TEXT,
  blocked_by_guard     BOOLEAN NOT NULL DEFAULT false,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── 5. Log immuable des changements de prix ────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.price_changes_log (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id           UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  simulation_id        UUID REFERENCES public.pricing_simulations(id) ON DELETE SET NULL,
  rule_type            TEXT,
  old_price_ht         DECIMAL(10, 4) NOT NULL,
  new_price_ht         DECIMAL(10, 4) NOT NULL,
  price_change_percent DECIMAL(8, 4),
  old_margin_percent   DECIMAL(8, 4),
  new_margin_percent   DECIMAL(8, 4),
  reason               TEXT,
  applied_by           UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  applied_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  is_rollback          BOOLEAN NOT NULL DEFAULT false,
  rollback_of          UUID REFERENCES public.price_changes_log(id) ON DELETE SET NULL
);

-- ── Trigger: price_changes_log est IMMUABLE (no UPDATE/DELETE) ────────────────
CREATE OR REPLACE FUNCTION public.prevent_price_log_changes()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'price_changes_log est immuable — aucune modification ou suppression autorisée';
END;
$$;

DROP TRIGGER IF EXISTS trg_price_changes_log_immutable ON public.price_changes_log;
CREATE TRIGGER trg_price_changes_log_immutable
  BEFORE UPDATE OR DELETE ON public.price_changes_log
  FOR EACH ROW EXECUTE FUNCTION public.prevent_price_log_changes();

-- ── Index performances ────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_pricing_ruleset_rules_ruleset
  ON public.pricing_ruleset_rules(ruleset_id);

CREATE INDEX IF NOT EXISTS idx_pricing_simulation_items_sim
  ON public.pricing_simulation_items(simulation_id);

CREATE INDEX IF NOT EXISTS idx_pricing_simulation_items_prod
  ON public.pricing_simulation_items(product_id);

CREATE INDEX IF NOT EXISTS idx_price_changes_log_product
  ON public.price_changes_log(product_id);

CREATE INDEX IF NOT EXISTS idx_price_changes_log_simulation
  ON public.price_changes_log(simulation_id);

CREATE INDEX IF NOT EXISTS idx_price_changes_log_applied_at
  ON public.price_changes_log(applied_at DESC);

-- ── RLS ───────────────────────────────────────────────────────────────────────
ALTER TABLE public.pricing_rulesets         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pricing_ruleset_rules    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pricing_simulations      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pricing_simulation_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.price_changes_log        ENABLE ROW LEVEL SECURITY;

-- Helper: vérifie que l'utilisateur est admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
      AND role IN ('admin', 'super_admin')
  );
$$;

-- pricing_rulesets
CREATE POLICY "rulesets_admin_all" ON public.pricing_rulesets
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

-- pricing_ruleset_rules
CREATE POLICY "ruleset_rules_admin_all" ON public.pricing_ruleset_rules
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

-- pricing_simulations
CREATE POLICY "simulations_admin_all" ON public.pricing_simulations
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

-- pricing_simulation_items
CREATE POLICY "sim_items_admin_all" ON public.pricing_simulation_items
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

-- price_changes_log: lecture + insertion uniquement (trigger bloque update/delete)
CREATE POLICY "price_log_admin_read" ON public.price_changes_log
  FOR SELECT USING (public.is_admin());

CREATE POLICY "price_log_admin_insert" ON public.price_changes_log
  FOR INSERT WITH CHECK (public.is_admin());
-- Pas de politique UPDATE/DELETE → RLS bloque les modifications côté client
-- Le trigger bloque même les modifications via service role
