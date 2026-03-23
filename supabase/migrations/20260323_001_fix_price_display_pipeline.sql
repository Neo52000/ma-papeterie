-- Fix: get_catalog_page reads public_price_ttc instead of price_ttc
-- This ensures the rollup-computed prices are displayed to customers
-- Also: recompute_product_rollups now syncs price_ttc from public_price_ttc

-- 1. Fix get_catalog_page to use COALESCE(public_price_ttc, price_ttc)
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
              COALESCE(p.public_price_ttc, p.price_ttc) AS price_ttc,
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
      v_where := v_where || format(' AND COALESCE(p.public_price_ttc, p.price_ttc) >= %s', p_min_price);
    END IF;
    IF p_max_price IS NOT NULL THEN
      v_where := v_where || format(' AND COALESCE(p.public_price_ttc, p.price_ttc) <= %s', p_max_price);
    END IF;
    IF p_search IS NOT NULL THEN
      v_where := v_where || format(
        ' AND (p.name ILIKE %L OR p.ean = %L OR p.manufacturer_code = %L)',
        '%' || p_search || '%', p_search, p_search
      );
    END IF;

    EXECUTE format('SELECT count(*) FROM products p %s', v_where) INTO v_total;

    v_sql := format(
      'WITH filtered AS MATERIALIZED (
         SELECT p.id, p.slug, p.name, p.name_short, p.price_ht,
                COALESCE(p.public_price_ttc, p.price_ttc) AS price_ttc,
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


-- 2. Fix recompute_product_rollups to also sync price_ttc from public_price_ttc
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
  v_purchase_price numeric := NULL;
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

  SELECT MIN(purchase_price_ht)
  INTO v_purchase_price
  FROM public.supplier_offers
  WHERE product_id = p_product_id AND is_active = true AND purchase_price_ht > 0;

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
    END
  WHERE id = p_product_id;

  RETURN jsonb_build_object(
    'product_id', p_product_id,
    'public_price_ttc', v_public_price,
    'public_price_source', v_price_source,
    'is_available', v_is_available,
    'available_qty_total', v_total_stock,
    'purchase_price_ht', v_purchase_price
  );
END;
$function$;


-- 3. Add cron jobs for Alkor and Comlandi daily imports
-- (Already applied via cron.schedule in DB, this is for migration tracking)
-- Job 13: trigger-alkor-sync-daily at 1:00 AM
-- Job 14: import-comlandi-daily at 1:30 AM
-- Timeline: 0:30 Liderpapel start → 1:00 Alkor → 1:30 Comlandi → 2:00 Softcarrier → 2:30 nightly-rollup → 3:00 exceptions → 5:00 Shopify
