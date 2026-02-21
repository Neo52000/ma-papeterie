-- Remplacer le cron no-op (import-liderpapel-daily → fetch-liderpapel-sftp avec body vide)
-- par le nouveau sync-liderpapel-sftp qui se connecte réellement au serveur SFTP.

-- 1. Supprimer l'ancien cron
SELECT cron.unschedule('import-liderpapel-daily');

-- 2. Créer le nouveau cron — tous les jours à minuit (heure serveur UTC)
SELECT cron.schedule(
  'sync-liderpapel-sftp-daily',
  '0 0 * * *',
  $$
  SELECT net.http_post(
    url := 'https://mgojmkzovqgpipybelrr.supabase.co/functions/v1/sync-liderpapel-sftp',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1nb2pta3pvdnFncGlweWJlbHJyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg3NjY5NTEsImV4cCI6MjA3NDM0Mjk1MX0.o3LbQ2cQYIc18KEzl15Yn-YAeCustLEwwjz94XX4ltM"}'::jsonb,
    body := '{"includeEnrichment": false}'::jsonb
  ) AS request_id;
  $$
);

-- 3. Cron hebdomadaire (dimanche 1h du matin) — enrichissement complet
SELECT cron.schedule(
  'sync-liderpapel-sftp-weekly-enrich',
  '0 1 * * 0',
  $$
  SELECT net.http_post(
    url := 'https://mgojmkzovqgpipybelrr.supabase.co/functions/v1/sync-liderpapel-sftp',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1nb2pta3pvdnFncGlweWJlbHJyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg3NjY5NTEsImV4cCI6MjA3NDM0Mjk1MX0.o3LbQ2cQYIc18KEzl15Yn-YAeCustLEwwjz94XX4ltM"}'::jsonb,
    body := '{"includeEnrichment": true}'::jsonb
  ) AS request_id;
  $$
);
