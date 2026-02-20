
-- Migration A: supplier_offers table + rollup columns on products + is_active on pricing_coefficients

-- A1: Colonnes rollup dans products
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS public_price_ttc numeric,
  ADD COLUMN IF NOT EXISTS public_price_source text,
  ADD COLUMN IF NOT EXISTS public_price_updated_at timestamptz,
  ADD COLUMN IF NOT EXISTS is_available boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS available_qty_total integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS availability_updated_at timestamptz;

-- Contrainte CHECK séparée (plus compatible)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'products_public_price_source_check'
  ) THEN
    ALTER TABLE public.products
      ADD CONSTRAINT products_public_price_source_check
      CHECK (public_price_source IN ('PVP_ALKOR','PVP_COMLANDI','PVP_SOFT','COEF'));
  END IF;
END $$;

-- A2: Table supplier_offers
CREATE TABLE IF NOT EXISTS public.supplier_offers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  supplier text NOT NULL CHECK (supplier IN ('ALKOR','COMLANDI','SOFT')),
  supplier_product_id text NOT NULL,
  pvp_ttc numeric,
  purchase_price_ht numeric,
  vat_rate numeric DEFAULT 20,
  tax_breakdown jsonb DEFAULT '{}',
  stock_qty integer DEFAULT 0,
  delivery_delay_days integer,
  min_qty integer DEFAULT 1,
  packaging jsonb DEFAULT '{}',
  is_active boolean DEFAULT true,
  last_seen_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  UNIQUE (supplier, supplier_product_id)
);

CREATE INDEX IF NOT EXISTS idx_supplier_offers_product_id ON public.supplier_offers(product_id);
CREATE INDEX IF NOT EXISTS idx_supplier_offers_supplier ON public.supplier_offers(supplier);
CREATE INDEX IF NOT EXISTS idx_supplier_offers_active ON public.supplier_offers(is_active) WHERE is_active = true;

ALTER TABLE public.supplier_offers ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'supplier_offers' AND policyname = 'Admins can manage supplier_offers'
  ) THEN
    CREATE POLICY "Admins can manage supplier_offers"
    ON public.supplier_offers FOR ALL
    USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role))
    WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role));
  END IF;
END $$;

-- Trigger updated_at
CREATE OR REPLACE FUNCTION public.update_supplier_offers_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

DROP TRIGGER IF EXISTS trg_supplier_offers_updated_at ON public.supplier_offers;
CREATE TRIGGER trg_supplier_offers_updated_at
  BEFORE UPDATE ON public.supplier_offers
  FOR EACH ROW EXECUTE FUNCTION public.update_supplier_offers_updated_at();

-- A3: Ajout is_active à liderpapel_pricing_coefficients
ALTER TABLE public.liderpapel_pricing_coefficients
  ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT true;
