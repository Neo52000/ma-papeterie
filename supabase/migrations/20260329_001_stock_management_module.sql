-- ============================================================================
-- Module Gestion des Stocks — Ma Papeterie
-- Migration : tables stock_thresholds, stock_movements, vue stock_alerts,
--             ALTER purchase_orders/purchase_order_items, triggers, RLS.
-- ============================================================================

-- ── 1. Table stock_thresholds ───────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS stock_thresholds (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid REFERENCES products(id) ON DELETE CASCADE,
  shopify_variant_id text,
  min_quantity integer NOT NULL DEFAULT 5,
  reorder_quantity integer NOT NULL DEFAULT 20,
  supplier_id uuid REFERENCES suppliers(id) ON DELETE SET NULL,
  lead_time_days integer DEFAULT 7,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_stock_thresholds_product ON stock_thresholds(product_id);
CREATE INDEX IF NOT EXISTS idx_stock_thresholds_variant ON stock_thresholds(shopify_variant_id);

-- Trigger updated_at (réutilise la fonction existante)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'update_stock_thresholds_updated_at'
  ) THEN
    CREATE TRIGGER update_stock_thresholds_updated_at
      BEFORE UPDATE ON stock_thresholds
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

-- RLS
ALTER TABLE stock_thresholds ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage stock_thresholds" ON stock_thresholds
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role IN ('admin', 'super_admin')
    )
  );

-- ── 2. Table stock_movements ────────────────────────────────────────────────

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'movement_type') THEN
    CREATE TYPE movement_type AS ENUM ('sale','restock','adjustment','return','loss','sync');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS stock_movements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid REFERENCES products(id) ON DELETE CASCADE,
  shopify_variant_id text,
  movement_type movement_type NOT NULL,
  quantity_delta integer NOT NULL,
  stock_before integer,
  stock_after integer,
  reference_id uuid,
  source text,
  notes text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_stock_movements_product_date ON stock_movements(product_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_stock_movements_type ON stock_movements(movement_type);

-- RLS
ALTER TABLE stock_movements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage stock_movements" ON stock_movements
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role IN ('admin', 'super_admin')
    )
  );

-- ── 3. ALTER purchase_orders (enrichissement) ────────────────────────────────

ALTER TABLE purchase_orders ADD COLUMN IF NOT EXISTS reference text;

-- Ajouter un CHECK sur le champ status (text) pour limiter les valeurs possibles.
-- On fait un DO $$ pour éviter l'erreur si la contrainte existe déjà.
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_po_status'
  ) THEN
    ALTER TABLE purchase_orders ADD CONSTRAINT chk_po_status
      CHECK (status IN ('draft','sent','confirmed','partially_received','received','cancelled'));
  END IF;
END $$;

-- ── 4. ALTER purchase_order_items (enrichissement) ───────────────────────────

ALTER TABLE purchase_order_items ADD COLUMN IF NOT EXISTS shopify_variant_id text;
ALTER TABLE purchase_order_items ADD COLUMN IF NOT EXISTS reference_fournisseur text;

-- ── 5. Vue matérialisée stock_alerts ─────────────────────────────────────────

CREATE MATERIALIZED VIEW IF NOT EXISTS stock_alerts AS
SELECT
  p.id AS product_id,
  p.name,
  p.sku,
  p.shopify_variant_id,
  p.stock_quantity AS current_stock,
  COALESCE(st.min_quantity, p.min_stock_alert, 5) AS min_quantity,
  COALESCE(st.reorder_quantity, p.reorder_quantity, 20) AS reorder_quantity,
  st.supplier_id,
  s.name AS supplier_name,
  COALESCE(st.lead_time_days, 7) AS lead_time_days,
  CASE
    WHEN p.stock_quantity = 0 THEN 'rupture'
    WHEN p.stock_quantity <= COALESCE(st.min_quantity, p.min_stock_alert, 5) THEN 'critique'
    WHEN p.stock_quantity <= COALESCE(st.min_quantity, p.min_stock_alert, 5) * 2 THEN 'faible'
    ELSE 'ok'
  END AS stock_status
FROM products p
LEFT JOIN stock_thresholds st ON st.product_id = p.id
LEFT JOIN suppliers s ON s.id = st.supplier_id
WHERE p.is_active = true
  AND (
    p.stock_quantity <= COALESCE(st.min_quantity, p.min_stock_alert, 5) * 2
    OR p.stock_quantity = 0
  );

CREATE UNIQUE INDEX IF NOT EXISTS idx_stock_alerts_product ON stock_alerts(product_id);

-- ── 6. RPC refresh_stock_alerts() ────────────────────────────────────────────

CREATE OR REPLACE FUNCTION refresh_stock_alerts()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY stock_alerts;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ── 7. Trigger : log stock_movement on reception ────────────────────────────

CREATE OR REPLACE FUNCTION log_stock_movement_on_reception()
RETURNS trigger AS $$
BEGIN
  IF NEW.received_quantity > COALESCE(OLD.received_quantity, 0) AND NEW.product_id IS NOT NULL THEN
    INSERT INTO stock_movements (product_id, movement_type, quantity_delta, stock_before, stock_after, reference_id, source)
    SELECT
      NEW.product_id,
      'restock'::movement_type,
      NEW.received_quantity - COALESCE(OLD.received_quantity, 0),
      p.stock_quantity,
      p.stock_quantity + (NEW.received_quantity - COALESCE(OLD.received_quantity, 0)),
      NEW.reception_id,
      'reception'
    FROM products p WHERE p.id = NEW.product_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_stock_movement_reception'
  ) THEN
    CREATE TRIGGER trg_stock_movement_reception
      AFTER UPDATE ON stock_reception_items
      FOR EACH ROW EXECUTE FUNCTION log_stock_movement_on_reception();
  END IF;
END $$;
