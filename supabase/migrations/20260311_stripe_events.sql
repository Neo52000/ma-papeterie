-- ═══════════════════════════════════════════════════════════════════════════
-- Table de stockage des événements Stripe pour l'idempotence des webhooks
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS stripe_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  stripe_event_id TEXT UNIQUE NOT NULL,
  event_type TEXT NOT NULL,
  processed_at TIMESTAMPTZ DEFAULT NOW(),
  payload JSONB
);

CREATE INDEX IF NOT EXISTS idx_stripe_events_event_id ON stripe_events(stripe_event_id);
CREATE INDEX IF NOT EXISTS idx_stripe_events_type ON stripe_events(event_type);

-- RLS
ALTER TABLE stripe_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE stripe_events FORCE ROW LEVEL SECURITY;

-- Admin lecture seule
CREATE POLICY "admin_read_stripe_events" ON stripe_events
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
      AND role IN ('admin', 'super_admin')
    )
  );

-- Nettoyage automatique (garder 90 jours)
CREATE OR REPLACE FUNCTION cleanup_old_stripe_events()
RETURNS void AS $$
  DELETE FROM stripe_events WHERE processed_at < NOW() - INTERVAL '90 days';
$$ LANGUAGE sql;
