-- GIN trigram indexes for substring ILIKE search on products
-- pg_trgm extension already enabled in 20260310_search_index.sql

-- Trigram index on EAN for fuzzy/substring matching
CREATE INDEX IF NOT EXISTS idx_products_ean_trgm
  ON products USING gin (ean gin_trgm_ops);

-- Trigram index on manufacturer_code for fuzzy/substring matching
CREATE INDEX IF NOT EXISTS idx_products_manufacturer_code_trgm
  ON products USING gin (manufacturer_code gin_trgm_ops);

-- Trigram index on brand for fuzzy/substring matching
CREATE INDEX IF NOT EXISTS idx_products_brand_trgm
  ON products USING gin (brand gin_trgm_ops);

-- Update search_products RPC to also search manufacturer_code
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
      OR p.manufacturer_code ILIKE '%' || query || '%'
    )
  ORDER BY similarity(p.name, query) DESC
  LIMIT lim;
$$ LANGUAGE sql STABLE;
