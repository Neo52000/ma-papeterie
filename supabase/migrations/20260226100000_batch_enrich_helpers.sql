-- Helpers pour l'enrichissement Liderpapel (process-enrich-file)
--
-- 1. batch_update_product_names : met à jour en une seule requête SQL les noms
--    des produits dont le nom est 'Sans nom', NULL ou vide.
--    Remplace N appels HTTP individuels (qui causaient les timeouts >6 min).
--
-- 2. truncate_product_relations : vide la table product_relations avant chaque
--    re-import pour éviter l'accumulation de doublons.

-- ─── 1. Batch update product names ───────────────────────────────────────────
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
    SET name = pairs.new_name
    FROM pairs
    WHERE products.id = pairs.id
      AND (products.name = 'Sans nom' OR products.name IS NULL OR products.name = '')
    RETURNING 1
  )
  SELECT count(*)::integer FROM upd;
$$;

GRANT EXECUTE ON FUNCTION public.batch_update_product_names(uuid[], text[]) TO authenticated;

-- ─── 2. Truncate product relations ───────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.truncate_product_relations()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$ TRUNCATE TABLE public.product_relations; $$;

GRANT EXECUTE ON FUNCTION public.truncate_product_relations() TO authenticated;
