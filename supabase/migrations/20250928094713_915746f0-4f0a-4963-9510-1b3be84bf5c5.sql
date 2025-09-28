-- Fix function security issue by setting search_path
CREATE OR REPLACE FUNCTION public.generate_order_number()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  year_str TEXT;
  sequence_num INTEGER;
  order_num TEXT;
BEGIN
  year_str := EXTRACT(YEAR FROM NOW())::TEXT;
  
  -- Get next sequence number for this year
  SELECT COALESCE(MAX(
    CASE 
      WHEN order_number LIKE 'CMD-' || year_str || '-%' 
      THEN (regexp_replace(order_number, 'CMD-' || year_str || '-', ''))::INTEGER
      ELSE 0
    END
  ), 0) + 1
  INTO sequence_num
  FROM public.orders;
  
  order_num := 'CMD-' || year_str || '-' || LPAD(sequence_num::TEXT, 4, '0');
  
  RETURN order_num;
END;
$$;