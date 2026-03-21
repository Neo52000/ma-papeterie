-- Ajout des colonnes manquantes sur shopify_sync_log pour le module Shopify Connect
-- La table existe déjà (migration 20260217...), on ajoute les nouvelles colonnes.

ALTER TABLE public.shopify_sync_log
  ADD COLUMN IF NOT EXISTS operation TEXT DEFAULT 'manual_sync'
    CHECK (operation IN (
      'product_push',
      'product_pull',
      'webhook_received',
      'reconciliation',
      'manual_sync',
      'health_check',
      'price_update',
      'inventory_update'
    )),
  ADD COLUMN IF NOT EXISTS direction TEXT DEFAULT NULL
    CHECK (direction IN ('supabase_to_shopify', 'shopify_to_supabase', 'internal')),
  ADD COLUMN IF NOT EXISTS shopify_id TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS items_affected INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS duration_ms INTEGER DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS payload JSONB DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS triggered_by TEXT DEFAULT 'system'
    CHECK (triggered_by IN ('system', 'webhook', 'manual', 'cron')),
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now();

-- Index pour performances (lecture fréquente)
CREATE INDEX IF NOT EXISTS idx_sync_log_created_at ON public.shopify_sync_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sync_log_status ON public.shopify_sync_log(status);
CREATE INDEX IF NOT EXISTS idx_sync_log_operation ON public.shopify_sync_log(operation);

-- Nettoyage automatique : garder 90 jours seulement
CREATE OR REPLACE FUNCTION cleanup_old_sync_logs()
RETURNS void AS $$
BEGIN
  DELETE FROM public.shopify_sync_log
  WHERE created_at < now() - INTERVAL '90 days';
END;
$$ LANGUAGE plpgsql;
