-- ─────────────────────────────────────────────────────────────────────────────
-- Icecat enrichment columns + Shopify direct references on products table
-- ─────────────────────────────────────────────────────────────────────────────

-- ── 1. Icecat metadata ────────────────────────────────────────────────────────
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS icecat_id              BIGINT,
  ADD COLUMN IF NOT EXISTS icecat_enriched_at     TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS icecat_title           TEXT,
  ADD COLUMN IF NOT EXISTS icecat_description     TEXT,
  ADD COLUMN IF NOT EXISTS icecat_images          JSONB   NOT NULL DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS specifications         JSONB   NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS bullet_points          TEXT[]  DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS multimedia             JSONB   NOT NULL DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS reasons_to_buy         JSONB   NOT NULL DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS product_story_url      TEXT,
  ADD COLUMN IF NOT EXISTS icecat_category        TEXT,
  ADD COLUMN IF NOT EXISTS icecat_brand_logo      TEXT,
  ADD COLUMN IF NOT EXISTS icecat_warranty        TEXT,
  ADD COLUMN IF NOT EXISTS icecat_leaflet_url     TEXT,
  ADD COLUMN IF NOT EXISTS icecat_manual_url      TEXT;

-- ── 2. Shopify direct product references ──────────────────────────────────────
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS shopify_product_id         TEXT,
  ADD COLUMN IF NOT EXISTS shopify_variant_id         TEXT,
  ADD COLUMN IF NOT EXISTS shopify_inventory_item_id  TEXT,
  ADD COLUMN IF NOT EXISTS shopify_synced_at          TIMESTAMPTZ;

-- ── 3. Performance indexes ────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_products_icecat_not_enriched
  ON public.products (id)
  WHERE icecat_enriched_at IS NULL AND ean IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_products_icecat_id
  ON public.products (icecat_id)
  WHERE icecat_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_products_shopify_product_id
  ON public.products (shopify_product_id)
  WHERE shopify_product_id IS NOT NULL;
