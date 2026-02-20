
# Correction Achats : Lien BdC ↔ Réceptions + Édition des Bons de Commande

## Problèmes identifiés

### Problème 1 — PO-2026-0001 invisible dans les réceptions
Le filtre dans `StockReceptions.tsx` exclut explicitement les brouillons :
```typescript
.not('status', 'in', '(cancelled,draft)')
```
Or, un BdC en `draft` **doit** être visible pour démarrer une réception (notamment pour le finaliser). La seule règle cohérente est d'exclure uniquement les BdC `cancelled`.

### Problème 2 — BdC créé sans fournisseur (supplier_id null)
La création dans `AdminPurchases.tsx` ne demande aucun fournisseur :
```typescript
supabase.from('purchase_orders').insert({ order_number: data, created_by: user?.id, status: 'draft' })
```
Résultat : `supplier_id=null`, donc le BdC s'affiche sans fournisseur et est peu utile.

### Problème 3 — Aucune édition possible des BdC
La liste des bons de commande est en lecture seule. Il est impossible de :
- Changer le fournisseur
- Changer le statut (draft → sent → confirmed)
- Ajouter des lignes produits (purchase_order_items)
- Définir une date de livraison prévue
- Ajouter des notes

## Solution

### Fichiers à modifier
1. **`src/components/admin/StockReceptions.tsx`** — corriger le filtre pour inclure les `draft`
2. **`src/pages/AdminPurchases.tsx`** — refonte complète : création avec fournisseur + dialog d'édition complet

---

## Détail des modifications

### 1. `StockReceptions.tsx` — Filtre élargi

**Changement unique** : remplacer `.not('status', 'in', '(cancelled,draft)')` par `.not('status', 'eq', 'cancelled')` pour que les BdC en `draft`, `sent`, `confirmed`, `partially_received` soient tous disponibles à la sélection pour une réception.

La liste affichée dans le select montrera le badge de statut déjà présent, donc l'utilisateur verra bien que le BdC est "Brouillon".

---

### 2. `AdminPurchases.tsx` — Refonte avec édition

#### 2a. Création avec fournisseur
Le dialog de création "Nouveau bon de commande" demandera :
- Fournisseur (select parmi `suppliers`)
- Date de livraison prévue (input date)
- Notes (textarea)

#### 2b. Dialog d'édition BdC (nouveau)
Chaque carte de BdC aura un bouton "Modifier" qui ouvre un `Dialog` complet avec :

**En-tête BdC :**
- Numéro (lecture seule)
- Fournisseur (select modifiable)
- Statut (select : draft / sent / confirmed / partially_received / received / cancelled)
- Date de livraison prévue (date picker)
- Notes (textarea)

**Tableau des lignes (`purchase_order_items`) :**
- Colonne : Produit (recherche par nom/SKU/EAN)
- Colonne : Quantité commandée
- Colonne : Prix unitaire HT
- Colonne : Quantité reçue (lecture seule, remplie par les réceptions)
- Bouton "+" pour ajouter une ligne
- Bouton "×" pour supprimer une ligne

**Footer :**
- Total HT calculé automatiquement (somme qty × prix_ht)
- Bouton "Enregistrer"

#### 2c. Transitions de statut logiques
Lors de la sauvegarde, si le statut passe de `draft` à `sent` ou `confirmed`, on met à jour en BDD.

#### 2d. Suppression d'un BdC
Bouton "Supprimer" disponible uniquement si `status = 'draft'` (sécurité).

---

## État des données actuel (confirmé par requête SQL)

| Champ | Valeur |
|---|---|
| `purchase_orders` | 1 enregistrement : PO-2026-0001, status=draft, supplier_id=null |
| `purchase_order_items` | colonnes: id, purchase_order_id, product_id, supplier_product_id, quantity, unit_price_ht, unit_price_ttc, received_quantity |
| Fournisseurs | ALKOR, CS Group (Comlandi/Liderpapel), Soft Carrier |

Aucune migration SQL nécessaire — les tables `purchase_orders` et `purchase_order_items` ont déjà toutes les colonnes requises.

---

## Ordre d'exécution

| # | Fichier | Changement |
|---|---------|-----------|
| 1 | `src/components/admin/StockReceptions.tsx` | Ligne 122 : `.not('status', 'eq', 'cancelled')` |
| 2 | `src/pages/AdminPurchases.tsx` | Refonte : création avec fournisseur + dialog édition BdC + gestion lignes |

