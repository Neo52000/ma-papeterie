# alkor-test — Smoke tests des Edge Functions Alkor

Tests HTTP rapides contre les Edge Functions Supabase liées à l'intégration ALKOR.
Utilisé pour valider qu'un déploiement n'a pas cassé les contrats d'auth, de
validation et le mode `dry_run`.

## Ce qui est testé

| # | Fonction | Cas | Effet |
|---|----------|-----|-------|
| 1.1 | `import-alkor` | dry-run avec fixture valide (3 lignes) | Aucun (renvoie counts) |
| 1.2 | `import-alkor` | `rows: []` | Aucun (400) |
| 1.3 | `import-alkor` | sans `Authorization` | Aucun (401) |
| 1.4 | `import-alkor` | JWT invalide | Aucun (401) |
| 2.1 | `import-alkor-prices` | `rows: []` | Aucun (400) |
| 2.2 | `import-alkor-prices` | sans auth | Aucun (401) |
| 3.1 | `trigger-alkor-sync` | sans auth | Aucun (401) |
| 3.2 | `trigger-alkor-sync` | JWT invalide | Aucun (401) |

> **Important** : ces tests sont sûrs à lancer en prod — aucun test ne déclenche
> d'écriture en base ni de dispatch GitHub Actions. Le happy-path d'`import-alkor`
> utilise `dry_run: true` qui ne fait que compter les would-create/would-update.
> `import-alkor-prices` et `trigger-alkor-sync` ne sont testés que sur leurs
> chemins d'erreur, car ils n'exposent pas de mode dry-run.

## Variables d'environnement

| Variable | Requis | Description |
|----------|--------|-------------|
| `SUPABASE_URL` | oui | `https://<project>.supabase.co` |
| `SUPABASE_ADMIN_JWT` | oui | JWT d'un user avec rôle `admin` ou `super_admin` dans `user_roles` |
| `SUPABASE_ANON_KEY` | non | Anon key (envoyée dans l'en-tête `apikey` si l'API Gateway l'exige) |
| `FIXTURES_DIR` | non | Défaut : `./fixtures` |
| `VERBOSE` | non | `1` pour afficher les corps de réponse complets |

### Récupérer un JWT admin

Le plus simple : se connecter sur le site avec un compte admin, ouvrir la
DevTools console et taper :

```js
JSON.parse(localStorage.getItem('sb-<project-ref>-auth-token')).access_token
```

Ou en CLI :

```bash
curl -X POST "$SUPABASE_URL/auth/v1/token?grant_type=password" \
  -H "apikey: $SUPABASE_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@ma-papeterie.fr","password":"..."}' \
  | jq -r .access_token
```

> Le JWT expire vite (1h par défaut). Le re-générer si les tests d'auth
> commencent à échouer en 401 alors qu'ils passaient avant.

## Lancer

```bash
cd alkor-test
export SUPABASE_URL="https://xxx.supabase.co"
export SUPABASE_ADMIN_JWT="eyJ..."
./test-alkor.sh
```

Mode verbose (affiche les bodies de réponse) :

```bash
VERBOSE=1 ./test-alkor.sh
```

## Dépendances

- `bash` 4+
- `curl`
- `jq`

## Codes de sortie

- `0` : tous les tests passent
- `1` : au moins un test échoué
- `2` : variables d'environnement ou dépendances manquantes
