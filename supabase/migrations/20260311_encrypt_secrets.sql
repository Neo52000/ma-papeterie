-- ═══════════════════════════════════════════════════════════════════════════
-- Fonctions de chiffrement/déchiffrement pour les données sensibles
-- Utilise pgcrypto (déjà activé via 20260310_fix_totp_validation.sql)
-- La clé app.encryption_key doit être configurée dans les secrets Supabase
-- ═══════════════════════════════════════════════════════════════════════════

-- Chiffrement symétrique PGP
CREATE OR REPLACE FUNCTION encrypt_sensitive(data TEXT)
RETURNS TEXT AS $$
  SELECT encode(
    pgp_sym_encrypt(data, current_setting('app.encryption_key', true)),
    'base64'
  );
$$ LANGUAGE sql SECURITY DEFINER;

-- Déchiffrement symétrique PGP
CREATE OR REPLACE FUNCTION decrypt_sensitive(data TEXT)
RETURNS TEXT AS $$
  SELECT pgp_sym_decrypt(
    decode(data, 'base64'),
    current_setting('app.encryption_key', true)
  );
$$ LANGUAGE sql SECURITY DEFINER;

-- Note : pour migrer les données existantes en clair vers le chiffré,
-- exécuter manuellement après avoir configuré app.encryption_key :
--
-- UPDATE admin_secrets
-- SET value = encrypt_sensitive(value)
-- WHERE value NOT LIKE 'pgp_%'; -- ne pas re-chiffrer les données déjà chiffrées
