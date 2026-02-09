
-- Fix INSERT policy parentheses (OR precedence bug)
DROP POLICY IF EXISTS "Admins can upload product images" ON storage.objects;

CREATE POLICY "Admins can upload product images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'product-images'
  AND (public.has_role(auth.uid(), 'admin')
  OR public.has_role(auth.uid(), 'super_admin'))
);
