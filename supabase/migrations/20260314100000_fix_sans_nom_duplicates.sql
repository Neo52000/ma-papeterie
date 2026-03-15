-- Migration: Fix "Sans nom" and auto-generated "brand + ref" products
-- Context: Comlandi import was creating products with empty names or
-- auto-generated names like "liderpapel 9752" because Catalog.json often
-- lacks Description. The real names (INT_VTE) are in Descriptions_fr.json
-- processed separately into product_seo table.

BEGIN;

-- ═══════════════════════════════════════════════════════════════
-- Helper: define what constitutes an "auto-generated" name that
-- should be overwritten by the real commercial name (INT_VTE).
-- A name is auto-generated if it is:
--   - 'Sans nom', NULL, empty
--   - Starts with 'Réf. '
--   - Equals brand + supplier reference (e.g. "liderpapel 9752")
-- ═══════════════════════════════════════════════════════════════

-- ═══════════════════════════════════════════════════════════════
-- Step 1: Re-link supplier_offers from duplicate products
--         to the main product (same EAN, has a real name)
-- ═══════════════════════════════════════════════════════════════
WITH duplicates AS (
  SELECT DISTINCT ON (d.id)
    d.id AS dup_id,
    d.ean,
    p.id AS main_id
  FROM products d
  JOIN products p ON p.ean = d.ean AND p.id != d.id
  WHERE (
      d.name = 'Sans nom' OR d.name IS NULL OR d.name = '' OR d.name LIKE 'Réf. %'
      OR LOWER(d.name) = LOWER(TRIM(COALESCE(d.brand, '') || ' ' || COALESCE(d.attributs->>'ref_comlandi', '')))
      OR LOWER(d.name) = LOWER(TRIM(COALESCE(d.brand, '') || ' ' || COALESCE(d.attributs->>'ref_liderpapel', '')))
      OR LOWER(d.name) = LOWER(TRIM(COALESCE(d.brand, '') || ' ' || COALESCE(d.attributs->>'code_comlandi', '')))
    )
    AND p.name != 'Sans nom'
    AND p.name NOT LIKE 'Réf. %'
    AND p.name IS NOT NULL
    AND p.name != ''
    AND LOWER(p.name) != LOWER(TRIM(COALESCE(p.brand, '') || ' ' || COALESCE(p.attributs->>'ref_comlandi', '')))
    AND LOWER(p.name) != LOWER(TRIM(COALESCE(p.brand, '') || ' ' || COALESCE(p.attributs->>'ref_liderpapel', '')))
    AND d.ean IS NOT NULL
    AND d.ean != ''
  ORDER BY d.id, p.updated_at DESC
)
UPDATE supplier_offers so
SET product_id = d.main_id,
    updated_at = now()
FROM duplicates d
WHERE so.product_id = d.dup_id
  AND NOT EXISTS (
    SELECT 1 FROM supplier_offers so2
    WHERE so2.supplier = so.supplier
      AND so2.supplier_product_id = so.supplier_product_id
      AND so2.product_id = d.main_id
  );

-- ═══════════════════════════════════════════════════════════════
-- Step 2: Re-link supplier_products from duplicates to main
-- ═══════════════════════════════════════════════════════════════
WITH duplicates AS (
  SELECT DISTINCT ON (d.id)
    d.id AS dup_id,
    d.ean,
    p.id AS main_id
  FROM products d
  JOIN products p ON p.ean = d.ean AND p.id != d.id
  WHERE (
      d.name = 'Sans nom' OR d.name IS NULL OR d.name = '' OR d.name LIKE 'Réf. %'
      OR LOWER(d.name) = LOWER(TRIM(COALESCE(d.brand, '') || ' ' || COALESCE(d.attributs->>'ref_comlandi', '')))
      OR LOWER(d.name) = LOWER(TRIM(COALESCE(d.brand, '') || ' ' || COALESCE(d.attributs->>'ref_liderpapel', '')))
      OR LOWER(d.name) = LOWER(TRIM(COALESCE(d.brand, '') || ' ' || COALESCE(d.attributs->>'code_comlandi', '')))
    )
    AND p.name != 'Sans nom'
    AND p.name NOT LIKE 'Réf. %'
    AND p.name IS NOT NULL
    AND p.name != ''
    AND LOWER(p.name) != LOWER(TRIM(COALESCE(p.brand, '') || ' ' || COALESCE(p.attributs->>'ref_comlandi', '')))
    AND LOWER(p.name) != LOWER(TRIM(COALESCE(p.brand, '') || ' ' || COALESCE(p.attributs->>'ref_liderpapel', '')))
    AND d.ean IS NOT NULL
    AND d.ean != ''
  ORDER BY d.id, p.updated_at DESC
)
UPDATE supplier_products sp
SET product_id = d.main_id,
    updated_at = now()
FROM duplicates d
WHERE sp.product_id = d.dup_id
  AND NOT EXISTS (
    SELECT 1 FROM supplier_products sp2
    WHERE sp2.supplier_id = sp.supplier_id
      AND sp2.product_id = d.main_id
  );

-- ═══════════════════════════════════════════════════════════════
-- Step 3: Merge attributs from duplicates into main products
-- ═══════════════════════════════════════════════════════════════
WITH duplicates AS (
  SELECT DISTINCT ON (d.id)
    d.id AS dup_id,
    d.ean,
    d.attributs AS dup_attributs,
    p.id AS main_id
  FROM products d
  JOIN products p ON p.ean = d.ean AND p.id != d.id
  WHERE (
      d.name = 'Sans nom' OR d.name IS NULL OR d.name = '' OR d.name LIKE 'Réf. %'
      OR LOWER(d.name) = LOWER(TRIM(COALESCE(d.brand, '') || ' ' || COALESCE(d.attributs->>'ref_comlandi', '')))
      OR LOWER(d.name) = LOWER(TRIM(COALESCE(d.brand, '') || ' ' || COALESCE(d.attributs->>'ref_liderpapel', '')))
      OR LOWER(d.name) = LOWER(TRIM(COALESCE(d.brand, '') || ' ' || COALESCE(d.attributs->>'code_comlandi', '')))
    )
    AND p.name != 'Sans nom'
    AND p.name NOT LIKE 'Réf. %'
    AND p.name IS NOT NULL
    AND p.name != ''
    AND d.ean IS NOT NULL
    AND d.ean != ''
    AND d.attributs IS NOT NULL
  ORDER BY d.id, p.updated_at DESC
)
UPDATE products p
SET attributs = COALESCE(p.attributs, '{}'::jsonb) || d.dup_attributs,
    updated_at = now()
FROM duplicates d
WHERE p.id = d.main_id;

-- ═══════════════════════════════════════════════════════════════
-- Step 4: Delete orphaned duplicates with auto-generated names
-- ═══════════════════════════════════════════════════════════════
DELETE FROM products d
USING products p
WHERE (
    d.name = 'Sans nom' OR d.name IS NULL OR d.name = '' OR d.name LIKE 'Réf. %'
    OR LOWER(d.name) = LOWER(TRIM(COALESCE(d.brand, '') || ' ' || COALESCE(d.attributs->>'ref_comlandi', '')))
    OR LOWER(d.name) = LOWER(TRIM(COALESCE(d.brand, '') || ' ' || COALESCE(d.attributs->>'ref_liderpapel', '')))
    OR LOWER(d.name) = LOWER(TRIM(COALESCE(d.brand, '') || ' ' || COALESCE(d.attributs->>'code_comlandi', '')))
  )
  AND d.ean IS NOT NULL
  AND d.ean != ''
  AND p.ean = d.ean
  AND p.id != d.id
  AND p.name != 'Sans nom'
  AND p.name NOT LIKE 'Réf. %'
  AND p.name IS NOT NULL
  AND p.name != ''
  AND NOT EXISTS (SELECT 1 FROM supplier_offers WHERE product_id = d.id)
  AND NOT EXISTS (SELECT 1 FROM supplier_products WHERE product_id = d.id);

-- ═══════════════════════════════════════════════════════════════
-- Step 5: Fix products using product_seo.meta_title
--         (INT_VTE = Intitulé de Vente = the real commercial name)
--         Now also fixes auto-generated "brand + ref" names
-- ═══════════════════════════════════════════════════════════════
UPDATE products p
SET name = TRIM(seo.meta_title),
    updated_at = now()
FROM product_seo seo
WHERE seo.product_id = p.id
  AND (
    p.name = 'Sans nom' OR p.name IS NULL OR p.name = '' OR p.name LIKE 'Réf. %'
    OR LOWER(p.name) = LOWER(TRIM(COALESCE(p.brand, '') || ' ' || COALESCE(p.attributs->>'ref_comlandi', '')))
    OR LOWER(p.name) = LOWER(TRIM(COALESCE(p.brand, '') || ' ' || COALESCE(p.attributs->>'ref_liderpapel', '')))
    OR LOWER(p.name) = LOWER(TRIM(COALESCE(p.brand, '') || ' ' || COALESCE(p.attributs->>'code_comlandi', '')))
  )
  AND seo.meta_title IS NOT NULL
  AND TRIM(seo.meta_title) != '';

-- ═══════════════════════════════════════════════════════════════
-- Step 6: Fix remaining using product_seo.description_courte
--         (MINI_DESC = short description, often a good name)
-- ═══════════════════════════════════════════════════════════════
UPDATE products p
SET name = TRIM(seo.description_courte),
    updated_at = now()
FROM product_seo seo
WHERE seo.product_id = p.id
  AND (
    p.name = 'Sans nom' OR p.name IS NULL OR p.name = '' OR p.name LIKE 'Réf. %'
    OR LOWER(p.name) = LOWER(TRIM(COALESCE(p.brand, '') || ' ' || COALESCE(p.attributs->>'ref_comlandi', '')))
    OR LOWER(p.name) = LOWER(TRIM(COALESCE(p.brand, '') || ' ' || COALESCE(p.attributs->>'ref_liderpapel', '')))
    OR LOWER(p.name) = LOWER(TRIM(COALESCE(p.brand, '') || ' ' || COALESCE(p.attributs->>'code_comlandi', '')))
  )
  AND seo.description_courte IS NOT NULL
  AND TRIM(seo.description_courte) != '';

-- ═══════════════════════════════════════════════════════════════
-- Step 7: Fix remaining using brand + reference from attributs
--         (last resort for products with no SEO data at all)
-- ═══════════════════════════════════════════════════════════════
UPDATE products
SET name = CASE
    WHEN brand IS NOT NULL AND brand != '' AND ean IS NOT NULL
      THEN brand || ' ' || COALESCE(
        NULLIF(TRIM(COALESCE(attributs->>'ref_comlandi', '')), ''),
        NULLIF(TRIM(COALESCE(attributs->>'ref_liderpapel', '')), ''),
        NULLIF(TRIM(COALESCE(attributs->>'ref_alkor', '')), ''),
        NULLIF(TRIM(COALESCE(attributs->>'ref_softcarrier', '')), ''),
        ean
      )
    ELSE COALESCE(
      NULLIF(TRIM(COALESCE(attributs->>'ref_comlandi', '')), ''),
      NULLIF(TRIM(COALESCE(attributs->>'ref_liderpapel', '')), ''),
      NULLIF(TRIM(COALESCE(attributs->>'ref_alkor', '')), ''),
      NULLIF(TRIM(COALESCE(attributs->>'ref_softcarrier', '')), ''),
      NULLIF(TRIM(COALESCE(attributs->>'code_comlandi', '')), ''),
      'Réf. ' || COALESCE(ean, id::text)
    )
  END,
    updated_at = now()
WHERE name = 'Sans nom' OR name IS NULL OR name = '';

-- ═══════════════════════════════════════════════════════════════
-- Step 8: Update batch_update_product_names to also fix
--         auto-generated "brand + ref" names
-- ═══════════════════════════════════════════════════════════════
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
        -- Also match auto-generated "brand + ref" names (e.g. "liderpapel 9752")
        OR LOWER(products.name) = LOWER(TRIM(COALESCE(products.brand, '') || ' ' || COALESCE(products.attributs->>'ref_comlandi', '')))
        OR LOWER(products.name) = LOWER(TRIM(COALESCE(products.brand, '') || ' ' || COALESCE(products.attributs->>'ref_liderpapel', '')))
        OR LOWER(products.name) = LOWER(TRIM(COALESCE(products.brand, '') || ' ' || COALESCE(products.attributs->>'code_comlandi', '')))
      )
    RETURNING 1
  )
  SELECT count(*)::integer FROM upd;
$$;

COMMIT;
