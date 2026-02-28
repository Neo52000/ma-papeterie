-- Remplace normalize_product_names() par une version en boucle par lots de 5 000 lignes.
-- Evite le statement_timeout de Supabase (8s) sur les UPDATE massifs.
CREATE OR REPLACE FUNCTION public.normalize_product_names()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET statement_timeout = '0'
AS $func$
DECLARE
  updated      integer := 0;
  batch_count  integer;
BEGIN
  LOOP
    -- Traite 5 000 lignes à la fois (chaque UPDATE termine en < 1s)
    WITH to_update AS (
      SELECT id
      FROM   public.products
      WHERE  name !~ '[a-z]'
        AND  LENGTH(name) > 2
      LIMIT  5000
    )
    UPDATE public.products p
    SET    name = INITCAP(LOWER(p.name))
    FROM   to_update
    WHERE  p.id = to_update.id;

    GET DIAGNOSTICS batch_count = ROW_COUNT;
    updated := updated + batch_count;
    EXIT WHEN batch_count = 0;
  END LOOP;

  RETURN updated;
END;
$func$;

GRANT EXECUTE ON FUNCTION public.normalize_product_names() TO authenticated;
