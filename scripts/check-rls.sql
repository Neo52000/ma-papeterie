-- ─────────────────────────────────────────────────────────────────────────────
-- check-rls.sql — Audit RLS Supabase pour Ma-Papeterie
-- Usage : coller dans l'éditeur SQL de Supabase Studio
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. Tables avec leur statut RLS
SELECT
  schemaname,
  tablename,
  rowsecurity AS rls_enabled,
  CASE WHEN rowsecurity THEN '✅ Activé' ELSE '❌ Désactivé' END AS statut
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY rls_enabled, tablename;

-- ─────────────────────────────────────────────────────────────────────────────

-- 2. Tables sans RLS (à corriger en priorité)
SELECT
  schemaname,
  tablename,
  '⚠️  RLS désactivé' AS alerte
FROM pg_tables
WHERE schemaname = 'public'
  AND rowsecurity = false
ORDER BY tablename;

-- ─────────────────────────────────────────────────────────────────────────────

-- 3. Politiques RLS par table (nombre + liste)
SELECT
  schemaname,
  tablename,
  COUNT(policyname) AS nb_policies,
  string_agg(policyname || ' [' || cmd || ']', ', ' ORDER BY policyname) AS policies
FROM pg_policies
WHERE schemaname = 'public'
GROUP BY schemaname, tablename
ORDER BY tablename;

-- ─────────────────────────────────────────────────────────────────────────────

-- 4. Tables avec RLS activé mais AUCUNE politique (accès bloqué pour tout le monde)
SELECT
  t.schemaname,
  t.tablename,
  '🚫 RLS activé mais 0 politique → table inaccessible' AS alerte
FROM pg_tables t
LEFT JOIN pg_policies p
  ON t.schemaname = p.schemaname
  AND t.tablename = p.tablename
WHERE t.schemaname = 'public'
  AND t.rowsecurity = true
  AND p.policyname IS NULL
ORDER BY t.tablename;

-- ─────────────────────────────────────────────────────────────────────────────

-- 5. Politiques autorisant un accès PUBLIC en lecture (à vérifier intentionnel)
SELECT
  schemaname,
  tablename,
  policyname,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE schemaname = 'public'
  AND (qual = 'true' OR qual IS NULL OR qual = '')
ORDER BY tablename, cmd;

-- ─────────────────────────────────────────────────────────────────────────────

-- 6. Vue de synthèse — score de couverture RLS
SELECT
  (SELECT COUNT(*) FROM pg_tables WHERE schemaname = 'public')                         AS total_tables,
  (SELECT COUNT(*) FROM pg_tables WHERE schemaname = 'public' AND rowsecurity = true)  AS tables_rls_on,
  (SELECT COUNT(*) FROM pg_tables WHERE schemaname = 'public' AND rowsecurity = false) AS tables_rls_off,
  ROUND(
    (SELECT COUNT(*) FROM pg_tables WHERE schemaname = 'public' AND rowsecurity = true)::numeric
    / NULLIF((SELECT COUNT(*) FROM pg_tables WHERE schemaname = 'public'), 0) * 100, 1
  ) AS pct_couverture;
