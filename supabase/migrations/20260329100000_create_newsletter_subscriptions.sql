-- Newsletter subscriptions tracking table
CREATE TABLE IF NOT EXISTS newsletter_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  source TEXT NOT NULL CHECK (source IN ('footer','exit_popup','checkout','liste_scolaire')),
  subscribed_at TIMESTAMPTZ DEFAULT NOW(),
  ip_hash TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_newsletter_email ON newsletter_subscriptions(email);
CREATE INDEX IF NOT EXISTS idx_newsletter_source ON newsletter_subscriptions(source);

-- RLS : insertion publique, lecture admin uniquement
ALTER TABLE newsletter_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "newsletter_insert_public" ON newsletter_subscriptions
  FOR INSERT WITH CHECK (true);

CREATE POLICY "newsletter_select_admin" ON newsletter_subscriptions
  FOR SELECT USING (auth.role() = 'authenticated');
