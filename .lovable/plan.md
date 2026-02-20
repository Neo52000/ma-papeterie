
# Diagnostic complet : Données fournisseurs non mises à jour

## Causes racines identifiées (4 problèmes distincts)

### Problème 1 — Comlandi : 0 produit dans supplier_products (critique)

**Cause** : double condition de garde dans l'import et le backfill.

**Dans `import-comlandi/index.ts`** (ligne 234) :
```text
if (savedProductId && comlandiSupplierId && prixHT > 0)
```
Le champ `prixHT` est calculé depuis `row.prix` (le prix HT B2B). Mais `row.prix` est la colonne interne après mapping. Si le fichier CSV Comlandi n'a pas de colonne `prix` exactement mappée, `prixHT = 0` et l'upsert est ignoré silencieusement. Résultat : **0 produits Comlandi** dans `supplier_products`.

**Dans `backfill-supplier-products/index.ts`** (ligne 157) :
```text
supplier_price: product.cost_price ?? null,
```
Pour les produits Comlandi, `cost_price` est **NULL dans la BDD** (la colonne `cost_price` n'est jamais peuplée lors de l'import Comlandi — seul `price_ht` l'est). Or `supplier_price` est `NOT NULL` dans `supplier_products`. L'upsert échoue donc avec une violation de contrainte, et les 34 226 produits Comlandi restent sans liaison fournisseur.

**Preuve** : La BDD confirme `with_cost_price: 0` pour tous les produits Comlandi, et `supplier_products` pour Comlandi = 0 lignes.

---

### Problème 2 — Liderpapel : stock_quantity toujours 0 dans supplier_products

**Cause** : La condition d'import du stock dans `import-comlandi` (handler Liderpapel, ligne 401) :
```text
if (parseNum(row.stock_quantity) >= 0 && row.stock_quantity !== undefined && row.stock_quantity !== '')
```
Cette condition peuple `products.stock_quantity`, mais l'upsert dans `supplier_products` utilise `productData.stock_quantity ?? 0`. Si le fichier Catalog ne contient pas de colonne stock (c'est normal — le stock vient du fichier Stock séparé), `productData.stock_quantity` est `undefined`, donc `supplier_products.stock_quantity = 0` pour tous les 8 962 produits.

**Preuve** : `MIN/MAX/AVG stock_quantity` = 0 dans `supplier_products` pour Liderpapel, alors que `products.stock_quantity` peut être > 0 après import du fichier Stock.

---

### Problème 3 — Mapping des colonnes Comlandi : colonnes ignorées silencieusement

**Cause** : La logique de mapping dans `AdminComlandi.tsx` (ligne 244) :
```text
if (normalized === normalizeHeader(pattern) || normalized.includes(normalizeHeader(pattern)))
```
La condition `.includes()` peut provoquer des faux-positifs ou des non-matchs selon les en-têtes réels du fichier CSV Comlandi. Par exemple, si le fichier source utilise `"Prix d'achat"` au lieu de `"prix"`, le mapping rate. De plus, l'import ne logge pas les colonnes non mappées, donc l'utilisateur ne sait pas quels champs ont été ignorés.

**Conséquence** : si `prix` n'est pas trouvé, `prixHT = 0`, et la condition de garde ci-dessus empêche l'upsert dans `supplier_products`.

---

### Problème 4 — supplier_products non visible pour Comlandi et ALKOR dans le module Gestion Fournisseurs

**Cause** : Vue `SupplierProducts` filtre par `supplier_id` passé en prop. Comlandi a 0 lignes dans `supplier_products` (causé par Problème 1). Le composant affiche donc "Aucun produit associé à ce fournisseur" même si 34 768 produits existent dans `products`.

---

## Plan de correction (4 fichiers)

### Correction 1 — backfill : utiliser `price_ht` quand `cost_price` est NULL (Comlandi)

Dans `supabase/functions/backfill-supplier-products/index.ts`, ligne 157 :

**Avant :**
```text
supplier_price: product.cost_price ?? null,
```

**Après :**
```text
supplier_price: product.cost_price ?? product.price_ht ?? 0.01,
```

Cela permet à l'upsert de respecter la contrainte `NOT NULL` sur `supplier_price`. Pour Comlandi, `price_ht` représente le tarif B2B (prix d'achat), donc c'est la valeur correcte à utiliser comme prix fournisseur.

Il faut aussi ajouter `price_ht` au select de la requête products (ligne 112) :
```text
.select('id, ean, cost_price, price_ht, stock_quantity, attributs, ref_b2b, sku_interne')
```

### Correction 2 — backfill : synchroniser stock_quantity depuis products

Dans la même fonction, ligne 158, utiliser `product.stock_quantity` (qui est déjà sélectionné) :
```text
stock_quantity: product.stock_quantity ?? 0,
```
C'est déjà le cas. **Le vrai problème est que `stock_quantity` dans `products` peut être 0** si le fichier Stock Liderpapel n'a pas encore été importé. Le backfill est correct — il faut juste relancer après l'import Stock.

**Action supplémentaire** : Dans `import-comlandi/index.ts` handler Liderpapel (ligne 476), synchroniser le stock_quantity depuis `products` plutôt que `productData.stock_quantity` :
```text
stock_quantity: Math.floor(parseNum(row.stock_quantity)) > 0 
  ? Math.floor(parseNum(row.stock_quantity)) 
  : (productData.stock_quantity ?? 0),
```

### Correction 3 — import-comlandi : supprimer la condition `prixHT > 0` pour Comlandi

Dans `import-comlandi/index.ts`, ligne 234 :

**Avant :**
```text
if (savedProductId && comlandiSupplierId && prixHT > 0) {
```

**Après :**
```text
if (savedProductId && comlandiSupplierId) {
  const spPrice = prixHT > 0 ? prixHT : 0.01; // supplier_price NOT NULL
```

Et utiliser `spPrice` dans l'upsert au lieu de `prixHT`. Cela garantit que même les lignes avec prix = 0 créent une entrée dans `supplier_products`.

### Correction 4 — AdminComlandi : afficher les colonnes non mappées pour diagnostic

Dans `AdminComlandi.tsx`, après le parsing du fichier, afficher un résumé :
- Colonnes reconnues (mappées)
- Colonnes **ignorées** (non trouvées dans COLUMN_MAP)

Cela permettra à l'utilisateur de diagnostiquer si le fichier source a des en-têtes inattendus.

---

## Fichiers modifiés

| Fichier | Modification |
|---------|-------------|
| `supabase/functions/backfill-supplier-products/index.ts` | Correction `supplier_price = cost_price ?? price_ht ?? 0.01` + ajout `price_ht` au select |
| `supabase/functions/import-comlandi/index.ts` | Supprimer condition `prixHT > 0` pour le upsert Comlandi, utiliser `Math.max(prixHT, 0.01)` |
| `src/pages/AdminComlandi.tsx` | Afficher colonnes non mappées dans l'aperçu pour aider au diagnostic |

## Ordre d'exécution recommandé

1. Déployer les corrections
2. Aller dans **Admin > Comlandi/Liderpapel > Rétroaction** et cliquer **"Lancer la rétroaction"**
3. Vérifier dans **Admin > Fournisseurs > Comlandi > Produits** que les lignes apparaissent
4. Pour les stocks Liderpapel : réimporter le fichier Stock JSON pour peupler `products.stock_quantity`, puis relancer la rétroaction

## Section technique

### Pourquoi `price_ht` et pas `price` pour Comlandi ?

Le champ `price_ht` dans la table `products` correspond au prix HT hors taxes (prix d'achat B2B dans le contexte Comlandi, qui vient du champ `prix` du CSV). C'est donc la valeur correcte pour `supplier_products.supplier_price`.

### Contrainte NOT NULL sur supplier_price

La table `supplier_products` a `supplier_price NOT NULL`. Si on passe `NULL`, Postgres rejette la ligne silencieusement (car l'edge function catch l'erreur mais ne la remonte pas dans les stats). C'est pourquoi les 34 226 produits Comlandi ne sont pas liés malgré les tentatives précédentes.

### RLS : pas un problème ici

Les edge functions utilisent `SUPABASE_SERVICE_ROLE_KEY` qui bypasse le RLS. La politique RLS actuelle (`Admins can view supplier products`) ne bloque pas les insertions depuis les fonctions d'import.
