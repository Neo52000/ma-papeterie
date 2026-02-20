
-- Add unique constraint on (supplier_id, product_id) in supplier_products if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'supplier_products_supplier_id_product_id_key'
      AND conrelid = 'public.supplier_products'::regclass
  ) THEN
    ALTER TABLE public.supplier_products
      ADD CONSTRAINT supplier_products_supplier_id_product_id_key
      UNIQUE (supplier_id, product_id);
  END IF;
END;
$$;
