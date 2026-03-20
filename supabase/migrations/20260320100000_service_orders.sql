-- Service orders: unified table for reprographie & photo services
CREATE TABLE IF NOT EXISTS service_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) NOT NULL,
  order_number text UNIQUE NOT NULL,
  service_type text NOT NULL CHECK (service_type IN ('reprographie', 'photo')),
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','confirmed','processing','ready','shipped','delivered','cancelled')),
  payment_status text NOT NULL DEFAULT 'pending'
    CHECK (payment_status IN ('pending','paid','failed','refunded')),
  stripe_session_id text,

  -- Common
  notes text,
  delivery_mode text NOT NULL CHECK (delivery_mode IN ('shipping', 'pickup')),
  shipping_address jsonb,
  shipping_cost numeric(10,2) NOT NULL DEFAULT 0,

  -- Totals
  subtotal_ht numeric(10,2) NOT NULL,
  tva_amount numeric(10,2) NOT NULL,
  total_ttc numeric(10,2) NOT NULL,

  -- Reprographie-specific
  print_format text,
  print_color text,
  recto_verso boolean DEFAULT false,
  copies integer DEFAULT 1,

  -- Photo-specific
  photo_finish text,

  customer_email text NOT NULL,
  customer_phone text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Items (uploaded files + per-file options)
CREATE TABLE IF NOT EXISTS service_order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid REFERENCES service_orders(id) ON DELETE CASCADE NOT NULL,
  file_path text NOT NULL,
  file_name text NOT NULL,
  file_size bigint NOT NULL,
  format text,
  quantity integer NOT NULL DEFAULT 1,
  unit_price_ht numeric(10,2) NOT NULL,
  subtotal_ht numeric(10,2) NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- RLS
ALTER TABLE service_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_order_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see own service orders" ON service_orders
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users insert own service orders" ON service_orders
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users see own service order items" ON service_order_items
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM service_orders WHERE id = order_id AND user_id = auth.uid())
  );

CREATE POLICY "Users insert own service order items" ON service_order_items
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM service_orders WHERE id = order_id AND user_id = auth.uid())
  );

-- Indexes
CREATE INDEX idx_service_orders_user ON service_orders(user_id);
CREATE INDEX idx_service_orders_status ON service_orders(status);
CREATE INDEX idx_service_order_items_order ON service_order_items(order_id);

-- Storage bucket (run manually in Supabase dashboard if not using CLI):
-- INSERT INTO storage.buckets (id, name, public) VALUES ('service-orders', 'service-orders', false);
