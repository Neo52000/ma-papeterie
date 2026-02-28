# Audit Complet - Ma Papeterie
## Sécurité, SEO & GEO (Generative Engine Optimization)

**Date :** 24 février 2026
**Projet :** Ma-Papeterie.fr — Papeterie Reine & Fils, Chaumont (52000)
**Stack :** React 18 + Vite 5 + Supabase + Shopify Storefront API

---

## Scores Globaux

| Domaine | Score | Niveau |
|---------|-------|--------|
| **Sécurité** | 58/100 | INSUFFISANT |
| **SEO** | 86/100 | TRES BON |
| **GEO** | 82/100 | TRES BON |

---

# PARTIE 1 — AUDIT DE SECURITE

## Niveau de risque global : ELEVE

### Vulnérabilités Critiques (à corriger immédiatement)

#### 1. CORS Wildcard sur toutes les Edge Functions Supabase
- **Sévérité :** CRITIQUE
- **Fichiers affectés :** 40+ fonctions dans `supabase/functions/*/index.ts`
- **Problème :**
```typescript
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',  // DANGEREUX
};
```
- **Impact :** N'importe quel site web peut appeler ces fonctions, y compris les endpoints GDPR de suppression de compte et les imports CSV.
- **Correction :**
```typescript
const corsHeaders = {
  'Access-Control-Allow-Origin': 'https://ma-papeterie.fr',
};
```

#### 2. Absence d'authentification sur les fonctions admin
- **Sévérité :** CRITIQUE
- **Fichiers affectés :** 30+ Edge Functions (agent-seo, agent-descriptions, ai-import-catalog, auto-purchase-orders, sync-shopify, detect-pricing-opportunities, etc.)
- **Problème :** Les fonctions traitent les requêtes sans vérifier l'identité de l'appelant.
- **Impact :** Déclenchement non autorisé d'opérations coûteuses (IA, imports, synchronisation marketplace).
- **Correction :** Ajouter une vérification JWT au début de chaque fonction :
```typescript
const token = req.headers.get('Authorization')?.replace('Bearer ', '');
if (!token) {
  return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
}
```

#### 3. Token Shopify en dur dans le code client
- **Sévérité :** CRITIQUE
- **Fichier :** `src/lib/shopify.ts:7`
```typescript
const SHOPIFY_STOREFRONT_TOKEN = '23bed6e691090f0bb6240a1d7583a1a0';
```
- **Impact :** Token visible dans le bundle JS, DevTools et source maps. Peut être utilisé pour créer des paniers/commandes non autorisés.
- **Correction :** Déplacer vers une Edge Function Supabase avec validation côté serveur.

#### 4. Vulnérabilité XSS — Injection HTML non sanitisée
- **Sévérité :** CRITIQUE
- **Fichier :** `src/pages/ProductPage.tsx:370`
```typescript
<div dangerouslySetInnerHTML={{ __html: product.descriptionHtml }} />
```
- **Impact :** Si le contenu Shopify est compromis, injection de JavaScript malveillant pour voler sessions, données clients.
- **Correction :**
```typescript
import DOMPurify from 'dompurify';
<div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(product.descriptionHtml) }} />
```

---

### Vulnérabilités Elevées

#### 5. Absence de Content-Security-Policy (CSP)
- **Fichier :** `netlify.toml`
- **Problème :** Pas de header CSP ni HSTS.
- **Headers actuels :**
  - X-Frame-Options: DENY ✓
  - X-Content-Type-Options: nosniff ✓
  - Referrer-Policy: strict-origin-when-cross-origin ✓
  - Permissions-Policy: camera=(), microphone=(), geolocation=() ✓
- **Headers manquants :**
  - Content-Security-Policy
  - Strict-Transport-Security (HSTS)
  - X-XSS-Protection
- **Correction à ajouter dans `netlify.toml` :**
```toml
Content-Security-Policy = "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' https:; connect-src 'self' https://api.shopify.com https://mgojmkzovqgpipybelrr.supabase.co; frame-ancestors 'none';"
Strict-Transport-Security = "max-age=31536000; includeSubDomains; preload"
```

#### 6. Pas de Rate Limiting sur les Edge Functions
- **Impact :** Attaques DoS sur les opérations coûteuses (IA, imports CSV), brute force sur l'authentification.
- **Correction :** Implémenter un middleware de rate limiting par IP/token.

#### 7. Politique de mot de passe faible
- **Fichier :** `src/pages/Auth.tsx:48-54`
- **Actuel :** Minimum 6 caractères, aucune exigence de complexité.
- **Standard :** NIST recommande 12+ caractères, avec majuscules, chiffres et symboles.

#### 8. Vulnérabilité d'injection CSV
- **Fichier :** `supabase/functions/import-products-csv/index.ts:28-35`
- **Problème :** Parsing CSV naïf avec `.split(',')` sans gestion des champs entre guillemets ni validation de contenu.
- **Correction :** Utiliser un parseur CSV robuste (PapaParse).

---

### Vulnérabilités Moyennes

| # | Vulnérabilité | Fichier | Impact |
|---|---------------|---------|--------|
| 9 | Pas de protection CSRF explicite | Formulaires admin/contact | Exploitation si SameSite cookies non strict |
| 10 | Upload fichier sans validation taille/contenu | `ProductCsvImport.tsx:18-26` | Vecteur DoS |
| 11 | Divulgation d'erreurs internes | `import-products-csv/index.ts:99` | Fuite d'informations techniques |
| 12 | XSS via composant Chart | `src/components/ui/chart.tsx:70` | Risque faible (CSS uniquement) |

---

### Points Positifs

- Row-Level Security (RLS) sur les tables sensibles
- Authentification JWT avec auto-refresh
- Conformité GDPR : bannière cookies, export/suppression données, analytics anonymisées (hash SHA-256)
- Séparation des variables d'environnement (.env dans .gitignore)
- HTTPS forcé via Netlify
- Rôles admin/super_admin avec vérification côté serveur

---

### Plan de Remédiation Sécurité

| Phase | Actions | Priorité |
|-------|---------|----------|
| **Phase 1** (immédiat) | Restreindre CORS, ajouter auth aux fonctions, sanitiser HTML, ajouter CSP/HSTS | CRITIQUE |
| **Phase 2** (semaine 1) | Rate limiting, renforcer mots de passe, parseur CSV, tokens CSRF | ELEVE |
| **Phase 3** (semaine 2) | Validation uploads, sanitisation erreurs, audit dépendances | MOYEN |

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
