# Ma Papeterie — Plan d'Audit & Refactoring

> Date : 2026-03-21
> Scope : Audit complet (architecture, performance, sécurité, qualité TypeScript, tests)
> Codebase : ~76 600 lignes, 453 fichiers TS/TSX, 84 hooks, 80+ pages

---

## Suivi d'avancement (mis à jour le 2026-04-06)

| Phase | Nom | Status | Progression |
|-------|-----|--------|-------------|
| 1 | Quick Wins | ✅ **TERMINÉE** | 100% |
| 2 | Décomposition monolithes | 🟡 **PARTIELLE** | ~60% |
| 3 | Consolidation patterns | ✅ **QUASI TERMINÉE** | ~90% |
| 4 | TypeScript hardening | 🟡 **EN COURS** | ~50% |
| 5 | Migration state management | ✅ **TERMINÉE** | 100% |
| 6 | Tests | 🔴 **DÉBUT** | ~25% |

**Progression globale estimée : ~70%**

### Détail par phase

**Phase 1 ✅** — Tous les items complétés. Sentry remplacé par tracker maison Supabase (`src/lib/sentry-config.ts`).

**Phase 2 🟡** — 2/5 fichiers entièrement décomposés (AdminPurchases 1818→184, AdminProducts 1369→509). Reste : AdminBlogArticles (1438, quasi intact), AdminComlandi (1351), AdminAlkor (1014).

**Phase 3 ✅** — `src/types/` créé, `useAdminCrud.ts` opérationnel, `staleTime` déployé sur 62 fichiers. Reste mineur : `levenshtein()`/`similarity()` non consolidés dans `text-utils.ts`.

**Phase 4 🟡** — `any` réduits de 418 → 159 (-62%). `AppError` créé. **`strictNullChecks` toujours `false`** (chantier le plus lourd restant).

**Phase 5 ✅** — CartContext + AuthContext migrés vers Zustand (commit `e7dfeab`, 04/04/2026). 131 fichiers mis à jour, API backward-compatible préservée. **Note :** réalisée avant Phase 4 (dépendance non stricte).

**Phase 6 🔴** — 18 fichiers de tests (vs 11 initialement). Aucun seuil de coverage configuré. Couverture estimée ~15%.

---

## Résumé exécutif

Le codebase est fonctionnellement riche et bien organisé au niveau modules. Les fondamentaux sécurité sont solides (score 82/100). Les principaux axes d'amélioration sont :

1. **5 fichiers monolithiques** dépassant 1 000 lignes (jusqu'à 1 968)
2. **418 usages de `any`** et `strictNullChecks: false`
3. **Duplication de patterns** (CRUD admin, state management, column mappings)
4. **État fragmenté** : 8 stores Zustand + 3 Contexts React coexistent
5. **Couverture de tests limitée** : 11 fichiers de tests, coverage uniquement sur `lib/` et `stores/`
6. **Queries N+1** et imports synchrones de libs lourdes

---

## Phase 1 — Quick Wins (Impact élevé, Risque faible)

### 1.1 Sentry dans les Error Boundaries
**Fichiers :**
- `src/components/ErrorBoundary.tsx`
- `src/components/admin/AdminErrorBoundary.tsx`

**Action :** Ajouter `captureException(error)` dans `componentDidCatch()`.

```typescript
import { captureException } from '@/lib/sentry-config';

componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
  captureException(error, { extra: { componentStack: errorInfo.componentStack } });
  console.error('ErrorBoundary caught an error:', error, errorInfo);
}
```

**Complexité :** S | **Vérification :** Vérifier dans Sentry qu'une erreur React remonte correctement.

---

### 1.2 Handler global `unhandledrejection`
**Fichier :** `src/main.tsx`

**Action :** Ajouter avant le render React :
```typescript
window.addEventListener('unhandledrejection', (event) => {
  captureException(event.reason);
});
```

**Complexité :** S | **Vérification :** Console + Sentry dashboard.

---

### 1.3 Corriger le pattern N+1 dans `useOrders.ts`
**Fichier :** `src/hooks/useOrders.ts` (lignes 94-110)

**Problème actuel :** Boucle `for...of` avec une requête Supabase individuelle par item.

**Action :** Remplacer par un batch `.in()` :
```typescript
const productIds = orderData.items
  .filter(item => !item.stamp_design_id)
  .map(item => item.product_id);

if (productIds.length > 0) {
  const { data: products, error } = await supabase
    .from('products')
    .select('id, stock_quantity')
    .in('id', productIds);

  if (error) throw error;

  const stockMap = new Map(products?.map(p => [p.id, p.stock_quantity]) ?? []);
  for (const item of orderData.items) {
    if (item.stamp_design_id) continue;
    const stock = stockMap.get(item.product_id) ?? 0;
    if (stock < item.quantity) {
      throw new Error(`Stock insuffisant pour ${item.product_name}`);
    }
  }
}
```

**Complexité :** S | **Vérification :** `npm run typecheck` + test manuel checkout.

---

### 1.4 Supprimer le code mort
**Fichiers à supprimer/nettoyer :**

| Fichier | Action |
|---------|--------|
| `src/components/admin/LegacyOffersTable.tsx` | Supprimer (remplacé par `OffersTable.tsx`) |
| Imports Lucide non utilisés dans les pages admin | Nettoyer (AdminComlandi, AdminAlkor, AdminPurchases) |

**Complexité :** S | **Vérification :** `npm run build` passe sans erreur.

---

### 1.5 Corriger la version `@sentry/tracing`
**Fichier :** `package.json`

**Problème :** `@sentry/tracing` v7 vs `@sentry/react` v10 — mismatch majeur.

**Action :** Vérifier si `@sentry/tracing` est encore nécessaire (v10 de `@sentry/react` inclut le tracing via `browserTracingIntegration`). Si oui, mettre à jour vers v10. Sinon, supprimer la dépendance.

**Complexité :** S | **Vérification :** `npm run build` + vérifier traces dans Sentry.

---

### 1.6 Imports dynamiques pour jspdf
**Fichiers :**
- `src/components/order/generateOrderPDF.ts`
- `src/components/pro/generateInvoicePDF.ts`

**Action :** Convertir les imports statiques en imports dynamiques :
```typescript
// Avant
import jsPDF from 'jspdf';
import 'jspdf-autotable';

// Après
export async function generateOrderPDF(...) {
  const { default: jsPDF } = await import('jspdf');
  await import('jspdf-autotable');
  // ...
}
```

**Complexité :** S | **Vérification :** Bundle analyzer — le chunk `vendor-pdf` ne doit plus apparaître au chargement initial.

---

## Phase 2 — Décomposition des fichiers monolithiques (Impact élevé, Risque moyen)

> **Dépend de :** Phase 1 (code mort nettoyé)
> **Principe :** Extraire sans changer le comportement. Chaque refactoring = 1 commit atomique.

### 2.1 AdminComlandi.tsx (1 968 lignes → ~600)

**Extractions :**

| Extraction | Destination | Contenu |
|-----------|-------------|---------|
| Parsing CSV/Excel | `src/lib/importers/comlandi-parser.ts` | Logique de parsing, normalisation headers, mapping colonnes |
| Upload TUS | `src/lib/tus-uploader.ts` | Wrapper TUS avec progress callback |
| Column mappings | `src/data/comlandi-mappings.ts` | `COLUMN_MAP`, constantes de mapping |
| Composant preview | `src/components/admin/comlandi/ImportPreview.tsx` | Table de preview des données importées |
| Composant upload | `src/components/admin/comlandi/ImportUploadForm.tsx` | Formulaire d'upload avec drag & drop |

**Complexité :** L | **Vérification :** Page AdminComlandi fonctionnelle (import CSV + upload TUS).

---

### 2.2 AdminPurchases.tsx (1 818 lignes → ~500)

**Extractions :**

| Extraction | Destination | Contenu |
|-----------|-------------|---------|
| 30+ useState → useReducer | `src/hooks/admin/usePurchaseOrderState.ts` | État consolidé dans un reducer |
| Table des commandes | `src/components/admin/purchases/PurchaseOrdersTable.tsx` | Table + filtres + actions |
| Formulaire création | `src/components/admin/purchases/PurchaseOrderForm.tsx` | Dialog de création/édition |
| Import PDF | `src/components/admin/purchases/PdfImportDialog.tsx` | Dialog d'import PDF |
| Export Excel | `src/lib/importers/purchase-export.ts` | Logique d'export ExcelJS |

**Complexité :** L | **Vérification :** CRUD commandes fournisseurs complet + import PDF + export XLS.

---

### 2.3 AdminBlogArticles.tsx (1 450 lignes → ~500)

**Extractions :**

| Extraction | Destination | Contenu |
|-----------|-------------|---------|
| Social Booster panel | `src/components/admin/blog/SocialBoosterPanel.tsx` | Panel de boost social média |
| Article form/editor | `src/components/admin/blog/ArticleEditor.tsx` | Formulaire d'édition article |
| Articles table | `src/components/admin/blog/ArticlesTable.tsx` | Liste + actions + filtres |

**Complexité :** M | **Vérification :** CRUD articles + social booster fonctionnels.

---

### 2.4 AdminAlkor.tsx (1 378 lignes → ~500)

**Extractions :**

| Extraction | Destination | Contenu |
|-----------|-------------|---------|
| Column mappings | `src/data/alkor-mappings.ts` | `COLUMN_MAP`, `PRICE_COLUMN_MAP`, `PO_COLUMN_MAP` |
| Crawl job manager | `src/components/admin/alkor/CrawlJobManager.tsx` | Interface de gestion des crawls |
| Sync tab | `src/components/admin/alkor/SyncB2BTab.tsx` | Tab de synchronisation B2B |
| Header normalization | `src/lib/text-utils.ts` | `normalizeHeader()` (partagé avec Comlandi) |

**Complexité :** M | **Vérification :** Crawl Alkor + sync B2B fonctionnels.

---

### 2.5 AdminProducts.tsx (1 369 lignes → ~500)

**Extractions :**

| Extraction | Destination | Contenu |
|-----------|-------------|---------|
| Interface Product locale | `src/types/product.ts` | Type Product centralisé |
| Product form | `src/components/admin/products/ProductForm.tsx` | Dialog d'édition produit |
| Products table | `src/components/admin/products/ProductsTable.tsx` | Table avec filtres et actions |
| EAN lookup | `src/hooks/admin/useEanLookup.ts` | Logique de recherche EAN |

**Complexité :** M | **Vérification :** CRUD produits + recherche EAN + SEO normalization.

---

## Phase 3 — Consolidation des patterns (Impact moyen, Risque moyen)

> **Dépend de :** Phase 2 (composants extraits, patterns visibles)

### 3.1 Types centralisés
**Créer :** `src/types/`

| Fichier | Contenu |
|---------|---------|
| `src/types/product.ts` | Interface `Product`, `ProductVariant`, `ProductAttribute` |
| `src/types/order.ts` | `Order`, `OrderItem`, `PurchaseOrder` |
| `src/types/supplier.ts` | `Supplier`, `SupplierOffer`, `ColumnMapping` |
| `src/types/common.ts` | `Address`, `AppError`, `PaginationParams` |

**Action :** Remplacer les définitions locales dans chaque page admin par les imports centralisés.

**Complexité :** M | **Vérification :** `npm run typecheck`.

---

### 3.2 Hook CRUD générique
**Créer :** `src/hooks/admin/useAdminCrud.ts`

```typescript
export function useAdminCrud<T>(table: string, queryKey: string[], options?: {
  select?: string;
  orderBy?: string;
  filters?: Record<string, unknown>;
}) {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({ ... });
  const createMutation = useMutation({ ... });
  const updateMutation = useMutation({ ... });
  const deleteMutation = useMutation({ ... });
  return { data, isLoading, create, update, remove };
}
```

**Impact :** Simplifie 15+ pages admin qui répètent le même pattern fetch/create/update/delete.

**Complexité :** M | **Vérification :** Refactorer 2-3 pages simples (AdminUsers, AdminSuppliers) pour valider.

---

### 3.3 Utilitaires texte partagés
**Créer :** `src/lib/text-utils.ts`

**Fonctions à extraire :**
- `normalizeHeader()` — depuis AdminAlkor + AdminComlandi
- `levenshtein()` — depuis AdminCategories
- `similarity()` — depuis AdminCategories

**Complexité :** S | **Vérification :** `npm run typecheck` + tests unitaires.

---

### 3.4 Ajouter `staleTime` explicite aux hooks manquants
**Fichiers :**
- `src/hooks/useGdprStats.ts`
- `src/hooks/useLiderpapelCoefficients.ts`
- `src/hooks/useServicePricing.ts`
- `src/hooks/useB2BInvoices.ts`
- `src/hooks/useCategoryCounts.ts`
- `src/hooks/useB2BReorderTemplates.ts`

**Action :** Ajouter `staleTime: 5 * 60_000` (5 min) sur chaque hook, ou un temps adapté (ex: 30 min pour les coefficients Liderpapel).

**Complexité :** S | **Vérification :** DevTools TanStack Query — vérifier que les requêtes ne se relancent pas inutilement.

---

## Phase 4 — Hardening TypeScript (Impact moyen, Effort élevé)

> **Dépend de :** Phases 2-3 (types centralisés, code nettoyé)
> **Stratégie :** Migration incrémentale, fichier par fichier

### 4.1 Éliminer les `any` critiques (top 10 fichiers)

**Priorité haute (sécurité/data) :**

| Fichier | `any` count | Action |
|---------|------------|--------|
| `AdminReviewModeration.tsx` | 3 | Supprimer `supabase as any`, typer les reviews |
| `useOrders.ts` | 4 | Typer `shipping_address`, `billing_address` comme `Address` |
| `useProductSuppliers.ts` | 4 | Typer les résultats Supabase |
| `Checkout.tsx` | 2 | Typer les handlers de formulaire |
| `MesFavoris.tsx` | 4 | Typer le composant produit avec `Product` |

**Priorité moyenne (admin) :**

| Fichier | `any` count | Action |
|---------|------------|--------|
| `AdminProducts.tsx` | 31 | Utiliser le type `Product` centralisé |
| `AdminComlandi.tsx` | 23 | Typer les données d'import |
| `useNavigationMenus.ts` | 15 | Typer les items de menu |
| `AdminPurchases.tsx` | 13 | Utiliser le type `PurchaseOrder` centralisé |

**Complexité :** L (418 occurrences total) | **Vérification :** `npm run typecheck` après chaque fichier.

---

### 4.2 Créer un type `AppError` standard
**Créer :** `src/types/common.ts`

```typescript
export interface AppError {
  message: string;
  code?: string;
  status?: number;
  details?: unknown;
}

export function toAppError(err: unknown): AppError {
  if (err instanceof Error) return { message: err.message };
  if (typeof err === 'string') return { message: err };
  return { message: 'Erreur inconnue' };
}
```

**Action :** Remplacer tous les `catch (err: any)` par `catch (err: unknown)` + `toAppError(err)`.

**Complexité :** M | **Vérification :** `npm run typecheck`.

---

### 4.3 Activer `strictNullChecks` incrémentalement
**Stratégie :** Utiliser `// @ts-strict-ignore` en tête des fichiers existants, activer `strictNullChecks: true` dans `tsconfig.json`, puis retirer progressivement les `@ts-strict-ignore`.

**Ordre de migration :**
1. `src/lib/` — utilitaires purs, faciles à migrer
2. `src/stores/` — stores Zustand, peu d'interactions complexes
3. `src/types/` — nouvellement créé, déjà strict
4. `src/hooks/` — un par un, en commençant par les plus simples
5. `src/components/ui/` — shadcn, généralement déjà compatible
6. `src/pages/` — en dernier, le plus complexe

**Complexité :** XL (projet sur plusieurs semaines) | **Vérification :** `npm run typecheck` à chaque étape.

---

## Phase 5 — Migration State Management (Impact moyen, Risque élevé)

> **Dépend de :** Phase 4 (types solides pour les nouveaux stores)
> **Principe :** Migration progressive avec coexistence temporaire Context + Store

### 5.1 CartContext → Zustand

**Situation actuelle :**
- `CartContext.tsx` (205 lignes) utilisé dans 23 fichiers
- `cartStore.ts` existe mais utilisé uniquement pour Shopify
- `shopifyCartStore.ts` et `serviceCartStore.ts` déjà en Zustand

**Plan :**
1. Créer `src/stores/mainCartStore.ts` avec la même interface que `useCart()`
2. Ajouter un hook wrapper `src/hooks/useMainCart.ts` qui expose la même API
3. Migrer les consommateurs 5 par 5 (commencer par les composants feuille)
4. Une fois tous les consommateurs migrés, supprimer `CartContext.tsx` et `CartProvider` de `App.tsx`

**Fichiers consommateurs (23) :**
- `Shop.tsx`, `Checkout.tsx`, `MonCompte.tsx`, `ProductDetailPage.tsx`
- `CartSheet.tsx`, `CartRecoWidget.tsx`, `CartSummary.tsx`
- `ConsumableCrossSelling.tsx`, `ConsumableResults.tsx`
- `StampStickyCTA.tsx`, `StampAddToCartButton.tsx`
- `FeaturedProducts.tsx`, `BestSellers.tsx`, `ProductDetailModal.tsx`, `RecoWidget.tsx`
- `ProductMatcher.tsx`, `SchoolListViewer.tsx`, `CopilotCarts.tsx`
- Et 5 autres

**Complexité :** L | **Vérification :** Tests CartContext existants adaptés au nouveau store + tests manuels panier.

---

### 5.2 AuthContext → Zustand

**Situation actuelle :**
- `AuthContext.tsx` (195 lignes) utilisé dans 40 fichiers
- Aucun store Zustand équivalent

**Plan :**
1. Créer `src/stores/authStore.ts` avec `user`, `session`, `isAdmin`, `isPro`, `loading`
2. Ajouter un hook wrapper `src/hooks/useAuthStore.ts` avec la même API que `useAuth()`
3. Migrer les guards en premier (`AdminGuard`, `AuthGuard`, `ProGuard`)
4. Migrer les pages admin par lot
5. Migrer le reste
6. Supprimer `AuthContext.tsx` et `AuthProvider` de `App.tsx`

**Fichiers consommateurs (40) :** Voir liste dans l'audit.

**Complexité :** XL | **Vérification :** Tests guards existants + test manuel login/logout/admin.

---

## Phase 6 — Tests (Long terme, continu)

> **Dépend de :** Phases 2-3 (composants extraits = plus faciles à tester)

### 6.1 Étendre le scope de coverage
**Fichier :** `vitest.config.ts` (ou `vite.config.ts` section test)

```typescript
test: {
  coverage: {
    include: ['src/**/*.{ts,tsx}'],
    exclude: ['src/integrations/**', 'src/test/**'],
  },
}
```

### 6.2 Priorités de tests

| Priorité | Zone | Fichiers cibles | Tests à écrire |
|----------|------|-----------------|----------------|
| 🔴 Haute | Hooks critiques | `useOrders.ts`, `useProducts.ts` | Unit tests avec mock Supabase |
| 🔴 Haute | Nouveau code | `useAdminCrud.ts`, `text-utils.ts` | Unit tests pour chaque extraction |
| 🟡 Moyenne | Guards | `AdminGuard.tsx`, `ProGuard.tsx` | Tests d'accès avec différents rôles |
| 🟡 Moyenne | Cart stores | `mainCartStore.ts` | Tests Zustand (add, remove, update, clear) |
| 🟢 Basse | Pages admin | `AdminProducts.tsx` (refactoré) | Tests de rendering + interaction |
| 🟢 Basse | Edge functions | `create-checkout-session` | Tests d'intégration Deno |

### 6.3 Objectif de couverture

| Zone | Actuel | Cible Phase 6 |
|------|--------|---------------|
| `src/lib/` | ~70% | 90% |
| `src/stores/` | ~60% | 85% |
| `src/hooks/` | ~5% | 50% |
| `src/components/` | ~2% | 30% |
| `src/pages/` | 0% | 20% |
| **Global** | **~10%** | **40%** |

**Complexité :** XL (effort continu) | **Vérification :** `npm run test:coverage`.

---

## Résumé du calendrier

| Phase | Nom | Complexité | Dépendances | Estimation |
|-------|-----|-----------|-------------|------------|
| 1 | Quick Wins | S-M | Aucune | 1-2 jours |
| 2 | Décomposition monolithes | L | Phase 1 | 1-2 semaines |
| 3 | Consolidation patterns | M | Phase 2 | 1 semaine |
| 4 | TypeScript hardening | XL | Phases 2-3 | 2-4 semaines |
| 5 | Migration state management | XL | Phase 4 | 2-3 semaines |
| 6 | Tests | XL | Phases 2-3 | Continu |

---

## Métriques de suivi

| Métrique | Valeur initiale (21/03) | Valeur actuelle (06/04) | Cible |
|----------|------------------------|------------------------|-------|
| Fichiers > 1000 lignes | 5 | **3** (AdminBlogArticles, AdminComlandi, AdminAlkor) | 0 |
| Usages de `any` | 418 | **159** (-62%) | < 50 |
| Contextes React actifs | 3 | **1** (AnalyticsProvider) ✅ | 1 |
| Stores Zustand | 8 | **12** (+ mainCart, auth, serviceCart, stock) ✅ | 10 |
| Fichiers de tests | 11 | **18** | 40+ |
| Couverture globale | ~10% | **~15%** | 40% |
| Score sécurité | 82/100 | — | 90/100 |
| `strictNullChecks` | false | **false** | true |

---

## Annexe : Findings détaillés de l'audit

### Architecture
- 5 fichiers monolithiques (AdminComlandi 1968, AdminPurchases 1818, AdminBlogArticles 1450, AdminAlkor 1378, AdminProducts 1369)
- 30+ `useState` par page admin au lieu de useReducer ou stores
- 40+ pages Admin* à plat dans `src/pages/` sans sous-répertoires
- 84 hooks à plat dans `src/hooks/` sans groupement
- Fonctions utilitaires dupliquées (`normalizeHeader`, `levenshtein`, `similarity`)
- Column mappings dupliqués entre AdminAlkor et AdminComlandi
- `LegacyOffersTable.tsx` non supprimé après remplacement

### Performance
- N+1 queries dans `useOrders.ts` (lignes 94-110)
- 6+ hooks sans `staleTime` explicite
- jspdf importé de façon synchrone dans 2 fichiers (bloque le chunk vendor-pdf)
- recharts importé dans 5 pages admin (mais pages lazy-loaded → acceptable)
- Seulement 95 instances de memo/useMemo/useCallback pour 76K lignes

### Sécurité (Score : 82/100)
- ✅ Sanitization XSS excellente (DOMPurify custom + tests)
- ✅ Pas de secrets hardcodés
- ✅ Auth Edge Functions robuste (JWT + admin check + timing-safe)
- ✅ CORS whitelist + security headers (HSTS, X-Frame-Options, etc.)
- ✅ Rate limiting implémenté
- ⚠️ CSP `unsafe-inline` pour les styles (contrainte Radix UI)
- ⚠️ ErrorBoundary ne remonte pas à Sentry
- ⚠️ Pas de handler `unhandledrejection` global
- ⚠️ `@sentry/tracing` v7 vs `@sentry/react` v10

### TypeScript
- 418 occurrences de `any`
- `strictNullChecks: false` — risque de null reference à runtime
- `supabase as any` dans AdminReviewModeration
- Types d'adresse non typés (`shipping_address: any`, `billing_address: any`)
- Pas de répertoire `src/types/` centralisé

### Tests
- 11 fichiers de tests, ~271 cas de test
- Coverage limitée à `src/lib/` et `src/stores/`
- 0 tests pour les Edge Functions (40+ fonctions)
- 0 tests pour les pages admin (les plus complexes)
- Qualité des tests existants : bonne (assertions significatives)
