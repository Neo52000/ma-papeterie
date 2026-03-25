-- Shipping zones and methods tables for dynamic delivery management

CREATE TABLE IF NOT EXISTS shipping_zones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  countries TEXT[] NOT NULL DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS shipping_methods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  zone_id UUID NOT NULL REFERENCES shipping_zones(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  carrier TEXT NOT NULL,
  method_type TEXT NOT NULL DEFAULT 'delivery',
  min_weight NUMERIC DEFAULT 0,
  max_weight NUMERIC DEFAULT 30,
  base_cost NUMERIC NOT NULL DEFAULT 0,
  cost_per_kg NUMERIC DEFAULT 0,
  free_above NUMERIC,
  delivery_days_min INTEGER,
  delivery_days_max INTEGER,
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- RLS
ALTER TABLE shipping_zones ENABLE ROW LEVEL SECURITY;
ALTER TABLE shipping_methods ENABLE ROW LEVEL SECURITY;

-- Admin full access
CREATE POLICY "shipping_zones_admin_all" ON shipping_zones
  FOR ALL USING (
    has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'super_admin'::app_role)
  );

CREATE POLICY "shipping_methods_admin_all" ON shipping_methods
  FOR ALL USING (
    has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'super_admin'::app_role)
  );

-- Public read for active records (anonymous + authenticated)
CREATE POLICY "shipping_zones_public_read" ON shipping_zones
  FOR SELECT TO anon, authenticated
  USING (is_active = true);

CREATE POLICY "shipping_methods_public_read" ON shipping_methods
  FOR SELECT TO anon, authenticated
  USING (is_active = true);

-- Seed data: France Métropolitaine zone with 3 methods
INSERT INTO shipping_zones (name, countries, is_active, sort_order) VALUES
  ('France Métropolitaine', ARRAY['FR'], true, 1);

INSERT INTO shipping_methods (zone_id, name, carrier, method_type, base_cost, cost_per_kg, free_above, delivery_days_min, delivery_days_max, sort_order)
SELECT z.id, v.name, v.carrier, v.method_type, v.base_cost, v.cost_per_kg, v.free_above, v.days_min, v.days_max, v.sort
FROM shipping_zones z, (VALUES
  ('Colissimo Standard', 'La Poste', 'delivery', 4.95, 0.5, 89, 2, 4, 1),
  ('Mondial Relay', 'Mondial Relay', 'relay_point', 3.95, 0.3, 89, 3, 5, 2),
  ('Retrait en magasin', 'Ma Papeterie', 'store_pickup', 0, 0, 0, 0, 0, 3)
) AS v(name, carrier, method_type, base_cost, cost_per_kg, free_above, days_min, days_max, sort)
WHERE z.name = 'France Métropolitaine';
