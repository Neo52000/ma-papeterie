-- Enhance recompute_product_rollups to sync cost_price and margin_percent
-- from the best supplier offer (is_preferred DESC → priority_rank ASC → purchase_price_ht ASC)
--
-- Also adds a margin_warning field to the result when margin < 10%

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

  -- 3. Best offer for cost_price: is_preferred DESC → priority_rank ASC → purchase_price_ht ASC
  --    Uses supplier_catalog_items (unified table) with fallback to supplier_offers
  SELECT sci.purchase_price_ht, sci.supplier_id, s.code
  INTO v_best_purchase_price, v_best_supplier_id, v_best_supplier_code
  FROM public.supplier_catalog_items sci
  LEFT JOIN public.suppliers s ON s.id = sci.supplier_id
  WHERE sci.product_id = p_product_id
    AND sci.is_active = true
    AND sci.purchase_price_ht IS NOT NULL
    AND sci.purchase_price_ht > 0
  ORDER BY
    sci.is_preferred DESC NULLS LAST,
    sci.priority_rank ASC NULLS LAST,
    sci.purchase_price_ht ASC
  LIMIT 1;

  -- Fallback to supplier_offers if no result from supplier_catalog_items
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

  -- 4. Compute margin if we have both cost_price and price_ht
  v_price_ht := CASE
    WHEN v_public_price IS NOT NULL THEN ROUND(v_public_price / (1 + COALESCE(
      (SELECT tva_rate FROM public.products WHERE id = p_product_id), 20
    ) / 100.0), 2)
    ELSE (SELECT price_ht FROM public.products WHERE id = p_product_id)
  END;

  IF v_best_purchase_price IS NOT NULL AND v_price_ht IS NOT NULL AND v_price_ht > 0 THEN
    v_computed_margin := ROUND(((v_price_ht - v_best_purchase_price) / v_price_ht) * 100, 2);
    v_margin_warning := v_computed_margin < 10;
  END IF;

  -- 5. Update the product
  UPDATE public.products SET
    public_price_ttc = v_public_price,
    public_price_source = v_price_source,
    public_price_updated_at = now(),
    is_available = v_is_available,
    available_qty_total = v_total_stock,
    availability_updated_at = now(),
    price_ttc = COALESCE(v_public_price, price_ttc),
    price_ht = CASE
      WHEN v_public_price IS NOT NULL THEN ROUND(v_public_price / (1 + COALESCE(tva_rate, 20) / 100.0), 2)
      ELSE price_ht
    END,
    -- NEW: sync cost_price from best offer
    cost_price = COALESCE(v_best_purchase_price, cost_price),
    -- NEW: sync margin_percent
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

-- Also create/replace the admin wrapper if it exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'admin_recompute_product_rollups') THEN
    -- The admin wrapper just calls recompute_product_rollups, no changes needed
    NULL;
  END IF;
END $$;
