-- Create function to decrement product stock atomically
CREATE OR REPLACE FUNCTION public.decrement_stock(product_id UUID, quantity INTEGER)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.products
  SET stock_quantity = stock_quantity - quantity
  WHERE id = product_id
    AND stock_quantity >= quantity;
    
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Insufficient stock for product %', product_id;
  END IF;
END;
$$;