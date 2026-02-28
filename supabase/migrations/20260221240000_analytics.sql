-- ─────────────────────────────────────────────────────────────────────────────
-- Analytics events v1 — tracking comportemental RGPD-friendly
-- ─────────────────────────────────────────────────────────────────────────────

-- ── Table principale ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.analytics_events (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type   TEXT NOT NULL,        -- page_view | product_viewed | search_performed | ...
  session_id   TEXT,                 -- UUID aléatoire par session navigateur (sessionStorage)
  user_hash    TEXT,                 -- SHA-256(user.id)[0:16] — non-réversible, aucun PII
  page_path    TEXT,                 -- chemin URL au moment de l'événement
  payload      JSONB NOT NULL DEFAULT '{}',  -- données spécifiques à l'event
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── Index pour les requêtes KPI ───────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_analytics_event_type  ON public.analytics_events(event_type);
CREATE INDEX IF NOT EXISTS idx_analytics_created_at  ON public.analytics_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_analytics_session     ON public.analytics_events(session_id);
CREATE INDEX IF NOT EXISTS idx_analytics_type_date   ON public.analytics_events(event_type, created_at DESC);

-- ── RLS ───────────────────────────────────────────────────────────────────────
ALTER TABLE public.analytics_events ENABLE ROW LEVEL SECURITY;

-- INSERT public : n'importe quel client peut envoyer ses propres events
-- (le consentement est vérifié côté client avant d'appeler track())
CREATE POLICY "analytics_public_insert" ON public.analytics_events
  FOR INSERT WITH CHECK (true);

-- SELECT admin seulement : les KPI ne sont visibles que par les admins
CREATE POLICY "analytics_admin_read" ON public.analytics_events
  FOR SELECT USING (
    public.is_admin()
  );

-- Pas de UPDATE ni DELETE : immutabilité des logs
-- (pas de policy → opération rejetée par défaut avec RLS activé)

-- ── Commentaires RGPD ─────────────────────────────────────────────────────────
COMMENT ON TABLE public.analytics_events IS
  'Events anonymisés — aucune PII directe. user_hash = SHA-256(user_id)[0:16]. Consent vérifié côté client.';
COMMENT ON COLUMN public.analytics_events.user_hash IS
  'Empreinte SHA-256 non-réversible du user_id Supabase (16 premiers hex). Jamais l''ID réel.';
COMMENT ON COLUMN public.analytics_events.session_id IS
  'UUID aléatoire généré par session navigateur. Stocké en sessionStorage, pas en cookie.';
