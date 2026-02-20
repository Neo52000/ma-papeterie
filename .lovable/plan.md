
# Plan de correction : fournisseur unique + images produits

## Diagnostic final

### 1. Comlandi et Liderpapel = UN seul fournisseur (CS Group)

La documentation le confirme explicitement : **Comlandi S.A.** (CS Group) opère sous deux marques — **Comlandi** pour les fichiers CSV B2B, et **Liderpapel** pour les fichiers JSON (SFTP). Le namespace XML est `https://web.liderpapel.com` pour les deux. Il y a actuellement **deux entrées distinctes** dans la table `suppliers` (Comlandi + Liderpapel), et `attributs->>'source'` vaut soit `'comlandi'` soit `'liderpapel'` selon la méthode d'import.

**Conséquence** : le backfill crée deux liaisons `supplier_products` pour le même produit (une par fournisseur), et la page "Gestion fournisseurs" affiche deux lignes séparées.

**Correction** : fusionner les deux fournisseurs en un seul nommé **"CS Group (Comlandi / Liderpapel)"** et mettre à jour les références dans `supplier_products`. Cela se fait sans migration destructive — on conserve l'ID Comlandi comme ID principal et on réassigne toutes les entrées Liderpapel vers cet ID.

### 2. Images manquantes (0 photos dans les produits)

**Cause racine** : Le flux d'images a deux problèmes critiques.

**Problème A — batchFindProductIds utilise une syntaxe PostgREST invalide :**
```typescript
// INVALIDE — .in() ne supporte pas la syntaxe attributs->>'key'
.in('attributs->>ref_liderpapel' as any, unmatched)
```
PostgREST n'accepte pas les opérateurs JSON dans `.in()`. Résultat : toutes les requêtes de fallback retournent 0 résultats et tous les produits sont `skipped` dans le multimedia import.

**La bonne syntaxe Supabase pour filtrer sur un champ JSONB :**
```typescript
.in('attributs->>ref_liderpapel', unmatched)  // -> ne marche pas dans .in()
// Correct : utiliser .filter() ou une requête par EAN
```
Il faut remplacer ces lookups par une approche par EAN ou par une requête SQL directe via `rpc`.

**Problème B — les images sont stockées dans `product_images` mais `products.image_url` n'est jamais mis à jour :**
L'import MultimediaLinks insère dans `product_images` (table secondaire) mais l'affichage produit lit `products.image_url`. Il faut, après l'insertion dans `product_images`, mettre à jour `products.image_url` avec l'URL principale (`is_principal = true`).

**Problème C — l'URL image Comlandi/Liderpapel est publiquement accessible :**
D'après la doc, les URLs sont de la forme `https://www.comlandi.fr/resources/img/products/00225g.jpg`. Ces URLs sont directement stockées dans `url_originale` — il faut les copier dans `products.image_url` pour qu'elles s'affichent.

## Fichiers à modifier

### Fichier 1 : `supabase/functions/fetch-liderpapel-sftp/index.ts`

**Correction A — batchFindProductIds :**

Remplacer les lookups JSON invalides par une approche en deux étapes :
1. Lookup via `supplier_products.supplier_reference` (fonctionne déjà)
2. Fallback : lookup par EAN uniquement (le lookup par `attributs->>'ref_liderpapel'` via `.in()` est invalide, le remplacer par `.eq()` dans une boucle ou une requête `rpc`)

Nouvelle logique :
```typescript
// Étape 1 : via supplier_products (fonctionne)
const { data: spRows } = await supabase
  .from('supplier_products')
  .select('supplier_reference, product_id')
  .in('supplier_reference', refs);

// Étape 2 : fallback par EAN pour les refs non trouvées (>= 8 chars = EAN)
const eanRefs = unmatched.filter(r => r.length >= 8);
const { data: eanRows } = await supabase
  .from('products')
  .select('id, ean')
  .in('ean', eanRefs);

// Étape 3 : pour les refs courtes (id Comlandi/Liderpapel), 
// utiliser un filter textuel valide
const shortRefs = unmatched.filter(r => r.length < 8);
// Lookup par ref_liderpapel en utilisant la syntaxe correcte
for (const ref of shortRefs.slice(0, 100)) { // par lots pour éviter N+1
  const { data } = await supabase
    .from('products')
    .select('id')
    .filter('attributs->>ref_liderpapel', 'eq', ref)
    .maybeSingle();
  if (data) map.set(ref, data.id);
}
```

**Correction B — synchroniser `products.image_url` après insertion dans `product_images` :**

Après le bloc d'upsert dans `product_images`, ajouter une mise à jour de `products.image_url` pour les images principales :
```typescript
// Après insertion product_images :
// Mettre à jour products.image_url pour les images principales
const principalImages = upsertRows.filter(r => r.is_principal);
for (const img of principalImages) {
  await supabase
    .from('products')
    .update({ image_url: img.url_originale })
    .eq('id', img.product_id)
    .is('image_url', null); // ne pas écraser une image existante
}
```

### Fichier 2 : `supabase/functions/backfill-supplier-products/index.ts`

**Correction — utiliser un seul fournisseur (CS Group) au lieu de deux :**

Remplacer la logique qui résout deux IDs séparés (`liderpapel` + `comlandi`) par une logique qui mappe les deux sources vers le **même** supplier ID (celui de Comlandi, qui est l'ID principal dans la DB car il a déjà 34 768 entrées) :

```typescript
// Résoudre les deux noms vers un seul ID fournisseur
const { data: comlandiRow } = await supabase
  .from('suppliers')
  .select('id')
  .ilike('name', '%comlandi%')
  .limit(1).maybeSingle();

// Les deux sources pointent vers le même fournisseur
const SINGLE_SUPPLIER_ID = comlandiRow?.id;
const sourceToSupplierId = {
  'comlandi': SINGLE_SUPPLIER_ID,
  'liderpapel': SINGLE_SUPPLIER_ID,
};
```

### Fichier 3 : `supabase/functions/import-comlandi/index.ts`

**Correction — le handler Liderpapel doit aussi rechercher par Comlandi :**

La résolution du supplier pour Liderpapel cherche `ilike '%liderpapel%'`. Si le supplier n'existe que sous le nom "Comlandi", cette recherche échoue. Corriger pour chercher les deux noms :

```typescript
// Chercher Comlandi ou Liderpapel (même fournisseur)
const { data: supplierRow } = await supabase
  .from('suppliers')
  .select('id')
  .or('name.ilike.%comlandi%,name.ilike.%liderpapel%,name.ilike.%cs group%')
  .limit(1)
  .maybeSingle();
```

### Fichier 4 : `src/pages/AdminComlandi.tsx`

**Correction — section backfill : informer que les deux sources partagent un fournisseur :**

Mettre à jour la description de la carte Rétroaction pour expliquer que Comlandi et Liderpapel sont le même fournisseur (CS Group), et que le backfill fusionne les deux sources vers un même supplier_id.

## Ordre d'exécution recommandé après déploiement

1. Déployer les corrections
2. **Fusionner le supplier Liderpapel vers Comlandi** dans la DB (migration SQL) :
   - Mettre à jour `supplier_products` où `supplier_id = liderpapel_id` → `supplier_id = comlandi_id`
   - Supprimer ou désactiver l'entrée Liderpapel dans `suppliers`
3. Relancer la rétroaction (backfill) pour lier les produits manquants
4. Réimporter le fichier **MultimediaLinks.json** depuis le SFTP Liderpapel pour peupler les images

## Migration SQL requise

```sql
-- 1. Fusionner Liderpapel → Comlandi dans supplier_products
UPDATE public.supplier_products
SET supplier_id = '450c421b-c5d4-4357-997d-e0b7931b5de8' -- Comlandi ID
WHERE supplier_id = 'ad988aee-7256-4e8f-a92f-5eb4e816af0c' -- Liderpapel ID
ON CONFLICT (supplier_id, product_id) DO NOTHING;

-- 2. Renommer le fournisseur Comlandi en CS Group
UPDATE public.suppliers
SET name = 'CS Group (Comlandi / Liderpapel)',
    country = 'ES',
    is_active = true
WHERE id = '450c421b-c5d4-4357-997d-e0b7931b5de8';

-- 3. Désactiver Liderpapel (ne pas supprimer pour éviter les FK)
UPDATE public.suppliers
SET is_active = false,
    name = 'Liderpapel [fusionné → CS Group]'
WHERE id = 'ad988aee-7256-4e8f-a92f-5eb4e816af0c';
```

## Résumé des corrections

| Problème | Fichier | Correction |
|----------|---------|------------|
| Deux fournisseurs pour la même société | Migration SQL + backfill | Fusionner Liderpapel → Comlandi (CS Group) |
| `batchFindProductIds` : syntaxe `.in()` invalide sur JSONB | `fetch-liderpapel-sftp/index.ts` | Remplacer par `.filter('attributs->>ref_liderpapel', 'eq', ref)` et `.in('ean', ...)` |
| Images non visibles : `product_images` remplie mais `products.image_url` = NULL | `fetch-liderpapel-sftp/index.ts` | Après insertion dans `product_images`, mettre à jour `products.image_url` |
| Handler Liderpapel ne trouve pas le supplier sous le nom "Comlandi" | `import-comlandi/index.ts` | Requête OR sur les deux noms |
| Backfill duplique les liaisons (deux IDs fournisseur) | `backfill-supplier-products/index.ts` | Mapper les deux sources vers un seul ID |
