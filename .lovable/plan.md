

## Transformer le site en e-commerce papeterie/fournitures classique

Objectif : s'inspirer de ma-rentree-scolaire.fr, toutlescolaire.com et bureau-vallee.fr pour obtenir un site e-commerce professionnel et epure, en supprimant toute reference au "vintage", "retro", "80-90".

---

### 1. Nettoyage du vocabulaire "vintage/retro"

Supprimer toutes les references au style vintage dans les composants suivants :

| Fichier | Texte a supprimer/modifier |
|---------|---------------------------|
| `HeroSection.tsx` | "moderne & vintage" -> "en ligne" ; description retirer "charme retro des annees 80-90" -> "aux meilleurs prix" ; badge "Papeterie & Services a Chaumont" reste ; alt image : retirer "vintage" |
| `SeoContent.tsx` | Retirer les paragraphes sur la "collection vintage", "souvenirs des annees 80-90", "articles de papeterie vintage" dans `HomeSeoContent` et `CatalogueSeoContent` |
| `Footer.tsx` | Description : retirer "alliant modernite et nostalgie" -> "avec une selection de qualite" |
| `index.css` | Renommer `shadow-vintage` en `shadow-card-hover` ; supprimer le commentaire "Papeterie moderne avec touche vintage 80-90s" |

### 2. Hero Section -- style e-commerce classique

Refondre le hero pour ressembler aux sites de reference :
- Remplacer le gros gradient sombre par un slider/bandeau promotionnel plus lumineux (fond clair ou image plein-ecran avec overlay leger)
- Titre plus direct : "Fournitures Scolaires et de Bureau" avec sous-titre "Livraison rapide - Plus de 40 000 references"
- Bandeau d'avantages horizontal sous le hero (expedition 24/48h, livraison offerte des 49eur, paiement securise) -- comme sur les 3 sites de reference
- Supprimer les stats "50k+ clients" et le badge "-20% Rentree" flottant
- Supprimer le badge "Ouvert maintenant"

### 3. Header -- navigation par categories

Adapter le header pour un style e-commerce :
- Conserver la top bar (tel, email, livraison gratuite)
- Barre de recherche plus proeminente (comme bureau-vallee : pleine largeur)
- Navigation principale remplacee par les categories produit principales (tirees de la base) au lieu de pages generiques
- Garder les liens Services, Listes Scolaires, Contact dans un menu secondaire ou en fin de nav

### 4. Bandeau avantages (nouveau composant)

Creer un composant `TrustBanner` affiche sous le hero :
- 3 ou 4 pictogrammes horizontaux : Expedition 24/48h, Livraison offerte des 49eur, Paiement securise, Service client
- Style similaire a ma-rentree-scolaire.fr (icones + texte court, fond neutre)

### 5. Page d'accueil restructuree

Reorganiser les sections de la page d'accueil :

```text
Header
Hero (slider/bandeau promo)
TrustBanner (avantages)
CategoriesSection (grille de categories)
FeaturedProducts (produits vedettes)
BestSellers (meilleures ventes)
SeoContent (adapte, sans vintage)
Newsletter (dans le footer)
Footer
```

Supprimer :
- `PromoBanner` (le code promo BIENVENUE10 dans un bandeau jaune) -- integrer la promo dans le hero si necessaire
- `ServicesSection` de la page d'accueil (deplacer vers la page Services uniquement)

### 6. Cartes produit -- style e-commerce standard

Adapter les cartes produit pour ressembler aux sites de reference :
- Image sur fond blanc (pas de gradient)
- Nom du produit en majuscules ou semi-bold
- Prix bien visible avec "eur TTC" ou "eur HT"
- Bouton "AJOUTER AU PANIER" bien visible (pas juste "Ajouter")
- Retirer les boutons flottants coeur/oeil au survol (trop complexe visuellement)

### 7. CSS -- supprimer les references vintage

Dans `index.css` :
- Retirer le commentaire "touche vintage 80-90s"
- Renommer les variables/classes contenant "vintage" (`shadow-vintage` -> `shadow-hover`)
- Les gradients et couleurs actuels (bleu/jaune) sont coherents avec les sites de reference, les conserver

---

### Details techniques

**Fichiers modifies :**

| Fichier | Nature de la modification |
|---------|--------------------------|
| `src/components/sections/HeroSection.tsx` | Refonte complete : fond clair, titre e-commerce, suppression vintage |
| `src/components/layout/Header.tsx` | Navigation par categories produit, recherche plus large |
| `src/pages/Index.tsx` | Retirer PromoBanner et ServicesSection, ajouter TrustBanner |
| `src/components/sections/TrustBanner.tsx` | **Nouveau** : bandeau avantages horizontal |
| `src/components/sections/PromoBanner.tsx` | Supprime de la page d'accueil (peut rester en composant) |
| `src/components/sections/FeaturedProducts.tsx` | Simplifier les cartes, style e-commerce |
| `src/components/sections/BestSellers.tsx` | Memes ajustements cartes |
| `src/components/sections/SeoContent.tsx` | Retirer mentions vintage dans tous les textes |
| `src/components/layout/Footer.tsx` | Retirer "nostalgie", nettoyer la description |
| `src/index.css` | Renommer shadow-vintage, retirer commentaires vintage |

**Aucune migration SQL requise.**

