
# Backlog T0→T9 : Câblage des pipelines d'alimentation

## Diagnostic

Le schéma est 100% en place. Toutes les tables existent (product_attributes, product_price_history, product_lifecycle_logs, product_images, product_seo). Les colonnes manquantes sont toutes ajoutées. Le problème est que les edge functions n'alimentent pas ces tables.

État réel :
- product_images : 0 lignes (MultimediaLinks jamais parsé dans l'edge function)
- product_attributes : 0 lignes (AdditionalInfo Liderpapel jamais extrait)
- product_price_history : 0 lignes (changements de prix calculés mais jamais persistés)
- product_lifecycle_logs : 0 lignes (created/updated jamais logués)
- product_seo : 0 lignes (Descriptions jamais importées dans cette table)
- supplier_import_logs : 0 lignes (import Comlandi CSV ne logue pas)

Priorités d'exécution issues du backlog :

| Ticket | Périmètre | Fichier touché |
|--------|-----------|----------------|
| T3.1 | Images MultimediaLinks → product_images + products.image_url | fetch-liderpapel-sftp |
| T1.2 | Descriptions → product_seo | fetch-liderpapel-sftp |
| T2.1 | Attributs AdditionalInfo → product_attributes | fetch-liderpapel-sftp + import-comlandi |
| T4.1/T4.2 | Changements de prix → product_price_history | import-comlandi + fetch-liderpapel-sftp handleLiderpapel |
| T9.1 | Lifecycle logs → product_lifecycle_logs | import-comlandi + fetch-liderpapel-sftp handleLiderpapel |
| T8.1 | Logs import → supplier_import_logs (avec price_changes_count, deactivated_count) | import-comlandi |
| T5.1 | Stock mis à jour dans supplier_products déjà fait — ajouter UX statut disponibilité | ProductDetailPage |
| T1.3 / T3.2 | Fiche produit front : galerie images, onglets descriptions, badges | ProductDetailPage |
| Route | /produit/:id enregistrée dans App.tsx | App.tsx |

---

## Détail des corrections par fichier

### 1. `supabase/functions/fetch-liderpapel-sftp/index.ts` — 4 corrections

**T3.1 — MultimediaLinks → product_images**

Le handler `multimedia_json` existe mais ne popule pas `products.image_url` après insertion. Après l'upsert dans `product_images`, ajouter :

```typescript
// Sync image principale vers products.image_url
const principalBatch = upsertRows.filter(r => r.is_principal);
if (principalBatch.length > 0) {
  for (const img of principalBatch) {
    await supabase.from('products')
      .update({ image_url: img.url_originale })
      .eq('id', img.product_id)
      .is('image_url', null); // ne pas écraser si déjà rempli
  }
}
```

Aussi : dans le parser MultimediaLinks, filtrer `type === 'IMG'` et `active !== false` avant l'upsert (T3.1 critère d'acceptation "pas d'images cassées").

**T1.2 — Descriptions → product_seo**

Le handler `descriptions_json` reconstruit `product_seo` mais n'utilise pas `description_detaillee`. Mapper `DescCode = 'DETAILED'` ou `'COMP'` vers `description_detaillee`. Ajouter `description_source: 'supplier'` et `lang: 'fr'` lors de l'upsert.

**T2.1 — Attributs depuis Catalog JSON**

Dans `parseCatalogJson`, le champ `AdditionalInfo` contient `Brand`, `Color`, `Format`, `Material` etc. Après l'upsert principal dans `products`, insérer dans `product_attributes` :
- `Brand` → type `'marque'`
- `Color` / `Colour` / `Couleur` → type `'couleur'`
- `Format` / `Size` → type `'format'`
- `Material` / `Matière` → type `'matiere'`
- `Usage` → type `'usage'`

Upsert par batch de 50, en ignorant les doublons (ON CONFLICT sur `product_id + attribute_name + attribute_value`).

**T9.1 — Lifecycle logs dans handleLiderpapel**

Lors de chaque `result.created++` ou `result.updated++`, insérer dans `product_lifecycle_logs` :

```typescript
await supabase.from('product_lifecycle_logs').insert({
  product_id: savedProductId,
  event_type: isNew ? 'created' : 'updated',
  performed_by: 'import-liderpapel',
  details: { ref, ean, source: 'liderpapel' }
});
```

Batch ces insertions par lot de 50 à la fin pour ne pas doubler les requêtes.

### 2. `supabase/functions/import-comlandi/index.ts` — 3 corrections

**T4.1 — Historique prix lors d'une mise à jour**

Dans le bloc `if (existing)`, avant le `update()`, lire l'ancien prix et comparer :

```typescript
const { data: old } = await supabase
  .from('products').select('price_ht, price_ttc, cost_price').eq('id', existing.id).single();

if (old && (old.price_ht !== prixHT || old.price_ttc !== prixTTC)) {
  priceHistoryBatch.push({
    product_id: existing.id,
    changed_by: 'import-comlandi',
    supplier_id: comlandiSupplierId,
    old_cost_price: old.cost_price,
    new_cost_price: prixHT, // pour Comlandi, cost_price = prix_achat HT
    old_price_ht: old.price_ht,
    new_price_ht: prixHT,
    old_price_ttc: old.price_ttc,
    new_price_ttc: prixTTC,
    change_reason: 'import-comlandi-catalogue'
  });
}
```

Flush `priceHistoryBatch` toutes les 50 entrées via `supabase.from('product_price_history').insert(batch)`.

**T2.1 — Attributs depuis CSV Comlandi**

Après upsert produit, pour chaque ligne : si `row.marque`, insérer `product_attributes` type `'marque'`. Si `row.umv_dim`, insérer type `'dimensions'`. Ces insertions sont faites en batch à la fin du traitement.

**T9.1 — Lifecycle logs + T8.1 — Logs import améliorés**

À la fin de l'import (avant `supplier_import_logs`), flush le batch `lifecycleLogs` dans `product_lifecycle_logs`. Puis enrichir l'entrée `supplier_import_logs` avec `price_changes_count` et `deactivated_count`.

### 3. `src/pages/ProductDetailPage.tsx` — Finalisation

La page est déjà créée avec la bonne structure (onglets, galerie, attributs). Ajouter :

**T5.2 — UX disponibilité** : affichage dynamique basé sur `stock_quantity` et `delivery_days` :
```
> 0 → "En stock"
= 0 et delivery_days → "Disponible sous X jours ouvrés"  
= 0 et !delivery_days → "Sur commande"
is_end_of_life → "Fin de vie — stock limité"
```

**T3.2 — Fallback image manquante** : si `images.length === 0` et `product.image_url === null`, afficher une card placeholder avec message "Image non disponible" sans briser la mise en page.

**T4.3 — Détail taxes** : ligne "dont D3E : X €" et "dont COP : X €" si les taxes sont présentes dans `attributs.taxe_d3e` / `attributs.taxe_cop`.

### 4. `src/App.tsx` — Route /produit/:id

Ajouter l'import de `ProductDetailPage` et la route :
```tsx
import ProductDetailPage from "./pages/ProductDetailPage";
// ...
<Route path="/produit/:id" element={<ProductDetailPage />} />
```

### 5. `src/pages/AdminProducts.tsx` — Lien vers fiche produit

Dans la liste des produits (tableau), ajouter un bouton "Voir fiche" qui navigue vers `/produit/:id` pour chaque produit.

---

## Contraintes respectées (backlog)

- Imports transactionnels : batches de 50, les erreurs n'interrompent pas le lot
- Pas de secrets en clair : SUPABASE_SERVICE_ROLE_KEY déjà utilisé
- RLS : product_price_history et product_lifecycle_logs déjà protégées (admins only)
- Rollback possible : product_lifecycle_logs horodate chaque opération
- UX simple : pas de requêtes N+1 sur la fiche produit — jointure unique SELECT *

---

## Fichiers modifiés

| Fichier | Tickets couverts |
|---------|-----------------|
| `supabase/functions/fetch-liderpapel-sftp/index.ts` | T3.1, T1.2, T2.1, T9.1 |
| `supabase/functions/import-comlandi/index.ts` | T4.1, T2.1, T9.1, T8.1 |
| `src/pages/ProductDetailPage.tsx` | T5.2, T3.2, T4.3 |
| `src/App.tsx` | Route /produit/:id |
| `src/pages/AdminProducts.tsx` | Lien "Voir fiche" |

---

## Ce qui n'est PAS dans ce plan (backlog futur)

- T6.2 Menu catégories hiérarchique (nécessite UX designer)
- T7.1/T7.2 Relations produits (product_relations vide, pas de données fournisseur)
- T8.2 Simulation prix (outil séparé existant dans AdminComlandi)
- T9.2 Alertes monitoring (edge function dédiée)
- T2.2 Filtres dynamiques front (nécessite product_attributes rempli d'abord)
