-- ============================================================================
-- Fix images Comlandi : cron quotidien + matching EAN + propagation images
-- ============================================================================

-- ── Fix 2 : Passer le cron quotidien a includeEnrichment: true ─────────────
-- L'enrichissement (MultimediaLinks, Descriptions, Relations) doit tourner
-- chaque nuit et non plus seulement le dimanche.

SELECT cron.unschedule('sync-liderpapel-sftp-daily');

SELECT cron.schedule(
  'sync-liderpapel-sftp-daily',
  '0 0 * * *',
  $$
  SELECT net.http_post(
    url := 'https://mgojmkzovqgpipybelrr.supabase.co/functions/v1/sync-liderpapel-sftp',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1nb2pta3pvdnFncGlweWJlbHJyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg3NjY5NTEsImV4cCI6MjA3NDM0Mjk1MX0.o3LbQ2cQYIc18KEzl15Yn-YAeCustLEwwjz94XX4ltM"}'::jsonb,
    body := '{"includeEnrichment": true}'::jsonb
  ) AS request_id;
  $$
);

-- Supprimer le cron hebdomadaire devenu redondant
SELECT cron.unschedule('sync-liderpapel-sftp-weekly-enrich');


-- ── Fix 3 : Ameliorer find_products_by_refs avec cross-reference EAN ───────
-- Ajoute un 4e niveau de matching : quand un ID Liderpapel match un produit
-- qui a un EAN, on cherche tous les autres produits avec ce meme EAN.
-- Cela permet aux produits Comlandi (qui n'ont que ref_comlandi) de recevoir
-- les images MultimediaLinks via leur EAN commun.

CREATE OR REPLACE FUNCTION public.find_products_by_refs(refs text[])
RETURNS TABLE(product_id uuid, matched_ref text)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  -- Niveau 1 : match direct par ref_liderpapel
  SELECT p.id, p.attributs->>'ref_liderpapel'
  FROM products p
  WHERE p.attributs->>'ref_liderpapel' = ANY(refs)
    AND p.attributs->>'ref_liderpapel' IS NOT NULL

  UNION ALL

  -- Niveau 2 : match direct par ref_comlandi
  SELECT p.id, p.attributs->>'ref_comlandi'
  FROM products p
  WHERE p.attributs->>'ref_comlandi' = ANY(refs)
    AND p.attributs->>'ref_comlandi' IS NOT NULL
    AND NOT (p.attributs->>'ref_liderpapel' = ANY(refs))

  UNION ALL

  -- Niveau 3 : match direct par EAN
  SELECT p.id, p.ean
  FROM products p
  WHERE p.ean = ANY(refs)
    AND p.ean IS NOT NULL
    AND NOT (p.attributs->>'ref_liderpapel' = ANY(refs))
    AND NOT (p.attributs->>'ref_comlandi' = ANY(refs))

  UNION ALL

  -- Niveau 4 (NOUVEAU) : cross-reference EAN indirect
  -- Ref Liderpapel → produit Liderpapel → son EAN → autres produits avec meme EAN
  -- Permet aux produits Comlandi de recevoir les images via EAN commun
  SELECT DISTINCT p2.id, p1.attributs->>'ref_liderpapel'
  FROM products p1
  JOIN products p2 ON p2.ean = p1.ean AND p2.id != p1.id
  WHERE p1.attributs->>'ref_liderpapel' = ANY(refs)
    AND p1.ean IS NOT NULL
    AND p2.ean IS NOT NULL
    -- Exclure les produits deja matches par les niveaux precedents
    AND NOT (p2.attributs->>'ref_liderpapel' = ANY(refs))
    AND NOT (p2.attributs->>'ref_comlandi' = ANY(refs))
    AND NOT (p2.ean = ANY(refs))
$$;


-- ── Fix 4 : Fonction propagate_images_by_ean() ────────────────────────────
-- Action ponctuelle : propage les images existantes aux produits partageant
-- le meme EAN. Utile pour les produits Comlandi deja en base qui n'ont pas
-- encore recu d'image malgre un EAN commun avec un produit enrichi.

CREATE OR REPLACE FUNCTION public.propagate_images_by_ean()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  updated_count integer;
BEGIN
  UPDATE products target
  SET image_url  = source.image_url,
      updated_at = now()
  FROM products source
  WHERE source.ean = target.ean
    AND source.ean IS NOT NULL
    AND source.image_url IS NOT NULL
    AND (target.image_url IS NULL OR target.image_url = '')
    AND source.id != target.id;

  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RETURN updated_count;
END;
$$;

COMMENT ON FUNCTION public.propagate_images_by_ean() IS
  'Propage les images aux produits partageant le meme EAN (utile pour les produits Comlandi sans image)';
