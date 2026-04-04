-- Schedule daily ALSO SFTP sync at 04:00 UTC
SELECT cron.schedule(
  'sync-also-sftp-daily',
  '0 4 * * *',
  $$
  SELECT net.http_post(
    url := current_setting('supabase.url') || '/functions/v1/sync-also-sftp',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || current_setting('supabase.service_role_key'),
      'Content-Type', 'application/json'
    ),
    body := '{}'::jsonb
  );
  $$
);

-- Add ALSO supplier code if not exists
INSERT INTO suppliers (name, company_name, is_active, country)
SELECT 'ALSO', 'ALSO International', true, 'FR'
WHERE NOT EXISTS (
  SELECT 1 FROM suppliers WHERE name ILIKE '%also%'
);

-- Set supplier code
UPDATE suppliers SET code = 'ALSO' WHERE name ILIKE '%also%' AND code IS NULL;
