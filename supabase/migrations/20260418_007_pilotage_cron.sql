-- =============================================================================
-- Module Pilotage — Scheduling pg_cron
-- Date : 2026-04-18
--
-- Prérequis :
--   - Extensions pg_cron et pg_net activées
--   - Settings Supabase configurés :
--     ALTER DATABASE postgres SET app.settings.supabase_url = 'https://xxx.supabase.co';
--     ALTER DATABASE postgres SET app.settings.service_role_key = 'eyJ...';
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Job 1 : Compute KPI snapshot (tous les jours à 23h30, Paris = 21h30 UTC)
-- Décalé par rapport aux syncs fournisseurs (00h30) pour avoir les data propres
-- -----------------------------------------------------------------------------

SELECT cron.unschedule('pilotage-compute-kpi-snapshot') WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'pilotage-compute-kpi-snapshot'
);

SELECT cron.schedule(
  'pilotage-compute-kpi-snapshot',
  '30 21 * * *',  -- 23h30 Paris (UTC+2 en été, adapter sinon)
  $$
  SELECT net.http_post(
    url := current_setting('app.settings.supabase_url') || '/functions/v1/pilotage-compute-kpi-snapshot',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key')
    ),
    body := jsonb_build_object('target_date', CURRENT_DATE::TEXT)
  );
  $$
);

-- -----------------------------------------------------------------------------
-- Job 2 : Refresh vues matérialisées (tous les jours à 23h45)
-- -----------------------------------------------------------------------------

SELECT cron.unschedule('pilotage-refresh-materialized-views') WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'pilotage-refresh-materialized-views'
);

SELECT cron.schedule(
  'pilotage-refresh-materialized-views',
  '45 21 * * *',  -- 23h45 Paris
  $$
  SELECT refresh_pilotage_materialized_views();
  $$
);

-- -----------------------------------------------------------------------------
-- Job 3 : Détection alertes (tous les jours à 00h00 Paris)
-- -----------------------------------------------------------------------------

SELECT cron.unschedule('pilotage-detect-alerts') WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'pilotage-detect-alerts'
);

SELECT cron.schedule(
  'pilotage-detect-alerts',
  '0 22 * * *',  -- 00h00 Paris
  $$
  SELECT net.http_post(
    url := current_setting('app.settings.supabase_url') || '/functions/v1/detect-alerts',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key')
    ),
    body := '{}'::jsonb
  );
  $$
);

-- -----------------------------------------------------------------------------
-- Vérifier les jobs actifs
-- -----------------------------------------------------------------------------

-- SELECT jobname, schedule, active, command FROM cron.job WHERE jobname LIKE 'pilotage-%';
