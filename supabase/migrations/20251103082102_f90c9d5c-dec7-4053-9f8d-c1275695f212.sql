-- Phase 1: Enrichissement de la table products
ALTER TABLE products ADD COLUMN IF NOT EXISTS ean TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS manufacturer_code TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS price_ht NUMERIC;
ALTER TABLE products ADD COLUMN IF NOT EXISTS price_ttc NUMERIC;
ALTER TABLE products ADD COLUMN IF NOT EXISTS tva_rate NUMERIC DEFAULT 20.0;
ALTER TABLE products ADD COLUMN IF NOT EXISTS eco_tax NUMERIC DEFAULT 0;
ALTER TABLE products ADD COLUMN IF NOT EXISTS eco_contribution NUMERIC DEFAULT 0;
ALTER TABLE products ADD COLUMN IF NOT EXISTS weight_kg NUMERIC;
ALTER TABLE products ADD COLUMN IF NOT EXISTS dimensions_cm TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS min_stock_alert INTEGER DEFAULT 10;
ALTER TABLE products ADD COLUMN IF NOT EXISTS reorder_quantity INTEGER DEFAULT 50;
ALTER TABLE products ADD COLUMN IF NOT EXISTS margin_percent NUMERIC;
ALTER TABLE products ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;

-- Index pour recherche rapide
CREATE INDEX IF NOT EXISTS idx_products_ean ON products(ean);
CREATE INDEX IF NOT EXISTS idx_products_manufacturer_code ON products(manufacturer_code);

-- Table de tarification dégressive
CREATE TABLE IF NOT EXISTS product_volume_pricing (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  min_quantity INTEGER NOT NULL,
  max_quantity INTEGER,
  price_ht NUMERIC NOT NULL,
  price_ttc NUMERIC NOT NULL,
  discount_percent NUMERIC,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(product_id, min_quantity)
);

ALTER TABLE product_volume_pricing ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage volume pricing"
ON product_volume_pricing FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Volume pricing is viewable by everyone"
ON product_volume_pricing FOR SELECT
USING (true);

-- Enrichissement de supplier_products
ALTER TABLE supplier_products ADD COLUMN IF NOT EXISTS last_order_date TIMESTAMPTZ;
ALTER TABLE supplier_products ADD COLUMN IF NOT EXISTS last_delivery_date TIMESTAMPTZ;
ALTER TABLE supplier_products ADD COLUMN IF NOT EXISTS reliability_score NUMERIC;
ALTER TABLE supplier_products ADD COLUMN IF NOT EXISTS delivery_performance_score NUMERIC;

-- Tables CRM
CREATE TABLE IF NOT EXISTS customer_rfm_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  recency_score INTEGER,
  frequency_score INTEGER,
  monetary_score INTEGER,
  rfm_segment TEXT,
  total_orders INTEGER DEFAULT 0,
  total_spent NUMERIC DEFAULT 0,
  avg_order_value NUMERIC DEFAULT 0,
  last_order_date TIMESTAMPTZ,
  churn_risk NUMERIC,
  lifetime_value_estimate NUMERIC,
  calculated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

ALTER TABLE customer_rfm_scores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own RFM scores"
ON customer_rfm_scores FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all RFM scores"
ON customer_rfm_scores FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Admins can manage RFM scores"
ON customer_rfm_scores FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role));

CREATE TABLE IF NOT EXISTS customer_recommendations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  recommendation_score NUMERIC,
  recommendation_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE customer_recommendations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own recommendations"
ON customer_recommendations FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all recommendations"
ON customer_recommendations FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role));

CREATE TABLE IF NOT EXISTS customer_interactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  interaction_type TEXT NOT NULL,
  subject TEXT,
  notes TEXT,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE customer_interactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage all interactions"
ON customer_interactions FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role));

-- Tables ERP Achats
CREATE TABLE IF NOT EXISTS purchase_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number TEXT UNIQUE NOT NULL,
  supplier_id UUID REFERENCES suppliers(id) ON DELETE SET NULL,
  status TEXT DEFAULT 'draft',
  order_date TIMESTAMPTZ,
  expected_delivery_date TIMESTAMPTZ,
  actual_delivery_date TIMESTAMPTZ,
  total_ht NUMERIC DEFAULT 0,
  total_ttc NUMERIC DEFAULT 0,
  notes TEXT,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE purchase_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage purchase orders"
ON purchase_orders FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role));

CREATE TABLE IF NOT EXISTS purchase_order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_order_id UUID REFERENCES purchase_orders(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  supplier_product_id UUID REFERENCES supplier_products(id) ON DELETE SET NULL,
  quantity INTEGER NOT NULL,
  unit_price_ht NUMERIC NOT NULL,
  unit_price_ttc NUMERIC NOT NULL,
  received_quantity INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE purchase_order_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage purchase order items"
ON purchase_order_items FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role));

CREATE TABLE IF NOT EXISTS stock_receptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_order_id UUID REFERENCES purchase_orders(id) ON DELETE CASCADE,
  reception_date TIMESTAMPTZ DEFAULT NOW(),
  notes TEXT,
  received_by UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE stock_receptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage stock receptions"
ON stock_receptions FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role));

-- Trigger pour updated_at sur purchase_orders
CREATE TRIGGER update_purchase_orders_updated_at
BEFORE UPDATE ON purchase_orders
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Fonction pour générer les numéros de commande fournisseur
CREATE OR REPLACE FUNCTION generate_purchase_order_number()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  year_str TEXT;
  sequence_num INTEGER;
  order_num TEXT;
BEGIN
  year_str := EXTRACT(YEAR FROM NOW())::TEXT;
  
  SELECT COALESCE(MAX(
    CASE 
      WHEN order_number LIKE 'PO-' || year_str || '-%' 
      THEN (regexp_replace(order_number, 'PO-' || year_str || '-', ''))::INTEGER
      ELSE 0
    END
  ), 0) + 1
  INTO sequence_num
  FROM purchase_orders;
  
  order_num := 'PO-' || year_str || '-' || LPAD(sequence_num::TEXT, 4, '0');
  
  RETURN order_num;
END;
$$;