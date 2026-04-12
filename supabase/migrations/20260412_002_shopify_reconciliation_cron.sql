-- Schedule daily Shopify product reconciliation at 04:00 UTC
-- Staggered after: sync-softcarrier-ftp (02:00), nightly-rollup (03:00)

SELECT cron.schedule(
  'shopify-product-reconciliation',
  '0 4 * * *',
  $$
  SELECT net.http_post(
    url := current_setting('app.settings.supabase_url', true) || '/functions/v1/reconcile-shopify-products',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-api-secret', current_setting('app.settings.api_cron_secret', true)
    ),
    body := '{"mode": "detect", "batch_size": 250}'::jsonb
  ) AS request_id;
  $$
);
