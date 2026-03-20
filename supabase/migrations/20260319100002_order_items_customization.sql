-- ============================================================================
-- Add customization_data to order_items for stamp designs and future customizable products
-- ============================================================================

ALTER TABLE public.order_items
  ADD COLUMN IF NOT EXISTS customization_data JSONB DEFAULT NULL;

COMMENT ON COLUMN public.order_items.customization_data IS
  'Optional JSON for customized products (stamps, etc.). Contains design reference and summary.';
