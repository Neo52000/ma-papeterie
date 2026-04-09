-- SMS notification preferences per user
-- Opt-in only (GDPR compliant: all defaults to false)

CREATE TABLE public.sms_preferences (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  phone_number    TEXT,          -- E.164 format: +33612345678
  phone_verified  BOOLEAN NOT NULL DEFAULT false,
  -- Per-notification-type opt-in
  order_status          BOOLEAN NOT NULL DEFAULT false,
  shipping_alerts       BOOLEAN NOT NULL DEFAULT false,
  service_order_updates BOOLEAN NOT NULL DEFAULT false,
  wishlist_alerts       BOOLEAN NOT NULL DEFAULT false,
  promotional           BOOLEAN NOT NULL DEFAULT false,
  -- Global kill switch
  sms_enabled     BOOLEAN NOT NULL DEFAULT false,
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id)
);

ALTER TABLE public.sms_preferences ENABLE ROW LEVEL SECURITY;

-- Users manage their own preferences
CREATE POLICY "users_manage_own_sms_prefs"
  ON public.sms_preferences FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Admins read all (for campaign targeting)
CREATE POLICY "admins_read_all_sms_prefs"
  ON public.sms_preferences FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid()
        AND role IN ('admin', 'super_admin')
    )
  );

CREATE INDEX idx_sms_prefs_user  ON public.sms_preferences(user_id);
CREATE INDEX idx_sms_prefs_promo ON public.sms_preferences(promotional)
  WHERE promotional = true AND sms_enabled = true;
