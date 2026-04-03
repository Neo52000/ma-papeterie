-- Migration: Merge duplicate products sharing the same EAN
-- Context: Front office shows multiple articles for the same EAN (e.g. 4046719105472)
-- The previous dedup migration (20260314) only handled auto-generated names.
-- This migration handles ALL EAN duplicates regardless of name quality.

BEGIN;

-- ═══════════════════════════════════════════════════════════════
-- Step 0: Identify the "main" product for each duplicate EAN.
-- Priority: real name > has image > most supplier offers > most recent
-- The "duplicate" products will be deactivated.
-- ═══════════════════════════════════════════════════════════════

CREATE TEMP TABLE ean_duplicates AS
WITH ranked AS (
  SELECT
    p.id,
    p.ean,
    p.name,
    p.is_active,
    ROW_NUMBER() OVER (
      PARTITION BY p.ean
      ORDER BY
        -- Prefer products with real commercial names
        CASE WHEN p.name IS NOT NULL
              AND p.name != ''
              AND p.name != 'Sans nom'
              AND p.name NOT LIKE 'Réf. %'
             THEN 0 ELSE 1 END ASC,
        -- Prefer products with images
        CASE WHEN p.image_url IS NOT NULL AND p.image_url != '' THEN 0 ELSE 1 END ASC,
        -- Prefer products with more supplier offers
        (SELECT COUNT(*) FROM supplier_offers so WHERE so.product_id = p.id) DESC,
        (SELECT COUNT(*) FROM supplier_catalog_items sci WHERE sci.product_id = p.id) DESC,
        -- Prefer most recently updated
        p.updated_at DESC NULLS LAST,
        p.created_at DESC NULLS LAST
    ) AS rn
  FROM products p
  WHERE p.ean IS NOT NULL
    AND p.ean != ''
    AND p.ean IN (
      SELECT ean FROM products
      WHERE ean IS NOT NULL AND ean != ''
      GROUP BY ean HAVING COUNT(*) > 1
    )
)
SELECT
  r.id AS dup_id,
  r.ean,
  r.name AS dup_name,
  (SELECT id FROM ranked r2 WHERE r2.ean = r.ean AND r2.rn = 1) AS main_id
FROM ranked r
WHERE r.rn > 1;

-- Log what we're about to merge
DO $$
DECLARE
  _count integer;
BEGIN
  SELECT COUNT(*) INTO _count FROM ean_duplicates;
  RAISE NOTICE 'EAN duplicates found: % products to merge', _count;
END $$;

-- ═══════════════════════════════════════════════════════════════
-- Step 1: Re-link supplier_offers from duplicates to main
-- ═══════════════════════════════════════════════════════════════
UPDATE supplier_offers so
SET product_id = d.main_id,
    updated_at = now()
FROM ean_duplicates d
WHERE so.product_id = d.dup_id
  AND NOT EXISTS (
    SELECT 1 FROM supplier_offers so2
    WHERE so2.supplier = so.supplier
      AND so2.supplier_product_id = so.supplier_product_id
      AND so2.product_id = d.main_id
  );

-- Delete remaining supplier_offers that couldn't be re-linked (conflicts)
DELETE FROM supplier_offers so
USING ean_duplicates d
WHERE so.product_id = d.dup_id;

-- ═══════════════════════════════════════════════════════════════
-- Step 2: Re-link supplier_products from duplicates to main
-- ═══════════════════════════════════════════════════════════════
UPDATE supplier_products sp
SET product_id = d.main_id,
    updated_at = now()
FROM ean_duplicates d
WHERE sp.product_id = d.dup_id
  AND NOT EXISTS (
    SELECT 1 FROM supplier_products sp2
    WHERE sp2.supplier_id = sp.supplier_id
      AND sp2.product_id = d.main_id
  );

DELETE FROM supplier_products sp
USING ean_duplicates d
WHERE sp.product_id = d.dup_id;

-- ═══════════════════════════════════════════════════════════════
-- Step 3: Re-link supplier_catalog_items from duplicates to main
-- ═══════════════════════════════════════════════════════════════
UPDATE supplier_catalog_items sci
SET product_id = d.main_id,
    updated_at = now()
FROM ean_duplicates d
WHERE sci.product_id = d.dup_id
  AND NOT EXISTS (
    SELECT 1 FROM supplier_catalog_items sci2
    WHERE sci2.supplier_id = sci.supplier_id
      AND sci2.supplier_sku = sci.supplier_sku
      AND sci2.product_id = d.main_id
  );

UPDATE supplier_catalog_items sci
SET product_id = NULL
FROM ean_duplicates d
WHERE sci.product_id = d.dup_id;

-- ═══════════════════════════════════════════════════════════════
-- Step 4: Re-link order_items (preserve order history)
-- ═══════════════════════════════════════════════════════════════
UPDATE order_items oi
SET product_id = d.main_id
FROM ean_duplicates d
WHERE oi.product_id = d.dup_id;

-- ═══════════════════════════════════════════════════════════════
-- Step 5: Re-link purchase_order_items
-- ═══════════════════════════════════════════════════════════════
UPDATE purchase_order_items poi
SET product_id = d.main_id
FROM ean_duplicates d
WHERE poi.product_id = d.dup_id;

-- ═══════════════════════════════════════════════════════════════
-- Step 6: Handle product_seo (UNIQUE constraint on product_id)
-- Keep main's SEO record, delete duplicate's if main already has one
-- ═══════════════════════════════════════════════════════════════
DELETE FROM product_seo ps
USING ean_duplicates d
WHERE ps.product_id = d.dup_id
  AND EXISTS (SELECT 1 FROM product_seo ps2 WHERE ps2.product_id = d.main_id);

UPDATE product_seo ps
SET product_id = d.main_id
FROM ean_duplicates d
WHERE ps.product_id = d.dup_id;

-- ═══════════════════════════════════════════════════════════════
-- Step 7: Re-link product_images (merge all images to main)
-- ═══════════════════════════════════════════════════════════════
UPDATE product_images pi
SET product_id = d.main_id
FROM ean_duplicates d
WHERE pi.product_id = d.dup_id
  AND NOT EXISTS (
    SELECT 1 FROM product_images pi2
    WHERE pi2.product_id = d.main_id
      AND pi2.image_url = pi.image_url
  );

DELETE FROM product_images pi
USING ean_duplicates d
WHERE pi.product_id = d.dup_id;

-- ═══════════════════════════════════════════════════════════════
-- Step 8: Merge attributs from duplicates into main
-- ═══════════════════════════════════════════════════════════════
UPDATE products p
SET attributs = COALESCE(p.attributs, '{}'::jsonb) || COALESCE(d_prod.attributs, '{}'::jsonb),
    updated_at = now()
FROM ean_duplicates d
JOIN products d_prod ON d_prod.id = d.dup_id
WHERE p.id = d.main_id
  AND d_prod.attributs IS NOT NULL
  AND d_prod.attributs != '{}'::jsonb;

-- ═══════════════════════════════════════════════════════════════
-- Step 9: Deactivate duplicates and clear their EAN
-- ═══════════════════════════════════════════════════════════════
UPDATE products p
SET is_active = false,
    ean = NULL,
    updated_at = now()
FROM ean_duplicates d
WHERE p.id = d.dup_id;

-- ═══════════════════════════════════════════════════════════════
-- Step 10: Ensure UNIQUE index on EAN exists
-- ═══════════════════════════════════════════════════════════════
CREATE UNIQUE INDEX IF NOT EXISTS idx_products_ean_unique
ON products (ean) WHERE ean IS NOT NULL AND ean != '';

-- ═══════════════════════════════════════════════════════════════
-- Step 11: Trigger to prevent future EAN duplicates on INSERT/UPDATE
-- More robust than the index alone (handles edge cases)
-- ═══════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION prevent_duplicate_ean()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.ean IS NOT NULL AND NEW.ean != '' THEN
    IF EXISTS (
      SELECT 1 FROM products
      WHERE ean = NEW.ean
        AND id != NEW.id
        AND is_active = true
    ) THEN
      RAISE EXCEPTION 'Un produit actif avec l''EAN % existe déjà (id: %)',
        NEW.ean,
        (SELECT id FROM products WHERE ean = NEW.ean AND id != NEW.id AND is_active = true LIMIT 1);
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_prevent_duplicate_ean ON products;
CREATE TRIGGER trg_prevent_duplicate_ean
  BEFORE INSERT OR UPDATE OF ean ON products
  FOR EACH ROW
  EXECUTE FUNCTION prevent_duplicate_ean();

DROP TABLE IF EXISTS ean_duplicates;

COMMIT;
