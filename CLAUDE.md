# Ma Papeterie — Instructions Projet

## Présentation

E-commerce B2B/B2C de fournitures scolaires et de bureau, basé à Chaumont (52).
Site : ma-papeterie.fr

## Stack technique

- **Framework** : Astro (hybrid SSG/SSR) + React 18 Islands
- **Frontend** : TypeScript 5.8
- **Styling** : Tailwind CSS 3.4 + shadcn/ui (50+ composants Radix UI)
- **State** : Zustand 5 (stores, cross-islands) + TanStack Query 5 (data fetching)
- **Routing** : Astro file-based routing (src/pages/*.astro)
- **Formulaires** : React Hook Form + Zod
- **Backend** : Supabase (PostgreSQL 16 + Edge Functions Deno + Auth + Realtime)
- **Déploiement** : Netlify (CDN + SSR via @astrojs/netlify adapter)
- **Monitoring** : Error tracker maison (Supabase error_logs) + web-vitals

## Commandes

```bash
npm run dev            # Serveur dev Astro
npm run dev:vite       # Serveur dev Vite (legacy)
npm run build          # Build production (astro build)
npm run build:check    # Typecheck + build
npm run lint           # ESLint
npm run typecheck      # tsc --noEmit
npm run test           # Vitest (run once)
npm run test:watch     # Vitest (watch)
npm run test:coverage  # Couverture
```

## Structure

```
src/
├── pages/             # 55 pages Astro (.astro) — routing fichier natif
├── views/             # Composants React des pages (anciens src/pages/*.tsx)
├── layouts/           # MainLayout.astro + BaseHead.astro
├── components/        # Composants React (admin/, cart/, layout/, ui/, islands/, ...)
├── config/            # env.ts (validation Zod des variables d'environnement)
├── data/              # Données statiques, constantes, business-info.ts
├── hooks/             # 60+ hooks custom (useProducts, useOrders, ...)
├── integrations/      # supabase/client.ts + types.ts (auto-générés, NE PAS MODIFIER)
├── lib/               # Utilitaires (api.ts, formatPrice, sanitize, supabase-server.ts, ...)
├── stores/            # Zustand stores (authStore, mainCartStore, ...)
├── middleware.ts       # Auth server-side (remplace Guards pour le chargement initial)
├── test/              # setup.ts (Vitest + Testing Library)
astro.config.ts         # Config Astro (hybrid SSG/SSR, React, Tailwind, Netlify)
supabase/
├── functions/         # 95 Edge Functions Deno
├── migrations/        # 151+ migrations SQL versionnées
netlify/
└── functions/         # Serverless Functions Node.js
```

## Conventions de nommage

| Type | Convention | Exemple |
|------|-----------|---------|
| Composants | PascalCase | `ProductCard.tsx` |
| Hooks | `use*` prefix | `useProducts.ts` |
| Stores | `*Store.ts` | `cartStore.ts` |
| Contextes | `*Context.tsx` | `AuthContext.tsx` |
| Utilitaires | camelCase | `formatPrice.ts` |
| Tests | `*.test.ts(x)` | `cartStore.test.ts` |

## Import alias

`@/` pointe vers `src/`. Toujours utiliser :
```typescript
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
```

## Design system

- **Police** : Poppins (Google Fonts)
- **Couleurs** : Variables HSL dans `index.css`
  - Primary : bleu profond `215 85% 35%`
  - Secondary/Accent : jaune doux `45 95% 65%`
  - Thème vintage : cream, yellow, brown
- **Animations custom** : fade-in-up, fade-in-left, scale-in, cart-bounce, slide-up, marquee
- **Variantes boutons** : default, destructive, outline, secondary, accent, ghost, link, vintage, hero, cta

## Patterns de code

### Data fetching (TanStack Query)
```typescript
const { data, isLoading } = useQuery({
  queryKey: ['products', category],
  queryFn: () => supabase.from('products').select('*'),
  staleTime: 5 * 60_000,
});
```

### Zustand stores
```typescript
export const useCartStore = create<CartState>()((set) => ({
  items: [],
  addItem: (item) => set((s) => ({ items: [...s.items, item] })),
}));
```

### Formulaires
```typescript
const schema = z.object({ email: z.string().email() });
const form = useForm({ resolver: zodResolver(schema) });
```

### Lazy loading pages
```typescript
const Page = lazy(() => import('@/pages/Page'));
<Suspense fallback={<Loader2 className="animate-spin" />}>
  <Page />
</Suspense>
```

### Guards (contrôle d'accès)
```typescript
<AdminGuard><AdminPanel /></AdminGuard>
<AuthGuard><MonCompte /></AuthGuard>
```

## Supabase

- **Client** : `src/integrations/supabase/client.ts` — singleton typé, NE PAS MODIFIER
- **Types** : `src/integrations/supabase/types.ts` — auto-générés, NE PAS MODIFIER
- **Edge Functions** : Deno runtime dans `supabase/functions/`
- **Migrations** : Pattern `YYYYMMDDHHMMSS_description.sql`

## Variables d'environnement

Requises (`.env.local`) :
```
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=eyJ...
```

Validées par Zod dans `src/config/env.ts`.

## Règle de marge minimum (OBLIGATOIRE)

- **Aucun produit ne peut avoir une marge inférieure à 10%** sur le prix de vente HT
- Formule : `marge (%) = (Prix HT − Prix d'achat HT) / Prix HT × 100`
- Constante : `MINIMUM_MARGIN_PERCENT = 10` dans `src/lib/margin.ts`
- Utiliser `calculateMargin()`, `isMarginValid()`, `minimumSellingPrice()` de `src/lib/margin.ts`
- Si pas de prix d'achat : avertissement mais pas de blocage
- Cette règle s'applique au formulaire produit, aux paliers de volume, et aux Edge Functions de pricing dynamique
- **Ne jamais modifier cette règle sans validation explicite de la direction**

## Intégrations fournisseurs

Tous les fournisseurs suivent le même pattern triangulaire :
**Données brutes (CSV/SFTP/scraping) → Parse & mapping colonnes → Upsert `supplier_products` → Rollup `supplier_offers`**

### Comlandi
- **Source** : fichier CSV/Excel importé manuellement via `AdminComlandi.tsx`
- **Parsing** : `src/lib/importers/comlandi-parser.ts` + `src/data/comlandi-mappings.ts` (40+ colonnes mappées)
- **Destination** : `supplier_products` → `supplier_offers` rollup
- **Spécificité** : backfill cross-EAN pour lier produits existants

### Alkor
- **Source** : scraping Playwright du portail B2B (`scripts/scrape-alkor-pw.ts`)
- **Parsing** : XLSX via 3 jeux de mappings (catalogue, prix, bons de commande) dans `src/data/alkor-mappings.ts`
- **Destination** : `supplier_products` → images uploadées vers Supabase Storage

### Liderpapel
- **Source** : SFTP (fichiers XLS tarifs) via `scripts/sync-liderpapel-sftp.mjs`
- **Parsing** : extraction code/EAN/ref_fabricant/prix dans `scripts/sync-liderpapel.cjs`
- **Enrichissement** : Icecat API par EAN (`scripts/icecat-enrich.ts`) pour specs et images
- **Spécificité** : auto-création `supplier_products` pour produits partageant le même EAN

### Multi-fournisseurs (workflow commun)
- **Table pivot** : `supplier_products` (product_id ↔ supplier, référence, prix, stock, délai)
- **Agrégation** : `supplier_offers` (pvp_ttc, prix_achat_ht, quantité_min)
- **Hooks** : `useProductSuppliers.ts` (lien direct + fallback EAN), `useSupplierOffers.ts`
- **Import générique** : `AdminImportFournisseurs.tsx` (auto-détection colonnes, staging, upsert)

## Architecture Sync ALKOR (détail : `.github/agents/references/alkor-sync.md`)

- **Flux** : `ALKOR B2B Shop → scripts/scrape-alkor-pw.ts (Playwright) → import-alkor Edge Function → products + images + supplier_offers`
- **Composants** : `scripts/scrape-alkor-pw.ts` (scraper), `supabase/functions/import-alkor/` (import), GitHub Actions cron quotidien (06:00 UTC)
- **Tables de suivi** : `crawl_jobs` (statut sync, result_data), `import_logs` (erreurs par SKU/opération)
- **Problèmes courants** : CAPTCHA (delays réalistes + rotation user-agent), rate limiting (backoff exponentiel), URLs images expirées (télécharger immédiatement + cycle refresh)
- **Images** : téléchargement parallèle (concurrency: 5), upload vers Supabase Storage `product-images/`, retry avec timeout 10s
- **Debug SQL** :
  - Syncs récentes : `SELECT supplier, status, created_at FROM crawl_jobs WHERE created_at > NOW() - INTERVAL '24h' ORDER BY created_at DESC`
  - Produits sans images : `SELECT sku, name FROM products WHERE supplier = 'ALKOR' AND image_url IS NULL`
  - Erreurs import : `SELECT operation, error_message, created_at FROM import_logs WHERE supplier = 'ALKOR' AND status = 'failed' ORDER BY created_at DESC LIMIT 10`

## Moteur de pricing B2B (détail : `.github/agents/references/b2b-pricing.md`)

- **Tables** : `b2b_price_grids` (type client × fournisseur × catégorie → marges et paliers), `b2b_accounts` (comptes clients avec overrides marge/volume), `live_prices` (cache prix calculés)
- **Flux calcul** : `Coût fournisseur → Marge de base (25-35%) → Ajustement type client → Remise volume → Prix final`
- **Types clients** : Educational (marge haute, +5-10% premium), Corporate (standard, contrats), Bulk (marge basse, remises volume 5-15%)
- **Hooks pricing** : `useLivePrice(productId, customerType, quantity)`, `usePriceComparison(productId)`, `useB2BAccount(customerId)`, `useB2BBudget(accountId)`
- **Cache** : `live_prices` valide 1h, refresh background pour produits fort trafic via `refresh-price-cache` Edge Function
- **Batch** : `calculateCartPrices(cart, customerType)` pour calcul panier en parallèle (Promise.all)
- **Rappel** : marge minimum 10% obligatoire (cf. section "Règle de marge minimum")

## Patterns des hooks custom (détail : `.github/agents/references/hooks-patterns.md`)

- **Interface standard** : `{ data: T | null, loading: boolean, error: string | null, refetch: () => void }`
- **5 patterns** : Data Fetching (`useProducts`), Real-time (`useProductsRealtime` avec isMounted + channel), Mutation (`useCreateProduct`), Form (React Hook Form + Zod), B2B (`useB2BAccount`, `useB2BBudget`)
- **60+ hooks** : Data Fetching (25+), Real-time (8+), Mutations (10+), UI State (5+), Analytics (3+)
- **Real-time obligatoire** : `isMounted.current = true` au mount, cleanup `subscription.unsubscribe()` au unmount
- **Erreurs** : toujours `err instanceof Error ? err.message : 'Unknown error'`, `setError(null)` avant refetch
- **Testing** : `renderHook()` + `QueryClientProvider` wrapper, mock Supabase via `vi.mock('../integrations/supabase')`
- **Performance** : debounced search (300ms par défaut), infinite scroll avec `supabase.from().select().range(from, to)`

## SEO Machine & Blog (détail : `.github/agents/references/seo-machine-*.md`)

- **API** : `POST /api/v1/content/write` (générer article), `GET /api/v1/content/{id}` (statut), polling jusqu'à `status: "completed"`
- **Tables** : `blog_articles` (title, slug, content HTML, seo_machine_id/status, published_at), `blog_seo_metadata` (keywords[], reading_time, word_count, internal_links[])
- **Hook** : `useSEOMachineArticles` — `generateArticle()`, `fetchArticleStatus()`, `saveArticleToDatabase()`, `publishArticle()`
- **Admin** : `AdminBlogArticles.tsx` — liste, génération, brouillons, publication, prévisualisation SEO
- **10 articles planifiés** : fournitures rentrée, économiser papeterie, types de papier, tampons, impression urgente, gestion fournitures, papeterie éco, aménagement classe, petit matériel, coloriages
- **Impact estimé** : +500-800 visites/mois, +15-20% trafic organique, score Lighthouse SEO 86→88+
- **Env** : `VITE_SEOMACHINE_API_KEY`, `VITE_SEOMACHINE_API_URL`

## Shopify AI Toolkit

- **Emplacement** : `.shopify-ai-toolkit/` (cloné depuis `github.com/Shopify/Shopify-AI-Toolkit`)
- **Recherche docs** : `node .shopify-ai-toolkit/skills/shopify-admin/scripts/search_docs.mjs "query"`
- **Validation GraphQL** : `node .shopify-ai-toolkit/skills/shopify-admin/scripts/validate.mjs --model admin --client-name ma-papeterie --client-version 1.0.0 --artifact-id <id> --revision 1`
- **Skills pertinents** : `shopify-admin`, `shopify-admin-execution`, `shopify-storefront-graphql`
- **Commandes Claude Code** : `/shopify-docs <query>`, `/shopify-validate <artifact-id>`
- **Règle** : toujours chercher la doc avant d'écrire du GraphQL Shopify, valider avant de retourner le code

## Shopify — Sync Bidirectionnelle

- **Direction** : Supabase = source de vérité, Shopify reçoit les pushs et envoie des webhooks
- **Push** (Supabase → Shopify) : `sync-shopify` Edge Function
- **Pull** (Shopify → Supabase) : `pull-shopify-products` Edge Function
- **Webhooks** : `shopify-webhook` gère orders + inventory + products (create/update/delete)
- **Réconciliation** : `reconcile-shopify-products` cron quotidien (04:00 UTC)
- **Conflits** : stockés dans `shopify_product_mapping.conflict_status`, visibles dans l'onglet Conflits de l'admin
- **Règle prix** : les prix Shopify ne sont JAMAIS écrits dans `products.price_ht/price_ttc` (protection marge 10%)

### Configuration

- **Table de config** : `shopify_config` (une seule ligne — `shop_domain`, `api_version`, `webhook_secret`, `pos_location_id`, `pos_active`, `sync_collections`, `sync_metafields`). Seed initial : `ma-papeterie.myshopify.com`.
- **Secrets Edge Functions** (via `supabase secrets set`) : `SHOPIFY_ACCESS_TOKEN` (Admin API, requis), `SHOPIFY_WEBHOOK_SECRET` (HMAC, requis pour `shopify-webhook`), `SHOPIFY_SHOP_DOMAIN` / `SHOPIFY_LOCATION_ID` / `SHOPIFY_POS_LOCATION_ID` (fallbacks si `shopify_config` vide).
- **Frontend** : `VITE_SHOPIFY_STOREFRONT_TOKEN` (Storefront API read-only, optionnel — panier & produits).
- Types TS manquants pour `shopify_product_mapping` et `shopify_orders` : patchés dans `src/integrations/supabase/types-extensions.ts` en attendant une régénération `supabase gen types`.

### Setup webhooks Shopify

1. Dans Shopify Admin → Settings → Notifications → Webhooks, créer les topics suivants avec le format JSON et l'URL :
   `https://{VITE_SUPABASE_PROJECT_ID}.supabase.co/functions/v1/shopify-webhook`
   - `orders/create`, `orders/updated`
   - `products/create`, `products/update`, `products/delete`
   - `inventory_levels/update`
2. Copier le "Webhook signing secret" affiché par Shopify.
3. Le stocker **soit** dans `shopify_config.webhook_secret` (préféré, via admin SQL), **soit** comme secret Edge Function : `supabase secrets set SHOPIFY_WEBHOOK_SECRET=whsec_...`.
4. Tester : envoyer une commande test depuis Shopify, vérifier qu'elle apparaît dans la table `shopify_orders` (et pas dans `error_logs` avec `Invalid HMAC signature`).
5. L'Edge Function **rejette 500** si aucun secret n'est configuré (`shopify-webhook/index.ts:76`), et **401** si la signature HMAC ne matche pas.
6. L'admin Shopify → onglet **Webhooks** affiche l'activité (nombre de webhooks reçus 24h/7j, dernier reçu) et l'URL exacte à enregistrer.

### Multi-locations (POS + Web)

- **Distinction des sources** : chaque `shopify_orders.source_name` vaut `"pos"`, `"web"` ou `"shopify_draft_order"` (fallback `"web"` si absent).
- **Tables de stock** :
  - `products.stock_quantity` : stock agrégé (web + entrepôt), décrémenté par les commandes web via webhook.
  - `product_stock_locations` : stock magasin par location, décrémenté par les commandes POS via `decrementStoreStock()` dans `shopify-webhook/index.ts:210`.
- **Location ID** : `shopify_config.pos_location_id` (ou fallback env `SHOPIFY_POS_LOCATION_ID`) identifie la boutique physique. Les commandes POS y associent `shopify_orders.pos_location_id`.
- **Webhook `inventory_levels/update`** : filtre sur la location POS pour mettre à jour uniquement `product_stock_locations` sans polluer le stock web agrégé.
- **Dashboard POS** (`AdminShopify.tsx`, onglet Dashboard POS) : stats calculées uniquement sur `source_name === "pos"`. Low stock est restreint aux produits présents dans `shopify_product_mapping` (produits effectivement synchronisés Shopify).
- **Configuration** : récupérer l'ID via `POST /functions/v1/shopify-status { include_locations: true }` (liste les locations Shopify), puis `UPDATE shopify_config SET pos_location_id = '<id>' WHERE shop_domain = '...'`.

## Sécurité

- XSS : DOMPurify via `lib/sanitize.ts`
- Validation : Zod sur tous les formulaires
- Auth : Supabase JWT + guards (AdminGuard, AuthGuard, ProGuard)
- CSP + HSTS + X-Frame-Options dans `netlify.toml`
- Anti-bot : `components/HoneypotField.tsx`

## Performance — Points d'attention

- `strictNullChecks: false` — attention aux null/undefined non vérifiés
- Certains fichiers admin dépassent 1000 lignes (AdminComlandi, AdminPurchases, AdminProducts)
- Migration CartContext/AuthContext → Zustand terminée (avril 2026) — utiliser les stores `authStore`, `mainCartStore`, `serviceCartStore`
- Utiliser `.in('id', ids)` au lieu de boucles N+1 pour les requêtes batch
- Toujours mettre `staleTime` sur les queries TanStack non-critiques
- Librairies lourdes (recharts, jspdf, xlsx) : import dynamique uniquement

## Tests

- Framework : Vitest + React Testing Library
- Setup : `src/test/setup.ts`
- Lancer : `npm run test` ou `npm run test:watch`

## Déploiement

- **Netlify** : build `npm run build`, publish `dist/`
- **Node** : v20
- **Headers** : assets immutables (1 an), index.html no-cache
- **Sitemaps** : générés dynamiquement via Edge Function, proxiés par Netlify
