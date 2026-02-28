-- Fix: allow application/gzip in liderpapel-enrichment bucket
-- Files > 20 MB are gzip-compressed before upload (browser CompressionStream),
-- but application/gzip was missing from allowed_mime_types → TUS rejected the upload.

UPDATE storage.buckets
SET allowed_mime_types = ARRAY[
  'application/json',
  'application/gzip',
  'application/octet-stream',
  'text/plain'
]
WHERE id = 'liderpapel-enrichment';
