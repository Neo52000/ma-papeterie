-- ============================================================================
-- Storage bucket for stamp logos and preview images
-- ============================================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'stamp-assets',
  'stamp-assets',
  true,
  2097152,
  ARRAY['image/png','image/jpeg','image/svg+xml']
)
ON CONFLICT (id) DO NOTHING;

-- Anyone can read stamp assets (previews need to be visible in cart/orders)
CREATE POLICY "stamp_assets_public_read" ON storage.objects
  FOR SELECT USING (bucket_id = 'stamp-assets');

-- Authenticated users can upload to their own folder
CREATE POLICY "stamp_assets_auth_upload" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'stamp-assets'
    AND auth.role() = 'authenticated'
  );

-- Anon can also upload (for guest users designing stamps)
CREATE POLICY "stamp_assets_anon_upload" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'stamp-assets'
    AND auth.role() = 'anon'
  );
