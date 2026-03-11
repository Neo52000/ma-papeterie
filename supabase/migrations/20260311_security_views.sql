-- ═══════════════════════════════════════════════════════════════════════════
-- Vues de monitoring de sécurité pour le dashboard admin
-- ═══════════════════════════════════════════════════════════════════════════

-- ── IPs les plus actives (rate limiting) ────────────────────────────────────
CREATE OR REPLACE VIEW security_top_rate_limited AS
SELECT key, count, window_start
FROM rate_limit_entries
WHERE window_start > NOW() - INTERVAL '1 hour'
ORDER BY count DESC
LIMIT 20;

-- ── Actions d'audit récentes (24h) ─────────────────────────────────────────
CREATE OR REPLACE VIEW security_recent_audit AS
SELECT id, admin_email, action, resource_type, resource_id, created_at
FROM audit_logs
WHERE created_at > NOW() - INTERVAL '24 hours'
ORDER BY created_at DESC
LIMIT 50;

-- ── Commandes suspectes (montant élevé, dernières 24h) ──────────────────────
CREATE OR REPLACE VIEW security_suspicious_orders AS
SELECT id, user_id, total_amount, created_at
FROM orders
WHERE total_amount > 500
  AND created_at > NOW() - INTERVAL '24 hours'
ORDER BY total_amount DESC;

-- ── Événements Stripe récents (24h) ────────────────────────────────────────
CREATE OR REPLACE VIEW security_recent_stripe_events AS
SELECT stripe_event_id, event_type, processed_at
FROM stripe_events
WHERE processed_at > NOW() - INTERVAL '24 hours'
ORDER BY processed_at DESC
LIMIT 50;

-- ── Requêtes GDPR en cours ─────────────────────────────────────────────────
CREATE OR REPLACE VIEW security_pending_gdpr AS
SELECT id, user_id, request_type, status, created_at
FROM gdpr_requests
WHERE status IN ('pending', 'processing')
ORDER BY created_at ASC;
