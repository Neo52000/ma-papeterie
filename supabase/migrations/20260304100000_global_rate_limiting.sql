-- ── Rate limiting global via Supabase ────────────────────────────────────────
-- Table de compteurs partagée entre toutes les instances Deno.

CREATE TABLE IF NOT EXISTS rate_limit_entries (
  key         TEXT        NOT NULL PRIMARY KEY,
  count       INTEGER     NOT NULL DEFAULT 1,
  window_start TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index pour le nettoyage automatique
CREATE INDEX IF NOT EXISTS idx_rate_limit_window
  ON rate_limit_entries (window_start);

-- Désactiver RLS (table interne, accédée uniquement via service_role)
ALTER TABLE rate_limit_entries ENABLE ROW LEVEL SECURITY;

-- ── Fonction atomique de vérification / incrémentation ──────────────────────
CREATE OR REPLACE FUNCTION check_rate_limit_fn(
  p_key           TEXT,
  p_max_requests  INTEGER DEFAULT 30,
  p_window_seconds INTEGER DEFAULT 60
) RETURNS BOOLEAN
LANGUAGE plpgsql
AS $$
DECLARE
  v_count        INTEGER;
  v_window_start TIMESTAMPTZ;
  v_cutoff       TIMESTAMPTZ := now() - make_interval(secs => p_window_seconds);
BEGIN
  -- Tenter de verrouiller l'entrée existante
  SELECT count, window_start
    INTO v_count, v_window_start
    FROM rate_limit_entries
   WHERE key = p_key
     FOR UPDATE;

  IF NOT FOUND THEN
    -- Nouvelle entrée
    INSERT INTO rate_limit_entries (key, count, window_start)
    VALUES (p_key, 1, now())
    ON CONFLICT (key) DO UPDATE
      SET count = 1, window_start = now();
    RETURN TRUE;
  END IF;

  -- Fenêtre expirée → reset
  IF v_window_start < v_cutoff THEN
    UPDATE rate_limit_entries
       SET count = 1, window_start = now()
     WHERE key = p_key;
    RETURN TRUE;
  END IF;

  -- Limite dépassée
  IF v_count >= p_max_requests THEN
    RETURN FALSE;
  END IF;

  -- Incrémenter
  UPDATE rate_limit_entries
     SET count = count + 1
   WHERE key = p_key;
  RETURN TRUE;
END;
$$;

-- ── Nettoyage des entrées expirées (appelé par nightly-rollup) ──────────────
CREATE OR REPLACE FUNCTION cleanup_rate_limits()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  DELETE FROM rate_limit_entries
   WHERE window_start < now() - INTERVAL '10 minutes';
END;
$$;
