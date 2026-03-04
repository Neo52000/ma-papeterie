-- Cron quotidien pour sync-softcarrier-ftp — tous les jours à 2h du matin UTC
-- Télécharge les 5 fichiers SoftCarrier (HERSTINFO, PREISLIS, ARTX, TarifsB2B, LAGERBESTAND)
-- depuis le serveur FTP et les importe via import-softcarrier.
--
-- Pré-requis : configurer les secrets Supabase suivants :
--   SOFTCARRIER_FTP_HOST, SOFTCARRIER_FTP_USER, SOFTCARRIER_FTP_PASSWORD
--   SOFTCARRIER_FTP_PATH (optionnel, défaut "/")
--   API_CRON_SECRET (secret partagé pour l'authentification cron)

SELECT cron.schedule(
  'sync-softcarrier-ftp-daily',
  '0 2 * * *',
  $$
  SELECT net.http_post(
    url := 'https://mgojmkzovqgpipybelrr.supabase.co/functions/v1/sync-softcarrier-ftp',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1nb2pta3pvdnFncGlweWJlbHJyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg3NjY5NTEsImV4cCI6MjA3NDM0Mjk1MX0.o3LbQ2cQYIc18KEzl15Yn-YAeCustLEwwjz94XX4ltM"}'::jsonb,
    body := '{}'::jsonb
  ) AS request_id;
  $$
);
