-- RPC: get_supplier_completeness
-- Returns per-supplier completeness metrics for the admin dashboard.
-- Uses supplier_offers (exists in prod) — NOT supplier_catalog_items.

CREATE OR REPLACE FUNCTION public.get_supplier_completeness()
RETURNS TABLE (
  supplier text,
  total_offers bigint,
  total_products bigint,
  pct_with_image numeric,
  pct_with_description numeric,
  pct_with_ean numeric,
  pct_with_cost_price numeric,
  pct_in_stock numeric,
  pct_icecat_enriched numeric,
  pct_with_seo numeric,
  pct_with_brand numeric,
  avg_completion numeric
)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  WITH supplier_products_agg AS (
    SELECT
      so.supplier,
      COUNT(*) AS total_offers,
      COUNT(DISTINCT so.product_id) AS total_products,
      COUNT(DISTINCT CASE WHEN p.image_url IS NOT NULL AND p.image_url != '' THEN p.id END) AS with_image,
      COUNT(DISTINCT CASE WHEN p.description IS NOT NULL AND p.description != '' THEN p.id END) AS with_description,
      COUNT(DISTINCT CASE WHEN p.ean IS NOT NULL AND p.ean != '' THEN p.id END) AS with_ean,
      COUNT(DISTINCT CASE WHEN so.purchase_price_ht IS NOT NULL AND so.purchase_price_ht > 0 THEN so.product_id END) AS with_cost_price,
      COUNT(DISTINCT CASE WHEN so.stock_qty > 0 THEN so.product_id END) AS in_stock,
      COUNT(DISTINCT CASE WHEN p.icecat_enriched_at IS NOT NULL THEN p.id END) AS icecat_enriched,
      COUNT(DISTINCT CASE WHEN ps.id IS NOT NULL THEN p.id END) AS with_seo,
      COUNT(DISTINCT CASE WHEN p.brand IS NOT NULL AND p.brand != '' THEN p.id END) AS with_brand
    FROM supplier_offers so
    JOIN products p ON p.id = so.product_id
    LEFT JOIN product_seo ps ON ps.product_id = p.id
    WHERE so.is_active = true
    GROUP BY so.supplier
  )
  SELECT
    spa.supplier,
    spa.total_offers,
    spa.total_products,
    ROUND(100.0 * spa.with_image / NULLIF(spa.total_products, 0), 1) AS pct_with_image,
    ROUND(100.0 * spa.with_description / NULLIF(spa.total_products, 0), 1) AS pct_with_description,
    ROUND(100.0 * spa.with_ean / NULLIF(spa.total_products, 0), 1) AS pct_with_ean,
    ROUND(100.0 * spa.with_cost_price / NULLIF(spa.total_products, 0), 1) AS pct_with_cost_price,
    ROUND(100.0 * spa.in_stock / NULLIF(spa.total_products, 0), 1) AS pct_in_stock,
    ROUND(100.0 * spa.icecat_enriched / NULLIF(spa.total_products, 0), 1) AS pct_icecat_enriched,
    ROUND(100.0 * spa.with_seo / NULLIF(spa.total_products, 0), 1) AS pct_with_seo,
    ROUND(100.0 * spa.with_brand / NULLIF(spa.total_products, 0), 1) AS pct_with_brand,
    -- Average completion across all metrics
    ROUND((
      100.0 * spa.with_image / NULLIF(spa.total_products, 0)
      + 100.0 * spa.with_description / NULLIF(spa.total_products, 0)
      + 100.0 * spa.with_ean / NULLIF(spa.total_products, 0)
      + 100.0 * spa.with_cost_price / NULLIF(spa.total_products, 0)
      + 100.0 * spa.in_stock / NULLIF(spa.total_products, 0)
      + 100.0 * spa.with_brand / NULLIF(spa.total_products, 0)
    ) / 6.0, 1) AS avg_completion
  FROM supplier_products_agg spa
  ORDER BY spa.supplier;
$$;
