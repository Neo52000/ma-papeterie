-- Add slug column to products for SEO-friendly URLs
ALTER TABLE products ADD COLUMN IF NOT EXISTS slug TEXT;

-- Generate slugs from product name using unaccent + regexp
-- Requires unaccent extension (usually already enabled)
CREATE EXTENSION IF NOT EXISTS unaccent;

UPDATE products
SET slug = trim(both '-' from regexp_replace(
  lower(unaccent(name)),
  '[^a-z0-9]+', '-', 'g'
))
WHERE slug IS NULL;

-- Handle duplicate slugs by appending a suffix
DO $$
DECLARE
  rec RECORD;
  counter INT;
BEGIN
  FOR rec IN
    SELECT slug, array_agg(id ORDER BY created_at) AS ids
    FROM products
    WHERE slug IS NOT NULL
    GROUP BY slug
    HAVING count(*) > 1
  LOOP
    counter := 1;
    FOR i IN 2..array_length(rec.ids, 1) LOOP
      UPDATE products SET slug = rec.slug || '-' || counter
      WHERE id = rec.ids[i];
      counter := counter + 1;
    END LOOP;
  END LOOP;
END $$;

-- Create unique index on slug
CREATE UNIQUE INDEX IF NOT EXISTS idx_products_slug ON products(slug) WHERE slug IS NOT NULL;
