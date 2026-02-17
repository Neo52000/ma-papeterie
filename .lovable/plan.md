

## Afficher les fournisseurs sur la fiche produit (par EAN/SKU)

### Probleme actuel
Le composant `SupplierComparison` existe mais n'est utilise que dans l'admin. Les fiches produit client (`ProductPage.tsx` et `ProductDetailModal.tsx`) n'affichent aucune info fournisseur.

### Ce qui sera fait

#### 1. Creer un hook `useProductSuppliers`
Un hook dedie qui recupere les fournisseurs lies a un produit via `supplier_products` avec jointure sur `suppliers(name)`, trie par `priority_rank`.

#### 2. Creer un composant `ProductSuppliersBlock`
Un bloc affichant les fournisseurs disponibles pour un produit :
- Nom du fournisseur
- Prix d'achat HT
- Disponibilite (stock fournisseur)
- Delai de livraison
- Badge "Meilleur prix" et "Prefere"
- Ce bloc sera **visible uniquement pour les admins** (via le role utilisateur) pour ne pas exposer les prix d'achat aux clients

#### 3. Integrer le bloc dans les fiches produit
- `ProductDetailModal.tsx` : ajout du bloc apres la description (si admin)
- `ProductPage.tsx` : ajout du bloc sous le `CompetitorPricesBlock` existant (si admin)

#### 4. Matching par EAN
Quand plusieurs produits partagent le meme EAN, le bloc montrera automatiquement tous les fournisseurs ayant cet EAN dans `supplier_products`, peu importe le `product_id` initial. Cela permettra de voir toutes les sources d'approvisionnement pour un meme article.

### Concernant les agents IA

Les agents IA suivants sont deja integres et operationnels :

| Agent | Fonction |
|-------|----------|
| agent-seo | Generation automatique de titres/descriptions SEO |
| detect-pricing-opportunities | Analyse des ecarts de prix concurrents |
| optimize-reorder | Optimisation des seuils de reappro |
| auto-purchase-orders | Generation automatique des bons de commande |
| predict-sales | Predictions de ventes par IA |
| match-products | Matching produits par EAN/nom |
| ai-import-catalog | Import intelligent de catalogues |
| generate-recommendations | Recommandations produits personnalisees |

Tous utilisent le gateway Lovable AI (`google/gemini`) et logguent dans `agent_logs`.

### Details techniques

**Fichiers a creer :**
- `src/hooks/useProductSuppliers.ts` : Hook pour charger les supplier_products avec jointure EAN
- `src/components/product/ProductSuppliersBlock.tsx` : Composant d'affichage

**Fichiers a modifier :**
- `src/components/product/ProductDetailModal.tsx` : Ajout du bloc
- `src/pages/ProductPage.tsx` : Ajout du bloc
- Verification du role admin via `useAuth()` ou `get_current_user_role()`

