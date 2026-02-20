
SELECT cron.schedule(
  'nightly-rollup-recompute',
  '30 2 * * *',
  $$
  SELECT
    net.http_post(
      url := 'https://mgojmkzovqgpipybelrr.supabase.co/functions/v1/nightly-rollup',
      headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1nb2pta3pvdnFncGlweWJlbHJyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg3NjY5NTEsImV4cCI6MjA3NDM0Mjk1MX0.o3LbQ2cQYIc18KEzl15Yn-YAeCustLEwwjz94XX4ltM"}'::jsonb,
      body := '{}'::jsonb
    ) AS request_id;
  $$
);
