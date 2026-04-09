-- Optimisation recherche : index GiST pour KNN + fonction autocomplete rapide

------------------------------------------------------------------------
-- PART A: Index GiST partiel pour similarity ordering (KNN)
------------------------------------------------------------------------

CREATE INDEX IF NOT EXISTS idx_products_name_active_gist
ON public.products USING gist (name gist_trgm_ops)
WHERE is_active = true;


------------------------------------------------------------------------
-- PART B: Fonction autocomplete rapide (nom seul, pas d'EXISTS)
------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.search_products_autocomplete(query text, lim int DEFAULT 8)
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
    AND p.name ILIKE '%' || query || '%'
  ORDER BY p.name <-> query
  LIMIT lim;
$$;
