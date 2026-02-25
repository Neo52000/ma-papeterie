-- Améliore normalize_product_names() avec insertion d'espaces aux frontières lettre/chiffre.
-- Exemples : "STYLO300" → "Stylo 300", "500FEUILLES" → "500 Feuilles", "CLASSEUR4ANNEAUX" → "Classeur 4 Anneaux"
-- Préserve les codes courts : "A4", "B5", "3M", "80g" (< 3 lettres ou < 2 chiffres)
-- Traite également les noms déjà en Title Case mais avec espaces manquants.
CREATE OR REPLACE FUNCTION public.normalize_product_names()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET statement_timeout = '0'
AS $func$
DECLARE
  updated     integer := 0;
  batch_count integer;
BEGIN
  LOOP
    WITH candidates AS (
      -- Calcule le nouveau nom pour chaque candidat
      SELECT
        id,
        name,
        TRIM(
          REGEXP_REPLACE(
            REGEXP_REPLACE(
              REGEXP_REPLACE(
                -- Étape 1 : normaliser la casse si ALL CAPS
                CASE
                  WHEN name !~ '[a-z]' AND LENGTH(name) > 2
                  THEN INITCAP(LOWER(name))
                  ELSE name
                END,
                -- Étape 2 : espace entre 3+ lettres et un chiffre ("Stylo300" → "Stylo 300")
                '([[:alpha:]]{3,})([[:digit:]])',
                '\1 \2',
                'g'
              ),
              -- Étape 3 : espace entre 2+ chiffres et 2+ lettres ("500Feuilles" → "500 Feuilles")
              '([[:digit:]]{2,})([[:alpha:]]{2,})',
              '\1 \2',
              'g'
            ),
            -- Étape 4 : supprimer les espaces multiples
            '\s{2,}',
            ' ',
            'g'
          )
        ) AS new_name
      FROM public.products
      WHERE
        -- ALL CAPS à normaliser
        (name !~ '[a-z]' AND LENGTH(name) > 2)
        -- Frontière lettre-chiffre sans espace
        OR name ~ '[[:alpha:]]{3,}[[:digit:]]'
        -- Frontière chiffre-lettre sans espace
        OR name ~ '[[:digit:]]{2,}[[:alpha:]]{2,}'
        -- Espaces multiples consécutifs
        OR name ~ '\s{2,}'
        -- Espaces en début/fin
        OR name != TRIM(name)
    ),
    to_update AS (
      -- Ne garder que les lignes où le nom change réellement
      SELECT id, new_name
      FROM   candidates
      WHERE  name IS DISTINCT FROM new_name
      LIMIT  5000
    )
    UPDATE public.products p
    SET    name = t.new_name
    FROM   to_update t
    WHERE  p.id = t.id;

    GET DIAGNOSTICS batch_count = ROW_COUNT;
    updated := updated + batch_count;
    EXIT WHEN batch_count = 0;
  END LOOP;

  RETURN updated;
END;
$func$;

GRANT EXECUTE ON FUNCTION public.normalize_product_names() TO authenticated;
