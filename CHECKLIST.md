# Checklist — Intégration module Pilotage

Branche : `claude/integrate-pilotage-module-oqdT8`
Statut : code intégré, **aucune** opération DB/deploy effectuée automatiquement.

Effectue les actions ci-dessous **manuellement**, dans l'ordre.

---

## 1. Prérequis Supabase

### 1.1 Extensions PostgreSQL

Dans Supabase Dashboard → Database → Extensions, activer si absent :

- `pg_cron`
- `pg_net`

### 1.2 Settings DB (pour que pg_cron puisse appeler les Edge Functions)

```sql
ALTER DATABASE postgres SET app.settings.supabase_url     = 'https://<PROJECT_REF>.supabase.co';
ALTER DATABASE postgres SET app.settings.service_role_key = '<SERVICE_ROLE_KEY>';
```

### 1.3 Secrets Edge Functions

```bash
# Clé API Claude pour le Coach IA (sinon la route /admin/pilotage/coach renvoie 500)
supabase secrets set ANTHROPIC_API_KEY='sk-ant-...'

# Vérifier la présence
supabase secrets list | grep ANTHROPIC_API_KEY
```

---

## 2. Migrations SQL (ordre strict)

Trois nouveaux fichiers dans `supabase/migrations/` :

```
20260418_005_pilotage_schema.sql   ← tables, enums, MV, RPC, RLS (1ère)
20260418_006_pilotage_seed.sql     ← 7 règles d'alertes + 1 objectif exemple (2ème)
20260418_007_pilotage_cron.sql     ← pg_cron jobs (APRÈS déploiement Edge Functions)
```

### 2.1 Schema + seed

```bash
# Via supabase CLI (recommandé)
supabase db push
```

ou depuis un psql direct :

```bash
psql "$DATABASE_URL" -f supabase/migrations/20260418_005_pilotage_schema.sql
psql "$DATABASE_URL" -f supabase/migrations/20260418_006_pilotage_seed.sql
```

### 2.2 Vérifier

```sql
-- Tables créées
SELECT tablename FROM pg_tables
WHERE schemaname = 'public' AND tablename LIKE 'pilotage_%';
-- Attendu : pilotage_snapshots, pilotage_goals, pilotage_alert_rules,
--           pilotage_alerts, pilotage_coach_conversations, pilotage_coach_messages

-- MV créées
SELECT matviewname FROM pg_matviews
WHERE schemaname = 'public' AND matviewname LIKE 'mv_pilotage_%';

-- Règles d'alertes
SELECT name, metric, threshold FROM pilotage_alert_rules ORDER BY created_at;
```

---

## 3. Déployer les 3 Edge Functions

```bash
supabase functions deploy pilotage-compute-kpi-snapshot
supabase functions deploy detect-alerts
supabase functions deploy pilotage-coach
```

> **Note** : la fonction a été **renommée** de `compute-kpi-snapshot` → `pilotage-compute-kpi-snapshot`
> pour éviter la collision avec la fonction pré-existante (qui calcule un snapshot hebdo via RPC SQL).

Vérifier :

```bash
supabase functions list | grep -E "pilotage|detect-alerts"
```

---

## 4. Backfill initial (30 jours)

Peupler `pilotage_snapshots` avec l'historique, sinon les graphiques sont vides.

```bash
# Variables (à remplacer)
export PROJECT_URL="https://<PROJECT_REF>.supabase.co"
export SERVICE_KEY="<SERVICE_ROLE_KEY>"

for i in $(seq 0 30); do
  d=$(date -d "-$i days" +%Y-%m-%d)
  echo "Backfill $d"
  curl -sS -X POST "$PROJECT_URL/functions/v1/pilotage-compute-kpi-snapshot" \
    -H "Authorization: Bearer $SERVICE_KEY" \
    -H "Content-Type: application/json" \
    -d "{\"target_date\": \"$d\"}"
  echo
done

# Rafraîchir les MV
psql "$DATABASE_URL" -c "SELECT refresh_pilotage_materialized_views();"
```

Vérifier :

```sql
SELECT snapshot_date, channel, ca_ht, nb_orders
FROM pilotage_snapshots
ORDER BY snapshot_date DESC, channel
LIMIT 20;
```

---

## 5. Activer les crons

Seulement **après** backfill + Edge Functions déployées :

```bash
psql "$DATABASE_URL" -f supabase/migrations/20260418_007_pilotage_cron.sql
```

Vérifier :

```sql
SELECT jobname, schedule, active
FROM cron.job
WHERE jobname LIKE 'pilotage-%';
-- Attendu 3 lignes :
--   pilotage-compute-kpi-snapshot        '30 21 * * *'  t
--   pilotage-refresh-materialized-views  '45 21 * * *'  t
--   pilotage-detect-alerts               '0 22 * * *'   t
```

---

## 6. Tests frontend

1. Se connecter avec un user ayant `user_roles.role IN ('admin', 'super_admin')`
2. Ouvrir `/admin/pilotage` → doit rediriger vers `/admin/pilotage/overview`
3. Vérifier onglets : **Vue d'ensemble**, **CA & Marge**, **Trésorerie**, **Boutique POS**, **Objectifs**, **Coach IA**, **Alertes**
4. **Coach IA** (`/admin/pilotage/coach`) : envoyer "Bilan de la semaine" → réponse Claude avec les chiffres du jour
5. **Alertes** (`/admin/pilotage/alertes`) : onglet "Règles" doit montrer les 7 règles seedées

---

## 7. Adaptations appliquées (rappel)

Choix validés : **A1 + B1 + C1 + D1**

| # | Décision | Implémentation |
|---|---|---|
| A1 | `orders` n'a pas `total_ht`/`total_ttc` | `ca_ht = total_amount / 1.20` (TVA 20% standard) dans `pilotage-compute-kpi-snapshot` |
| B1 | `orders` n'a pas `source_name` | Canal POS calculé depuis `shopify_orders WHERE source_name='pos'` (UNION dans la MV trésorerie) |
| C1 | Pas de table `customers` | B2B détecté via `EXISTS (SELECT 1 FROM b2b_accounts WHERE email = orders.customer_email)` |
| D1 | Pas de `profiles.role` | RLS utilisent `user_roles` avec enum `app_role IN ('admin', 'super_admin')` |

**Limites connues (A1)** : pour les produits en TVA 5.5% ou 10%, le `ca_ht` calculé sera légèrement sur-évalué (≤ 1-2% d'erreur). Acceptable pour du pilotage agrégé ; à affiner en v2 si besoin.

---

## 8. Que faire si…

### "Coach IA : erreur 500"

```bash
supabase functions logs pilotage-coach | tail -50
# Si "ANTHROPIC_API_KEY not configured" → re-définir le secret (section 1.3)
```

### "Les MV ne renvoient rien"

Le cron compute-kpi-snapshot doit tourner au moins une fois. Refaire le backfill (section 4).

### "Les RLS bloquent les queries"

Vérifier que l'utilisateur courant a une ligne dans `user_roles` :

```sql
SELECT ur.role FROM user_roles ur
WHERE ur.user_id = auth.uid();
-- Attendu : 'admin' ou 'super_admin'
```

### "POS : aucune transaction"

Vérifier que `shopify_orders` contient des lignes avec `source_name = 'pos'` :

```sql
SELECT COUNT(*) FROM shopify_orders WHERE source_name = 'pos';
-- Si 0 : le webhook POS Shopify n'est pas configuré (cf. CLAUDE.md projet)
```

---

## 9. Fichiers ajoutés / modifiés

**Ajoutés** (23 fichiers) :

- `src/types/pilotage.ts`
- `src/stores/pilotageStore.ts`
- `src/hooks/usePilotage.ts`, `usePilotageGoals.ts`, `usePilotageAlerts.ts`, `usePilotageCoach.ts`
- `src/views/AdminPilotage.tsx` (renommé depuis `PilotagePage.tsx`)
- `src/components/admin/pilotage/` (11 composants : Layout + 7 vues + _shared)
- `supabase/functions/pilotage-compute-kpi-snapshot/index.ts`
- `supabase/functions/detect-alerts/index.ts`
- `supabase/functions/pilotage-coach/index.ts`
- `supabase/migrations/20260418_005_pilotage_schema.sql`
- `supabase/migrations/20260418_006_pilotage_seed.sql`
- `supabase/migrations/20260418_007_pilotage_cron.sql`

**Modifiés** (3 fichiers) :

- `src/App.tsx` — lazy import + route `/admin/pilotage/*`
- `src/components/admin/AdminSidebar.tsx` — nouveau groupe "Pilotage"
- `src/components/admin/AdminLayout.tsx` — labels breadcrumb

---

## 10. Rollback (en cas de problème)

```sql
-- Désactiver les crons
SELECT cron.unschedule('pilotage-compute-kpi-snapshot');
SELECT cron.unschedule('pilotage-refresh-materialized-views');
SELECT cron.unschedule('pilotage-detect-alerts');

-- Supprimer tables + MV + types (⚠️ destructif)
DROP MATERIALIZED VIEW IF EXISTS mv_pilotage_overview_current CASCADE;
DROP MATERIALIZED VIEW IF EXISTS mv_pilotage_tresorerie_projection CASCADE;
DROP TABLE IF EXISTS pilotage_coach_messages CASCADE;
DROP TABLE IF EXISTS pilotage_coach_conversations CASCADE;
DROP TABLE IF EXISTS pilotage_alerts CASCADE;
DROP TABLE IF EXISTS pilotage_alert_rules CASCADE;
DROP TABLE IF EXISTS pilotage_goals CASCADE;
DROP TABLE IF EXISTS pilotage_snapshots CASCADE;
DROP FUNCTION IF EXISTS refresh_pilotage_materialized_views();
DROP FUNCTION IF EXISTS get_pilotage_timeseries(DATE, DATE, pilotage_channel);
DROP FUNCTION IF EXISTS get_goal_progress(TEXT, DATE);
DROP TYPE IF EXISTS pilotage_channel;
DROP TYPE IF EXISTS pilotage_period;
DROP TYPE IF EXISTS pilotage_alert_severity;
DROP TYPE IF EXISTS pilotage_alert_status;
DROP TYPE IF EXISTS pilotage_coach_role;
```

```bash
# Supprimer les Edge Functions
supabase functions delete pilotage-compute-kpi-snapshot
supabase functions delete detect-alerts
supabase functions delete pilotage-coach
```

---

*Généré le 2026-04-20 sur la branche `claude/integrate-pilotage-module-oqdT8`.*
