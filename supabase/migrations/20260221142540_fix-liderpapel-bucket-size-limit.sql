-- Fix: le INSERT ON CONFLICT DO NOTHING précédent n'a pas mis à jour le file_size_limit
-- si le bucket existait déjà avec une limite plus petite.
-- On force la mise à jour à 500 MB.
UPDATE storage.buckets
SET
  file_size_limit   = 524288000,  -- 500 MB
  allowed_mime_types = ARRAY['application/json', 'text/plain', 'application/octet-stream']
WHERE id = 'liderpapel-enrichment';
