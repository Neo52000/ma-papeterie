-- RPC: get_daily_product_updates
-- Returns daily product update metrics grouped by supplier (ALKOR, COMLANDI, SOFT)

CREATE OR REPLACE FUNCTION public.get_daily_product_updates(target_date date DEFAULT CURRENT_DATE)
RETURNS TABLE(
  supplier_code text,
  supplier_name text,
  stock_changes bigint,
  new_articles bigint,
  deactivated bigint,
  price_changes bigint
)
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH target_suppliers AS (
    SELECT s.id, s.code, s.name
    FROM suppliers s
    WHERE s.code IN ('ALKOR', 'COMLANDI', 'SOFT')
  ),
  import_stats AS (
    SELECT
      sil.supplier_id,
      COALESCE(SUM(sil.success_count), 0) AS stock_changes,
      COALESCE(SUM(sil.price_changes_count), 0) AS price_changes,
      COALESCE(SUM(sil.deactivated_count), 0) AS deactivated
    FROM supplier_import_logs sil
    WHERE sil.imported_at::date = target_date
    GROUP BY sil.supplier_id
  ),
  lifecycle_stats AS (
    SELECT
      sp.supplier_id,
      COUNT(*) AS created_count
    FROM product_lifecycle_logs plc
    JOIN supplier_products sp ON sp.product_id = plc.product_id
    WHERE plc.event_type = 'created'
      AND plc.event_at::date = target_date
    GROUP BY sp.supplier_id
  )
  SELECT
    ts.code::text AS supplier_code,
    ts.name::text AS supplier_name,
    COALESCE(ist.stock_changes, 0) AS stock_changes,
    COALESCE(ls.created_count, 0) AS new_articles,
    COALESCE(ist.deactivated, 0) AS deactivated,
    COALESCE(ist.price_changes, 0) AS price_changes
  FROM target_suppliers ts
  LEFT JOIN import_stats ist ON ist.supplier_id = ts.id
  LEFT JOIN lifecycle_stats ls ON ls.supplier_id = ts.id
  ORDER BY ts.code;
END;
$$;
