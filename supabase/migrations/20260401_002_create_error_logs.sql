-- ============================================================================
-- Migration: Create error_logs table for lightweight error tracking
-- Date: 2026-04-01
-- Description: Replaces Sentry stub with real error tracking to Supabase.
--   Frontend sends errors via REST API using anon key.
--   Admin can view errors in dashboard.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.error_logs (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  level text NOT NULL DEFAULT 'error',
  message text NOT NULL,
  stack text,
  context jsonb,
  url text,
  user_id uuid REFERENCES auth.users(id),
  user_email text,
  timestamp timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Index for querying recent errors
CREATE INDEX idx_error_logs_timestamp ON public.error_logs (timestamp DESC);
CREATE INDEX idx_error_logs_level ON public.error_logs (level);

-- RLS: anyone can insert (frontend errors), only admins can read
ALTER TABLE public.error_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anyone_can_insert_errors"
  ON public.error_logs FOR INSERT
  WITH CHECK (true);

CREATE POLICY "admins_can_read_errors"
  ON public.error_logs FOR SELECT
  USING (public.is_admin());

CREATE POLICY "admins_can_delete_errors"
  ON public.error_logs FOR DELETE
  USING (public.is_admin());

-- Auto-cleanup: delete errors older than 30 days (via pg_cron if available)
-- SELECT cron.schedule('cleanup-error-logs', '0 3 * * *', $$DELETE FROM public.error_logs WHERE timestamp < now() - interval '30 days'$$);

COMMENT ON TABLE public.error_logs IS 'Lightweight frontend error tracking (replaces Sentry)';
