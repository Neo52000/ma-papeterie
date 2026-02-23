# Processus de release — Ma-Papeterie

## Vue d'ensemble

```
Développement (branche feature) → PR + checklist → merge main → déploiement → tag
```

---

## 1. Pré-déploiement

### 1.1 Audit qualité automatique

```bash
# Depuis la racine du projet
bash scripts/check-release.sh
```

Vérifie : TypeScript, secrets dans le code, .env gitignore, auth Edge Functions, RLS migrations, console.log, robots.txt.

### 1.2 Smoke tests

```bash
# Contre l'environnement de staging
BASE_URL=https://staging.ma-papeterie.fr \
SUPABASE_URL=https://xxxx.supabase.co \
bash scripts/smoke-test.sh
```

### 1.3 Audit RLS Supabase

Coller le contenu de `scripts/check-rls.sql` dans l'éditeur SQL de Supabase Studio et vérifier :
- Toutes les tables ont `rls_enabled = true`
- Aucune table n'a 0 politique alors que RLS est activé
- Les politiques publiques (SELECT `true`) sont intentionnelles

### 1.4 Checklist PR

Utiliser le template `.github/PULL_REQUEST_TEMPLATE.md` pour chaque PR.
Tous les items doivent être cochés avant le merge.

---

## 2. Déploiement

### 2.1 Ordre des opérations

1. **Tag git** avant tout déploiement en production :
   ```bash
   git tag v$(date +%Y%m%d-%H%M) -m "Release $(date +%Y-%m-%d)"
   git push origin --tags
   ```

2. **Appliquer les migrations Supabase** (si nouvelles tables/colonnes) :
   ```bash
   supabase db push --db-url "postgresql://..."
   # ou via Supabase Studio → SQL Editor → coller la migration
   ```

3. **Déployer les Edge Functions** (si modifiées) :
   ```bash
   supabase functions deploy <nom-de-la-fonction>
   # ou toutes en une fois :
   supabase functions deploy
   ```

4. **Déployer le frontend** (Lovable / Vercel / Netlify) :
   - Pousser sur `main` → déclenchement automatique du build

5. **Vérifier les variables d'environnement** en production :
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   - Voir `.env.example` pour la liste complète

### 2.2 Variables d'environnement requises

| Variable | Côté | Description |
|---|---|---|
| `VITE_SUPABASE_URL` | Frontend | URL du projet Supabase |
| `VITE_SUPABASE_ANON_KEY` | Frontend | Clé publique Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | Edge Functions (secret) | Clé admin — ne pas exposer |
| `STRIPE_SECRET_KEY` | Edge Functions (secret) | Clé Stripe côté serveur |
| `STRIPE_WEBHOOK_SECRET` | Edge Functions (secret) | Secret webhook Stripe |
| `OPENAI_API_KEY` | Edge Functions (secret) | OCR / enrichissement IA |

Les secrets des Edge Functions sont configurés via :
```bash
supabase secrets set NOM_SECRET=valeur
```
ou dans Supabase Dashboard → Settings → Edge Functions → Secrets.

---

## 3. Surveillance post-déploiement

Après chaque déploiement, surveiller pendant **30 minutes** :

- **Supabase Dashboard → Logs** : erreurs Edge Functions (onglet Functions)
- **Supabase Dashboard → Database → Logs** : erreurs SQL
- **Console navigateur** : erreurs JavaScript (F12 sur la prod)
- **Supabase Dashboard → Auth** : taux d'erreur authentification
- Relancer les smoke tests contre la production :
  ```bash
  BASE_URL=https://ma-papeterie.fr \
  SUPABASE_URL=https://xxxx.supabase.co \
  bash scripts/smoke-test.sh
  ```

---

## 4. Rollback

### 4.1 Rollback frontend

Le frontend est une SPA statique. En cas de problème :

**Option A — Revenir à un déploiement précédent** (Vercel/Netlify) :
- Aller dans le dashboard de déploiement → Deployments → choisir la version précédente → Redeploy

**Option B — Revert via git** :
```bash
# Trouver le tag de la version précédente
git tag -l | sort -r | head -5

# Revert du code
git revert HEAD --no-commit
git commit -m "revert: rollback to previous version"
git push origin main
```

### 4.2 Rollback Edge Functions

```bash
# Redéployer la version précédente de la fonction
git checkout <tag-précédent> -- supabase/functions/<nom-fonction>/
supabase functions deploy <nom-fonction>
git restore supabase/functions/<nom-fonction>/
```

### 4.3 Rollback données (migrations SQL)

Les migrations Supabase ne sont **pas réversibles automatiquement**.
Chaque migration doit documenter son rollback dans un commentaire en tête de fichier :

```sql
-- Migration: 20260221000000_ma_table.sql
-- Rollback:
--   DROP TABLE IF EXISTS ma_table;
--   ALTER TABLE autre_table DROP COLUMN IF EXISTS nouvelle_colonne;
```

Pour exécuter un rollback de données :
1. Aller dans Supabase Studio → SQL Editor
2. Coller le rollback SQL correspondant et l'exécuter
3. Ne **jamais** modifier directement les tables en prod sans sauvegarde

### 4.4 Rollback import fournisseurs

Pour annuler un import de catalogue fournisseur :
1. Aller dans `/admin/import-fournisseurs`
2. Dans l'historique, cliquer sur l'import à annuler → "Voir"
3. Cliquer "Annuler cet import" → confirmer
4. Le système restaure automatiquement les valeurs depuis `import_snapshots`

### 4.5 Rollback pricing dynamique

Pour annuler une simulation de prix appliquée :
1. Aller dans `/admin/pricing-dynamic` → onglet "Simulations"
2. Trouver la simulation avec status `applied`
3. Cliquer "Annuler" → confirme le rollback via l'Edge Function `pricing-rollback`
4. Les anciens prix sont restaurés depuis `pricing_simulation_items.price_before`

---

## 5. Contacts et escalade

En cas d'incident en production :

| Priorité | Condition | Action |
|---|---|---|
| P1 | Site inaccessible ou checkout impossible | Rollback immédiat (frontend + Edge Fn si nécessaire) |
| P2 | Feature principale cassée (panier, catalogue) | Rollback + investigation |
| P3 | Feature secondaire dégradée (analytics, recos) | Investigation, pas de rollback urgence |

---

## 6. Checklist complète avant mise en production

```
□ bash scripts/check-release.sh → 0 FAIL
□ bash scripts/smoke-test.sh (staging) → 0 FAIL
□ check-rls.sql → toutes les tables ont RLS activé
□ PR approuvée avec template complété
□ git tag créé
□ Variables d'env vérifiées en prod
□ Migrations appliquées (si applicable)
□ Edge Functions déployées (si modifiées)
□ Smoke tests relancés en production
□ Surveillance 30 min post-déploiement
```
