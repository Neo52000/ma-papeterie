
-- Fix security definer view
CREATE OR REPLACE VIEW public.v_products_vendable
WITH (security_invoker = true)
AS
SELECT p.*,
  CASE
    WHEN p.ean IS NOT NULL AND p.ean != ''
      AND p.price > 0
      AND EXISTS (
        SELECT 1 FROM public.supplier_products sp
        JOIN public.suppliers s ON s.id = sp.supplier_id
        WHERE sp.product_id = p.id AND s.is_active = true
      )
    THEN true
    ELSE false
  END AS is_vendable
FROM public.products p;
