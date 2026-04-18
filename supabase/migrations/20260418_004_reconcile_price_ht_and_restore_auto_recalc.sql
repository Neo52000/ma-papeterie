-- Réconcilier price_ht pour les produits où price_ht < cost_price (aberrations
-- héritées du bug de recompute_product_rollups : price_ht était écrasé par
-- v_public_price / 1.2, pouvant descendre à 0.39 quand v_public_price valait
-- 0.468 TTC). Observé sur le produit Liderpapel EAN 8423473806382.
--
-- En complément, restaure le bloc d'auto-recalcul price_ht dans
-- recompute_product_rollups (présent dans 20260409_001 PART B et perdu par
-- 20260418_001 / 20260418_002 lors du refactor de décontamination).
--
-- Règle métier reprise de 20260409_001 :
--   PV HT = MAX(PA HT × coef, PA HT / 0.9)   -- plancher marge 10%
--   PV TTC = PV HT × (1 + TVA / 100)
--   coef = get_pricing_coefficient(family, subfamily), fallback 2.0

------------------------------------------------------------------------
-- PART A : Backfill one-shot des price_ht aberrants
------------------------------------------------------------------------

DO $$
DECLARE
  v_count integer := 0;
BEGIN
  WITH recalc AS (
    UPDATE public.products p
    SET
      price_ht = ROUND(GREATEST(
        p.cost_price * COALESCE(public.get_pricing_coefficient(p.family, COALESCE(p.subfamily, '')), 2.0),
        p.cost_price / 0.9
      ), 2),
      price_ttc = ROUND(GREATEST(
        p.cost_price * COALESCE(public.get_pricing_coefficient(p.family, COALESCE(p.subfamily, '')), 2.0),
        p.cost_price / 0.9
      ) * (1 + COALESCE(p.tva_rate, 20) / 100.0), 2),
      price = ROUND(GREATEST(
        p.cost_price * COALESCE(public.get_pricing_coefficient(p.family, COALESCE(p.subfamily, '')), 2.0),
        p.cost_price / 0.9
      ) * (1 + COALESCE(p.tva_rate, 20) / 100.0), 2),
      margin_percent = ROUND((1.0 - p.cost_price / GREATEST(
        p.cost_price * COALESCE(public.get_pricing_coefficient(p.family, COALESCE(p.subfamily, '')), 2.0),
        p.cost_price / 0.9
      )) * 100, 2),
      updated_at = now()
    WHERE p.is_active = true
      AND p.cost_price IS NOT NULL AND p.cost_price > 0
      AND p.price_ht IS NOT NULL
      AND p.price_ht < p.cost_price
    RETURNING 1
  )
  SELECT count(*) INTO v_count FROM recalc;

  RAISE NOTICE 'reconcile_price_ht PART A: % ligne(s) re-calculée(s) (price_ht < cost_price)', v_count;
END $$;

------------------------------------------------------------------------
-- PART B : Restaurer l'auto-recalcul price_ht dans recompute_product_rollups
-- Fusionne la décontamination de 20260418_002 avec le bloc auto-recalcul de
-- 20260409_001 PART B.
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
  v_tva_rate numeric;
  v_coef numeric;
  v_new_price_ht numeric;
BEGIN
  -- 1. Stock agrégé depuis les offres actives
  SELECT COALESCE(SUM(stock_qty), 0), (COALESCE(SUM(stock_qty), 0) > 0)
  INTO v_total_stock, v_is_available
  FROM public.supplier_offers
  WHERE product_id = p_product_id AND is_active = true;

  -- 2. Prix public observé (PVP fournisseur > COEF calculé)
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

  -- 3. Meilleure offre pour cost_price : supplier_catalog_items prioritaire,
  -- fallback supplier_offers. is_preferred DESC → priority_rank ASC → prix ASC.
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

  -- 4. Snapshot du prix HT courant et de la TVA
  SELECT price_ht, tva_rate
  INTO v_price_ht, v_tva_rate
  FROM public.products
  WHERE id = p_product_id;

  -- 5. Auto-recalcul price_ht / price_ttc / price si aberrant :
  -- price_ht nul ou inférieur au cost_price (ne pas vendre en dessous du prix d'achat).
  IF v_best_purchase_price IS NOT NULL
     AND (v_price_ht IS NULL OR v_price_ht < v_best_purchase_price) THEN
    SELECT public.get_pricing_coefficient(p.family, COALESCE(p.subfamily, ''))
    INTO v_coef
    FROM public.products p
    WHERE p.id = p_product_id;

    v_new_price_ht := ROUND(GREATEST(
      v_best_purchase_price * COALESCE(v_coef, 2.0),
      v_best_purchase_price / 0.9
    ), 2);

    UPDATE public.products SET
      price_ht = v_new_price_ht,
      price_ttc = ROUND(v_new_price_ht * (1 + COALESCE(v_tva_rate, 20) / 100.0), 2),
      price = ROUND(v_new_price_ht * (1 + COALESCE(v_tva_rate, 20) / 100.0), 2)
    WHERE id = p_product_id;

    v_price_ht := v_new_price_ht;
  END IF;

  -- 6. Marge calculée sur le price_ht corrigé
  IF v_best_purchase_price IS NOT NULL AND v_price_ht IS NOT NULL AND v_price_ht > 0 THEN
    v_computed_margin := ROUND(((v_price_ht - v_best_purchase_price) / v_price_ht) * 100, 2);
    v_margin_warning := v_computed_margin < 10;
  END IF;

  -- 7. Update des champs rollup (sans ré-écraser price_ht/price_ttc/price déjà traités)
  UPDATE public.products SET
    public_price_ttc = v_public_price,
    public_price_source = v_price_source,
    public_price_updated_at = now(),
    is_available = v_is_available,
    available_qty_total = v_total_stock,
    availability_updated_at = now(),
    cost_price = COALESCE(v_best_purchase_price, cost_price),
    margin_percent = CASE
      WHEN v_best_purchase_price IS NOT NULL THEN v_computed_margin
      ELSE margin_percent
    END
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
