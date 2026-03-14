-- ── Audit Logging Table (GDPR compliance) ────────────────────────────────

CREATE TABLE IF NOT EXISTS audit_logs (
  id BIGSERIAL PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  admin_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  admin_email TEXT,
  action TEXT NOT NULL,  -- 'INSERT', 'UPDATE', 'DELETE'
  resource_type TEXT NOT NULL,  -- 'product', 'pricing', 'user', 'order', etc.
  resource_id TEXT NOT NULL,  -- ID of the modified resource
  changes JSONB,  -- Before/after values
  metadata JSONB  -- Additional context (IP, user agent, etc.)
);

-- Create index on created_at for fast log retrieval
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC);
-- Create index on admin_id for user-specific audit trails
CREATE INDEX IF NOT EXISTS idx_audit_logs_admin_id ON audit_logs(admin_id);
-- Create index on resource_type + resource_id for finding all changes to a resource
CREATE INDEX IF NOT EXISTS idx_audit_logs_resource ON audit_logs(resource_type, resource_id);

-- Enable RLS
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Policy: Only admins can read audit logs
DROP POLICY IF EXISTS "Only admins can read audit logs" ON audit_logs;
CREATE POLICY "Only admins can read audit logs" ON audit_logs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.raw_user_meta_data->>'role' IN ('admin', 'super_admin')
    )
  );

-- Policy: Audit logs are append-only (no updates/deletes except by system)
DROP POLICY IF EXISTS "Audit logs are append-only" ON audit_logs;
CREATE POLICY "Audit logs are append-only" ON audit_logs
  FOR INSERT WITH CHECK (true);

COMMENT ON TABLE audit_logs IS 'Immutable audit trail of administrative actions for GDPR compliance and security monitoring';
COMMENT ON COLUMN audit_logs.admin_id IS 'User ID of the admin who performed the action';
COMMENT ON COLUMN audit_logs.action IS 'Type of action: INSERT, UPDATE, DELETE';
COMMENT ON COLUMN audit_logs.resource_type IS 'Entity type affected: product, order, user, pricing_rule, etc.';
COMMENT ON COLUMN audit_logs.resource_id IS 'UUID or identifier of the affected resource';
COMMENT ON COLUMN audit_logs.changes IS 'JSON diff of changes (before/after for UPDATE actions)';
COMMENT ON COLUMN audit_logs.metadata IS 'Additional context like IP address, user agent, reason for change';
