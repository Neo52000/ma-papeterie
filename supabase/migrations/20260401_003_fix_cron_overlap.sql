-- ============================================================================
-- Migration: Fix cron job overlap — stagger nightly-rollup to 03:00 UTC
-- Date: 2026-04-01
-- Description: sync-softcarrier-ftp runs at 02:00 and can take 15-30+ min.
--   nightly-rollup was at 02:30, risking overlap and stale data.
--   Move to 03:00 to give a full hour buffer.
-- ============================================================================

SELECT cron.unschedule('nightly-rollup-recompute');

SELECT cron.schedule(
  'nightly-rollup-recompute',
  '0 3 * * *',
  $$
  SELECT
    net.http_post(
      url := 'https://mgojmkzovqgpipybelrr.supabase.co/functions/v1/nightly-rollup',
      headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1nb2pta3pvdnFncGlweWJlbHJyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg3NjY5NTEsImV4cCI6MjA3NDM0Mjk1MX0.o3LbQ2cQYIc18KEzl15Yn-YAeCustLEwwjz94XX4ltM"}'::jsonb,
      body := '{}'::jsonb
    ) AS request_id;
  $$
);
