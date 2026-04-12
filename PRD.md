# PRD — Ma Papeterie

> **Product Requirements Document**
> Version 1.0 — 11 avril 2026
> Propriétaire : Papeterie Reine & Fils
> Site : ma-papeterie.fr

---

## Table des matières

1. [Vision & Objectifs](#1-vision--objectifs)
2. [Utilisateurs cibles](#2-utilisateurs-cibles)
3. [Modèle économique](#3-modèle-économique)
4. [Exigences fonctionnelles](#4-exigences-fonctionnelles)
5. [Architecture technique](#5-architecture-technique)
6. [Modèle de données](#6-modèle-de-données)
7. [Intégrations](#7-intégrations)
8. [Exigences non-fonctionnelles](#8-exigences-non-fonctionnelles)
9. [Métriques de succès](#9-métriques-de-succès)

---

## 1. Vision & Objectifs

### 1.1 Mission

Ma Papeterie est la vitrine digitale de **Papeterie Reine & Fils**, papeterie historique de Chaumont (Haute-Marne, 52) fondée en 1970. Le site offre une expérience e-commerce complète B2B/B2C couvrant :

- **Fournitures scolaires et de bureau** — stylos, cahiers, classement, petit matériel
- **Bureautique & informatique** — consommables imprimantes, cartouches, toners
- **Mobilier de bureau** — chaises, bureaux, rangements (avec option leasing)
- **Loisirs créatifs** — dessin, travaux manuels, jeux
- **Services d'impression** — reprographie, développement photo, impression fine art, plans techniques, patrons couture, papier peint personnalisé
- **Tampons professionnels** — conception en ligne avec designer interactif
- **Maroquinerie & bagagerie** — sacs, accessoires
- **Solutions d'emballage** — packaging professionnel

### 1.2 Positionnement

| Axe | Proposition de valeur |
|-----|----------------------|
| Proximité | Boutique physique + retrait gratuit en magasin à Chaumont |
| Expertise | 55+ ans d'expertise papeterie, conseil personnalisé |
| Prix | Transparence tarifaire HT/TTC, grilles B2B sur mesure |
| Catalogue | 14+ catégories, milliers de références multi-fournisseurs |
| Services | Impression express, photo, tampons, plaques, leasing mobilier |
| Digital | Listes scolaires OCR/IA, designer tampon canvas, recherche consommables par imprimante |

### 1.3 Objectifs business

- Développer le canal e-commerce comme complément de la boutique physique
- Acquérir et fidéliser une clientèle B2B (entreprises, institutions, écoles)
- Automatiser la gestion multi-fournisseurs et l'optimisation des marges
- Proposer des services différenciants (impression, tampons, listes scolaires)
- Étendre la distribution via les marketplaces (Shopify, Amazon, eBay, Cdiscount)

---

## 2. Utilisateurs cibles

### 2.1 Persona B2C — Le Particulier

| Attribut | Description |
|----------|-------------|
| Profil | Parent, étudiant, créatif, travailleur à domicile |
| Besoin | Fournitures scolaires, bureau à domicile, loisirs créatifs |
| Comportement | Achat ponctuel, sensible au prix, compare en ligne |
| Features clés | Recherche produits, favoris, avis clients, listes scolaires, click & collect |

### 2.2 Persona B2B — Le Professionnel

| Attribut | Description |
|----------|-------------|
| Profil | TPE/PME, profession libérale, coworking |
| Besoin | Réassort régulier, facturation, gestion budgétaire |
| Comportement | Commandes récurrentes, sensible aux conditions de paiement |
| Features clés | Portail pro, grilles tarifaires, factures PDF, équipes multi-utilisateurs, budgets annuels, templates de réassort |

### 2.3 Persona B2B — L'Institution

| Attribut | Description |
|----------|-------------|
| Profil | École, mairie, administration, association |
| Besoin | Listes scolaires, commandes groupées, bons de commande |
| Comportement | Cycles d'achat saisonniers, validation hiérarchique |
| Features clés | Listes scolaires IA, devis, conditions de paiement 30/60/90j |

### 2.4 Persona Admin — Le Gérant

| Attribut | Description |
|----------|-------------|
| Profil | Propriétaire / gestionnaire de la papeterie |
| Besoin | Piloter le catalogue, les prix, les stocks, les commandes, le CRM |
| Features clés | Dashboard KPI, gestion produits/stocks/prix, CRM pipeline, import fournisseurs, analytics, prédictions de ventes |

---

## 3. Modèle économique

### 3.1 Sources de revenus

| Source | Description |
|--------|-------------|
| Vente de produits B2C | Marge sur fournitures, consommables, mobilier |
| Vente de produits B2B | Grilles tarifaires négociées, volumes |
| Services d'impression | Reprographie, photo, fine art, plans techniques |
| Tampons personnalisés | Conception en ligne + fabrication |
| Plaques d'immatriculation | Service local |
| Leasing mobilier | Financement de mobilier de bureau (>800€ HT) |
| Marketplaces | Ventes Shopify, Amazon, eBay, Cdiscount |

### 3.2 Politique de marge (OBLIGATOIRE)

```
Marge minimum : 10% sur le prix de vente HT
Formule : marge (%) = (Prix HT - Prix d'achat HT) / Prix HT × 100
Constante : MINIMUM_MARGIN_PERCENT = 10
```

- Appliquée sur tout le catalogue (formulaire produit, paliers volume, pricing dynamique)
- Si pas de prix d'achat connu : avertissement sans blocage
- **Ne jamais modifier cette règle sans validation explicite de la direction**

### 3.3 Grille tarifaire services

#### Reprographie

| Format | Noir & Blanc | Couleur |
|--------|-------------|---------|
| A4 | 0.10€ HT/page | 0.50€ HT/page |
| A3 | 0.20€ HT/page | 1.00€ HT/page |
| Recto-verso | +50% du prix unitaire | |

#### Finitions

| Service | Prix HT |
|---------|---------|
| Reliure spirale | 2.50€ |
| Reliure thermocollée | 4.00€ |
| Agrafage | 0.50€ |
| Plastification A4 | 1.50€ |
| Plastification A3 | 2.50€ |

#### Tirages photo

| Format | Prix HT |
|--------|---------|
| 10×15 cm | 0.15€ |
| 13×18 cm | 0.35€ |
| 15×20 cm | 0.50€ |
| 20×30 cm | 2.00€ |
| 30×45 cm | 5.00€ |
| 40×60 cm | 12.00€ |
| 50×75 cm | 20.00€ |
| 60×90 cm | 30.00€ |

### 3.4 Livraison

| Poids | Tarif HT |
|-------|---------|
| < 250g (Lettre suivie) | 3.50€ |
| 250g – 1kg (Colissimo) | 5.50€ |
| 1kg – 3kg | 7.50€ |
| > 3kg | 9.50€ |
| **Retrait en boutique** | **Gratuit** |


---

## 4. Exigences fonctionnelles

### 4.1 Vitrine & Catalogue

#### 4.1.1 Page d'accueil
- Hero banner avec recherche rapide
- Grille de catégories (14+ catégories principales)
- Carrousel meilleures ventes
- Bannières promotionnelles (simple et double)
- Section B2B (proposition de valeur professionnelle)
- Bandeau de confiance (paiement sécurisé, livraison rapide, éco-responsable)
- Témoignages clients
- Guides et contenus éditoriaux
- Ticker promotionnel défilant
- Blocs CMS dynamiques configurables depuis l'admin

#### 4.1.2 Catalogue produits
- Navigation par catégories hiérarchiques (arborescence parent-enfant)
- Filtrage multi-critères (catégorie, marque, prix, disponibilité, attributs)
- Tri (prix, pertinence, nouveauté, popularité)
- Recherche full-text avec autocomplétion (8 résultats, debounce 300ms)
- Affichage grille/liste
- Pagination
- Compteurs de produits par catégorie
- Basculement prix HT / TTC

#### 4.1.3 Fiche produit
- Galerie d'images avec lightbox et zoom
- Informations produit (nom, EAN, réf fabricant, description, spécifications)
- Prix avec affichage HT/TTC, paliers de volume, promotion éventuelle
- Sélecteur de conditionnement (packaging)
- Stock en temps réel (quantité, statut, alertes)
- Avis clients avec notation 1-5 étoiles, vote utile/inutile, modération
- Produits associés (cross-sell, alternatives, bundles)
- Bloc transparence prix (évolution, comparaison)
- Bloc fournisseurs (multi-sourcing)
- Bloc prix concurrents
- Tag B2B (prix professionnel)
- Ajout au panier / favoris
- Comparaison produits (jusqu'à 4 simultanés, barre sticky en bas)

#### 4.1.4 Recherche de consommables
- Sélection par marque d'imprimante (HP, Epson, Canon, Brother, etc.)
- Sélection par modèle (flux multi-étapes)
- Résultats avec compatibilité confirmée
- Cross-selling de consommables liés
- Widget imprimantes populaires
- Recherche par numéro de modèle
- Versions compact et pleine page

#### 4.1.5 Pages spécialisées
- **Chaises & Home Office** — mobilier de bureau avec filtrage dédié
- **Maroquinerie & Bagagerie** — sacs et accessoires
- **Solutions d'emballage** — packaging professionnel
- **Consommables informatiques** — recherche par imprimante
- **Promotions** — produits en promotion

### 4.2 Panier & Checkout

#### 4.2.1 Panier
- Drawer latéral (Sheet) avec liste des produits
- Gestion des quantités (+/-)
- Suppression d'articles
- Vider le panier
- Badge compteur d'articles dans le header
- Widget de recommandations contextuelles
- CTA leasing automatique si mobilier > 800€ HT
- Total panier avec récapitulatif
- Tracking panier abandonné (CRM)

#### 4.2.2 Panier services
- Panier séparé pour les services (reprographie, photo, expédition)
- Tunnel de commande service multi-étapes :
  1. Upload de fichiers (avec validation format/taille)
  2. Configuration des options (format, couleur, finitions)
  3. Récapitulatif panier
  4. Sélection livraison
  5. Paiement

#### 4.2.3 Checkout
- Processus multi-étapes
- Saisie/sélection d'adresse (facturation et livraison séparées)
- Choix du mode de livraison (Colissimo, retrait boutique)
- Paiement Stripe (CB, etc.)
- Page de confirmation de commande
- Email de confirmation

#### 4.2.4 Favoris / Wishlist
- Drawer latéral avec grille de produits
- Ajout/suppression de favoris
- Ajout au panier depuis les favoris
- Compteur dans le header
- Persistance (localStorage + sync auth)
- Notifications wishlist

### 4.3 Compte utilisateur

#### 4.3.1 Authentification
- Inscription (email/mot de passe)
- Connexion
- Mot de passe oublié / réinitialisation
- Vérification email
- 2FA (authentification à deux facteurs)
- Guards d'accès (AuthGuard, AdminGuard, ProGuard)

#### 4.3.2 Espace Mon Compte
- Historique et détail des commandes
- Carnet d'adresses (ajout/modification/suppression)
- Paramètres profil
- Préférences SMS
- Gestion des favoris
- Historique des avis déposés
- Export données RGPD
- Demande de suppression de compte

### 4.4 Portail Professionnel (B2B)

#### 4.4.1 Dashboard Pro
- Vue d'ensemble activité (commandes, budget, alertes)
- Widget budget annuel (montant alloué, dépensé, % alerte)
- Top produits commandés
- Graphique statut commandes
- Graphique tendance dépenses

#### 4.4.2 Gestion commandes Pro
- Historique des commandes avec filtrage et pagination
- Détail commande complet

#### 4.4.3 Réassort
- Templates de commande réutilisables
- Suggestions de réassort intelligentes
- Commande rapide depuis template

#### 4.4.4 Facturation
- Liste des factures avec filtrage
- Export PDF des factures
- Agrégation mensuelle

#### 4.4.5 Gestion d'équipe
- Ajout/suppression de membres
- Rôles au sein du compte B2B
- Association compte B2B ↔ utilisateurs

#### 4.4.6 Inscription Pro
- Formulaire d'inscription professionnel
- SIRET, TVA intra-communautaire
- Conditions de paiement (30/60/90 jours)
- Validation par l'admin

### 4.5 Services d'impression & Photo

#### 4.5.1 Reprographie
- Upload de documents (PDF, images)
- Configuration : format (A4/A3), couleur (N&B/couleur), recto-verso, grammage papier
- Finitions : reliure spirale/thermocollée, agrafage, plastification
- Calcul automatique du prix
- Commande et paiement en ligne

#### 4.5.2 Développement photo
- Upload de photos
- Sélection du format (10×15 à 60×90 cm)
- Choix du papier (brillant, mat, satin, fine art)
- Options (marge blanche)
- Calcul automatique du prix

#### 4.5.3 Impression urgente / Express
- Page dédiée Chaumont
- Délais express
- Tarification majorée

#### 4.5.4 Impression spécialisée
- **Fine Art** — papier d'art, grands formats, profils ICC
- **Plans techniques** — A1/A0, pliage normalisé
- **Patrons couture** — impression à l'échelle 1:1
- **Papier peint personnalisé** — designer en ligne, calcul métrage

#### 4.5.5 Photocopie express
- Service rapide en boutique
- Commande en ligne pour retrait

#### 4.5.6 Photos express
- Tirage rapide de photos
- Retrait en boutique

### 4.6 Designer de tampons

#### 4.6.1 Workspace de conception
- Canvas interactif (moteur Konva)
- Grille de modèles de tampons avec tarifs
- Édition de texte multi-lignes
- Upload de logo/image
- Bibliothèque de formes
- Bibliothèque de cliparts
- Sélecteur de couleurs (multi-couleurs)
- Contrôles de zoom (50% – 200%)
- Sélection et suppression d'éléments
- Prévisualisation en temps réel
- Validation du design (avertissements)
- Ajout au panier avec design sauvegardé
- CTA sticky pour achat

#### 4.6.2 Modèles pré-configurés
- Grille de modèles avec photos et prix
- Sélection par slug/URL directe
- Dimensions et caractéristiques par modèle

### 4.7 Listes scolaires

#### 4.7.1 Interface listes
- Sélection d'école (annuaire)
- Affichage des listes par école/classe/niveau
- Quantités requises par article
- Estimation du coût total
- Ajout au panier (liste complète ou partielle)

#### 4.7.2 Upload & IA
- Upload de liste (CSV, fichier scanné)
- OCR sur documents scannés
- Matching IA produits ↔ articles de la liste
- Copilot IA d'aide aux listes scolaires
- Validation manuelle des correspondances

#### 4.7.3 Gestion admin
- Import d'écoles (CSV)
- Templates de listes réutilisables
- Modération des correspondances produits

### 4.8 Autres services

- **Plaques d'immatriculation** — service local Chaumont
- **Leasing mobilier** — simulateur (profil entreprise, budget, durée, mensualité estimée), badge éligibilité, formulaire de devis
- **Pack Pro Local** — offres packagées pour entreprises locales
- **Solutions institutions** — offres pour écoles et administrations

### 4.9 Contenu & Marketing

#### 4.9.1 Blog
- Liste d'articles avec recherche et filtres
- Article complet avec contenu riche
- Compteur de vues et temps de lecture
- Commentaires modérés
- Métadonnées SEO par article
- Génération IA d'articles

#### 4.9.2 Pages CMS dynamiques
- Page builder par blocs (admin)
- Templates de pages pré-construits
- Pages dynamiques par slug (`/p/[slug]`)
- Pages services dynamiques

#### 4.9.3 Newsletter
- Formulaire d'inscription (footer)
- Protection honeypot anti-spam
- Sync Brevo (ex-Sendinblue)

#### 4.9.4 Réseaux sociaux
- Création de posts (sélection produit, ton, occasion)
- Calendrier éditorial
- Planification et publication automatique
- Historique des publications
- Génération IA de captions

#### 4.9.5 SMS Marketing
- Envoi de campagnes SMS
- Gestion des préférences utilisateur
- Webhook de réception
- Health check du gateway

### 4.10 Pages informatives

- **À propos** — histoire, équipe, valeurs
- **Contact** — formulaire avec validation Zod
- **FAQ** — accordéons questions/réponses
- **Livraison** — conditions et tarifs
- **CGV** — conditions générales de vente
- **Mentions légales** — informations légales obligatoires
- **Politique de confidentialité** — RGPD
- **Cookies** — politique cookies
- **Réponse officielle IA** — page compliance IA


### 4.11 Administration (Back-office)

#### 4.11.1 Dashboard principal
- KPIs temps réel : CA, commandes, nouveaux utilisateurs, taux de conversion
- Analyse de marge globale
- Graphiques de tendance
- Statut système
- Activité récente
- Stats listes scolaires
- KPI enrichissement Icecat

#### 4.11.2 Gestion du catalogue
- **Produits** : CRUD complet avec formulaire riche (infos de base, EAN, prix, marges, stock, catégories, images, spécifications, paliers de volume, promotions)
- **Catégories** : arborescence hiérarchique parent-enfant
- **Images produits** : galerie, upload, tri, image principale
- **Import CSV** : import produits en masse
- **Collecteur d'images** : import batch, crawl web, intégration Icecat
- **Qualité données** : dashboard de complétude produits
- **Historique produit** : audit trail de toutes les modifications
- **Lookup EAN** : recherche automatique par code-barres

#### 4.11.3 Gestion des prix
- **Règles de pricing** : dynamiques avec min/max marges, offset concurrents, stratégies
- **Ajustements manuels** : avec workflow d'approbation
- **Exceptions** : overrides de prix par produit
- **Simulation** : prévisualisation de l'impact des règles avant application
- **Application/Rollback** : application et annulation des règles en batch
- **Historique prix** : snapshots et évolution temporelle
- **Alertes pricing** : détection d'anomalies
- **Insights** : recommandations de pricing générées
- **Coefficients fournisseurs** : coefficients spécifiques (ex: Liderpapel)

#### 4.11.4 Gestion des stocks
- **Tableau de bord stock** : niveaux, alertes, statuts
- **Seuils d'alerte** : configuration des points de réapprovisionnement
- **Mouvements de stock** : historique et graphiques
- **Emplacements** : gestion multi-entrepôts
- **Réceptions** : réception et validation de marchandise
- **Stock virtuel** : agrégation stocks propres + fournisseurs
- **Bons de commande** : création PO, suivi cycle de vie, réception
- **Auto-PO** : génération automatique quand stock < seuil
- **Optimisation réassort** : suggestions intelligentes

#### 4.11.5 Gestion des commandes
- Liste des commandes avec filtrage et pagination
- Détail commande complet
- Workflow de statut : En attente → Confirmée → En préparation → Expédiée → Livrée
- Commandes tampons, impressions, photos, photocopies (vues dédiées)

#### 4.11.6 Gestion fournisseurs
- **Fournisseurs** : CRUD, contacts, conditions de paiement, catégories
- **Produits fournisseurs** : catalogue par fournisseur avec SKU, références
- **Offres fournisseurs** : prix d'achat, stock, délai livraison, TVA
- **Paliers fournisseurs** : pricing par volume d'achat
- **Comparaison fournisseurs** : tableau comparatif multi-fournisseurs
- **Import générique** : auto-détection colonnes, staging, upsert
- **Complétude données** : dashboard de qualité par fournisseur
- **Snapshots stock** : historique niveaux de stock fournisseur

#### 4.11.7 Intégrations fournisseurs dédiées
- **Comlandi** : import CSV/Excel, mapping 40+ colonnes, backfill cross-EAN
- **Alkor** : scraping Playwright B2B, 3 jeux de mappings (catalogue, prix, commandes), images Supabase Storage
- **Liderpapel** : SFTP, extraction tarifs XLS, enrichissement Icecat par EAN
- **ALSO** : import catalogue cloud commerce, backfill
- **SoftCarrier** : prévisualisation, mapping catégories, prix en temps réel

#### 4.11.8 Concurrence & Veille tarifaire
- **Concurrents** : configuration et suivi
- **Prix concurrents** : scraping et tracking automatique
- **Mapping produits** : correspondance catalogue ↔ URLs concurrents
- **Crawl jobs** : gestion des tâches de scraping web
- **Comparaison prix** : tableau de bord comparatif
- **Évolution prix** : graphiques historiques

#### 4.11.9 Marketplaces
- **Shopify** : sync bidirectionnelle (produits, stock, commandes), webhooks
- **Amazon** : export catalogue, sync stock
- **eBay** : sync stock
- **Cdiscount** : sync stock
- **Connexions** : gestion des API keys et statuts

#### 4.11.10 CRM
- **Pipeline** : tableau Kanban drag-and-drop (deals, étapes, KPIs)
- **Devis** : builder de devis (lignes, TVA, conditions de paiement, notes)
- **Fiche client** : profil, historique commandes, devis, tâches, timeline
- **Interactions** : log de toutes les interactions client
- **Segmentation RFM** : Récence, Fréquence, Montant (donut chart)
- **Panier abandonné** : récupération CRM automatique
- **Tâches** : création, suivi, alertes retard
- **KPIs CRM** : métriques pipeline et conversion

#### 4.11.11 Gestion B2B
- Comptes professionnels
- Grilles tarifaires par catégorie
- Budgets annuels
- Association utilisateurs ↔ comptes

#### 4.11.12 Analytics & Prédictions
- **Dashboard analytics** : métriques catalogue et performance
- **Prédictions de ventes** : forecasting IA
- **Recommandations** : règles de recommandation produits
- **Analytics Shopify** : métriques marketplace

#### 4.11.13 Contenu & CMS
- **Pages** : page builder par blocs avec templates
- **Header builder** : personnalisation de l'en-tête
- **Footer builder** : personnalisation du pied de page
- **Theme builder** : personnalisation du thème visuel
- **Menus** : gestion navigation dynamique
- **Blog** : éditeur WYSIWYG, gestion articles, SEO

#### 4.11.14 Communication
- **SMS** : campagnes, gateway health, webhooks
- **Réseaux sociaux** : posts, calendrier éditorial, planification, publication
- **Profils sociaux** : gestion des comptes connectés
- **Brevo** : sync contacts, emails transactionnels, automations

#### 4.11.15 Enrichissement données
- **Icecat** : enrichissement produits par EAN (specs, images, descriptions)
- **IA descriptions** : génération automatique de descriptions produits
- **IA SEO** : optimisation automatique des métadonnées
- **IA images** : génération d'images produits

#### 4.11.16 Sécurité & Conformité
- **RGPD** : registre des traitements, demandes d'export/suppression, consentements
- **2FA** : authentification à deux facteurs
- **Sécurité/SEO/Geo** : configuration sécurité, SEO technique, ciblage géographique
- **Modération avis** : validation des avis clients
- **Alertes** : configuration des alertes système
- **Automations** : règles d'automatisation de workflows
- **Monitoring erreurs** : configuration Sentry
- **Exceptions produits** : détection et gestion des anomalies


---

## 5. Architecture technique

### 5.1 Stack

| Couche | Technologie |
|--------|-------------|
| **Framework** | Astro 6 (hybrid SSG/SSR) + React 18 Islands |
| **Langage** | TypeScript 5.8 |
| **Styling** | Tailwind CSS 3.4 + shadcn/ui (50+ composants Radix UI) |
| **State** | Zustand 5 (stores cross-islands) + TanStack Query 5 (data fetching) |
| **Formulaires** | React Hook Form + Zod (validation) |
| **Backend** | Supabase (PostgreSQL 16 + Edge Functions Deno + Auth + Realtime + Storage) |
| **Paiement** | Stripe (checkout sessions, webhooks) |
| **CRM Email** | Brevo (ex-Sendinblue) — emails transactionnels, sync contacts |
| **SMS** | Gateway SMS dédié |
| **Déploiement** | Netlify (CDN + SSR via @astrojs/netlify adapter) |
| **Monitoring** | Error tracker maison (Supabase error_logs) + web-vitals + Sentry |

### 5.2 Architecture applicative

```
┌─────────────────────────────────────────────────┐
│                   Netlify CDN                    │
│        (SSG pages + SSR via Astro adapter)       │
├─────────────────────────────────────────────────┤
│              Astro Pages (.astro)                 │
│         ┌─────────────────────────┐              │
│         │   React Islands (TSX)   │              │
│         │  ┌──────┐ ┌──────────┐  │              │
│         │  │Zustand│ │TanStack  │  │              │
│         │  │Stores │ │Query     │  │              │
│         │  └──────┘ └──────────┘  │              │
│         └─────────────────────────┘              │
├─────────────────────────────────────────────────┤
│                Supabase Platform                  │
│  ┌──────────┐ ┌───────────┐ ┌────────────────┐  │
│  │PostgreSQL│ │Edge Fns   │ │Auth + Storage  │  │
│  │  16 (DB) │ │(95 Deno)  │ │(JWT + Buckets) │  │
│  └──────────┘ └───────────┘ └────────────────┘  │
├─────────────────────────────────────────────────┤
│              Intégrations externes                │
│  Stripe │ Brevo │ Shopify │ Amazon │ Icecat      │
│  SFTP   │ Playwright │ SMS Gateway │ OpenAI      │
└─────────────────────────────────────────────────┘
```

### 5.3 Structure du projet

```
src/
├── pages/             # 55 pages Astro — routing fichier natif
├── views/             # 120+ composants React des pages
├── layouts/           # MainLayout.astro + BaseHead.astro
├── components/        # Composants React organisés par domaine
│   ├── admin/         # 60+ composants back-office
│   ├── cart/          # Panier (CartSheet, CartRecoWidget)
│   ├── consumables/   # Recherche consommables imprimantes
│   ├── gdpr/          # Cookie banner, RGPD
│   ├── image-collector/# Import batch images
│   ├── islands/       # 30+ islands React interactifs
│   ├── layout/        # Header, Footer, MegaMenu, MobileNav
│   ├── leasing/       # Simulateur leasing mobilier
│   ├── pro/           # Portail professionnel B2B
│   ├── school-lists/  # Listes scolaires
│   ├── sections/      # 10+ sections page d'accueil
│   ├── service-tunnel/# Tunnel commande services
│   ├── stamp-designer/# Designer de tampons (Konva)
│   ├── ui/            # 50+ composants shadcn/ui
│   └── ...
├── config/            # env.ts (validation Zod variables d'environnement)
├── data/              # Données statiques, constantes, mappings fournisseurs
├── hooks/             # 99+ hooks custom (products, orders, pricing, CRM, ...)
├── integrations/      # Supabase client + types auto-générés
├── lib/               # Utilitaires (margin, formatPrice, sanitize, seo, ...)
├── stores/            # 11 Zustand stores (auth, cart, wishlist, compare, ...)
├── middleware.ts      # Auth server-side Supabase
└── test/              # Setup Vitest + Testing Library
supabase/
├── functions/         # 95+ Edge Functions Deno
└── migrations/        # 151+ migrations SQL versionnées
netlify/
└── functions/         # Serverless Functions Node.js
```

### 5.4 Stores Zustand

| Store | Rôle |
|-------|------|
| `authStore` | État d'authentification utilisateur |
| `mainCartStore` | Panier principal (produits) |
| `serviceCartStore` | Panier services (impression, photo) |
| `shopifyCartStore` | Sync panier Shopify |
| `wishlistStore` | Favoris avec persistance localStorage |
| `compareStore` | Comparaison produits (max 4) |
| `stampDesignerStore` | État du designer de tampons |
| `productFormStore` | Formulaire produit admin |
| `stockStore` | Niveaux de stock temps réel |
| `priceModeStore` | Basculement affichage HT/TTC |
| `pageBuilderStore` | État du page builder CMS |

### 5.5 Design system

| Élément | Valeur |
|---------|--------|
| Police | Poppins (Google Fonts) |
| Couleur primaire | Bleu profond HSL(215, 85%, 35%) |
| Couleur accent | Jaune doux HSL(45, 95%, 65%) |
| Thème | Vintage (cream, yellow, brown) + dark mode |
| Composants UI | 50+ composants shadcn/ui (Radix) |
| Animations | fade-in-up, scale-in, cart-bounce, slide-up, marquee |
| Variantes boutons | default, destructive, outline, secondary, accent, ghost, link, vintage, hero, cta |

---

## 6. Modèle de données

### 6.1 Entités principales (85+ tables PostgreSQL)

#### Produits & Catalogue

| Table | Description |
|-------|-------------|
| `products` | Catalogue produits (50+ attributs : prix, stock, descriptions, SEO, marges, éco-taxe, dimensions, garantie) |
| `categories` | Taxonomie hiérarchique (parent-enfant) |
| `brands` | Marques |
| `product_images` | Galerie photos produits |
| `product_seo` | Métadonnées SEO par produit |
| `product_attributes` | Attributs dynamiques clé-valeur |
| `product_packagings` | Options de conditionnement |
| `product_relations` | Cross-sell, bundles, alternatives |
| `product_volume_pricing` | Paliers de prix par quantité |
| `product_exceptions` | Exceptions et anomalies produit |
| `product_lifecycle_logs` | Audit trail modifications |
| `product_price_history` | Historique des prix |
| `product_stock_locations` | Stock par emplacement |

#### Fournisseurs & Approvisionnement

| Table | Description |
|-------|-------------|
| `suppliers` | Fournisseurs (contact, conditions, catégories) |
| `supplier_products` | Catalogue fournisseur (SKU, références, prix, stock, délai) |
| `supplier_offers` | Offres en cours (prix achat, stock, délai, TVA) |
| `supplier_price_tiers` | Paliers volume achat |
| `supplier_stock_snapshots` | Historique stock fournisseur |
| `supplier_category_mappings` | Mapping taxonomie fournisseur |
| `supplier_import_logs` | Logs d'import |
| `purchase_orders` | Bons de commande fournisseur |
| `purchase_order_items` | Lignes de bons de commande |
| `stock_receptions` | Documents de réception |
| `stock_reception_items` | Lignes de réception |
| `reorder_suggestions` | Suggestions de réapprovisionnement |

#### Commandes & Transactions

| Table | Description |
|-------|-------------|
| `orders` | Commandes clients (statut, paiement, adresses, totaux) |
| `order_items` | Lignes de commande |
| `marketplace_sales` | Ventes multi-canal (Amazon, eBay, Cdiscount, Shopify) |
| `marketplace_connections` | Connexions API marketplaces |
| `marketplace_product_mappings` | Sync produits marketplaces |
| `marketplace_sync_logs` | Logs de synchronisation |

#### Pricing & Concurrence

| Table | Description |
|-------|-------------|
| `pricing_rules` | Règles de pricing dynamique |
| `price_adjustments` | Ajustements manuels |
| `price_exceptions` | Overrides de prix |
| `price_current` | Prix calculés courants (vue dénormalisée) |
| `price_snapshots` | Snapshots historiques |
| `pricing_alerts` | Alertes anomalies de prix |
| `pricing_insights` | Recommandations pricing |
| `competitor_prices` | Prix concurrents scrapés |
| `competitor_product_map` | Mapping produits ↔ concurrents |
| `competitors` | Configuration concurrents |
| `liderpapel_pricing_coefficients` | Coefficients spécifiques Liderpapel |

#### B2B

| Table | Description |
|-------|-------------|
| `b2b_accounts` | Comptes professionnels (SIRET, TVA, conditions) |
| `b2b_company_users` | Utilisateurs par compte B2B |
| `b2b_price_grids` | Grilles de remise |
| `b2b_grid_categories` | Remises par catégorie |
| `b2b_customer_grids` | Attribution grilles ↔ clients |
| `b2b_budgets` | Budgets annuels avec alertes |
| `b2b_invoices` | Factures |
| `b2b_invoice_orders` | Lien factures ↔ commandes |
| `b2b_reorder_templates` | Templates de réassort |
| `b2b_reorder_template_items` | Articles des templates |

#### CRM & Clients

| Table | Description |
|-------|-------------|
| `profiles` | Profils utilisateurs étendus |
| `user_roles` | RBAC (admin, pro, user) |
| `customer_interactions` | Historique interactions |
| `customer_rfm_scores` | Segmentation RFM |
| `customer_recommendations` | Recommandations IA |

#### Contenu

| Table | Description |
|-------|-------------|
| `blog_articles` | Articles de blog |
| `blog_article_views` | Compteur vues / temps lecture |
| `blog_comments` | Commentaires modérés |
| `blog_seo_metadata` | SEO articles (mots-clés, liens, word count) |

#### Services & Outils

| Table | Description |
|-------|-------------|
| `stamp_designs` | Designs de tampons sauvegardés |
| `stamp_models` | Modèles de tampons pré-configurés |
| `school_lists` | Listes scolaires |
| `school_list_items` | Articles des listes |
| `school_list_matches` | Correspondances produits IA |
| `school_list_uploads` | Uploads bulk |
| `school_list_templates` | Templates réutilisables |
| `school_list_carts` | Paniers listes scolaires |
| `schools` | Annuaire des écoles |

#### Conformité & Système

| Table | Description |
|-------|-------------|
| `user_consents` | Consentements RGPD |
| `gdpr_requests` | Demandes export/suppression |
| `data_processing_register` | Registre des traitements |
| `data_retention_logs` | Logs de rétention données |
| `app_settings` | Paramètres applicatifs dynamiques |
| `admin_secrets` | Secrets de configuration |
| `agent_logs` | Logs agents IA |
| `cron_job_logs` | Logs tâches planifiées |
| `crawl_jobs` / `crawl_pages` / `crawl_images` | Scraping web |
| `scrape_runs` | Exécutions de scraping |
| `enrich_import_jobs` | Jobs d'enrichissement |
| `shopify_sync_log` | Logs sync Shopify |

### 6.2 Vues matérialisées

| Vue | Description |
|-----|-------------|
| `v_products_vendable` | Produits vendables (actifs, en stock, avec prix) |
| `v_stock_virtuel` | Stock virtuel agrégé (propre + fournisseurs) |
| `v_supplier_offer_priority` | Offre fournisseur prioritaire par produit |

### 6.3 Fonctions SQL

| Fonction | Description |
|----------|-------------|
| `admin_recompute_all_rollups` | Recalcul global des agrégats |
| `recompute_product_rollups` | Recalcul par produit |
| `compute_coef_public_price_ttc` | Calcul coefficient prix public TTC |
| `decrement_stock` | Décrémentation atomique de stock |
| `detect_product_exceptions` | Détection anomalies produit |
| `find_products_by_refs` | Recherche par références croisées |
| `get_b2b_price` | Calcul prix B2B avec grille |
| `get_pricing_coefficient` | Coefficient pricing par catégorie |
| `has_role` / `get_current_user_role` | Contrôle d'accès RBAC |
| `select_reference_offer_for_pricing` | Sélection offre de référence |
| `next_invoice_number` | Séquence numéros factures |
| `normalize_product_names` | Normalisation noms produits |


---

## 7. Intégrations

### 7.1 Fournisseurs — Pipeline commun

Tous les fournisseurs suivent le même pattern triangulaire :

```
Données brutes (CSV/SFTP/scraping)
  → Parse & mapping colonnes
    → Upsert supplier_products
      → Rollup supplier_offers
```

| Fournisseur | Source | Spécificité |
|-------------|--------|-------------|
| **Comlandi** | CSV/Excel import manuel | 40+ colonnes mappées, backfill cross-EAN |
| **Alkor** | Scraping Playwright portail B2B | 3 jeux mappings (catalogue, prix, commandes), images Storage |
| **Liderpapel** | SFTP (fichiers XLS tarifs) | Enrichissement Icecat par EAN, auto-création supplier_products |
| **ALSO** | Import catalogue cloud | Backfill section |
| **SoftCarrier** | FTP + API prix temps réel | Mapping catégories, preview produits |

### 7.2 Marketplaces

| Marketplace | Fonctionnalités |
|-------------|----------------|
| **Shopify** | Sync bidirectionnelle complète (produits, stock, commandes, webhooks) |
| **Amazon** | Export catalogue, sync stock |
| **eBay** | Sync stock |
| **Cdiscount** | Sync stock |

### 7.3 Services tiers

| Service | Usage |
|---------|-------|
| **Stripe** | Paiement en ligne (checkout sessions, webhooks) |
| **Brevo** | CRM email (transactionnels, sync contacts, automations, webhooks) |
| **SMS Gateway** | Notifications SMS, campagnes, health checks |
| **Icecat** | Enrichissement produits (specs, images, descriptions) par EAN |
| **OpenAI / IA** | Descriptions produits, SEO, articles blog, captions réseaux sociaux, recommandations, prédictions ventes |
| **Sentry** | Monitoring erreurs production |
| **Google Fonts** | Police Poppins |

### 7.4 Edge Functions Supabase (95+)

Réparties par domaine :

| Domaine | Nombre | Exemples |
|---------|--------|----------|
| Import fournisseurs | 16 | import-alkor, import-comlandi, import-also, fetch-liderpapel-sftp |
| Pricing & Marges | 6 | pricing-apply, pricing-simulate, calculate-price-adjustments |
| Marketplaces | 10 | pull-shopify-orders, sync-amazon-stock, shopify-webhook |
| IA & Contenu | 8 | agent-descriptions, generate-blog-article, generate-social-posts |
| CRM & Communication | 12 | crm-abandoned-cart, brevo-send-transactional, send-sms-campaign |
| Scraping & Veille | 7 | run-crawl, scrape-competitor-prices, discover-competitor-urls |
| Commandes & Paiement | 5 | create-checkout-session, stripe-webhook, order-confirmation |
| Stock & PO | 6 | stock-generate-po, auto-purchase-orders, optimize-reorder |
| Enrichissement | 5 | icecat-enrich, enrich-products-batch, enrich-missing-data |
| Analytics | 4 | compute-kpi-snapshot, calculate-rfm-scores, predict-sales |
| Listes scolaires | 3 | process-school-list, match-school-products, import-schools-csv |
| RGPD & Sécurité | 3 | gdpr-data-export, gdpr-delete-account, security-monitor |
| Divers | 10 | generate-sitemap, newsletter-subscribe, nightly-rollup, lookup-ean |

---

## 8. Exigences non-fonctionnelles

### 8.1 Performance

| Exigence | Détail |
|----------|--------|
| SSG/SSR hybride | Pages statiques pour le catalogue, SSR pour le checkout et les pages dynamiques |
| Lazy loading | Import dynamique des librairies lourdes (recharts, jspdf, xlsx) |
| Image optimization | Composant OptimizedImage avec lazy loading |
| Stale time | Cache TanStack Query (5 min par défaut sur les queries non-critiques) |
| Batch queries | `.in('id', ids)` au lieu de boucles N+1 |
| CDN | Assets immutables cachés 1 an, index.html no-cache |
| Web Vitals | Suivi des Core Web Vitals |

### 8.2 Sécurité

| Exigence | Implémentation |
|----------|---------------|
| XSS | DOMPurify via `lib/sanitize.ts` |
| Validation | Zod sur tous les formulaires |
| Auth | Supabase JWT + guards (AdminGuard, AuthGuard, ProGuard) |
| CSP | Content Security Policy dans netlify.toml |
| HSTS | Strict Transport Security |
| X-Frame-Options | Protection clickjacking |
| Anti-bot | Composant HoneypotField.tsx |
| 2FA | Authentification deux facteurs disponible |
| Redirect validation | Validation des URLs de redirection |
| Phone validation | Validation format téléphone français |

### 8.3 RGPD & Conformité

| Exigence | Implémentation |
|----------|---------------|
| Consentement cookies | Cookie banner avec gestion des préférences |
| Registre des traitements | Table `data_processing_register` |
| Droit d'accès | Export données via Edge Function `gdpr-data-export` |
| Droit à l'effacement | Suppression compte via `gdpr-delete-account` |
| Consentements | Table `user_consents` avec horodatage |
| Rétention données | Logs de rétention dans `data_retention_logs` |
| Demandes RGPD | Workflow de demandes dans `gdpr_requests` |

### 8.4 SEO

| Exigence | Implémentation |
|----------|---------------|
| Schema.org | JSON-LD (LocalBusiness, Product, BreadcrumbList) |
| Sitemap | Génération dynamique via Edge Function, proxy Netlify |
| Métadonnées | BaseHead.astro avec OG tags, Twitter cards |
| SEO produits | Table `product_seo` dédiée |
| SEO blog | Métadonnées par article (mots-clés, liens, word count) |
| URLs | Slugs propres, routing fichier Astro |
| IA SEO | Agent d'optimisation SEO automatique |

### 8.5 Accessibilité

| Exigence | Implémentation |
|----------|---------------|
| Skip navigation | Lien "Aller au contenu" dans le header |
| Composants Radix | Accessibilité ARIA native (50+ composants) |
| Clavier | Navigation clavier dans la recherche (flèches, entrée) |
| Responsive | Mobile-first avec bottom nav mobile dédiée |
| Dark mode | Support thème clair/sombre |

### 8.6 Déploiement

| Exigence | Détail |
|----------|--------|
| Plateforme | Netlify (CDN + SSR) |
| Node | v20 |
| Build | `astro build` |
| Preview | `astro preview` |
| CI | Typecheck + ESLint + Vitest |
| Tests | Vitest + React Testing Library |

---

## 9. Métriques de succès

### 9.1 KPIs Commerce

| KPI | Description |
|-----|-------------|
| CA mensuel | Chiffre d'affaires total (B2C + B2B + services + marketplaces) |
| Nombre de commandes | Volume de commandes par canal |
| Panier moyen | Valeur moyenne des commandes |
| Taux de conversion | Visiteurs → acheteurs |
| Taux d'abandon panier | Paniers non finalisés (tracking CRM) |
| Marge brute moyenne | Marge sur prix de vente HT (objectif ≥ 10%) |

### 9.2 KPIs Catalogue

| KPI | Description |
|-----|-------------|
| Nombre de produits actifs | Produits vendables en ligne |
| Taux de complétude | % produits avec images, descriptions, prix |
| Enrichissement Icecat | Produits enrichis via Icecat |
| Score qualité données | Complétude globale du catalogue |

### 9.3 KPIs B2B

| KPI | Description |
|-----|-------------|
| Comptes B2B actifs | Nombre de comptes pro avec commandes |
| CA B2B | Part du CA professionnel |
| Budget consommé | Taux d'utilisation des budgets B2B |
| Réassorts automatiques | Templates de récommande utilisés |

### 9.4 KPIs Services

| KPI | Description |
|-----|-------------|
| Commandes impression | Volume reprographie + photo + fine art |
| Commandes tampons | Designs finalisés et commandés |
| Listes scolaires | Nombre de listes traitées par saison |

### 9.5 KPIs CRM

| KPI | Description |
|-----|-------------|
| Segmentation RFM | Répartition clients par segment |
| Récupération paniers | Taux de récupération paniers abandonnés |
| Pipeline deals | Valeur et conversion du pipeline CRM |
| NPS / Avis | Note moyenne des avis clients |

### 9.6 KPIs Technique

| KPI | Description |
|-----|-------------|
| Core Web Vitals | LCP, FID, CLS |
| Taux d'erreurs | Erreurs 4xx/5xx (Sentry) |
| Uptime | Disponibilité du site |
| Temps de build | Durée du build Netlify |

---

## Annexes

### A. Informations entreprise

```
Raison sociale : Papeterie Reine & Fils
Nom commercial : Ma Papeterie
Adresse : 10 rue Toupot de Beveaux, 52000 Chaumont
Téléphone : 03 10 96 02 24
Email : contact@ma-papeterie.fr
Horaires : Lun-Ven 9h-19h, Sam 9h-18h
Fondation : 1970
Site : https://ma-papeterie.fr
```

### B. Catégories principales

1. Écrire & Corriger
2. Cahiers & Papier
3. Classement
4. Petit Matériel Bureau et École
5. Bureautique
6. Équipement Classe et Bureau
7. Courrier et Expédition
8. Consommables Informatiques
9. Dessin
10. Travaux Manuels
11. Jeux
12. Mobilier
13. Services Généraux
14. Papiers

### C. Commandes de développement

```bash
npm run dev            # Serveur dev Astro
npm run build          # Build production
npm run build:check    # Typecheck + build
npm run lint           # ESLint
npm run typecheck      # tsc --noEmit
npm run test           # Vitest (run once)
npm run test:watch     # Vitest (watch)
npm run test:coverage  # Couverture
```
