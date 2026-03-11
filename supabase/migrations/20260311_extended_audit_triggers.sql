-- ═══════════════════════════════════════════════════════════════════════════
-- Triggers d'audit étendus pour les actions sensibles
-- Complète le trigger existant audit_order_changes (20260310_security_hardening.sql)
-- ═══════════════════════════════════════════════════════════════════════════

-- ── Trigger générique pour les modifications sensibles ──────────────────────
CREATE OR REPLACE FUNCTION audit_sensitive_changes()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO audit_logs(admin_id, admin_email, action, resource_type, resource_id, changes, metadata)
  SELECT
    auth.uid(),
    COALESCE(
      (SELECT email FROM auth.users WHERE id = auth.uid()),
      'system'
    ),
    TG_OP,
    TG_TABLE_NAME,
    CASE WHEN TG_OP = 'DELETE' THEN OLD.id ELSE NEW.id END,
    jsonb_build_object(
      'before', CASE WHEN TG_OP = 'INSERT' THEN NULL ELSE row_to_json(OLD)::jsonb END,
      'after', CASE WHEN TG_OP = 'DELETE' THEN NULL ELSE row_to_json(NEW)::jsonb END
    ),
    jsonb_build_object('trigger', TG_NAME, 'table', TG_TABLE_NAME);

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ── Audit des changements de rôles utilisateurs ────────────────────────────
DROP TRIGGER IF EXISTS user_roles_audit_trigger ON user_roles;
CREATE TRIGGER user_roles_audit_trigger
  AFTER INSERT OR UPDATE OR DELETE ON user_roles
  FOR EACH ROW EXECUTE FUNCTION audit_sensitive_changes();

-- ── Audit des modifications de prix produits ────────────────────────────────
CREATE OR REPLACE FUNCTION audit_product_price_changes()
RETURNS TRIGGER AS $$
BEGIN
  -- Ne logger que si le prix a changé
  IF OLD.price_ht IS DISTINCT FROM NEW.price_ht
     OR OLD.price_ttc IS DISTINCT FROM NEW.price_ttc THEN
    INSERT INTO audit_logs(admin_id, admin_email, action, resource_type, resource_id, changes, metadata)
    SELECT
      auth.uid(),
      COALESCE(
        (SELECT email FROM auth.users WHERE id = auth.uid()),
        'system'
      ),
      'PRICE_CHANGE',
      'products',
      NEW.id,
      jsonb_build_object(
        'old_price_ht', OLD.price_ht,
        'new_price_ht', NEW.price_ht,
        'old_price_ttc', OLD.price_ttc,
        'new_price_ttc', NEW.price_ttc
      ),
      jsonb_build_object('product_name', NEW.name);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS products_price_audit_trigger ON products;
CREATE TRIGGER products_price_audit_trigger
  AFTER UPDATE ON products
  FOR EACH ROW EXECUTE FUNCTION audit_product_price_changes();

-- ── Audit des accès/modifications aux secrets admin ─────────────────────────
DROP TRIGGER IF EXISTS admin_secrets_audit_trigger ON admin_secrets;
CREATE TRIGGER admin_secrets_audit_trigger
  AFTER INSERT OR UPDATE OR DELETE ON admin_secrets
  FOR EACH ROW EXECUTE FUNCTION audit_sensitive_changes();
