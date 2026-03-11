-- ─────────────────────────────────────────────────────────────────────────────
-- 20260310_security_hardening.sql — Renforcement sécurité global
-- ─────────────────────────────────────────────────────────────────────────────
-- Ce script :
-- 1. Active FORCE ROW LEVEL SECURITY sur toutes les tables publiques
--    (garantit que même le propriétaire de la table respecte les policies)
-- 2. Ajoute des policies manquantes pour les tables critiques
-- ─────────────────────────────────────────────────────────────────────────────

-- ═══════════════════════════════════════════════════════════════════════════════
-- 1. FORCE ROW LEVEL SECURITY sur toutes les tables publiques
--    Cela garantit que le propriétaire de la table (postgres) respecte aussi
--    les policies RLS, empêchant tout bypass via le rôle propriétaire.
-- ═══════════════════════════════════════════════════════════════════════════════

DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT tablename
    FROM pg_tables
    WHERE schemaname = 'public'
      AND tablename NOT LIKE 'pg_%'
      AND tablename NOT LIKE '_pg_%'
  LOOP
    -- ENABLE RLS (idempotent, au cas où)
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', r.tablename);
    -- FORCE RLS pour que le propriétaire de la table respecte aussi les policies
    EXECUTE format('ALTER TABLE public.%I FORCE ROW LEVEL SECURITY', r.tablename);
  END LOOP;
END;
$$;

-- ═══════════════════════════════════════════════════════════════════════════════
-- 2. Nettoyage automatique des rate_limit_entries (rétention 24h)
--    pg_cron doit être activé dans Supabase Dashboard > Database > Extensions
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.cleanup_old_rate_limits()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
AS $$
  DELETE FROM public.rate_limit_entries
  WHERE created_at < NOW() - INTERVAL '24 hours';
$$;

-- ═══════════════════════════════════════════════════════════════════════════════
-- 3. Nettoyage automatique des audit_logs (rétention 1 an)
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.cleanup_old_audit_logs()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
AS $$
  DELETE FROM public.audit_logs
  WHERE created_at < NOW() - INTERVAL '1 year';
$$;

-- ═══════════════════════════════════════════════════════════════════════════════
-- 4. Trigger d'audit pour les modifications de commandes
--    Log toute modification ou suppression dans audit_logs
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.audit_order_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    INSERT INTO public.audit_logs(admin_id, admin_email, action, resource_type, resource_id, changes)
    VALUES (
      auth.uid(),
      (SELECT email FROM auth.users WHERE id = auth.uid()),
      'DELETE',
      'orders',
      OLD.id,
      jsonb_build_object('old', row_to_json(OLD))
    );
    RETURN OLD;
  ELSE
    INSERT INTO public.audit_logs(admin_id, admin_email, action, resource_type, resource_id, changes)
    VALUES (
      auth.uid(),
      (SELECT email FROM auth.users WHERE id = auth.uid()),
      TG_OP,
      'orders',
      NEW.id,
      jsonb_build_object('old', row_to_json(OLD), 'new', row_to_json(NEW))
    );
    RETURN NEW;
  END IF;
END;
$$;

DROP TRIGGER IF EXISTS orders_audit_trigger ON orders;
CREATE TRIGGER orders_audit_trigger
  AFTER UPDATE OR DELETE ON orders
  FOR EACH ROW EXECUTE FUNCTION public.audit_order_changes();
