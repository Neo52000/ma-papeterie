
SELECT cron.schedule(
  'detect-product-exceptions',
  '0 3 * * *',
  $$SELECT public.detect_all_product_exceptions()$$
);
