-- Corriger le shop_domain dans shopify_config
-- Le domaine réel est ma-papeterie-pro-boutique-hcd1j.myshopify.com
UPDATE public.shopify_config
SET shop_domain = 'ma-papeterie-pro-boutique-hcd1j.myshopify.com'
WHERE shop_domain = 'ma-papeterie.myshopify.com';
