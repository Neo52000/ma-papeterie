-- ─────────────────────────────────────────────────────────────────────────────
-- Module Prospection CRM — Schéma dédié (Phase B data.gouv)
-- ─────────────────────────────────────────────────────────────────────────────
-- Source : API Recherche d'Entreprises (data.gouv.fr, base SIRENE publique)
-- Objectif : CRM existant (profiles/crm_pipeline/Brevo) devient capable de
-- gérer de la prospection froide B2B (écoles, collectivités, libéraux, PME).
--
-- Tables :
--   1. prospects             — entreprises non-clientes issues de data.gouv
--   2. prospect_interactions — timeline des interactions pré-conversion
--   3. prospect_campaigns    — cohortes ciblées par une séquence Brevo
--   4. prospect_enrollments  — pivot prospect ↔ campaign
-- Modifications :
--   - crm_pipeline gagne prospect_id (alternative à profile_id)
--   - app_role gagne la valeur 'commercial'
--   - fonction promote_prospect_to_client() pour convertir un prospect en client
-- ─────────────────────────────────────────────────────────────────────────────

-- ── 0. Ajouter le rôle 'commercial' à l'enum app_role ──────────────────────
-- ALTER TYPE ... ADD VALUE ne peut pas être exécuté dans une transaction,
-- on utilise donc un bloc DO avec exception pour rendre la migration idempotente.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum
    WHERE enumtypid = 'public.app_role'::regtype
      AND enumlabel = 'commercial'
  ) THEN
    ALTER TYPE public.app_role ADD VALUE 'commercial';
  END IF;
END $$;

-- ── 1. Table prospects ─────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.prospects (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  siren                TEXT NOT NULL,
  siret                TEXT,
  name                 TEXT NOT NULL,
  legal_form           TEXT,
  naf_code             TEXT,
  naf_label            TEXT,
  employee_range       TEXT,
  founded_date         DATE,
  address              JSONB,                        -- { street, zip, city, dept, code_commune }
  contact_phone        TEXT,
  contact_email        TEXT,                         -- souvent null côté data.gouv
  website              TEXT,
  status               TEXT NOT NULL DEFAULT 'new',  -- new|qualified|contacted|engaged|converted|rejected|unreachable
  score                SMALLINT,                     -- 0-100
  client_segment       TEXT,                         -- educational|public|liberal|pme
  assigned_to          UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  tags                 TEXT[] NOT NULL DEFAULT '{}',
  notes                TEXT,
  source               TEXT NOT NULL DEFAULT 'data_gouv', -- data_gouv|manual|csv|referral
  sirene_raw           JSONB,
  sirene_synced_at     TIMESTAMPTZ,
  converted_profile_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  converted_at         TIMESTAMPTZ,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT prospects_siren_unique UNIQUE (siren),
  CONSTRAINT prospects_status_ck CHECK (
    status IN ('new','qualified','contacted','engaged','converted','rejected','unreachable')
  ),
  CONSTRAINT prospects_segment_ck CHECK (
    client_segment IS NULL OR client_segment IN ('educational','public','liberal','pme')
  ),
  CONSTRAINT prospects_score_ck CHECK (score IS NULL OR (score >= 0 AND score <= 100))
);

CREATE INDEX IF NOT EXISTS idx_prospects_status      ON public.prospects(status);
CREATE INDEX IF NOT EXISTS idx_prospects_assigned    ON public.prospects(assigned_to);
CREATE INDEX IF NOT EXISTS idx_prospects_naf_code    ON public.prospects(naf_code);
CREATE INDEX IF NOT EXISTS idx_prospects_segment     ON public.prospects(client_segment);
CREATE INDEX IF NOT EXISTS idx_prospects_score_desc  ON public.prospects(score DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS idx_prospects_dept        ON public.prospects((address->>'dept'));
CREATE INDEX IF NOT EXISTS idx_prospects_created_at  ON public.prospects(created_at DESC);

COMMENT ON TABLE public.prospects IS
  'Entreprises non-clientes issues de data.gouv.fr (base SIRENE). Converties en profiles+b2b_accounts via promote_prospect_to_client().';
COMMENT ON COLUMN public.prospects.score IS
  'Lead scoring 0-100 calculé par src/lib/prospectScoring.ts (segment + effectif + ancienneté + géographie).';
COMMENT ON COLUMN public.prospects.address IS
  'JSONB { street, zip, city, dept, code_commune }. dept permet filtre rapide par département.';

-- Trigger updated_at (réutilise la fonction existante)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_prospects_updated_at'
  ) THEN
    CREATE TRIGGER trg_prospects_updated_at
      BEFORE UPDATE ON public.prospects
      FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END $$;

-- ── 2. Table prospect_interactions (miroir de customer_interactions) ───────

CREATE TABLE IF NOT EXISTS public.prospect_interactions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prospect_id UUID NOT NULL REFERENCES public.prospects(id) ON DELETE CASCADE,
  channel     TEXT NOT NULL,                  -- email|phone|visit|web|system
  direction   TEXT NOT NULL DEFAULT 'outbound', -- inbound|outbound
  subject     TEXT,
  description TEXT,
  metadata    JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_by  UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT prospect_interactions_direction_ck CHECK (direction IN ('inbound','outbound'))
);

CREATE INDEX IF NOT EXISTS idx_prospect_interactions_prospect
  ON public.prospect_interactions(prospect_id, created_at DESC);

-- ── 3. Table prospect_campaigns ────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.prospect_campaigns (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name               TEXT NOT NULL,
  description        TEXT,
  target_segment     TEXT,                    -- educational|public|liberal|pme
  target_filters     JSONB NOT NULL DEFAULT '{}'::jsonb,
  brevo_list_id      INTEGER,
  brevo_workflow_id  INTEGER,
  status             TEXT NOT NULL DEFAULT 'draft', -- draft|active|paused|archived
  created_by         UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT prospect_campaigns_status_ck CHECK (
    status IN ('draft','active','paused','archived')
  ),
  CONSTRAINT prospect_campaigns_segment_ck CHECK (
    target_segment IS NULL OR target_segment IN ('educational','public','liberal','pme')
  )
);

CREATE INDEX IF NOT EXISTS idx_prospect_campaigns_status ON public.prospect_campaigns(status);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_prospect_campaigns_updated_at'
  ) THEN
    CREATE TRIGGER trg_prospect_campaigns_updated_at
      BEFORE UPDATE ON public.prospect_campaigns
      FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END $$;

-- ── 4. Pivot prospect_enrollments ──────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.prospect_enrollments (
  prospect_id     UUID NOT NULL REFERENCES public.prospects(id) ON DELETE CASCADE,
  campaign_id     UUID NOT NULL REFERENCES public.prospect_campaigns(id) ON DELETE CASCADE,
  enrolled_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  unsubscribed_at TIMESTAMPTZ,
  bounced_at      TIMESTAMPTZ,
  last_event      TEXT,                       -- sent|delivered|opened|clicked|replied|unsub|bounce
  last_event_at   TIMESTAMPTZ,
  PRIMARY KEY (prospect_id, campaign_id)
);

CREATE INDEX IF NOT EXISTS idx_prospect_enrollments_campaign
  ON public.prospect_enrollments(campaign_id);
CREATE INDEX IF NOT EXISTS idx_prospect_enrollments_active
  ON public.prospect_enrollments(campaign_id)
  WHERE unsubscribed_at IS NULL AND bounced_at IS NULL;

-- ── 5. Lier crm_pipeline aux prospects ─────────────────────────────────────

ALTER TABLE public.crm_pipeline
  ADD COLUMN IF NOT EXISTS prospect_id UUID REFERENCES public.prospects(id) ON DELETE SET NULL;

-- Rendre profile_id nullable (aujourd'hui NOT NULL de fait — on assouplit)
ALTER TABLE public.crm_pipeline ALTER COLUMN profile_id DROP NOT NULL;

-- Au moins un des deux doit être présent
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'crm_pipeline_subject_ck'
  ) THEN
    ALTER TABLE public.crm_pipeline
      ADD CONSTRAINT crm_pipeline_subject_ck
      CHECK (profile_id IS NOT NULL OR prospect_id IS NOT NULL);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_pipeline_prospect ON public.crm_pipeline(prospect_id);

-- ── 6. RLS : admin + super_admin + commercial ──────────────────────────────

ALTER TABLE public.prospects             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prospect_interactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prospect_campaigns    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prospect_enrollments  ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.prospects             FORCE ROW LEVEL SECURITY;
ALTER TABLE public.prospect_interactions FORCE ROW LEVEL SECURITY;
ALTER TABLE public.prospect_campaigns    FORCE ROW LEVEL SECURITY;
ALTER TABLE public.prospect_enrollments  FORCE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname='prospection_staff_all' AND tablename='prospects') THEN
    CREATE POLICY prospection_staff_all ON public.prospects FOR ALL
      USING (
        public.has_role(auth.uid(), 'admin'::public.app_role)
        OR public.has_role(auth.uid(), 'super_admin'::public.app_role)
        OR public.has_role(auth.uid(), 'commercial'::public.app_role)
      );
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname='prospect_interactions_staff_all' AND tablename='prospect_interactions') THEN
    CREATE POLICY prospect_interactions_staff_all ON public.prospect_interactions FOR ALL
      USING (
        public.has_role(auth.uid(), 'admin'::public.app_role)
        OR public.has_role(auth.uid(), 'super_admin'::public.app_role)
        OR public.has_role(auth.uid(), 'commercial'::public.app_role)
      );
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname='prospect_campaigns_staff_all' AND tablename='prospect_campaigns') THEN
    CREATE POLICY prospect_campaigns_staff_all ON public.prospect_campaigns FOR ALL
      USING (
        public.has_role(auth.uid(), 'admin'::public.app_role)
        OR public.has_role(auth.uid(), 'super_admin'::public.app_role)
        OR public.has_role(auth.uid(), 'commercial'::public.app_role)
      );
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname='prospect_enrollments_staff_all' AND tablename='prospect_enrollments') THEN
    CREATE POLICY prospect_enrollments_staff_all ON public.prospect_enrollments FOR ALL
      USING (
        public.has_role(auth.uid(), 'admin'::public.app_role)
        OR public.has_role(auth.uid(), 'super_admin'::public.app_role)
        OR public.has_role(auth.uid(), 'commercial'::public.app_role)
      );
  END IF;
END $$;

-- ── 7. Fonction promote_prospect_to_client() ───────────────────────────────
-- Convertit un prospect en client B2B : crée un profile (si user_id fourni)
-- et un b2b_account. Rattache le pipeline existant. Marque le prospect converti.

CREATE OR REPLACE FUNCTION public.promote_prospect_to_client(
  p_prospect_id UUID,
  p_user_id     UUID DEFAULT NULL,
  p_display_name TEXT DEFAULT NULL
)
RETURNS TABLE (profile_id UUID, b2b_account_id UUID)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_prospect  public.prospects%ROWTYPE;
  v_profile   UUID;
  v_account   UUID;
  v_addr      JSONB;
BEGIN
  SELECT * INTO v_prospect FROM public.prospects WHERE id = p_prospect_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Prospect % introuvable', p_prospect_id;
  END IF;
  IF v_prospect.status = 'converted' THEN
    RAISE EXCEPTION 'Prospect % déjà converti (profile %)', p_prospect_id, v_prospect.converted_profile_id;
  END IF;

  -- Créer profile si user_id fourni (sinon on reste sur b2b_account seul, cas
  -- d'une conversion « vente directe magasin » sans compte en ligne)
  IF p_user_id IS NOT NULL THEN
    INSERT INTO public.profiles (user_id, display_name, client_type, lead_source, tags)
    VALUES (
      p_user_id,
      COALESCE(p_display_name, v_prospect.name),
      CASE v_prospect.client_segment
        WHEN 'educational' THEN 'collectivite'
        WHEN 'public'      THEN 'collectivite'
        ELSE 'b2b'
      END,
      'prospection',
      v_prospect.tags
    )
    ON CONFLICT (user_id) DO UPDATE SET
      lead_source = COALESCE(public.profiles.lead_source, 'prospection'),
      tags = array(SELECT DISTINCT unnest(public.profiles.tags || EXCLUDED.tags))
    RETURNING id INTO v_profile;
  END IF;

  -- Créer b2b_account avec les colonnes SIRENE déjà disponibles côté prospect
  v_addr := v_prospect.address;
  INSERT INTO public.b2b_accounts (
    name, siret, phone, email, billing_address, is_active, payment_terms,
    naf_code, naf_label, legal_form, founded_date, employee_range,
    sirene_raw, sirene_synced_at
  ) VALUES (
    v_prospect.name,
    v_prospect.siret,
    v_prospect.contact_phone,
    v_prospect.contact_email,
    CASE
      WHEN v_addr IS NULL THEN NULL
      ELSE jsonb_build_object(
        'street',   COALESCE(v_addr->>'street', ''),
        'zip_code', COALESCE(v_addr->>'zip', ''),
        'city',     COALESCE(v_addr->>'city', ''),
        'country',  'FR'
      )
    END,
    true,
    30,
    v_prospect.naf_code,
    v_prospect.naf_label,
    v_prospect.legal_form,
    v_prospect.founded_date,
    v_prospect.employee_range,
    v_prospect.sirene_raw,
    v_prospect.sirene_synced_at
  )
  RETURNING id INTO v_account;

  -- Lier l'utilisateur au compte si fourni
  IF p_user_id IS NOT NULL THEN
    INSERT INTO public.b2b_company_users (account_id, user_id, role, is_primary)
    VALUES (v_account, p_user_id, 'admin', true)
    ON CONFLICT DO NOTHING;
  END IF;

  -- Rattacher pipeline existant
  UPDATE public.crm_pipeline
  SET profile_id = COALESCE(v_profile, profile_id)
  WHERE prospect_id = p_prospect_id;

  -- Marquer prospect converti
  UPDATE public.prospects
  SET status = 'converted',
      converted_profile_id = v_profile,
      converted_at = now()
  WHERE id = p_prospect_id;

  profile_id := v_profile;
  b2b_account_id := v_account;
  RETURN NEXT;
END;
$$;

COMMENT ON FUNCTION public.promote_prospect_to_client IS
  'Convertit un prospect en client : crée profile (optionnel) + b2b_account, rattache crm_pipeline, marque prospect converti.';

REVOKE ALL ON FUNCTION public.promote_prospect_to_client(UUID, UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.promote_prospect_to_client(UUID, UUID, TEXT) TO authenticated;
