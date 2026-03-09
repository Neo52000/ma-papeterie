-- Insert competitor records (Bureau Vallée, JPG, Bruneau, Welcome Office)
-- price_selector: CSS selector(s) used by scrape-prices to extract the price
-- rate_limit_ms: delay between requests on that domain (be polite)

INSERT INTO competitors (id, name, base_url, enabled, price_selector, rate_limit_ms, created_at, updated_at)
VALUES
  (
    gen_random_uuid(),
    'Bureau Vallée',
    'https://www.bureau-vallee.fr',
    true,
    '.pdp-price, .product-price .price, [data-price]',
    5000,
    now(), now()
  ),
  (
    gen_random_uuid(),
    'JPG',
    'https://www.jpg.fr',
    true,
    '.price-final, .product-price, .price',
    4000,
    now(), now()
  ),
  (
    gen_random_uuid(),
    'Bruneau',
    'https://www.bruneau.fr',
    true,
    '.product-price, .price-value',
    4000,
    now(), now()
  ),
  (
    gen_random_uuid(),
    'Welcome Office',
    'https://www.welcome-office.com',
    true,
    '.product-price-value, .price',
    4000,
    now(), now()
  )
ON CONFLICT DO NOTHING;
