-- Service orders: unified table for photo and reprography orders
CREATE TABLE service_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  order_number TEXT UNIQUE NOT NULL DEFAULT 'TEMP-' || gen_random_uuid()::TEXT,
  service_type TEXT NOT NULL CHECK (service_type IN ('photo', 'reprography')),
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'confirmed', 'processing', 'ready', 'completed', 'cancelled')),
  payment_status TEXT NOT NULL DEFAULT 'pending'
    CHECK (payment_status IN ('pending', 'paid', 'failed', 'refunded')),
  stripe_session_id TEXT,
  stripe_payment_intent_id TEXT,
  total_ht NUMERIC(10,2) NOT NULL DEFAULT 0,
  total_ttc NUMERIC(10,2) NOT NULL DEFAULT 0,
  tva_rate NUMERIC(4,2) NOT NULL DEFAULT 20.00,
  delivery_mode TEXT NOT NULL DEFAULT 'pickup'
    CHECK (delivery_mode IN ('pickup', 'delivery')),
  delivery_fee NUMERIC(10,2) NOT NULL DEFAULT 0,
  shipping_address JSONB,
  customer_email TEXT NOT NULL,
  customer_name TEXT NOT NULL,
  customer_phone TEXT,
  notes TEXT,
  email_notifications BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Service order items
CREATE TABLE service_order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES service_orders(id) ON DELETE CASCADE,
  file_path TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_size BIGINT NOT NULL,
  file_type TEXT NOT NULL,
  -- Reprography-specific
  format TEXT,
  color TEXT,
  recto_verso BOOLEAN DEFAULT false,
  paper_weight INTEGER DEFAULT 80,
  finishing TEXT DEFAULT 'none',
  copies INTEGER DEFAULT 1,
  -- Photo-specific
  photo_format TEXT,
  paper_type TEXT,
  white_margin BOOLEAN DEFAULT false,
  quantity INTEGER DEFAULT 1,
  -- Pricing
  unit_price NUMERIC(10,2) NOT NULL,
  line_total NUMERIC(10,2) NOT NULL,
  -- Metadata
  resolution_warning BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX idx_service_orders_user ON service_orders(user_id);
CREATE INDEX idx_service_orders_status ON service_orders(status);
CREATE INDEX idx_service_orders_stripe ON service_orders(stripe_session_id);
CREATE INDEX idx_service_order_items_order ON service_order_items(order_id);

-- Order number generation trigger (SRV-YYYYMMDD-XXXX)
CREATE OR REPLACE FUNCTION generate_service_order_number()
RETURNS TRIGGER AS $$
DECLARE
  today TEXT;
  seq INTEGER;
BEGIN
  today := to_char(now(), 'YYYYMMDD');
  SELECT COALESCE(MAX(
    CAST(substring(order_number FROM 'SRV-' || today || '-(\d+)') AS INTEGER)
  ), 0) + 1 INTO seq
  FROM service_orders
  WHERE order_number LIKE 'SRV-' || today || '-%';
  NEW.order_number := 'SRV-' || today || '-' || lpad(seq::TEXT, 4, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_service_order_number
  BEFORE INSERT ON service_orders
  FOR EACH ROW
  WHEN (NEW.order_number IS NULL OR NEW.order_number LIKE 'TEMP-%')
  EXECUTE FUNCTION generate_service_order_number();

-- Updated_at trigger
CREATE OR REPLACE FUNCTION update_service_order_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_service_order_updated_at
  BEFORE UPDATE ON service_orders
  FOR EACH ROW
  EXECUTE FUNCTION update_service_order_updated_at();

-- RLS
ALTER TABLE service_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_order_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own service orders"
  ON service_orders FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own service orders"
  ON service_orders FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all service orders"
  ON service_orders FOR SELECT USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Admins can update service orders"
  ON service_orders FOR UPDATE USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Users can view own service order items"
  ON service_order_items FOR SELECT USING (
    EXISTS (SELECT 1 FROM service_orders WHERE id = order_id AND user_id = auth.uid())
  );

CREATE POLICY "Users can insert own service order items"
  ON service_order_items FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM service_orders WHERE id = order_id AND user_id = auth.uid())
  );

CREATE POLICY "Admins can view all service order items"
  ON service_order_items FOR SELECT USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Admins can update service order items"
  ON service_order_items FOR UPDATE USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')
  );
