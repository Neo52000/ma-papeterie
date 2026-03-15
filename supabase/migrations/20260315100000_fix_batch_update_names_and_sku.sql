-- Fix batch_update_product_names to also match auto-generated "brand + ref" names
-- (e.g. "Liderpapel 9752") and populate sku_interne safely (skip duplicates).

-- ─── 1. Update batch_update_product_names ─────────────────────────────────────
CREATE OR REPLACE FUNCTION public.batch_update_product_names(
  p_ids   uuid[],
  p_names text[]
)
RETURNS integer
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  WITH pairs AS (
    SELECT unnest(p_ids) AS id, unnest(p_names) AS new_name
  ),
  upd AS (
    UPDATE products
    SET name = pairs.new_name,
        updated_at = now()
    FROM pairs
    WHERE products.id = pairs.id
      AND (products.name = 'Sans nom'
        OR products.name IS NULL
        OR products.name = ''
        OR products.name LIKE 'Réf. %'
        OR LOWER(products.name) = LOWER(TRIM(COALESCE(products.brand, '') || ' ' || COALESCE(products.attributs->>'ref_comlandi', '')))
        OR LOWER(products.name) = LOWER(TRIM(COALESCE(products.brand, '') || ' ' || COALESCE(products.attributs->>'ref_liderpapel', '')))
        OR LOWER(products.name) = LOWER(TRIM(COALESCE(products.brand, '') || ' ' || COALESCE(products.attributs->>'code_comlandi', '')))
      )
    RETURNING 1
  )
  SELECT count(*)::integer FROM upd;
$$;

-- ─── 2. Populate sku_interne (skip duplicates) ───────────────────────────────
WITH refs AS (
  SELECT id,
    COALESCE(
      NULLIF(TRIM(COALESCE(attributs->>'ref_comlandi', '')), ''),
      NULLIF(TRIM(COALESCE(attributs->>'ref_liderpapel', '')), ''),
      NULLIF(TRIM(COALESCE(attributs->>'code_comlandi', '')), '')
    ) AS ref_val
  FROM products
  WHERE sku_interne IS NULL
),
unique_refs AS (
  SELECT ref_val
  FROM refs
  WHERE ref_val IS NOT NULL
  GROUP BY ref_val
  HAVING count(*) = 1
)
UPDATE products p
SET sku_interne = r.ref_val,
    updated_at = now()
FROM refs r
JOIN unique_refs u ON u.ref_val = r.ref_val
WHERE p.id = r.id
  AND p.sku_interne IS NULL
  AND NOT EXISTS (
    SELECT 1 FROM products p2
    WHERE p2.sku_interne = r.ref_val AND p2.id != p.id
  );
