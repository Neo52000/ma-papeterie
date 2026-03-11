-- ─────────────────────────────────────────────────────────────────────────────
-- Media Pipeline & Catalog Enrichment — ma-papeterie.fr
-- Adds columns for: image pipeline, top product scoring, FAQ, SEO metadata
-- ─────────────────────────────────────────────────────────────────────────────

-- ── 1. Image pipeline columns ────────────────────────────────────────────────
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS image_url_1        TEXT,
  ADD COLUMN IF NOT EXISTS image_url_2        TEXT,
  ADD COLUMN IF NOT EXISTS image_url_3        TEXT,
  ADD COLUMN IF NOT EXISTS processed_image_1  TEXT,
  ADD COLUMN IF NOT EXISTS processed_image_2  TEXT,
  ADD COLUMN IF NOT EXISTS processed_image_3  TEXT,
  ADD COLUMN IF NOT EXISTS alt_text_1         TEXT,
  ADD COLUMN IF NOT EXISTS alt_text_2         TEXT,
  ADD COLUMN IF NOT EXISTS alt_text_3         TEXT,
  ADD COLUMN IF NOT EXISTS images_processed   BOOLEAN NOT NULL DEFAULT FALSE;

-- ── 2. Top product scoring columns ──────────────────────────────────────────
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS is_top_product       BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS top_product_score    FLOAT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS top_product_reason   TEXT,
  ADD COLUMN IF NOT EXISTS has_video            BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS video_url            TEXT,
  ADD COLUMN IF NOT EXISTS total_revenue_12m    FLOAT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_orders_12m     INTEGER DEFAULT 0;

-- ── 3. SEO metadata columns ─────────────────────────────────────────────────
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS meta_title       TEXT,
  ADD COLUMN IF NOT EXISTS meta_description TEXT,
  ADD COLUMN IF NOT EXISTS seo_generated    BOOLEAN NOT NULL DEFAULT FALSE;

-- ── 4. FAQ generation flag ──────────────────────────────────────────────────
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS faq_generated BOOLEAN NOT NULL DEFAULT FALSE;

-- ── 5. Schema.org JSON-LD column ────────────────────────────────────────────
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS schema_json JSONB;

-- ── 6. Product FAQs table ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.product_faqs (
  id          UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id  UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  question    TEXT NOT NULL,
  answer      TEXT NOT NULL,
  position    INTEGER NOT NULL DEFAULT 1,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_product_faqs_product_id
  ON public.product_faqs(product_id);

ALTER TABLE public.product_faqs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view product faqs"
  ON public.product_faqs FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage product faqs"
  ON public.product_faqs FOR ALL
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

CREATE TRIGGER update_product_faqs_updated_at
  BEFORE UPDATE ON public.product_faqs
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- ── 7. Performance indexes ──────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_products_images_not_processed
  ON public.products(id) WHERE images_processed = FALSE;

CREATE INDEX IF NOT EXISTS idx_products_top_product
  ON public.products(top_product_score DESC) WHERE is_top_product = TRUE;

CREATE INDEX IF NOT EXISTS idx_products_faq_not_generated
  ON public.products(id) WHERE faq_generated = FALSE;

CREATE INDEX IF NOT EXISTS idx_products_seo_not_generated
  ON public.products(id) WHERE seo_generated = FALSE;

-- ── 8. Materialized view for product performance (safe: skips if order_items missing)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'order_items'
  ) THEN
    EXECUTE '
      CREATE MATERIALIZED VIEW IF NOT EXISTS public.product_performance AS
      SELECT
        p.id,
        p.ean,
        p.name,
        p.brand,
        p.category,
        COALESCE(SUM(oi.quantity * oi.unit_price), 0) AS revenue_12m,
        COALESCE(COUNT(DISTINCT oi.order_id), 0) AS orders_12m,
        COALESCE(SUM(oi.quantity), 0) AS units_12m
      FROM public.products p
      LEFT JOIN public.order_items oi ON oi.product_id = p.id
      LEFT JOIN public.orders o ON o.id = oi.order_id
        AND o.created_at >= NOW() - INTERVAL ''12 months''
        AND o.status IN (''completed'', ''shipped'', ''delivered'')
      GROUP BY p.id, p.ean, p.name, p.brand, p.category
    ';
  END IF;
END $$;
