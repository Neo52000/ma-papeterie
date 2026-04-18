-- Hotfix des régressions introduites par 20260418_001_price_rollups_decontamination.sql
--
-- Régression 1 (P1) : `recompute_product_rollups` ne synchronise plus `cost_price`
--   et `margin_percent` depuis la meilleure offre fournisseur (`supplier_catalog_items`
--   avec fallback `supplier_offers`). Comportement introduit par la migration
--   20260403120000_enhance_rollup_cost_price_sync.sql et supprimé par erreur.
--
-- Régression 2 (P2) : `get_catalog_page` a perdu les prédicats de recherche étendus
--   (`manufacturer_ref` + `EXISTS` sur `supplier_offers.supplier_product_id` +
--   `supplier_catalog_items.supplier_sku`) ajoutés par
--   20260403160000_search_supplier_references.sql. Résultat : recherches par
--   référence fournisseur (ex. "Alkor 476189") cassées dans le catalogue.
--
-- Cette migration restaure les deux comportements en conservant la décontamination :
--   - `price_ttc` / `price_ht` ne sont plus écrasés par `v_public_price` (RRP).
--   - `get_catalog_page` retourne `price_ttc` (facturé) et pas `COALESCE(public_price_ttc, price_ttc)`.
--   - `search_products` retourne aussi `price_ttc` pour cohérence (jusqu'ici faisait le mauvais COALESCE).

-- 1. recompute_product_rollups : décontamination + sync cost_price/margin_percent
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
  -- 1. Aggrégation du stock depuis les offres actives
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

  -- 3. Meilleure offre pour cost_price : is_preferred DESC → priority_rank ASC → purchase_price_ht ASC
  --    supplier_catalog_items prioritaire, fallback supplier_offers
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

  -- 4. Marge calculée depuis price_ht (source de vérité) et le meilleur coût
  SELECT price_ht INTO v_price_ht FROM public.products WHERE id = p_product_id;

  IF v_best_purchase_price IS NOT NULL AND v_price_ht IS NOT NULL AND v_price_ht > 0 THEN
    v_computed_margin := ROUND(((v_price_ht - v_best_purchase_price) / v_price_ht) * 100, 2);
    v_margin_warning := v_computed_margin < 10;
  END IF;

  -- 5. Update : décontamination (price_ttc/price_ht inchangés) + sync cost/margin
  UPDATE public.products SET
    public_price_ttc = v_public_price,
    public_price_source = v_price_source,
    public_price_updated_at = now(),
    is_available = v_is_available,
    available_qty_total = v_total_stock,
    availability_updated_at = now(),
    cost_price = COALESCE(v_best_purchase_price, cost_price),
    -- margin_percent doit suivre le nouveau cost_price : si le coût est rafraîchi
    -- mais v_price_ht ne permet pas de calculer une marge valide, on préfère NULL
    -- plutôt qu'une marge stale calculée sur l'ancien coût.
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


-- 2. get_catalog_page : restaurer les prédicats de recherche supplier
CREATE OR REPLACE FUNCTION public.get_catalog_page(
  p_page integer DEFAULT 1,
  p_per_page integer DEFAULT 24,
  p_category text DEFAULT NULL::text,
  p_brand text DEFAULT NULL::text,
  p_min_price numeric DEFAULT NULL::numeric,
  p_max_price numeric DEFAULT NULL::numeric,
  p_search text DEFAULT NULL::text,
  p_sort text DEFAULT 'name_asc'::text
)
RETURNS TABLE(id uuid, slug text, name text, name_short character varying, price_ht numeric, price_ttc numeric, image_url text, category text, brand text, eco boolean, stock_quantity integer, is_available boolean, badge text, total_count bigint)
LANGUAGE plpgsql STABLE SECURITY DEFINER
AS $function$
DECLARE
  v_total bigint;
  v_has_filter boolean;
  v_where text;
  v_order text;
  v_sql text;
BEGIN
  v_has_filter := (p_category IS NOT NULL OR p_brand IS NOT NULL
                   OR p_min_price IS NOT NULL OR p_max_price IS NOT NULL
                   OR p_search IS NOT NULL);

  CASE p_sort
    WHEN 'price_asc'  THEN v_order := 'price_ttc ASC, name ASC';
    WHEN 'price_desc' THEN v_order := 'price_ttc DESC, name ASC';
    WHEN 'name_desc'  THEN v_order := 'name DESC';
    ELSE                    v_order := 'name ASC';
  END CASE;

  IF NOT v_has_filter THEN
    SELECT COALESCE(c.reltuples, 0)::bigint INTO v_total
    FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE c.relname = 'products' AND n.nspname = 'public';

    RETURN QUERY EXECUTE format(
      'SELECT p.id, p.slug, p.name, p.name_short, p.price_ht,
              p.price_ttc,
              COALESCE(NULLIF(p.image_url, ''''), ''/placeholder-product.svg'') AS image_url,
              p.category, p.brand, p.eco, p.stock_quantity, p.is_available, p.badge,
              %s::bigint AS total_count
       FROM products p
       WHERE p.is_active = true
       ORDER BY %s
       OFFSET %s LIMIT %s',
      v_total, v_order,
      (p_page - 1) * p_per_page, p_per_page
    );

  ELSE
    v_where := 'WHERE p.is_active = true';
    IF p_category IS NOT NULL THEN
      v_where := v_where || format(' AND p.category = %L', p_category);
    END IF;
    IF p_brand IS NOT NULL THEN
      v_where := v_where || format(' AND p.brand = %L', p_brand);
    END IF;
    IF p_min_price IS NOT NULL THEN
      v_where := v_where || format(' AND p.price_ttc >= %s', p_min_price);
    END IF;
    IF p_max_price IS NOT NULL THEN
      v_where := v_where || format(' AND p.price_ttc <= %s', p_max_price);
    END IF;
    IF p_search IS NOT NULL THEN
      v_where := v_where || format(
        ' AND (p.name ILIKE %L OR p.ean ILIKE %L OR p.manufacturer_code ILIKE %L OR p.manufacturer_ref ILIKE %L'
        || ' OR EXISTS (SELECT 1 FROM supplier_offers so WHERE so.product_id = p.id AND so.is_active = true AND so.supplier_product_id ILIKE %L)'
        || ' OR EXISTS (SELECT 1 FROM supplier_catalog_items sci WHERE sci.product_id = p.id AND sci.is_active = true AND sci.supplier_sku ILIKE %L))',
        '%' || p_search || '%', '%' || p_search || '%', '%' || p_search || '%', '%' || p_search || '%',
        '%' || p_search || '%', '%' || p_search || '%'
      );
    END IF;

    EXECUTE format('SELECT count(*) FROM products p %s', v_where) INTO v_total;

    v_sql := format(
      'WITH filtered AS MATERIALIZED (
         SELECT p.id, p.slug, p.name, p.name_short, p.price_ht,
                p.price_ttc,
                COALESCE(NULLIF(p.image_url, ''''), ''/placeholder-product.svg'') AS image_url,
                p.category, p.brand, p.eco, p.stock_quantity, p.is_available, p.badge
         FROM products p %s
       )
       SELECT f.id, f.slug, f.name, f.name_short, f.price_ht, f.price_ttc,
              f.image_url, f.category, f.brand, f.eco, f.stock_quantity, f.is_available, f.badge,
              %s::bigint AS total_count
       FROM filtered f
       ORDER BY %s
       OFFSET %s LIMIT %s',
      v_where, v_total, v_order,
      (p_page - 1) * p_per_page, p_per_page
    );

    RETURN QUERY EXECUTE v_sql;
  END IF;
END;
$function$;


-- 3. search_products : aligner sur price_ttc (plus COALESCE avec public_price_ttc)
CREATE OR REPLACE FUNCTION search_products(query text, lim int DEFAULT 20)
RETURNS TABLE (
  id uuid,
  slug text,
  name text,
  price_ht numeric,
  price_ttc numeric,
  image_url text,
  category text,
  brand text,
  eco boolean,
  stock_quantity int
) AS $$
  SELECT p.id, p.slug, p.name, p.price_ht,
         p.price_ttc,
         p.image_url, p.category, p.brand, p.eco, p.stock_quantity
  FROM products p
  WHERE p.is_active = true
    AND (
      p.name ILIKE '%' || query || '%'
      OR p.ean ILIKE '%' || query || '%'
      OR p.brand ILIKE '%' || query || '%'
      OR p.manufacturer_code ILIKE '%' || query || '%'
      OR p.manufacturer_ref ILIKE '%' || query || '%'
      OR EXISTS (
        SELECT 1 FROM supplier_offers so
        WHERE so.product_id = p.id
          AND so.is_active = true
          AND so.supplier_product_id ILIKE '%' || query || '%'
      )
      OR EXISTS (
        SELECT 1 FROM supplier_catalog_items sci
        WHERE sci.product_id = p.id
          AND sci.is_active = true
          AND sci.supplier_sku ILIKE '%' || query || '%'
      )
    )
  ORDER BY similarity(p.name, query) DESC
  LIMIT lim;
$$ LANGUAGE sql STABLE;
