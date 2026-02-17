
-- Function to detect exceptions for a single product
CREATE OR REPLACE FUNCTION public.detect_product_exceptions(p_product_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Clear unresolved exceptions for this product (re-evaluate)
  DELETE FROM public.product_exceptions
  WHERE product_id = p_product_id AND resolved = false;

  -- Exception: EAN manquant
  INSERT INTO public.product_exceptions (product_id, exception_type, details)
  SELECT p_product_id, 'ean_manquant', '{}'::jsonb
  FROM public.products
  WHERE id = p_product_id AND (ean IS NULL OR ean = '')
  ON CONFLICT DO NOTHING;

  -- Exception: Prix incalculable (price <= 0)
  INSERT INTO public.product_exceptions (product_id, exception_type, details)
  SELECT p_product_id, 'prix_incalculable',
    jsonb_build_object('price', price, 'price_ht', price_ht)
  FROM public.products
  WHERE id = p_product_id AND (price <= 0 OR price IS NULL)
  ON CONFLICT DO NOTHING;

  -- Exception: Fournisseur inactif (has suppliers but none active)
  INSERT INTO public.product_exceptions (product_id, exception_type, details)
  SELECT p_product_id, 'fournisseur_inactif',
    jsonb_build_object('supplier_count', COUNT(*))
  FROM public.supplier_products sp
  JOIN public.suppliers s ON s.id = sp.supplier_id
  WHERE sp.product_id = p_product_id
  GROUP BY sp.product_id
  HAVING COUNT(*) > 0 AND COUNT(*) FILTER (WHERE s.is_active = true) = 0
  ON CONFLICT DO NOTHING;
END;
$$;

-- Trigger function on products INSERT/UPDATE
CREATE OR REPLACE FUNCTION public.trigger_detect_product_exceptions()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  PERFORM public.detect_product_exceptions(NEW.id);
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_detect_product_exceptions
AFTER INSERT OR UPDATE ON public.products
FOR EACH ROW
EXECUTE FUNCTION public.trigger_detect_product_exceptions();

-- Batch function for cron: scans ALL products
CREATE OR REPLACE FUNCTION public.detect_all_product_exceptions()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  r RECORD;
  cnt INT := 0;
BEGIN
  FOR r IN SELECT id FROM public.products LOOP
    PERFORM public.detect_product_exceptions(r.id);
    cnt := cnt + 1;
  END LOOP;

  RETURN jsonb_build_object('products_scanned', cnt, 'timestamp', now());
END;
$$;
