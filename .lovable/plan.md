

# Plan : Persistance du Formulaire de Gestion des Produits

## Probleme identifie

Quand vous saisissez des informations dans le formulaire de produit et que vous naviguez vers une autre page (par exemple pour copier un EAN ou une description), les donnees sont perdues car :

1. Le composant `ProductForm` utilise un etat local `useState` (ligne 186)
2. Quand vous quittez la page, le composant est demonte et l'etat est efface
3. Au retour, le formulaire recommence a zero

## Solution proposee

Creer un **store Zustand persiste** qui sauvegarde automatiquement les donnees du formulaire dans le `localStorage` du navigateur.

### Fonctionnement :
- Chaque modification dans un champ est sauvegardee instantanement
- En quittant la page, les donnees restent en memoire
- Au retour, le formulaire se recharge avec les donnees precedentes
- Un bouton "Effacer le brouillon" permet de repartir a zero
- Le brouillon est automatiquement supprime apres une sauvegarde reussie

---

## Details techniques

### 1. Nouveau fichier : `src/stores/productFormStore.ts`

```typescript
// Store Zustand avec persistance localStorage
interface ProductFormStore {
  draftProduct: Product | null;      // Donnees du brouillon
  isEditing: boolean;                // Mode edition ou creation
  editingProductId: string | null;   // ID du produit en cours d'edition

  // Actions
  setDraft: (data: Partial<Product>) => void;
  clearDraft: () => void;
  startEditing: (product: Product) => void;
  startCreating: () => void;
}
```

Caracteristiques :
- Utilise `zustand/middleware/persist` pour sauvegarder dans `localStorage`
- Cle de stockage : `product-form-draft`
- Sauvegarde automatique a chaque modification

### 2. Modification : `src/pages/AdminProducts.tsx`

Changements :
- Importer et utiliser le nouveau store
- Remplacer l'etat local `formData` par le store persiste
- Ajouter un indicateur visuel "Brouillon sauvegarde"
- Ajouter un bouton "Effacer le brouillon"
- Nettoyer le brouillon apres sauvegarde reussie

### 3. Interface utilisateur

Ajouts visuels :
- Badge "Brouillon" visible quand des donnees non sauvegardees existent
- Horodatage de la derniere modification
- Bouton pour effacer et recommencer

---

## Fichiers concernes

| Fichier | Action |
|---------|--------|
| `src/stores/productFormStore.ts` | Creer |
| `src/pages/AdminProducts.tsx` | Modifier |

---

## Avantages

- **Zero perte de donnees** : Naviguez librement entre les onglets
- **Reprise automatique** : Retrouvez votre travail en cours
- **Compatible multi-onglets** : Le brouillon est partage entre les onglets du navigateur
- **Leger** : Utilise localStorage, aucun appel serveur supplementaire

