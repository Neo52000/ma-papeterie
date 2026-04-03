-- Enrichissement Icecat automatique — quotidien à 04:00 UTC
-- Enrichit jusqu'à 200 produits non traités (avec EAN, sans icecat_enriched_at).
-- S'exécute après nightly-rollup (03:00) et sync-softcarrier-ftp (02:00).
--
-- Pré-requis : configurer les secrets Supabase suivants :
--   ICECAT_API_TOKEN, ICECAT_CONTENT_TOKEN
--   ICECAT_SHOP_NAME (optionnel, défaut "REINE")

-- Suppression idempotente du job s'il existe déjà
SELECT cron.unschedule('icecat-enrich-daily')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'icecat-enrich-daily');

-- Planification quotidienne à 04:00 UTC
SELECT cron.schedule(
  'icecat-enrich-daily',
  '0 4 * * *',
  $$
  SELECT net.http_post(
    url := 'https://mgojmkzovqgpipybelrr.supabase.co/functions/v1/icecat-enrich',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1nb2pta3pvdnFncGlweWJlbHJyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg3NjY5NTEsImV4cCI6MjA3NDM0Mjk1MX0.o3LbQ2cQYIc18KEzl15Yn-YAeCustLEwwjz94XX4ltM"}'::jsonb,
    body := '{"limit": 200}'::jsonb
  ) AS request_id;
  $$
);
