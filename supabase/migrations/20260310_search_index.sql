-- Full-text search with pg_trgm for product autocomplete
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Trigram index on product name for fuzzy matching
CREATE INDEX IF NOT EXISTS idx_products_name_trgm
  ON products USING gin (name gin_trgm_ops);

-- RPC function for autocomplete search
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
  SELECT p.id, p.slug, p.name, p.price_ht, p.price_ttc, p.image_url,
         p.category, p.brand, p.eco, p.stock_quantity
  FROM products p
  WHERE p.is_active = true
    AND (
      p.name ILIKE '%' || query || '%'
      OR p.ean ILIKE '%' || query || '%'
      OR p.brand ILIKE '%' || query || '%'
    )
  ORDER BY similarity(p.name, query) DESC
  LIMIT lim;
$$ LANGUAGE sql STABLE;
