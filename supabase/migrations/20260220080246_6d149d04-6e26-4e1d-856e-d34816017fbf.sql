
-- ─── 1. Nouvelles tables du catalogue robuste ───

-- Table product_attributes (attributs normalisés)
CREATE TABLE IF NOT EXISTS public.product_attributes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  attribute_type text NOT NULL,
  attribute_name text NOT NULL,
  attribute_value text NOT NULL,
  unit text,
  source text DEFAULT 'supplier',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.product_attributes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "product_attributes_select_public" ON public.product_attributes
  FOR SELECT USING (true);

CREATE POLICY "product_attributes_manage_admins" ON public.product_attributes
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role));

CREATE INDEX IF NOT EXISTS idx_product_attributes_product_id ON public.product_attributes(product_id);
CREATE INDEX IF NOT EXISTS idx_product_attributes_type ON public.product_attributes(attribute_type);

-- Table product_price_history
CREATE TABLE IF NOT EXISTS public.product_price_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  changed_at timestamptz NOT NULL DEFAULT now(),
  changed_by text NOT NULL DEFAULT 'import',
  supplier_id uuid REFERENCES public.suppliers(id),
  old_cost_price numeric,
  new_cost_price numeric,
  old_price_ht numeric,
  new_price_ht numeric,
  old_price_ttc numeric,
  new_price_ttc numeric,
  change_reason text
);

ALTER TABLE public.product_price_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "product_price_history_select_admins" ON public.product_price_history
  FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "product_price_history_insert" ON public.product_price_history
  FOR INSERT WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_product_price_history_product_id ON public.product_price_history(product_id);
CREATE INDEX IF NOT EXISTS idx_product_price_history_changed_at ON public.product_price_history(changed_at DESC);

-- Table product_lifecycle_logs
CREATE TABLE IF NOT EXISTS public.product_lifecycle_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  event_at timestamptz NOT NULL DEFAULT now(),
  performed_by text NOT NULL DEFAULT 'import',
  details jsonb NOT NULL DEFAULT '{}'
);

ALTER TABLE public.product_lifecycle_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "product_lifecycle_logs_select_admins" ON public.product_lifecycle_logs
  FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "product_lifecycle_logs_insert" ON public.product_lifecycle_logs
  FOR INSERT WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_product_lifecycle_logs_product_id ON public.product_lifecycle_logs(product_id);
CREATE INDEX IF NOT EXISTS idx_product_lifecycle_logs_event_at ON public.product_lifecycle_logs(event_at DESC);

-- ─── 2. Enrichissement des tables existantes ───

-- Colonnes manquantes dans products
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS status text DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS warranty_months integer,
  ADD COLUMN IF NOT EXISTS delivery_days integer,
  ADD COLUMN IF NOT EXISTS is_fragile boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_heavy boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS requires_special_shipping boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS manufacturer_ref text;

-- Enrichissement product_seo
ALTER TABLE public.product_seo
  ADD COLUMN IF NOT EXISTS description_detaillee text,
  ADD COLUMN IF NOT EXISTS description_source text DEFAULT 'supplier',
  ADD COLUMN IF NOT EXISTS lang text DEFAULT 'fr';

-- Enrichissement product_images : display_order
ALTER TABLE public.product_images
  ADD COLUMN IF NOT EXISTS display_order integer DEFAULT 0;

-- ─── 3. RPC find_products_by_refs ───
CREATE OR REPLACE FUNCTION public.find_products_by_refs(refs text[])
RETURNS TABLE(product_id uuid, matched_ref text)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.id, p.attributs->>'ref_liderpapel'
  FROM products p
  WHERE p.attributs->>'ref_liderpapel' = ANY(refs)
    AND p.attributs->>'ref_liderpapel' IS NOT NULL
  UNION ALL
  SELECT p.id, p.attributs->>'ref_comlandi'
  FROM products p
  WHERE p.attributs->>'ref_comlandi' = ANY(refs)
    AND p.attributs->>'ref_comlandi' IS NOT NULL
    AND NOT (p.attributs->>'ref_liderpapel' = ANY(refs))
  UNION ALL
  SELECT p.id, p.ean
  FROM products p
  WHERE p.ean = ANY(refs)
    AND p.ean IS NOT NULL
    AND NOT (p.attributs->>'ref_liderpapel' = ANY(refs))
    AND NOT (p.attributs->>'ref_comlandi' = ANY(refs))
$$;

-- ─── 4. Enrichissement supplier_import_logs ───
ALTER TABLE public.supplier_import_logs
  ADD COLUMN IF NOT EXISTS price_changes_count integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS deactivated_count integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS report_data jsonb;

-- ─── 5. Index pour les requêtes fréquentes du catalogue ───
CREATE INDEX IF NOT EXISTS idx_products_image_url ON public.products(image_url) WHERE image_url IS NULL;
CREATE INDEX IF NOT EXISTS idx_products_ean_notnull ON public.products(ean) WHERE ean IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_products_status ON public.products(status);
CREATE INDEX IF NOT EXISTS idx_products_is_active ON public.products(is_active);
