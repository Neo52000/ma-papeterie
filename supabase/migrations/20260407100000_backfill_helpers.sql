-- ============================================================================
-- Fonctions de backfill pour compléter les données produits manquantes
-- ============================================================================

-- ── 1. Récupérer les prix d'achat depuis les fournisseurs ──────────────────

CREATE OR REPLACE FUNCTION backfill_cost_price_from_suppliers()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  updated_count integer;
BEGIN
  WITH best_price AS (
    SELECT DISTINCT ON (sp.product_id)
      sp.product_id,
      sp.supplier_price
    FROM supplier_products sp
    WHERE sp.supplier_price > 0
      AND sp.product_id IS NOT NULL
    ORDER BY sp.product_id,
             sp.is_preferred DESC NULLS LAST,
             sp.priority_rank ASC NULLS LAST,
             sp.supplier_price ASC
  )
  UPDATE products p
  SET cost_price  = bp.supplier_price,
      updated_at  = now()
  FROM best_price bp
  WHERE p.id = bp.product_id
    AND p.cost_price IS NULL;

  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RETURN updated_count;
END;
$$;

-- ── 2. Récupérer les marques depuis Icecat ou les offres fournisseurs ──────

CREATE OR REPLACE FUNCTION backfill_brand_from_suppliers()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  updated_count integer;
BEGIN
  -- Source 1 : Icecat (le plus fiable)
  UPDATE products p
  SET brand      = COALESCE(
                     NULLIF(TRIM(split_part(p.icecat_title, ' ', 1)), ''),
                     p.brand
                   ),
      updated_at = now()
  WHERE p.brand IS NULL
    AND p.icecat_title IS NOT NULL
    AND TRIM(p.icecat_title) != '';

  -- Source 2 : attributs JSONB (ref fournisseur avec marque)
  UPDATE products p
  SET brand      = TRIM((p.attributs->>'marque')::text),
      updated_at = now()
  WHERE p.brand IS NULL
    AND p.attributs IS NOT NULL
    AND p.attributs->>'marque' IS NOT NULL
    AND TRIM((p.attributs->>'marque')::text) != '';

  -- Source 3 : supplier_offers (champ supplier peut contenir la marque)
  -- On ne l'utilise pas directement car supplier = nom du fournisseur, pas la marque

  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RETURN updated_count;
END;
$$;

-- ── 3. Récupérer le poids depuis les spécifications Icecat ─────────────────

CREATE OR REPLACE FUNCTION backfill_weight_from_icecat()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  updated_count integer;
BEGIN
  -- Cherche dans specifications JSONB : groupes contenant "Weight" ou "Poids"
  -- Structure : { "groupName": [{ "feature": "...", "value": "...", "unit": "..." }] }
  WITH weight_data AS (
    SELECT
      p.id,
      (feat->>'value')::numeric AS weight_val,
      LOWER(COALESCE(feat->>'unit', 'kg')) AS weight_unit
    FROM products p,
         jsonb_each(p.specifications) AS grp(grp_name, features),
         jsonb_array_elements(features) AS feat
    WHERE p.weight_kg IS NULL
      AND p.specifications IS NOT NULL
      AND (
        LOWER(grp_name) LIKE '%weight%'
        OR LOWER(grp_name) LIKE '%poids%'
        OR LOWER(feat->>'feature') LIKE '%weight%'
        OR LOWER(feat->>'feature') LIKE '%poids%'
      )
      AND (feat->>'value') ~ '^\d+\.?\d*$'
    LIMIT 5000
  )
  UPDATE products p
  SET weight_kg  = CASE
                     WHEN wd.weight_unit = 'g' THEN wd.weight_val / 1000.0
                     WHEN wd.weight_unit IN ('kg', '') THEN wd.weight_val
                     ELSE wd.weight_val
                   END,
      updated_at = now()
  FROM weight_data wd
  WHERE p.id = wd.id
    AND p.weight_kg IS NULL;

  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RETURN updated_count;
END;
$$;

-- ── Permissions ────────────────────────────────────────────────────────────

COMMENT ON FUNCTION backfill_cost_price_from_suppliers() IS
  'Remplit cost_price depuis le meilleur prix supplier_products pour les produits sans prix d''achat';

COMMENT ON FUNCTION backfill_brand_from_suppliers() IS
  'Remplit brand depuis icecat_title ou attributs JSONB pour les produits sans marque';

COMMENT ON FUNCTION backfill_weight_from_icecat() IS
  'Remplit weight_kg depuis les spécifications Icecat pour les produits sans poids';
