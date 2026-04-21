-- ─────────────────────────────────────────────────────────────────────────────
-- B2B Accounts — Enrichissement SIRENE via API Recherche d'Entreprises (data.gouv)
-- ─────────────────────────────────────────────────────────────────────────────
-- Source API : https://recherche-entreprises.api.gouv.fr/search (INSEE SIRENE)
-- Pattern : auto-remplissage signup pro + sync périodique + cache 24h
-- ─────────────────────────────────────────────────────────────────────────────

-- ── 1. Colonnes SIRENE sur b2b_accounts ────────────────────────────────────

ALTER TABLE public.b2b_accounts
  ADD COLUMN IF NOT EXISTS siren            TEXT GENERATED ALWAYS AS (
    CASE
      WHEN siret IS NOT NULL AND length(siret) >= 9 THEN left(siret, 9)
      ELSE NULL
    END
  ) STORED,
  ADD COLUMN IF NOT EXISTS naf_code         TEXT,
  ADD COLUMN IF NOT EXISTS naf_label        TEXT,
  ADD COLUMN IF NOT EXISTS legal_form       TEXT,
  ADD COLUMN IF NOT EXISTS founded_date     DATE,
  ADD COLUMN IF NOT EXISTS employee_range   TEXT,
  ADD COLUMN IF NOT EXISTS sirene_raw       JSONB,
  ADD COLUMN IF NOT EXISTS sirene_synced_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_b2b_accounts_siren    ON public.b2b_accounts(siren);
CREATE INDEX IF NOT EXISTS idx_b2b_accounts_naf_code ON public.b2b_accounts(naf_code);
-- Unicité SIRET (tolérant les NULL) pour prévenir les doublons
CREATE UNIQUE INDEX IF NOT EXISTS idx_b2b_accounts_siret_unique
  ON public.b2b_accounts(siret)
  WHERE siret IS NOT NULL;

COMMENT ON COLUMN public.b2b_accounts.siren IS
  'Calculé automatiquement depuis les 9 premiers chiffres du SIRET (personne morale).';
COMMENT ON COLUMN public.b2b_accounts.naf_code IS
  'Code NAF rev.2 (ex: 85.10Z). Source : API Recherche d''Entreprises.';
COMMENT ON COLUMN public.b2b_accounts.employee_range IS
  'Tranche d''effectif salarié INSEE (ex: "20-49").';
COMMENT ON COLUMN public.b2b_accounts.sirene_raw IS
  'Payload brut data.gouv pour audit et re-calcul. Nullable si donnée non-diffusible.';

-- ── 2. Cache léger pour les réponses data.gouv ─────────────────────────────

CREATE TABLE IF NOT EXISTS public.sirene_cache (
  query_key   TEXT PRIMARY KEY,
  response    JSONB NOT NULL,
  expires_at  TIMESTAMPTZ NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sirene_cache_expires_at
  ON public.sirene_cache(expires_at);

COMMENT ON TABLE public.sirene_cache IS
  'Cache des réponses API Recherche d''Entreprises (TTL 24h). Évite de solliciter data.gouv.fr pour des requêtes répétées.';

-- ── 3. RLS sirene_cache ────────────────────────────────────────────────────
-- Aucun utilisateur final n'accède à cette table : l'edge function utilise le
-- service role pour lire/écrire. RLS activée mais aucune policy = zéro accès
-- via anon/authenticated, seule la clé service role passe (pattern standard).

ALTER TABLE public.sirene_cache ENABLE ROW LEVEL SECURITY;

-- ── 4. Purge automatique (purge entries expirées, appelée par l'edge fn) ──

CREATE OR REPLACE FUNCTION public.purge_sirene_cache()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_deleted INTEGER;
BEGIN
  DELETE FROM public.sirene_cache WHERE expires_at < now();
  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  RETURN v_deleted;
END;
$$;

COMMENT ON FUNCTION public.purge_sirene_cache IS
  'Supprime les entrées expirées de sirene_cache. Appelée par recherche-entreprises-search edge function.';
