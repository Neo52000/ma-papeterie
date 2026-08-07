-- Security hardening phases 1-3:
--   * retire the legacy custom TOTP implementation in favour of Supabase Auth MFA;
--   * quarantine legacy simulated competitor prices;
--   * require AAL2 whenever an admin/super_admin role is used by RLS.

-- The old RPCs stored TOTP secrets and backup codes in public.admin_users.
-- They are revoked first so this migration fails closed even if a later statement fails.
REVOKE ALL ON FUNCTION public.generate_totp_secret() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.enable_totp(text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.verify_totp(text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.disable_totp() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.totp_check(text, text, integer) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.totp_generate_code(text, bigint) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.base32_decode(text) FROM PUBLIC, anon, authenticated;

-- The service role bypasses RLS; keeping a policy that relies on auth.role()
-- only preserves a deprecated and misleading authorization path.
DROP POLICY IF EXISTS "Service role can update 2FA" ON public.admin_users;

COMMENT ON TABLE public.admin_users IS
  'Deprecated custom TOTP storage. Supabase Auth MFA factors are authoritative.';

-- Custom factors cannot be migrated safely to Supabase Auth. Remove the stored
-- secrets and backup codes; administrators must enrol a native MFA factor.
UPDATE public.admin_users
SET totp_secret = NULL,
    totp_enabled = false,
    backup_codes = ARRAY[]::text[],
    updated_at = now()
WHERE totp_secret IS NOT NULL
   OR totp_enabled
   OR cardinality(backup_codes) > 0;

-- RLS role checks for privileged roles now require a session upgraded to AAL2.
-- Users can still read their own row in user_roles at AAL1, which allows the UI
-- to identify an administrator and send them to MFA enrolment/challenge.
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    (
      _role::text NOT IN ('admin', 'super_admin')
      OR COALESCE(auth.jwt() ->> 'aal', 'aal1') = 'aal2'
    )
    AND EXISTS (
      SELECT 1
      FROM public.user_roles
      WHERE user_id = _user_id
        AND role = _role
    )
$$;

REVOKE ALL ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;

-- Several historical policies perform their own direct user_roles lookup.
-- Add a restrictive policy to every table exposing an admin policy so an AAL1
-- admin token cannot bypass the new central helper through one of those paths.
-- user_roles is deliberately excluded: it must remain readable at AAL1 so the
-- application can identify an admin and direct them to MFA enrolment.
DO $$
DECLARE
  protected_table record;
BEGIN
  FOR protected_table IN
    SELECT DISTINCT tablename
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename <> 'user_roles'
      AND (
        COALESCE(qual, '') ~* '''(admin|super_admin)'''
        OR COALESCE(with_check, '') ~* '''(admin|super_admin)'''
      )
  LOOP
    EXECUTE format(
      'DROP POLICY IF EXISTS %I ON public.%I',
      'require_admin_aal2',
      protected_table.tablename
    );
    EXECUTE format(
      'CREATE POLICY %I ON public.%I AS RESTRICTIVE FOR ALL TO authenticated USING ((NOT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = (SELECT auth.uid()) AND role::text IN (''admin'', ''super_admin''))) OR COALESCE(auth.jwt() ->> ''aal'', ''aal1'') = ''aal2'') WITH CHECK ((NOT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = (SELECT auth.uid()) AND role::text IN (''admin'', ''super_admin''))) OR COALESCE(auth.jwt() ->> ''aal'', ''aal1'') = ''aal2'')',
      'require_admin_aal2',
      protected_table.tablename
    );
  END LOOP;
END
$$;

-- Provenance and validity flags for the legacy competitor_prices table.
ALTER TABLE public.competitor_prices
  ADD COLUMN IF NOT EXISTS source_type text NOT NULL DEFAULT 'legacy',
  ADD COLUMN IF NOT EXISTS source_url text,
  ADD COLUMN IF NOT EXISTS collected_at timestamptz,
  ADD COLUMN IF NOT EXISTS confidence numeric(5, 4),
  ADD COLUMN IF NOT EXISTS is_simulated boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_valid boolean NOT NULL DEFAULT false;

ALTER TABLE public.competitor_prices
  DROP CONSTRAINT IF EXISTS competitor_prices_source_type_check,
  ADD CONSTRAINT competitor_prices_source_type_check
    CHECK (source_type IN ('legacy', 'scrape', 'api', 'manual', 'simulation')),
  DROP CONSTRAINT IF EXISTS competitor_prices_confidence_check,
  ADD CONSTRAINT competitor_prices_confidence_check
    CHECK (confidence IS NULL OR (confidence >= 0 AND confidence <= 1)),
  DROP CONSTRAINT IF EXISTS competitor_prices_positive_price_check,
  ADD CONSTRAINT competitor_prices_positive_price_check
    CHECK (competitor_price > 0),
  DROP CONSTRAINT IF EXISTS competitor_prices_provenance_check,
  ADD CONSTRAINT competitor_prices_provenance_check
    CHECK (
      is_simulated
      OR NOT is_valid
      OR (source_url IS NOT NULL AND collected_at IS NOT NULL)
    );

-- This is the only writer to competitor_prices in the repository and it created
-- random values. Existing rows are therefore quarantined, not deleted.
UPDATE public.competitor_prices
SET source_type = 'simulation',
    source_url = COALESCE(source_url, competitor_url),
    collected_at = COALESCE(collected_at, scraped_at),
    confidence = 0,
    is_simulated = true,
    is_valid = false
WHERE source_type = 'legacy';

CREATE INDEX IF NOT EXISTS idx_competitor_prices_valid_recent
  ON public.competitor_prices(product_id, scraped_at DESC)
  WHERE is_valid AND NOT is_simulated;

COMMENT ON COLUMN public.competitor_prices.is_valid IS
  'Only verified, traceable prices may be used by pricing and forecasting.';

-- Replace user-editable metadata authorization with the central role check.
DROP POLICY IF EXISTS "Admins manage reviews" ON public.product_reviews;
CREATE POLICY "Admins manage reviews"
  ON public.product_reviews
  FOR ALL
  TO authenticated
  USING (
    public.has_role((SELECT auth.uid()), 'admin'::public.app_role)
    OR public.has_role((SELECT auth.uid()), 'super_admin'::public.app_role)
  )
  WITH CHECK (
    public.has_role((SELECT auth.uid()), 'admin'::public.app_role)
    OR public.has_role((SELECT auth.uid()), 'super_admin'::public.app_role)
  );

DROP POLICY IF EXISTS "Only admins can read audit logs" ON public.audit_logs;
CREATE POLICY "Only admins can read audit logs"
  ON public.audit_logs
  FOR SELECT
  TO authenticated
  USING (
    public.has_role((SELECT auth.uid()), 'admin'::public.app_role)
    OR public.has_role((SELECT auth.uid()), 'super_admin'::public.app_role)
  );

-- Audit records are written by service-role Edge Functions. Clients must not be
-- able to forge entries, even though the table remains append-only.
DROP POLICY IF EXISTS "Audit logs are append-only" ON public.audit_logs;

-- Newsletter addresses are personal data. Public subscription goes through the
-- rate-limited newsletter-subscribe Edge Function using the service role.
DROP POLICY IF EXISTS "newsletter_insert_public" ON public.newsletter_subscriptions;
DROP POLICY IF EXISTS "newsletter_select_admin" ON public.newsletter_subscriptions;
CREATE POLICY "newsletter_select_admin"
  ON public.newsletter_subscriptions
  FOR SELECT
  TO authenticated
  USING (
    public.has_role((SELECT auth.uid()), 'admin'::public.app_role)
    OR public.has_role((SELECT auth.uid()), 'super_admin'::public.app_role)
  );

-- send-sms reads templates with the service role. The broad authenticated read
-- policy is unnecessary; the existing admin FOR ALL policy remains authoritative.
DROP POLICY IF EXISTS "authenticated_read_sms_templates" ON public.sms_templates;

-- Replace deprecated auth.role() predicates with explicit target roles.
DROP POLICY IF EXISTS "stamp_assets_auth_upload" ON storage.objects;
CREATE POLICY "stamp_assets_auth_upload"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'stamp-assets'
    AND (storage.foldername(name))[1] = (SELECT auth.uid())::text
  );

DROP POLICY IF EXISTS "stamp_assets_anon_upload" ON storage.objects;
CREATE POLICY "stamp_assets_anon_upload"
  ON storage.objects
  FOR INSERT
  TO anon
  WITH CHECK (
    bucket_id = 'stamp-assets'
    AND (storage.foldername(name))[1] = 'anonymous'
  );
