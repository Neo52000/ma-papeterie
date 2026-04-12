-- Bidirectional Shopify sync: add columns to shopify_product_mapping
-- Fixes bug: sync-shopify references `stale` column that didn't exist

ALTER TABLE public.shopify_product_mapping
  ADD COLUMN IF NOT EXISTS stale BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS shopify_updated_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS supabase_updated_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS sync_direction TEXT NOT NULL DEFAULT 'push'
    CHECK (sync_direction IN ('push', 'pull', 'both')),
  ADD COLUMN IF NOT EXISTS conflict_status TEXT DEFAULT NULL
    CHECK (conflict_status IS NULL OR conflict_status IN ('none', 'shopify_newer', 'supabase_newer', 'conflict')),
  ADD COLUMN IF NOT EXISTS shopify_product_data JSONB DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS last_pull_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS last_push_at TIMESTAMPTZ;

-- Partial indexes for efficient lookups
CREATE INDEX IF NOT EXISTS idx_shopify_mapping_stale
  ON public.shopify_product_mapping(stale) WHERE stale = true;

CREATE INDEX IF NOT EXISTS idx_shopify_mapping_conflict
  ON public.shopify_product_mapping(conflict_status)
  WHERE conflict_status IS NOT NULL AND conflict_status != 'none';
