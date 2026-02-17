
-- Table centralisée pour les logs des agents IA et automatisations
CREATE TABLE public.agent_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  agent_name TEXT NOT NULL,
  action TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'success',
  product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
  input_data JSONB DEFAULT '{}',
  output_data JSONB DEFAULT '{}',
  error_message TEXT,
  duration_ms INTEGER,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Index pour requêtes fréquentes
CREATE INDEX idx_agent_logs_agent_name ON public.agent_logs(agent_name);
CREATE INDEX idx_agent_logs_created_at ON public.agent_logs(created_at DESC);
CREATE INDEX idx_agent_logs_status ON public.agent_logs(status);

-- RLS
ALTER TABLE public.agent_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view agent logs"
ON public.agent_logs FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Service can insert agent logs"
ON public.agent_logs FOR INSERT
WITH CHECK (true);

-- Table SEO produits pour stocker le contenu généré
CREATE TABLE public.product_seo (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  meta_title TEXT,
  meta_description TEXT,
  description_courte TEXT,
  description_longue TEXT,
  json_ld JSONB,
  seo_score INTEGER DEFAULT 0,
  generated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  approved_at TIMESTAMP WITH TIME ZONE,
  approved_by UUID,
  status TEXT NOT NULL DEFAULT 'draft',
  UNIQUE(product_id)
);

ALTER TABLE public.product_seo ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage product SEO"
ON public.product_seo FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Product SEO viewable by everyone"
ON public.product_seo FOR SELECT
USING (true);

-- Table pour tracker les syncs Shopify
CREATE TABLE public.shopify_sync_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
  shopify_product_id TEXT,
  sync_type TEXT NOT NULL DEFAULT 'create',
  status TEXT NOT NULL DEFAULT 'success',
  details JSONB DEFAULT '{}',
  error_message TEXT,
  synced_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_shopify_sync_log_product ON public.shopify_sync_log(product_id);
CREATE INDEX idx_shopify_sync_log_synced_at ON public.shopify_sync_log(synced_at DESC);

ALTER TABLE public.shopify_sync_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view shopify sync logs"
ON public.shopify_sync_log FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Service can insert shopify sync logs"
ON public.shopify_sync_log FOR INSERT
WITH CHECK (true);

-- Améliorer detect_product_exceptions pour détecter les doublons EAN
CREATE OR REPLACE FUNCTION public.detect_product_exceptions(p_product_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Clear unresolved exceptions for this product (re-evaluate)
  DELETE FROM public.product_exceptions
  WHERE product_id = p_product_id AND resolved = false;

  -- Exception: EAN manquant
  INSERT INTO public.product_exceptions (product_id, exception_type, details)
  SELECT p_product_id, 'ean_manquant', '{}'::jsonb
  FROM public.products
  WHERE id = p_product_id AND (ean IS NULL OR ean = '')
  ON CONFLICT DO NOTHING;

  -- Exception: Prix incalculable (price <= 0)
  INSERT INTO public.product_exceptions (product_id, exception_type, details)
  SELECT p_product_id, 'prix_incalculable',
    jsonb_build_object('price', price, 'price_ht', price_ht)
  FROM public.products
  WHERE id = p_product_id AND (price <= 0 OR price IS NULL)
  ON CONFLICT DO NOTHING;

  -- Exception: Fournisseur inactif (has suppliers but none active)
  INSERT INTO public.product_exceptions (product_id, exception_type, details)
  SELECT p_product_id, 'fournisseur_inactif',
    jsonb_build_object('supplier_count', COUNT(*))
  FROM public.supplier_products sp
  JOIN public.suppliers s ON s.id = sp.supplier_id
  WHERE sp.product_id = p_product_id
  GROUP BY sp.product_id
  HAVING COUNT(*) > 0 AND COUNT(*) FILTER (WHERE s.is_active = true) = 0
  ON CONFLICT DO NOTHING;

  -- Exception: Doublon EAN
  INSERT INTO public.product_exceptions (product_id, exception_type, details)
  SELECT p_product_id, 'doublon_ean',
    jsonb_build_object('ean', p.ean, 'other_product_ids', 
      (SELECT jsonb_agg(p2.id) FROM public.products p2 WHERE p2.ean = p.ean AND p2.id != p_product_id))
  FROM public.products p
  WHERE p.id = p_product_id 
    AND p.ean IS NOT NULL AND p.ean != ''
    AND EXISTS (SELECT 1 FROM public.products p2 WHERE p2.ean = p.ean AND p2.id != p_product_id)
  ON CONFLICT DO NOTHING;
END;
$$;
