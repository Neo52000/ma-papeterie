-- Dedicated mapping table: internal products ↔ Shopify products
-- Replaces fragile derivation from shopify_sync_log
CREATE TABLE IF NOT EXISTS public.shopify_product_mapping (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  shopify_product_id TEXT NOT NULL,
  shopify_variant_id TEXT,
  shopify_inventory_item_id TEXT,
  last_synced_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT uq_shopify_product_mapping_product UNIQUE (product_id),
  CONSTRAINT uq_shopify_product_mapping_shopify UNIQUE (shopify_product_id)
);

CREATE INDEX idx_shopify_product_mapping_shopify_id
  ON public.shopify_product_mapping(shopify_product_id);

CREATE INDEX idx_shopify_product_mapping_product_id
  ON public.shopify_product_mapping(product_id);

ALTER TABLE public.shopify_product_mapping ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage shopify product mappings"
  ON public.shopify_product_mapping FOR ALL
  USING (
    has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'super_admin'::app_role)
  );

CREATE POLICY "Service can insert shopify product mappings"
  ON public.shopify_product_mapping FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Service can update shopify product mappings"
  ON public.shopify_product_mapping FOR UPDATE
  USING (true);

-- Backfill from existing sync log data
INSERT INTO public.shopify_product_mapping (product_id, shopify_product_id, last_synced_at)
SELECT DISTINCT ON (product_id)
  product_id,
  shopify_product_id,
  synced_at
FROM public.shopify_sync_log
WHERE status = 'success'
  AND product_id IS NOT NULL
  AND shopify_product_id IS NOT NULL
ORDER BY product_id, synced_at DESC
ON CONFLICT (product_id) DO NOTHING;
