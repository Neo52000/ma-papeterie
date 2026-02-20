
# 4 Features : Import prix ALKOR · Cron nightly · Interface seuil fantômes · Guide de test sans prix ALKOR

## Contexte — Ce que j'ai découvert

**Fichier uploadé** : C'est le catalogue ALKOR mensuel (format adhérents). Il contient des colonnes descriptives (famille, EAN, références, marques, écologie) **mais pas de prix** — ce qui est cohérent avec la description du ticket. ALKOR fournit les prix dans un fichier séparé.

**Données en base** : 14 500 offres ALKOR importées, dont 13 284 actives. **Aucune n'a de `pvp_ttc` ou `purchase_price_ht`**. Toutes les valeurs de prix sont NULL → le rollup calcule 0 produits ALKOR avec un prix.

**Crons existants** : 4 jobs pg_cron actifs (detect-pricing, detect-exceptions, sync-shopify, import-liderpapel). Le pattern est bien établi pour ajouter un nouveau cron.

**`app_settings` n'existe pas** en base — migration SQL nécessaire.

---

## Feature 1 — Edge Function `import-alkor-prices` (fichier prix dédié ALKOR)

### Structure du fichier prix ALKOR

ALKOR fournit un second fichier mensuel avec les colonnes :
- **Réf Art 6** (= `supplier_product_id` dans `supplier_offers`)
- **Prix d'achat HT** (purchase_price_ht)
- **PVP TTC** (prix de vente conseillé)
- **TVA** (taux)
- **Éco-contributions** (D3E, COP, etc. — JSON)

Ces colonnes peuvent varier selon le fichier client. L'interface d'upload proposera un mappage de colonnes interactif si les colonnes ne sont pas reconnues.

### Stratégie de matching

```
Pour chaque ligne du fichier prix :
  ref = colonne référence ALKOR (Réf Art 6)
  → chercher dans supplier_offers WHERE supplier = 'ALKOR' AND supplier_product_id = ref
  → UPDATE pvp_ttc, purchase_price_ht, vat_rate, tax_breakdown, last_seen_at
```

L'upsert se fait sur `(supplier, supplier_product_id)` — la clé de conflit existante.

### Colonnes mappées automatiquement

```typescript
const PRICE_COLUMN_MAP = {
  "réf art 6": "ref_art",
  "référence": "ref_art",
  "prix achat ht": "purchase_price_ht",
  "prix d'achat ht": "purchase_price_ht",
  "pvp ttc": "pvp_ttc",
  "prix de vente": "pvp_ttc",
  "tva": "vat_rate",
  "eco": "eco_tax",
  "d3e": "d3e",
  "cop": "cop",
  // ... variantes
}
```

### Fichiers modifiés

- **`supabase/functions/import-alkor-prices/index.ts`** — Nouvelle Edge Function : lit les lignes, fait un batch UPDATE sur `supplier_offers`, déclenche `recompute_product_rollups` sur les produits touchés, loggue dans `supplier_import_logs` avec format `'alkor-prices'`
- **`src/pages/AdminAlkor.tsx`** — Ajouter un 2e onglet "Import Prix" avec upload XLSX dédié, aperçu des colonnes détectées, bouton d'import
- **`supabase/config.toml`** — Ajouter `[functions.import-alkor-prices] verify_jwt = false`

---

## Feature 2 — Cron nightly pour recalcul rollups

### Nouveau cron pg_cron

Un cron `nightly-rollup-recompute` déclenché **chaque nuit à 2h30** (après l'import Liderpapel à 0h). Il appelle la RPC `admin_recompute_all_rollups` en plusieurs passes pour traiter tous les produits.

```sql
-- SQL à insérer via l'outil insert (pas migration)
SELECT cron.schedule(
  'nightly-rollup-recompute',
  '30 2 * * *',
  $$
  SELECT net.http_post(
    url := 'https://mgojmkzovqgpipybelrr.supabase.co/functions/v1/nightly-rollup',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer ANON_KEY"}'::jsonb,
    body := '{}'::jsonb
  ) AS request_id;
  $$
);
```

### Nouvelle Edge Function `nightly-rollup`

```typescript
// supabase/functions/nightly-rollup/index.ts
// 1. Récupère le total de produits actifs
// 2. Lance admin_recompute_all_rollups par passes de 500 jusqu'à done=true
// 3. Loggue le résultat dans cron_job_logs et agent_logs
// 4. Nettoie les offres fantômes selon le seuil app_settings.ghost_offer_days
```

Cette fonction lit le seuil fantôme depuis `app_settings` (Feature 3), avec valeur par défaut 3 si non configuré.

---

## Feature 3 — Table `app_settings` + Interface admin seuil fantômes

### Migration SQL

```sql
CREATE TABLE IF NOT EXISTS public.app_settings (
  key   TEXT PRIMARY KEY,
  value JSONB NOT NULL DEFAULT '{}'::jsonb,
  label TEXT,
  description TEXT,
  updated_at TIMESTAMPTZ DEFAULT now(),
  updated_by UUID REFERENCES auth.users(id)
);

-- RLS : lecture publique (anon), écriture admin uniquement
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "read_app_settings" ON public.app_settings
  FOR SELECT USING (true);

CREATE POLICY "write_app_settings" ON public.app_settings
  FOR ALL USING (
    has_role(auth.uid(), 'admin'::app_role) OR
    has_role(auth.uid(), 'super_admin'::app_role)
  );

-- Valeur par défaut : seuil 3 jours
INSERT INTO public.app_settings (key, value, label, description)
VALUES (
  'ghost_offer_threshold_days',
  '3'::jsonb,
  'Seuil offres fantômes (jours)',
  'Nombre de jours sans vue après lequel une offre fournisseur est marquée inactive'
)
ON CONFLICT (key) DO NOTHING;
```

### Interface admin — Nouvel onglet "⚙️ Paramètres" dans `AdminAutomations`

L'onglet affiche une liste de paramètres configurables avec des contrôles inline :

| Paramètre | Contrôle | Valeur actuelle |
|---|---|---|
| Seuil offres fantômes ALKOR (jours) | Input number 1-30 | 3 |
| Seuil offres fantômes COMLANDI (jours) | Input number 1-30 | 3 |
| Seuil offres fantômes SOFT (jours) | Input number 1-30 | 8 |
| Cron nightly rollup activé | Switch | true |

Bouton "Sauvegarder" → upsert dans `app_settings`.

### Usage dans le code existant

L'edge function `import-alkor/index.ts` lit actuellement `3 * 24 * 60 * 60 * 1000` en dur. On le remplace par :

```typescript
const { data: setting } = await supabase
  .from('app_settings')
  .select('value')
  .eq('key', 'ghost_offer_threshold_days')
  .maybeSingle();
const ghostDays = Number(setting?.value ?? 3);
```

---

## Feature 4 — Guide de test sans prix ALKOR (point 5)

Ce n'est pas du code — c'est une procédure de validation qui sera documentée dans l'interface.

### Procédure de test dans l'UI

Ajouter dans `AdminAlkor.tsx` une carte "Guide de validation" (repliable) qui explique :

**Test 1 : COMLANDI remplit `pvp_ttc` → prix public = PVP_COMLANDI**
```sql
-- Vérifier en base :
SELECT p.name, p.public_price_ttc, p.public_price_source
FROM products p
JOIN supplier_offers so ON so.product_id = p.id
WHERE so.supplier = 'COMLANDI' AND so.pvp_ttc IS NOT NULL
LIMIT 5;
-- Attendu : public_price_source = 'PVP_COMLANDI'
```

**Test 2 : SOFT remplit `pvp_ttc` si COMLANDI n'a pas de PVP → PVP_SOFT**
```sql
SELECT p.public_price_source, COUNT(*)
FROM products p GROUP BY p.public_price_source;
-- Attendu : lignes PVP_SOFT si COMLANDI absent
```

**Test 3 : Aucun PVP → COEF + alerte**
```sql
SELECT COUNT(*) FROM products WHERE public_price_source = 'COEF';
-- Et vérifier les product_exceptions avec exception_type = 'prix_incalculable'
```

**Test 4 : Stock > 0 sur n'importe quel fournisseur → Disponible**
```sql
SELECT p.name, p.is_available, p.available_qty_total
FROM products p
WHERE p.available_qty_total > 0 AND NOT p.is_available;
-- Attendu : 0 lignes (incohérence)
```

Ces requêtes seront affichées dans un onglet "Diagnostic" de la page AdminAlkor avec un bouton "Exécuter" pour chacune, retournant les résultats directement dans l'UI.

---

## Fichiers à créer/modifier

| # | Fichier | Action |
|---|---------|--------|
| 1 | **Migration SQL** | Créer table `app_settings` avec RLS + seed valeurs par défaut |
| 2 | `supabase/functions/import-alkor-prices/index.ts` | Nouvelle Edge Function — import fichier prix ALKOR |
| 3 | `supabase/functions/nightly-rollup/index.ts` | Nouvelle Edge Function — recalcul nightly + cleanup fantômes |
| 4 | `supabase/config.toml` | Ajouter les deux nouvelles fonctions |
| 5 | `src/pages/AdminAlkor.tsx` | Onglet "Import Prix" + onglet "Diagnostic" |
| 6 | `src/pages/AdminAutomations.tsx` | Onglet "⚙️ Paramètres" avec interface `app_settings` |
| 7 | `src/pages/AdminAlkor.tsx` | Afficher `rollups_recomputed` dans les résultats d'import |
| 8 | `supabase/functions/import-alkor/index.ts` | Lire le seuil fantôme depuis `app_settings` au lieu de la valeur en dur |
| 9 | SQL insert (pas migration) | Créer le cron `nightly-rollup-recompute` via `cron.schedule` |

## Ordre d'exécution

1. Migration SQL (`app_settings`)
2. Edge Functions (`import-alkor-prices`, `nightly-rollup`)
3. Config.toml
4. UI `AdminAlkor.tsx` (onglets Import Prix + Diagnostic)
5. UI `AdminAutomations.tsx` (onglet Paramètres)
6. Patch `import-alkor/index.ts` (lire seuil depuis BDD)
7. Insert cron SQL

