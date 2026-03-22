-- ============================================================================
-- Social Media Standalone — Extend social tables for standalone posts
-- ============================================================================

-- 1. Make article_id nullable on social_campaigns (allow standalone campaigns)
ALTER TABLE social_campaigns ALTER COLUMN article_id DROP NOT NULL;

-- 2. Replace unique constraint with partial unique (blog campaigns only)
ALTER TABLE social_campaigns DROP CONSTRAINT IF EXISTS social_campaigns_article_unique;
CREATE UNIQUE INDEX social_campaigns_article_unique_v2
  ON social_campaigns(article_id) WHERE article_id IS NOT NULL;

-- 3. Add new columns to social_campaigns
ALTER TABLE social_campaigns
  ADD COLUMN IF NOT EXISTS source_type text NOT NULL DEFAULT 'blog',
  ADD COLUMN IF NOT EXISTS title text,
  ADD COLUMN IF NOT EXISTS raw_context jsonb,
  ADD COLUMN IF NOT EXISTS media_urls text[],
  ADD COLUMN IF NOT EXISTS media_type text;

-- Check constraints for new columns
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'social_campaigns_source_type_check') THEN
    ALTER TABLE social_campaigns ADD CONSTRAINT social_campaigns_source_type_check
      CHECK (source_type IN ('blog', 'standalone', 'editorial_calendar'));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'social_campaigns_media_type_check') THEN
    ALTER TABLE social_campaigns ADD CONSTRAINT social_campaigns_media_type_check
      CHECK (media_type IS NULL OR media_type IN ('image', 'video', 'carousel'));
  END IF;
END $$;

-- 4. Expand platform CHECK on social_posts to include whatsapp
ALTER TABLE social_posts DROP CONSTRAINT IF EXISTS social_posts_platform_check;
ALTER TABLE social_posts ADD CONSTRAINT social_posts_platform_check
  CHECK (platform IN ('facebook', 'instagram', 'x', 'linkedin', 'whatsapp'));

-- 5. Replace unique-per-platform constraint with partial (blog campaigns only)
ALTER TABLE social_posts DROP CONSTRAINT IF EXISTS social_posts_unique_per_platform;
CREATE UNIQUE INDEX social_posts_unique_blog_platform
  ON social_posts(campaign_id, platform)
  WHERE campaign_id IN (SELECT id FROM social_campaigns WHERE source_type = 'blog');

-- 6. Add post_variant to social_posts
ALTER TABLE social_posts ADD COLUMN IF NOT EXISTS post_variant text DEFAULT 'feed';

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'social_posts_variant_check') THEN
    ALTER TABLE social_posts ADD CONSTRAINT social_posts_variant_check
      CHECK (post_variant IN ('feed', 'story', 'reel', 'template'));
  END IF;
END $$;

-- 7. Expand platform CHECK on social_accounts to include whatsapp
ALTER TABLE social_accounts DROP CONSTRAINT IF EXISTS social_accounts_platform_check;
ALTER TABLE social_accounts ADD CONSTRAINT social_accounts_platform_check
  CHECK (platform IN ('facebook', 'instagram', 'x', 'linkedin', 'whatsapp'));

-- 8. Create editorial calendar table
CREATE TABLE IF NOT EXISTS social_editorial_calendar (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  month date NOT NULL,
  ideas jsonb NOT NULL,
  generated_by text DEFAULT 'ai',
  ai_model text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT editorial_calendar_month_unique UNIQUE (month)
);

ALTER TABLE social_editorial_calendar ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'editorial_calendar_admin_all' AND tablename = 'social_editorial_calendar') THEN
    CREATE POLICY "editorial_calendar_admin_all" ON social_editorial_calendar FOR ALL
      USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role))
      WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role));
  END IF;
END $$;

-- Trigger: auto-update updated_at
CREATE OR REPLACE FUNCTION update_editorial_calendar_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS editorial_calendar_updated_at_trigger ON social_editorial_calendar;
CREATE TRIGGER editorial_calendar_updated_at_trigger
  BEFORE UPDATE ON social_editorial_calendar
  FOR EACH ROW EXECUTE FUNCTION update_editorial_calendar_updated_at();

-- Grants
GRANT ALL ON social_editorial_calendar TO service_role;
GRANT SELECT ON social_editorial_calendar TO authenticated;

-- 9. Create social-media storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('social-media', 'social-media', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policy: admin upload
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'social_media_admin_upload' AND tablename = 'objects') THEN
    CREATE POLICY "social_media_admin_upload" ON storage.objects FOR INSERT
      WITH CHECK (
        bucket_id = 'social-media'
        AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role))
      );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'social_media_public_read' AND tablename = 'objects') THEN
    CREATE POLICY "social_media_public_read" ON storage.objects FOR SELECT
      USING (bucket_id = 'social-media');
  END IF;
END $$;

-- 10. New indexes
CREATE INDEX IF NOT EXISTS idx_social_campaigns_source_type ON social_campaigns(source_type);
CREATE INDEX IF NOT EXISTS idx_social_posts_scheduled ON social_posts(scheduled_for) WHERE scheduled_for IS NOT NULL;
