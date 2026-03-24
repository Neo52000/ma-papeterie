-- Fix product search: ILIKE instead of exact match on EAN/manufacturer_code
-- Add indices on EAN and manufacturer_code for performance

-- 1. Indices for search performance
CREATE INDEX IF NOT EXISTS idx_products_ean ON products (ean);
CREATE INDEX IF NOT EXISTS idx_products_manufacturer_code ON products (manufacturer_code);
CREATE INDEX IF NOT EXISTS idx_products_ean_trgm ON products USING gin (ean gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_products_mfr_code_trgm ON products USING gin (manufacturer_code gin_trgm_ops);

-- 2. Fix search_products RPC: add manufacturer_code to search fields
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
         COALESCE(p.public_price_ttc, p.price_ttc) AS price_ttc,
         p.image_url, p.category, p.brand, p.eco, p.stock_quantity
  FROM products p
  WHERE p.is_active = true
    AND (
      p.name ILIKE '%' || query || '%'
      OR p.ean ILIKE '%' || query || '%'
      OR p.brand ILIKE '%' || query || '%'
      OR p.manufacturer_code ILIKE '%' || query || '%'
    )
  ORDER BY similarity(p.name, query) DESC
  LIMIT lim;
$$ LANGUAGE sql STABLE;

-- 3. Fix get_catalog_page: ILIKE for ean/manufacturer_code instead of exact match
-- Also add price fallback: COALESCE(public_price_ttc, price_ttc, price)
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
              COALESCE(p.public_price_ttc, p.price_ttc, p.price) AS price_ttc,
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
      v_where := v_where || format(' AND COALESCE(p.public_price_ttc, p.price_ttc, p.price) >= %s', p_min_price);
    END IF;
    IF p_max_price IS NOT NULL THEN
      v_where := v_where || format(' AND COALESCE(p.public_price_ttc, p.price_ttc, p.price) <= %s', p_max_price);
    END IF;
    IF p_search IS NOT NULL THEN
      v_where := v_where || format(
        ' AND (p.name ILIKE %L OR p.ean ILIKE %L OR p.manufacturer_code ILIKE %L)',
        '%' || p_search || '%', '%' || p_search || '%', '%' || p_search || '%'
      );
    END IF;

    EXECUTE format('SELECT count(*) FROM products p %s', v_where) INTO v_total;

    v_sql := format(
      'WITH filtered AS MATERIALIZED (
         SELECT p.id, p.slug, p.name, p.name_short, p.price_ht,
                COALESCE(p.public_price_ttc, p.price_ttc, p.price) AS price_ttc,
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
