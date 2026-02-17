
-- ============================================
-- Soft Carrier Integration Schema
-- ============================================

-- 1. Enrich products table with Soft Carrier fields
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS ref_softcarrier VARCHAR(18),
  ADD COLUMN IF NOT EXISTS ref_b2b VARCHAR(20),
  ADD COLUMN IF NOT EXISTS code_b2b INTEGER,
  ADD COLUMN IF NOT EXISTS name_short VARCHAR(60),
  ADD COLUMN IF NOT EXISTS subcategory TEXT,
  ADD COLUMN IF NOT EXISTS brand TEXT,
  ADD COLUMN IF NOT EXISTS oem_ref VARCHAR(18),
  ADD COLUMN IF NOT EXISTS vat_code SMALLINT DEFAULT 1,
  ADD COLUMN IF NOT EXISTS country_origin VARCHAR(3),
  ADD COLUMN IF NOT EXISTS is_end_of_life BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_special_order BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS customs_code VARCHAR(20);

CREATE UNIQUE INDEX IF NOT EXISTS idx_products_ref_softcarrier ON public.products (ref_softcarrier) WHERE ref_softcarrier IS NOT NULL;

-- 2. Create brands table
CREATE TABLE public.brands (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  code VARCHAR(10),
  name VARCHAR(60) NOT NULL,
  company VARCHAR(60),
  country VARCHAR(3),
  website VARCHAR(100),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.brands ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Brands viewable by everyone"
  ON public.brands FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage brands"
  ON public.brands FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role));

-- 3. Create supplier_price_tiers table
CREATE TABLE public.supplier_price_tiers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  tier SMALLINT NOT NULL CHECK (tier BETWEEN 1 AND 6),
  min_qty INTEGER NOT NULL DEFAULT 1,
  price_ht NUMERIC(10,2) NOT NULL,
  price_pvp NUMERIC(10,2),
  tax_cop NUMERIC(6,4) DEFAULT 0,
  tax_d3e NUMERIC(6,4) DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (product_id, tier)
);

ALTER TABLE public.supplier_price_tiers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Price tiers viewable by everyone"
  ON public.supplier_price_tiers FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage price tiers"
  ON public.supplier_price_tiers FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role));

-- 4. Create product_packagings table
CREATE TABLE public.product_packagings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  packaging_type TEXT NOT NULL CHECK (packaging_type IN ('UMV', 'UVE', 'ENV', 'EMB', 'Palette')),
  qty INTEGER NOT NULL DEFAULT 1,
  ean VARCHAR(18),
  weight_gr INTEGER,
  dimensions VARCHAR(50),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (product_id, packaging_type)
);

ALTER TABLE public.product_packagings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Packagings viewable by everyone"
  ON public.product_packagings FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage packagings"
  ON public.product_packagings FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role));

-- 5. Create supplier_stock_snapshots table
CREATE TABLE public.supplier_stock_snapshots (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ref_softcarrier VARCHAR(18) NOT NULL,
  qty_available INTEGER NOT NULL DEFAULT 0,
  delivery_week VARCHAR(10),
  fetched_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_stock_snapshots_ref_date ON public.supplier_stock_snapshots (ref_softcarrier, fetched_at DESC);

ALTER TABLE public.supplier_stock_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Stock snapshots viewable by everyone"
  ON public.supplier_stock_snapshots FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage stock snapshots"
  ON public.supplier_stock_snapshots FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Service can insert stock snapshots"
  ON public.supplier_stock_snapshots FOR INSERT
  WITH CHECK (true);
