-- Unified supplier catalog table.
-- Replaces the dual system (supplier_products + supplier_offers) with a single
-- source of truth. Existing tables remain untouched for backward compatibility.

-- ── 1. Create the table ─────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.supplier_catalog_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id UUID NOT NULL REFERENCES public.suppliers(id) ON DELETE CASCADE,
  product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,

  -- Supplier identifiers
  supplier_sku VARCHAR(50),
  supplier_ean VARCHAR(18),
  supplier_product_name TEXT,

  -- Supplier taxonomy (raw, for traceability)
  supplier_family TEXT,
  supplier_subfamily TEXT,
  supplier_category TEXT,

  -- Pricing & conditions
  purchase_price_ht NUMERIC,
  pvp_ttc NUMERIC,
  vat_rate NUMERIC DEFAULT 20.0,
  eco_tax NUMERIC DEFAULT 0,
  tax_breakdown JSONB DEFAULT '{}',

  -- Stock & logistics
  stock_qty INTEGER DEFAULT 0,
  delivery_delay_days INTEGER,
  min_order_qty INTEGER DEFAULT 1,
  packaging JSONB DEFAULT '{}',

  -- Meta
  is_active BOOLEAN DEFAULT true,
  is_preferred BOOLEAN DEFAULT false,
  priority_rank SMALLINT,
  source_type TEXT DEFAULT 'wholesaler',
  last_seen_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),

  UNIQUE(supplier_id, supplier_sku)
);

CREATE INDEX IF NOT EXISTS idx_sci_product_id ON public.supplier_catalog_items(product_id);
CREATE INDEX IF NOT EXISTS idx_sci_supplier_ean ON public.supplier_catalog_items(supplier_ean);
CREATE INDEX IF NOT EXISTS idx_sci_active ON public.supplier_catalog_items(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_sci_supplier_id ON public.supplier_catalog_items(supplier_id);

-- ── 2. RLS ──────────────────────────────────────────────────────────────────

ALTER TABLE public.supplier_catalog_items ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'supplier_catalog_items'
      AND policyname = 'Admins can manage supplier_catalog_items'
  ) THEN
    CREATE POLICY "Admins can manage supplier_catalog_items"
    ON public.supplier_catalog_items FOR ALL
    USING (
      has_role(auth.uid(), 'admin'::app_role)
      OR has_role(auth.uid(), 'super_admin'::app_role)
    )
    WITH CHECK (
      has_role(auth.uid(), 'admin'::app_role)
      OR has_role(auth.uid(), 'super_admin'::app_role)
    );
  END IF;
END $$;

-- ── 3. Auto-update updated_at trigger ───────────────────────────────────────

CREATE OR REPLACE FUNCTION public.update_sci_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

DROP TRIGGER IF EXISTS trg_sci_updated_at ON public.supplier_catalog_items;
CREATE TRIGGER trg_sci_updated_at
  BEFORE UPDATE ON public.supplier_catalog_items
  FOR EACH ROW EXECUTE FUNCTION public.update_sci_updated_at();

-- ── 4. Migrate data from supplier_products ──────────────────────────────────

INSERT INTO public.supplier_catalog_items (
  supplier_id, product_id, supplier_sku,
  purchase_price_ht, stock_qty, delivery_delay_days,
  min_order_qty, is_preferred, priority_rank, source_type
)
SELECT
  sp.supplier_id,
  sp.product_id,
  sp.supplier_reference,
  sp.supplier_price,
  COALESCE(sp.stock_quantity, 0),
  sp.lead_time_days,
  COALESCE(sp.min_order_quantity, 1),
  COALESCE(sp.is_preferred, false),
  sp.priority_rank,
  COALESCE(sp.source_type, 'wholesaler')
FROM public.supplier_products sp
WHERE sp.supplier_reference IS NOT NULL
ON CONFLICT (supplier_id, supplier_sku) DO NOTHING;

-- ── 5. Migrate data from supplier_offers ────────────────────────────────────
-- Requires suppliers.code to be populated (migration 001)

INSERT INTO public.supplier_catalog_items (
  supplier_id, product_id, supplier_sku, supplier_ean,
  purchase_price_ht, pvp_ttc, vat_rate, tax_breakdown,
  stock_qty, delivery_delay_days, min_order_qty, packaging,
  is_active, last_seen_at, source_type
)
SELECT
  s.id,
  so.product_id,
  so.supplier_product_id,
  (SELECT p.ean FROM public.products p WHERE p.id = so.product_id LIMIT 1),
  so.purchase_price_ht,
  so.pvp_ttc,
  COALESCE(so.vat_rate, 20),
  COALESCE(so.tax_breakdown, '{}'),
  COALESCE(so.stock_qty, 0),
  so.delivery_delay_days,
  COALESCE(so.min_qty, 1),
  COALESCE(so.packaging, '{}'),
  COALESCE(so.is_active, true),
  COALESCE(so.last_seen_at, now()),
  'wholesaler'
FROM public.supplier_offers so
JOIN public.suppliers s ON s.code = so.supplier
ON CONFLICT (supplier_id, supplier_sku) DO UPDATE SET
  purchase_price_ht = EXCLUDED.purchase_price_ht,
  pvp_ttc = EXCLUDED.pvp_ttc,
  stock_qty = EXCLUDED.stock_qty,
  is_active = EXCLUDED.is_active,
  last_seen_at = EXCLUDED.last_seen_at,
  updated_at = now();
