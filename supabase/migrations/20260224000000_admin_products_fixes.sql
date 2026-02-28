-- ── Sync product_images.url_originale → products.image_url ───────────────────
-- Met à jour image_url pour tous les produits null/vide ayant une image principale
-- dans product_images (source liderpapel). Appelée depuis le dashboard qualité.
CREATE OR REPLACE FUNCTION public.sync_product_images_to_url()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  updated integer := 0;
BEGIN
  UPDATE public.products p
  SET    image_url = pi.url_originale
  FROM   public.product_images pi
  WHERE  pi.product_id = p.id
    AND  pi.is_principal = true
    AND  pi.source = 'liderpapel'
    AND  (p.image_url IS NULL OR p.image_url = '');
  GET DIAGNOSTICS updated = ROW_COUNT;
  RETURN updated;
END;
$$;

GRANT EXECUTE ON FUNCTION public.sync_product_images_to_url() TO authenticated;

-- ── Normaliser les noms ALL CAPS → Title Case ─────────────────────────────────
-- Utilise INITCAP(LOWER(name)) sur tous les produits dont le nom est entièrement
-- en majuscules (lettres, chiffres, espaces et ponctuation usuelle).
CREATE OR REPLACE FUNCTION public.normalize_product_names()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $func$
DECLARE
  updated integer := 0;
BEGIN
  -- Normalise tous les noms sans aucune lettre minuscule (= entièrement en majuscules)
  UPDATE public.products
  SET    name = INITCAP(LOWER(name))
  WHERE  name !~ '[a-z]'
    AND  LENGTH(name) > 2;
  GET DIAGNOSTICS updated = ROW_COUNT;
  RETURN updated;
END;
$func$;

GRANT EXECUTE ON FUNCTION public.normalize_product_names() TO authenticated;
