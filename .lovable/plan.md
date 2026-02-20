
# Correction : Données fournisseurs non mises à jour après import

## Diagnostic complet

Trois problèmes distincts ont été identifiés :

### Problème 1 — supplier_products toujours vide (critique)

Les fonctions d'import `handleLiderpapel` (dans `import-comlandi`) et l'import Comlandi CSV **mettent à jour la table `products`** mais **n'insèrent/mettent jamais à jour `supplier_products`**. Résultat : 76 837 produits importés, 0 lignes dans `supplier_products`, et l'onglet "Produits du fournisseur" est vide.

### Problème 2 — Colonne `supplier_ref` inexistante dans batchFindProductIds

Dans `fetch-liderpapel-sftp/index.ts`, la fonction de lookup :
```text
.select('supplier_ref, product_id')   ← colonne inexistante
```
La vraie colonne s'appelle `supplier_reference`. Cela signifie que le matching pour les enrichissements (Descriptions, MultimediaLinks, RelationedProducts) ne fonctionne que via EAN, jamais via la référence fournisseur.

### Problème 3 — Pas de rafraîchissement UI après import

Après un import Liderpapel/Comlandi, la page AdminSuppliers (onglets "Produits", "Historique") et la page AdminComlandi n'invalident pas leurs données. Les composants `SupplierProducts` et `ImportLogsHistory` font leur fetch au montage uniquement.

---

## Plan de correction

### Correction 1 — Upsert dans supplier_products lors de chaque import

Dans `import-comlandi/index.ts`, dans la fonction `handleLiderpapel` (et le handler Comlandi), après avoir trouvé ou créé le produit (`existingId`), ajouter un upsert dans `supplier_products` :

```text
// Identifier l'ID fournisseur par son nom (Liderpapel ou Comlandi)
// Upsert dans supplier_products avec :
{
  supplier_id: <UUID fournisseur>,
  product_id: <UUID produit>,
  supplier_reference: ref,          // référence Comlandi/Liderpapel
  supplier_price: costPrice,        // prix d'achat HT
  stock_quantity: Math.floor(parseNum(row.stock_quantity)),
  source_type: 'liderpapel',        // ou 'comlandi'
  is_preferred: false,              // par défaut
  updated_at: now,
}
```

L'upsert se fera sur le couple `(supplier_id, product_id)` — il faut vérifier qu'une contrainte unique existe ou utiliser un filtre.

Pour éviter N+1 queries, l'ID fournisseur est résolu **une seule fois** au début de la fonction via :
```text
SELECT id FROM suppliers WHERE LOWER(name) LIKE '%liderpapel%' LIMIT 1
```

### Correction 2 — Renommer supplier_ref → supplier_reference dans batchFindProductIds

Dans `supabase/functions/fetch-liderpapel-sftp/index.ts`, corriger la query :
```text
// Avant
.select('supplier_ref, product_id')

// Après
.select('supplier_reference, product_id')
```
Et adapter le mapping : `map.set(r.supplier_reference, r.product_id)`.

### Correction 3 — Rafraîchissement UI après import

Dans `AdminComlandi.tsx`, après chaque import réussi (fin de la boucle de batches), déclencher un refresh de l'historique des imports. Le composant `ImportLogsHistory` expose déjà `refetch` via `useImportLogs` — il faut passer ce callback depuis la page parent ou utiliser un signal de rechargement (`key` prop).

Dans `AdminSuppliers.tsx`, après que l'onglet "Import Catalogue" signale la fin d'un import (`onImportComplete`), forcer le rechargement du composant `SupplierProducts` en incrémentant une clé React (`refreshKey`).

---

## Fichiers modifiés

| Fichier | Modification |
|---------|-------------|
| `supabase/functions/import-comlandi/index.ts` | Ajouter upsert dans `supplier_products` après chaque produit traité (Liderpapel ET Comlandi) |
| `supabase/functions/fetch-liderpapel-sftp/index.ts` | Corriger `supplier_ref` → `supplier_reference` dans `batchFindProductIds` |
| `src/pages/AdminSuppliers.tsx` | Ajouter `refreshKey` state + passer via `key` à `SupplierProducts` pour forcer rechargement |
| `src/pages/AdminComlandi.tsx` | Déclencher invalidation `ImportLogsHistory` après import via callback ou signal |

## Section technique

### Contrainte unique sur supplier_products

Avant de faire l'upsert, il faut vérifier s'il existe une contrainte unique `(supplier_id, product_id)`. Si non, l'upsert utilisera une logique `SELECT → INSERT OR UPDATE`. Une requête SQL de vérification sera lancée au début du handler.

### Résolution de l'ID fournisseur sans hardcoder

Le handler reçoit `body.source = 'liderpapel'` ou `'comlandi'`. On recherche dynamiquement le fournisseur par son nom dans la table `suppliers` :
```text
SELECT id FROM suppliers WHERE LOWER(name) = 'liderpapel' LIMIT 1
```
Si aucun fournisseur n'est trouvé, l'upsert dans `supplier_products` est ignoré sans erreur (les produits sont quand même mis à jour).

### Volume et performance

Pour 76 837 produits existants, il n'y a pas de rétroaction automatique (le nouvel upsert ne s'applique qu'aux futurs imports). L'utilisateur devra relancer l'import pour peupler `supplier_products`. Le batching existant (lots de 50 dans import-comlandi + lots de 200 dans fetch-liderpapel) absorbe naturellement ce volume.
