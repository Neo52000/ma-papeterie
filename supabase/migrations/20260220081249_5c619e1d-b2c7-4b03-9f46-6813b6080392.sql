-- Fonction pour trouver les produits par source (remplace le filtre .in() invalide sur JSONB)
CREATE OR REPLACE FUNCTION public.get_products_by_source(
  sources text[],
  p_limit int DEFAULT 200,
  p_offset int DEFAULT 0
)
RETURNS TABLE(
  id uuid,
  ean text,
  cost_price numeric,
  price_ht numeric,
  stock_quantity int,
  attributs jsonb,
  ref_b2b text,
  sku_interne text,
  source_val text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT
    p.id,
    p.ean,
    p.cost_price,
    p.price_ht,
    p.stock_quantity,
    p.attributs,
    p.ref_b2b,
    p.sku_interne,
    (p.attributs->>'source') as source_val
  FROM products p
  WHERE p.attributs->>'source' = ANY(sources)
  ORDER BY p.id
  LIMIT p_limit
  OFFSET p_offset
$$;

-- Fonction pour compter les produits par source
CREATE OR REPLACE FUNCTION public.count_products_by_source(sources text[])
RETURNS bigint
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT COUNT(*) FROM products p WHERE p.attributs->>'source' = ANY(sources)
$$;