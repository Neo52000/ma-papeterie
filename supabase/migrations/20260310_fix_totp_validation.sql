-- ─────────────────────────────────────────────────────────────────────────────
-- 20260310_fix_totp_validation.sql — Impl TOTP réel avec pgcrypto HMAC-SHA1
-- ─────────────────────────────────────────────────────────────────────────────
-- Corrige la faille critique : verify_totp() acceptait TOUT code à 6 chiffres.
-- Implémente RFC 6238 (TOTP) et RFC 4226 (HOTP) en PL/pgSQL pur.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ═══════════════════════════════════════════════════════════════════════════════
-- 1. Décodage Base32 (RFC 4648) — nécessaire pour les secrets TOTP
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.base32_decode(p_input text)
RETURNS bytea
LANGUAGE plpgsql
IMMUTABLE STRICT
AS $$
DECLARE
  v_alphabet text := 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  v_input text;
  v_bits text := '';
  v_result bytea := ''::bytea;
  v_char char;
  v_idx int;
  v_byte int;
  i int;
BEGIN
  -- Normalize: uppercase, strip padding and whitespace
  v_input := upper(regexp_replace(p_input, '[=\s]', '', 'g'));

  -- Convert each character to 5-bit binary string
  FOR i IN 1..length(v_input) LOOP
    v_char := substr(v_input, i, 1);
    v_idx := position(v_char in v_alphabet) - 1;
    IF v_idx < 0 THEN
      RAISE EXCEPTION 'Invalid base32 character: %', v_char;
    END IF;
    -- Convert to 5-bit binary
    v_bits := v_bits ||
      CASE WHEN v_idx & 16 > 0 THEN '1' ELSE '0' END ||
      CASE WHEN v_idx & 8 > 0 THEN '1' ELSE '0' END ||
      CASE WHEN v_idx & 4 > 0 THEN '1' ELSE '0' END ||
      CASE WHEN v_idx & 2 > 0 THEN '1' ELSE '0' END ||
      CASE WHEN v_idx & 1 > 0 THEN '1' ELSE '0' END;
  END LOOP;

  -- Convert bits to bytes (8 bits at a time)
  FOR i IN 0..(length(v_bits) / 8 - 1) LOOP
    v_byte := 0;
    v_byte := v_byte + CASE WHEN substr(v_bits, i*8+1, 1) = '1' THEN 128 ELSE 0 END;
    v_byte := v_byte + CASE WHEN substr(v_bits, i*8+2, 1) = '1' THEN 64 ELSE 0 END;
    v_byte := v_byte + CASE WHEN substr(v_bits, i*8+3, 1) = '1' THEN 32 ELSE 0 END;
    v_byte := v_byte + CASE WHEN substr(v_bits, i*8+4, 1) = '1' THEN 16 ELSE 0 END;
    v_byte := v_byte + CASE WHEN substr(v_bits, i*8+5, 1) = '1' THEN 8 ELSE 0 END;
    v_byte := v_byte + CASE WHEN substr(v_bits, i*8+6, 1) = '1' THEN 4 ELSE 0 END;
    v_byte := v_byte + CASE WHEN substr(v_bits, i*8+7, 1) = '1' THEN 2 ELSE 0 END;
    v_byte := v_byte + CASE WHEN substr(v_bits, i*8+8, 1) = '1' THEN 1 ELSE 0 END;
    v_result := v_result || set_byte(E'\\x00'::bytea, 0, v_byte);
  END LOOP;

  RETURN v_result;
END;
$$;

-- ═══════════════════════════════════════════════════════════════════════════════
-- 2. Génération d'un code TOTP (RFC 6238 / RFC 4226)
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.totp_generate_code(
  p_secret_base32 text,
  p_time_step bigint
)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE STRICT
AS $$
DECLARE
  v_key bytea;
  v_msg bytea;
  v_hmac bytea;
  v_offset int;
  v_code int;
BEGIN
  -- Decode the base32 secret to raw bytes
  v_key := public.base32_decode(p_secret_base32);

  -- Encode the time step as 8-byte big-endian
  v_msg := E'\\x00\\x00\\x00\\x00'::bytea ||
    set_byte(E'\\x00'::bytea, 0, ((p_time_step >> 24) & 255)::int) ||
    set_byte(E'\\x00'::bytea, 0, ((p_time_step >> 16) & 255)::int) ||
    set_byte(E'\\x00'::bytea, 0, ((p_time_step >> 8) & 255)::int) ||
    set_byte(E'\\x00'::bytea, 0, (p_time_step & 255)::int);

  -- HMAC-SHA1
  v_hmac := hmac(v_msg, v_key, 'sha1');

  -- Dynamic truncation (RFC 4226 section 5.4)
  v_offset := get_byte(v_hmac, 19) & 15;
  v_code := (
    ((get_byte(v_hmac, v_offset) & 127) << 24) |
    (get_byte(v_hmac, v_offset + 1) << 16) |
    (get_byte(v_hmac, v_offset + 2) << 8) |
    get_byte(v_hmac, v_offset + 3)
  );

  -- 6-digit code with leading zeros
  RETURN lpad((v_code % 1000000)::text, 6, '0');
END;
$$;

-- ═══════════════════════════════════════════════════════════════════════════════
-- 3. Vérification TOTP avec fenêtre de tolérance (+/- 1 step de 30 secondes)
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.totp_check(
  p_secret_base32 text,
  p_code text,
  p_window int DEFAULT 1  -- nombre de steps avant/après à vérifier
)
RETURNS boolean
LANGUAGE plpgsql
IMMUTABLE STRICT
AS $$
DECLARE
  v_current_step bigint;
  v_step bigint;
  v_expected text;
BEGIN
  IF length(p_code) != 6 OR NOT p_code ~ '^\d{6}$' THEN
    RETURN false;
  END IF;

  v_current_step := floor(extract(epoch from now()) / 30)::bigint;

  -- Check current step and +/- window steps (for clock drift)
  FOR v_step IN (v_current_step - p_window)..(v_current_step + p_window) LOOP
    v_expected := public.totp_generate_code(p_secret_base32, v_step);
    IF v_expected = p_code THEN
      RETURN true;
    END IF;
  END LOOP;

  RETURN false;
END;
$$;

-- ═══════════════════════════════════════════════════════════════════════════════
-- 4. Réécriture de verify_totp() avec validation réelle
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION verify_totp(p_code text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_secret text;
  v_enabled boolean;
  v_backup_idx int;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN false;
  END IF;

  SELECT totp_secret, totp_enabled INTO v_secret, v_enabled
  FROM admin_users WHERE id = v_user_id;

  IF NOT v_enabled OR v_secret IS NULL THEN
    RETURN false;
  END IF;

  -- Try TOTP code first (time-based)
  IF public.totp_check(v_secret, p_code) THEN
    RETURN true;
  END IF;

  -- Fallback: check backup codes (single-use)
  SELECT array_position(backup_codes, p_code) INTO v_backup_idx
  FROM admin_users WHERE id = v_user_id;

  IF v_backup_idx IS NOT NULL THEN
    -- Remove the used backup code (single-use)
    UPDATE admin_users
    SET backup_codes = array_remove(backup_codes, p_code),
        updated_at = now()
    WHERE id = v_user_id;
    RETURN true;
  END IF;

  RETURN false;
END;
$$;

-- ═══════════════════════════════════════════════════════════════════════════════
-- 5. Réécriture de enable_totp() avec validation réelle du code
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION enable_totp(p_code text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_secret text;
  v_backup_codes text[];
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT totp_secret INTO v_secret FROM admin_users WHERE id = v_user_id;
  IF v_secret IS NULL THEN
    RAISE EXCEPTION 'No TOTP secret found. Call generate_totp_secret first.';
  END IF;

  -- Validate the code against the secret using real TOTP algorithm
  IF NOT public.totp_check(v_secret, p_code) THEN
    RAISE EXCEPTION 'Invalid TOTP code. Please try again with a fresh code from your authenticator app.';
  END IF;

  -- Generate 10 backup codes
  v_backup_codes := array(
    SELECT substr(md5(random()::text), 1, 8)
    FROM generate_series(1, 10)
  );

  UPDATE admin_users
  SET
    totp_enabled = true,
    backup_codes = v_backup_codes,
    updated_at = now()
  WHERE id = v_user_id;

  RETURN json_build_object(
    'enabled', true,
    'backup_codes', v_backup_codes
  );
END;
$$;
