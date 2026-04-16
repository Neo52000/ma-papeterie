-- ============================================================================
-- Migration: Schedule AI-CMO cron jobs
-- Date: 2026-04-16
-- Description: pg_cron schedules for automated AI-CMO monitoring and
--   recommendation generation.
--   - ai-cmo-run: daily at 07:00 UTC (09:00 Paris)
--   - ai-cmo-recommendations: daily at 08:00 UTC (10:00 Paris), after monitoring
-- ============================================================================

-- Ensure pg_cron extension is available
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Grant usage to postgres role (required for Supabase)
GRANT USAGE ON SCHEMA cron TO postgres;

-- ── 1. Daily monitoring run (07:00 UTC) ─────────────────────────────────────
-- Calls the ai-cmo-run Edge Function for all active questions that are due.

SELECT cron.schedule(
  'ai-cmo-daily-monitoring',
  '0 7 * * *',
  $$
  SELECT net.http_post(
    url := current_setting('app.settings.supabase_url') || '/functions/v1/ai-cmo-run',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key')
    ),
    body := '{}'::jsonb
  );
  $$
);

-- ── 2. Daily recommendations generation (08:00 UTC) ─────────────────────────
-- Runs 1 hour after monitoring to ensure fresh data is available.

SELECT cron.schedule(
  'ai-cmo-daily-recommendations',
  '0 8 * * *',
  $$
  SELECT net.http_post(
    url := current_setting('app.settings.supabase_url') || '/functions/v1/ai-cmo-recommendations',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key')
    ),
    body := '{}'::jsonb
  );
  $$
);
