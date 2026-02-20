
-- Migration B (corrigée): Fonctions SQL rollup sans la colonne grp supplémentaire

-- Vue priorité fournisseur
CREATE OR REPLACE VIEW public.v_supplier_offer_priority AS
SELECT *,
  CASE supplier
    WHEN 'ALKOR'    THEN 1
    WHEN 'COMLANDI' THEN 2
    WHEN 'SOFT'     THEN 3
  END AS priority_rank
FROM public.supplier_offers
WHERE is_active = true;

-- Fonction get_pricing_coefficient
CREATE OR REPLACE FUNCTION public.get_pricing_coefficient(p_family text, p_subfamily text DEFAULT '')
RETURNS numeric
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT coefficient FROM liderpapel_pricing_coefficients
     WHERE family = p_family AND subfamily = p_subfamily AND is_active = true LIMIT 1),
    (SELECT coefficient FROM liderpapel_pricing_coefficients
     WHERE family = p_family AND (subfamily IS NULL OR subfamily = '') AND is_active = true LIMIT 1),
    2.0
  );
$$;

-- Fonction select_reference_offer_for_pricing
-- Retourne l'offre de référence pour le calcul de prix (active avec stock en priorité, sinon sans stock)
CREATE OR REPLACE FUNCTION public.select_reference_offer_for_pricing(p_product_id uuid)
RETURNS public.supplier_offers
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_offer public.supplier_offers;
BEGIN
  -- 1. Offre active avec stock > 0, priorité ALKOR > COMLANDI > SOFT
  SELECT id, product_id, supplier, supplier_product_id, pvp_ttc, purchase_price_ht, vat_rate,
         tax_breakdown, stock_qty, delivery_delay_days, min_qty, packaging, is_active,
         last_seen_at, updated_at, created_at
  INTO v_offer
  FROM public.supplier_offers
  WHERE product_id = p_product_id AND is_active = true AND stock_qty > 0
  ORDER BY CASE supplier WHEN 'ALKOR' THEN 1 WHEN 'COMLANDI' THEN 2 WHEN 'SOFT' THEN 3 END
  LIMIT 1;

  IF v_offer.id IS NOT NULL THEN RETURN v_offer; END IF;

  -- 2. Sinon offre active sans stock
  SELECT id, product_id, supplier, supplier_product_id, pvp_ttc, purchase_price_ht, vat_rate,
         tax_breakdown, stock_qty, delivery_delay_days, min_qty, packaging, is_active,
         last_seen_at, updated_at, created_at
  INTO v_offer
  FROM public.supplier_offers
  WHERE product_id = p_product_id AND is_active = true
  ORDER BY CASE supplier WHEN 'ALKOR' THEN 1 WHEN 'COMLANDI' THEN 2 WHEN 'SOFT' THEN 3 END
  LIMIT 1;

  RETURN v_offer;
END;
$$;

-- Fonction compute_coef_public_price_ttc
CREATE OR REPLACE FUNCTION public.compute_coef_public_price_ttc(p_product_id uuid)
RETURNS numeric
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_offer public.supplier_offers;
  v_coef numeric;
  v_taxes numeric := 0;
  v_tax_key text;
  v_tax_val text;
  v_price_ht numeric;
  v_vat_rate numeric;
BEGIN
  v_offer := public.select_reference_offer_for_pricing(p_product_id);
  IF v_offer IS NULL OR v_offer.purchase_price_ht IS NULL THEN RETURN NULL; END IF;

  SELECT public.get_pricing_coefficient(p.family, COALESCE(p.subfamily, ''))
  INTO v_coef FROM public.products p WHERE p.id = p_product_id;

  v_price_ht := v_offer.purchase_price_ht * COALESCE(v_coef, 2.0);
  v_vat_rate := COALESCE(v_offer.vat_rate, 20) / 100.0;

  IF v_offer.tax_breakdown IS NOT NULL AND v_offer.tax_breakdown != '{}'::jsonb THEN
    FOR v_tax_key, v_tax_val IN SELECT key, value FROM jsonb_each_text(v_offer.tax_breakdown)
    LOOP
      BEGIN
        v_taxes := v_taxes + COALESCE(v_tax_val::numeric, 0);
      EXCEPTION WHEN OTHERS THEN
        NULL; -- ignorer valeur non numérique
      END;
    END LOOP;
  END IF;

  RETURN ROUND(v_price_ht * (1 + v_vat_rate) + v_taxes, 2);
END;
$$;

-- Fonction principale recompute_product_rollups (jamais en trigger)
CREATE OR REPLACE FUNCTION public.recompute_product_rollups(p_product_id uuid)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total_stock integer := 0;
  v_is_available boolean := false;
  v_public_price numeric := NULL;
  v_price_source text := NULL;
  v_pvp_supplier text;
BEGIN
  SELECT COALESCE(SUM(stock_qty), 0), (COALESCE(SUM(stock_qty), 0) > 0)
  INTO v_total_stock, v_is_available
  FROM public.supplier_offers
  WHERE product_id = p_product_id AND is_active = true;

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

  UPDATE public.products SET
    public_price_ttc = v_public_price,
    public_price_source = v_price_source,
    public_price_updated_at = now(),
    is_available = v_is_available,
    available_qty_total = v_total_stock,
    availability_updated_at = now()
  WHERE id = p_product_id;

  RETURN jsonb_build_object(
    'product_id', p_product_id,
    'public_price_ttc', v_public_price,
    'public_price_source', v_price_source,
    'is_available', v_is_available,
    'available_qty_total', v_total_stock
  );
END;
$$;

-- RPC admin uniquement
CREATE OR REPLACE FUNCTION public.admin_recompute_product_rollups(p_product_id uuid)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role)) THEN
    RAISE EXCEPTION 'Accès non autorisé';
  END IF;
  RETURN public.recompute_product_rollups(p_product_id);
END;
$$;
