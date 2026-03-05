-- Harden cron HTTP jobs:
-- - remove hardcoded JWTs
-- - use dynamic project URL
-- - send x-api-secret for Edge Functions protected by requireApiSecret/requireAdminOrApiSecret
--
-- Required Postgres settings (Supabase):
--   app.settings.supabase_url
--   app.settings.service_role_key
--   app.settings.api_cron_secret

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'detect-pricing-opportunities-hourly') THEN
    PERFORM cron.unschedule('detect-pricing-opportunities-hourly');
  END IF;

  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'nightly-rollup-recompute') THEN
    PERFORM cron.unschedule('nightly-rollup-recompute');
  END IF;

  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'sync-liderpapel-sftp-daily') THEN
    PERFORM cron.unschedule('sync-liderpapel-sftp-daily');
  END IF;

  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'sync-liderpapel-sftp-weekly-enrich') THEN
    PERFORM cron.unschedule('sync-liderpapel-sftp-weekly-enrich');
  END IF;

  -- Legacy job from early migration (already removed later in most envs).
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'import-liderpapel-daily') THEN
    PERFORM cron.unschedule('import-liderpapel-daily');
  END IF;
END $$;

SELECT cron.schedule(
  'detect-pricing-opportunities-hourly',
  '0 * * * *',
  $$
  SELECT net.http_post(
    url := current_setting('app.settings.supabase_url') || '/functions/v1/detect-pricing-opportunities',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key'),
      'x-api-secret', current_setting('app.settings.api_cron_secret')
    ),
    body := '{}'::jsonb
  ) AS request_id;
  $$
);

SELECT cron.schedule(
  'nightly-rollup-recompute',
  '30 2 * * *',
  $$
  SELECT net.http_post(
    url := current_setting('app.settings.supabase_url') || '/functions/v1/nightly-rollup',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key'),
      'x-api-secret', current_setting('app.settings.api_cron_secret')
    ),
    body := '{}'::jsonb
  ) AS request_id;
  $$
);

SELECT cron.schedule(
  'sync-liderpapel-sftp-daily',
  '0 0 * * *',
  $$
  SELECT net.http_post(
    url := current_setting('app.settings.supabase_url') || '/functions/v1/sync-liderpapel-sftp',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key'),
      'x-api-secret', current_setting('app.settings.api_cron_secret')
    ),
    body := '{"includeEnrichment": false}'::jsonb
  ) AS request_id;
  $$
);

SELECT cron.schedule(
  'sync-liderpapel-sftp-weekly-enrich',
  '0 1 * * 0',
  $$
  SELECT net.http_post(
    url := current_setting('app.settings.supabase_url') || '/functions/v1/sync-liderpapel-sftp',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key'),
      'x-api-secret', current_setting('app.settings.api_cron_secret')
    ),
    body := '{"includeEnrichment": true}'::jsonb
  ) AS request_id;
  $$
);
