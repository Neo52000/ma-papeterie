-- Migration: Fix "Sans nom" duplicate products and re-link supplier data
-- Context: Comlandi import was creating duplicate products instead of linking
-- to existing ones, and overwriting names with "Sans nom".

BEGIN;

-- ═══════════════════════════════════════════════════════════════
-- Step 1: Re-link supplier_offers from "Sans nom" duplicates
--         to the main product (same EAN, has a real name)
-- ═══════════════════════════════════════════════════════════════
WITH duplicates AS (
  SELECT DISTINCT ON (d.id)
    d.id AS dup_id,
    d.ean,
    p.id AS main_id
  FROM products d
  JOIN products p ON p.ean = d.ean AND p.id != d.id
  WHERE d.name = 'Sans nom'
    AND p.name != 'Sans nom'
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
    -- Avoid unique constraint violation: don't re-link if same
    -- (supplier, supplier_product_id) already exists on main product
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
  WHERE d.name = 'Sans nom'
    AND p.name != 'Sans nom'
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
--         (preserve ref_comlandi, ref_alkor, etc.)
-- ═══════════════════════════════════════════════════════════════
WITH duplicates AS (
  SELECT DISTINCT ON (d.id)
    d.id AS dup_id,
    d.ean,
    d.attributs AS dup_attributs,
    p.id AS main_id,
    p.attributs AS main_attributs
  FROM products d
  JOIN products p ON p.ean = d.ean AND p.id != d.id
  WHERE d.name = 'Sans nom'
    AND p.name != 'Sans nom'
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
-- Step 4: Delete orphaned "Sans nom" duplicates
--         (only those whose EAN matches a real product)
-- ═══════════════════════════════════════════════════════════════
DELETE FROM products d
USING products p
WHERE d.name = 'Sans nom'
  AND d.ean IS NOT NULL
  AND d.ean != ''
  AND p.ean = d.ean
  AND p.id != d.id
  AND p.name != 'Sans nom'
  -- Only delete if no remaining supplier_offers/supplier_products reference this dup
  AND NOT EXISTS (SELECT 1 FROM supplier_offers WHERE product_id = d.id)
  AND NOT EXISTS (SELECT 1 FROM supplier_products WHERE product_id = d.id);

-- ═══════════════════════════════════════════════════════════════
-- Step 5: Fix remaining "Sans nom" products (no duplicates)
--         Try to derive a name from attributs or reference
-- ═══════════════════════════════════════════════════════════════
UPDATE products
SET name = COALESCE(
  NULLIF(TRIM(COALESCE(attributs->>'ref_comlandi', '')), ''),
  NULLIF(TRIM(COALESCE(attributs->>'ref_alkor', '')), ''),
  NULLIF(TRIM(COALESCE(attributs->>'ref_softcarrier', '')), ''),
  NULLIF(TRIM(COALESCE(attributs->>'code_comlandi', '')), ''),
  'Réf. ' || COALESCE(ean, id::text)
),
    updated_at = now()
WHERE name = 'Sans nom';

COMMIT;
