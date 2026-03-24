-- Database views for the unified supplier catalog.
-- These views eliminate N+1 queries and provide ready-to-use aggregations.

-- ── 1. v_best_offers — single best offer per product ────────────────────────
-- Priority: is_preferred DESC → priority_rank ASC → purchase_price_ht ASC

CREATE OR REPLACE VIEW public.v_best_offers AS
SELECT DISTINCT ON (sci.product_id)
  sci.product_id,
  sci.id AS offer_id,
  sci.supplier_id,
  s.name AS supplier_name,
  s.code AS supplier_code,
  sci.supplier_sku,
  sci.purchase_price_ht,
  sci.pvp_ttc,
  sci.stock_qty,
  sci.delivery_delay_days,
  sci.min_order_qty,
  sci.is_preferred,
  sci.last_seen_at
FROM public.supplier_catalog_items sci
JOIN public.suppliers s ON s.id = sci.supplier_id
WHERE sci.is_active = true
  AND sci.product_id IS NOT NULL
ORDER BY sci.product_id,
  sci.is_preferred DESC,
  sci.priority_rank ASC NULLS LAST,
  sci.purchase_price_ht ASC NULLS LAST;

-- ── 2. v_product_all_offers — all offers per product (with cross-EAN) ───────
-- Joins on product_id OR matching EAN, so offers not yet linked by FK
-- are still visible when the EAN matches.

CREATE OR REPLACE VIEW public.v_product_all_offers AS
SELECT
  p.id AS product_id,
  p.name AS product_name,
  p.ean,
  p.image_url,
  p.sku_interne,
  sci.id AS offer_id,
  sci.supplier_id,
  s.name AS supplier_name,
  s.code AS supplier_code,
  sci.supplier_sku,
  sci.supplier_product_name,
  sci.purchase_price_ht,
  sci.pvp_ttc,
  sci.vat_rate,
  sci.stock_qty,
  sci.delivery_delay_days,
  sci.min_order_qty,
  sci.is_active,
  sci.is_preferred,
  sci.priority_rank,
  sci.source_type,
  sci.last_seen_at
FROM public.products p
JOIN public.supplier_catalog_items sci
  ON sci.product_id = p.id
  OR (
    sci.supplier_ean = p.ean
    AND p.ean IS NOT NULL
    AND p.ean != ''
    AND sci.supplier_ean IS NOT NULL
    AND sci.supplier_ean != ''
  )
JOIN public.suppliers s ON s.id = sci.supplier_id;

-- ── 3. v_compat_supplier_offers — backward-compat view for existing code ────
-- Mirrors the shape of the supplier_offers table so existing frontend queries
-- continue to work during the migration period.

CREATE OR REPLACE VIEW public.v_compat_supplier_offers AS
SELECT
  sci.id,
  sci.product_id,
  s.code AS supplier,
  sci.supplier_sku AS supplier_product_id,
  sci.pvp_ttc,
  sci.purchase_price_ht,
  sci.vat_rate,
  sci.tax_breakdown,
  sci.stock_qty,
  sci.delivery_delay_days,
  sci.min_order_qty AS min_qty,
  sci.packaging,
  sci.is_active,
  sci.last_seen_at,
  sci.updated_at,
  sci.created_at
FROM public.supplier_catalog_items sci
JOIN public.suppliers s ON s.id = sci.supplier_id
WHERE s.code IN ('ALKOR', 'COMLANDI', 'SOFT');
