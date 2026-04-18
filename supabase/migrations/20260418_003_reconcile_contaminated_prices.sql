-- Réconciliation unique des lignes `products` contaminées par le RRP concurrent.
-- Les migrations 20260418_001 + 20260418_002 ont arrêté la contamination en
-- amont (import-also, recompute_product_rollups, get_catalog_page,
-- search_products) mais les lignes déjà écrasées en base conservent un `price`
-- divergent de `price_ttc`. Cette migration corrige ces lignes en une passe.
--
-- Garde-fous :
--   - On ne touche que si `price_ttc IS NOT NULL AND price_ttc > 0` (pas de
--     remise à 0 ou écrasement par fallback).
--   - On ne touche que si l'écart dépasse 0.01 € (évite les résidus
--     d'arrondi).
--   - Opération naturellement idempotente : au deuxième run plus aucune
--     ligne ne match le WHERE.
--   - Notice avec le compte de lignes corrigées (visible dans les logs
--     `supabase db push`).

DO $$
DECLARE
  v_count integer := 0;
BEGIN
  WITH updated AS (
    UPDATE public.products
    SET price = price_ttc
    WHERE price_ttc IS NOT NULL
      AND price_ttc > 0
      AND abs(price - price_ttc) > 0.01
    RETURNING 1
  )
  SELECT count(*) INTO v_count FROM updated;

  RAISE NOTICE 'reconcile_contaminated_prices: % ligne(s) corrigée(s) (price synchronisé sur price_ttc)', v_count;
END $$;
