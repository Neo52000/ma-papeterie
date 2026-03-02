-- Page builder: storage bucket + layout column

-- Storage bucket for page builder images
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('page-images', 'page-images', true, 10485760)
ON CONFLICT (id) DO NOTHING;

-- Public read
CREATE POLICY "page_images_public_read" ON storage.objects
  FOR SELECT USING (bucket_id = 'page-images');

-- Admin write (insert)
CREATE POLICY "page_images_admin_insert" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'page-images'
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
    )
  );

-- Admin delete
CREATE POLICY "page_images_admin_delete" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'page-images'
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
    )
  );

-- Add layout column to static_pages
ALTER TABLE static_pages
  ADD COLUMN IF NOT EXISTS layout TEXT DEFAULT 'article'
  CHECK (layout IN ('article', 'full-width'));
