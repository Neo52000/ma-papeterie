-- Table pour gérer les stocks par emplacement
CREATE TABLE IF NOT EXISTS product_stock_locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  location_type TEXT NOT NULL, -- 'store', 'supplier', 'wholesaler_1', 'wholesaler_2'
  location_name TEXT NOT NULL,
  supplier_id UUID REFERENCES suppliers(id) ON DELETE SET NULL,
  stock_quantity INTEGER DEFAULT 0,
  min_stock_alert INTEGER DEFAULT 10,
  reorder_point INTEGER DEFAULT 20,
  last_inventory_date TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(product_id, location_type, location_name)
);

-- Trigger pour mettre à jour updated_at
CREATE TRIGGER update_product_stock_locations_updated_at
  BEFORE UPDATE ON product_stock_locations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Index pour recherche rapide
CREATE INDEX IF NOT EXISTS idx_product_stock_locations_product_id ON product_stock_locations(product_id);
CREATE INDEX IF NOT EXISTS idx_product_stock_locations_location_type ON product_stock_locations(location_type);

-- RLS Policies
ALTER TABLE product_stock_locations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage stock locations"
  ON product_stock_locations
  FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Stock locations viewable by admins"
  ON product_stock_locations
  FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role));

-- Enrichir supplier_products pour mieux gérer les prix et conditions
ALTER TABLE supplier_products ADD COLUMN IF NOT EXISTS min_order_quantity INTEGER DEFAULT 1;
ALTER TABLE supplier_products ADD COLUMN IF NOT EXISTS delivery_cost NUMERIC DEFAULT 0;
ALTER TABLE supplier_products ADD COLUMN IF NOT EXISTS free_delivery_threshold NUMERIC;
ALTER TABLE supplier_products ADD COLUMN IF NOT EXISTS payment_terms_days INTEGER DEFAULT 30;

-- Ajouter des colonnes pour mieux identifier la source
ALTER TABLE supplier_products ADD COLUMN IF NOT EXISTS source_type TEXT DEFAULT 'direct'; -- 'direct', 'wholesaler'
ALTER TABLE supplier_products ADD COLUMN IF NOT EXISTS priority_rank INTEGER DEFAULT 1; -- 1 = préféré

CREATE INDEX IF NOT EXISTS idx_supplier_products_product_id ON supplier_products(product_id);
CREATE INDEX IF NOT EXISTS idx_supplier_products_source_type ON supplier_products(source_type);