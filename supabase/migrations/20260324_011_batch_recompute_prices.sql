-- Batch recompute public prices for all products missing public_price_ttc
-- but that have active supplier offers with pricing data

CREATE OR REPLACE FUNCTION public.admin_batch_recompute_missing_prices()
RETURNS TABLE(product_id uuid, product_name text, new_price numeric, source text)
LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NOT (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role)) THEN
    RAISE EXCEPTION 'Accès non autorisé';
  END IF;

  RETURN QUERY
  WITH candidates AS (
    SELECT DISTINCT p.id, p.name
    FROM products p
    JOIN supplier_offers so ON so.product_id = p.id
    WHERE p.is_active = true
      AND p.public_price_ttc IS NULL
      AND so.is_active = true
      AND (so.pvp_ttc IS NOT NULL OR so.purchase_price_ht > 0)
  ),
  recomputed AS (
    SELECT c.id, c.name, public.recompute_product_rollups(c.id) AS result
    FROM candidates c
  )
  SELECT r.id, r.name,
    (r.result->>'public_price_ttc')::numeric,
    r.result->>'public_price_source'
  FROM recomputed r
  WHERE r.result->>'public_price_ttc' IS NOT NULL;
END;
$$;
