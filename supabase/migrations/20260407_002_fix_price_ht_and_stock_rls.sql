-- Fix two bugs:
-- 1. recompute_product_rollups() was overwriting price_ht and price_ttc with supplier PVP values
-- 2. product_stock_locations had no public SELECT policy → front-office stocks invisible

------------------------------------------------------------------------
-- PART A: Fix recompute_product_rollups — stop clobbering price_ht/price_ttc
------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.recompute_product_rollups(p_product_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_total_stock integer := 0;
  v_is_available boolean := false;
  v_public_price numeric := NULL;
  v_price_source text := NULL;
  v_pvp_supplier text;
  v_best_purchase_price numeric := NULL;
  v_best_supplier_id uuid := NULL;
  v_best_supplier_code text := NULL;
  v_computed_margin numeric := NULL;
  v_margin_warning boolean := false;
  v_price_ht numeric := NULL;
BEGIN
  -- 1. Aggregate stock from all active offers
  SELECT COALESCE(SUM(stock_qty), 0), (COALESCE(SUM(stock_qty), 0) > 0)
  INTO v_total_stock, v_is_available
  FROM public.supplier_offers
  WHERE product_id = p_product_id AND is_active = true;

  -- 2. Determine public price (PVP from supplier or coefficient-based)
  SELECT pvp_ttc, supplier
  INTO v_public_price, v_pvp_supplier
  FROM public.supplier_offers
  WHERE product_id = p_product_id AND is_active = true AND pvp_ttc IS NOT NULL
  ORDER BY CASE supplier WHEN 'ALKOR' THEN 1 WHEN 'COMLANDI' THEN 2 WHEN 'SOFT' THEN 3 END
  LIMIT 1;

  IF v_public_price IS NOT NULL THEN
    v_price_source := 'PVP_' || v_pvp_supplier;
  ELSE
    v_public_price := public.compute_coef_public_price_ttc(p_product_id);
    IF v_public_price IS NOT NULL THEN v_price_source := 'COEF'; END IF;
  END IF;

  -- 3. Best offer for cost_price from supplier_products
  SELECT sp.supplier_price, sp.supplier_id, s.name
  INTO v_best_purchase_price, v_best_supplier_id, v_best_supplier_code
  FROM public.supplier_products sp
  LEFT JOIN public.suppliers s ON s.id = sp.supplier_id
  WHERE sp.product_id = p_product_id
    AND sp.supplier_price IS NOT NULL
    AND sp.supplier_price > 0
  ORDER BY
    sp.is_preferred DESC NULLS LAST,
    sp.priority_rank ASC NULLS LAST,
    sp.supplier_price ASC
  LIMIT 1;

  -- Fallback to supplier_offers
  IF v_best_purchase_price IS NULL THEN
    SELECT so.purchase_price_ht, NULL::uuid, so.supplier
    INTO v_best_purchase_price, v_best_supplier_id, v_best_supplier_code
    FROM public.supplier_offers so
    WHERE so.product_id = p_product_id
      AND so.is_active = true
      AND so.purchase_price_ht IS NOT NULL
      AND so.purchase_price_ht > 0
    ORDER BY so.purchase_price_ht ASC
    LIMIT 1;
  END IF;

  -- 4. Compute margin using the PRODUCT's own price_ht (NOT the supplier PVP)
  SELECT price_ht INTO v_price_ht
  FROM public.products WHERE id = p_product_id;

  IF v_best_purchase_price IS NOT NULL AND v_price_ht IS NOT NULL AND v_price_ht > 0 THEN
    v_computed_margin := ROUND(((v_price_ht - v_best_purchase_price) / v_price_ht) * 100, 2);
    v_margin_warning := v_computed_margin < 10;
  END IF;

  -- 5. Update the product — DO NOT touch price_ttc or price_ht (canonical admin prices)
  UPDATE public.products SET
    public_price_ttc = v_public_price,
    public_price_source = v_price_source,
    public_price_updated_at = now(),
    is_available = v_is_available,
    available_qty_total = v_total_stock,
    availability_updated_at = now(),
    cost_price = COALESCE(v_best_purchase_price, cost_price),
    margin_percent = COALESCE(v_computed_margin, margin_percent)
  WHERE id = p_product_id;

  RETURN jsonb_build_object(
    'product_id', p_product_id,
    'public_price_ttc', v_public_price,
    'public_price_source', v_price_source,
    'is_available', v_is_available,
    'available_qty_total', v_total_stock,
    'purchase_price_ht', v_best_purchase_price,
    'best_supplier_code', v_best_supplier_code,
    'margin_percent', v_computed_margin,
    'margin_warning', v_margin_warning
  );
END;
$function$;


------------------------------------------------------------------------
-- PART B: Add public SELECT policy on product_stock_locations
------------------------------------------------------------------------

CREATE POLICY "public_read_product_stock_locations"
  ON public.product_stock_locations FOR SELECT
  USING (true);


------------------------------------------------------------------------
-- PART C: Backfill corrupted price_ht values from canonical price (TTC)
------------------------------------------------------------------------

UPDATE public.products
SET price_ht = ROUND(price / (1 + COALESCE(tva_rate, 20) / 100.0), 2)
WHERE price IS NOT NULL
  AND price > 0
  AND (
    price_ht IS NULL
    OR ABS(price_ht - ROUND(price / (1 + COALESCE(tva_rate, 20) / 100.0), 2)) > 0.02
  );
