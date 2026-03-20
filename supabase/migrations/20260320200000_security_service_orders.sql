-- ─────────────────────────────────────────────────────────────────────────────
-- 20260320200000_security_service_orders.sql
-- Addendum sécurité pour les tables service_orders & service_order_items
-- Prérequis : 20260320100002_service_orders.sql (tables + RLS de base)
-- ─────────────────────────────────────────────────────────────────────────────

-- ═══════════════════════════════════════════════════════════════════════════════
-- 1. FORCE ROW LEVEL SECURITY
--    Le script 20260310_security_hardening.sql a tourné AVANT la création
--    de ces tables → on applique FORCE RLS maintenant.
-- ═══════════════════════════════════════════════════════════════════════════════

ALTER TABLE service_orders FORCE ROW LEVEL SECURITY;
ALTER TABLE service_order_items FORCE ROW LEVEL SECURITY;

-- ═══════════════════════════════════════════════════════════════════════════════
-- 2. POLITIQUES STORAGE — Bucket service-orders
--    - Upload : anon + authenticated, dans un sous-dossier
--    - Lecture : admin uniquement (clients reçoivent des URLs signées)
--    - Suppression : uniquement via service_role (pg_cron cleanup)
-- ═══════════════════════════════════════════════════════════════════════════════

-- Upload : tout le monde peut uploader dans le bucket
-- MAIS seulement dans un dossier (premier segment du path doit exister)
CREATE POLICY "Upload to service-orders"
  ON storage.objects FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    bucket_id = 'service-orders'
    AND (storage.foldername(name))[1] IS NOT NULL
  );

-- Lecture : uniquement l'admin (les clients reçoivent les fichiers via URL signée)
CREATE POLICY "Admin can read service files"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'service-orders'
    AND EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Pas de politique DELETE côté client.
-- Les suppressions se font uniquement via service_role (backend / pg_cron).

-- ═══════════════════════════════════════════════════════════════════════════════
-- 3. AUDIT TRIGGER — service_orders
--    Log toute modification ou suppression dans audit_logs
--    (même pattern que orders_audit_trigger dans 20260310_security_hardening.sql)
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.audit_service_order_changes()
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
      'service_orders',
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
      'service_orders',
      NEW.id,
      jsonb_build_object('old', row_to_json(OLD), 'new', row_to_json(NEW))
    );
    RETURN NEW;
  END IF;
END;
$$;

DROP TRIGGER IF EXISTS service_orders_audit_trigger ON service_orders;
CREATE TRIGGER service_orders_audit_trigger
  AFTER UPDATE OR DELETE ON service_orders
  FOR EACH ROW EXECUTE FUNCTION public.audit_service_order_changes();
