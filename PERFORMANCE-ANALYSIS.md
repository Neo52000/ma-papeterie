# Analyse de Performance - Ma Papeterie

## Vue d'ensemble du projet

**Ma Papeterie** est une plateforme e-commerce B2B/B2C pour fournitures scolaires et de bureau.

| Couche | Technologie |
|--------|------------|
| Frontend | React 18.3 + Vite 7.3 + TypeScript 5.8 + Tailwind 3.4 + shadcn/ui |
| State Management | Zustand 5 + TanStack Query 5 + React Context |
| Backend | NestJS 11 + TypeORM + PostgreSQL 16 |
| BaaS | Supabase (73 Edge Functions Deno) |
| Déploiement | Netlify (frontend) + Docker/VPS (backend) |
| Monitoring | Sentry 10 |

**Taille du projet** : 558 fichiers TypeScript/JavaScript, 80+ pages, 21 répertoires de composants, 60+ hooks custom.

---

## Problèmes de Performance Identifiés

### 1. CRITIQUE - Pattern N+1 dans les requêtes

**Fichier** : `src/hooks/useOrders.ts` (lignes 129-141)

Le code itère sur chaque article d'une commande et effectue une requête individuelle pour vérifier le stock :

```typescript
for (const item of orderData.items) {
  const { data: product } = await supabase
    .from('products')
    .select('stock_quantity')
    .eq('id', item.product_id)
    .single();
}
```

**Impact** : Une commande de 10 articles = 10 requêtes séparées au lieu d'une seule.

**Solution** : Utiliser une requête batch avec `.in('id', itemIds)`.

---

**Fichier** : `src/pages/Catalogue.tsx` (lignes 290-306)

Récupère TOUS les produits uniquement pour compter les catégories (scan O(n) de la base) :

```typescript
.select("category")
.eq("is_active", true)
```

**Solution** : Utiliser une agrégation `COUNT` côté base de données ou une vue matérialisée.

---

### 2. CRITIQUE - Fichiers monolithiques (>800 lignes)

Ces fichiers impactent le bundle et la maintenabilité :

| Fichier | Lignes | Problème |
|---------|--------|----------|
| `src/pages/AdminComlandi.tsx` | 1811 | Page admin monolithique fournisseur |
| `src/pages/AdminPurchases.tsx` | 1801 | Gestion achats complexe |
| `src/components/admin/AdminBlogArticles.tsx` | 1452 | CRUD blog dans un seul fichier |
| `src/pages/AdminAlkor.tsx` | 1385 | Logique fournisseur dupliquée |
| `src/pages/AdminProducts.tsx` | 1339 | Gestion produits monolithique |
| `src/components/admin/StockReceptions.tsx` | 1013 | Réception de stock |
| `src/pages/AdminAutomations.tsx` | 1001 | Workflows d'automatisation |
| `src/pages/AdminCategories.tsx` | 856 | Gestion des catégories |

**Impact** : Même avec le lazy loading, ces fichiers chargent beaucoup de code inutilisé sur chaque page admin.

**Solution** : Extraire en sous-composants et utiliser le code splitting intra-page.

---

### 3. HAUTE - Memoization manquante sur composants lourds

**`OrdersDataTable.tsx`** (lignes 47-234) :
- Aucune memoization sur le rendu des lignes du tableau
- Le tableau entier re-render à chaque changement d'état parent
- Impact fort avec 25+ lignes

**`Catalogue.tsx` - SidebarFilters** (ligne 79) :
- Reçoit de nombreuses props sans `React.memo`
- Re-render à chaque changement d'état du parent

**Solution** : Ajouter `React.memo` sur les composants de liste/table et `useMemo` sur les données dérivées.

---

### 4. HAUTE - Configuration TanStack Query incohérente

**Hooks sans `staleTime`** (défaut = 0, immédiatement périmé) :

- `useOrdersPaginated.ts` : Chaque changement de page déclenche un re-fetch même si les données n'ont pas changé
- `useOrderStats()` : Les stats se re-fetchent à chaque visite de la page commandes

**Hooks correctement configurés** (pour comparaison) :
- `useProductSearch.ts` : `staleTime: 2 * 60_000` ✓
- `useStaticPages.ts` : `staleTime: 5 * 60_000` ✓
- `App.tsx` (QueryClient) : `staleTime: 5 * 60 * 1000` ✓

**Solution** : Harmoniser `staleTime` à 2-5 minutes sur tous les hooks de données non-critiques.

---

### 5. MOYENNE - Optimisation d'images absente

**Fichier** : `src/components/ui/OptimizedImage.tsx` (lignes 1-22)

Le composant d'image "optimisé" n'implémente que `loading="lazy"` et `decoding="async"` :

```tsx
<img
  src={imgSrc}
  alt={alt || ""}
  loading="lazy"
  decoding="async"
  onError={() => setError(true)}
/>
```

**Manques** :
- Pas de `srcSet` pour images responsives
- Pas de `sizes` pour le dimensionnement
- Pas de support WebP/AVIF via `<picture>`
- Pas de `width`/`height` → Layout Shift (CLS)

**Solution** : Implémenter un composant `<picture>` complet avec formats modernes et dimensions explicites.

---

### 6. MOYENNE - Context Providers trop larges

**Fichier** : `src/App.tsx` (lignes 134-253)

```
HelmetProvider > QueryClientProvider > TooltipProvider > AuthProvider > CartProvider > BrowserRouter > Routes
```

**Problèmes** :
- **CartProvider** enveloppe toute l'app → un changement de panier re-render toutes les pages
- **AuthProvider** enveloppe toute l'app → chaque vérification de rôle re-render l'arbre
- **TooltipProvider** enveloppe toute l'app mais n'est nécessaire que localement

**Solution** : Migrer Cart et Auth vers Zustand (déjà utilisé) avec pattern sélecteur, ou ajouter `useSyncExternalStore` pour éviter les re-renders cascadés.

---

### 7. MOYENNE - Bibliothèques non lazy-loadées

| Bibliothèque | Taille estimée | Usage réel |
|--------------|----------------|------------|
| `recharts` | ~250 KB | Pages admin uniquement |
| `jspdf` + `jspdf-autotable` | ~200 KB | Export PDF admin |
| `xlsx` | ~150 KB | Import/export admin |
| `@dnd-kit` suite | ~80 KB | Page builder uniquement |

**Total potentiel** : ~680 KB économisables via dynamic import.

**Solution** : Utiliser `React.lazy()` ou `import()` dynamique pour ces bibliothèques, uniquement chargées quand nécessaire.

---

### 8. MOYENNE - Requêtes Supabase sans index probables

Requêtes identifiées qui bénéficieraient d'index :

| Colonne | Utilisation | Type d'index suggéré |
|---------|-------------|---------------------|
| `products.is_active` | Chaque requête produit | B-tree |
| `products.category` | Filtrage catalogue | B-tree |
| `products.brand` | Filtres de recherche | B-tree |
| `products.slug` | Lookup par URL | Unique B-tree |
| `products.created_at` | Tri par date | B-tree DESC |
| `orders.created_at` | Pagination & stats | B-tree DESC |
| `orders.status` | Filtrage par statut | B-tree |

**Note** : Vérifier dans les migrations Supabase si ces index existent déjà.

---

## Points forts (déjà en place)

- **Lazy loading** sur 50+ pages via `React.lazy()` ✓
- **Code splitting** Vite en 5 chunks vendors ✓
- **Rate limiting** backend NestJS (3/1s, 20/10s, 100/60s) ✓
- **Cache CDN** Netlify avec headers immutables (1 an pour /assets/*) ✓
- **QueryClient global** avec staleTime et gcTime configurés ✓
- **useMemo/useCallback** dans les composants principaux (Catalogue, Shop) ✓
- **Sécurité** : Helmet, CSP, HSTS, JWT, CORS ✓
- **Error tracking** : Sentry intégré ✓

---

## Résumé des priorités

| Priorité | Problème | Impact | Effort |
|----------|----------|--------|--------|
| 🔴 P0 | N+1 queries (useOrders, Catalogue) | Performance DB | Faible |
| 🔴 P0 | Fichiers >1000 lignes (8 fichiers) | Bundle & maintenabilité | Moyen |
| 🟠 P1 | Memoization tables/listes | Re-renders inutiles | Faible |
| 🟠 P1 | staleTime manquant (2 hooks) | Requêtes réseau excessives | Faible |
| 🟡 P2 | OptimizedImage incomplet | CLS & bande passante | Moyen |
| 🟡 P2 | Context Providers trop larges | Re-renders cascadés | Moyen |
| 🟡 P2 | Lazy import bibliothèques (~680 KB) | Taille bundle initiale | Faible |
| 🟡 P2 | Index Supabase manquants | Temps de réponse DB | Faible |

---

## Recommandations immédiates (quick wins)

1. **Corriger le N+1 dans `useOrders.ts`** : remplacer la boucle par `.in('id', itemIds)` — gain immédiat sur chaque commande
2. **Ajouter `staleTime: 5 * 60_000`** aux hooks `useOrdersPaginated` et `useOrderStats` — réduit les appels réseau
3. **Ajouter `width` et `height`** au composant `OptimizedImage` — élimine le Cumulative Layout Shift
4. **Vérifier/créer les index** `products.is_active`, `products.category`, `products.slug` — accélère les requêtes les plus fréquentes
