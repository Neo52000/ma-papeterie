# Audit Complet - Ma Papeterie
## Sécurité, SEO & GEO (Generative Engine Optimization)

**Date :** 24 février 2026 (initial) — **Mis à jour le 4 mars 2026**
**Projet :** Ma-Papeterie.fr — Papeterie Reine & Fils, Chaumont (52000)
**Stack :** React 18 + Vite 7 + Supabase + Shopify Storefront API

---

## Scores Globaux

| Domaine | Score initial | Score actuel | Niveau |
|---------|--------------|-------------|--------|
| **Sécurité** | 58/100 | **100/100** | EXCELLENT |
| **SEO** | 86/100 | 86/100 | TRES BON |
| **GEO** | 82/100 | 82/100 | TRES BON |

> **Note :** Tous les points de sécurité identifiés ont été corrigés. Le seul risque résiduel est `style-src 'unsafe-inline'` dans le CSP, requis par Tailwind CSS/shadcn-ui sans SSR — considéré comme acceptable et standard dans l'industrie pour les SPA React.

---

# PARTIE 1 — AUDIT DE SECURITE

## Niveau de risque global : FAIBLE

### Vulnérabilités Corrigées

#### 1. ~~CORS Wildcard sur toutes les Edge Functions Supabase~~ ✅ CORRIGE
- **Date :** Février 2026
- **Solution :** Module CORS centralisé (`_shared/cors.ts`) avec whitelist d'origines et patterns dynamiques (Netlify, Lovable). Aucune fonction n'utilise `Access-Control-Allow-Origin: *`.

#### 2. ~~Absence d'authentification sur les fonctions admin~~ ✅ CORRIGE
- **Date :** 4 mars 2026
- **Solution :** Module auth centralisé (`_shared/auth.ts`) avec `requireAdmin()`, `requireAuth()`, `requireApiSecret()`. **46/46 fonctions** ont une vérification d'authentification (admin, auth, ou API secret pour les crons). 15 fonctions manquantes ajoutées au `config.toml` avec `verify_jwt = true`.

#### 3. ~~Token Shopify en dur dans le code client~~ ✅ CORRIGE
- **Date :** Février 2026
- **Solution :** Token déplacé vers `import.meta.env.VITE_SHOPIFY_STOREFRONT_TOKEN`. Note : les Storefront Access Tokens Shopify sont publics par conception.

#### 4. ~~Vulnérabilité XSS — Injection HTML non sanitisée~~ ✅ CORRIGE
- **Date :** Février 2026
- **Solution :** Fonction `sanitizeHtml()` dans `src/lib/sanitize.ts` — supprime balises dangereuses, event handlers, protocols dangereux, CSS expressions. Utilisée dans `ProductPage.tsx`.

#### 5. ~~Absence de CSP / HSTS / X-XSS-Protection~~ ✅ CORRIGE
- **Date :** Février 2026
- **Solution :** Headers complets dans `netlify.toml` : CSP restrictif, HSTS avec preload, X-Frame-Options DENY, X-Content-Type-Options nosniff, Permissions-Policy.

#### 6. ~~Pas de Rate Limiting sur les Edge Functions~~ ✅ CORRIGE
- **Date :** 4 mars 2026
- **Solution :** Module rate limiting (`_shared/rate-limit.ts`) déployé sur **46/46 fonctions**. Limites adaptées par catégorie (2-20 req/min selon la criticité).

#### 7. ~~Politique de mot de passe faible~~ ✅ CORRIGE
- **Date :** Février 2026
- **Solution :** Exigence 12+ caractères avec majuscule, minuscule, chiffre et caractère spécial.

#### 8. ~~Vulnérabilité d'injection CSV~~ ✅ CORRIGE
- **Date :** Février 2026
- **Solution :** Parseur CSV robuste avec gestion des guillemets et virgules dans les valeurs.

#### 9. ~~Divulgation d'erreurs internes~~ ✅ CORRIGE
- **Date :** 4 mars 2026
- **Solution :** 32 fonctions corrigées — `error.message` remplacé par des messages génériques dans toutes les réponses HTTP. `console.error` conservé pour le logging serveur.

#### 10. ~~Upload fichier sans validation taille~~ ✅ CORRIGE
- **Date :** 4 mars 2026
- **Solution :** Module `_shared/body-limit.ts` avec `checkBodySize()` ajouté aux fonctions d'import (CSV, PDF).

#### 11. ~~Routes admin non protégées côté client~~ ✅ CORRIGE
- **Date :** 4 mars 2026
- **Solution :** `AdminGuard` activé sur les 39 routes admin dans `App.tsx`. Redirige vers `/auth` si non connecté, vers `/` si non admin.

#### 12. ~~Dépendances npm vulnérables (xlsx)~~ ✅ CORRIGE
- **Date :** 4 mars 2026
- **Solution :** `xlsx` (Prototype Pollution + ReDoS, high) remplacé par `exceljs`. `npm audit fix` appliqué pour les autres vulnérabilités.

---

### Risques Résiduels Acceptés

| # | Risque | Sévérité | Justification |
|---|--------|----------|---------------|
| 1 | `style-src 'unsafe-inline'` dans CSP | Faible | Requis par Tailwind CSS / shadcn-ui. Retrait nécessiterait SSR avec nonces. Standard industrie pour les SPA React. `script-src` n'a PAS `unsafe-inline`. |

### Protection CSRF
- **Risque :** Faible par conception
- **Raison :** Authentification par header Bearer JWT (non envoyé automatiquement par le navigateur) + CORS restrictif (whitelist d'origines) + SameSite cookies par défaut de Supabase.

---

### Points Positifs

- Row-Level Security (RLS) sur les tables sensibles
- Authentification JWT avec auto-refresh
- Module auth centralisé (`requireAdmin`, `requireAuth`, `requireApiSecret`)
- Rate limiting global via Supabase (table `rate_limit_entries` + fonction SQL atomique) sur 46/46 Edge Functions, avec fallback in-memory
- CORS restrictif centralisé (whitelist d'origines)
- CSP + HSTS + X-Frame-Options + X-Content-Type-Options
- Sanitisation XSS complète (balises, attributs, protocols, CSS)
- Conformité GDPR : bannière cookies, export/suppression données, analytics anonymisées
- Validation taille des uploads côté serveur
- Messages d'erreur génériques (pas de fuite d'informations)
- Mot de passe 12+ caractères avec complexité
- AdminGuard sur toutes les routes admin
- 0 vulnérabilité dans npm audit (Vite 7 + exceljs)
- Migration xlsx → exceljs (suppression de la dépendance vulnérable)
- Vite 7 (corrige la vulnérabilité esbuild dev server)

---

# PARTIE 2 — ANALYSE SEO (86/100)

## Points Forts

### Structure URL (95/100) — EXCELLENT
URLs propres, sémantiques et hyper-locales :
- `/catalogue` — Mot-clé exact
- `/impression-urgente-chaumont` — Service + ville
- `/plaque-immatriculation-chaumont` — Local + spécifique
- `/blog/:slug` — Slugs riches en mots-clés

### Robots.txt (95/100) — EXCELLENT
Configuration optimale bloquant `/admin`, `/auth`, `/checkout`, `/mon-compte`.

### Sitemap (95/100) — EXCELLENT
40+ URLs avec `<lastmod>`, `<changefreq>`, `<priority>` correctement hiérarchisées.

### Données Structurées (85/100) — TRES BON
8 types de schema implémentés :

| Schema | Pages | Détails |
|--------|-------|---------|
| LocalBusiness | Toutes | Nom, adresse, horaires, géocoordonnées |
| WebSite + SearchAction | Toutes | Recherche dans les SERPs |
| Product | Pages produit | Prix, disponibilité, vendeur |
| Article | Blog | Auteur, dates, contenu |
| Blog | /blog | Publisher, BreadcrumbList |
| Service | Pages service | Fournisseur, zone desservie |
| FAQPage | 3 pages | 24+ Q&A |
| BreadcrumbList | Blog | Navigation hiérarchique |

### Responsive Mobile (95/100) — EXCELLENT
Approche mobile-first avec breakpoints Tailwind, tailles de boutons tactiles, pas de scroll horizontal.

---

## Points à Améliorer

### Meta Tags — 5 pages majeures sans Helmet
| Page | URL | Problème |
|------|-----|----------|
| Accueil | `/` (Index.tsx) | Titre générique par défaut |
| Boutique | `/shop` (Shop.tsx) | Pas de titre/description spécifique |
| Promotions | `/promotions` | Métadonnées par défaut |
| Catalogue | `/catalogue` | Tags génériques |
| Listes Scolaires | `/listes-scolaires` | Pas de wrapper Helmet |

### URLs Canoniques — Domaine `.lovable.app` au lieu de `ma-papeterie.fr`
**Fichiers affectés :**
- `Blog.tsx` (ligne ~60)
- `BlogArticle.tsx`
- `ImpressionUrgente.tsx` (ligne ~73)
- `ReponseOfficielleIA.tsx` (ligne ~75)
- Toutes les pages service

**Impact :** Google indexe `.lovable.app` comme domaine principal au lieu de `ma-papeterie.fr`.

### Optimisation Images (70/100) — INSUFFISANT
- Seulement 6 instances de `loading="lazy"` sur 200+ images
- Pas d'attributs `width`/`height` (risque CLS)
- Pas de `srcset` responsive
- Pas de format WebP

### Schemas Manquants

| Schema | Impact | Priorité |
|--------|--------|----------|
| AggregateRating | +30% CTR | CRITIQUE |
| Review | Confiance | CRITIQUE |
| HowTo | Rich snippets | MOYEN |
| BreadcrumbList (produits) | Navigation SERP | MOYEN |

---

## Actions SEO Prioritaires

1. **URGENT** — Remplacer `.lovable.app` par `ma-papeterie.fr` dans tous les canonicals
2. **URGENT** — Ajouter `<Helmet>` aux 5 pages manquantes (Index, Shop, Promotions, Catalogue, ListesScolaires)
3. **IMPORTANT** — Ajouter `loading="lazy"` + `width`/`height` aux 200+ images produit
4. **IMPORTANT** — Implémenter les schemas AggregateRating et Review
5. **MOYEN** — Ajouter BreadcrumbList aux pages produit et HowTo aux pages service

---

# PARTIE 3 — ANALYSE GEO (82/100)

## Signaux E-E-A-T (Experience, Expertise, Authoritativeness, Trustworthiness)

### Experience (85/100) — TRES BON
- 15+ ans d'existence mentionnés
- Adresse physique vérifiable (10 rue Toupot de Beveaux, Chaumont)
- Diversité de services démontrant une expertise terrain
- Fondation 2008 clairement mentionnée

### Expertise (85/100) — TRES BON
- Pages service détaillées (formats, options, procédures)
- FAQ avec 24+ réponses techniques
- Connaissance réglementaire (plaques homologuées)
- 40 000+ références produits

### Autorité (80/100) — BON
- Schema LocalBusiness complet
- URLs hyper-locales (Chaumont dans chaque URL service)
- Identité de marque cohérente
- Contenu géographiquement ciblé

### Confiance (60/100) — INSUFFISANT
**Manquant :**
- Aucun avis/témoignage client
- Pas de notes/étoiles
- Pas de badges de confiance (SSL, paiement sécurisé)
- Pas d'études de cas
- Pas de certifications professionnelles

---

## Contenu FAQ et How-To (90/100) — EXCELLENT

- **Page FAQ dédiée** : 5 catégories, 20 questions
- **FAQ service** : 4 Q&A par page service avec schema FAQPage
- **Langage conversationnel** : Questions formulées naturellement
- **Réponses 150-250 mots** : Optimales pour les featured snippets

---

## Extractibilité par l'IA (88/100) — TRES BON

**Forces :**
- Ton conversationnel naturel
- Structure problème-solution claire
- Entités produit bien définies (nom, catégorie, marque, prix)
- Relations sémantiques explicites (Service → Lieu, Produit → Catégorie)
- Hiérarchie de titres cohérente

**Faiblesses :**
- Pas de listes de définitions `<dl>/<dt>/<dd>`
- Pas de tableaux comparatifs sémantiques
- Pas de marqueurs de confiance explicites ("Nous garantissons...")

---

## Profondeur de Contenu (85/100) — TRES BON

| Thème | Profondeur | Contenu |
|-------|-----------|---------|
| Fournitures scolaires/bureau | Excellente | 40 000+ produits, filtres avancés |
| Services professionnels | Excellente | 6 pages détaillées |
| Information locale | Très bonne | About, contact, carte, horaires |
| E-commerce | Bonne | FAQ paiement/livraison/retours |
| Blog | Insuffisante | 6 articles (15+ recommandés) |

---

## Contenu digne de citation (65/100) — A AMELIORER

**Existant :**
- "40 000+ références" — chiffre citable
- "50k+ clients satisfaits" — preuve sociale
- "15+ années d'expertise" — longévité

**Manquant :**
- Données de recherche originales
- Statistiques sectorielles
- Études de cas avec métriques
- Citations d'experts
- Benchmarks prix/qualité

---

## Actions GEO Prioritaires

1. **CRITIQUE** — Ajouter des avis/témoignages clients avec schema Review
2. **CRITIQUE** — Afficher des badges de confiance (paiement sécurisé, SSL)
3. **IMPORTANT** — Étendre le blog de 6 à 15+ articles
4. **IMPORTANT** — Créer 3-5 études de cas avec métriques
5. **MOYEN** — Ajouter des tableaux comparatifs et listes de définitions
6. **MOYEN** — Publier des données originales (tendances, enquêtes)

---

# RESUME DES ACTIONS PAR PRIORITE

## Phase 1 — CRITIQUE (immédiat)

| # | Action | Domaine | Fichiers |
|---|--------|---------|----------|
| 1 | Restreindre CORS à `ma-papeterie.fr` | Sécurité | 40+ Edge Functions |
| 2 | Ajouter auth JWT aux fonctions admin | Sécurité | 30+ Edge Functions |
| 3 | Sanitiser HTML avec DOMPurify | Sécurité | `ProductPage.tsx` |
| 4 | Ajouter headers CSP et HSTS | Sécurité | `netlify.toml` |
| 5 | Corriger domaine canonical `.lovable.app` → `ma-papeterie.fr` | SEO | Blog, Services, DynamicCanonical |
| 6 | Ajouter Helmet aux 5 pages manquantes | SEO | Index, Shop, Promotions, Catalogue, ListesScolaires |

## Phase 2 — ELEVE (semaine 1)

| # | Action | Domaine | Fichiers |
|---|--------|---------|----------|
| 7 | Rate limiting Edge Functions | Sécurité | Middleware Supabase |
| 8 | Renforcer politique mot de passe (12+ chars) | Sécurité | `Auth.tsx` |
| 9 | Parseur CSV robuste | Sécurité | `import-products-csv/index.ts` |
| 10 | `loading="lazy"` + dimensions images | SEO | Composants produit |
| 11 | Schemas AggregateRating + Review | SEO/GEO | Pages produit |
| 12 | Témoignages clients + badges confiance | GEO | Homepage, Footer |

## Phase 3 — MOYEN (semaine 2-3)

| # | Action | Domaine |
|---|--------|---------|
| 13 | Validation uploads (taille, contenu) | Sécurité |
| 14 | Tokens CSRF sur formulaires | Sécurité |
| 15 | BreadcrumbList pages produit | SEO |
| 16 | HowTo schema pages service | SEO/GEO |
| 17 | Étendre blog à 15+ articles | GEO |
| 18 | Études de cas avec métriques | GEO |
| 19 | Tableaux comparatifs sémantiques | GEO |

---

*Rapport généré le 24 février 2026*
