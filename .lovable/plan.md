
# Two features: Réceptions éditables + Page globale "Offres fournisseurs"

## Feature 1 — Réceptions éditables dans l'historique

### Problème actuel
Dans `StockReceptions.tsx`, les réceptions affichées dans l'historique sont en **lecture seule**. Quand on déplie une réception, on voit le tableau des lignes mais sans aucun moyen de :
- Modifier les quantités reçues
- Changer le statut d'une ligne (reçu / partiel / litige / non livré)
- Ajouter une note
- Modifier le statut global de la réception
- Supprimer une ligne

### Solution : dialog d'édition pour chaque réception existante

Chaque carte de réception dans l'historique aura un bouton **"Modifier"** (icône Pencil) qui ouvre un `Dialog` complet reprenant la même interface que la création, pré-remplie avec les données existantes.

**État local du dialog d'édition :**
```typescript
interface EditReceptionState {
  reception: StockReception;
  lines: EditReceptionLine[];  // avec quantité, statut, notes éditables
  status: string;
  notes: string;
}
```

**Fonctionnement :**
1. Clic sur "Modifier" → charge les `stock_reception_items` de la réception
2. Permet d'éditer chaque ligne : quantité reçue, statut, note
3. Bouton "Enregistrer" → UPDATE sur chaque `stock_reception_items` + UPDATE statut global de `stock_receptions`
4. Recalcul du statut global automatique (même logique que la création)

**Colonnes éditables dans le dialog :**
- Produit (lecture seule — on ne change pas quel produit)
- Attendu (lecture seule — vient du BdC)
- Reçu (input number éditable)
- Statut ligne (select : Reçu / Partiel / Litige / Non livré)
- Note / Motif (input texte)

**Bouton Modifier** ajouté à côté du badge statut dans chaque carte de réception.

---

## Feature 2 — Page globale `/admin/product-offers`

### Contexte
Le sidebar pointe déjà vers `/admin/product-offers` (section "Pricing & Concurrence" → "Offres fournisseurs"), mais cette route n'est **pas encore enregistrée** dans `App.tsx`. La route existante `/admin/products/:id/offers` est la vue par produit.

### Nouvelle page : `src/pages/AdminSupplierOffers.tsx`

**Structure de la page :**
- Layout : `AdminLayout` avec titre "Offres fournisseurs"
- Source de données : table `supplier_offers` avec join sur `products` (nom, SKU, EAN)

**Barre de filtres :**
- Filtre fournisseur : Select avec valeurs `ALKOR | COMLANDI | SOFT | (tous)`
- Filtre statut : Select `Actif | Inactif | Tous`
- Champ recherche : texte libre sur nom produit, SKU, `supplier_product_id`
- Tri : Select `Date vue desc (défaut) | Date vue asc | Prix achat | Stock`

**Colonnes du tableau :**
| Colonne | Source |
|---|---|
| Fournisseur | `supplier` (badge coloré ALKOR=bleu, COMLANDI=vert, SOFT=orange) |
| Réf. fournisseur | `supplier_product_id` |
| Produit | `products.name` (lien vers `/admin/products/:id/offers`) |
| SKU / EAN | `products.sku_interne` / `products.ean` |
| Prix achat HT | `purchase_price_ht` |
| PVP TTC | `pvp_ttc` |
| Stock | `stock_qty` (badge vert si > 0, rouge si = 0) |
| Statut | `is_active` (toggle switch) |
| Vu le | `last_seen_at` (date formatée) |

**Statistiques résumées en haut :**
- Nombre d'offres actives
- Nombre d'offres inactives (fantômes)
- Répartition par fournisseur

**Pagination :** 100 lignes par page avec `limit/offset`.

**Toggle is_active :** même pattern que `OffersTable.tsx` existant, avec mutation Supabase + invalidation de cache.

### Fichiers à créer/modifier :

| # | Fichier | Action |
|---|---------|--------|
| 1 | `src/components/admin/StockReceptions.tsx` | Ajouter bouton "Modifier" + dialog d'édition des réceptions existantes |
| 2 | `src/pages/AdminSupplierOffers.tsx` | Nouvelle page — tableau global `supplier_offers` |
| 3 | `src/App.tsx` | Ajouter la route `/admin/product-offers` → `AdminSupplierOffers` |

### Pas de migration SQL requise
Toutes les tables et colonnes existent déjà.

---

## Détail technique : édition des réceptions

### Chargement des lignes dans le dialog
Lors de l'ouverture du dialog d'édition, on charge les `stock_reception_items` avec leurs produits associés. Les lignes éditables sont stockées dans un state local.

### Sauvegarde
```typescript
// Pour chaque ligne modifiée :
await supabase.from('stock_reception_items')
  .update({ received_quantity: line.received, notes: noteWithStatus })
  .eq('id', line.id);

// Recalcul du statut global de la réception
const allReceived = lines.every(l => l.status === 'recu');
const hasLitige = lines.some(l => l.status === 'litige');
const globalStatus = hasLitige ? 'partial' : allReceived ? 'completed' : 'partial';

await supabase.from('stock_receptions')
  .update({ status: globalStatus, notes: editNotes })
  .eq('id', receptionId);
```

### Recalcul du stock (si quantité modifiée)
Si la quantité reçue augmente ou diminue par rapport à l'ancienne valeur, on met à jour `products.stock_quantity` avec la différence (`nouveau - ancien`).

---

## Ordre d'exécution

1. `src/components/admin/StockReceptions.tsx` — ajout dialog édition
2. `src/pages/AdminSupplierOffers.tsx` — nouvelle page
3. `src/App.tsx` — nouvelle route
