
-- Create public bucket for product images
INSERT INTO storage.buckets (id, name, public)
VALUES ('product-images', 'product-images', true)
ON CONFLICT (id) DO NOTHING;

-- Public read access for product images
CREATE POLICY "Product images are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'product-images');

-- Admin/super_admin can upload product images
CREATE POLICY "Admins can upload product images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'product-images'
  AND public.has_role(auth.uid(), 'admin')
  OR public.has_role(auth.uid(), 'super_admin')
);

-- Admin/super_admin can update product images
CREATE POLICY "Admins can update product images"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'product-images'
  AND (public.has_role(auth.uid(), 'admin')
  OR public.has_role(auth.uid(), 'super_admin'))
);

-- Admin/super_admin can delete product images
CREATE POLICY "Admins can delete product images"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'product-images'
  AND (public.has_role(auth.uid(), 'admin')
  OR public.has_role(auth.uid(), 'super_admin'))
);
