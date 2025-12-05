-- Enable pg_cron and pg_net extensions
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Grant usage to postgres role
GRANT USAGE ON SCHEMA cron TO postgres;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA cron TO postgres;

-- Schedule the detect-pricing-opportunities function to run every hour
SELECT cron.schedule(
  'detect-pricing-opportunities-hourly',
  '0 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://mgojmkzovqgpipybelrr.supabase.co/functions/v1/detect-pricing-opportunities',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1nb2pta3pvdnFncGlweWJlbHJyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg3NjY5NTEsImV4cCI6MjA3NDM0Mjk1MX0.o3LbQ2cQYIc18KEzl15Yn-YAeCustLEwwjz94XX4ltM"}'::jsonb,
    body := '{}'::jsonb
  ) AS request_id;
  $$
);