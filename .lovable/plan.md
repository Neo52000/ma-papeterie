

## Ajouter des images aux categories manquantes

### Constat

- La base contient **170 categories actives**, toutes avec `image_url = NULL`.
- Le composant `CategoriesSection` (page d'accueil) a des images locales pour seulement **12 categories** (les 12 premieres par volume).
- Les 18 categories suivantes (MARQUEURS, DESSIN SCOLAIRE, EQUIPEMENT CLASSE, COURRIER, HYGIENE, PETITE ENFANCE, BUREAUTIQUE, PAPIERS, ETIQUETTES, COLORIAGE, CLASSEURS, PRODUITS POUR DECORER, ROLLERS ET STYLOS, EMBALLAGE, CAHIERS SCOLAIRES, INFORMATIQUE, STYLOS-BILLES, et "Non classe") n'ont aucune image.

### Plan

#### 1. Generer 18 nouvelles images pour les categories manquantes du top 30

Creer des images professionnelles style e-commerce (fond clair, eclairage naturel) pour :

| Categorie | Sujet de l'image |
|-----------|-----------------|
| MARQUEURS | Marqueurs et feutres de couleur |
| DESSIN SCOLAIRE ET PROFESSIONNEL | Materiel de dessin technique et artistique |
| EQUIPEMENT CLASSE ET BUREAU | Mobilier et equipement de salle de classe |
| COURRIER ET EXPEDITION | Enveloppes, colis, materiel d'expedition |
| HYGIENE | Produits d'entretien et hygiene bureau |
| UNIVERS PETITE ENFANCE | Jouets et fournitures pour tout-petits |
| BUREAUTIQUE | Fournitures de bureau generales |
| PAPIERS | Ramettes et papiers divers |
| ETIQUETTES | Etiquettes adhesives et autocollantes |
| COLORIAGE | Crayons de couleur et livres de coloriage |
| CLASSEURS | Classeurs a levier et anneaux |
| PRODUITS POUR DECORER | Materiel de decoration et arts creatifs |
| ROLLERS ET STYLOS | Stylos roller et plume |
| EMBALLAGE | Rouleaux, papier bulle, scotch |
| CAHIERS SCOLAIRES | Cahiers d'ecole grands et petits carreaux |
| INFORMATIQUE | Peripheriques et accessoires informatiques |
| STYLOS-BILLES | Stylos a bille classiques |

L'image "Non classe" ne sera pas creee (categorie residuelle).

#### 2. Etendre le mapping dans CategoriesSection.tsx

Ajouter les 17 nouvelles images au dictionnaire `categoryImages` avec les cles correspondantes en majuscules.

#### 3. Stocker egalement les URLs dans la base de donnees

Apres generation, mettre a jour la table `categories` avec les URLs des images pour que les pages `/shop` et `/catalogue` puissent aussi afficher des images de categories si necessaire a l'avenir.

### Fichiers modifies

| Fichier | Modification |
|---------|-------------|
| `src/assets/categories/marqueurs.jpg` | **Nouveau** |
| `src/assets/categories/dessin.jpg` | **Nouveau** |
| `src/assets/categories/equipement-classe.jpg` | **Nouveau** |
| `src/assets/categories/courrier.jpg` | **Nouveau** |
| `src/assets/categories/hygiene.jpg` | **Nouveau** |
| `src/assets/categories/petite-enfance.jpg` | **Nouveau** |
| `src/assets/categories/bureautique.jpg` | **Nouveau** |
| `src/assets/categories/papiers.jpg` | **Nouveau** |
| `src/assets/categories/etiquettes.jpg` | **Nouveau** |
| `src/assets/categories/coloriage.jpg` | **Nouveau** |
| `src/assets/categories/classeurs.jpg` | **Nouveau** |
| `src/assets/categories/decoration.jpg` | **Nouveau** |
| `src/assets/categories/rollers-stylos.jpg` | **Nouveau** |
| `src/assets/categories/emballage.jpg` | **Nouveau** |
| `src/assets/categories/cahiers-scolaires.jpg` | **Nouveau** |
| `src/assets/categories/informatique.jpg` | **Nouveau** |
| `src/assets/categories/stylos-billes.jpg` | **Nouveau** |
| `src/components/sections/CategoriesSection.tsx` | Ajouter 17 imports et entrees dans le mapping |

Aucune migration SQL requise.

