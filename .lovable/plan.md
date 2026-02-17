

# Plan : Alignement ERP avec le cahier des charges (Points 1 et 2)

## Analyse des ecarts

Le projet couvre deja une bonne partie du cahier des charges. Voici ce qui manque :

### Ce qui existe deja et correspond au cahier des charges
- Table `products` avec EAN, prix HT/TTC, TVA, stock
- Table `suppliers` avec coordonnees, conditions de paiement/livraison
- Table `supplier_products` (lien produit-fournisseur) avec prix, stock, delai, fiabilite
- Table `product_stock_locations` (stock multi-emplacements)
- Table `pricing_rules` (regles de prix dynamiques avec marges)
- Table `competitor_prices` (veille concurrentielle)
- Import IA des catalogues fournisseurs (deja implemente)
- Agents IA pour enrichissement produits et images

### Ce qui manque par rapport au cahier des charges

| Element | Spec | Etat actuel |
|---------|------|-------------|
| `sku_interne` sur produit | Requis | Absent |
| `attributs` JSON sur produit | Requis | Absent |
| EAN comme cle unique | Requis | Nullable, pas unique |
| Type fournisseur (grossiste/fabricant) | Requis | Absent |
| Format source fournisseur | Requis | Absent |
| Table images dediee | Requise | Seulement `image_url` sur produit |
| Scoring qualite donnees fournisseur | Requis | `reliability_score` existe mais pas `fiabilite_donnee` |
| Concept "vendable" (EAN + fournisseur actif + prix) | Requis | Absent |
| File d'exceptions EAN manquant | Requis | Absent |

## Plan d'implementation

### Phase 1 : Enrichir le schema produits

**Migration SQL** : Ajouter les colonnes manquantes sur `products`
- `sku_interne` (text, unique, nullable)
- `attributs` (jsonb, defaut `{}`)
- Ajouter un index unique sur `ean` (pour les EAN non null)
- Ajouter une colonne calculee ou vue `is_vendable` (EAN valide + fournisseur actif + prix > 0)

### Phase 2 : Enrichir le schema fournisseurs

**Migration SQL** : Ajouter sur `suppliers`
- `supplier_type` (text : 'grossiste', 'fabricant', 'distributeur')
- `format_source` (text : 'api', 'csv', 'excel', 'edi', 'scraping')
- `conditions_commerciales` (jsonb)

### Phase 3 : Table images dediee

**Migration SQL** : Creer `product_images`
- `id` (uuid)
- `product_id` (uuid, FK vers products)
- `source` (text : 'fournisseur', 'crawl', 'manual', 'ia')
- `url_originale` (text)
- `url_optimisee` (text)
- `alt_seo` (text)
- `is_principal` (boolean, defaut false)
- `created_at`, `updated_at`

Avec RLS et politique pour admins.

### Phase 4 : Logique "vendable" et exceptions

**Migration SQL** : Creer une vue `v_products_vendable` qui filtre les produits ayant :
- EAN non null et non vide
- Au moins 1 ligne dans `supplier_products` avec un fournisseur actif
- Un prix > 0

**Migration SQL** : Creer `product_exceptions`
- `id` (uuid)
- `product_id` (uuid, FK)
- `exception_type` (text : 'ean_manquant', 'prix_incalculable', 'fournisseur_inactif', 'conflit_prix')
- `details` (jsonb)
- `resolved` (boolean)
- `created_at`, `resolved_at`

### Phase 5 : Interface admin - Tableau de bord ERP

**Modifier** `src/pages/AdminProducts.tsx` :
- Ajouter un badge "Vendable / Non vendable" sur chaque produit
- Ajouter un filtre par statut vendable
- Afficher les champs `sku_interne` et `attributs` dans le formulaire produit

**Modifier** `src/pages/AdminSuppliers.tsx` :
- Ajouter les champs type et format source dans le formulaire fournisseur

**Creer** `src/pages/AdminExceptions.tsx` :
- Liste des exceptions (EAN manquant, conflits prix)
- Actions rapides pour resoudre (ajouter EAN, choisir prix)

**Creer** `src/pages/AdminProductImages.tsx` :
- Gestion des images par produit (table dediee)
- Definir image principale, alt SEO

### Phase 6 : Mettre a jour le sidebar admin

**Modifier** `src/components/admin/AdminSidebar.tsx` :
- Ajouter entree "Exceptions" dans le menu
- Ajouter entree "Images produits" dans le menu

### Phase 7 : Routing

**Modifier** `src/App.tsx` :
- Ajouter les routes `/admin/exceptions` et `/admin/product-images`

## Resume des fichiers

| Fichier | Action |
|---------|--------|
| Migration SQL (schema) | 4 migrations via Supabase |
| `src/pages/AdminProducts.tsx` | Modifier (badges vendable, champs sku/attributs) |
| `src/pages/AdminSuppliers.tsx` | Modifier (type, format source) |
| `src/pages/AdminExceptions.tsx` | Creer |
| `src/pages/AdminProductImages.tsx` | Creer |
| `src/components/admin/AdminSidebar.tsx` | Modifier |
| `src/App.tsx` | Modifier (routes) |
| `src/hooks/useProductExceptions.ts` | Creer |
| `src/hooks/useProductImages.ts` | Modifier (adapter a la nouvelle table) |

## Ordre d'execution

1. Migrations SQL (phases 1-4) en premier pour que le schema soit pret
2. Hooks et pages (phases 5-7) ensuite pour l'interface
3. Test de bout en bout

