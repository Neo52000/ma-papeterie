
-- Create app_settings table for configurable parameters
CREATE TABLE IF NOT EXISTS public.app_settings (
  key         TEXT PRIMARY KEY,
  value       JSONB NOT NULL DEFAULT '{}'::jsonb,
  label       TEXT,
  description TEXT,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by  UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Enable RLS
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

-- Read: anyone (including anon, edge functions)
CREATE POLICY "read_app_settings"
  ON public.app_settings
  FOR SELECT
  USING (true);

-- Write: admin / super_admin only
CREATE POLICY "write_app_settings"
  ON public.app_settings
  FOR ALL
  USING (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'super_admin'::app_role)
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'super_admin'::app_role)
  );

-- Trigger to auto-update updated_at
CREATE OR REPLACE FUNCTION public.update_app_settings_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER app_settings_updated_at
  BEFORE UPDATE ON public.app_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_app_settings_updated_at();

-- Seed default values
INSERT INTO public.app_settings (key, value, label, description) VALUES
  ('ghost_offer_threshold_alkor_days',  '3'::jsonb,  'Seuil offres fantômes ALKOR (jours)',    'Jours sans last_seen_at après lesquels une offre ALKOR est marquée inactive'),
  ('ghost_offer_threshold_comlandi_days', '3'::jsonb, 'Seuil offres fantômes COMLANDI (jours)', 'Jours sans last_seen_at après lesquels une offre COMLANDI est marquée inactive'),
  ('ghost_offer_threshold_soft_days',   '8'::jsonb,  'Seuil offres fantômes SOFT (jours)',     'Jours sans last_seen_at après lesquels une offre SOFT est marquée inactive'),
  ('nightly_rollup_enabled',            'true'::jsonb, 'Cron nightly rollup activé',           'Active le recalcul prix/stock automatique chaque nuit à 2h30')
ON CONFLICT (key) DO NOTHING;
