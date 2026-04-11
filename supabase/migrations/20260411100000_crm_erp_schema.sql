-- ============================================================================
-- CRM/ERP Schema — Ma Papeterie
-- Migration additive, idempotente (IF NOT EXISTS partout)
-- ============================================================================

-- ────────────────────────────────────────────────────────────────────────────
-- 1. ALTER profiles — colonnes CRM
-- ────────────────────────────────────────────────────────────────────────────

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS rfm_segment TEXT DEFAULT 'new';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS rfm_recency INT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS rfm_frequency INT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS rfm_monetary NUMERIC(10,2);
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS clv NUMERIC(10,2) DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS total_orders INT DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS total_spent NUMERIC(10,2) DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS last_order_at TIMESTAMPTZ;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS first_order_at TIMESTAMPTZ;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS avg_basket NUMERIC(10,2) DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS preferred_categories TEXT[];
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS lead_source TEXT;       -- 'organic','facebook','prospection','walk-in','referral'
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS client_type TEXT DEFAULT 'b2c'; -- 'b2c','b2b','collectivite','association'
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS brevo_synced_at TIMESTAMPTZ;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS engagement_score INT DEFAULT 0; -- 0-100

-- ────────────────────────────────────────────────────────────────────────────
-- 2. ALTER customer_interactions — enrichir table existante
-- ────────────────────────────────────────────────────────────────────────────

ALTER TABLE customer_interactions ADD COLUMN IF NOT EXISTS channel TEXT;       -- 'web','phone','boutique','email','facebook'
ALTER TABLE customer_interactions ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE customer_interactions ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';
ALTER TABLE customer_interactions ADD COLUMN IF NOT EXISTS profile_id UUID REFERENCES profiles(id);

CREATE INDEX IF NOT EXISTS idx_customer_interactions_profile
  ON customer_interactions(profile_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_customer_interactions_user
  ON customer_interactions(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_customer_interactions_type
  ON customer_interactions(interaction_type);

-- ────────────────────────────────────────────────────────────────────────────
-- 3. CREATE TABLE crm_pipeline (pipeline commercial B2B)
-- ────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS crm_pipeline (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID REFERENCES profiles(id),
  company_name TEXT NOT NULL,
  contact_name TEXT,
  contact_email TEXT,
  contact_phone TEXT,
  stage TEXT NOT NULL DEFAULT 'lead',           -- 'lead','contacted','qualified','quote_sent','negotiation','won','lost'
  source TEXT,                                   -- 'prospection_locale','site_web','recommandation','salon','mairie'
  estimated_value NUMERIC(10,2),
  probability INT DEFAULT 10,                    -- 0-100
  weighted_value NUMERIC(10,2) GENERATED ALWAYS AS (estimated_value * probability / 100) STORED,
  notes TEXT,
  next_action TEXT,
  next_action_date DATE,
  lost_reason TEXT,
  won_at TIMESTAMPTZ,
  lost_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pipeline_stage ON crm_pipeline(stage, next_action_date);
CREATE INDEX IF NOT EXISTS idx_pipeline_profile ON crm_pipeline(profile_id);

-- Trigger updated_at (reuse existing function)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'update_crm_pipeline_updated_at'
  ) THEN
    CREATE TRIGGER update_crm_pipeline_updated_at
      BEFORE UPDATE ON crm_pipeline
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

-- ────────────────────────────────────────────────────────────────────────────
-- 4. Fonction generate_quote_number() — format DEV-YYYY-NNNN
-- ────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION generate_quote_number()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  year_str TEXT;
  sequence_num INTEGER;
  quote_num TEXT;
BEGIN
  year_str := EXTRACT(YEAR FROM NOW())::TEXT;

  SELECT COALESCE(MAX(
    CASE
      WHEN quote_number LIKE 'DEV-' || year_str || '-%'
      THEN (regexp_replace(quote_number, 'DEV-' || year_str || '-', ''))::INTEGER
      ELSE 0
    END
  ), 0) + 1
  INTO sequence_num
  FROM quotes;

  quote_num := 'DEV-' || year_str || '-' || LPAD(sequence_num::TEXT, 4, '0');
  RETURN quote_num;
END;
$$;

-- ────────────────────────────────────────────────────────────────────────────
-- 5. CREATE TABLE quotes (devis)
-- ────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS quotes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_number TEXT UNIQUE NOT NULL,             -- 'DEV-2026-0001'
  profile_id UUID REFERENCES profiles(id),
  pipeline_id UUID REFERENCES crm_pipeline(id),
  company_name TEXT,
  contact_name TEXT NOT NULL,
  contact_email TEXT NOT NULL,
  items JSONB NOT NULL,                          -- [{ref, label, qty, unit_price_ht, tva_rate, total_ht}]
  subtotal_ht NUMERIC(10,2) NOT NULL,
  tva_amount NUMERIC(10,2) NOT NULL,
  total_ttc NUMERIC(10,2) NOT NULL,
  status TEXT DEFAULT 'draft',                   -- 'draft','sent','viewed','accepted','rejected','expired'
  valid_until DATE NOT NULL,
  payment_terms TEXT DEFAULT '30 jours fin de mois',
  notes TEXT,
  pdf_url TEXT,                                  -- Supabase Storage URL
  sent_at TIMESTAMPTZ,
  viewed_at TIMESTAMPTZ,
  accepted_at TIMESTAMPTZ,
  rejected_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_quotes_profile ON quotes(profile_id);
CREATE INDEX IF NOT EXISTS idx_quotes_pipeline ON quotes(pipeline_id);
CREATE INDEX IF NOT EXISTS idx_quotes_status ON quotes(status);
CREATE INDEX IF NOT EXISTS idx_quotes_number ON quotes(quote_number);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'update_quotes_updated_at'
  ) THEN
    CREATE TRIGGER update_quotes_updated_at
      BEFORE UPDATE ON quotes
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

-- ────────────────────────────────────────────────────────────────────────────
-- 6. CREATE TABLE crm_tasks (taches / relances)
-- ────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS crm_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID REFERENCES profiles(id),
  pipeline_id UUID REFERENCES crm_pipeline(id),
  quote_id UUID REFERENCES quotes(id),
  type TEXT NOT NULL,                            -- 'call','email','follow_up','quote_relance','visit'
  title TEXT NOT NULL,
  description TEXT,
  due_date DATE NOT NULL,
  priority TEXT DEFAULT 'normal',                -- 'low','normal','high','urgent'
  status TEXT DEFAULT 'pending',                 -- 'pending','done','cancelled','overdue'
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tasks_status_due ON crm_tasks(status, due_date);
CREATE INDEX IF NOT EXISTS idx_tasks_profile ON crm_tasks(profile_id);
CREATE INDEX IF NOT EXISTS idx_tasks_pipeline ON crm_tasks(pipeline_id);
CREATE INDEX IF NOT EXISTS idx_tasks_quote ON crm_tasks(quote_id);

-- ────────────────────────────────────────────────────────────────────────────
-- 7. CREATE TABLE abandoned_carts (paniers abandonnes)
-- ────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS abandoned_carts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id TEXT,
  profile_id UUID REFERENCES profiles(id),
  email TEXT,
  items JSONB NOT NULL,                          -- [{product_id, title, qty, price_ttc, image_url}]
  cart_total NUMERIC(10,2),
  recovery_email_sent BOOLEAN DEFAULT false,
  recovery_email_sent_at TIMESTAMPTZ,
  recovered BOOLEAN DEFAULT false,
  recovered_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ DEFAULT NOW() + INTERVAL '7 days'
);

CREATE INDEX IF NOT EXISTS idx_abandoned_carts_profile ON abandoned_carts(profile_id);
CREATE INDEX IF NOT EXISTS idx_abandoned_carts_recovery ON abandoned_carts(recovery_email_sent, recovered, created_at);
CREATE INDEX IF NOT EXISTS idx_abandoned_carts_email ON abandoned_carts(email);

-- ────────────────────────────────────────────────────────────────────────────
-- 8. RLS policies — admin only
-- ────────────────────────────────────────────────────────────────────────────

ALTER TABLE crm_pipeline ENABLE ROW LEVEL SECURITY;
ALTER TABLE quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE abandoned_carts ENABLE ROW LEVEL SECURITY;

-- Force RLS even for table owners
ALTER TABLE crm_pipeline FORCE ROW LEVEL SECURITY;
ALTER TABLE quotes FORCE ROW LEVEL SECURITY;
ALTER TABLE crm_tasks FORCE ROW LEVEL SECURITY;
ALTER TABLE abandoned_carts FORCE ROW LEVEL SECURITY;

-- crm_pipeline policies
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'admin_manage_pipeline' AND tablename = 'crm_pipeline') THEN
    CREATE POLICY admin_manage_pipeline ON crm_pipeline
      FOR ALL USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role));
  END IF;
END $$;

-- quotes policies
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'admin_manage_quotes' AND tablename = 'quotes') THEN
    CREATE POLICY admin_manage_quotes ON quotes
      FOR ALL USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role));
  END IF;
END $$;

-- crm_tasks policies
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'admin_manage_crm_tasks' AND tablename = 'crm_tasks') THEN
    CREATE POLICY admin_manage_crm_tasks ON crm_tasks
      FOR ALL USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role));
  END IF;
END $$;

-- abandoned_carts policies
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'admin_manage_abandoned_carts' AND tablename = 'abandoned_carts') THEN
    CREATE POLICY admin_manage_abandoned_carts ON abandoned_carts
      FOR ALL USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role));
  END IF;
END $$;

-- ────────────────────────────────────────────────────────────────────────────
-- 9. Trigger : orders → profiles auto-update
-- ────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION crm_update_profile_on_order()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE profiles SET
    total_orders = COALESCE(total_orders, 0) + 1,
    total_spent = COALESCE(total_spent, 0) + COALESCE(NEW.total_amount, 0),
    last_order_at = NEW.created_at,
    first_order_at = COALESCE(first_order_at, NEW.created_at),
    avg_basket = (COALESCE(total_spent, 0) + COALESCE(NEW.total_amount, 0))
                 / (COALESCE(total_orders, 0) + 1)
  WHERE user_id = NEW.user_id;

  RETURN NEW;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_crm_order_profile_update'
  ) THEN
    CREATE TRIGGER trg_crm_order_profile_update
      AFTER INSERT ON orders
      FOR EACH ROW
      EXECUTE FUNCTION crm_update_profile_on_order();
  END IF;
END $$;

-- ────────────────────────────────────────────────────────────────────────────
-- 10. pg_cron : taches overdue check quotidien 8h
-- ────────────────────────────────────────────────────────────────────────────

DO $$
BEGIN
  -- Mark overdue tasks daily at 8:00 AM
  PERFORM cron.schedule(
    'crm-task-overdue-check',
    '0 8 * * *',
    $$UPDATE crm_tasks SET status = 'overdue' WHERE status = 'pending' AND due_date < CURRENT_DATE$$
  );
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'pg_cron scheduling skipped (extension may not be available): %', SQLERRM;
END $$;
