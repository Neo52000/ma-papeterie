-- =============================================================================
-- Module Pilotage — Schema complet
-- Date : 2026-04-18
-- Auteur : Claude (god mode) pour ma-papeterie.fr
--
-- Dépendances attendues (mapping ma-papeterie) :
--   - Table `orders` (id, created_at, total_amount [TTC], user_id, customer_email, status, payment_status)
--     → Pas de total_ht/total_ttc séparés : HT dérivé de total_amount / 1.20 (A1)
--     → Pas de source_name : POS récupéré depuis shopify_orders (B1)
--     → Pas de customer_id : on utilise user_id + customer_email
--   - Table `order_items` (id, order_id, product_id, quantity, product_price)
--     → Pas de cost_ht figé : calculé à la volée via products.cost_price
--   - Table `products` (id, cost_price, price_ht, price_ttc)
--   - Table `b2b_accounts` (id, name, email, …) → utilisée pour détecter le B2B via email (C1)
--   - Table `shopify_orders` (source_name, total_price, financial_status, shopify_created_at)
--   - Table `user_roles` (user_id, role enum app_role : admin/user/super_admin)
--     → RLS admin-only via user_roles IN ('admin', 'super_admin') (D1)
--   - Extension pg_cron activée
--   - Extension pg_net activée (pour appels http depuis cron)
-- =============================================================================

-- -----------------------------------------------------------------------------
-- TYPES ENUM
-- -----------------------------------------------------------------------------

-- Note : PostgreSQL ne supporte pas CREATE TYPE IF NOT EXISTS → DO block
DO $$ BEGIN
  CREATE TYPE pilotage_channel AS ENUM ('web_b2c', 'web_b2b', 'pos', 'all');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE pilotage_period AS ENUM ('day', 'week', 'month', 'quarter', 'year');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE pilotage_alert_severity AS ENUM ('info', 'warning', 'critical');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE pilotage_alert_status AS ENUM ('active', 'acknowledged', 'resolved', 'dismissed');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE pilotage_coach_role AS ENUM ('system', 'user', 'assistant');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- -----------------------------------------------------------------------------
-- TABLE : pilotage_snapshots
-- Snapshot quotidien des KPI, calculé par le cron pilotage-compute-kpi-snapshot
-- Une ligne par (date, canal) → time-series exploitable par Recharts
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS pilotage_snapshots (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  snapshot_date    DATE NOT NULL,
  channel          pilotage_channel NOT NULL,

  -- CA & Marge
  ca_ht            NUMERIC(12,2) NOT NULL DEFAULT 0,
  ca_ttc           NUMERIC(12,2) NOT NULL DEFAULT 0,
  cogs_ht          NUMERIC(12,2) NOT NULL DEFAULT 0, -- Coût des marchandises vendues
  marge_brute      NUMERIC(12,2) NOT NULL DEFAULT 0,
  taux_marge       NUMERIC(5,2)  NOT NULL DEFAULT 0, -- %

  -- Commandes
  nb_orders        INTEGER NOT NULL DEFAULT 0,
  nb_orders_paid   INTEGER NOT NULL DEFAULT 0,
  panier_moyen_ht  NUMERIC(10,2) NOT NULL DEFAULT 0,

  -- Clients
  nb_customers_unique    INTEGER NOT NULL DEFAULT 0,
  nb_customers_new       INTEGER NOT NULL DEFAULT 0,
  nb_customers_returning INTEGER NOT NULL DEFAULT 0,

  -- Trésorerie (encaissements réels)
  encaissements_ttc      NUMERIC(12,2) NOT NULL DEFAULT 0,
  -- Créances en attente (commandes livrées non payées)
  creances_pendantes_ttc NUMERIC(12,2) NOT NULL DEFAULT 0,

  -- Métriques spécifiques POS (si channel = 'pos')
  nb_transactions_pos    INTEGER,
  ticket_moyen_pos_ttc   NUMERIC(10,2),

  -- Métriques webs (si channel = 'web_b2c' ou 'web_b2b')
  nb_sessions            INTEGER, -- alimenté si tu branches GA/Plausible plus tard
  taux_conversion        NUMERIC(5,2), -- %

  -- Meta
  computed_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  raw_data         JSONB, -- payload détaillé pour audit/drill-down

  UNIQUE (snapshot_date, channel)
);

CREATE INDEX IF NOT EXISTS idx_pilotage_snapshots_date        ON pilotage_snapshots (snapshot_date DESC);
CREATE INDEX IF NOT EXISTS idx_pilotage_snapshots_channel     ON pilotage_snapshots (channel);
CREATE INDEX IF NOT EXISTS idx_pilotage_snapshots_date_chan   ON pilotage_snapshots (snapshot_date DESC, channel);

COMMENT ON TABLE pilotage_snapshots IS 'Snapshots KPI journaliers par canal (web_b2c, web_b2b, pos, all)';

-- -----------------------------------------------------------------------------
-- TABLE : pilotage_goals
-- Objectifs mensuels / trimestriels / annuels définis par le dirigeant
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS pilotage_goals (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  period           pilotage_period NOT NULL, -- month, quarter, year
  period_start     DATE NOT NULL,            -- premier jour de la période
  period_end       DATE NOT NULL,            -- dernier jour de la période
  channel          pilotage_channel NOT NULL DEFAULT 'all',

  -- Objectifs chiffrés
  objectif_ca_ht           NUMERIC(12,2),
  objectif_marge_brute     NUMERIC(12,2),
  objectif_taux_marge      NUMERIC(5,2),
  objectif_nb_orders       INTEGER,
  objectif_panier_moyen_ht NUMERIC(10,2),

  -- Notes et contexte
  notes            TEXT,

  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE (period, period_start, channel)
);

CREATE INDEX IF NOT EXISTS idx_pilotage_goals_period ON pilotage_goals (period, period_start DESC);

COMMENT ON TABLE pilotage_goals IS 'Objectifs prévisionnels du dirigeant (mensuel, trimestriel, annuel)';

-- -----------------------------------------------------------------------------
-- TABLE : pilotage_alert_rules
-- Règles d'alerte paramétrables (seuils, conditions)
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS pilotage_alert_rules (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name             TEXT NOT NULL,
  description      TEXT,
  metric           TEXT NOT NULL, -- ex: 'taux_marge', 'ca_ht_vs_objectif', 'creances_pendantes_ttc'
  operator         TEXT NOT NULL CHECK (operator IN ('<', '<=', '>', '>=', '=', 'delta_pct_down', 'delta_pct_up')),
  threshold        NUMERIC(12,2) NOT NULL,
  channel          pilotage_channel NOT NULL DEFAULT 'all',
  severity         pilotage_alert_severity NOT NULL DEFAULT 'warning',
  is_active        BOOLEAN NOT NULL DEFAULT TRUE,

  -- Fenêtre de comparaison (pour les deltas)
  comparison_window_days INTEGER DEFAULT 7,

  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE pilotage_alert_rules IS 'Règles d''alerte configurables (marge basse, chute de CA, créances élevées, etc.)';

-- -----------------------------------------------------------------------------
-- TABLE : pilotage_alerts
-- Alertes déclenchées (historique + alertes actives)
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS pilotage_alerts (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_id          UUID REFERENCES pilotage_alert_rules(id) ON DELETE SET NULL,
  severity         pilotage_alert_severity NOT NULL,
  status           pilotage_alert_status NOT NULL DEFAULT 'active',
  title            TEXT NOT NULL,
  message          TEXT NOT NULL,
  metric           TEXT,
  metric_value     NUMERIC(12,2),
  threshold        NUMERIC(12,2),
  channel          pilotage_channel,
  triggered_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  acknowledged_at  TIMESTAMPTZ,
  resolved_at      TIMESTAMPTZ,
  context_data     JSONB -- snapshot utile pour le coach
);

CREATE INDEX IF NOT EXISTS idx_pilotage_alerts_status   ON pilotage_alerts (status) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_pilotage_alerts_triggered ON pilotage_alerts (triggered_at DESC);

COMMENT ON TABLE pilotage_alerts IS 'Alertes déclenchées par les règles de pilotage';

-- -----------------------------------------------------------------------------
-- TABLE : pilotage_coach_conversations
-- Conversations avec le Coach IA Claude
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS pilotage_coach_conversations (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title            TEXT NOT NULL DEFAULT 'Nouvelle conversation',
  summary          TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_message_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  archived         BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE INDEX IF NOT EXISTS idx_coach_conv_recent
  ON pilotage_coach_conversations (last_message_at DESC)
  WHERE archived = FALSE;

-- -----------------------------------------------------------------------------
-- TABLE : pilotage_coach_messages
-- Messages individuels dans une conversation (user + assistant)
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS pilotage_coach_messages (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id  UUID NOT NULL REFERENCES pilotage_coach_conversations(id) ON DELETE CASCADE,
  role             pilotage_coach_role NOT NULL,
  content          TEXT NOT NULL,
  kpi_snapshot     JSONB, -- snapshot des KPI au moment du message (context-awareness)
  model            TEXT,  -- ex: 'claude-sonnet-4-20250514'
  tokens_input     INTEGER,
  tokens_output    INTEGER,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_coach_msg_conv ON pilotage_coach_messages (conversation_id, created_at);

-- Trigger : mettre à jour last_message_at à chaque nouveau message
CREATE OR REPLACE FUNCTION update_conversation_last_message() RETURNS TRIGGER AS $$
BEGIN
  UPDATE pilotage_coach_conversations
  SET last_message_at = NEW.created_at, updated_at = NOW()
  WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_update_conv_last_message ON pilotage_coach_messages;
CREATE TRIGGER trg_update_conv_last_message
  AFTER INSERT ON pilotage_coach_messages
  FOR EACH ROW EXECUTE FUNCTION update_conversation_last_message();

-- -----------------------------------------------------------------------------
-- VUE MATÉRIALISÉE : mv_pilotage_overview_current
-- One-page dashboard : KPI du jour, 7j, 30j, 90j + deltas
-- Refresh quotidien par cron
-- -----------------------------------------------------------------------------

CREATE MATERIALIZED VIEW IF NOT EXISTS mv_pilotage_overview_current AS
WITH
  today AS (
    SELECT CURRENT_DATE AS today_date
  ),
  period_7d AS (
    SELECT
      channel,
      SUM(ca_ht)              AS ca_ht_7d,
      SUM(marge_brute)        AS marge_brute_7d,
      AVG(taux_marge)         AS taux_marge_7d,
      SUM(nb_orders)          AS nb_orders_7d,
      SUM(encaissements_ttc)  AS encaissements_7d
    FROM pilotage_snapshots, today
    WHERE snapshot_date > today.today_date - INTERVAL '7 days'
      AND snapshot_date <= today.today_date
    GROUP BY channel
  ),
  period_30d AS (
    SELECT
      channel,
      SUM(ca_ht)              AS ca_ht_30d,
      SUM(marge_brute)        AS marge_brute_30d,
      AVG(taux_marge)         AS taux_marge_30d,
      SUM(nb_orders)          AS nb_orders_30d,
      SUM(encaissements_ttc)  AS encaissements_30d,
      AVG(panier_moyen_ht)    AS panier_moyen_30d
    FROM pilotage_snapshots, today
    WHERE snapshot_date > today.today_date - INTERVAL '30 days'
      AND snapshot_date <= today.today_date
    GROUP BY channel
  ),
  period_30d_prev AS (
    SELECT
      channel,
      SUM(ca_ht)       AS ca_ht_30d_prev,
      SUM(marge_brute) AS marge_brute_30d_prev,
      AVG(taux_marge)  AS taux_marge_30d_prev
    FROM pilotage_snapshots, today
    WHERE snapshot_date > today.today_date - INTERVAL '60 days'
      AND snapshot_date <= today.today_date - INTERVAL '30 days'
    GROUP BY channel
  ),
  period_90d AS (
    SELECT
      channel,
      SUM(ca_ht)              AS ca_ht_90d,
      SUM(marge_brute)        AS marge_brute_90d,
      SUM(encaissements_ttc)  AS encaissements_90d
    FROM pilotage_snapshots, today
    WHERE snapshot_date > today.today_date - INTERVAL '90 days'
      AND snapshot_date <= today.today_date
    GROUP BY channel
  )
SELECT
  COALESCE(p7.channel, p30.channel, p90.channel)              AS channel,
  COALESCE(p7.ca_ht_7d, 0)                                    AS ca_ht_7d,
  COALESCE(p7.marge_brute_7d, 0)                              AS marge_brute_7d,
  COALESCE(p7.taux_marge_7d, 0)                               AS taux_marge_7d,
  COALESCE(p7.nb_orders_7d, 0)                                AS nb_orders_7d,
  COALESCE(p7.encaissements_7d, 0)                            AS encaissements_7d,
  COALESCE(p30.ca_ht_30d, 0)                                  AS ca_ht_30d,
  COALESCE(p30.marge_brute_30d, 0)                            AS marge_brute_30d,
  COALESCE(p30.taux_marge_30d, 0)                             AS taux_marge_30d,
  COALESCE(p30.nb_orders_30d, 0)                              AS nb_orders_30d,
  COALESCE(p30.encaissements_30d, 0)                          AS encaissements_30d,
  COALESCE(p30.panier_moyen_30d, 0)                           AS panier_moyen_30d,
  COALESCE(p30p.ca_ht_30d_prev, 0)                            AS ca_ht_30d_prev,
  COALESCE(p30p.marge_brute_30d_prev, 0)                      AS marge_brute_30d_prev,
  COALESCE(p30p.taux_marge_30d_prev, 0)                       AS taux_marge_30d_prev,
  -- Delta % vs période précédente
  CASE WHEN COALESCE(p30p.ca_ht_30d_prev, 0) = 0 THEN 0
       ELSE ROUND(((p30.ca_ht_30d - p30p.ca_ht_30d_prev) / p30p.ca_ht_30d_prev * 100)::NUMERIC, 2)
  END                                                         AS ca_delta_pct,
  CASE WHEN COALESCE(p30p.marge_brute_30d_prev, 0) = 0 THEN 0
       ELSE ROUND(((p30.marge_brute_30d - p30p.marge_brute_30d_prev) / p30p.marge_brute_30d_prev * 100)::NUMERIC, 2)
  END                                                         AS marge_delta_pct,
  COALESCE(p90.ca_ht_90d, 0)                                  AS ca_ht_90d,
  COALESCE(p90.marge_brute_90d, 0)                            AS marge_brute_90d,
  COALESCE(p90.encaissements_90d, 0)                          AS encaissements_90d,
  NOW()                                                       AS refreshed_at
FROM period_7d p7
FULL OUTER JOIN period_30d p30 ON p30.channel = p7.channel
FULL OUTER JOIN period_30d_prev p30p ON p30p.channel = COALESCE(p7.channel, p30.channel)
FULL OUTER JOIN period_90d p90 ON p90.channel = COALESCE(p7.channel, p30.channel, p30p.channel);

CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_overview_channel ON mv_pilotage_overview_current (channel);

-- -----------------------------------------------------------------------------
-- VUE MATÉRIALISÉE : mv_pilotage_tresorerie_projection
-- Projection de trésorerie sur 30 jours à partir des commandes B2B en attente
-- -----------------------------------------------------------------------------

-- Adaptation ma-papeterie :
-- - orders.total_ttc n'existe pas → on utilise total_amount (TTC confirmé)
-- - Pas de colonne customers/b2b_flag → B2B détecté via EXISTS sur b2b_accounts.email (choix C1)
-- - orders.source_name n'existe pas → POS récupéré séparément depuis shopify_orders (choix B1)
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_pilotage_tresorerie_projection AS
WITH orders_enriched AS (
  SELECT
    o.id,
    o.created_at,
    o.total_amount,
    o.status,
    o.payment_status,
    o.customer_email,
    EXISTS (
      SELECT 1 FROM b2b_accounts b
      WHERE LOWER(b.email) = LOWER(o.customer_email)
    ) AS is_b2b
  FROM orders o
  WHERE o.created_at >= NOW() - INTERVAL '120 days'
    AND o.status NOT IN ('cancelled', 'refunded', 'draft')
)
SELECT
  -- Date prévue d'encaissement : B2B non payé = +30j (délai de paiement standard), sinon J
  CASE
    WHEN payment_status IN ('paid', 'captured') THEN created_at::DATE
    WHEN is_b2b THEN (created_at + INTERVAL '30 days')::DATE
    ELSE created_at::DATE
  END                                         AS encaissement_prevu_date,
  CASE
    WHEN is_b2b THEN 'web_b2b'::pilotage_channel
    ELSE 'web_b2c'::pilotage_channel
  END                                         AS channel,
  payment_status,
  SUM(total_amount)                           AS montant_ttc,
  COUNT(*)                                    AS nb_orders
FROM orders_enriched
GROUP BY encaissement_prevu_date, channel, payment_status
UNION ALL
-- POS : Shopify POS est toujours encaissé cash, payment = transaction_date
SELECT
  so.shopify_created_at::DATE                 AS encaissement_prevu_date,
  'pos'::pilotage_channel                     AS channel,
  COALESCE(so.financial_status, 'paid')       AS payment_status,
  SUM(COALESCE(so.total_price, 0))            AS montant_ttc,
  COUNT(*)                                    AS nb_orders
FROM shopify_orders so
WHERE so.source_name = 'pos'
  AND so.shopify_created_at >= NOW() - INTERVAL '120 days'
GROUP BY so.shopify_created_at::DATE, so.financial_status;

CREATE INDEX IF NOT EXISTS idx_mv_tresorerie_date
  ON mv_pilotage_tresorerie_projection (encaissement_prevu_date);

-- -----------------------------------------------------------------------------
-- FONCTION : refresh_pilotage_materialized_views
-- Rafraîchit toutes les vues matérialisées (appelée par cron)
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION refresh_pilotage_materialized_views() RETURNS VOID AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_pilotage_overview_current;
  REFRESH MATERIALIZED VIEW mv_pilotage_tresorerie_projection;
END;
$$ LANGUAGE plpgsql;

-- -----------------------------------------------------------------------------
-- FONCTION : get_pilotage_timeseries
-- RPC — Renvoie une time-series propre pour Recharts
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION get_pilotage_timeseries(
  p_start_date DATE,
  p_end_date   DATE,
  p_channel    pilotage_channel DEFAULT 'all'
) RETURNS TABLE (
  snapshot_date   DATE,
  ca_ht           NUMERIC,
  marge_brute     NUMERIC,
  taux_marge      NUMERIC,
  nb_orders       INTEGER,
  panier_moyen_ht NUMERIC,
  encaissements_ttc NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    s.snapshot_date,
    s.ca_ht,
    s.marge_brute,
    s.taux_marge,
    s.nb_orders,
    s.panier_moyen_ht,
    s.encaissements_ttc
  FROM pilotage_snapshots s
  WHERE s.channel = p_channel
    AND s.snapshot_date >= p_start_date
    AND s.snapshot_date <= p_end_date
  ORDER BY s.snapshot_date ASC;
END;
$$ LANGUAGE plpgsql STABLE;

-- -----------------------------------------------------------------------------
-- FONCTION : get_goal_progress
-- RPC — Calcule le taux d'avancement vs objectif pour une période donnée
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION get_goal_progress(
  p_period pilotage_period,
  p_date   DATE DEFAULT CURRENT_DATE
) RETURNS TABLE (
  goal_id            UUID,
  period_start       DATE,
  period_end         DATE,
  channel            pilotage_channel,
  objectif_ca_ht     NUMERIC,
  realise_ca_ht      NUMERIC,
  progression_pct    NUMERIC,
  jours_restants     INTEGER,
  rythme_quotidien_requis NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    g.id AS goal_id,
    g.period_start,
    g.period_end,
    g.channel,
    g.objectif_ca_ht,
    COALESCE(SUM(s.ca_ht), 0) AS realise_ca_ht,
    CASE WHEN g.objectif_ca_ht > 0
         THEN ROUND((COALESCE(SUM(s.ca_ht), 0) / g.objectif_ca_ht * 100)::NUMERIC, 2)
         ELSE 0
    END AS progression_pct,
    GREATEST(0, (g.period_end - p_date)::INTEGER) AS jours_restants,
    CASE WHEN (g.period_end - p_date)::INTEGER > 0
         THEN ROUND(((g.objectif_ca_ht - COALESCE(SUM(s.ca_ht), 0)) / (g.period_end - p_date)::NUMERIC)::NUMERIC, 2)
         ELSE 0
    END AS rythme_quotidien_requis
  FROM pilotage_goals g
  LEFT JOIN pilotage_snapshots s
    ON s.channel = g.channel
    AND s.snapshot_date >= g.period_start
    AND s.snapshot_date <= LEAST(g.period_end, p_date)
  WHERE g.period = p_period
    AND g.period_start <= p_date
    AND g.period_end >= p_date
  GROUP BY g.id, g.period_start, g.period_end, g.channel, g.objectif_ca_ht;
END;
$$ LANGUAGE plpgsql STABLE;

-- -----------------------------------------------------------------------------
-- ROW-LEVEL SECURITY
-- Admin-only : tout le module pilotage est réservé aux rôles admin/manager
-- -----------------------------------------------------------------------------

ALTER TABLE pilotage_snapshots            ENABLE ROW LEVEL SECURITY;
ALTER TABLE pilotage_goals                ENABLE ROW LEVEL SECURITY;
ALTER TABLE pilotage_alert_rules          ENABLE ROW LEVEL SECURITY;
ALTER TABLE pilotage_alerts               ENABLE ROW LEVEL SECURITY;
ALTER TABLE pilotage_coach_conversations  ENABLE ROW LEVEL SECURITY;
ALTER TABLE pilotage_coach_messages       ENABLE ROW LEVEL SECURITY;

-- Policy générique admin-only
-- Adaptation ma-papeterie : rôles stockés dans `user_roles` (enum app_role : admin/user/super_admin)
-- cf. choix D1 — pas de colonne `role` sur profiles dans ce projet.
CREATE POLICY "pilotage_admin_all" ON pilotage_snapshots
  FOR ALL USING (
    auth.jwt() ->> 'role' = 'service_role'
    OR EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'super_admin'))
  );

CREATE POLICY "pilotage_goals_admin_all" ON pilotage_goals
  FOR ALL USING (
    auth.jwt() ->> 'role' = 'service_role'
    OR EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'super_admin'))
  );

CREATE POLICY "pilotage_alert_rules_admin_all" ON pilotage_alert_rules
  FOR ALL USING (
    auth.jwt() ->> 'role' = 'service_role'
    OR EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'super_admin'))
  );

CREATE POLICY "pilotage_alerts_admin_all" ON pilotage_alerts
  FOR ALL USING (
    auth.jwt() ->> 'role' = 'service_role'
    OR EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'super_admin'))
  );

CREATE POLICY "pilotage_coach_conv_admin_all" ON pilotage_coach_conversations
  FOR ALL USING (
    auth.jwt() ->> 'role' = 'service_role'
    OR EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'super_admin'))
  );

CREATE POLICY "pilotage_coach_msg_admin_all" ON pilotage_coach_messages
  FOR ALL USING (
    auth.jwt() ->> 'role' = 'service_role'
    OR EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'super_admin'))
  );

-- Les vues matérialisées ne supportent pas RLS directement
-- → Accès contrôlé par les policies sur les tables sources + GRANT

GRANT SELECT ON mv_pilotage_overview_current       TO authenticated;
GRANT SELECT ON mv_pilotage_tresorerie_projection  TO authenticated;
