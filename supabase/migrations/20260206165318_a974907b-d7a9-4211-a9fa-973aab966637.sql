
-- Drop the existing policy that's missing WITH CHECK
DROP POLICY IF EXISTS "Admins can manage products" ON public.products;

-- Recreate with proper WITH CHECK clause
CREATE POLICY "Admins can manage products" 
ON public.products 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
