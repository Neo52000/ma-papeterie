
## Corriger l'affichage des categories et fiches produits en front-office

### Problemes identifies

1. **Categories invisibles sur la page d'accueil** : Le composant `CategoriesSection` compare les noms des categories de la table `categories` avec le champ `category` des produits pour calculer le nombre d'articles. Or ces noms ne correspondent pas toujours (ex: "CAHIERS SCOLAIRES" dans `categories` vs "CAHIERS" dans `products`). Resultat : beaucoup de categories affichent "0 articles" et sont eliminees du tri, la section peut apparaitre vide ou presque.

2. **Fiches produits trop depouillees** : Les cartes produit (Catalogue, FeaturedProducts, BestSellers) n'affichent que la photo et le bouton "Ajouter". Il manque la description, le stock, la sous-categorie. De plus, seuls 6 produits sur 47 000 ont une image -- les cartes affichent un placeholder generique.

3. **Filtre par categorie inefficace** : Sur `/catalogue?category=cahiers`, le filtre fait un `ilike` exact sur le nom de la categorie, ce qui ne capture pas les sous-categories (ex: "CAHIERS SCOLAIRES", "CAHIERS DE BUREAU" ne sont pas inclus).

---

### Corrections prevues

#### 1. CategoriesSection -- compter les produits correctement

Plutot que de matcher `categories.name` avec `products.category` en memoire, on va :
- Regrouper les produits par `category` directement depuis la table `products`
- Afficher les 10 categories les plus populaires (par nombre de produits)
- Associer chaque categorie produit a un slug (depuis la table `categories` si disponible, sinon genere automatiquement)

Cela garantit que les categories affichees sur la page d'accueil correspondent exactement aux donnees reelles.

#### 2. Cartes produit enrichies (Catalogue + FeaturedProducts + BestSellers)

Ajouter sur chaque carte :
- **Description** : premiere ligne de `product.description` (tronquee a 2 lignes via `line-clamp-2`)
- **Stock** : indicateur visuel (pastille verte/rouge + texte "En stock" / "Rupture")
- **Sous-categorie** : afficher `subcategory` si presente
- **Fallback image ameliore** : au lieu d'un simple placeholder, afficher une icone representant la categorie avec un fond de couleur

#### 3. Filtre par categorie avec correspondance elargie

Sur la page Catalogue, quand un slug de categorie est selectionne :
- Rechercher avec `ilike('%nom_categorie%')` au lieu d'un match exact, pour capturer les sous-categories (ex: "CAHIERS" matchera "CAHIERS SCOLAIRES", "CAHIERS DE BUREAU", etc.)

#### 4. Modal ProductDetailModal -- utiliser la vraie description

Remplacer la description statique codee en dur ("Produit de qualite superieure...") par la vraie description du produit depuis la base de donnees. Passer `description` dans les props.

---

### Details techniques

**Fichiers modifies :**

| Fichier | Modification |
|---------|-------------|
| `src/components/sections/CategoriesSection.tsx` | Compter les produits par `category` depuis `products`, generer les top 10 categories dynamiquement |
| `src/pages/Catalogue.tsx` | Enrichir les cartes (description, stock, sous-categorie), ameliorer le filtre categorie avec `ilike` elargi |
| `src/components/sections/FeaturedProducts.tsx` | Ajouter description, stock, sous-categorie sur les cartes, fetch `description` dans le hook |
| `src/components/sections/BestSellers.tsx` | Memes enrichissements que FeaturedProducts |
| `src/hooks/useProducts.ts` | Ajouter `description`, `subcategory`, `price_ttc` au type `Product` et au select |
| `src/components/product/ProductDetailModal.tsx` | Utiliser la description reelle du produit au lieu du texte statique |

**Aucune migration SQL requise** -- toutes les donnees necessaires existent deja dans les tables `products` et `categories`.
