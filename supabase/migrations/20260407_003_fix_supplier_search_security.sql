-- Fix: search_products RPC missing SECURITY DEFINER
-- The supplier_offers table has admin-only RLS, so the EXISTS subquery
-- in search_products always returned false for anonymous front-office users,
-- making products only findable by supplier reference invisible in search.
--
-- Also creates match_supplier_refs() for the Catalogue.tsx fallback.

------------------------------------------------------------------------
-- PART A: Recreate search_products with SECURITY DEFINER
------------------------------------------------------------------------

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
)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
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
      OR p.manufacturer_ref ILIKE '%' || query || '%'
      OR EXISTS (
        SELECT 1 FROM supplier_offers so
        WHERE so.product_id = p.id
          AND so.supplier_product_id ILIKE '%' || query || '%'
      )
      OR EXISTS (
        SELECT 1 FROM supplier_catalog_items sci
        WHERE sci.product_id = p.id
          AND sci.supplier_sku ILIKE '%' || query || '%'
      )
    )
  ORDER BY similarity(p.name, query) DESC
  LIMIT lim;
$$;


------------------------------------------------------------------------
-- PART B: New RPC for Catalogue.tsx supplier reference fallback
------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION match_supplier_refs(query text)
RETURNS TABLE (product_id uuid)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT DISTINCT so.product_id
  FROM supplier_offers so
  WHERE so.supplier_product_id ILIKE '%' || query || '%'
    AND so.product_id IS NOT NULL
  UNION
  SELECT DISTINCT sci.product_id
  FROM supplier_catalog_items sci
  WHERE sci.supplier_sku ILIKE '%' || query || '%'
    AND sci.product_id IS NOT NULL;
$$;
