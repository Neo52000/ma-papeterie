
# Diagnostic et correction : Import ALKOR → Produits Fournisseurs invisibles

## Cause racine identifiée

### Ce qui se passe réellement

L'import ALKOR a **bien fonctionné** : la table `supplier_offers` contient les offres ALKOR (vérifiées en BDD avec des refs comme 993153, 299794, etc., toutes `is_active=true`).

Le problème n'est pas dans l'import — c'est dans **ce que l'onglet "Produits Fournisseurs" affiche**.

### Deux tables, deux vues — le malentendu

```
supplier_products  ← ce que l'onglet "Produits Fournisseurs" affiche (SupplierProducts.tsx)
supplier_offers    ← ce que l'import ALKOR remplit
```

Le composant `SupplierProducts.tsx` fait une requête sur `supplier_products` filtrée par `supplier_id` (UUID Supabase du fournisseur "ALKOR"). L'import ALKOR, lui, écrit dans `supplier_offers` avec le champ textuel `supplier = 'ALKOR'`. **Il n'y a aucun lien entre les deux** lors de l'import : aucune ligne n'est insérée dans `supplier_products` pour ALKOR.

La table `supplier_products` pour ALKOR est vide — confirmé par la requête SQL qui retourne `[]`.

### Problème secondaire : mapping de colonnes XLSX

Dans le fichier fourni, la colonne `EAN UC` a un en-tête complexe avec des retours à la ligne ("Page cata\nBurolike", "Vendu par\nBurolike", etc.). Le mapping actuel dans `AdminAlkor.tsx` cherche `"ean uc"` (normalisé) ce qui fonctionne. Les données EAN sont bien présentes (ex: `3266810167914`). Ce n'est pas un problème de parsing.

---

## Solution : enrichir `supplier_products` depuis les `supplier_offers` + améliorer l'onglet fournisseur

### Approche retenue

Deux corrections complémentaires :

**A) Adapter l'import ALKOR** pour qu'il upserte aussi dans `supplier_products` (le mapping stable) avec le `supplier_id` UUID de ALKOR en base.

**B) Améliorer l'onglet "Produits Fournisseurs"** pour qu'il affiche AUSSI les `supplier_offers` du fournisseur sélectionné — en combinant les deux sources dans une vue unifiée.

L'option B est plus pertinente à long terme car `supplier_offers` est la source de vérité dynamique pour ALKOR, COMLANDI et SOFT. On enrichit la vue "Produits fournisseurs" avec les offres actuelles.

---

## Modifications prévues

### 1. `supabase/functions/import-alkor/index.ts` — Upsert `supplier_products`

Après le `savedProductId` résolu, avant le push dans `alkorOffersBatch`, ajouter un upsert dans `supplier_products` :

```typescript
// Résolution du supplier_id ALKOR une seule fois avant la boucle
const { data: alkorSupplier } = await supabase
  .from('suppliers')
  .select('id')
  .ilike('name', '%alkor%')
  .limit(1)
  .maybeSingle();
const alkorSupplierId = alkorSupplier?.id ?? null;

// Dans la boucle, après savedProductId résolu :
if (savedProductId && alkorSupplierId) {
  supplierProductsBatch.push({
    supplier_id: alkorSupplierId,
    product_id: savedProductId,
    supplier_reference: ref,
    source_type: 'alkor-catalogue',
    is_preferred: false,      // ALKOR est prioritaire mais sans prix → non préféré par défaut
    updated_at: new Date().toISOString(),
  });
}
```

Flush en batch (même logique que `supplier_offers`) avec `onConflict: 'supplier_id,product_id'`.

### 2. `src/components/suppliers/SupplierProducts.tsx` — Onglet enrichi avec supplier_offers

Actuellement cet onglet ne montre que `supplier_products`. On va le compléter pour afficher les `supplier_offers` liées au même fournisseur.

Logique :
- Récupérer le nom ENUM du fournisseur depuis le champ `suppliers.name` (ex: "ALKOR" → `'ALKOR'`, "Soft Carrier" → `'SOFT'`, "CS Group" → `'COMLANDI'`)
- Faire une 2e requête sur `supplier_offers` avec `eq('supplier', supplierEnum)`
- Fusionner les deux listes dans l'affichage avec un onglet dédié "Offres dynamiques (imports)"

#### Mapping nom fournisseur → code ENUM

```typescript
function getSupplierEnum(name: string): 'ALKOR' | 'COMLANDI' | 'SOFT' | null {
  const n = name.toUpperCase();
  if (n.includes('ALKOR') || n.includes('BUROLIKE')) return 'ALKOR';
  if (n.includes('COMLANDI') || n.includes('CS GROUP') || n.includes('LIDERPAPEL')) return 'COMLANDI';
  if (n.includes('SOFT')) return 'SOFT';
  return null;
}
```

#### Nouvelle section dans l'onglet "Produits"

Deux sous-onglets ou deux sections dans la même page :
1. **"Mapping catalogue"** — la table `supplier_products` actuelle (gestion manuelle)
2. **"Offres importées"** — les `supplier_offers` avec colonnes : Réf fournisseur · Produit · Prix achat HT · PVP TTC · Stock · Statut · Vu le

La section "Offres importées" inclut :
- Un badge "ALKOR / COMLANDI / SOFT" coloré
- Le nombre d'offres actives vs totales
- Un bouton "Voir la fiche produit" pour chaque ligne (lien vers `/admin/products/:id/offers`)

### 3. `src/pages/AdminSuppliers.tsx` — Passer le nom du fournisseur à `SupplierProducts`

Actuellement `SupplierProducts` reçoit seulement `supplierId`. On doit aussi passer `supplierName` pour que le composant puisse résoudre le code ENUM et requêter `supplier_offers`.

```typescript
// Avant :
<SupplierProducts supplierId={selectedSupplier} />

// Après :
<SupplierProducts 
  supplierId={selectedSupplier} 
  supplierName={selectedSupplierData?.name ?? ''} 
/>
```

---

## Fichiers modifiés

| # | Fichier | Modification |
|---|---------|-------------|
| 1 | `supabase/functions/import-alkor/index.ts` | Ajouter upsert `supplier_products` (mapping stable) |
| 2 | `src/components/suppliers/SupplierProducts.tsx` | Ajouter section "Offres importées" depuis `supplier_offers` |
| 3 | `src/pages/AdminSuppliers.tsx` | Passer `supplierName` à `SupplierProducts` |

Aucune migration SQL nécessaire — toutes les tables et colonnes existent.

## Résultat attendu

Après ces modifications, en cliquant sur le fournisseur "ALKOR" dans `/admin/suppliers` et en ouvrant l'onglet "Produits" :
- Section "Offres importées" : affiche les N offres ALKOR déjà en base (importées aujourd'hui), avec référence, nom produit, stock=0, is_active=true
- Section "Mapping catalogue" : vide au départ, remplie par les futurs imports ALKOR (ou manuellement)

Au prochain import ALKOR, les deux tables seront alimentées simultanément.
