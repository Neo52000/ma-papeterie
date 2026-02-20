
# Catalogue produit robuste — Plan d'implémentation complet

## Audit de l'existant (ce qui marche déjà)

### Bien en place
- Table `products` avec 76 837 produits importés, colonnes métier complètes : EAN, prix HT/TTC, TVA, eco_tax, poids, dimensions, pays d'origine, code douane, `is_active`, `is_end_of_life`, `is_special_order`
- Import Comlandi CSV + Liderpapel JSON (fetch-liderpapel-sftp) fonctionnel
- `supplier_products` avec prix achat, stock fournisseur, référence fournisseur
- `product_packagings` (UMV/UVE/EMB/ENV/Palette)
- `categories` avec 4 niveaux hiérarchiques, `liderpapel_pricing_coefficients`
- `product_relations`, `product_images` (schéma), `product_seo` (schéma)
- Catalogue front avec filtres, pagination, vue grille/liste

### Lacunes critiques à combler
- **Images** : `product_images` est vide (0 lignes), 76 830 produits sans image_url — le pipeline multimédia ne tourne jamais
- **Descriptions** : `product_seo` vide, descriptions multi-types non structurées
- **Attributs normalisés** : tout dans le JSONB `attributs`, aucune table dédiée filtrée/comparée
- **Historique** : aucune table `product_price_history` ni `product_lifecycle_history`
- **Rapport fournisseur** : `supplier_import_logs` existe mais aucun rapport visuel de qualité
- **Front produit** : `ProductPage.tsx` pointe vers Shopify seulement, pas les données Supabase

---

## Architecture cible

```text
products (enrichi)
  ├── product_images         (multi-images, ordre, source)
  ├── product_seo            (descriptions courte/longue/détaillée, SEO)
  ├── product_attributes     (NEW — attributs normalisés par type)
  ├── product_price_history  (NEW — historique prix achat + vente)
  ├── product_lifecycle_logs (NEW — créé/modifié/supprimé)
  ├── product_packagings     (UMV/UVE/ENV/EMB)
  ├── product_relations      (complémentaires/alternatifs/substituables)
  └── supplier_products      (prix fournisseur, stock, délai)
```

---

## Phase 1 — Schéma base de données (3 nouvelles tables + enrichissement)

### 1.1 Table `product_attributes` (attributs normalisés)

```sql
CREATE TABLE public.product_attributes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  attribute_type text NOT NULL, -- 'couleur', 'format', 'matiere', 'usage', 'compatibilite', 'norme'
  attribute_name text NOT NULL,
  attribute_value text NOT NULL,
  unit text,
  source text DEFAULT 'supplier', -- 'supplier' | 'manual'
  created_at timestamptz DEFAULT now()
);
```

RLS : SELECT public, INSERT/UPDATE/DELETE admins.

### 1.2 Table `product_price_history`

```sql
CREATE TABLE public.product_price_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  changed_at timestamptz DEFAULT now(),
  changed_by text DEFAULT 'import', -- 'import' | 'manual' | 'pricing_rule'
  supplier_id uuid REFERENCES public.suppliers(id),
  old_cost_price numeric,
  new_cost_price numeric,
  old_price_ht numeric,
  new_price_ht numeric,
  old_price_ttc numeric,
  new_price_ttc numeric,
  change_reason text
);
```

RLS : SELECT/INSERT admins.

### 1.3 Table `product_lifecycle_logs`

```sql
CREATE TABLE public.product_lifecycle_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  event_type text NOT NULL, -- 'created' | 'updated' | 'deactivated' | 'reactivated' | 'deleted'
  event_at timestamptz DEFAULT now(),
  performed_by text DEFAULT 'import',
  details jsonb DEFAULT '{}'
);
```

RLS : SELECT/INSERT admins.

### 1.4 Ajout colonnes manquantes à `products`

```sql
ALTER TABLE products
  ADD COLUMN IF NOT EXISTS status text DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'future', 'discontinued')),
  ADD COLUMN IF NOT EXISTS warranty_months integer,
  ADD COLUMN IF NOT EXISTS delivery_days integer,
  ADD COLUMN IF NOT EXISTS is_fragile boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_heavy boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS requires_special_shipping boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS manufacturer_ref text;
```

### 1.5 Enrichissement `product_seo` — ajout colonne description_detaillee

```sql
ALTER TABLE product_seo
  ADD COLUMN IF NOT EXISTS description_detaillee text,
  ADD COLUMN IF NOT EXISTS description_source text DEFAULT 'supplier', -- 'supplier' | 'custom' | 'ai'
  ADD COLUMN IF NOT EXISTS lang text DEFAULT 'fr';
```

### 1.6 Enrichissement `product_images` — ajout colonne order

```sql
ALTER TABLE product_images
  ADD COLUMN IF NOT EXISTS display_order integer DEFAULT 0;
```

---

## Phase 2 — Import enrichi (Edge Functions)

### 2.1 Fix critique : pipeline images dans `fetch-liderpapel-sftp`

Le pipeline `MultimediaLinks` échoue silencieusement car `product_images` est vide. Corrections :

**A. `batchFindProductIds` — réécriture robuste**

Le filtre `.filter('attributs->>ref_liderpapel', 'in', '(ref1,ref2)')` est **invalide** en PostgREST quand les valeurs contiennent des espaces ou des caractères spéciaux. Remplacer par une approche RPC :

```sql
-- Fonction SQL à créer
CREATE OR REPLACE FUNCTION public.find_products_by_refs(refs text[])
RETURNS TABLE(product_id uuid, matched_ref text)
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  SELECT p.id, p.attributs->>'ref_liderpapel' FROM products p
  WHERE p.attributs->>'ref_liderpapel' = ANY(refs)
  UNION ALL
  SELECT p.id, p.attributs->>'ref_comlandi' FROM products p
  WHERE p.attributs->>'ref_comlandi' = ANY(refs)
    AND NOT (p.attributs->>'ref_liderpapel' = ANY(refs))
  UNION ALL
  SELECT p.id, p.ean FROM products p
  WHERE p.ean = ANY(refs)
    AND p.ean IS NOT NULL
$$;
```

Puis dans l'edge function :
```typescript
const { data: refRows } = await supabase.rpc('find_products_by_refs', { refs: chunk });
```

**B. Synchronisation `products.image_url` après insertion dans `product_images`**

Après chaque upsert dans `product_images`, si `is_principal = true` et que `products.image_url` est NULL, mettre à jour `products.image_url`.

**C. Extraction attributs structurés lors de l'import Catalog JSON**

Dans `parseCatalogJson`, extraire les valeurs pertinentes vers `product_attributes` :
- `couleur`, `format`, `matiere` depuis `AdditionalInfo`
- `UMV`, `UVE`, `Heavy` → `is_heavy`
- `DeliveredDays` → `delivery_days`
- `CountryOfOrigin` → `country_origin`

**D. Historique des prix lors de l'import Prices JSON**

Lors de chaque mise à jour de prix dans `handleLiderpapel` (et import Comlandi), insérer dans `product_price_history` si le prix a changé.

### 2.2 Réécriture `import-comlandi` : attributs + cycle de vie

Lors de l'import CSV, pour chaque produit créé/mis à jour :
- Insérer dans `product_lifecycle_logs` (`'created'` ou `'updated'`)
- Si `row.indisponible` est rempli → `status = 'discontinued'`, event `'deactivated'`
- Extraire `row.marque` → `brand` (déjà fait) ET `product_attributes` type `'marque'`

---

## Phase 3 — Backoffice Admin (nouvelles pages et composants)

### 3.1 Page `AdminProducts.tsx` — améliorations

**Onglets à ajouter :**
- "Catalogue" (liste actuelle)
- "Qualité données" (nouveau) : indicateurs de complétude par champ
- "Historique" (nouveau) : `product_price_history` + `product_lifecycle_logs`
- "Médias" (nouveau) : vue par produit des images manquantes

**Indicateur "image manquante"** dans la liste : badge rouge si `image_url IS NULL`.

**Filtres avancés manquants :**
- Filtre par `status` (actif/inactif/futur/fin de vie)
- Filtre "sans image", "sans EAN", "sans description"
- Filtre par `is_fragile`, `is_heavy`

### 3.2 Nouveau composant `ProductQualityDashboard.tsx`

Tableau de bord qualité données produit :

```text
┌──────────────────────────────────────────────────────────┐
│  Qualité du catalogue — 76 837 produits                  │
│                                                          │
│  Image manquante     76 830 / 76 837  ████████░░  99.9%  │
│  EAN manquant        57 892 / 76 837  ████████░░  75.3%  │
│  Description vide    57 362 / 76 837  ███████░░░  74.7%  │
│  Prix achat absent   54 243 / 76 837  ███████░░░  70.6%  │
│  Marque manquante    24 320 / 76 837  ████░░░░░░  31.6%  │
│                                                          │
│  [Exporter rapport CSV]  [Lancer enrichissement IA]      │
└──────────────────────────────────────────────────────────┘
```

### 3.3 Nouveau composant `ProductHistoryPanel.tsx`

Dans la fiche produit admin, un panneau latéral montrant :
- Dernière mise à jour fournisseur (date + source)
- Historique des changements de prix (tableau : date, ancien prix HT, nouveau prix HT, delta %)
- Logs cycle de vie (créé, modifié, désactivé)

### 3.4 Nouveau composant `SupplierImportReport.tsx`

Page `AdminComlandi.tsx` — nouvel onglet "Rapport qualité" :
- Produits ajoutés / modifiés / supprimés lors du dernier import
- Changements de prix (hausse / baisse / stable)
- Produits passés en "fin de vie"
- Bouton "Télécharger rapport CSV"
- Alertes si taux d'erreur > 5%

### 3.5 Composant `ProductMediaManager.tsx` (amélioration AdminProductImages)

- Vue liste produits avec indicateur image manquante
- Import URL fournisseur par batch
- Preview immédiat de l'image depuis l'URL
- Upload direct si pas d'URL disponible
- Synchronisation `products.image_url` depuis `product_images` (bouton "Sync image principale")

---

## Phase 4 — Front produit (fiche produit Supabase)

### 4.1 Nouvelle page `ProductDetailPage.tsx` (basée sur données Supabase, pas Shopify)

La page `/produit/:ean` ou `/produit/:id` lit depuis Supabase et affiche :

**Onglet Description** :
- Description courte (depuis `products.description` ou `product_seo.description_courte`)
- Description longue (`product_seo.description_longue`)
- Indication "Description fournisseur" vs "Description enrichie"

**Onglet Caractéristiques** :
- Tableau des attributs depuis `product_attributes` groupés par type
- Poids, dimensions, pays d'origine, code douane
- UMV/UVE depuis `product_packagings`

**Onglet Disponibilité & Prix** :
- Prix TTC affiché en gros
- "dont D3E : X €" si eco_tax > 0
- Statut stock : En stock / Rupture / Commande possible
- Délai estimé si `delivery_days` renseigné

**Galerie images** :
- Images depuis `product_images` triées par `display_order`
- Fallback sur `products.image_url`
- Indicateur "Image manquante" discret si aucune image

**Contraintes spéciales** (badges) :
- Fragile / Lourd / Expédition spéciale

**Produits liés** :
- Complémentaires / Alternatifs depuis `product_relations`

### 4.2 Intégration dans `Catalogue.tsx`

- Clic sur produit → ouvre `ProductDetailPage` via modal ou navigation
- Badges "fragile", "lourd", "fin de vie" dans la grille

---

## Phase 5 — Rapport fournisseur & logs

### 5.1 `supplier_import_logs` — enrichissement

Ajouter colonnes :
```sql
ALTER TABLE supplier_import_logs
  ADD COLUMN IF NOT EXISTS price_changes_count integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS deactivated_count integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS report_data jsonb;
```

### 5.2 Nouveau hook `useProductHistory.ts`

```typescript
export const useProductHistory = (productId: string) => {
  // Fetch product_price_history + product_lifecycle_logs
  // Returns: priceHistory[], lifecycleEvents[]
}
```

---

## Ordre d'exécution et priorités

| Priorité | Composant | Impact |
|----------|-----------|--------|
| 1 — Critique | Migration SQL (3 tables + colonnes) | Fondation |
| 2 — Critique | Fix `find_products_by_refs` RPC + sync image_url | Images produits |
| 3 — Haute | `ProductQualityDashboard` dans AdminProducts | Visibilité qualité |
| 4 — Haute | Historique prix dans import Liderpapel/Comlandi | Traçabilité |
| 5 — Moyenne | `ProductHistoryPanel` dans fiche admin | Backoffice |
| 6 — Moyenne | `ProductDetailPage` Supabase (front) | UX client |
| 7 — Faible | `SupplierImportReport` | Rapports |

---

## Contraintes respectées

- Pas de secrets en clair : les edge functions utilisent `SUPABASE_SERVICE_ROLE_KEY` déjà configuré
- RLS stricte : toutes les nouvelles tables auront SELECT public (si données publiques) ou admins seulement
- Imports transactionnels : les upserts restent atomiques par lot de 50
- Rollback possible : `product_lifecycle_logs` permet de reconstituer l'état précédent
- UX simple : tableaux de bord avec indicateurs clairs, pas de complexité gadget

## Fichiers créés / modifiés

| Type | Fichier |
|------|---------|
| Migration SQL | `supabase/migrations/[date]_catalogue_robuste.sql` |
| Migration SQL | `supabase/migrations/[date]_find_products_by_refs.sql` |
| Edge Function | `supabase/functions/fetch-liderpapel-sftp/index.ts` (fix images + attrs + history) |
| Edge Function | `supabase/functions/import-comlandi/index.ts` (lifecycle + attrs + history) |
| Nouveau hook | `src/hooks/useProductHistory.ts` |
| Nouveau composant | `src/components/admin/ProductQualityDashboard.tsx` |
| Nouveau composant | `src/components/admin/ProductHistoryPanel.tsx` |
| Nouveau composant | `src/components/admin/SupplierImportReport.tsx` |
| Nouveau composant | `src/components/product/ProductMediaManager.tsx` |
| Nouvelle page | `src/pages/ProductDetailPage.tsx` |
| Modifié | `src/pages/AdminProducts.tsx` (onglets Qualité + Historique) |
| Modifié | `src/pages/AdminComlandi.tsx` (onglet Rapport qualité) |
| Modifié | `src/components/admin/AdminSidebar.tsx` (lien Catalogue produit) |
| Modifié | `src/App.tsx` (route `/produit/:id`) |
