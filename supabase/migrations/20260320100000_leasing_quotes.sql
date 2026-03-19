-- Leasing mobilier B2B — table de demandes de devis leasing (partenaire Leasecom)
BEGIN;

CREATE TABLE public.leasing_quotes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Client
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  company_name TEXT NOT NULL,
  siret TEXT,
  profile_type TEXT CHECK (profile_type IN ('tpe', 'liberal', 'cowork', 'association', 'autre')),

  -- Projet
  total_amount_ht DECIMAL(10,2) NOT NULL CHECK (total_amount_ht > 0),
  desired_duration INTEGER NOT NULL CHECK (desired_duration IN (13, 24, 36, 48, 60)),
  products JSONB NOT NULL DEFAULT '[]'::jsonb,
  notes TEXT,

  -- Statut
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'contacted', 'submitted_leasecom', 'approved', 'rejected', 'signed', 'cancelled')),
  monthly_estimate DECIMAL(8,2),
  leasecom_ref TEXT,

  -- Admin
  assigned_to TEXT,
  internal_notes TEXT,
  followed_up_at TIMESTAMPTZ
);

-- Index utiles
CREATE INDEX idx_leasing_quotes_status ON public.leasing_quotes(status);
CREATE INDEX idx_leasing_quotes_email ON public.leasing_quotes(email);
CREATE INDEX idx_leasing_quotes_created_at ON public.leasing_quotes(created_at DESC);

-- Trigger updated_at (réutilise la fonction existante)
CREATE TRIGGER update_leasing_quotes_updated_at
  BEFORE UPDATE ON public.leasing_quotes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- RLS : lecture publique interdite, insertion publique autorisée
ALTER TABLE public.leasing_quotes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public_insert" ON public.leasing_quotes
  FOR INSERT TO anon WITH CHECK (true);

CREATE POLICY "authenticated_insert" ON public.leasing_quotes
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "admin_all" ON public.leasing_quotes
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Trigger notification sur changement de statut (optionnel — pour intégration CRM)
CREATE OR REPLACE FUNCTION public.notify_leasing_status_change()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    PERFORM pg_notify('leasing_status', row_to_json(NEW)::text);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER leasing_status_trigger
  AFTER UPDATE ON public.leasing_quotes
  FOR EACH ROW EXECUTE FUNCTION public.notify_leasing_status_change();

COMMIT;
