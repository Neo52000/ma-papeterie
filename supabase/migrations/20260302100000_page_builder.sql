-- ─────────────────────────────────────────────────────────────────────────────
-- Page builder enhancements: layout column + storage bucket for images
-- Idempotent — safe to re-run.
-- ─────────────────────────────────────────────────────────────────────────────

-- ── 1. Add layout column to static_pages ────────────────────────────────────
-- Two valid values: 'article' (max-width container) or 'full-width'.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name   = 'static_pages'
      AND column_name  = 'layout'
  ) THEN
    ALTER TABLE public.static_pages
      ADD COLUMN layout TEXT NOT NULL DEFAULT 'article';

    ALTER TABLE public.static_pages
      ADD CONSTRAINT static_pages_layout_check
      CHECK (layout IN ('article', 'full-width'));
  END IF;
END
$$;

-- ── 2. Storage bucket for page builder images ───────────────────────────────
-- 10 MB max per file, public read.

INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('page-images', 'page-images', true, 10485760)
ON CONFLICT (id) DO NOTHING;

-- ── 3. Storage policies (idempotent: drop-then-create) ─────────────────────

-- Public read
DROP POLICY IF EXISTS "page_images_public_read" ON storage.objects;
CREATE POLICY "page_images_public_read" ON storage.objects
  FOR SELECT USING (bucket_id = 'page-images');

-- Admin insert
DROP POLICY IF EXISTS "page_images_admin_insert" ON storage.objects;
CREATE POLICY "page_images_admin_insert" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'page-images'
    AND public.is_admin()
  );

-- Admin update (needed for overwriting images)
DROP POLICY IF EXISTS "page_images_admin_update" ON storage.objects;
CREATE POLICY "page_images_admin_update" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'page-images'
    AND public.is_admin()
  );

-- Admin delete
DROP POLICY IF EXISTS "page_images_admin_delete" ON storage.objects;
CREATE POLICY "page_images_admin_delete" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'page-images'
    AND public.is_admin()
  );
