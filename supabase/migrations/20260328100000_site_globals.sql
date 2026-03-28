-- Site globals table for header, footer, theme configuration
CREATE TABLE IF NOT EXISTS site_globals (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ DEFAULT now(),
  updated_by UUID REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE site_globals ENABLE ROW LEVEL SECURITY;

-- Anyone can read site globals (public config)
CREATE POLICY "site_globals_public_read" ON site_globals
  FOR SELECT USING (true);

-- Only admins can insert/update/delete
CREATE POLICY "site_globals_admin_write" ON site_globals
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM auth.users u
      JOIN user_roles ur ON ur.user_id = u.id
      WHERE u.id = auth.uid() AND ur.role IN ('admin', 'super_admin')
    )
  );

-- Page revisions table for version history
CREATE TABLE IF NOT EXISTS page_revisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  page_id UUID NOT NULL,
  content JSONB NOT NULL DEFAULT '[]'::jsonb,
  meta_title TEXT,
  meta_description TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  label TEXT
);

-- Index for fast lookup by page_id
CREATE INDEX IF NOT EXISTS idx_page_revisions_page_id ON page_revisions(page_id);

-- Enable RLS
ALTER TABLE page_revisions ENABLE ROW LEVEL SECURITY;

-- Only admins can access revisions
CREATE POLICY "page_revisions_admin" ON page_revisions
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM auth.users u
      JOIN user_roles ur ON ur.user_id = u.id
      WHERE u.id = auth.uid() AND ur.role IN ('admin', 'super_admin')
    )
  );
